// server.js - Multiplayer server for Chess Royale

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Also serve node_modules directory for Three.js and other dependencies
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

// Game state
const players = new Map();
const eventLog = [];
const gameStartTime = Date.now();

// Define traditional chess positions (board coordinates 0-7)
const traditionalPositions = {
  'white': {
    'pawn': [{x: 0, z: 6}, {x: 1, z: 6}, {x: 2, z: 6}, {x: 3, z: 6}, 
             {x: 4, z: 6}, {x: 5, z: 6}, {x: 6, z: 6}, {x: 7, z: 6}],
    'rook': [{x: 0, z: 7}, {x: 7, z: 7}],
    'knight': [{x: 1, z: 7}, {x: 6, z: 7}],
    'bishop': [{x: 2, z: 7}, {x: 5, z: 7}],
    'queen': [{x: 3, z: 7}],
    'king': [{x: 4, z: 7}]
  },
  'black': {
    'pawn': [{x: 0, z: 1}, {x: 1, z: 1}, {x: 2, z: 1}, {x: 3, z: 1}, 
             {x: 4, z: 1}, {x: 5, z: 1}, {x: 6, z: 1}, {x: 7, z: 1}],
    'rook': [{x: 0, z: 0}, {x: 7, z: 0}],
    'knight': [{x: 1, z: 0}, {x: 6, z: 0}],
    'bishop': [{x: 2, z: 0}, {x: 5, z: 0}],
    'queen': [{x: 3, z: 0}],
    'king': [{x: 4, z: 0}]
  }
};

// Track which positions have already been assigned
const assignedPositions = {
  'white': {},
  'black': {}
};

// Game settings
const gameSettings = {
  respawnEnabled: true,
  respawnTime: 5, // seconds
  maxPlayers: 32,
  friendlyFire: false
};

// Connect to socket.io
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Handle piece assignment request
  socket.on('requestPieceAssignment', (data) => {
    // Assign a team - alternate white and black to keep teams balanced
    const playerCount = players.size;
    const team = playerCount % 2 === 0 ? 'white' : 'black';
    
    // Find an available position for this team
    const assignedPiece = assignPieceFromTraditionalPosition(team);
    
    if (assignedPiece) {
      // Send the assignment to the client
      socket.emit('pieceAssignment', {
        id: socket.id,
        type: assignedPiece.type,
        team: team,
        position: assignedPiece.position
      });
    } else {
      // All traditional positions are taken, assign a random position
      const randomType = getRandomPieceType();
      const randomPosition = getRandomPosition();
      
      socket.emit('pieceAssignment', {
        id: socket.id,
        type: randomType,
        team: team,
        position: randomPosition
      });
    }
  });
  
  // Handle piece assignment confirmation
  socket.on('confirmPieceAssignment', (data) => {
    console.log('Piece assignment confirmed:', data);
    
    // Initialize player data
    players.set(data.id, {
      id: data.id,
      type: data.type,
      team: data.team,
      position: data.position,
      hp: data.hp || getBaseHp(data.type),
      effects: [],
      lastMoveTime: Date.now(),
      respawning: false
    });
    
    // Send current game state to the new player
    socket.emit('gameState', {
      players: Object.fromEntries(players),
      events: eventLog.slice(-10),
      settings: gameSettings,
      time: (Date.now() - gameStartTime) / 1000
    });
    
    // Notify all players about the new player
    io.emit('update', Object.fromEntries(players));
  });
  
  // Handle player movement
  socket.on('move', (data) => {
    const player = players.get(data.id);
    
    if (player) {
      // Validate move (optional: server-side move validation)
      const isValidMove = validateMove(player, data.position);
      
      if (isValidMove) {
        // Update player position
        player.position = data.position;
        player.lastMoveTime = Date.now();
        
        // Broadcast updated player state
        io.emit('update', Object.fromEntries(players));
      } else {
        // Send correction to the player
        socket.emit('moveRejected', {
          id: data.id,
          correctPosition: player.position
        });
      }
    }
  });
  
  // Handle ability usage
  socket.on('ability', (data) => {
    const player = players.get(data.id);
    
    if (player) {
      console.log(`Player ${data.id} used ability at ${JSON.stringify(data.target)}`);
      
      // Find targets at the given position
      const targets = findTargetsAtPosition(data.target, player.team);
      
      // Apply damage or effects to targets
      targets.forEach(target => {
        const targetPlayer = players.get(target);
        
        if (targetPlayer) {
          // Check for friendly fire setting
          if (!gameSettings.friendlyFire && targetPlayer.team === player.team) {
            return;
          }
          
          // Apply damage
          targetPlayer.hp -= data.damage || 1;
          
          // Log the hit
          eventLog.push({
            type: 'ability',
            time: Date.now() - gameStartTime,
            attacker: player.id,
            target: target,
            damage: data.damage || 1
          });
          
          // Check if target is defeated
          if (targetPlayer.hp <= 0) {
            handlePlayerDefeat(targetPlayer, player);
          }
        }
      });
      
      // Broadcast updated player states
      io.emit('update', Object.fromEntries(players));
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Get the player data before deleting
    const player = players.get(socket.id);
    
    // Remove player from the game
    players.delete(socket.id);
    
    // Free up the assigned position if the player had one
    if (player && player.team && player.type && player.position) {
      releaseAssignedPosition(player.team, player.type, player.position);
    }
    
    // Update all clients
    io.emit('update', Object.fromEntries(players));
  });
  
  // Handle game events from clients
  socket.on('gameEvent', (eventData) => {
    console.log('Game event received:', eventData);
    
    // Add to event log
    eventLog.push({
      ...eventData,
      time: Date.now() - gameStartTime
    });
    
    // Broadcast to all players
    io.emit('gameEvent', eventData);
  });
});

/**
 * Assign a piece from traditional chess positions
 * @param {string} team - The team ('white' or 'black')
 * @returns {Object|null} - The assigned piece type and position or null if all positions are taken
 */
function assignPieceFromTraditionalPosition(team) {
  // Initialize the assigned positions tracking if it doesn't exist
  if (!assignedPositions[team]) {
    assignedPositions[team] = {};
  }
  
  // Try to find an unassigned position
  for (const pieceType in traditionalPositions[team]) {
    // Initialize tracking for this piece type if needed
    if (!assignedPositions[team][pieceType]) {
      assignedPositions[team][pieceType] = Array(traditionalPositions[team][pieceType].length).fill(false);
    }
    
    // Check if any positions are still available for this piece type
    const availablePositionIndex = assignedPositions[team][pieceType].findIndex(isAssigned => !isAssigned);
    
    if (availablePositionIndex !== -1) {
      // Mark this position as assigned
      assignedPositions[team][pieceType][availablePositionIndex] = true;
      
      // Return the piece type and position
      return {
        type: pieceType,
        position: traditionalPositions[team][pieceType][availablePositionIndex]
      };
    }
  }
  
  // All positions are taken
  return null;
}

/**
 * Release an assigned position
 * @param {string} team - The team
 * @param {string} pieceType - The piece type
 * @param {Object} position - The position to release
 */
function releaseAssignedPosition(team, pieceType, position) {
  // Check if we have this team and piece type tracked
  if (!assignedPositions[team] || !assignedPositions[team][pieceType]) {
    return;
  }
  
  // Find the position in the traditional positions
  const positions = traditionalPositions[team][pieceType];
  const positionIndex = positions.findIndex(pos => 
    pos.x === position.x && pos.z === position.z
  );
  
  // If found, mark it as unassigned
  if (positionIndex !== -1) {
    assignedPositions[team][pieceType][positionIndex] = false;
  }
}

/**
 * Get a random piece type
 * @returns {string} - A random piece type
 */
function getRandomPieceType() {
  const pieceTypes = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
  return pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
}

/**
 * Validate a player's move request
 * @param {Object} player - Player data
 * @param {Object} newPosition - Requested new position
 * @returns {boolean} - Whether the move is valid
 */
function validateMove(player, newPosition) {
  // Basic validation
  if (!newPosition || typeof newPosition.x !== 'number' || typeof newPosition.z !== 'number') {
    return false;
  }
  
  // Check board boundaries
  if (newPosition.x < 0 || newPosition.x >= 8 || newPosition.z < 0 || newPosition.z >= 8) {
    return false;
  }
  
  // Check movement distance based on piece type
  const distX = Math.abs(newPosition.x - player.position.x);
  const distZ = Math.abs(newPosition.z - player.position.z);
  
  // Different rules for different piece types
  switch (player.type) {
    case 'pawn':
      // Pawns move forward (z direction changes based on team)
      const forwardDirection = player.team === 'white' ? -1 : 1;
      const isStartingPosition = 
        (player.team === 'white' && player.position.z === 6) ||
        (player.team === 'black' && player.position.z === 1);
      
      // Forward movement (1 square, or 2 from starting position)
      if (distX === 0) {
        const zChange = newPosition.z - player.position.z;
        // Check direction is correct and distance is valid
        if (Math.sign(zChange) === forwardDirection) {
          if (Math.abs(zChange) === 1) return true;
          if (isStartingPosition && Math.abs(zChange) === 2) return true;
        }
      }
      // Diagonal capture (must have a piece to capture)
      else if (distX === 1 && distZ === 1) {
        const zChange = newPosition.z - player.position.z;
        if (Math.sign(zChange) === forwardDirection) {
          return isPositionOccupied(newPosition, player.team); // Can only move diagonally to capture
        }
      }
      return false;
      
    case 'rook':
      // Rooks move in straight lines
      return (distX === 0 || distZ === 0) && !isPathBlocked(player.position, newPosition);
      
    case 'knight':
      // Knights move in L-shape (2 in one direction, 1 in perpendicular direction)
      return (distX === 2 && distZ === 1) || (distX === 1 && distZ === 2);
      
    case 'bishop':
      // Bishops move diagonally
      return distX === distZ && !isPathBlocked(player.position, newPosition);
      
    case 'queen':
      // Queens move like rooks or bishops
      return ((distX === 0 || distZ === 0) || distX === distZ) && !isPathBlocked(player.position, newPosition);
      
    case 'king':
      // Kings move 1 square in any direction
      return distX <= 1 && distZ <= 1;
      
    default:
      // Default simple distance check (1 square in any direction)
      return distX <= 1 && distZ <= 1;
  }
}

/**
 * Check if a path is blocked by other pieces
 * @param {Object} start - Starting position
 * @param {Object} end - Ending position
 * @returns {boolean} - Whether the path is blocked
 */
function isPathBlocked(start, end) {
  // Get the direction of movement
  const dirX = end.x > start.x ? 1 : (end.x < start.x ? -1 : 0);
  const dirZ = end.z > start.z ? 1 : (end.z < start.z ? -1 : 0);
  
  // Check each position along the path
  let currX = start.x + dirX;
  let currZ = start.z + dirZ;
  
  while (currX !== end.x || currZ !== end.z) {
    if (isAnyPieceAt({ x: currX, z: currZ })) {
      return true; // Path is blocked
    }
    
    currX += dirX;
    currZ += dirZ;
  }
  
  return false;
}

/**
 * Check if any piece is at the given position
 * @param {Object} position - Position to check
 * @returns {boolean} - Whether a piece is at the position
 */
function isAnyPieceAt(position) {
  for (const [id, player] of players.entries()) {
    if (player.position.x === position.x && player.position.z === position.z) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a position is occupied by an opponent
 * @param {Object} position - Position to check
 * @param {string} team - The team checking
 * @returns {boolean} - Whether an opponent's piece is at the position
 */
function isPositionOccupied(position, team) {
  for (const [id, player] of players.entries()) {
    if (player.position.x === position.x && player.position.z === position.z && player.team !== team) {
      return true;
    }
  }
  return false;
}

/**
 * Find targets at a specific position
 * @param {Object} position - Target position
 * @param {string} attackerTeam - Team of the attacker
 * @returns {Array} - Array of player IDs at the position
 */
function findTargetsAtPosition(position, attackerTeam) {
  const targets = [];
  
  players.forEach((player, id) => {
    if (player.position.x === position.x && player.position.z === position.z) {
      // Don't target yourself or teammates unless friendly fire is on
      if (!gameSettings.friendlyFire && player.team === attackerTeam) {
        return;
      }
      targets.push(id);
    }
  });
  
  return targets;
}

/**
 * Handle player defeat
 * @param {Object} defeatedPlayer - The player who was defeated
 * @param {Object} attacker - The player who defeated them
 */
function handlePlayerDefeat(defeatedPlayer, attacker) {
  console.log(`Player ${defeatedPlayer.id} was defeated by ${attacker.id}`);
  
  // Log the defeat
  eventLog.push({
    type: 'defeat',
    time: Date.now() - gameStartTime,
    defeatedId: defeatedPlayer.id,
    attackerId: attacker.id
  });
  
  // Handle respawn if enabled
  if (gameSettings.respawnEnabled) {
    defeatedPlayer.respawning = true;
    defeatedPlayer.respawnTime = Date.now() + (gameSettings.respawnTime * 1000);
    
    // Set a timeout to respawn the player
    setTimeout(() => {
      if (players.has(defeatedPlayer.id)) {
        const player = players.get(defeatedPlayer.id);
        
        // Reset HP and position
        player.hp = getBaseHp(player.type);
        player.position = getRandomPosition();
        player.respawning = false;
        
        // Notify all players
        io.emit('playerRespawn', {
          id: player.id,
          position: player.position,
          hp: player.hp
        });
        
        // Update player states
        io.emit('update', Object.fromEntries(players));
      }
    }, gameSettings.respawnTime * 1000);
  } else {
    // Or mark as spectator if no respawn
    defeatedPlayer.hp = 0;
    defeatedPlayer.isSpectator = true;
  }
}

/**
 * Get base HP for a piece type
 * @param {string} type - Piece type
 * @returns {number} - Base HP
 */
function getBaseHp(type) {
  const hpMap = {
    'pawn': 5,
    'rook': 7,
    'knight': 7,
    'bishop': 7,
    'queen': 10,
    'king': 15
  };
  
  return hpMap[type] || 5;
}

/**
 * Get a random position on the board
 * @returns {Object} - Random position {x, z}
 */
function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * 8),
    z: Math.floor(Math.random() * 8)
  };
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
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

// Game state
const players = new Map();
const eventLog = [];
const gameStartTime = Date.now();

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
  
  // Handle player registration
  socket.on('register', (data) => {
    console.log('Player registered:', data);
    
    // Initialize player data
    players.set(data.id, {
      id: data.id,
      type: data.type || 'pawn',
      team: data.team || 'white',
      position: data.position || { x: 0, z: 0 },
      hp: data.hp || 5,
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
        
        // Check for loot collection
        checkLootCollection(player);
        
        // Check for collisions with other players
        checkPlayerCollisions(player);
        
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
    players.delete(socket.id);
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
  
  // Handle loot collection
  socket.on('lootCollect', (data) => {
    console.log('Loot collected:', data);
    
    // Broadcast to all players
    io.emit('lootCollect', data);
  });
});

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
  
  // Check movement distance (simple for now)
  const distX = Math.abs(newPosition.x - player.position.x);
  const distZ = Math.abs(newPosition.z - player.position.z);
  
  // Basic distance check (1 square in any direction)
  // Could be expanded with chess-specific move validation later
  if (distX > 1 || distZ > 1) {
    // Exception for knight
    if (player.type === 'knight' && ((distX === 2 && distZ === 1) || (distX === 1 && distZ === 2))) {
      return true;
    }
    return false;
  }
  
  return true;
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

/**
 * Check for loot collection at player's position
 * @param {Object} player - Player data
 */
function checkLootCollection(player) {
  // This would check against server-side loot items
  // We're letting clients handle loot for simplicity in this example
}

/**
 * Check for collisions with other players
 * @param {Object} player - Player data
 */
function checkPlayerCollisions(player) {
  // Basic collision detection
  players.forEach((otherPlayer, id) => {
    if (id !== player.id &&
        otherPlayer.position.x === player.position.x &&
        otherPlayer.position.z === player.position.z) {
      
      // Handle piece capture/collision based on chess rules
      // For now, just a simple interaction
      // In a full implementation, you'd apply chess capture rules
      
      // If it's an opponent, handle combat
      if (otherPlayer.team !== player.team) {
        // For simplicity, just log the collision
        console.log(`Collision between ${player.id} and ${id}`);
      }
    }
  });
}

// Game update loop (runs every second)
setInterval(() => {
  // Update game state
  // For example, handle AI-controlled neutral entities or time-based events
  
  // Send updates to clients if anything changed
  // io.emit('update', Object.fromEntries(players));
}, 1000);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
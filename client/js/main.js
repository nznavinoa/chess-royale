// main.js - Main entry point for the Chess Royale game

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ChessPiece } from './pieces.js';
import { createMap } from './map.js';
import { Game } from './game.js';
import { ChessRules } from './chessRules.js';

// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set up orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 15, 15);
controls.update();
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Add lighting - simplified lighting to improve performance
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
scene.add(new THREE.AmbientLight(0xF5E8C7, 0.4));

// Set background color - sky color blend
scene.background = new THREE.Color('#1A1A3D'); // Deep Midnight Blue

// Make scene globally accessible for other modules
window.scene = scene;

// Initialize game logic
const game = new Game();
const chessRules = new ChessRules();

// Add the chess board to the scene
scene.add(createMap());

// Store players
const players = new Map();

// Performance optimization - time tracking
let lastUIUpdateTime = 0;
const UI_UPDATE_INTERVAL = 250; // Update UI every 250ms
let lastServerUpdateTime = 0;
const SERVER_UPDATE_INTERVAL = 100; // Send updates to server every 100ms

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

// Function to convert board coordinates to scene coordinates
function boardToScene(boardX, boardZ) {
  return {
    x: boardX - 3.5,
    z: boardZ - 3.5
  };
}

// Set up socket.io connection
// Use empty io() to connect to the same origin that served the page
let socket;
try {
  // This will be available if the socket.io script loaded correctly
  socket = io();
  window.socket = socket; // Make socket globally accessible
  
  console.log('Socket.IO initialized');
  
  setupSocketHandlers();
} catch (e) {
  console.error('Failed to initialize Socket.IO:', e);
  document.getElementById('ui').innerHTML = 
    '<div style="color: red; background: rgba(0,0,0,0.7); padding: 20px;">Failed to connect to game server. Please try refreshing the page.</div>';
}

// Setup socket event handlers
function setupSocketHandlers() {
  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    
    // Ask server for piece assignment
    socket.emit('requestPieceAssignment', { id: socket.id });
  });

  // Handle piece assignment from server
  socket.on('pieceAssignment', (data) => {
    if (!data.type || !data.team || !data.position) {
      console.error("Invalid piece assignment data:", data);
      return;
    }
    
    console.log(`Assigned ${data.team} ${data.type} at position (${data.position.x}, ${data.position.z})`);
    
    // Update UI to show player info
    document.getElementById('pieceInfo').textContent = 
      `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} (${data.team})`;
    
    // Create new piece with assigned type and team
    const piece = new ChessPiece(data.type, data.team, socket.id);
    players.set(socket.id, piece);
    scene.add(piece.mesh);
    
    // Position the piece on the board (convert board coordinates to scene coordinates)
    const scenePos = boardToScene(data.position.x, data.position.z);
    piece.mesh.position.set(scenePos.x, 1, scenePos.z);
    
    // Register the piece with chess rules
    try {
      chessRules.registerPiece(socket.id, {
        type: data.type,
        team: data.team,
        position: data.position,
        hp: piece.hp
      });
    } catch (error) {
      console.error("Error registering piece:", error);
    }
    
    // Confirm registration with server
    socket.emit('confirmPieceAssignment', {
      id: socket.id,
      type: data.type,
      team: data.team,
      position: data.position,
      hp: piece.hp
    });
  });

  // Handle updates from server
  socket.on('update', (serverPlayers) => {
    // Process each player data from the server
    for (const [id, p] of Object.entries(serverPlayers)) {
      let piece = players.get(id);
      
      // If this is a new player we haven't seen before
      if (!piece && p && p.hp > 0) {
        // Create new piece object (ensure we have valid type and team)
        const pieceType = p.type || 'pawn';
        const pieceTeam = p.team || 'white';
        
        piece = new ChessPiece(pieceType, pieceTeam, id);
        players.set(id, piece);
        scene.add(piece.mesh);
        
        // Add metadata to the mesh for raycasting
        piece.mesh.userData.pieceId = id;
        
        // Register with chess rules
        try {
          chessRules.registerPiece(id, {
            type: pieceType,
            team: pieceTeam,
            position: p.position || { x: 0, z: 0 },
            hp: p.hp
          });
        } catch (error) {
          console.error("Error registering piece from server update:", error);
        }
      }
      
      if (piece && p) {
        // Update position
        if (p.position) {
          // Convert from board coordinates (0-7) to scene coordinates (-3.5 to 3.5)
          const scenePos = boardToScene(p.position.x, p.position.z);
          piece.mesh.position.set(scenePos.x, 1, scenePos.z);
          
          // Update position in chess rules
          try {
            chessRules.updatePiecePosition(id, p.position);
          } catch (error) {
            console.error("Error updating piece position:", error);
          }
        }
        
        // Update health
        piece.hp = p.hp;
        
        // Remove if dead
        if (p.hp <= 0) {
          scene.remove(piece.mesh);
          players.delete(id);
        }
      }
    }
  });

  // Handle other socket events
  socket.on('gameEvent', (eventData) => {
    console.log("Game event received:", eventData);
    // Update UI to show event
    document.getElementById('activeEvents').innerHTML = 
      `<div>${eventData.eventType || 'Game event'} activated!</div>` + document.getElementById('activeEvents').innerHTML;
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    document.getElementById('ui').innerHTML = 
      '<div style="color: red; background: rgba(0,0,0,0.7); padding: 20px;">Connection lost. Please refresh the page.</div>';
  });
}

// Game state for player movement
const playerMovement = {
  moveDirection: new THREE.Vector3(),
  moving: false,
  keysPressed: { w: false, a: false, s: false, d: false },
  targetPosition: null
};

// Handle player movement with keyboard
document.addEventListener('keydown', (e) => {
  // Only track the keys we care about
  if (!['w', 'a', 's', 'd', ' '].includes(e.key)) return;
  
  // Return if socket not initialized
  if (!socket) return;
  
  const player = players.get(socket.id);
  if (!player) return;
  
  if (e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd') {
    // Track key state
    playerMovement.keysPressed[e.key] = true;
    
    // Calculate movement direction
    updateMoveDirection();
  }
  
  // Use ability with spacebar
  if (e.key === ' ') {
    const currentPos = player.mesh.position.clone();
    const boardX = Math.round(currentPos.x + 3.5);
    const boardZ = Math.round(currentPos.z + 3.5);
    
    const targetPos = { 
      x: currentPos.x, 
      z: currentPos.z + 1 
    };
    
    // Visual feedback for ability usage
    player.useAbility(targetPos);
    
    // Send to server
    socket.emit('ability', { 
      id: socket.id, 
      target: { 
        x: boardX, 
        z: boardZ + 1 
      }, 
      damage: player.getAbilityDamage() 
    });
  }
});

document.addEventListener('keyup', (e) => {
  // Only track the keys we care about
  if (!['w', 'a', 's', 'd'].includes(e.key)) return;
  
  // Reset key state
  playerMovement.keysPressed[e.key] = false;
  
  // Update movement direction
  updateMoveDirection();
});

// Update player movement direction based on keys pressed
function updateMoveDirection() {
  playerMovement.moveDirection.set(0, 0, 0);
  
  if (playerMovement.keysPressed.w) playerMovement.moveDirection.z -= 1;
  if (playerMovement.keysPressed.s) playerMovement.moveDirection.z += 1;
  if (playerMovement.keysPressed.a) playerMovement.moveDirection.x -= 1;
  if (playerMovement.keysPressed.d) playerMovement.moveDirection.x += 1;
  
  // Normalize to prevent faster diagonal movement
  if (playerMovement.moveDirection.length() > 0) {
    playerMovement.moveDirection.normalize();
    playerMovement.moving = true;
  } else {
    playerMovement.moving = false;
  }
}

// Updates player position based on current movement
function updatePlayerPosition(delta) {
  if (!socket || !playerMovement.moving) return;
  
  const player = players.get(socket.id);
  if (!player) return;
  
  // Get current position in scene coordinates
  const currentPos = player.mesh.position.clone();
  
  // Calculate target position (snap to grid)
  if (!playerMovement.targetPosition) {
    // Convert current position to board coordinates (0-7)
    const boardX = Math.round(currentPos.x + 3.5);
    const boardZ = Math.round(currentPos.z + 3.5);
    
    // Calculate new position based on movement direction
    const newBoardX = boardX + Math.round(playerMovement.moveDirection.x);
    const newBoardZ = boardZ + Math.round(playerMovement.moveDirection.z);
    
    // Check board boundaries
    if (newBoardX < 0 || newBoardX > 7 || newBoardZ < 0 || newBoardZ > 7) {
      return; // Out of bounds
    }
    
    // Set target position
    const scenePos = boardToScene(newBoardX, newBoardZ);
    playerMovement.targetPosition = new THREE.Vector3(scenePos.x, 1, scenePos.z);
    
    // Send move to server (only when we start moving to a new position)
    socket.emit('move', { 
      id: socket.id, 
      position: { x: newBoardX, z: newBoardZ }
    });
  }
  
  // Move towards target position (smooth movement)
  if (playerMovement.targetPosition) {
    const moveSpeed = 5 * delta; // Movement speed (adjust as needed)
    
    // Calculate direction to target
    const moveVec = playerMovement.targetPosition.clone().sub(currentPos);
    const distance = moveVec.length();
    
    if (distance < 0.05) {
      // We've reached the target - snap to exact position
      player.mesh.position.copy(playerMovement.targetPosition);
      playerMovement.targetPosition = null;
    } else {
      // Move towards target
      moveVec.normalize().multiplyScalar(Math.min(moveSpeed, distance));
      player.mesh.position.add(moveVec);
    }
  }
}

// Update health UI (throttled to improve performance)
function updateHealthUI(time) {
  // Only update UI periodically, not every frame
  if (time - lastUIUpdateTime < UI_UPDATE_INTERVAL) return;
  lastUIUpdateTime = time;
  
  // Safely update health UI, handling potential errors
  try {
    if (socket && players.get(socket.id)) {
      const playerPiece = players.get(socket.id);
      
      // Make sure we have valid HP values to avoid NaN
      const maxHp = playerPiece.getInitialHP();
      const safeHp = playerPiece.hp;
      const healthPercent = Math.min(100, Math.max(0, (safeHp / maxHp) * 100));
      
      const healthBar = document.getElementById('health');
      if (healthBar) {
        healthBar.style.width = `${healthPercent}%`;
        
        // Change color based on health
        if (healthPercent > 60) {
          healthBar.style.backgroundColor = '#4CAF50'; // Green
        } else if (healthPercent > 30) {
          healthBar.style.backgroundColor = '#FFC107'; // Yellow
        } else {
          healthBar.style.backgroundColor = '#F44336'; // Red
        }
      }
      
      // Update cooldown
      const ability = playerPiece.getAbilityDetails();
      updateCooldownUI(playerPiece.cooldown, ability.cooldown);
    }
  } catch (error) {
    console.error("Error updating health UI:", error);
  }
}

// Update cooldown UI
function updateCooldownUI(cooldown, maxCooldown) {
  try {
    if (isNaN(cooldown) || isNaN(maxCooldown) || maxCooldown <= 0) {
      return;
    }
    
    const cooldownPercent = Math.min(100, Math.max(0, (cooldown / maxCooldown) * 100));
    const cooldownBar = document.getElementById('cooldown');
    
    if (cooldownBar) {
      cooldownBar.style.width = `${cooldownPercent}%`;
    }
  } catch (error) {
    console.error("Error updating cooldown UI:", error);
  }
}

// Update game timer
function updateGameTimer(time) {
  // Only update UI periodically, not every frame
  if (time - lastUIUpdateTime < UI_UPDATE_INTERVAL) return;
  
  try {
    const minutes = Math.floor(game.time / 60);
    const seconds = Math.floor(game.time % 60);
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
      timerElement.textContent = `Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    // Calculate time to next event
    if (game && game.settings && game.eventTimer !== undefined) {
      const nextEventTime = Math.floor((game.settings.eventInterval - game.eventTimer) / 60);
      const nextEventSeconds = Math.floor((game.settings.eventInterval - game.eventTimer) % 60);
      
      const nextEventElement = document.getElementById('nextEvent');
      if (nextEventElement) {
        nextEventElement.textContent = 
          `Next Event: ${nextEventTime}:${nextEventSeconds < 10 ? '0' : ''}${nextEventSeconds}`;
      }
    }
  } catch (error) {
    console.error("Error updating game timer:", error);
  }
}

// Animation loop with performance optimizations
let time = 0;
let lastTime = 0;
function animate(timestamp) {
  requestAnimationFrame(animate);
  
  // Calculate delta time for smooth animations regardless of frame rate
  const delta = (timestamp - lastTime) / 1000; // Convert to seconds
  lastTime = timestamp;
  
  // Cap delta time to prevent huge jumps if tab was inactive
  const cappedDelta = Math.min(delta, 0.1);
  
  // Update time
  time += cappedDelta;
  
  // Update game logic
  game.update(cappedDelta);
  
  // Update player position based on movement
  updatePlayerPosition(cappedDelta);
  
  // Update UI (throttled)
  updateHealthUI(time);
  updateGameTimer(time);
  
  // Animate all visible pieces (with frustum culling)
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix, 
      camera.matrixWorldInverse
    )
  );
  
  players.forEach(piece => {
    // Skip animation for pieces outside the camera view
    if (!piece || !piece.mesh) return;
    
    // Only animate pieces in view
    if (frustum.containsPoint(piece.mesh.position)) {
      if (piece.animate) {
        piece.animate(cappedDelta, time);
      }
    }
  });
  
  // Update controls
  controls.update();
  
  // Render scene
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Export traditional positions for other modules to use
window.traditionalPositions = traditionalPositions;

// Start animation loop with timestamp
animate(0);
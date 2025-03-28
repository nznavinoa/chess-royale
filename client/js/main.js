// main.js - Main entry point for the Chess Royale game

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ChessPiece } from './pieces.js';
import { createMap } from './map.js';
import { Game } from './game.js';
import { ChessRules } from './chessRules.js';

// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set up orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 15, 15);
controls.update();

// Add lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
scene.add(new THREE.AmbientLight(0xF5E8C7, 0.4));

// Set background color - sky color blend
scene.background = new THREE.Color().setStyle('#87CEEB').lerp(new THREE.Color('#483D8B'), 0.5);

// Initialize game logic
const game = new Game();
const chessRules = new ChessRules();

// Add the chess board to the scene
scene.add(createMap());

// Store players
const players = new Map();

// Make scene globally accessible for other modules
window.scene = scene;

// Error handling for registerPiece
if (typeof chessRules.registerPiece !== 'function') {
  console.error("registerPiece method not found on chessRules instance!");
  console.log("chessRules instance:", chessRules);
  
  // Add the method directly to the instance as a fallback
  chessRules.registerPiece = function(id, pieceData) {
    console.log("Using fallback registerPiece method");
    if (!this.pieces) {
      this.pieces = new Map();
    }
    
    // Store the piece
    this.pieces.set(id, {
      ...pieceData,
      id
    });
    
    return this.pieces.get(id);
  };
}

// Set up socket.io connection
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  
  // Assign random piece type and team
  const pieceTypes = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
  const randomPieceType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
  const randomTeam = Math.random() > 0.5 ? 'white' : 'black';
  
  // Create a new piece for this player
  const piece = new ChessPiece(randomPieceType, randomTeam, socket.id);
  players.set(socket.id, piece);
  scene.add(piece.mesh);
  
  // Set initial position
  const initialPosition = { 
    x: Math.floor(Math.random() * 8), 
    z: Math.floor(Math.random() * 8) 
  };
  piece.mesh.position.set(initialPosition.x, 1, initialPosition.z);
  
  // Register the piece with chess rules
  console.log("About to register piece:", socket.id, {
    type: randomPieceType,
    team: randomTeam,
    position: initialPosition,
    hp: piece.hp
  });
  
  try {
    chessRules.registerPiece(socket.id, {
      type: randomPieceType,
      team: randomTeam,
      position: initialPosition,
      hp: piece.hp
    });
    console.log("Successfully registered piece");
  } catch (error) {
    console.error("Error registering piece:", error);
  }
  
  // Notify server about the new piece
  socket.emit('register', {
    id: socket.id,
    type: randomPieceType,
    team: randomTeam,
    position: initialPosition,
    hp: piece.hp
  });
});

// Handle updates from server
socket.on('update', (serverPlayers) => {
  console.log("Received update from server:", serverPlayers);
  
  // Convert the object back to a Map if needed
  const playerData = serverPlayers instanceof Map ? 
    serverPlayers : new Map(Object.entries(serverPlayers));
  
  playerData.forEach((p, id) => {
    let piece = players.get(id);
    
    // If this is a new player we haven't seen before
    if (!piece && p.hp > 0) {
      // Create new piece object
      piece = new ChessPiece(p.type || 'pawn', p.team || 'white', id);
      players.set(id, piece);
      scene.add(piece.mesh);
      
      // Add metadata to the mesh for raycasting
      piece.mesh.userData.pieceId = id;
      
      // Register with chess rules
      try {
        chessRules.registerPiece(id, {
          type: p.type || 'pawn',
          team: p.team || 'white',
          position: p.position,
          hp: p.hp
        });
      } catch (error) {
        console.error("Error registering piece from server update:", error);
      }
    }
    
    if (piece) {
      // Update position
      if (p.position) {
        piece.mesh.position.set(p.position.x, 1, p.position.z);
        
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
  });
});

// Handle player movement with keyboard
document.addEventListener('keydown', (e) => {
  const player = players.get(socket.id);
  if (!player) return;
  
  const pos = player.mesh.position.clone();
  let moved = false;
  
  // Movement keys
  if (e.key === 'w') { pos.z -= 1; moved = true; }
  if (e.key === 's') { pos.z += 1; moved = true; }
  if (e.key === 'a') { pos.x -= 1; moved = true; }
  if (e.key === 'd') { pos.x += 1; moved = true; }
  
  if (moved) {
    // Get the current piece data from chess rules
    const newPosition = { x: pos.x, z: pos.z };
    const piece = chessRules.getPieceById(socket.id);
    
    let canMove = true;
    
    // If chess rules are active, validate move
    if (piece && piece.position) {
      try {
        const validMoves = chessRules.getValidMoves(piece.position);
        canMove = validMoves.some(move => 
          move.x === newPosition.x && move.z === newPosition.z
        );
      } catch (error) {
        console.error("Error getting valid moves:", error);
        canMove = true; // Allow move if error in validation
      }
    }
    
    if (canMove && chessRules.isValidPosition(newPosition)) {
      // Update position locally first for responsive feel
      player.mesh.position.set(newPosition.x, 1, newPosition.z);
      
      // Update in chess rules
      if (piece) {
        try {
          chessRules.updatePiecePosition(socket.id, newPosition);
        } catch (error) {
          console.error("Error updating position:", error);
        }
      }
      
      // Send move to server
      socket.emit('move', { 
        id: socket.id, 
        position: newPosition 
      });
    }
  }
  
  // Use ability with spacebar
  if (e.key === ' ') {
    const targetPos = { 
      x: Math.round(pos.x), 
      z: Math.round(pos.z + 1) 
    };
    
    player.useAbility(targetPos);
    socket.emit('ability', { 
      id: socket.id, 
      target: targetPos, 
      damage: player.getAbilityDamage() 
    });
  }
});

// Function to show move guides
function showMoveGuides(position) {
  // Clear any existing guides
  clearMoveGuides();
  
  // Get valid moves
  let validMoves = [];
  
  try {
    validMoves = chessRules.getValidMoves(position);
  } catch (error) {
    console.error("Error getting valid moves for guides:", error);
    return;
  }
  
  // Create visual indicators for valid moves
  validMoves.forEach(move => {
    // Create a guide indicator (e.g., a circle)
    const guideGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const guideMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.6 
    });
    const guide = new THREE.Mesh(guideGeometry, guideMaterial);
    guide.position.set(move.x, 0.2, move.z);
    guide.userData.isMoveGuide = true;
    
    // Add to scene
    scene.add(guide);
  });
}

// Function to clear move guides
function clearMoveGuides() {
  // Find and remove all guide objects from the scene
  const guidesToRemove = [];
  scene.traverse(child => {
    if (child.userData && child.userData.isMoveGuide) {
      guidesToRemove.push(child);
    }
  });
  
  guidesToRemove.forEach(guide => {
    scene.remove(guide);
  });
}

// Handle board click to show valid moves
renderer.domElement.addEventListener('click', (event) => {
  // Calculate mouse position and raycasting
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // Find intersected objects
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    // Get the first intersected object
    const intersect = intersects[0].object;
    
    // Traverse up to find the root mesh that might have userData
    let targetObject = intersect;
    while (targetObject && !targetObject.userData?.pieceId) {
      targetObject = targetObject.parent;
    }
    
    // Check if it's a chess piece
    if (targetObject && targetObject.userData && targetObject.userData.pieceId) {
      const piece = chessRules.getPieceById(targetObject.userData.pieceId);
      if (piece) {
        // Show valid moves for this piece
        showMoveGuides(piece.position);
      }
    } else {
      // If clicking on the board, clear guides
      clearMoveGuides();
      
      // Check if it's a move guide
      if (intersect.userData && intersect.userData.isMoveGuide) {
        // Get the position of the guide
        const movePosition = { 
          x: intersect.position.x, 
          z: intersect.position.z 
        };
        
        // Move the player's piece to this position if it's our turn
        const playerPiece = players.get(socket.id);
        if (playerPiece) {
          // Update locally
          playerPiece.mesh.position.set(movePosition.x, 1, movePosition.z);
          
          // Update in chess rules
          try {
            chessRules.updatePiecePosition(socket.id, movePosition);
          } catch (error) {
            console.error("Error updating position after guide click:", error);
          }
          
          // Send to server
          socket.emit('move', { 
            id: socket.id, 
            position: movePosition 
          });
          
          // Clear guides after moving
          clearMoveGuides();
        }
      }
    }
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.05;
  
  // Update game logic
  game.update(0.05);
  
  // Animate all pieces
  players.forEach(piece => {
    if (piece.animate) {
      piece.animate(time);
    }
  });
  
  // Animate event effects
  animateEffects(time);
  
  // Render scene
  renderer.render(scene, camera);
}

// Animate event effects
function animateEffects(time) {
  // Find all effect objects in the scene
  scene.traverse(object => {
    if (!object.userData) return;
    
    // Animate falling petals
    if (object.userData.fallSpeed) {
      // Move down
      object.position.y -= object.userData.fallSpeed * 0.05;
      
      // Swaying motion
      object.position.x += Math.sin(time * object.userData.swaySpeed) * object.userData.swayAmount * 0.05;
      
      // Rotate
      object.rotation.x += object.userData.rotateSpeed;
      object.rotation.z += object.userData.rotateSpeed;
      
      // Remove if below ground
      if (object.position.y < 0) {
        scene.remove(object);
      }
    }
    
    // Animate king's call aura
    if (object.userData.type === 'kingsCallAura') {
      // Calculate lifetime progress (0-1)
      const elapsed = time - object.userData.startTime;
      const progress = elapsed / object.userData.lifetime;
      
      // Expand and fade
      const scale = 1 + progress * 2;
      object.scale.set(scale, scale, scale);
      
      if (object.material) {
        object.material.opacity = 0.5 * (1 - progress);
      }
      
      // Remove when expired
      if (progress >= 1) {
        scene.remove(object);
      }
    }
    
    // Animate damage effect particles
    if (object.userData.velocity) {
      // Move according to velocity
      object.position.x += object.userData.velocity.x;
      object.position.y += object.userData.velocity.y;
      object.position.z += object.userData.velocity.z;
      
      // Add gravity
      object.userData.velocity.y -= 0.01;
      
      // Reduce lifetime
      object.userData.lifetime -= 0.05;
      
      // Fade out
      if (object.material) {
        object.material.opacity = object.userData.lifetime;
      }
      
      // Remove if expired
      if (object.userData.lifetime <= 0) {
        if (object.parent) {
          object.parent.remove(object);
        } else {
          scene.remove(object);
        }
      }
    }
    
    // Animate loot items
    if (object.userData.lootId) {
      // Floating motion
      object.position.y = 0.5 + Math.sin(time * 2) * 0.1;
      
      // Slow rotation
      object.rotation.y += 0.02;
    }
  });
}

// Start animation loop
animate();
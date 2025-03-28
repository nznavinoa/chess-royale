import * as THREE from 'three';

export function createMap() {
  const map = new THREE.Group();
  
  // Create the chess board base
  createChessBoard(map);
  
  // Add decorative elements
  addEnvironmentDecoration(map);
  
  return map;
}

// Create the chess board with alternating colors
function createChessBoard(map) {
  const boardSize = 8;
  const tileSize = 1;
  
  // Create grid of tiles
  for (let x = 0; x < boardSize; x++) {
    for (let z = 0; z < boardSize; z++) {
      // Determine tile color (alternating pattern)
      const isWhite = (x + z) % 2 === 0;
      
      // Create tile geometry with slightly rounded corners
      const tileGeometry = new THREE.BoxGeometry(tileSize, 0.1, tileSize);
      
      // Create material with appropriate color
      const tileMaterial = new THREE.MeshToonMaterial({
        color: isWhite ? 0x6B8E23 : 0x87CEEB, // Mossy Green or Sky Blue
      });
      
      // Create mesh and position it
      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      tile.position.set(
        x - (boardSize / 2) + 0.5, 
        0, 
        z - (boardSize / 2) + 0.5
      );
      
      // Make tile receive shadows
      tile.receiveShadow = true;
      
      // Add a small random rotation for organic feel
      tile.rotation.y = (Math.random() - 0.5) * 0.05;
      
      // Add tile to map
      map.add(tile);
      
      // Add subtle elevation variation for organic feel
      tile.position.y = (Math.random() - 0.5) * 0.03;
      
      // Add decorative elements to some tiles
      if (Math.random() < 0.2) {
        addTileDecoration(tile, isWhite);
      }
    }
  }
  
  // Add a border around the board
  const borderMaterial = new THREE.MeshToonMaterial({ color: 0x8B4513 }); // Wood color
  
  // North border
  const northBorder = new THREE.Mesh(
    new THREE.BoxGeometry(boardSize + 0.4, 0.2, 0.2),
    borderMaterial
  );
  northBorder.position.set(0, 0, -(boardSize / 2) - 0.1);
  map.add(northBorder);
  
  // South border
  const southBorder = new THREE.Mesh(
    new THREE.BoxGeometry(boardSize + 0.4, 0.2, 0.2),
    borderMaterial
  );
  southBorder.position.set(0, 0, (boardSize / 2) + 0.1);
  map.add(southBorder);
  
  // East border
  const eastBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, boardSize + 0.4),
    borderMaterial
  );
  eastBorder.position.set((boardSize / 2) + 0.1, 0, 0);
  map.add(eastBorder);
  
  // West border
  const westBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, boardSize + 0.4),
    borderMaterial
  );
  westBorder.position.set(-(boardSize / 2) - 0.1, 0, 0);
  map.add(westBorder);
  
  return map;
}

// Add decorative elements to individual tiles
function addTileDecoration(tile, isWhite) {
  // Different decorations depending on tile color
  if (isWhite) {
    // Grass tuft for green tiles
    const grassGeometry = new THREE.ConeGeometry(0.05, 0.1, 4);
    const grassMaterial = new THREE.MeshToonMaterial({ color: 0x9ACD32 });
    
    // Add a small cluster of grass blades
    const grassCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < grassCount; i++) {
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      
      // Position grass on the tile with slight random offset
      const xOffset = (Math.random() - 0.5) * 0.7;
      const zOffset = (Math.random() - 0.5) * 0.7;
      
      grass.position.set(xOffset, 0.05, zOffset);
      
      // Random rotation and slight tilt
      grass.rotation.y = Math.random() * Math.PI;
      grass.rotation.x = (Math.random() - 0.5) * 0.2;
      
      tile.add(grass);
    }
  } else {
    // Small pebble for blue tiles
    if (Math.random() < 0.4) {
      const pebbleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
      const pebbleMaterial = new THREE.MeshToonMaterial({ color: 0xC0C0C0 });
      
      const pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
      
      // Position pebble on the tile with slight random offset
      const xOffset = (Math.random() - 0.5) * 0.7;
      const zOffset = (Math.random() - 0.5) * 0.7;
      
      pebble.position.set(xOffset, 0.05, zOffset);
      pebble.scale.y = 0.5; // Flatten it a bit
      
      // Random rotation
      pebble.rotation.y = Math.random() * Math.PI;
      
      tile.add(pebble);
    }
  }
}

// Add environment decorations around the board
function addEnvironmentDecoration(map) {
  // Add small hills in the background
  for (let i = 0; i < 8; i++) {
    const hillSize = Math.random() * 4 + 2;
    const hillHeight = Math.random() * 1.5 + 0.5;
    
    const hillGeometry = new THREE.SphereGeometry(hillSize, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMaterial = new THREE.MeshToonMaterial({ color: 0x6B8E23 }); // Mossy green
    
    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    
    // Position hills around the board at a distance
    const angle = (i / 8) * Math.PI * 2;
    const distance = 10 + Math.random() * 5;
    
    hill.position.x = Math.cos(angle) * distance;
    hill.position.z = Math.sin(angle) * distance;
    hill.position.y = -hillHeight + (Math.random() * 0.1);
    
    // Random scale variation
    const scaleVar = 0.8 + Math.random() * 0.4;
    hill.scale.set(scaleVar, scaleVar * (0.5 + Math.random() * 0.5), scaleVar);
    
    map.add(hill);
  }
  
  // Add clouds in the sky
  for (let i = 0; i < 6; i++) {
    const cloudGroup = new THREE.Group();
    
    // Create cloud with multiple overlapping spheres
    const puffCount = Math.floor(Math.random() * 3) + 2;
    
    for (let j = 0; j < puffCount; j++) {
      const puffSize = Math.random() * 1 + 0.5;
      const puffGeometry = new THREE.SphereGeometry(puffSize, 7, 5);
      const puffMaterial = new THREE.MeshToonMaterial({ 
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8
      });
      
      const puff = new THREE.Mesh(puffGeometry, puffMaterial);
      
      // Position puffs relative to each other
      puff.position.x = (Math.random() - 0.5) * 2;
      puff.position.y = (Math.random() - 0.5) * 0.5;
      puff.position.z = (Math.random() - 0.5) * 2;
      
      cloudGroup.add(puff);
    }
    
    // Position cloud in the sky
    const angle = (i / 6) * Math.PI * 2;
    const distance = 12 + Math.random() * 8;
    const height = 8 + Math.random() * 4;
    
    cloudGroup.position.x = Math.cos(angle) * distance;
    cloudGroup.position.z = Math.sin(angle) * distance;
    cloudGroup.position.y = height;
    
    map.add(cloudGroup);
  }
}
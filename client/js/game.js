// game.js - Game logic and events

import * as THREE from 'three';

/**
 * Game class to handle game state, logic, and events
 */
export class Game {
  constructor() {
    // Game state
    this.players = new Map();
    this.lootItems = new Map();
    this.entities = new Map();
    
    // Timing variables
    this.time = 0;
    this.eventTimer = 0;
    this.lootTimer = 0;
    
    // Event and loot container
    this.eventContainer = new THREE.Group();
    
    // Game settings
    this.settings = {
      eventInterval: 180,  // 3 minutes between events
      lootInterval: 120,   // 2 minutes between loot drops
      gameLength: 900,     // 15 minute game
      lateGameTime: 480    // 8 minutes until late game surge
    };
  }
  
  /**
   * Update game state
   * @param {number} delta - Time delta since last update
   */
  update(delta) {
    // Update game time
    this.time += delta;
    this.eventTimer += delta;
    this.lootTimer += delta;
    
    // Check if it's time for a random event
    if (this.eventTimer >= this.settings.eventInterval) {
      this.triggerEvent();
      this.eventTimer = 0;
    }
    
    // Check if it's time for a loot drop
    if (this.lootTimer >= this.settings.lootInterval) {
      this.spawnLoot();
      this.lootTimer = 0;
    }
    
    // Update all entities
    this.updateEntities(delta);
  }
  
  /**
   * Trigger a random game event
   */
  triggerEvent() {
    // Event selection logic
    const events = [
      this.eventPetalRain.bind(this),    // Extra loot drops
      this.eventKingsCall.bind(this),    // Kings gain HP
      this.eventWildSprout.bind(this)    // Spawn a neutral entity
    ];
    
    // Check if we're in late game
    if (this.time > this.settings.lateGameTime) {
      // Trigger late game surge
      this.eventLateGameSurge();
    } else {
      // Pick a random event
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      randomEvent();
    }
    
    // Broadcast the event to all players if using network
    if (typeof socket !== 'undefined') {
      socket.emit('gameEvent', {
        time: this.time,
        eventType: randomEvent.name
      });
    }
  }
  
  /**
   * Event: Petal Rain - Spawn extra loot
   */
  eventPetalRain() {
    console.log('Event: Petal Rain - Extra loot spawned!');
    
    // Spawn 3 loot items
    for (let i = 0; i < 3; i++) {
      this.spawnLoot(true); // true = event loot (might have better items)
    }
    
    // Create visual effect
    if (typeof scene !== 'undefined') {
      // Create falling petals effect
      for (let i = 0; i < 50; i++) {
        this.createFallingPetal();
      }
    }
  }
  
  /**
   * Event: King's Call - Kings gain HP
   */
  eventKingsCall() {
    console.log('Event: King\'s Call - Kings gain +5 HP!');
    
    // Heal all kings
    this.players.forEach(p => {
      if (p.type === 'king') {
        p.hp = Math.min(p.hp + 5, 20);
      }
    });
    
    // Create visual effect if we have scene access
    if (typeof scene !== 'undefined') {
      this.createKingsCallEffect();
    }
  }
  
  /**
   * Event: Wild Sprout - Spawn a neutral entity
   */
  eventWildSprout() {
    console.log('Event: Wild Sprout - A Vine Beast has spawned!');
    
    // Create a neutral "Vine Beast" entity
    const position = {
      x: Math.floor(Math.random() * 8),
      z: Math.floor(Math.random() * 8)
    };
    
    const vineId = `vine_${Date.now()}`;
    this.entities.set(vineId, {
      id: vineId,
      type: 'vineBeast',
      position: position,
      hp: 10,
      isNeutral: true,
      lastMoveTime: this.time
    });
    
    // Create visual representation if we have scene access
    if (typeof scene !== 'undefined') {
      this.createVineBeastMesh(vineId, position);
    }
  }
  
  /**
   * Event: Late Game Surge - Reduce ability cooldowns
   */
  eventLateGameSurge() {
    console.log('Event: Late Game Surge - Ability cooldowns reduced!');
    
    // Update all players' cooldowns
    this.players.forEach(p => {
      if (p.cooldown) {
        p.cooldown /= 2;
      }
    });
    
    // Create visual effect if we have scene access
    if (typeof scene !== 'undefined') {
      this.createLateGameSurgeEffect();
    }
  }
  
  /**
   * Spawn a loot item on the board
   * @param {boolean} isEventLoot - Whether this is from an event (better items)
   */
  spawnLoot(isEventLoot = false) {
    // Find a random empty position on the board
    const position = this.findEmptyPosition();
    if (!position) return; // Board is full
    
    // Choose a random loot type
    const lootTypes = [
      'doubleMove',  // Two moves in one turn
      'petalShield', // Blocks one capture
      'vineTrap'     // Immobilizes an enemy
    ];
    
    const lootType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
    
    // Create loot item
    const lootId = `loot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.lootItems.set(lootId, {
      id: lootId,
      type: lootType,
      position: position,
      duration: lootType === 'petalShield' ? 10 : 5, // Duration in seconds
      isEventLoot: isEventLoot
    });
    
    // Create visual representation if we have scene access
    if (typeof scene !== 'undefined') {
      this.createLootMesh(lootId, lootType, position);
    }
    
    console.log(`Spawned ${lootType} loot at (${position.x}, ${position.z})`);
    
    // Broadcast to all players if using network
    if (typeof socket !== 'undefined') {
      socket.emit('lootSpawn', {
        id: lootId,
        type: lootType,
        position: position
      });
    }
  }
  
  /**
   * Find an empty position on the board
   * @returns {Object|null} - Empty position {x, z} or null if none found
   */
  findEmptyPosition() {
    // Try up to 20 random positions
    for (let i = 0; i < 20; i++) {
      const position = {
        x: Math.floor(Math.random() * 8),
        z: Math.floor(Math.random() * 8)
      };
      
      // Check if position is empty
      if (this.isPositionEmpty(position)) {
        return position;
      }
    }
    
    // If we couldn't find a random empty spot, check all positions systematically
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        const position = { x, z };
        if (this.isPositionEmpty(position)) {
          return position;
        }
      }
    }
    
    return null; // Board is completely full
  }
  
  /**
   * Check if a position is empty (no players, entities, or loot)
   * @param {Object} position - Position to check {x, z}
   * @returns {boolean} - Whether the position is empty
   */
  isPositionEmpty(position) {
    // Check for players
    let hasPiece = false;
    this.players.forEach(player => {
      if (player.position && 
          player.position.x === position.x && 
          player.position.z === position.z) {
        hasPiece = true;
      }
    });
    
    if (hasPiece) return false;
    
    // Check for entities
    let hasEntity = false;
    this.entities.forEach(entity => {
      if (entity.position && 
          entity.position.x === position.x && 
          entity.position.z === position.z) {
        hasEntity = true;
      }
    });
    
    if (hasEntity) return false;
    
    // Check for loot
    let hasLoot = false;
    this.lootItems.forEach(loot => {
      if (loot.position && 
          loot.position.x === position.x && 
          loot.position.z === position.z) {
        hasLoot = true;
      }
    });
    
    return !hasLoot;
  }
  
  /**
   * Update all entities in the game
   * @param {number} delta - Time delta since last update
   */
  updateEntities(delta) {
    // Update neutral entities like the Vine Beast
    this.entities.forEach((entity, id) => {
      // Move neutral entities randomly every few seconds
      if (entity.isNeutral && entity.lastMoveTime + 3 < this.time) {
        this.moveNeutralEntity(id);
        entity.lastMoveTime = this.time;
      }
    });
    
    // Update loot items (check for collection, expiry, etc.)
    this.lootItems.forEach((loot, id) => {
      // Check if any player is on the loot
      this.players.forEach(player => {
        if (player.position && 
            player.position.x === loot.position.x && 
            player.position.z === loot.position.z) {
          // Player collected loot
          this.collectLoot(player.id, id);
        }
      });
    });
  }
  
  /**
   * Move a neutral entity like the Vine Beast
   * @param {string} entityId - ID of the entity to move
   */
  moveNeutralEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return;
    
    // Get possible moves (adjacent squares)
    const moves = [
      { x: entity.position.x + 1, z: entity.position.z },
      { x: entity.position.x - 1, z: entity.position.z },
      { x: entity.position.x, z: entity.position.z + 1 },
      { x: entity.position.x, z: entity.position.z - 1 }
    ];
    
    // Filter for valid moves
    const validMoves = moves.filter(move => 
      move.x >= 0 && move.x < 8 && move.z >= 0 && move.z < 8
    );
    
    if (validMoves.length > 0) {
      // Choose a random valid move
      const newPosition = validMoves[Math.floor(Math.random() * validMoves.length)];
      
      // Update entity position
      entity.position = newPosition;
      
      // Update visual representation if we have scene access
      if (typeof scene !== 'undefined') {
        this.updateEntityMesh(entityId, newPosition);
      }
      
      // Check for collisions with players
      this.players.forEach(player => {
        if (player.position && 
            player.position.x === newPosition.x && 
            player.position.z === newPosition.z) {
          // Deal damage to player
          player.hp -= 2;
          
          // Create visual effect for damage
          if (typeof scene !== 'undefined') {
            this.createDamageEffect(newPosition);
          }
          
          // Broadcast update if using network
          if (typeof socket !== 'undefined') {
            socket.emit('playerDamage', {
              id: player.id,
              damage: 2,
              hp: player.hp
            });
          }
        }
      });
    }
  }
  
  /**
   * Handle a player collecting loot
   * @param {string} playerId - ID of the player collecting the loot
   * @param {string} lootId - ID of the loot being collected
   */
  collectLoot(playerId, lootId) {
    const player = this.players.get(playerId);
    const loot = this.lootItems.get(lootId);
    
    if (!player || !loot) return;
    
    console.log(`Player ${playerId} collected ${loot.type} loot`);
    
    // Apply loot effect
    switch (loot.type) {
      case 'doubleMove':
        player.hasDoubleMove = true;
        break;
        
      case 'petalShield':
        player.hasShield = true;
        player.shieldDuration = loot.duration;
        break;
        
      case 'vineTrap':
        // Store for later use
        player.hasVineTrap = true;
        break;
    }
    
    // Remove loot from board
    this.lootItems.delete(lootId);
    
    // Remove visual representation if we have scene access
    if (typeof scene !== 'undefined') {
      this.removeLootMesh(lootId);
    }
    
    // Broadcast collection if using network
    if (typeof socket !== 'undefined') {
      socket.emit('lootCollect', {
        playerId: playerId,
        lootId: lootId,
        lootType: loot.type
      });
    }
  }
  
  /**
   * Create a visual effect for falling petals (Petal Rain event)
   */
  createFallingPetal() {
    if (typeof scene === 'undefined' || !this.eventContainer) return;
    
    const petalGeometry = new THREE.CircleGeometry(0.2, 5);
    const petalMaterial = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xFF007F : 0x00FFC1, // Alternate between Vivid Magenta and Neon Teal
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    
    // Random position above the board
    petal.position.set(
      Math.random() * 8 - 4,
      5 + Math.random() * 3,
      Math.random() * 8 - 4
    );
    
    // Random rotation
    petal.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    // Add to container
    this.eventContainer.add(petal);
    
    // If container not in scene, add it
    if (!scene.getObjectById(this.eventContainer.id)) {
      scene.add(this.eventContainer);
    }
    
    // Set up animation for the petal
    const fallSpeed = 0.5 + Math.random() * 1.5;
    const rotateSpeed = Math.random() * 0.1;
    const swayAmount = 0.2 + Math.random() * 0.3;
    const swaySpeed = 0.5 + Math.random() * 1.5;
    
    // Store animation properties on the mesh
    petal.userData = {
      fallSpeed,
      rotateSpeed,
      swayAmount,
      swaySpeed,
      startTime: this.time,
      lifetime: 5 + Math.random() * 5 // 5-10 seconds
    };
    
    // Animation will be handled in the main game loop
  }
  
  /**
   * Create a visual effect for the King's Call event
   */
  createKingsCallEffect() {
    // Only create if we have scene access
    if (typeof scene === 'undefined') return;
    
    // Find all kings
    this.players.forEach(player => {
      if (player.type === 'king' && player.position) {
        // Create aura effect
        const auraGeometry = new THREE.RingGeometry(0.5, 2, 16);
        const auraColor = player.team === 'white' ? 0xFFD700 : 0xFF4500;
        
        const auraMaterial = new THREE.MeshBasicMaterial({
          color: auraColor,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.rotation.x = -Math.PI / 2; // Flat on the ground
        aura.position.set(player.position.x, 0.1, player.position.z);
        
        // Add to scene
        scene.add(aura);
        
        // Animate expanding then fading
        aura.userData = {
          startTime: this.time,
          lifetime: 3, // 3 seconds
          type: 'kingsCallAura'
        };
        
        // Animation will be handled in the main game loop
      }
    });
  }
  
  /**
   * Create a vine beast mesh for the Wild Sprout event
   * @param {string} id - Entity ID
   * @param {Object} position - Position {x, z}
   */
  createVineBeastMesh(id, position) {
    if (typeof scene === 'undefined') return;
    
    const vineBeast = new THREE.Group();
    vineBeast.userData = { entityId: id, type: 'vineBeast' };
    
    // Base with Electric Lime
    const baseGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const baseMaterial = new THREE.MeshToonMaterial({
      color: 0xCCFF00, // Electric Lime
      flatShading: true
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    vineBeast.add(base);
    
    // Create vines (thin cylinders)
    const vinesCount = 5;
    const vineGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 4);
    const vineMaterial = new THREE.MeshToonMaterial({
      color: 0x00FFC1, // Neon Teal
      flatShading: true
    });
    
    for (let i = 0; i < vinesCount; i++) {
      const vine = new THREE.Mesh(vineGeometry, vineMaterial);
      const angle = (i / vinesCount) * Math.PI * 2;
      
      // Position vines around the base
      vine.position.set(
        Math.cos(angle) * 0.4,
        0.5,
        Math.sin(angle) * 0.4
      );
      
      // Rotate to point outward and up
      vine.rotation.x = Math.PI / 4;
      vine.rotation.y = angle;
      
      vineBeast.add(vine);
    }
    
    // Add some leaf details (flat circles)
    const leafGeometry = new THREE.CircleGeometry(0.2, 5);
    const leafMaterial = new THREE.MeshToonMaterial({
      color: 0xCCFF00, // Electric Lime
      flatShading: true,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.set(
        (Math.random() - 0.5) * 0.5,
        0.3 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      
      // Random rotation for leaves
      leaf.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      vineBeast.add(leaf);
    }
    
    // Add eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 6, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF007F // Vivid Magenta
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.3, 0.2, 0.4);
    vineBeast.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-0.3, 0.2, 0.4);
    vineBeast.add(rightEye);
    
    // Position the entity
    vineBeast.position.set(position.x, 0.5, position.z);
    
    // Add to scene
    scene.add(vineBeast);
  }
  
  /**
   * Create a visual effect for the Late Game Surge event
   */
  createLateGameSurgeEffect() {
    // Only create if we have scene access
    if (typeof scene === 'undefined') return;
    
    // Create a pulsing light that covers the board
    const surgeLight = new THREE.PointLight(0xFFFF00, 2, 20);
    surgeLight.position.set(3.5, 5, 3.5); // Center above board
    scene.add(surgeLight);
    
    // Create a particle effect (a bunch of small spheres)
    const particleCount = 50;
    const particles = new THREE.Group();
    
    const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.7
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Random position around the board center
      const radius = 1 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      
      particle.position.set(
        3.5 + Math.cos(angle) * radius,
        0.5 + Math.random() * 3,
        3.5 + Math.sin(angle) * radius
      );
      
      // Add to particle group
      particles.add(particle);
      
      // Store animation data
      particle.userData = {
        startPosition: particle.position.clone(),
        speed: 0.1 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
        radius: 0.3 + Math.random() * 0.5
      };
    }
    
    scene.add(particles);
    
    // Store for animation and cleanup
    particles.userData = {
      startTime: this.time,
      lifetime: 5, // 5 seconds
      type: 'lateGameSurge'
    };
    
    surgeLight.userData = {
      startTime: this.time,
      lifetime: 5, // 5 seconds
      type: 'lateGameSurge'
    };
    
    // Animation will be handled in the main game loop
  }
  
  /**
   * Create a loot item mesh
   * @param {string} id - Loot ID
   * @param {string} type - Loot type
   * @param {Object} position - Position {x, z}
   */
  createLootMesh(id, type, position) {
    if (typeof scene === 'undefined') return;
    
    const lootMesh = new THREE.Group();
    lootMesh.userData = { lootId: id, type: type };
    
    // Updated color palette for loot items
    let geometry, material, color;
    
    switch (type) {
      case 'doubleMove':
        geometry = new THREE.IcosahedronGeometry(0.3, 0);
        color = 0x00FFC1; // Neon Teal
        break;
        
      case 'petalShield':
        geometry = new THREE.SphereGeometry(0.3, 8, 8);
        color = 0xFF007F; // Vivid Magenta
        break;
        
      case 'vineTrap':
        geometry = new THREE.OctahedronGeometry(0.3, 0);
        color = 0xCCFF00; // Electric Lime
        break;
        
      default:
        geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        color = 0x8E8EA8; // Soft Gray-Purple
    }
    
    material = new THREE.MeshToonMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });
    
    const mainPart = new THREE.Mesh(geometry, material);
    lootMesh.add(mainPart);
    
    // Add a glow effect (larger transparent sphere)
    const glowGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    lootMesh.add(glow);
    
    // Position the loot
    lootMesh.position.set(position.x, 0.5, position.z);
    
    // Add to scene
    scene.add(lootMesh);
    
    // Store animation data for floating effect
    lootMesh.userData.startTime = this.time;
    lootMesh.userData.floatHeight = 0.5;
    
    // Animation will be handled in the main game loop
  }
  
  /**
   * Remove a loot mesh from the scene
   * @param {string} lootId - ID of the loot to remove
   */
  removeLootMesh(lootId) {
    // Only remove if we have scene access
    if (typeof scene === 'undefined') return;
    
    // Find the loot mesh by userData
    scene.traverse(object => {
      if (object.userData && object.userData.lootId === lootId) {
        scene.remove(object);
      }
    });
  }
  
  /**
   * Update an entity's mesh position
   * @param {string} entityId - Entity ID
   * @param {Object} newPosition - New position {x, z}
   */
  updateEntityMesh(entityId, newPosition) {
    // Only update if we have scene access
    if (typeof scene === 'undefined') return;
    
    // Find the entity mesh by userData
    scene.traverse(object => {
      if (object.userData && object.userData.entityId === entityId) {
        // Smoothly move to new position
        object.position.x = newPosition.x;
        object.position.z = newPosition.z;
      }
    });
  }
  
  /**
   * Create a damage effect at a position
   * @param {Object} position - Position {x, z}
   */
  createDamageEffect(position) {
    // Only create if we have scene access
    if (typeof scene === 'undefined') return;
    
    // Create a burst of particles
    const particleCount = 10;
    const particles = new THREE.Group();
    
    const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.7
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Position at damage center
      particle.position.set(position.x, 0.5, position.z);
      
      // Store velocity for animation
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          0.1 + Math.random() * 0.2,
          (Math.random() - 0.5) * 0.2
        ),
        lifetime: 1.0 // 1 second
      };
      
      particles.add(particle);
    }
    
    // Add to scene
    scene.add(particles);
    
    // Store for cleanup
    particles.userData = {
      startTime: this.time,
      lifetime: 1.0,
      type: 'damageEffect'
    };
    
    // Animation will be handled in the main game loop
  }
}
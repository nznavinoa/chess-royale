// pieces.js - Chess piece definitions and behavior

import * as THREE from 'three';

// Pre-create shared materials and geometries for better performance
const materialCache = {
  white: {},
  black: {},
  effects: {}
};

// Reusable geometries for better performance
const sharedGeometry = {
  pawnBase: new THREE.SphereGeometry(0.6, 6, 6), // Reduced segments for performance
  rookBase: new THREE.CylinderGeometry(0.5, 0.7, 2, 6),
  knightBase: new THREE.ConeGeometry(0.7, 1.5, 6),
  bishopBase: new THREE.CylinderGeometry(0.3, 0.7, 2, 6),
  queenBase: new THREE.SphereGeometry(0.8, 6, 6), // Reduced segments for performance
  kingBase: new THREE.CylinderGeometry(0.8, 0.8, 2, 6),
  eye: new THREE.SphereGeometry(0.1, 4, 4),
  crown: new THREE.CylinderGeometry(0.3, 0.4, 0.3, 5),
  ear: new THREE.ConeGeometry(0.1, 0.3, 4),
  tail: new THREE.ConeGeometry(0.2, 0.5, 4),
  effectSphere: new THREE.SphereGeometry(0.3, 6, 6),
  effectBox: new THREE.BoxGeometry(0.5, 0.5, 0.5),
  effectCone: new THREE.ConeGeometry(0.3, 0.6, 6),
  effectCircle: new THREE.CircleGeometry(0.5, 12)
};

// Initialize the shared materials
function initMaterialCache() {
  if (Object.keys(materialCache.white).length > 0) return; // Already initialized
  
  // Create shared gradient map for toon shading
  const gradientMap = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 64, 64, 64, 255, 255, 255]), 
    3, 1, 
    THREE.RGBFormat
  );
  gradientMap.needsUpdate = true;
  
  // Base colors - updated for cyberpunk theme
  const whiteColor = 0x00FFC1; // Neon Teal
  const blackColor = 0xFF007F; // Vivid Magenta
  
  // Create materials for both teams
  materialCache.white.base = new THREE.MeshToonMaterial({ color: whiteColor, gradientMap });
  materialCache.black.base = new THREE.MeshToonMaterial({ color: blackColor, gradientMap });
  
  // Accent colors
  materialCache.white.accent = new THREE.MeshToonMaterial({ color: 0xCCFF00, gradientMap }); // Electric Lime
  materialCache.black.accent = new THREE.MeshToonMaterial({ color: 0x8E8EA8, gradientMap }); // Soft Gray-Purple
  
  // Gold color for kings and crowns
  materialCache.white.gold = new THREE.MeshToonMaterial({ color: 0xCCFF00, gradientMap }); // Electric Lime
  materialCache.black.gold = new THREE.MeshToonMaterial({ color: 0x8E8EA8, gradientMap }); // Soft Gray-Purple
  
  // Eyes color updated to match theme
  materialCache.eyes = new THREE.MeshBasicMaterial({ color: 0x1A1A3D }); // Deep Midnight Blue
  
  // Effect materials (transparent) updated for new color scheme
  materialCache.effects.white = new THREE.MeshBasicMaterial({ 
    color: 0x00FFC1, // Neon Teal
    transparent: true, 
    opacity: 0.7 
  });
  
  materialCache.effects.black = new THREE.MeshBasicMaterial({ 
    color: 0xFF007F, // Vivid Magenta
    transparent: true, 
    opacity: 0.7 
  });
}

export class ChessPiece {
  constructor(type, team, id) {
    // Initialize material cache if not already done
    initMaterialCache();
    
    // Ensure type is defined with default values to prevent errors
    this.type = type || 'pawn';
    this.team = team || 'white';
    this.id = id;
    
    // Create the 3D mesh for this piece
    this.mesh = this.createShape(this.type, this.team);
    
    // Add metadata to the mesh for raycasting
    this.mesh.userData.pieceId = id;
    this.mesh.userData.type = this.type;
    this.mesh.userData.team = this.team;
    
    // Set health points based on piece type
    this.hp = this.getInitialHP();
    
    // Initialize ability cooldown
    this.cooldown = 0;
    
    // Initialize any visual effects
    this.effects = [];
    
    // Set up wobble animation parameters
    this.wobbleOffset = Math.random() * Math.PI * 2; // Random phase offset
    this.wobbleHeight = 0.05 + Math.random() * 0.02; // Slight height variation
    this.wobbleSpeed = 1 + Math.random() * 0.2; // Slight speed variation
  }

  /**
   * Get initial HP based on piece type
   */
  getInitialHP() {
    const hpMap = {
      'pawn': 5,
      'rook': 7,
      'knight': 7,
      'bishop': 7,
      'queen': 10,
      'king': 15
    };
    
    // Safely handle undefined types
    if (!this.type) {
      console.warn("Type is undefined in getInitialHP");
      return 5; // Default HP
    }
    
    return hpMap[this.type.toLowerCase()] || 5;
  }

  /**
   * Create the 3D shape for this chess piece
   */
  createShape(type, team) {
    let mainGroup = new THREE.Group();
    
    // Make sure type is a string and in lowercase
    type = (type || 'pawn').toLowerCase();
    
    // Get the appropriate material based on team
    const baseMaterial = materialCache[team].base;
    const accentMaterial = materialCache[team].accent;
    const goldMaterial = materialCache[team].gold;
    const eyesMaterial = materialCache.eyes;
    
    // Create different geometries based on piece type
    switch (type) {
      case 'pawn': {
        // Base pawn shape
        const pawnBase = new THREE.Mesh(sharedGeometry.pawnBase, baseMaterial);
        pawnBase.scale.set(1.1, 1.2, 1.1);
        mainGroup.add(pawnBase);
        
        // Add eyes to make it more Pokemon-like
        const leftEye = new THREE.Mesh(sharedGeometry.eye, eyesMaterial);
        leftEye.position.set(0.3, 0.5, 0.5);
        mainGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(sharedGeometry.eye, eyesMaterial);
        rightEye.position.set(-0.3, 0.5, 0.5);
        mainGroup.add(rightEye);
        break;
      }
        
      case 'rook': {
        // Base rook shape
        const rookBase = new THREE.Mesh(sharedGeometry.rookBase, baseMaterial);
        mainGroup.add(rookBase);
        
        // Add top detail
        const rookTop = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.2, 0.7), 
          baseMaterial
        );
        rookTop.position.y = 1.1;
        mainGroup.add(rookTop);
        break;
      }
        
      case 'knight': {
        // Base knight shape
        const knightBase = new THREE.Mesh(sharedGeometry.knightBase, baseMaterial);
        knightBase.rotation.x = -0.2;
        mainGroup.add(knightBase);
        
        // Add ears
        const leftEar = new THREE.Mesh(sharedGeometry.ear, baseMaterial);
        leftEar.position.set(0.2, 0.8, 0.3);
        mainGroup.add(leftEar);
        
        const rightEar = new THREE.Mesh(sharedGeometry.ear, baseMaterial);
        rightEar.position.set(-0.2, 0.8, 0.3);
        mainGroup.add(rightEar);
        break;
      }
        
      case 'bishop': {
        // Base bishop shape
        const bishopBase = new THREE.Mesh(sharedGeometry.bishopBase, baseMaterial);
        bishopBase.scale.y = 1.3;
        mainGroup.add(bishopBase);
        
        // Add top detail
        const top = new THREE.Mesh(sharedGeometry.eye, baseMaterial);
        top.scale.set(3, 3, 3);
        top.position.y = 1.5;
        mainGroup.add(top);
        break;
      }
        
      case 'queen': {
        // Base queen shape
        const queenBase = new THREE.Mesh(sharedGeometry.queenBase, baseMaterial);
        mainGroup.add(queenBase);
        
        // Add decorative tail
        const tail = new THREE.Mesh(sharedGeometry.tail, accentMaterial);
        tail.position.set(0, -0.8, 0);
        tail.rotation.x = Math.PI;
        mainGroup.add(tail);
        
        // Add crown
        const crown = new THREE.Mesh(sharedGeometry.crown, accentMaterial);
        crown.position.y = 0.8;
        mainGroup.add(crown);
        break;
      }
        
      case 'king': {
        // Base king shape
        const kingBase = new THREE.Mesh(sharedGeometry.kingBase, baseMaterial);
        mainGroup.add(kingBase);
        
        // Add crown
        const kingCrown = new THREE.Mesh(sharedGeometry.crown, goldMaterial);
        kingCrown.position.y = 1.2;
        mainGroup.add(kingCrown);
        
        // Add cross on top (simplified for performance)
        const cross = new THREE.Group();
        
        const crossV = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.5, 0.1),
          goldMaterial
        );
        cross.add(crossV);
        
        const crossH = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.1, 0.1),
          goldMaterial
        );
        crossH.position.y = 0.2;
        cross.add(crossH);
        
        cross.position.y = 1.5;
        mainGroup.add(cross);
        break;
      }
        
      default: {
        // Default fallback to a simple sphere
        const defaultMesh = new THREE.Mesh(sharedGeometry.pawnBase, baseMaterial);
        mainGroup.add(defaultMesh);
        break;
      }
    }
    
    return mainGroup;
  }
  
  /**
   * Use the piece's special ability
   * @param {Object} targetPos - Target position for the ability
   */
  useAbility(targetPos) {
    // Check if ability is on cooldown
    if (this.cooldown > 0) return;
    
    // Get ability details based on piece type
    const ability = this.getAbilityDetails();
    
    // Set cooldown timer
    this.cooldown = ability.cooldown;
    
    // Create visual effect for ability
    this.createAbilityEffect(targetPos);
    
    // Return the ability details
    return ability;
  }
  
  /**
   * Get ability details based on piece type
   */
  getAbilityDetails() {
    // Ensure type is defined with a default
    const pieceType = this.type ? this.type.toLowerCase() : 'pawn';
    
    const abilityMap = {
      'pawn': { name: 'Hop Attack', damage: 2, cooldown: 5 },
      'rook': { name: 'Rock Smash', damage: 3, cooldown: 10 },
      'knight': { name: 'Tail Whip', damage: 1, cooldown: 8 },
      'bishop': { name: 'Leaf Gust', damage: 2, cooldown: 7 },
      'queen': { name: 'Petal Storm', damage: 3, cooldown: 12 },
      'king': { name: 'Royal Aura', damage: 0, cooldown: 15, healing: 1 }
    };
    
    return abilityMap[pieceType] || { name: 'Basic Attack', damage: 1, cooldown: 5 };
  }
  
  /**
   * Get current ability damage
   */
  getAbilityDamage() {
    const ability = this.getAbilityDetails();
    return ability.damage;
  }
  
  /**
   * Create visual effect for ability
   */
  createAbilityEffect(targetPos) {
    // Ensure type is defined with a default
    const pieceType = this.type ? this.type.toLowerCase() : 'pawn';
    
    // Get appropriate effect material
    const effectMaterial = this.team === 'white' 
      ? materialCache.effects.white.clone() // Neon Teal
      : materialCache.effects.black.clone(); // Vivid Magenta
    
    // Choose geometry based on piece type
    let effectGeometry;
    
    switch (pieceType) {
      case 'pawn':
        effectGeometry = sharedGeometry.effectSphere;
        break;
      case 'rook':
        effectGeometry = sharedGeometry.effectBox;
        break;
      case 'knight':
        effectGeometry = sharedGeometry.effectCone;
        break;
      case 'bishop':
      case 'king':
        effectGeometry = sharedGeometry.effectCircle;
        break;
      case 'queen':
        effectGeometry = new THREE.TorusGeometry(0.5, 0.1, 8, 12);
        break;
      default:
        effectGeometry = sharedGeometry.effectSphere;
    }
    
    // Create effect mesh
    const effect = new THREE.Mesh(effectGeometry, effectMaterial.clone());
    
    // Clone material to avoid shared opacity changes
    effect.material = effect.material.clone();
    
    // Position at target
    effect.position.set(targetPos.x, 0.5, targetPos.z);
    
    // Rotate circle geometry to be parallel to the ground
    if (pieceType === 'bishop' || pieceType === 'king') {
      effect.rotation.x = -Math.PI / 2;
    }
    
    // Add to scene if it's available
    if (typeof window !== 'undefined' && window.scene) {
      window.scene.add(effect);
      
      // Store in effects array with minimal data
      this.effects.push({
        mesh: effect,
        lifetime: 1.0,  // 1 second lifetime
        startScale: effect.scale.x
      });
    }
  }
  
  /**
   * Animate the piece and its effects
   * @param {number} delta - Time delta in seconds
   * @param {number} time - Current time
   */
  animate(delta, time) {
    // Animate piece bobbing up and down (Ghibli wobble)
    this.mesh.position.y = 1 + Math.sin((time + this.wobbleOffset) * this.wobbleSpeed) * this.wobbleHeight;
    
    // Reduce cooldown
    this.cooldown = Math.max(0, this.cooldown - delta);
    
    // Animate and clean up effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      
      // Reduce lifetime
      effect.lifetime -= delta;
      
      // Scale and fade effect based on remaining lifetime
      const progress = 1 - (effect.lifetime / 1.0);
      const scale = 1 + progress; // Grow as it fades
      
      effect.mesh.scale.set(scale, scale, scale);
      
      // Set opacity based on remaining lifetime (fade out)
      if (effect.mesh.material) {
        effect.mesh.material.opacity = Math.max(0, 0.7 - progress * 0.7);
      }
      
      // Remove if expired
      if (effect.lifetime <= 0) {
        if (typeof window !== 'undefined' && window.scene) {
          window.scene.remove(effect.mesh);
          
          // Help garbage collection
          if (effect.mesh.material) {
            effect.mesh.material.dispose();
          }
          effect.mesh.geometry = null;
        }
        this.effects.splice(i, 1);
      }
    }
  }
}
// pieces.js - Chess piece definitions and behavior

import * as THREE from 'three';

export class ChessPiece {
  constructor(type, team, id) {
    // Create gradient map for toon shading
    const gradientMap = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 64, 64, 64, 255, 255, 255]), 
      3, 1, 
      THREE.RGBFormat
    );
    gradientMap.needsUpdate = true;
    
    // Create the 3D mesh for this piece
    this.mesh = this.createShape(type, team, gradientMap);
    
    // Add metadata to the mesh for raycasting
    this.mesh.userData.pieceId = id;
    
    // Store piece properties
    this.id = id;
    this.type = type;
    this.team = team;
    
    // Set health points based on piece type
    this.hp = this.getInitialHP(type);
    
    // Initialize ability cooldown
    this.cooldown = 0;
    
    // Initialize any visual effects
    this.effects = [];
  }

  /**
   * Get initial HP based on piece type
   */
  getInitialHP(type) {
    const hpMap = {
      'pawn': 5,
      'rook': 7,
      'knight': 7,
      'bishop': 7,
      'queen': 10,
      'king': 15
    };
    return hpMap[type.toLowerCase()] || 5;
  }

  /**
   * Create the 3D shape for this chess piece
   */
  createShape(type, team, gradientMap) {
    let geometry;
    let eyeGeometry, tailGeometry, earGeometry;
    
    // Create different geometries based on piece type
    switch (type.toLowerCase()) {
      case 'pawn':
        // Base pawn shape
        geometry = new THREE.SphereGeometry(0.6, 8, 8);
        
        // Modify vertices for a more tapered look
        if (geometry.vertices) {
          geometry.vertices.forEach(v => { 
            if (v.y > 0) v.y *= 1.2;
            else v.x *= 1.1; 
          });
          geometry.verticesNeedUpdate = true;
        }
        
        // Add eyes to make it more Pokemon-like
        eyeGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        
        // Create combined geometry
        const pawnMesh = new THREE.Mesh(
          geometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        
        // Add eyes to the pawn
        const leftEye = new THREE.Mesh(
          eyeGeometry,
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        leftEye.position.set(0.3, 0.5, 0.5);
        pawnMesh.add(leftEye);
        
        const rightEye = new THREE.Mesh(
          eyeGeometry,
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        rightEye.position.set(-0.3, 0.5, 0.5);
        pawnMesh.add(rightEye);
        
        return pawnMesh;
        
      case 'rook':
        // Base rook shape
        geometry = new THREE.CylinderGeometry(0.5, 0.7, 2, 6);
        
        // Optional: Modify vertices for a more castle-like appearance
        if (geometry.vertices) {
          geometry.vertices.forEach(v => { 
            if (v.y > 0.5) v.x *= 0.8; 
          });
          geometry.verticesNeedUpdate = true;
        }
        
        return new THREE.Mesh(
          geometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        
      case 'knight':
        // Base knight shape
        geometry = new THREE.ConeGeometry(0.7, 1.5, 6);
        
        // Modify for horse-like appearance
        if (geometry.vertices) {
          geometry.vertices.forEach(v => { 
            if (v.y < 0) v.z += 0.2; 
          });
          geometry.verticesNeedUpdate = true;
        }
        
        // Create knight with ears
        const knightMesh = new THREE.Mesh(
          geometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        
        // Add ears
        earGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
        const leftEar = new THREE.Mesh(
          earGeometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        leftEar.position.set(0.2, 0.8, 0.3);
        knightMesh.add(leftEar);
        
        const rightEar = new THREE.Mesh(
          earGeometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        rightEar.position.set(-0.2, 0.8, 0.3);
        knightMesh.add(rightEar);
        
        return knightMesh;
        
      case 'bishop':
        // Base bishop shape
        geometry = new THREE.CylinderGeometry(0.3, 0.7, 2, 6);
        
        // Modify for a more tapered look
        if (geometry.vertices) {
          geometry.vertices.forEach(v => { 
            if (v.y > 0) v.y *= 1.3; 
          });
          geometry.verticesNeedUpdate = true;
        }
        
        return new THREE.Mesh(
          geometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        
      case 'queen':
        // Base queen shape
        geometry = new THREE.SphereGeometry(0.8, 8, 8);
        
        // Modify for a more regal shape
        if (geometry.vertices) {
          geometry.vertices.forEach(v => { 
            if (v.y < 0) v.x *= 1.2; 
          });
          geometry.verticesNeedUpdate = true;
        }
        
        // Create queen with tail
        const queenMesh = new THREE.Mesh(
          geometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        
        // Add decorative tail
        tailGeometry = new THREE.ConeGeometry(0.2, 0.5, 4);
        const tail = new THREE.Mesh(
          tailGeometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0x87CEEB : 0x483D8B, 
            gradientMap 
          })
        );
        tail.position.set(0, -0.8, 0);
        tail.rotation.x = Math.PI;
        queenMesh.add(tail);
        
        return queenMesh;
        
      case 'king':
        // Base king shape
        geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 8);
        
        // Modify for a more majestic shape
        if (geometry.vertices) {
          geometry.vertices.forEach(v => { 
            if (v.y > 0.5) v.x *= 0.9; 
          });
          geometry.verticesNeedUpdate = true;
        }
        
        // Create king with crown
        const kingMesh = new THREE.Mesh(
          geometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
        
        // Add crown
        const crownGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.3, 5);
        const crown = new THREE.Mesh(
          crownGeometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xFFD700 : 0xFF4500, 
            gradientMap 
          })
        );
        crown.position.set(0, 1.2, 0);
        kingMesh.add(crown);
        
        return kingMesh;
        
      default:
        // Default fallback to a simple sphere
        geometry = new THREE.SphereGeometry(0.6, 8, 8);
        return new THREE.Mesh(
          geometry,
          new THREE.MeshToonMaterial({ 
            color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, 
            gradientMap 
          })
        );
    }
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
    
    // Emit socket event if in multiplayer
    if (typeof socket !== 'undefined') {
      socket.emit('ability', { 
        id: this.id, 
        target: targetPos, 
        damage: ability.damage 
      });
    }
    
    return ability;
  }
  
  /**
   * Get ability details based on piece type
   */
  getAbilityDetails() {
    const abilityMap = {
      'pawn': { name: 'Hop Attack', damage: 2, cooldown: 5 },
      'rook': { name: 'Rock Smash', damage: 3, cooldown: 10 },
      'knight': { name: 'Tail Whip', damage: 1, cooldown: 8 },
      'bishop': { name: 'Leaf Gust', damage: 2, cooldown: 7 },
      'queen': { name: 'Petal Storm', damage: 3, cooldown: 12 },
      'king': { name: 'Royal Aura', damage: 0, cooldown: 15, healing: 1 }
    };
    
    return abilityMap[this.type.toLowerCase()] || { name: 'Basic Attack', damage: 1, cooldown: 5 };
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
    const ability = this.getAbilityDetails();
    
    // Create effect based on ability type
    let effectGeometry, effectMaterial;
    
    switch (this.type.toLowerCase()) {
      case 'pawn':
        effectGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        effectMaterial = new THREE.MeshBasicMaterial({ 
          color: this.team === 'white' ? 0x87CEEB : 0xFF4500,
          transparent: true,
          opacity: 0.7
        });
        break;
        
      case 'rook':
        effectGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        effectMaterial = new THREE.MeshBasicMaterial({ 
          color: this.team === 'white' ? 0x9ACD32 : 0xFF4500,
          transparent: true,
          opacity: 0.7
        });
        break;
        
      case 'knight':
        effectGeometry = new THREE.ConeGeometry(0.3, 0.6, 8);
        effectMaterial = new THREE.MeshBasicMaterial({ 
          color: this.team === 'white' ? 0xF5E8C7 : 0x483D8B,
          transparent: true,
          opacity: 0.7
        });
        break;
        
      case 'bishop':
        effectGeometry = new THREE.CircleGeometry(0.5, 16);
        effectMaterial = new THREE.MeshBasicMaterial({ 
          color: this.team === 'white' ? 0x9ACD32 : 0x483D8B,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        break;
        
      case 'queen':
        effectGeometry = new THREE.TorusGeometry(0.5, 0.1, 8, 16);
        effectMaterial = new THREE.MeshBasicMaterial({ 
          color: this.team === 'white' ? 0x87CEEB : 0xFF4500,
          transparent: true,
          opacity: 0.7
        });
        break;
        
      case 'king':
        effectGeometry = new THREE.CircleGeometry(1, 16);
        effectMaterial = new THREE.MeshBasicMaterial({ 
          color: this.team === 'white' ? 0xFFD700 : 0xFF4500,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        break;
        
      default:
        effectGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        effectMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.7
        });
    }
    
    // Create effect mesh
    const effect = new THREE.Mesh(effectGeometry, effectMaterial);
    
    // Position at target
    effect.position.set(targetPos.x, 0.5, targetPos.z);
    
    // Add to scene
    if (typeof scene !== 'undefined') {
      scene.add(effect);
      
      // Store in effects array
      this.effects.push({
        mesh: effect,
        lifetime: 1.0  // 1 second lifetime
      });
    }
  }
  
  /**
   * Animate the piece and its effects
   * @param {number} time - Current time for animation
   */
  animate(time) {
    // Animate piece bobbing up and down (Ghibli wobble)
    this.mesh.position.y = 1 + Math.sin(time) * 0.05;
    
    // Reduce cooldown
    this.cooldown = Math.max(0, this.cooldown - 0.05);
    
          // Animate and clean up effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      
      // Reduce lifetime
      effect.lifetime -= 0.05;
      
      // Scale effect based on remaining lifetime
      const scale = Math.min(1, effect.lifetime * 2);
      effect.mesh.scale.set(scale, scale, scale);
      
      // Set opacity based on remaining lifetime
      if (effect.mesh.material) {
        effect.mesh.material.opacity = Math.min(0.7, effect.lifetime);
      }
      
      // Remove if expired
      if (effect.lifetime <= 0) {
        if (typeof scene !== 'undefined') {
          scene.remove(effect.mesh);
        }
        this.effects.splice(i, 1);
      }
    }
  }
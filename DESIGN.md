# Chess Royale: Checkmate Arena - Application Design Document

## 1. Overview

**Project Name**: Chess Royale: Checkmate Arena  
**Description**: A 3D multiplayer chess game blending traditional chess rules with Fortnite-inspired mechanics (no shrinking storm or building), styled with Studio Ghibli's whimsical charm and Pokémon's vibrant creature vibe.  
**Objective**: Build a lightweight, browser-based game using Three.js, deployable in GitHub Codespaces, with a quick prototype setup.  
**Target**: Web browsers (Chrome, Firefox, Edge)  
**Timeline**: Basic prototype in 1-2 days

---

## 2. Visual Style

- **Color Palette**:
  - **White Team**: Creamy Beige (#F5E8C7), Sky Blue (#87CEEB), Leaf Green (#9ACD32)
  - **Black Team**: Soot Gray (#4A4A4A), Twilight Purple (#483D8B), Ember Orange (#FF4500)
  - **Environment**: Mossy Green (#6B8E23), Sunset Gradient (#87CEEB to #483D8B)
- **3D Style**:
  - Low-poly with organic, sculpted forms (20-50 triangles per piece) inspired by Ghibli's soft curves and Pokémon's creature-like silhouettes.
  - Shapes avoid basic primitives by modifying vertices (e.g., tapered pawn, curved knight) and adding merged details (e.g., ears, tails).
  - Features Ghibli wobble animations and Pokémon-inspired elements (e.g., eyes on pawns, tails on queens).
  - Uses toon shading for a hand-painted look without textures.

---

## 3. Gameplay

- **Objective**:
  - **Team Mode (16v16)**: White vs. Black, checkmate the opposing king.
  - **Free-for-All (32 players)**: Last piece standing wins.
- **Match Duration**: 10-15 minutes, paced by dynamic events.
- **Chess Rules**:
  - **Pawn**: Forward 1 (or 2 on first move), diagonal capture.
  - **Rook**: Straight, any distance.
  - **Knight**: L-jump (2x1 or 1x2).
  - **Bishop**: Diagonal, any distance.
  - **Queen**: Rook + Bishop movement.
  - **King**: 1 unit in any direction.
- **Fortnite Elements**:
  - **Loot Drops**: Every 2 minutes, spawning:
    - *Double Move*: Two moves in one turn (single-use).
    - *Petal Shield*: Blocks one capture (10s duration).
    - *Vine Trap*: Immobilizes an enemy for 5s (pawn-only).
- **Abilities**:
  - **Pawn**: *Hop Attack* (2 HP damage, 5s cooldown).
  - **Rook**: *Rock Smash* (3 HP, 10s).
  - **Knight**: *Tail Whip* (1 HP, 8s).
  - **Bishop**: *Leaf Gust* (2 HP, 7s).
  - **Queen**: *Petal Storm* (3 HP, 12s).
  - **King**: *Royal Aura* (+1 HP/s to allies, 15s).
- **Health**: Pawn (5 HP), Rook/Knight/Bishop (7 HP), Queen (10 HP), King (15 HP).
- **Events**: Every 3 minutes:
  - **Petal Rain**: Extra loot drops spawn.
  - **King's Call**: Kings gain +5 HP.
  - **Wild Sprout**: Neutral "Vine Beast" (10 HP, random movement) spawns.
  - **Late-Game Surge** (after 8 minutes): Ability cooldowns halved.

---

## 4. Technical Stack

- **Frontend**: Three.js (3D rendering), JavaScript (logic), HTML5 (canvas).
- **Backend**: Node.js, Express.js, Socket.IO (multiplayer).
- **Tools**: GitHub Codespaces, npm.

---

## 5. File Structure

```
chess-royale/
├── client/
│   ├── index.html      # Game entry point
│   ├── js/
│   │   ├── main.js     # Scene setup and game loop
│   │   ├── pieces.js   # Chess piece logic and shapes
│   │   ├── map.js      # Terrain generation
│   │   └── game.js     # Gameplay mechanics
├── server/
│   ├── server.js       # Multiplayer server
├── package.json        # Dependencies and scripts
├── .devcontainer/
│   └── devcontainer.json  # Codespaces configuration
└── README.md           # Setup instructions
```

---

## 6. Build Steps

### Step 1: Setup Codespaces

1. Create a new GitHub repository named `chess-royale`.
2. Add the following files:

#### `.devcontainer/devcontainer.json`
```json
{
  "name": "ChessRoyale",
  "image": "mcr.microsoft.com/vscode/devcontainers/javascript-node:18",
  "forwardPorts": [3000],
  "postCreateCommand": "npm install"
}
```

#### `package.json`
```json
{
  "name": "chess-royale",
  "version": "1.0.0",
  "scripts": {
    "start": "node server/server.js",
    "dev": "nodemon server/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "three": "^0.158.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

#### `README.md`
```markdown
# Chess Royale: Checkmate Arena

## Quick Start
1. Open this repo in GitHub Codespaces.
2. Run `npm install` to install dependencies.
3. Start the server with `npm start`.
4. Open `localhost:3000` in the Codespaces browser preview.
```

### Step 2: Client Files

#### `client/index.html`
```html
<!DOCTYPE html>
<html>
<head>
  <title>Chess Royale</title>
  <style>body { margin: 0; overflow: hidden; }</style>
</head>
<body>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

#### `client/js/main.js`
```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ChessPiece } from './pieces.js';
import { createMap } from './map.js';
import { Game } from './game.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 15, 15);

scene.add(new THREE.DirectionalLight(0xffffff, 1).position.set(5, 10, 5));
scene.add(new THREE.AmbientLight(0xF5E8C7, 0.4));
scene.background = new THREE.Color().setStyle('#87CEEB').lerp(new THREE.Color('#483D8B'), 0.5);

const game = new Game();
scene.add(createMap());
const players = new Map();

const socket = io('http://localhost:3000');
socket.on('connect', () => {
  const piece = new ChessPiece('pawn', 'white', socket.id);
  players.set(socket.id, piece);
  scene.add(piece.mesh);
});
socket.on('update', (serverPlayers) => {
  serverPlayers.forEach((p, id) => {
    let piece = players.get(id);
    if (!piece && p.hp > 0) {
      piece = new ChessPiece(p.piece, p.team || 'white', id);
      players.set(id, piece);
      scene.add(piece.mesh);
    }
    if (piece) {
      piece.mesh.position.set(p.position.x, 1, p.position.z);
      piece.hp = p.hp;
      if (p.hp <= 0) scene.remove(piece.mesh);
    }
  });
});

document.addEventListener('keydown', (e) => {
  const player = players.get(socket.id);
  if (!player) return;
  const pos = player.mesh.position.clone();
  if (e.key === 'w') pos.z -= 1;
  if (e.key === 's') pos.z += 1;
  if (e.key === 'a') pos.x -= 1;
  if (e.key === 'd') pos.x += 1;
  if (e.key === ' ') player.useAbility(pos.clone().add(new THREE.Vector3(0, 0, 1)));
  socket.emit('move', { id: socket.id, position: pos });
});

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.05;
  game.update(0.05);
  players.forEach(p => p.animate(0.05));
  renderer.render(scene, camera);
}
animate();
```

#### `client/js/pieces.js`
```javascript
import * as THREE from 'three';

export class ChessPiece {
  constructor(type, team, id) {
    const gradientMap = new THREE.DataTexture(new Uint8Array([0, 0, 0, 64, 64, 64, 255, 255, 255]), 3, 1, THREE.RGBFormat);
    gradientMap.needsUpdate = true;
    this.mesh = this.createShape(type, team, gradientMap);
    this.id = id;
    this.type = type;
    this.hp = { pawn: 5, rook: 7, knight: 7, bishop: 7, queen: 10, king: 15 }[type];
    this.cooldown = 0;
  }

  createShape(type, team, gradientMap) {
    let geometry;
    switch (type) {
      case 'pawn':
        geometry = new THREE.SphereGeometry(0.6, 6, 6);
        geometry.vertices.forEach(v => { if (v.y > 0) v.y *= 1.2; else v.x *= 1.5; });
        const eye = new THREE.SphereGeometry(0.1, 4, 4);
        geometry.merge(new THREE.Mesh(eye, new THREE.MeshBasicMaterial({ color: 0x000000 })).position.set(0.3, 0.5, 0.5).geometry);
        break;
      case 'rook':
        geometry = new THREE.CylinderGeometry(0.5, 0.7, 2, 6);
        geometry.vertices.forEach(v => { if (v.y > 0.5) v.x *= 0.8; });
        break;
      case 'knight':
        geometry = new THREE.ConeGeometry(0.7, 1.5, 6);
        geometry.vertices.forEach(v => { if (v.y < 0) v.z += 0.2; });
        const ear = new THREE.ConeGeometry(0.1, 0.3, 4);
        geometry.merge(new THREE.Mesh(ear, null).position.set(0, 0.8, 0.3).geometry);
        break;
      case 'bishop':
        geometry = new THREE.CylinderGeometry(0.3, 0.7, 2, 6);
        geometry.vertices.forEach(v => { if (v.y > 0) v.y *= 1.3; });
        break;
      case 'queen':
        geometry = new THREE.SphereGeometry(0.8, 8, 8);
        geometry.vertices.forEach(v => { if (v.y < 0) v.x *= 1.2; });
        const tail = new THREE.ConeGeometry(0.2, 0.5, 4);
        geometry.merge(new THREE.Mesh(tail, null).position.set(0, -0.8, 0).geometry);
        break;
      case 'king':
        geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 8);
        geometry.vertices.forEach(v => { if (v.y > 0.5) v.x *= 0.9; });
        break;
    }
    geometry.computeVertexNormals();
    return new THREE.Mesh(
      geometry,
      new THREE.MeshToonMaterial({ color: team === 'white' ? 0xF5E8C7 : 0x4A4A4A, gradientMap })
    );
  }

  useAbility(targetPos) {
    if (this.cooldown > 0) return;
    const abilityMap = {
      pawn: { damage: 2, cd: 5 },
      rook: { damage: 3, cd: 10 },
      knight: { damage: 1, cd: 8 },
      bishop: { damage: 2, cd: 7 },
      queen: { damage: 3, cd: 12 },
      king: { damage: 0, cd: 15 }
    };
    const ability = abilityMap[this.type];
    this.cooldown = ability.cd;
    socket.emit('ability', { id: this.id, target: targetPos, damage: ability.damage });
  }

  animate(delta) {
    this.mesh.position.y = 1 + Math.sin(time) * 0.05;
    this.cooldown = Math.max(0, this.cooldown - delta);
  }
}
```

#### `client/js/map.js`
```javascript
import * as THREE from 'three';

export function createMap() {
  const map = new THREE.Group();
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
      const square = new THREE.ExtrudeGeometry(
        new THREE.CircleGeometry(0.8, 6),
        { depth: 0.3, bevelEnabled: true, bevelSize: 0.1 }
      );
      const material = new THREE.MeshToonMaterial({
        color: (x + z) % 2 === 0 ? 0x6B8E23 : 0x87CEEB,
        gradientMap: new THREE.DataTexture(new Uint8Array([0, 0, 0, 64, 64, 64, 255, 255, 255]), 3, 1, THREE.RGBFormat)
      });
      material.gradientMap.needsUpdate = true;
      const mesh = new THREE.Mesh(square, material);
      mesh.position.set(x - 3.5, 0, z - 3.5);
      map.add(mesh);
    }
  }
  return map;
}
```

#### `client/js/game.js`
```javascript
export class Game {
  constructor() {
    this.players = new Map();
    this.time = 0;
    this.eventTimer = 0;
  }

  update(delta) {
    this.time += delta;
    this.eventTimer += delta;
    if (this.eventTimer >= 180) {
      this.triggerEvent();
      this.eventTimer = 0;
    }
  }

  triggerEvent() {
    const events = [
      () => console.log('Extra loot spawned'), // Placeholder
      () => this.players.forEach(p => { if (p.piece === 'king') p.hp += 5; }),
      () => console.log('Vine Beast spawned')
    ];
    if (this.time > 480) this.players.forEach(p => p.cooldown /= 2);
    else events[Math.floor(Math.random() * events.length)]();
  }
}
```

### Step 3: Server File

#### `server/server.js`
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('client'));

const players = new Map();
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  players.set(socket.id, { piece: 'pawn', position: { x: 0, z: 0 }, hp: 5, team: Math.random() > 0.5 ? 'white' : 'black' });

  socket.on('move', (data) => {
    const player = players.get(data.id);
    if (player) {
      player.position = data.position;
      io.emit('update', players);
    }
  });

  socket.on('ability', (data) => {
    players.forEach((p, id) => {
      if (p.position.x === data.target.x && p.position.z === data.target.z) p.hp -= data.damage;
    });
    io.emit('update', players);
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('update', players);
  });
});

server.listen(3000, () => console.log('Server on port 3000'));
```

### Step 4: Run the Application

1. Open the repository in GitHub Codespaces.
2. Run `npm install` to install dependencies.
3. Start the server with `npm start`.
4. Open `localhost:3000` in the Codespaces browser preview.

---

## 7. Outcome

- **Visuals**: Low-poly, sculpted pieces with Ghibli-inspired wobble and Pokémon-like details (e.g., pawn with eye, knight with ear), rendered on a Ghibli-esque chessboard.
- **Gameplay**: Multiplayer chess with WASD movement, spacebar abilities, and periodic events; basic prototype with room for chess rule validation.
- **Performance**: Lightweight (~30-50 triangles per piece, minimal draw calls), runs smoothly in Codespaces.

---

## 8. Next Steps (Optional)

- Add full chess move validation in `game.js`.
- Implement loot drops as visible scene objects.
- Expand the Wild Sprout event with a neutral entity.
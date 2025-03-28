# Chess Royale: Checkmate Arena

A 3D multiplayer chess game blending traditional chess rules with Fortnite-inspired mechanics, styled with Studio Ghibli's whimsical charm and Pokémon's vibrant creature vibe.

## Quick Start
1. Open this repo in GitHub Codespaces.
2. Run `npm install` to install dependencies.
3. Start the server with `npm start`.
4. Open `localhost:3000` in the Codespaces browser preview.

## Game Controls
- WASD: Move your piece
- Spacebar: Use ability
- Mouse: Rotate camera view

## Features
- Unique abilities for each chess piece
- Team-based gameplay
- Dynamic events every 3 minutes
- Low-poly Ghibli/Pokémon inspired visuals

## Notes for Developers
- This project uses Three.js with ES Modules as recommended for Three.js r150+
- The server exposes the node_modules directory to allow browser access to Three.js modules
- Socket.IO handles real-time multiplayer communication
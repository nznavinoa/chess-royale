// ChessRules.js - Chess logic implementation

export class ChessRules {
  constructor(boardState) {
    // Initialize with empty 8x8 board if not provided
    this.boardState = boardState || Array(8).fill().map(() => Array(8).fill(null));
    this.pieces = new Map(); // Store all pieces by their ID
  }

  /**
   * Update the board state
   * @param {Array} newBoardState - 2D array representing the chess board
   */
  updateBoardState(newBoardState) {
    this.boardState = newBoardState;
  }
  
  /**
   * Register a piece in the game
   * @param {string} id - Unique identifier for the piece
   * @param {Object} pieceData - Data about the piece (type, team, position)
   */
  registerPiece(id, pieceData) {
    if (!id || !pieceData) {
      console.error("Invalid piece data:", id, pieceData);
      return null;
    }
    
    // Store the piece in our pieces map
    this.pieces.set(id, {
      ...pieceData,
      id
    });
    
    // If the piece has a valid position, update the board state
    if (pieceData.position && 
        this.isValidPosition(pieceData.position) && 
        pieceData.type && 
        pieceData.team) {
      
      // Initialize board state if needed
      if (!this.boardState) {
        this.boardState = Array(8).fill().map(() => Array(8).fill(null));
      }
      
      // Ensure the board has all rows initialized
      for (let i = 0; i < 8; i++) {
        if (!this.boardState[i]) {
          this.boardState[i] = Array(8).fill(null);
        }
      }
      
      // Place the piece on the board
      const z = pieceData.position.z;
      const x = pieceData.position.x;
      
      if (z >= 0 && z < 8 && x >= 0 && x < 8) {
        this.boardState[z][x] = {
          id,
          type: pieceData.type,
          team: pieceData.team
        };
      }
    }
    
    return this.pieces.get(id);
  }
  
  /**
   * Get a piece by its ID
   * @param {string} id - The piece ID
   * @returns {Object|undefined} - The piece data or undefined if not found
   */
  getPieceById(id) {
    return this.pieces.get(id);
  }
  
  /**
   * Update a piece's position
   * @param {string} id - The piece ID
   * @param {Object} newPosition - New {x, z} coordinates
   * @returns {boolean} - Whether the update was successful
   */
  updatePiecePosition(id, newPosition) {
    const piece = this.pieces.get(id);
    if (!piece || !this.isValidPosition(newPosition)) {
      return false;
    }
    
    // Remove from old position
    if (piece.position && this.isValidPosition(piece.position)) {
      const oldZ = piece.position.z;
      const oldX = piece.position.x;
      
      if (oldZ >= 0 && oldZ < 8 && oldX >= 0 && oldX < 8 && 
          this.boardState[oldZ] && this.boardState[oldZ][oldX]) {
        this.boardState[oldZ][oldX] = null;
      }
    }
    
    // Update position in the piece data
    piece.position = {
      x: newPosition.x,
      z: newPosition.z
    };
    
    // Make sure the board is initialized
    this.ensureBoardInitialized();
    
    // Add to new position on board
    const z = newPosition.z;
    const x = newPosition.x;
    
    if (z >= 0 && z < 8 && x >= 0 && x < 8) {
      this.boardState[z][x] = {
        id,
        type: piece.type,
        team: piece.team
      };
    }
    
    return true;
  }
  
  /**
   * Ensure the board is fully initialized
   */
  ensureBoardInitialized() {
    if (!this.boardState || !Array.isArray(this.boardState)) {
      this.boardState = Array(8).fill().map(() => Array(8).fill(null));
      return;
    }
    
    // Ensure all rows exist
    for (let z = 0; z < 8; z++) {
      if (!this.boardState[z] || !Array.isArray(this.boardState[z])) {
        this.boardState[z] = Array(8).fill(null);
      } else {
        // Ensure all cells in the row exist
        for (let x = 0; x < 8; x++) {
          if (this.boardState[z][x] === undefined) {
            this.boardState[z][x] = null;
          }
        }
      }
    }
  }

  /**
   * Check if a position is within the board boundaries
   * @param {Object} position - {x, z} coordinates
   * @returns {boolean} - Whether the position is valid
   */
  isValidPosition(position) {
    // First check if position is defined and has required properties
    if (!position || typeof position.x === 'undefined' || typeof position.z === 'undefined') {
      return false;
    }
    
    return position.x >= 0 && position.x < 8 && position.z >= 0 && position.z < 8;
  }

  /**
   * Get all valid moves for a piece at the given position
   * @param {Object} position - {x, z} coordinates
   * @returns {Array} - Array of valid move positions
   */
  getValidMoves(position) {
    if (!this.isValidPosition(position)) {
      return [];
    }

    const piece = this.getPieceAt(position);
    if (!piece) {
      return [];
    }

    try {
      switch (piece.type.toLowerCase()) {
        case 'pawn':
          return this.getPawnMoves(position, piece.team);
        case 'rook':
          return this.getRookMoves(position, piece.team);
        case 'knight':
          return this.getKnightMoves(position, piece.team);
        case 'bishop':
          return this.getBishopMoves(position, piece.team);
        case 'queen':
          return this.getQueenMoves(position, piece.team);
        case 'king':
          return this.getKingMoves(position, piece.team);
        default:
          return [];
      }
    } catch (error) {
      console.error("Error getting valid moves:", error);
      return [];
    }
  }

  /**
   * Get the piece at the given position
   * @param {Object} position - {x, z} coordinates
   * @returns {Object|null} - The piece at the position or null if empty
   */
  getPieceAt(position) {
    if (!this.isValidPosition(position)) {
      return null;
    }
    
    this.ensureBoardInitialized();
    
    const z = position.z;
    const x = position.x;
    
    if (z >= 0 && z < 8 && x >= 0 && x < 8) {
      return this.boardState[z][x];
    }
    
    return null;
  }

  /**
   * Check if a position is occupied
   * @param {Object} position - {x, z} coordinates
   * @returns {boolean} - Whether the position is occupied
   */
  isPositionOccupied(position) {
    // First validate the position is defined and valid
    if (!position || typeof position.x === 'undefined' || typeof position.z === 'undefined') {
      return false;
    }
    
    if (!this.isValidPosition(position)) {
      return false;
    }
    
    return this.getPieceAt(position) !== null;
  }

  /**
   * Check if a position is occupied by an opponent's piece
   * @param {Object} position - {x, z} coordinates
   * @param {string} team - 'white' or 'black'
   * @returns {boolean} - Whether the position is occupied by an opponent
   */
  isOpponentPiece(position, team) {
    const piece = this.getPieceAt(position);
    return piece && piece.team !== team;
  }

  /**
   * Get all valid moves for a pawn
   * @param {Object} position - {x, z} coordinates
   * @param {string} team - 'white' or 'black'
   * @returns {Array} - Array of valid move positions
   */
  getPawnMoves(position, team) {
    const moves = [];
    const direction = team === 'white' ? -1 : 1;
    const isStartingRow = team === 'white' ? position.z === 6 : position.z === 1;

    // Forward move
    const forward = { x: position.x, z: position.z + direction };
    if (this.isValidPosition(forward) && !this.isPositionOccupied(forward)) {
      moves.push(forward);

      // Double forward from starting position
      if (isStartingRow) {
        const doubleForward = { x: position.x, z: position.z + 2 * direction };
        if (this.isValidPosition(doubleForward) && !this.isPositionOccupied(doubleForward)) {
          moves.push(doubleForward);
        }
      }
    }

    // Capture diagonally
    const captureMoves = [
      { x: position.x - 1, z: position.z + direction },
      { x: position.x + 1, z: position.z + direction }
    ];

    for (const move of captureMoves) {
      if (this.isValidPosition(move) && this.isOpponentPiece(move, team)) {
        moves.push(move);
      }
    }

    return moves;
  }

  /**
   * Get all valid moves for a rook
   * @param {Object} position - {x, z} coordinates
   * @param {string} team - 'white' or 'black'
   * @returns {Array} - Array of valid move positions
   */
  getRookMoves(position, team) {
    const moves = [];
    const directions = [
      { x: 0, z: 1 },  // Down
      { x: 0, z: -1 }, // Up
      { x: 1, z: 0 },  // Right
      { x: -1, z: 0 }  // Left
    ];

    for (const dir of directions) {
      for (let i = 1; i < 8; i++) {
        const move = { x: position.x + dir.x * i, z: position.z + dir.z * i };
        
        if (!this.isValidPosition(move)) {
          break;
        }
        
        if (!this.isPositionOccupied(move)) {
          moves.push(move);
        } else {
          if (this.isOpponentPiece(move, team)) {
            moves.push(move);
          }
          break;
        }
      }
    }

    return moves;
  }

  /**
   * Get all valid moves for a knight
   * @param {Object} position - {x, z} coordinates
   * @param {string} team - 'white' or 'black'
   * @returns {Array} - Array of valid move positions
   */
  getKnightMoves(position, team) {
    const moves = [];
    const knightMoves = [
      { x: 1, z: 2 },
      { x: 2, z: 1 },
      { x: 2, z: -1 },
      { x: 1, z: -2 },
      { x: -1, z: -2 },
      { x: -2, z: -1 },
      { x: -2, z: 1 },
      { x: -1, z: 2 }
    ];

    for (const move of knightMoves) {
      const newPos = { x: position.x + move.x, z: position.z + move.z };
      
      if (this.isValidPosition(newPos) && 
          (!this.isPositionOccupied(newPos) || this.isOpponentPiece(newPos, team))) {
        moves.push(newPos);
      }
    }

    return moves;
  }

  /**
   * Get all valid moves for a bishop
   * @param {Object} position - {x, z} coordinates
   * @param {string} team - 'white' or 'black'
   * @returns {Array} - Array of valid move positions
   */
  getBishopMoves(position, team) {
    const moves = [];
    const directions = [
      { x: 1, z: 1 },   // Down-Right
      { x: 1, z: -1 },  // Up-Right
      { x: -1, z: 1 },  // Down-Left
      { x: -1, z: -1 }  // Up-Left
    ];

    for (const dir of directions) {
      for (let i = 1; i < 8; i++) {
        const move = { x: position.x + dir.x * i, z: position.z + dir.z * i };
        
        if (!this.isValidPosition(move)) {
          break;
        }
        
        if (!this.isPositionOccupied(move)) {
          moves.push(move);
        } else {
          if (this.isOpponentPiece(move, team)) {
            moves.push(move);
          }
          break;
        }
      }
    }

    return moves;
  }

  /**
   * Get all valid moves for a queen
   * @param {Object} position - {x, z} coordinates
   * @param {string} team - 'white' or 'black'
   * @returns {Array} - Array of valid move positions
   */
  getQueenMoves(position, team) {
    // Queen moves like a rook and bishop combined
    return [
      ...this.getRookMoves(position, team),
      ...this.getBishopMoves(position, team)
    ];
  }

  /**
   * Get all valid moves for a king
   * @param {Object} position - {x, z} coordinates
   * @param {string} team - 'white' or 'black'
   * @returns {Array} - Array of valid move positions
   */
  getKingMoves(position, team) {
    const moves = [];
    const directions = [
      { x: 0, z: 1 },   // Down
      { x: 1, z: 1 },   // Down-Right
      { x: 1, z: 0 },   // Right
      { x: 1, z: -1 },  // Up-Right
      { x: 0, z: -1 },  // Up
      { x: -1, z: -1 }, // Up-Left
      { x: -1, z: 0 },  // Left
      { x: -1, z: 1 }   // Down-Left
    ];

    for (const dir of directions) {
      const move = { x: position.x + dir.x, z: position.z + dir.z };
      
      if (this.isValidPosition(move) && 
          (!this.isPositionOccupied(move) || this.isOpponentPiece(move, team))) {
        moves.push(move);
      }
    }

    return moves;
  }
}
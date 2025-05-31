/**
 * ENHANCED SNAKE PATH SOLUTION WITH PREDICTIVE RENDERING
 * 
 * This file provides an enhanced replacement for snakepath.js with:
 * - Predictive piece calculation for left/straight/right moves
 * - Simultaneous rendering to eliminate blink effects
 * - Smooth tail rotation for single start cell selection
 * - Turn restriction logic (no consecutive same turns)
 * 
 * Instructions:
 * 1. Save this as js/core/snakepath.js, replacing the existing file
 * 2. Clear your browser cache completely
 * 3. Reload the page
 */

// Make the class available globally first, then export it
window.SnakePath = class SnakePath {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    this._scrollInProgress = false;
    
    // Add critical CSS to ensure things work
    this.injectCriticalStyles();
    
    // Direction name mapping for clearer logging
    this.directionNames = {
      0: 'top',
      1: 'right',
      2: 'bottom',
      3: 'left',
      '-1': 'unknown'
    };
    
    // Use direct raw GitHub URLs for all specific orientation PNG files
    this.pieceImages = {
      // Head pieces with orientation in filename (from user's perspective)
      head_bt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiecebt.png', // bottom to top
      head_tb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiecetb.png', // top to bottom
      head_lr: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiecelr.png', // left to right
      head_rl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiecerl.png', // right to left
      
      // Tail pieces with orientation in filename (from user's perspective)
      tail_bt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiecebt.png', // bottom to top
      tail_tb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiecetb.png', // top to bottom
      tail_lr: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiecelr.png', // left to right
      tail_rl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiecerl.png', // right to left
      
      // Curved pieces with orientation in filename (from user's perspective)
      curved_bl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecebl.png', // bottom to left
      curved_br: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecebr.png', // bottom to right
      curved_lb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecelb.png', // left to bottom
      curved_lt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecelt.png', // left to top
      curved_tl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecetl.png', // top to left
      curved_tr: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecetr.png', // top to right
      curved_rt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecert.png', // right to top
      curved_rb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecerb.png', // right to bottom
      
      // Straight pieces with orientation in filename (from user's perspective)
      straight_lr: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecelr.png', // left to right
      straight_rl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecerl.png', // right to left
      straight_tb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecetb.png', // top to bottom
      straight_bt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecebt.png'  // bottom to top
    };
    
    // Verify images are accessible
    this.verifyImageUrls();
    
    // COMPLETELY FIXED: Direction mapping with entry/exit as keys
    // Format is 'entry,exit': {piece: 'piece_name', description: 'description'}
    this.directionMappings = {
      // Horizontal straight pieces (left-right axis)
      '3,1': { piece: 'straight_lr', description: 'Straight from left to right' },
      '1,3': { piece: 'straight_rl', description: 'Straight from right to left' },
      
      // Vertical straight pieces (top-bottom axis)
      '0,2': { piece: 'straight_tb', description: 'Straight from top to bottom' },
      '2,0': { piece: 'straight_bt', description: 'Straight from bottom to top' },
      
      // Curved pieces - all 8 combinations
      '0,1': { piece: 'curved_tr', description: 'Curved from top to right' },
      '0,3': { piece: 'curved_tl', description: 'Curved from top to left' },
      '1,0': { piece: 'curved_rt', description: 'Curved from right to top' },
      '1,2': { piece: 'curved_rb', description: 'Curved from right to bottom' },
      '2,1': { piece: 'curved_br', description: 'Curved from bottom to right' },
      '2,3': { piece: 'curved_bl', description: 'Curved from bottom to left' },
      '3,0': { piece: 'curved_lt', description: 'Curved from left to top' },
      '3,2': { piece: 'curved_lb', description: 'Curved from left to bottom' }
    };
    
    // Head piece mappings - direction indicates where the head is coming FROM
    this.headMappings = {
      0: { piece: 'head_tb', description: 'Head facing top (coming from top)' },
      1: { piece: 'head_rl', description: 'Head facing right (coming from right)' }, // SWAPPED: Now using rl
      2: { piece: 'head_bt', description: 'Head facing bottom (coming from bottom)' },
      3: { piece: 'head_lr', description: 'Head facing left (coming from left)' }    // SWAPPED: Now using lr
    };
    
    // Tail piece mappings - direction indicates where the tail is going TO
    this.tailMappings = {
      0: { piece: 'tail_bt', description: 'Tail going to top (bottom to top)' },
      1: { piece: 'tail_lr', description: 'Tail going to right (left to right)' },
      2: { piece: 'tail_tb', description: 'Tail going to bottom (top to bottom)' },
      3: { piece: 'tail_rl', description: 'Tail going to left (right to left)' }
    };
    
    // NEW: Predictive calculation cache
    this.predictiveCache = new Map();
    
    // Make this instance available globally for direct access
    window.snakePath = this;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Flag initialization as complete
    this.initialized = true;
    
    // Initial update after a short delay
    setTimeout(() => this.updateSnakePath(), 500);
  }
  
  /**
   * Inject critical CSS styles to ensure snake pieces appear correctly
   * ENHANCED: Added smooth transitions for simultaneous rendering
   */
  injectCriticalStyles() {
    // Check if we've already injected styles
    if (document.getElementById('snake-path-critical-styles')) return;
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'snake-path-critical-styles';
    style.textContent = `
      .grid-cell {
        position: relative !important;
      }
      .snake-piece {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 500 !important;
        pointer-events: none !important;
        opacity: 1 !important;
        display: block !important;
        transition: opacity 0.15s ease !important;
      }

      .snake-piece.rotating-tail {
        animation: smooth-rotate 2.4s linear infinite !important;
      }
      
      @keyframes smooth-rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .snake-piece.updating {
        opacity: 0 !important;
      }
    `;
    
    // Add to document
    document.head.appendChild(style);
  }
  
  /**
   * Verify image URLs are accessible
   */
  verifyImageUrls() {
    Object.entries(this.pieceImages).forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
    });
  }
  
  /**
   * Set up event listeners for path changes and scrolling
   */
  setupEventListeners() {
    // Listen for cell selection changes directly
    if (this.gridRenderer) {
      // Hook into handleCellSelection
      if (this.gridRenderer.handleCellSelection) {
        const originalHandleCellSelection = this.gridRenderer.handleCellSelection;
        this.gridRenderer.handleCellSelection = (x, y, forceSelect) => {
          const result = originalHandleCellSelection.call(this.gridRenderer, x, y, forceSelect);
          
          // Only update if not scrolling
          if (!this._scrollInProgress) {
            // Update snake path after a short delay
            setTimeout(() => this.updateSnakePath(), 50);
          }
          
          return result;
        };
      }
      
      // Also try to hook into handleSelectionChange if it exists
      if (this.gridRenderer.handleSelectionChange) {
        const originalHandleSelectionChange = this.gridRenderer.handleSelectionChange;
        this.gridRenderer.handleSelectionChange = (...args) => {
          const result = originalHandleSelectionChange.apply(this.gridRenderer, args);
          
          // Only update if not scrolling
          if (!this._scrollInProgress) {
            setTimeout(() => this.updateSnakePath(), 50);
          }
          
          return result;
        };
      }
    }
    
    // Listen for cell clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('grid-cell') && !this._scrollInProgress) {
        setTimeout(() => this.updateSnakePath(), 100);
      }
    });
    
    // Listen for deselection events
    document.addEventListener('selectionsCleared', () => {
      if (!this._scrollInProgress) {
        this.stopTailRotation();
        setTimeout(() => this.updateSnakePath(), 100);
      }
    });
    
    // Listen for grid scroll events
    document.addEventListener('gridScrolled', (e) => {
      // Mark that scrolling is in progress
      this._scrollInProgress = true;
    });

    document.addEventListener('gridScrollComplete', (e) => {
      // Scrolling is complete, update the snake path
      this._scrollInProgress = false;
      
      // Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => this.refreshSnakePath(false));
    });

    // Listen for grid rebuilds
    document.addEventListener('gridRebuilt', (e) => {
      // Only update if not in the middle of scrolling
      if (!this._scrollInProgress) {
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => this.refreshSnakePath(false));
      }
    });
    
    // Set a regular update interval (backup in case other methods fail)
    // Only update if not scrolling and has selected cells
    setInterval(() => {
      if (!this._scrollInProgress && 
          this.gridRenderer && 
          this.gridRenderer.selectedCells && 
          this.gridRenderer.selectedCells.length > 0) {
        this.updateSnakePath();
      }
    }, 2000);
  }
  
  /**
   * Clear all snake images from the grid
   * ENHANCED: Also stops rotation and clears predictive cache
   */
  clearSnakeImages() {
    this.stopTailRotation();
    this.predictiveCache.clear();
    const snakeImages = document.querySelectorAll('.snake-piece');
    snakeImages.forEach(image => image.remove());
  }
  
  /**
   * Get the relative direction from one cell to another
   * @param {Object} fromCell - Starting cell coordinates {x, y}
   * @param {Object} toCell - Target cell coordinates {x, y}
   * @return {number} Direction index (0=top, 1=right, 2=bottom, 3=left)
   */
  getDirection(fromCell, toCell) {
    // Check if either cell is undefined or null
    if (!fromCell || !toCell) {
      return -1; // Return invalid direction
    }
    
    // Check if both cells have x and y properties
    if (typeof fromCell.y !== 'number' || typeof toCell.y !== 'number' ||
        typeof fromCell.x !== 'number' || typeof toCell.x !== 'number') {
      return -1; // Return invalid direction
    }
    
    // Calculate direction FROM fromCell TO toCell
    if (fromCell.y > toCell.y) return 0; // toCell is above fromCell (top)
    if (fromCell.x < toCell.x) return 1; // toCell is to the right of fromCell (right)
    if (fromCell.y < toCell.y) return 2; // toCell is below fromCell (bottom)
    if (fromCell.x > toCell.x) return 3; // toCell is to the left of fromCell (left)
    
    return -1; // Same position or invalid coordinates
  }
  
  /**
   * Get the opposite direction
   * @param {number} direction - Direction index (0=top, 1=right, 2=bottom, 3=left)
   * @return {number} Opposite direction
   */
  getOppositeDirection(direction) {
    switch (direction) {
      case 0: return 2; // top → bottom
      case 1: return 3; // right → left
      case 2: return 0; // bottom → top
      case 3: return 1; // left → right
      default: return -1; // Invalid direction
    }
  }

  /**
   * Start smooth rotation animation for the tail piece at start cell
   */
  startTailRotation() {
    const startPiece = document.querySelector('.grid-cell[data-grid-x="35"][data-grid-y="35"] .snake-piece');
    if (startPiece) {
      startPiece.classList.add('rotating-tail');
      console.log('Started tail rotation animation');
    }
  }

  /**
   * Stop the tail rotation animation
   */
  stopTailRotation() {
    const rotatingPieces = document.querySelectorAll('.snake-piece.rotating-tail');
    rotatingPieces.forEach(piece => piece.classList.remove('rotating-tail'));
    console.log('Stopped tail rotation animation');
  }

  /**
   * NEW: Get turn type between two directions
   * @param {number} fromDirection - Previous direction
   * @param {number} toDirection - Current direction  
   * @return {string} 'left', 'right', or 'straight'
   */
  getTurnType(fromDirection, toDirection) {
    const turnMap = {
      // From top (0)
      '0,3': 'left',   // top to left
      '0,0': 'straight', // top to top (impossible but for completeness)
      '0,1': 'right',  // top to right
      
      // From right (1)  
      '1,0': 'left',   // right to top
      '1,1': 'straight',
      '1,2': 'right',  // right to bottom
      
      // From bottom (2)
      '2,1': 'left',   // bottom to right  
      '2,2': 'straight',
      '2,3': 'right',  // bottom to left
      
      // From left (3)
      '3,2': 'left',   // left to bottom
      '3,3': 'straight', 
      '3,0': 'right'   // left to top
    };
    
    return turnMap[`${fromDirection},${toDirection}`] || 'straight';
  }

  /**
   * NEW: Get possible moves based on current direction and previous turn
   * Prevents consecutive same turns (except straight)
   * @param {number} currentDirection - Current movement direction
   * @param {string} previousTurn - Previous turn type ('left', 'right', 'straight', or null)
   * @return {Array} Array of possible move objects
   */
  getPossibleMoves(currentDirection, previousTurn) {
    const allMoves = [
      { name: 'left', turn: 'left' },
      { name: 'straight', turn: 'straight' }, 
      { name: 'right', turn: 'right' }
    ];
    
    // Filter out consecutive same turns (except straight)
    return allMoves.filter(move => {
      if (previousTurn === null) return true; // First move, all allowed
      if (move.turn === 'straight') return true; // Straight always allowed
      if (previousTurn === 'straight') return true; // After straight, all allowed
      
      // Prevent consecutive left or consecutive right
      return move.turn !== previousTurn;
    });
  }

  /**
   * NEW: Calculate new direction based on current direction and turn type
   * @param {number} currentDirection - Current direction (0=top, 1=right, 2=bottom, 3=left)
   * @param {string} turnType - 'left', 'straight', or 'right'
   * @return {number} New direction
   */
  getNewDirection(currentDirection, turnType) {
    if (turnType === 'straight') return currentDirection;
    
    if (turnType === 'left') {
      // Turn left: 0→3, 1→0, 2→1, 3→2
      return (currentDirection + 3) % 4;
    }
    
    if (turnType === 'right') {
      // Turn right: 0→1, 1→2, 2→3, 3→0  
      return (currentDirection + 1) % 4;
    }
    
    return currentDirection;
  }

  /**
   * NEW: Get hypothetical next cell position based on direction
   * @param {Object} fromCell - Current cell {x, y}
   * @param {number} direction - Direction to move (0=top, 1=right, 2=bottom, 3=left)
   * @return {Object} New cell position {x, y}
   */
  getHypotheticalNextCell(fromCell, direction) {
    const directionOffsets = [
      { x: 0, y: -1 }, // top
      { x: 1, y: 0 },  // right  
      { x: 0, y: 1 },  // bottom
      { x: -1, y: 0 }  // left
    ];
    
    const offset = directionOffsets[direction];
    if (!offset) return null;
    
    return {
      x: fromCell.x + offset.x,
      y: fromCell.y + offset.y
    };
  }

  /**
   * NEW: Calculate all possible next pieces for the current path
   * Based on left, straight, right moves with no consecutive same turns
   * @param {Array} cells - Current selected cells
   * @return {Object} Predicted pieces for each possible move
   */
  calculatePredictivePieces(cells) {
    if (cells.length < 2) return {}; // Need at least 2 cells to predict
    
    const predictions = {};
    const lastCell = cells[cells.length - 1];
    const secondLastCell = cells[cells.length - 2];
    const thirdLastCell = cells.length >= 3 ? cells[cells.length - 3] : null;
    
    // Calculate the current direction of movement
    const currentDirection = this.getDirection(secondLastCell, lastCell);
    if (currentDirection === -1) return {};
    
    // Calculate what the previous turn was (if any)
    let previousTurn = null;
    if (thirdLastCell) {
      const previousDirection = this.getDirection(thirdLastCell, secondLastCell);
      if (previousDirection !== -1) {
        previousTurn = this.getTurnType(previousDirection, currentDirection);
      }
    }
    
    // Calculate possible moves: left, straight, right
    const possibleMoves = this.getPossibleMoves(currentDirection, previousTurn);
    
    // For each possible move, predict what pieces would be needed
    possibleMoves.forEach(move => {
      const newDirection = this.getNewDirection(currentDirection, move.turn);
      const hypotheticalNewCell = this.getHypotheticalNextCell(lastCell, newDirection);
      
      if (hypotheticalNewCell) {
        // Create hypothetical path with new cell
        const hypotheticalPath = [...cells, hypotheticalNewCell];
        
        // Calculate what the second-to-last piece would become
        const secondLastPieceConfig = this.determinePiece(
          hypotheticalPath.length - 2, 
          hypotheticalPath, 
          false
        );
        
        // Calculate what the new head piece would be
        const newHeadPieceConfig = this.determinePiece(
          hypotheticalPath.length - 1, 
          hypotheticalPath, 
          true
        );
        
        predictions[move.name] = {
          secondLastPiece: secondLastPieceConfig,
          newHeadPiece: newHeadPieceConfig,
          newCell: hypotheticalNewCell,
          direction: newDirection
        };
      }
    });
    
    return predictions;
  }

  /**
   * NEW: Check if the last two cells need updating
   * @param {Array} selectedCells - All selected cells
   * @param {number} secondLastIndex - Index of second-to-last cell
   * @param {number} lastIndex - Index of last cell  
   * @return {boolean} True if last two cells need simultaneous update
   */
  checkIfLastTwoCellsNeedUpdate(selectedCells, secondLastIndex, lastIndex) {
    // Check if second-to-last cell needs to change from head to body
    const secondLastCell = selectedCells[secondLastIndex];
    const secondLastElement = document.querySelector(`.grid-cell[data-grid-x="${secondLastCell.x}"][data-grid-y="${secondLastCell.y}"]`);
    
    if (!secondLastElement) return true;
    
    const existingPiece = secondLastElement.querySelector('.snake-piece');
    if (!existingPiece) return true;
    
    // Calculate what the second-to-last piece should be now (no longer head)
    const correctPieceConfig = this.determinePiece(secondLastIndex, selectedCells, false);
    const existingPieceType = existingPiece.getAttribute('data-piece-type');
    
    // If the piece type needs to change, we need the simultaneous update
    return existingPieceType !== correctPieceConfig.piece;
  }

  /**
   * NEW: Update the last two cells simultaneously to prevent blink effect
   * @param {Array} selectedCells - All selected cells
   * @param {number} secondLastIndex - Index of second-to-last cell
   * @param {number} lastIndex - Index of last cell
   */
  updateLastTwoCellsSimultaneously(selectedCells, secondLastIndex, lastIndex) {
    const secondLastCell = selectedCells[secondLastIndex];
    const lastCell = selectedCells[lastIndex];
    
    const secondLastElement = document.querySelector(`.grid-cell[data-grid-x="${secondLastCell.x}"][data-grid-y="${secondLastCell.y}"]`);
    const lastElement = document.querySelector(`.grid-cell[data-grid-x="${lastCell.x}"][data-grid-y="${lastCell.y}"]`);
    
    if (!secondLastElement || !lastElement) return;
    
    // Phase 1: Hide both pieces simultaneously
    const secondLastPieces = secondLastElement.querySelectorAll('.snake-piece');
    const lastPieces = lastElement.querySelectorAll('.snake-piece');
    
    [...secondLastPieces, ...lastPieces].forEach(piece => {
      piece.style.opacity = '0';
    });
    
    // Phase 2: Update both pieces in single animation frame
    requestAnimationFrame(() => {
      // Remove old pieces
      secondLastPieces.forEach(piece => piece.remove());
      lastPieces.forEach(piece => piece.remove());
      
      // Force position relative
      secondLastElement.style.position = 'relative';
      lastElement.style.position = 'relative';
      
      // Calculate and create new pieces
      const secondLastConfig = this.determinePiece(secondLastIndex, selectedCells, false);
      const lastConfig = this.determinePiece(lastIndex, selectedCells, true);
      
      const secondLastImage = this.createPieceImage(secondLastConfig);
      const lastImage = this.createPieceImage(lastConfig);
      
      // Add both pieces
      secondLastElement.appendChild(secondLastImage);
      lastElement.appendChild(lastImage);
      
      // Make both visible simultaneously
      secondLastImage.style.opacity = '1';
      lastImage.style.opacity = '1';
    });
  }

  /**
   * NEW: Update remaining cells (excluding last two)
   * @param {Array} selectedCells - All selected cells
   * @param {number} excludeFromIndex - Don't update cells from this index onwards
   */
  updateRemainingCells(selectedCells, excludeFromIndex) {
    for (let i = 0; i < excludeFromIndex; i++) {
      const cell = selectedCells[i];
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      
      if (cellElement) {
        const isLastCell = i === selectedCells.length - 1;
        const pieceConfig = this.determinePiece(i, selectedCells, isLastCell);
        
        const existingPiece = cellElement.querySelector('.snake-piece');
        const existingPieceType = existingPiece ? existingPiece.getAttribute('data-piece-type') : null;
        
        if (!existingPiece || existingPieceType !== pieceConfig.piece) {
          cellElement.style.position = 'relative';
          
          if (existingPiece) existingPiece.remove();
          
          const pieceImage = this.createPieceImage(pieceConfig);
          cellElement.appendChild(pieceImage);
        }
      }
    }
  }

  /**
   * NEW: Normal update for all cells (fallback method)
   * @param {Array} selectedCells - All selected cells
   */
  updateAllCellsNormally(selectedCells) {
    // Track existing snake pieces on selected cells
    const existingPieces = new Map();
    document.querySelectorAll('.snake-piece').forEach(piece => {
      const cell = piece.closest('.grid-cell');
      if (cell) {
        const x = parseInt(cell.dataset.gridX, 10);
        const y = parseInt(cell.dataset.gridY, 10);
        if (!isNaN(x) && !isNaN(y)) {
          existingPieces.set(`${x},${y}`, {
            element: piece,
            type: piece.getAttribute('data-piece-type')
          });
        }
      }
    });
    
    // For each selected cell, determine if it needs a new piece
    selectedCells.forEach((cell, index) => {
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      
      if (!cellElement) return;
      
      const isLastCell = index === selectedCells.length - 1;
      const pieceConfig = this.determinePiece(index, selectedCells, isLastCell);
      
      const existingPiece = existingPieces.get(`${cell.x},${cell.y}`);
      if (existingPiece && existingPiece.type === pieceConfig.piece) {
        existingPieces.delete(`${cell.x},${cell.y}`);
      } else {
        cellElement.style.position = 'relative';
        
        const existingElements = cellElement.querySelectorAll('.snake-piece');
        existingElements.forEach(el => el.remove());
        
        const pieceImage = this.createPieceImage(pieceConfig);
        cellElement.appendChild(pieceImage);
      }
    });
  }
  
  /**
   * Determine the piece type for a specific cell in the path
   * @param {number} index - Index of the cell in the selected path
   * @param {Array} cells - Array of selected cell coordinates
   * @param {boolean} isLastCell - Whether this is the last cell in the path
   * @return {Object} Configuration for the piece
   */
  determinePiece(index, cells, isLastCell) {
    // For the first cell (tail piece)
    if (index === 0) {
      // If we only have one cell selected, default to tail from bottom
      if (cells.length === 1) {
        return { piece: 'tail_bt', type: 'tail', description: 'Default tail (bottom to top)' };
      }
      
      // For tail, we need to know the direction TO the next cell
      const exitDirection = this.getDirection(cells[0], cells[1]);
      
      // Use tailMappings to get the correct piece (exits to direction)
      const tailMapping = this.tailMappings[exitDirection];
      if (tailMapping) {
        return { 
          piece: tailMapping.piece, 
          type: 'tail', 
          description: tailMapping.description 
        };
      } else {
        return { piece: 'tail_bt', type: 'tail', description: 'Default tail (bottom to top)' };
      }
    }
    
    // For the last cell (head piece)
    if (isLastCell) {
      // For head, we need to know the direction FROM the previous cell
      const prevDirection = this.getDirection(cells[index-1], cells[index]);
      
      // The entry direction is OPPOSITE of the previous cell's exit direction
      const entryDirection = this.getOppositeDirection(prevDirection);
      
      // Use headMappings to get the correct piece (enters from direction)
      const headMapping = this.headMappings[entryDirection];
      if (headMapping) {
        return { 
          piece: headMapping.piece, 
          type: 'head', 
          description: headMapping.description 
        };
      } else {
        return { piece: 'head_tb', type: 'head', description: 'Default head (top to bottom)' };
      }
    }
    
    // For middle cells (non-head, non-tail)
    
    // Get previous and next cells
    const prevCell = cells[index - 1];
    const thisCell = cells[index];
    const nextCell = cells[index + 1];
    
    // Get directions between cells
    const prevDirection = this.getDirection(prevCell, thisCell);
    const nextDirection = this.getDirection(thisCell, nextCell);
    
    // Calculate entry and exit directions
    // CRITICAL FIX: Entry is OPPOSITE of prev cell's direction
    const entryDirection = this.getOppositeDirection(prevDirection);
    const exitDirection = nextDirection;
    
    // Create key for direction mappings
    const key = `${entryDirection},${exitDirection}`;
    
    // Look up the piece configuration from our direction mappings
    if (this.directionMappings[key]) {
      const mappingInfo = this.directionMappings[key];
      const pieceType = mappingInfo.piece.includes('curved') ? 'curved' : 'straight';
      
      return { 
        piece: mappingInfo.piece,
        type: pieceType,
        description: mappingInfo.description
      };
    }
    
    // If no mapping found, use a fallback based on alignment
    
    // Check if cells are aligned horizontally (same y coordinate)
    if (prevCell.y === thisCell.y && thisCell.y === nextCell.y) {
      // Horizontal alignment
      if (prevCell.x < nextCell.x) {
        return { piece: 'straight_lr', type: 'straight', description: 'Default straight (left to right)' };
      } else {
        return { piece: 'straight_rl', type: 'straight', description: 'Default straight (right to left)' };
      }
    } 
    // Check if cells are aligned vertically (same x coordinate)
    else if (prevCell.x === thisCell.x && thisCell.x === nextCell.x) {
      // Vertical alignment
      if (prevCell.y < nextCell.y) {
        return { piece: 'straight_tb', type: 'straight', description: 'Default straight (top to bottom)' };
      } else {
        return { piece: 'straight_bt', type: 'straight', description: 'Default straight (bottom to top)' };
      }
    } 
    
    // For truly ambiguous cases
    return { piece: 'straight_lr', type: 'straight', description: 'Fallback straight (left to right)' };
  }
  
  /**
   * Create an image element for a snake piece with the correct configuration
   * @param {Object} config - Configuration for the piece
   * @return {HTMLElement} The created image element
   */
  createPieceImage(config) {
    const img = document.createElement('img');
    
    // Choose the correct image URL based on the piece
    img.src = this.pieceImages[config.piece];
    img.className = `snake-piece snake-${config.type}`;
    img.setAttribute('data-piece-type', config.piece);
    
    // Set title for easier debugging
    img.title = config.description || config.piece;
    
    // CRITICAL: Apply all styles as inline styles with high z-index
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.zIndex = '500'; // CRITICAL: Much higher z-index
    img.style.pointerEvents = 'none';
    img.style.display = 'block';
    img.style.opacity = '1';
    
    // Add a unique ID for debugging
    img.id = `snake-piece-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    return img;
  }

  /**
   * ENHANCED: Update the full snake path visualization with predictive rendering
   * Main entry point with predictive caching and simultaneous rendering
   */
  updateSnakePath() {
    // Skip updates if scrolling is in progress
    if (this._scrollInProgress) {
      return;
    }
    
    // Get selected cells
    const selectedCells = this.gridRenderer.selectedCells;
    if (!selectedCells || selectedCells.length === 0) {
      this.stopTailRotation();
      this.clearSnakeImages();
      return;
    }
    
    // Handle rotation logic for single cell selection
    if (selectedCells.length === 1) {
      const selectedCell = selectedCells[0];
      const isStartCell = (selectedCell.x === 35 && selectedCell.y === 35);
      
      if (isStartCell) {
        setTimeout(() => {
          this.startTailRotation();
        }, 100);
      }
    } else if (selectedCells.length >= 2) {
      this.stopTailRotation();
    }
    
    // Calculate predictive pieces for next moves (for performance optimization)
    const predictions = this.calculatePredictivePieces(selectedCells);
    
    // Store predictions in cache for potential future use
    if (Object.keys(predictions).length > 0) {
      this.predictiveCache.set('current', predictions);
    }
    
    // Create a map of currently selected cell coordinates for quick lookup
    const selectedCellMap = new Map();
    selectedCells.forEach(cell => {
      selectedCellMap.set(`${cell.x},${cell.y}`, true);
    });
    
    // FIRST PASS: Remove snake pieces from cells that are no longer selected
    const allSnakePieces = document.querySelectorAll('.snake-piece');
    allSnakePieces.forEach(piece => {
      const cell = piece.closest('.grid-cell');
      if (cell) {
        const x = parseInt(cell.dataset.gridX, 10);
        const y = parseInt(cell.dataset.gridY, 10);
        
        if (!isNaN(x) && !isNaN(y) && !selectedCellMap.has(`${x},${y}`)) {
          piece.remove();
        }
      }
    });
    
    // ENHANCED: Simultaneous update for last two cells when path grows
    if (selectedCells.length >= 2) {
      const lastIndex = selectedCells.length - 1;
      const secondLastIndex = lastIndex - 1;
      
      // Check if we need to update the last two cells
      const needsLastTwoUpdate = this.checkIfLastTwoCellsNeedUpdate(selectedCells, secondLastIndex, lastIndex);
      
      if (needsLastTwoUpdate) {
        this.updateLastTwoCellsSimultaneously(selectedCells, secondLastIndex, lastIndex);
        
        // Update all other cells normally (excluding the last two)
        this.updateRemainingCells(selectedCells, selectedCells.length - 2);
        return;
      }
    }
    
    // Normal update for all cells if no special last-two update needed
    this.updateAllCellsNormally(selectedCells);
  }

  /**
   * Improved flashSnakePiecesInCells method for reliable flashing of all snake pieces
   * Enhanced to work with hint letters and apostrophes
   * @param {Array} cellsToFlash - Array of cells containing snake pieces to flash
   * @param {Object} options - Optional configuration { flashOnce: boolean }
   */
  flashSnakePiecesInCells(cellsToFlash, options = {}) {
    if (!cellsToFlash || cellsToFlash.length === 0) return;
    
    console.log(`SnakePath: Flashing snake pieces in ${cellsToFlash.length} cells`);
    
    // Temporarily pause rotation during flashing
    const wasRotating = document.querySelector('.snake-piece.rotating-tail') !== null;
    if (wasRotating) {
      this.stopTailRotation();
    }
    
    // TIMING FIX: Use consistent delay for all calls
    const standardDelay = 300; // Increased from 100ms for better consistency
    
    setTimeout(() => {
      // Create element collections for each approach
      const directPieces = [];
      const fallbackElements = [];
      
      // APPROACH 1: Direct DOM lookups for each cell
      cellsToFlash.forEach(cell => {
        const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
        if (cellElement) {
          // Try multiple selector strategies
          const snakePieces = cellElement.querySelectorAll('.snake-piece');
          const partialClassPieces = cellElement.querySelectorAll('[class*="snake-"]');
          const imgElements = cellElement.querySelectorAll('img[src*="piece"]');
          
          if (snakePieces.length > 0) {
            snakePieces.forEach(p => directPieces.push(p));
          } else if (partialClassPieces.length > 0) {
            partialClassPieces.forEach(p => directPieces.push(p));
          } else if (imgElements.length > 0) {
            imgElements.forEach(p => directPieces.push(p));
          } else {
            // If we still can't find any snake pieces, save the cell element itself
            // We'll create an overlay for it
            fallbackElements.push(cellElement);
          }
        }
      });
      
      console.log(`Found ${directPieces.length} direct snake pieces`);
      
      // APPROACH 2: If no pieces found with direct approach, try a different approach
      if (directPieces.length === 0) {
        console.log('No direct pieces found, trying alternative approaches');
        
        // Try to find all snake pieces in the document and filter by cell
        const allSnakePieces = document.querySelectorAll('.snake-piece, [class*="snake-"], img[src*="piece"]');
        allSnakePieces.forEach(piece => {
          // Find the parent cell
          const cell = piece.closest('.grid-cell');
          if (cell) {
            const x = parseInt(cell.dataset.gridX, 10);
            const y = parseInt(cell.dataset.gridY, 10);
            
            // Check if this cell is in our flash list
            if (cellsToFlash.some(c => c.x === x && c.y === y)) {
              directPieces.push(piece);
            }
          }
        });
        
        console.log(`Found ${directPieces.length} pieces with alternative approach`);
      }
      
      // Create the combined set of elements to flash
      const allElements = [...directPieces];
      
      // For cells with no snake pieces, create overlay flash highlights
      if (fallbackElements.length > 0) {
        console.log(`Creating overlays for ${fallbackElements.length} cells`);
        
        fallbackElements.forEach(cellElement => {
          // Create an overlay div
          const overlay = document.createElement('div');
          overlay.className = 'word-completion-highlighter';
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(65, 185, 105, 0.5)';
          overlay.style.borderRadius = '5px';
          overlay.style.boxShadow = '0 0 15px rgba(65, 185, 105, 0.8)';
          overlay.style.zIndex = '600';
          overlay.style.pointerEvents = 'none';
          
          // Add to the cell
          cellElement.appendChild(overlay);
          
          // Add to our elements to flash
          allElements.push(overlay);
        });
      }
      
      // If we still have no elements, log and exit
      if (allElements.length === 0) {
        console.log('No elements found to flash after all attempts');
        
        // Restore rotation if it was active
        if (wasRotating && cellsToFlash.length === 1) {
          const flashCell = cellsToFlash[0];
          if (flashCell.x === 35 && flashCell.y === 35) {
            this.startTailRotation();
          }
        }
        return;
      }
      
      console.log(`Flashing ${allElements.length} elements`);
      
      // TIMING FIX: Configurable flash cycles and consistent timing
      let flashCount = 0;
      const maxFlashes = options.flashOnce ? 2 : 4; // Support single flash option
      
      const flashInterval = setInterval(() => {
        // Toggle visibility
        const isVisible = flashCount % 2 === 0;
        
        // TIMING FIX: Apply changes to ALL elements simultaneously
        allElements.forEach(element => {
          // Apply multiple visibility techniques for maximum reliability
          if (isVisible) {
            // Hide element
            element.style.visibility = 'hidden';
            element.style.opacity = '0';
          } else {
            // Show element
            element.style.visibility = 'visible';
            element.style.opacity = '1';
          }
        });
        
        flashCount++;
        
        // Stop after max flashes
        if (flashCount >= maxFlashes) {
          clearInterval(flashInterval);
          
          // TIMING FIX: Restore ALL elements simultaneously
          allElements.forEach(element => {
            element.style.visibility = 'visible';
            element.style.opacity = '1';
            
            // Remove overlays
            if (element.className === 'word-completion-highlighter') {
              if (element.parentNode) {
                element.parentNode.removeChild(element);
              }
            }
          });
          
          console.log('Flash animation complete');
          
          // Restore rotation if it was active and we're flashing the start cell
          if (wasRotating && cellsToFlash.length === 1) {
            const flashCell = cellsToFlash[0];
            if (flashCell.x === 35 && flashCell.y === 35) {
              setTimeout(() => {
                this.startTailRotation();
              }, 500); // Small delay before restarting rotation
            }
          }
        }
      }, 250); // TIMING FIX: Consistent quarter second timing for all flashes
      
    }, standardDelay); // TIMING FIX: Consistent delay for all calls
  }
    
  /**
   * Direct flash method that uses multiple techniques to ensure visibility toggling works
   * @param {Array} elements - Elements to flash
   */
  directFlashElements(elements) {
    if (!elements || elements.length === 0) return;
    
    // Store original properties for restoration
    const originalProperties = elements.map(el => ({
      element: el,
      visibility: el.style.visibility,
      display: el.style.display,
      opacity: el.style.opacity
    }));
    
    // Flash counter
    let flashCount = 0;
    const maxFlashes = 4; // 2 complete cycles
    
    const flashInterval = setInterval(() => {
      // Toggle visibility
      const isVisible = flashCount % 2 === 0;
      
      elements.forEach(el => {
        // Try multiple approaches to ensure the element toggles properly
        if (isVisible) {
          // Hide using multiple properties
          el.style.visibility = 'hidden';
          // For the head piece which might have special styling:
          el.style.opacity = '0';
        } else {
          // Show using multiple properties
          el.style.visibility = 'visible';
          // For the head piece which might have special styling:
          el.style.opacity = '1';
        }
      });
      
      flashCount++;
      
      // Stop after max flashes
      if (flashCount >= maxFlashes) {
        clearInterval(flashInterval);
        
        // Restore original properties
        originalProperties.forEach(prop => {
          prop.element.style.visibility = prop.visibility;
          prop.element.style.display = prop.display;
          prop.element.style.opacity = prop.opacity;
        });
        
        console.log('Flash animation complete');
      }
    }, 250);
  }
    
  /**
   * Public method to force a snake path update
   * Can be called from other components
   */
  refreshSnakePath(forceFullRefresh = false) {
    if (forceFullRefresh) {
      // Clear existing snake images and cache for a full refresh
      this.clearSnakeImages();
    }
    
    this.updateSnakePath();
  }
};

// Auto-initialize when the page loads
window.addEventListener('load', () => {
  // Check if we already have a snake path instance
  if (!window.snakePath && window.gameController && window.gameController.gridRenderer) {
    window.snakePath = new window.SnakePath(window.gameController.gridRenderer);
  }
});

// Export class for use in other modules
export default window.SnakePath;

/**
 * Snake Path Visualizer for Grid Game
 * Replaces the default path visualization with snake pieces
 * Handles rotation and piece selection based on path direction
 */

class SnakePath {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
    // Store references to snake piece images with their base URLs
    this.pieceImages = {
      tail: 'https://github.com/GTurner321/snakespeare/blob/main/assets/tailpiece.png',
      straight: 'https://github.com/GTurner321/snakespeare/blob/main/assets/straightpiece.png',
      curved: 'https://github.com/GTurner321/snakespeare/blob/main/assets/curvedpiece.png',
      head: 'https://github.com/GTurner321/snakespeare/blob/main/assets/headpiece.png'
    };
    
    // Convert GitHub URLs to raw content URLs for direct image access
    Object.keys(this.pieceImages).forEach(key => {
      this.pieceImages[key] = this.convertToRawGitHubUrl(this.pieceImages[key]);
    });
    
    // Direction mapping: maps [fromDir, toDir] to rotation and piece type
    // Directions: 0 = top, 1 = right, 2 = bottom, 3 = left
    this.directionMappings = {
      // [fromDir, toDir]: { piece: 'straight|curved', rotation: degrees, flip: boolean }
      '0,0': { piece: 'straight', rotation: 0, flip: false },
      '0,1': { piece: 'curved', rotation: 270, flip: false },
      '0,2': { piece: 'straight', rotation: 0, flip: false },
      '0,3': { piece: 'curved', rotation: 0, flip: true },
      '1,0': { piece: 'curved', rotation: 0, flip: false },
      '1,1': { piece: 'straight', rotation: 90, flip: false },
      '1,2': { piece: 'curved', rotation: 90, flip: false },
      '1,3': { piece: 'straight', rotation: 90, flip: false },
      '2,0': { piece: 'straight', rotation: 0, flip: false },
      '2,1': { piece: 'curved', rotation: 180, flip: true },
      '2,2': { piece: 'straight', rotation: 0, flip: false },
      '2,3': { piece: 'curved', rotation: 180, flip: false },
      '3,0': { piece: 'curved', rotation: 270, flip: true },
      '3,1': { piece: 'straight', rotation: 90, flip: false },
      '3,2': { piece: 'curved', rotation: 90, flip: true },
      '3,3': { piece: 'straight', rotation: 90, flip: false }
    };
    
    // Make this instance available globally for direct access
    window.snakePath = this;
    
    // Add event listeners for path changes
    this.setupEventListeners();
    
    // Flag initialization as complete
    this.initialized = true;
    console.log('SnakePath initialized with image URLs:', this.pieceImages);
  }
  
  /**
   * Convert GitHub blob URLs to raw content URLs
   * @param {string} githubUrl - GitHub blob URL
   * @return {string} Raw content URL
   */
  convertToRawGitHubUrl(githubUrl) {
    return githubUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  
  /**
   * Set up event listeners for path changes
   */
  setupEventListeners() {
    // Listen for selection changes to update snake visualization
    document.addEventListener('revealedLettersUpdated', () => {
      this.updateSnakePath();
    });
    
    // Update when selections are cleared
    document.addEventListener('selectionsCleared', () => {
      this.updateSnakePath();
    });
    
    // Update when grid is completed
    document.addEventListener('gridCompletionChanged', () => {
      this.updateSnakePath();
    });
    
    // Listen for new path setup
    document.addEventListener('pathSet', () => {
      // Reset any existing snake visualizations
      this.clearSnakeImages();
    });
    
    // Initialize path on grid rebuild
    document.addEventListener('gridRebuilt', () => {
      setTimeout(() => {
        this.updateSnakePath();
      }, 100);
    });
    
    console.log('SnakePath event listeners set up');
  }
  
  /**
   * Clear all snake images from the grid
   */
  clearSnakeImages() {
    const snakeImages = document.querySelectorAll('.snake-piece');
    snakeImages.forEach(image => image.remove());
  }
  
  /**
   * Get coordinates of a cell relative to another
   * @param {Object} fromCell - Starting cell coordinates {x, y}
   * @param {Object} toCell - Target cell coordinates {x, y}
   * @return {number} Direction index (0=top, 1=right, 2=bottom, 3=left)
   */
  getDirection(fromCell, toCell) {
    if (fromCell.y > toCell.y) return 0; // Going up
    if (fromCell.x < toCell.x) return 1; // Going right
    if (fromCell.y < toCell.y) return 2; // Going down
    if (fromCell.x > toCell.x) return 3; // Going left
    return -1; // Invalid direction
  }
  
  /**
   * Determine the piece type and rotation for a specific cell in the path
   * @param {number} index - Index of the cell in the selected path
   * @param {Array} cells - Array of selected cell coordinates
   * @param {boolean} isLastCell - Whether this is the last cell in the path
   * @return {Object} Configuration for the piece {piece, rotation, flip}
   */
  determinePiece(index, cells, isLastCell) {
    // For the first cell (tail piece)
    if (index === 0) {
      // If we only have one cell selected, default tail direction is down
      if (cells.length === 1) {
        return { piece: 'tail', rotation: 0, flip: false };
      }
      
      // Determine the direction from the tail to the next piece
      const fromCell = cells[0];
      const toCell = cells[1];
      const direction = this.getDirection(fromCell, toCell);
      
      // Tail piece: rotate so bottom connects to the next cell
      switch (direction) {
        case 0: return { piece: 'tail', rotation: 180, flip: false }; // Up
        case 1: return { piece: 'tail', rotation: 270, flip: false }; // Right
        case 2: return { piece: 'tail', rotation: 0, flip: false };   // Down
        case 3: return { piece: 'tail', rotation: 90, flip: false };  // Left
        default: return { piece: 'tail', rotation: 0, flip: false };  // Default
      }
    }
    
    // For the last cell (head piece)
    if (isLastCell) {
      // We need to know the direction from the previous cell to this one
      const prevCell = cells[index - 1];
      const thisCell = cells[index];
      const direction = this.getDirection(prevCell, thisCell);
      
      // Head piece: rotate so bottom connects to the previous cell
      switch (direction) {
        case 0: return { piece: 'head', rotation: 180, flip: false }; // From below
        case 1: return { piece: 'head', rotation: 270, flip: false }; // From left
        case 2: return { piece: 'head', rotation: 0, flip: false };   // From above
        case 3: return { piece: 'head', rotation: 90, flip: false };  // From right
        default: return { piece: 'head', rotation: 0, flip: false };  // Default
      }
    }
    
    // For middle cells, we need to determine if it's a straight or curved piece
    // and the proper rotation based on the direction from the previous cell
    // and the direction to the next cell
    const prevCell = cells[index - 1];
    const thisCell = cells[index];
    const nextCell = cells[index + 1];
    
    const fromDir = this.getDirection(prevCell, thisCell);
    const toDir = this.getDirection(thisCell, nextCell);
    
    // Look up the piece configuration from our direction mappings
    const key = `${fromDir},${toDir}`;
    if (this.directionMappings[key]) {
      return this.directionMappings[key];
    }
    
    // Default to straight piece if mapping not found
    return { piece: 'straight', rotation: 0, flip: false };
  }
  
  /**
   * Create a snake piece image element
   * @param {Object} config - Piece configuration {piece, rotation, flip}
   * @return {HTMLElement} The created image element
   */
  createPieceImage(config) {
    const img = document.createElement('img');
    img.src = this.pieceImages[config.piece];
    img.className = `snake-piece snake-${config.piece}`;
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.transform = `rotate(${config.rotation}deg) ${config.flip ? 'scaleX(-1)' : ''}`;
    img.style.pointerEvents = 'none'; // Allow clicks to pass through
    img.style.zIndex = '10'; // Ensure it's above the cell background
    return img;
  }
  
  /**
   * Update the full snake path visualization
   */
  updateSnakePath() {
    // Clear existing snake images
    this.clearSnakeImages();
    
    // Get selected cells
    const selectedCells = this.gridRenderer.selectedCells;
    if (!selectedCells || selectedCells.length === 0) {
      return;
    }
    
    // Get all selected cell elements
    const cellElements = document.querySelectorAll('.grid-cell.selected-cell');
    
    // For each selected cell, determine piece type and add image
    selectedCells.forEach((cell, index) => {
      // Find the corresponding DOM element
      const cellElement = Array.from(cellElements).find(el => {
        const x = parseInt(el.dataset.gridX, 10);
        const y = parseInt(el.dataset.gridY, 10);
        return x === cell.x && y === cell.y;
      });
      
      if (!cellElement) return;
      
      // Determine if this is the last cell
      const isLastCell = index === selectedCells.length - 1;
      
      // Get the configuration for this piece
      const pieceConfig = this.determinePiece(index, selectedCells, isLastCell);
      
      // Create and add the image to the cell
      const pieceImage = this.createPieceImage(pieceConfig);
      cellElement.appendChild(pieceImage);
      
      // Set position to relative for proper image positioning
      cellElement.style.position = 'relative';
      
      // Log for debugging
      console.log(`Cell ${index}: Added ${pieceConfig.piece} piece, rotation: ${pieceConfig.rotation}°, flip: ${pieceConfig.flip}`);
    });
    
    console.log(`Updated snake path with ${selectedCells.length} pieces`);
  }
}

// Export class for use in other modules
export default SnakePath;

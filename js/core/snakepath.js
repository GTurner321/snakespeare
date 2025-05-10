/**
 * Snake Path Visualizer for Grid Game
 * Renders snake pieces on selected cells to create a visual path
 * Fixed to ensure consistent rendering and proper visibility
 */

class SnakePath {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
    // Use direct raw GitHub URLs for images - no relative paths
    this.pieceImages = {
      tail: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiece.png',
      straight: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiece.png',
      curved: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiece.png',
      head: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiece.png'
    };
    
    // Make this instance available globally for direct access
    window.snakePath = this;
    
    // Verify images are accessible
    this.verifyImageUrls();
    
    // Setup event listeners for path changes
    this.setupEventListeners();
    
    // Flag initialization as complete
    this.initialized = true;
    console.log('SnakePath initialized with image URLs:', this.pieceImages);
    
    // Initial update after a short delay
    setTimeout(() => this.updateSnakePath(), 500);
  }
  
  /**
   * Verify image URLs are accessible and log results
   */
  verifyImageUrls() {
    Object.entries(this.pieceImages).forEach(([key, url]) => {
      const img = new Image();
      img.onload = () => console.log(`✅ Snake ${key} image loaded successfully:`, url);
      img.onerror = () => console.error(`❌ Snake ${key} image failed to load:`, url);
      img.src = url;
    });
  }
  
  /**
   * Set up event listeners for path changes
   */
  setupEventListeners() {
    // Hook into GridRenderer's handleCellSelection method
    if (this.gridRenderer && this.gridRenderer.handleCellSelection) {
      const originalHandleCellSelection = this.gridRenderer.handleCellSelection;
      this.gridRenderer.handleCellSelection = (x, y, forceSelect) => {
        const result = originalHandleCellSelection.call(this.gridRenderer, x, y, forceSelect);
        // Update snake path after selection changes
        setTimeout(() => this.updateSnakePath(), 50);
        return result;
      };
      console.log('Hooked into GridRenderer.handleCellSelection');
    }
    
    // Also hook into handleSelectionChange if it exists
    if (this.gridRenderer && this.gridRenderer.handleSelectionChange) {
      const originalHandleSelectionChange = this.gridRenderer.handleSelectionChange;
      this.gridRenderer.handleSelectionChange = (...args) => {
        const result = originalHandleSelectionChange.apply(this.gridRenderer, args);
        // Update snake path after selection changes
        setTimeout(() => this.updateSnakePath(), 50);
        return result;
      };
      console.log('Hooked into GridRenderer.handleSelectionChange');
    }
    
    // Listen for selections cleared event
    document.addEventListener('selectionsCleared', () => {
      console.log('selectionsCleared event received');
      this.clearSnakeImages();
    });
    
    // Listen for grid completion
    document.addEventListener('gridCompletionChanged', () => {
      console.log('gridCompletionChanged event received');
      this.updateSnakePath();
    });
    
    // Initialize path on grid rebuild
    document.addEventListener('gridRebuilt', () => {
      console.log('gridRebuilt event received');
      setTimeout(() => this.updateSnakePath(), 100);
    });
    
    // Set a regular update interval
    setInterval(() => {
      if (this.gridRenderer && this.gridRenderer.selectedCells && 
          this.gridRenderer.selectedCells.length > 0) {
        this.updateSnakePath();
      }
    }, 2000);
    
    console.log('SnakePath event listeners set up');
  }
  
  /**
   * Clear all snake images from the grid
   */
  clearSnakeImages() {
    const snakeImages = document.querySelectorAll('.snake-piece');
    const count = snakeImages.length;
    snakeImages.forEach(image => image.remove());
    if (count > 0) {
      console.log(`Cleared ${count} snake images`);
    }
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
      
      switch (direction) {
        case 0: return { piece: 'head', rotation: 0, flip: false }; // From below
        case 1: return { piece: 'head', rotation: 90, flip: false }; // From left
        case 2: return { piece: 'head', rotation: 180, flip: false }; // From above
        case 3: return { piece: 'head', rotation: 270, flip: false }; // From right
        default: return { piece: 'head', rotation: 180, flip: false }; // Default
      }
    }
    
    // For middle cells, determine if it's a straight or curved piece
    const prevCell = cells[index - 1];
    const thisCell = cells[index];
    const nextCell = cells[index + 1];
    
    const fromDir = this.getDirection(prevCell, thisCell);
    const toDir = this.getDirection(thisCell, nextCell);
    
    // Simple mapping for middle pieces
    if (fromDir === toDir || (fromDir % 2 === toDir % 2)) {
      // Same direction or both horizontal/vertical = straight piece
      return { 
        piece: 'straight',
        rotation: fromDir % 2 === 0 ? 0 : 90, // 0/180 for vertical, 90/270 for horizontal 
        flip: false
      };
    } else {
      // Different directions = curved piece with appropriate rotation
      if ((fromDir === 0 && toDir === 1) || (fromDir === 3 && toDir === 2)) {
        return { piece: 'curved', rotation: 270, flip: false };
      } else if ((fromDir === 0 && toDir === 3) || (fromDir === 1 && toDir === 2)) {
        return { piece: 'curved', rotation: 0, flip: false };
      } else if ((fromDir === 2 && toDir === 1) || (fromDir === 3 && toDir === 0)) {
        return { piece: 'curved', rotation: 180, flip: false };
      } else {
        return { piece: 'curved', rotation: 90, flip: false };
      }
    }
  }
  
  /**
   * Create an image element for a snake piece with the correct configuration
   * @param {Object} config - Configuration for the piece
   * @return {HTMLElement} The created image element
   */
  createPieceImage(config) {
    const img = document.createElement('img');
    img.src = this.pieceImages[config.piece];
    img.className = `snake-piece snake-${config.piece}`;
    
    // Apply all styles as inline styles for better visibility
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    
    // Critical: Much higher z-index for visibility
    img.style.zIndex = '500'; 
    
    img.style.pointerEvents = 'none'; // Allow clicks to pass through
    img.style.backgroundColor = 'transparent';
    
    // Apply the rotation and flip transformation
    img.style.transform = `rotate(${config.rotation}deg) ${config.flip ? 'scaleX(-1)' : ''}`;
    
    // Ensure visibility with additional styles
    img.style.display = 'block';
    img.style.opacity = '1';
    
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
      console.log('No selected cells, nothing to update');
      return;
    }
    
    console.log(`Updating snake path for ${selectedCells.length} selected cells`);
    
    // For each selected cell, determine piece type and add image
    selectedCells.forEach((cell, index) => {
      // Find the corresponding DOM element
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      
      if (!cellElement) {
        console.warn(`Cell element not found for selected cell at (${cell.x}, ${cell.y})`);
        return;
      }
      
      // Determine if this is the last cell
      const isLastCell = index === selectedCells.length - 1;
      
      // Get the configuration for this piece
      const pieceConfig = this.determinePiece(index, selectedCells, isLastCell);
      
      // Ensure cell has position: relative for proper image positioning
      cellElement.style.position = 'relative';
      
      // Create and add the image to the cell
      const pieceImage = this.createPieceImage(pieceConfig);
      cellElement.appendChild(pieceImage);
      
      // Add piece type class to the cell for additional styling possibilities
      cellElement.classList.add(`has-${pieceConfig.piece}`);
    });
    
    // Handle the special case for start cell (first cell) which might not have the selected-cell class
    if (selectedCells.length > 0) {
      const startCell = selectedCells[0];
      const startCellElement = document.querySelector(`.grid-cell[data-grid-x="${startCell.x}"][data-grid-y="${startCell.y}"]`);
      
      if (startCellElement) {
        if (!startCellElement.classList.contains('selected-cell')) {
          console.log('Start cell does not have selected-cell class, adding snake piece manually');
          
          // Force position relative
          startCellElement.style.position = 'relative';
          
          // Clear any existing pieces
          const existingPieces = startCellElement.querySelectorAll('.snake-piece');
          existingPieces.forEach(piece => piece.remove());
          
          // Add the tail piece
          const pieceConfig = this.determinePiece(0, selectedCells, false);
          const pieceImage = this.createPieceImage(pieceConfig);
          startCellElement.appendChild(pieceImage);
          startCellElement.classList.add(`has-${pieceConfig.piece}`);
        }
      }
    }
    
    // Fire a custom event that other components can listen for
    document.dispatchEvent(new CustomEvent('snakePathUpdated', { 
      detail: { pieceCount: selectedCells.length }
    }));
  }
  
  /**
   * Public method to force a snake path update
   * Can be called from other components
   */
  refreshSnakePath() {
    console.log('Manual refresh of snake path');
    this.updateSnakePath();
  }
}

// Export class for use in other modules
export default SnakePath;

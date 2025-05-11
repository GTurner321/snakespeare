/**
 * COMPLETE SNAKE PATH SOLUTION
 * 
 * This file provides a complete replacement for snakepath.js
 * It includes all necessary fixes and optimizations
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
    
    // Add critical CSS to ensure things work
    this.injectCriticalStyles();
    
    // Use direct raw GitHub URLs for images
    this.pieceImages = {
      tail: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiece.png',
      straight: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiece.png',
      curved: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiece.png',
      head: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiece.png'
    };
    
    // Verify images are accessible
    this.verifyImageUrls();
    
    // Direction mapping: maps [fromDir, toDir] to rotation and piece type
this.directionMappings = {
  // [fromDir, toDir]: { piece: 'straight|curved', rotation: degrees, flip: boolean }
  // Directions: 0 = top, 1 = right, 2 = bottom, 3 = left
  
  // Keep existing same-direction mappings
  '0,0': { piece: 'straight', rotation: 0, flip: false },
  '1,1': { piece: 'straight', rotation: 90, flip: false },
  '2,2': { piece: 'straight', rotation: 0, flip: false },
  '3,3': { piece: 'straight', rotation: 90, flip: false },
  
  // Straight pieces - opposite directions
  '0,2': { piece: 'straight', rotation: 0, flip: false },   // Top to bottom (vertical)
  '2,0': { piece: 'straight', rotation: 0, flip: false },   // Bottom to top (vertical)
  '1,3': { piece: 'straight', rotation: 90, flip: false },  // Right to left (horizontal)
  '3,1': { piece: 'straight', rotation: 90, flip: false },  // Left to right (horizontal)
  
  // Curved pieces - all 8 orientations
  '0,1': { piece: 'curved', rotation: 270, flip: false },  // Top to right ⎦
  '0,3': { piece: 'curved', rotation: 0, flip: false },    // Top to left ⎣
  
  '1,0': { piece: 'curved', rotation: 0, flip: true },     // Right to top ⎡ [FIXED]
  '1,2': { piece: 'curved', rotation: 90, flip: false },   // Right to bottom ⎩
  
  '2,1': { piece: 'curved', rotation: 0, flip: false },    // Bottom to right ⎦ [FIXED]
  '2,3': { piece: 'curved', rotation: 90, flip: true },    // Bottom to left ⎪ [FIXED]
  
  '3,0': { piece: 'curved', rotation: 180, flip: false },  // Left to top ⎤ [FIXED]
  '3,2': { piece: 'curved', rotation: 270, flip: false }   // Left to bottom ⎭
};
    
    // Make this instance available globally for direct access
    window.snakePath = this;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Flag initialization as complete
    this.initialized = true;
    console.log('SnakePath initialized with image URLs:', this.pieceImages);
    
    // Initial update after a short delay
    setTimeout(() => this.updateSnakePath(), 500);
  }
  
  /**
   * Inject critical CSS styles to ensure snake pieces appear correctly
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
      }
    `;
    
    // Add to document
    document.head.appendChild(style);
    console.log('Injected critical styles for snake pieces');
  }
  
  /**
   * Verify image URLs are accessible
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
    // Listen for cell selection changes directly
    if (this.gridRenderer) {
      // Hook into handleCellSelection
      if (this.gridRenderer.handleCellSelection) {
        const originalHandleCellSelection = this.gridRenderer.handleCellSelection;
        this.gridRenderer.handleCellSelection = (x, y, forceSelect) => {
          const result = originalHandleCellSelection.call(this.gridRenderer, x, y, forceSelect);
          console.log(`Cell selection handled (${x},${y}), result: ${result}`);
          
          // Update snake path after a short delay
          setTimeout(() => this.updateSnakePath(), 50);
          
          return result;
        };
        console.log('Hooked into GridRenderer.handleCellSelection');
      }
      
      // Also try to hook into handleSelectionChange if it exists
      if (this.gridRenderer.handleSelectionChange) {
        const originalHandleSelectionChange = this.gridRenderer.handleSelectionChange;
        this.gridRenderer.handleSelectionChange = (...args) => {
          const result = originalHandleSelectionChange.apply(this.gridRenderer, args);
          console.log('handleSelectionChange called, updating snake path');
          setTimeout(() => this.updateSnakePath(), 50);
          return result;
        };
        console.log('Hooked into GridRenderer.handleSelectionChange');
      }
    }
    
    // Listen for cell clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('grid-cell')) {
        console.log('Cell clicked, updating snake path');
        setTimeout(() => this.updateSnakePath(), 100);
      }
    });
    
    // Set a regular update interval (backup in case other methods fail)
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
      
      // Tail piece rotation
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
    
    // Look up the piece configuration from our direction mappings
    const key = `${fromDir},${toDir}`;
    if (this.directionMappings[key]) {
      return this.directionMappings[key];
    }
    
    // Default to straight piece if mapping not found
    console.warn(`No mapping found for direction combination ${key}`);
    return { piece: 'straight', rotation: 0, flip: false };
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
    
    // CRITICAL: Apply all styles as inline styles with high z-index
    // This is the most important part for visibility
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.zIndex = '500'; // CRITICAL: Much higher z-index
    img.style.pointerEvents = 'none';
    img.style.display = 'block';
    img.style.opacity = '1';
    
    // Apply the rotation and flip transformation
    img.style.transform = `rotate(${config.rotation}deg) ${config.flip ? 'scaleX(-1)' : ''}`;
    
    // Add a unique ID for debugging
    img.id = `snake-piece-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    return img;
  }
  
  /**
   * Update the full snake path visualization
   */
  updateSnakePath() {
    console.log('updateSnakePath called');
    
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
      // Find the corresponding DOM element directly by data attributes
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      
      if (!cellElement) {
        console.warn(`Cell element not found for selected cell at (${cell.x}, ${cell.y})`);
        return;
      }
      
      // Determine if this is the last cell
      const isLastCell = index === selectedCells.length - 1;
      
      // Get the configuration for this piece
      const pieceConfig = this.determinePiece(index, selectedCells, isLastCell);
      
      // CRITICAL: Force position relative
      cellElement.style.position = 'relative';
      
      // Create and add the image to the cell
      const pieceImage = this.createPieceImage(pieceConfig);
      cellElement.appendChild(pieceImage);
      
      // Log for debugging
      console.log(`Added ${pieceConfig.piece} piece to cell (${cell.x}, ${cell.y}), rotation: ${pieceConfig.rotation}°, flip: ${pieceConfig.flip}`);
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
          
          console.log(`Added ${pieceConfig.piece} piece to start cell (${startCell.x}, ${startCell.y})`);
        } else {
          console.log('Start cell already has selected-cell class');
        }
      } else {
        console.warn(`Start cell element not found for cell at (${startCell.x}, ${startCell.y})`);
      }
    }
    
    console.log(`Snake path update complete with ${selectedCells.length} pieces`);
  }
  
  /**
   * Public method to force a snake path update
   * Can be called from other components
   */
  refreshSnakePath() {
    console.log('Manual refresh of snake path');
    this.updateSnakePath();
  }
};

// Auto-initialize when the page loads
window.addEventListener('load', () => {
  // Check if we already have a snake path instance
  if (!window.snakePath && window.gameController && window.gameController.gridRenderer) {
    console.log('Auto-initializing snake path...');
    window.snakePath = new window.SnakePath(window.gameController.gridRenderer);
  }
});

// Export class for use in other modules
export default window.SnakePath;

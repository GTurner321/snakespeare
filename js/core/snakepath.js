/**
 * COMPLETE SNAKE PATH SOLUTION
 * 
 * This file provides a complete replacement for snakepath.js
 * It uses specific PNG files for each orientation instead of rotations
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
    
    // Use direct raw GitHub URLs for all specific orientation PNG files
    this.pieceImages = {
      tail: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiece.png',
      head: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiece.png',
      
      // Curved pieces with orientation in filename
      curved_bl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecebl.png', // bottom to left
      curved_br: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecebr.png', // bottom to right
      curved_lb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecelb.png', // left to bottom
      curved_lt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecelt.png', // left to top
      curved_tl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecetl.png', // top to left
      curved_tr: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecetr.png', // top to right
      curved_rt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecert.png', // right to top
      curved_rb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiecerb.png', // right to bottom
      
      // Straight pieces with orientation in filename
      straight_lr: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecelr.png', // left to right
      straight_rl: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecerl.png', // right to left
      straight_tb: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecetb.png', // top to bottom
      straight_bt: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiecebt.png'  // bottom to top
    };
    
    // Verify images are accessible
    this.verifyImageUrls();
    
    // Direction mapping: maps [fromDir, toDir] to the correct piece from user's perspective
    this.directionMappings = {
      // [fromDir, toDir]: { piece: 'specific_piece_name' }
      // Directions from snake perspective: 0 = top, 1 = right, 2 = bottom, 3 = left
      // But piece names are from user perspective
      
      // Same-direction mappings (snake continuing in same direction)
      '0,0': { piece: 'straight_bt' },  // Continuing up (appears as bottom-top to user)
      '1,1': { piece: 'straight_lr' },  // Continuing right (appears as left-right to user)
      '2,2': { piece: 'straight_tb' },  // Continuing down (appears as top-bottom to user)
      '3,3': { piece: 'straight_rl' },  // Continuing left (appears as right-left to user)
      
      // Straight pieces - opposite directions
      '0,2': { piece: 'straight_tb' },  // From top to bottom (appears as top-bottom)
      '2,0': { piece: 'straight_bt' },  // From bottom to top (appears as bottom-top)
      '1,3': { piece: 'straight_rl' },  // From right to left (appears as right-left)
      '3,1': { piece: 'straight_lr' },  // From left to right (appears as left-right)
      
      // Curved pieces - all 8 permutations
      // When snake changes direction, use the correct curve
      '0,1': { piece: 'curved_tr' },  // From top to right (from user view: top-right)
      '0,3': { piece: 'curved_tl' },  // From top to left (from user view: top-left)
      
      '1,0': { piece: 'curved_rt' },  // From right to top (from user view: right-top)
      '1,2': { piece: 'curved_rb' },  // From right to bottom (from user view: right-bottom)
      
      '2,1': { piece: 'curved_br' },  // From bottom to right (from user view: bottom-right)
      '2,3': { piece: 'curved_bl' },  // From bottom to left (from user view: bottom-left)
      
      '3,0': { piece: 'curved_lt' },  // From left to top (from user view: left-top)
      '3,2': { piece: 'curved_lb' }   // From left to bottom (from user view: left-bottom)
    };
    
    // Make this instance available globally for direct access
    window.snakePath = this;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Add debug button
    this.addDebugButton();
    
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
    // Check if either cell is undefined or null
    if (!fromCell || !toCell) {
      console.warn('getDirection called with undefined or null cell', { fromCell, toCell });
      return -1; // Return invalid direction
    }
    
    // Check if both cells have x and y properties
    if (typeof fromCell.y !== 'number' || typeof toCell.y !== 'number' ||
        typeof fromCell.x !== 'number' || typeof toCell.x !== 'number') {
      console.warn('getDirection called with invalid cell coordinates', { fromCell, toCell });
      return -1; // Return invalid direction
    }
    
    // Now safely determine direction
    if (fromCell.y > toCell.y) return 0; // Going up
    if (fromCell.x < toCell.x) return 1; // Going right
    if (fromCell.y < toCell.y) return 2; // Going down
    if (fromCell.x > toCell.x) return 3; // Going left
    
    // If we get here, it means the cells are at the same position or have invalid coordinates
    return -1; // Same position or invalid direction
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
      // If we only have one cell selected, default tail direction is down
      if (cells.length === 1) {
        return { piece: 'tail', rotation: 0, flip: false };
      }
      
      // Determine the direction from the tail to the next piece
      const fromCell = cells[0];
      const toCell = cells[1];
      const direction = this.getDirection(fromCell, toCell);
      
      // Tail piece rotation - keep original behavior for tail
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
      
      // Head piece rotation - keep original behavior for head
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
      // Now the mapping contains only the piece name with correct orientation
      // No need for rotation or flip
      return { 
        piece: this.directionMappings[key].piece,
        rotation: 0,
        flip: false
      };
    }
    
    // Default to straight piece if mapping not found
    console.warn(`No mapping found for direction combination ${key}`);
    return { piece: 'straight_tb', rotation: 0, flip: false };
  }
  
  /**
   * Helper function to log path segments for debugging
   */
  logPathSegment(index, cells, pieceConfig) {
    // Don't log for tail and head pieces
    if (pieceConfig.piece === 'tail' || pieceConfig.piece === 'head') {
      return;
    }
    
    // Get the previous and next cells
    const prevCell = cells[index - 1];
    const thisCell = cells[index];
    const nextCell = cells[index + 1];
    
    // Determine the directions
    const fromDir = this.getDirection(prevCell, thisCell);
    const toDir = this.getDirection(thisCell, nextCell);
    
    // Direction names for clearer logging
    const dirNames = ['top', 'right', 'bottom', 'left'];
    
    console.log(`Cell ${index}: ${dirNames[fromDir]} → ${dirNames[toDir]} = ${pieceConfig.piece}`);
  }
  
  /**
   * Create an image element for a snake piece with the correct configuration
   * @param {Object} config - Configuration for the piece
   * @return {HTMLElement} The created image element
   */
  createPieceImage(config) {
    const img = document.createElement('img');
    
    // Choose the correct image URL based on the piece
    if (config.piece === 'tail' || config.piece === 'head') {
      // For tail and head, use the original images with rotation/flip
      img.src = this.pieceImages[config.piece];
      img.className = `snake-piece snake-${config.piece}`;
      
      // Apply rotation and flip only for tail and head
      img.style.transform = `rotate(${config.rotation}deg) ${config.flip ? 'scaleX(-1)' : ''}`;
    } else {
      // For all other pieces, use the pre-oriented images (no rotation/flip needed)
      img.src = this.pieceImages[config.piece];
      img.className = `snake-piece ${config.piece}`;
      
      // No transform needed - images are pre-oriented
      img.style.transform = '';
    }
    
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
      
      // Log debug info
      this.logPathSegment(index, selectedCells, pieceConfig);
      
      // CRITICAL: Force position relative
      cellElement.style.position = 'relative';
      
      // Create and add the image to the cell
      const pieceImage = this.createPieceImage(pieceConfig);
      cellElement.appendChild(pieceImage);
      
      // Log for debugging
      console.log(`Added ${pieceConfig.piece} piece to cell (${cell.x}, ${cell.y})`);
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
   * Debug tools to help identify direction issues
   */
  addDebugButton() {
    const existingButton = document.getElementById('debug-direction-button');
    if (existingButton) existingButton.remove();
    
    const button = document.createElement('button');
    button.id = 'debug-direction-button';
    button.textContent = 'Debug Directions';
    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    button.style.padding = '5px 10px';
    button.style.backgroundColor = '#e91e63';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => this.showDirectionDebug());
    
    document.body.appendChild(button);
  }
  
  showDirectionDebug() {
    // Remove any existing debug
    const existingDebug = document.getElementById('direction-debug');
    if (existingDebug) existingDebug.remove();
    
    // Create debug container
    const debug = document.createElement('div');
    debug.id = 'direction-debug';
    debug.style.position = 'fixed';
    debug.style.top = '10px';
    debug.style.left = '10px';
    debug.style.backgroundColor = 'rgba(0,0,0,0.85)';
    debug.style.color = 'white';
    debug.style.padding = '15px';
    debug.style.borderRadius = '5px';
    debug.style.zIndex = '9999';
    debug.style.maxWidth = '400px';
    debug.style.maxHeight = '80vh';
    debug.style.overflow = 'auto';
    debug.style.fontFamily = 'monospace';
    debug.style.fontSize = '12px';
    debug.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
    
    // Direction legend
    debug.innerHTML = `
      <h3 style="margin-top:0;color:#ff80ab;">Direction Legend</h3>
      <p>0 = top, 1 = right, 2 = bottom, 3 = left</p>
      <h3 style="color:#ff80ab;">Piece Mappings</h3>
      <pre style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">${JSON.stringify(this.directionMappings, null, 2)}</pre>
      <button id="close-debug" style="margin-top:10px;padding:5px 10px;background:#ff80ab;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>
    `;
    
    // Add to document
    document.body.appendChild(debug);
    
    // Set up close button
    document.getElementById('close-debug').addEventListener('click', () => {
      debug.remove();
    });
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

/**
 * Snake Path Visualizer for Grid Game
 * Replaces the default path visualization with snake pieces
 * Handles rotation and piece selection based on path direction
 * REVISED: Added improved debugging, direct image URLs, and testing functions
 */

class SnakePath {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
    // FIXED: Use direct raw URLs for images instead of blob URLs
    this.pieceImages = {
      tail: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiece.png',
      straight: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiece.png',
      curved: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiece.png',
      head: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiece.png'
    };
    
    // Verify images are accessible
    this.verifyImageUrls();
    
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
    
    // Add test button to page for debugging
    this.addTestButton();
    
    // Flag initialization as complete
    this.initialized = true;
    console.log('SnakePath initialized with image URLs:', this.pieceImages);
    
    // Initial update after a short delay
    setTimeout(() => this.updateSnakePath(), 500);
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
   * Add test button to page
   */
  addTestButton() {
    // Check if button already exists
    if (document.getElementById('snake-test-button')) return;
    
    const button = document.createElement('button');
    button.id = 'snake-test-button';
    button.textContent = 'Test Snake';
    button.style.position = 'absolute';
    button.style.top = '60px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    button.style.padding = '5px 10px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => {
      console.log('Test button clicked');
      this.testSnakePiece();
    });
    
    // Add to game container
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
  }
  
  /**
   * Test function to add a snake piece to a cell
   */
  testSnakePiece() {
    console.log('Testing snake piece rendering');
    
    // Clear existing pieces
    this.clearSnakeImages();
    
    // Try to get a selected cell, or any cell if none are selected
    let cell = document.querySelector('.grid-cell.selected-cell');
    if (!cell) {
      cell = document.querySelector('.grid-cell');
      if (!cell) {
        console.error('No grid cells found for test');
        return;
      }
    }
    
    // Log cell information
    console.log('Test cell:', cell);
    console.log('Position style:', cell.style.position);
    console.log('Computed position:', window.getComputedStyle(cell).position);
    
    // Force position relative
    cell.style.position = 'relative';
    
    // Create a test image for each piece type
    const pieceTypes = ['tail', 'straight', 'curved', 'head'];
    const piece = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    
    const img = document.createElement('img');
    img.src = this.pieceImages[piece];
    img.className = `snake-piece snake-${piece} test-piece`;
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.zIndex = '150';
    img.style.pointerEvents = 'none';
    
    // Add a border for visibility
    img.style.border = '2px solid red';
    
    // Add it to the cell
    cell.appendChild(img);
    console.log(`Test ${piece} piece added to:`, cell);
    
    // Inject CSS to ensure visibility
    this.injectDebugStyles();
  }
  
  /**
   * Inject debug styles to make snake pieces visible
   */
  injectDebugStyles() {
    // Remove existing style if it exists
    const existingStyle = document.getElementById('snake-debug-styles');
    if (existingStyle) existingStyle.remove();
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'snake-debug-styles';
    style.textContent = `
      .grid-cell { position: relative !important; }
      .test-piece {
        position: absolute !important;
        width: 100% !important;
        height: 100% !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 150 !important;
        pointer-events: none !important;
        opacity: 0.9 !important;
        background-color: rgba(255, 0, 0, 0.1) !important;
      }
    `;
    
    // Add to document
    document.head.appendChild(style);
  }
  
  /**
   * Set up event listeners for path changes
   */
  setupEventListeners() {
    // Listen for cell selection changes
    document.addEventListener('selectionsCleared', () => {
      console.log('selectionsCleared event received');
      this.updateSnakePath();
    });
    
    // Listen for direct clicks on cells to force updates
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('grid-cell')) {
        console.log('Cell clicked, updating snake path');
        setTimeout(() => this.updateSnakePath(), 100);
      }
    });
    
    // Critical event: listen for selection changes
    if (this.gridRenderer) {
      // Hijack the original handleSelectionChange method if it exists
      if (this.gridRenderer.handleSelectionChange) {
        const originalHandleSelectionChange = this.gridRenderer.handleSelectionChange;
        this.gridRenderer.handleSelectionChange = (...args) => {
          originalHandleSelectionChange.apply(this.gridRenderer, args);
          console.log('handleSelectionChange called, updating snake path');
          setTimeout(() => this.updateSnakePath(), 50);
        };
      }
      
      // Also try to hook into onSelectionChange if it exists
      if (this.gridRenderer.options && this.gridRenderer.options.onSelectionChange) {
        const originalOnSelectionChange = this.gridRenderer.options.onSelectionChange;
        this.gridRenderer.options.onSelectionChange = (...args) => {
          originalOnSelectionChange(...args);
          console.log('onSelectionChange called, updating snake path');
          setTimeout(() => this.updateSnakePath(), 50);
        };
      }
    }
    
    // Listen for grid completion
    document.addEventListener('gridCompletionChanged', (e) => {
      console.log('gridCompletionChanged event received:', e.detail);
      this.updateSnakePath();
    });
    
    // Listen for new path setup
    document.addEventListener('pathSet', () => {
      console.log('pathSet event received, clearing snake images');
      this.clearSnakeImages();
    });
    
    // Initialize path on grid rebuild
    document.addEventListener('gridRebuilt', () => {
      console.log('gridRebuilt event received');
      setTimeout(() => {
        this.updateSnakePath();
      }, 100);
    });
    
    // Listen for GridRenderer's handleCellSelection method
    if (this.gridRenderer && this.gridRenderer.handleCellSelection) {
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
 * UPDATED: Fixed orientation issues based on user feedback
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
    
    // FIXED: Head piece is now ALWAYS rotated 180 degrees as per user feedback
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
  
  // UPDATED MAPPINGS FOR CORRECT ORIENTATIONS
  // Direction mappings completely revised based on user feedback
  const directionMappings = {
    // [fromDir, toDir]: { piece: 'straight|curved', rotation: degrees, flip: boolean }
    // Directions: 0 = top, 1 = right, 2 = bottom, 3 = left
    
    // Straight pieces
    '0,2': { piece: 'straight', rotation: 0, flip: false },   // Going down (straight vertical)
    '2,0': { piece: 'straight', rotation: 0, flip: false },   // Going up (straight vertical)
    '1,3': { piece: 'straight', rotation: 90, flip: false },  // Going left (straight horizontal)
    '3,1': { piece: 'straight', rotation: 90, flip: false },  // Going right (straight horizontal)
    
    // Fixed: Left to right straight (was opposite way around)
    '3,3': { piece: 'straight', rotation: 90, flip: false },  // Moving horizontally left
    '1,1': { piece: 'straight', rotation: 90, flip: false },  // Moving horizontally right
    '0,0': { piece: 'straight', rotation: 0, flip: false },   // Moving vertically up
    '2,2': { piece: 'straight', rotation: 0, flip: false },   // Moving vertically down
    
    // Curved pieces - all fixed according to user feedback
    '0,1': { piece: 'curved', rotation: 270, flip: false },   // From top to right (down-right turn)
    '0,3': { piece: 'curved', rotation: 0, flip: false },     // From top to left (down-left turn)
    
    // Fixed: Right to up turn
    '1,0': { piece: 'curved', rotation: 0, flip: true },      // From right to top
    
    // Fixed: Bottom to right turn
    '2,1': { piece: 'curved', rotation: 180, flip: true },    // From bottom to right
    
    '2,3': { piece: 'curved', rotation: 180, flip: false },   // From bottom to left
    
    // Fixed: Left to up turn
    '3,0': { piece: 'curved', rotation: 90, flip: true },     // From left to top
    
    '3,2': { piece: 'curved', rotation: 90, flip: false },    // From left to bottom
    '1,2': { piece: 'curved', rotation: 270, flip: true }     // From right to bottom
  };
  
  // Look up the piece configuration from our direction mappings
  const key = `${fromDir},${toDir}`;
  if (directionMappings[key]) {
    return directionMappings[key];
  }
  
  // Default to straight piece if mapping not found
  console.warn(`No mapping found for direction combination ${key}`);
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
    
    // Apply all styles as inline styles for better visibility
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.zIndex = '50'; // Higher z-index for visibility
    img.style.pointerEvents = 'none'; // Allow clicks to pass through
    img.style.backgroundColor = 'transparent';
    
    // Set the rotation as a CSS custom property for hover effects
    const rotationValue = config.rotation;
    img.style.setProperty('--rotation', `${rotationValue}deg`);
    
    // Apply the rotation and flip transformation
    img.style.transform = `rotate(${config.rotation}deg) ${config.flip ? 'scaleX(-1)' : ''}`;
    
    // Add data attributes for better debugging and interactions
    img.dataset.pieceType = config.piece;
    img.dataset.rotation = config.rotation;
    img.dataset.flip = config.flip;
    
    // For debugging - add unique ID
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
    
    // Get all selected cell elements
    const cellElements = document.querySelectorAll('.grid-cell.selected-cell');
    console.log(`Found ${cellElements.length} cell elements with selected-cell class`);
    
    // For each selected cell, determine piece type and add image
    selectedCells.forEach((cell, index) => {
      // Find the corresponding DOM element
      const cellElement = Array.from(cellElements).find(el => {
        const x = parseInt(el.dataset.gridX, 10);
        const y = parseInt(el.dataset.gridY, 10);
        return x === cell.x && y === cell.y;
      });
      
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
          startCellElement.classList.add(`has-${pieceConfig.piece}`);
          
          console.log(`Added ${pieceConfig.piece} piece to start cell (${startCell.x}, ${startCell.y})`);
        } else {
          console.log('Start cell already has selected-cell class');
        }
      } else {
        console.warn(`Start cell element not found for cell at (${startCell.x}, ${startCell.y})`);
      }
    }
    
    console.log(`Snake path update complete with ${selectedCells.length} pieces`);
    
    // Fire a custom event that other components can listen for
    document.dispatchEvent(new CustomEvent('snakePathUpdated', { 
      detail: { 
        pieceCount: selectedCells.length,
        snakePath: this
      }
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

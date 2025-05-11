/**
 * IMPROVED SNAKE PATH SOLUTION WITH ENHANCED LOGGING
 * 
 * This file provides a replacement for snakepath.js with detailed logging
 * It uses specific PNG files for all orientations (head, tail, straight, curved)
 * 
 * Instructions:
 * 1. Save this as js/core/snakepath.js, replacing the existing file
 * 2. Clear your browser cache completely
 * 3. Reload the page and check the console for detailed piece selection logs
 */

// Make the class available globally first, then export it
window.SnakePath = class SnakePath {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
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
    
    // IMPROVED: Direction mapping with clear descriptions:
    // Format: [fromDir, toDir]: { piece: 'piece_name', description: 'human readable description' }
    this.directionMappings = {
      // Straight pieces
      '0,2': { piece: 'straight_tb', description: 'Straight top to bottom' },
      '2,0': { piece: 'straight_bt', description: 'Straight bottom to top' },
      '1,3': { piece: 'straight_rl', description: 'Straight right to left' },
      '3,1': { piece: 'straight_lr', description: 'Straight left to right' },
      
      // Curved pieces
      '0,1': { piece: 'curved_tr', description: 'Curved top to right' },
      '0,3': { piece: 'curved_tl', description: 'Curved top to left' },
      '1,0': { piece: 'curved_rt', description: 'Curved right to top' },
      '1,2': { piece: 'curved_rb', description: 'Curved right to bottom' },
      '2,1': { piece: 'curved_br', description: 'Curved bottom to right' },
      '2,3': { piece: 'curved_bl', description: 'Curved bottom to left' },
      '3,0': { piece: 'curved_lt', description: 'Curved left to top' },
      '3,2': { piece: 'curved_lb', description: 'Curved left to bottom' }
    };
    
    // IMPROVED: Head piece mappings with descriptions
    this.headMappings = {
      0: { piece: 'head_bt', description: 'Head bottom to top (coming from top)' },
      1: { piece: 'head_rl', description: 'Head right to left (coming from right)' },
      2: { piece: 'head_tb', description: 'Head top to bottom (coming from bottom)' },
      3: { piece: 'head_lr', description: 'Head left to right (coming from left)' }
    };
    
    // IMPROVED: Tail piece mappings with descriptions
    this.tailMappings = {
      0: { piece: 'tail_tb', description: 'Tail top to bottom (going to top)' },
      1: { piece: 'tail_lr', description: 'Tail left to right (going to right)' },
      2: { piece: 'tail_bt', description: 'Tail bottom to top (going to bottom)' },
      3: { piece: 'tail_rl', description: 'Tail right to left (going to left)' }
    };
    
    // Make this instance available globally for direct access
    window.snakePath = this;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Add debug button
    this.addDebugButton();
    
    // Flag initialization as complete
    this.initialized = true;
    console.log('🐍 SnakePath initialized with image URLs:', this.pieceImages);
    
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
    
    // Listen for deselection events
    document.addEventListener('selectionsCleared', () => {
      console.log('Selections cleared, updating snake path');
      setTimeout(() => this.updateSnakePath(), 100);
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
   * Get direction from one cell to another with enhanced logging
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
    
    // Now safely determine direction - FROM USER'S PERSPECTIVE
    let direction = -1;
    let directionName = 'unknown';
    
    if (fromCell.y > toCell.y) {
      direction = 0; // Going up (to top)
      directionName = 'top';
    } else if (fromCell.x < toCell.x) {
      direction = 1; // Going right
      directionName = 'right';
    } else if (fromCell.y < toCell.y) {
      direction = 2; // Going down (to bottom)
      directionName = 'bottom';
    } else if (fromCell.x > toCell.x) {
      direction = 3; // Going left
      directionName = 'left';
    }
    
    console.log(`Direction from (${fromCell.x},${fromCell.y}) to (${toCell.x},${toCell.y}): ${direction} (${directionName})`);
    return direction;
  }
  
  /**
   * Get the opposite of a direction
   * @param {number} direction - Direction index (0=top, 1=right, 2=bottom, 3=left)
   * @return {number} Opposite direction
   */
  getOppositeDirection(direction) {
    let opposite = -1;
    
    switch (direction) {
      case 0: opposite = 2; break; // top → bottom
      case 1: opposite = 3; break; // right → left
      case 2: opposite = 0; break; // bottom → top
      case 3: opposite = 1; break; // left → right
      default: opposite = -1; break; // Invalid direction
    }
    
    console.log(`Opposite direction of ${direction} (${this.directionNames[direction]}) is ${opposite} (${this.directionNames[opposite]})`);
    return opposite;
  }
  
  /**
   * Determine the piece type for a specific cell in the path with enhanced logging
   * @param {number} index - Index of the cell in the selected path
   * @param {Array} cells - Array of selected cell coordinates
   * @param {boolean} isLastCell - Whether this is the last cell in the path
   * @return {Object} Configuration for the piece
   */
  determinePiece(index, cells, isLastCell) {
    console.log(`\n🔍 DETERMINING PIECE FOR CELL ${index} at (${cells[index].x}, ${cells[index].y})`);
    console.log(`  Cell role: ${index === 0 ? 'TAIL' : (isLastCell ? 'HEAD' : 'MIDDLE')}`);
    
    // For the first cell (tail piece)
    if (index === 0) {
      // If we only have one cell selected, default to bottom-to-top tail
      if (cells.length === 1) {
        console.log(`  → Single cell selected, using default tail (bottom to top)`);
        return { piece: 'tail_bt', type: 'tail', description: 'Default tail (bottom to top)' };
      }
      
      // Determine the direction from the tail to the next piece
      const nextDirection = this.getDirection(cells[0], cells[1]);
      console.log(`  → Tail next direction: ${nextDirection} (${this.directionNames[nextDirection]})`);
      
      // Use tailMappings to get the correct tail piece based on next direction
      const tailMapping = this.tailMappings[nextDirection];
      if (tailMapping) {
        console.log(`  → Selected TAIL piece: ${tailMapping.piece} - ${tailMapping.description}`);
        return { piece: tailMapping.piece, type: 'tail', description: tailMapping.description };
      } else {
        console.warn(`  ⚠️ No tail mapping found for direction ${nextDirection}, using default`);
        return { piece: 'tail_bt', type: 'tail', description: 'Default tail (bottom to top)' };
      }
    }
    
    // For the last cell (head piece)
    if (isLastCell) {
      console.log(`  → This is the HEAD piece (last selected cell)`);
      
      // Get the direction from previous cell to this one
      const prevDirection = this.getDirection(cells[index - 1], cells[index]);
      console.log(`  → Coming from: ${prevDirection} (${this.directionNames[prevDirection]})`);
      
      // Use opposite direction for head piece since it needs to face the approach direction
      const oppositeDirection = this.getOppositeDirection(prevDirection);
      
      // Get the correct head piece from headMappings
      const headMapping = this.headMappings[oppositeDirection];
      if (headMapping) {
        console.log(`  → Selected HEAD piece: ${headMapping.piece} - ${headMapping.description}`);
        return { piece: headMapping.piece, type: 'head', description: headMapping.description };
      } else {
        console.warn(`  ⚠️ No head mapping found for direction ${oppositeDirection}, using default`);
        return { piece: 'head_tb', type: 'head', description: 'Default head (top to bottom)' };
      }
    }
    
    // For middle cells (non-head, non-tail), determine if it's a straight or curved piece
    console.log(`  → This is a MIDDLE piece (connects two segments)`);
    const prevCell = cells[index - 1];
    const thisCell = cells[index];
    const nextCell = cells[index + 1];
    
    // Get directions between cells
    const fromDirection = this.getDirection(prevCell, thisCell);
    const toDirection = this.getDirection(thisCell, nextCell);
    
    console.log(`  → From: ${fromDirection} (${this.directionNames[fromDirection]})`);
    console.log(`  → To: ${toDirection} (${this.directionNames[toDirection]})`);
    
    // Create key for direction mappings
    const key = `${fromDirection},${toDirection}`;
    console.log(`  → Direction key: ${key}`);
    
    // Look up the piece configuration from our direction mappings
    if (this.directionMappings[key]) {
      const mappingInfo = this.directionMappings[key];
      const pieceType = mappingInfo.piece.includes('curved') ? 'curved' : 'straight';
      
      console.log(`  → Selected ${pieceType.toUpperCase()} piece: ${mappingInfo.piece} - ${mappingInfo.description}`);
      console.log(`  → PREVIOUS cell is at (${prevCell.x}, ${prevCell.y})`);
      console.log(`  → CURRENT cell is at (${thisCell.x}, ${thisCell.y})`);
      console.log(`  → NEXT cell is at (${nextCell.x}, ${nextCell.y})`);
      
      return { 
        piece: mappingInfo.piece,
        type: pieceType,
        description: mappingInfo.description
      };
    }
    
    // Default to straight piece if mapping not found
    console.warn(`  ⚠️ No mapping found for direction combination ${key}, using default`);
    return { piece: 'straight_tb', type: 'straight', description: 'Default straight (top to bottom)' };
  }
  
  /**
   * Helper function to log path segments in a clearer format
   */
  logPathSegment(index, cells, pieceConfig) {
    // Skip processing for invalid cases
    if (!pieceConfig || !cells || index >= cells.length) return;
    
    const cellCoord = `(${cells[index].x}, ${cells[index].y})`;
    
    if (pieceConfig.type === 'tail') {
      console.log(`📌 Cell ${index} ${cellCoord}: TAIL - ${pieceConfig.piece} - ${pieceConfig.description || 'No description'}`);
      return;
    }
    
    if (pieceConfig.type === 'head') {
      console.log(`📌 Cell ${index} ${cellCoord}: HEAD - ${pieceConfig.piece} - ${pieceConfig.description || 'No description'}`);
      return;
    }
    
    // For middle pieces, get more details
    const prevCell = cells[index - 1];
    const thisCell = cells[index];
    const nextCell = cells[index + 1];
    
    // Determine the directions
    const fromDir = this.getDirection(prevCell, thisCell);
    const toDir = this.getDirection(thisCell, nextCell);
    
    // Direction names for clearer logging
    const dirFromName = this.directionNames[fromDir];
    const dirToName = this.directionNames[toDir];
    
    console.log(`📌 Cell ${index} ${cellCoord}: MIDDLE - ${pieceConfig.piece}`);
    console.log(`   From direction: ${fromDir} (${dirFromName}) → To direction: ${toDir} (${dirToName})`);
    console.log(`   Description: ${pieceConfig.description || 'No description'}`);
    console.log(`   Connecting: (${prevCell.x}, ${prevCell.y}) → (${thisCell.x}, ${thisCell.y}) → (${nextCell.x}, ${nextCell.y})`);
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
   * Update the full snake path visualization
   */
  updateSnakePath() {
    console.log('\n🐍 UPDATE SNAKE PATH CALLED');
    
    // Clear existing snake images
    this.clearSnakeImages();
    
    // Get selected cells
    const selectedCells = this.gridRenderer.selectedCells;
    if (!selectedCells || selectedCells.length === 0) {
      console.log('No selected cells, nothing to update');
      return;
    }
    
    console.log(`Updating snake path for ${selectedCells.length} selected cells`);
    
    // Log all selected cells for debugging
    console.log('Selected cells:');
    selectedCells.forEach((cell, i) => {
      console.log(`  ${i}: (${cell.x}, ${cell.y})`);
    });
    
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
      
      // Log path segment info
      this.logPathSegment(index, selectedCells, pieceConfig);
      
      // CRITICAL: Force position relative
      cellElement.style.position = 'relative';
      
      // Create and add the image to the cell
      const pieceImage = this.createPieceImage(pieceConfig);
      cellElement.appendChild(pieceImage);
      
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
    debug.style.maxWidth = '80%';
    debug.style.maxHeight = '80vh';
    debug.style.overflow = 'auto';
    debug.style.fontFamily = 'monospace';
    debug.style.fontSize = '12px';
    debug.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
    
    // Direction legend
    debug.innerHTML = `
      <h3 style="margin-top:0;color:#ff80ab;">Direction Legend</h3>
      <p>0 = top, 1 = right, 2 = bottom, 3 = left</p>
      
      <h3 style="color:#ff80ab;">Direction Mappings</h3>
      <pre style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">${JSON.stringify(this.directionMappings, null, 2)}</pre>
      
      <h3 style="color:#ff80ab;">Head Mappings</h3>
      <pre style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">${JSON.stringify(this.headMappings, null, 2)}</pre>
      
      <h3 style="color:#ff80ab;">Tail Mappings</h3>
      <pre style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">${JSON.stringify(this.tailMappings, null, 2)}</pre>
      
      <h3 style="color:#ff80ab;">Images Used</h3>
      <div id="images-debug" style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;"></div>
      
      <h3 style="color:#ff80ab;">Current Snake Pieces</h3>
      <div id="current-pieces-debug"></div>

      <button id="close-debug" style="margin-top:10px;padding:5px 10px;background:#ff80ab;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>
      
      <h3 style="color:#ff80ab;">Test All Pieces</h3>
      <button id="test-pieces-button" style="margin-top:10px;padding:5px 10px;background:#80cbc4;color:black;border:none;border-radius:4px;cursor:pointer;">Test All Piece Images</button>
    `;
    
    // Add to document
    document.body.appendChild(debug);
    
    // Set up close button
    document.getElementById('close-debug').addEventListener('click', () => {
      debug.remove();
    });
    
    // Set up test pieces button
    document.getElementById('test-pieces-button').addEventListener('click', () => {
      this.showAllPieceImages();
    });
    
    // Show all image URLs being used
    const imagesDebug = document.getElementById('images-debug');
    let imagesHtml = '<ul>';
    
    Object.entries(this.pieceImages).forEach(([key, url]) => {
      imagesHtml += `<li><strong>${key}:</strong> <small>${url}</small></li>`;
    });
    
    imagesHtml += '</ul>';
    imagesDebug.innerHTML = imagesHtml;
    
    // Show currently selected pieces
    const currentPiecesDiv = document.getElementById('current-pieces-debug');
    
    const selectedCells = this.gridRenderer.selectedCells;
    if (selectedCells && selectedCells.length > 0) {
      let piecesHtml = '<ul style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">';
      
      selectedCells.forEach((cell, index) => {
        const isLastCell = index === selectedCells.length - 1;
        const pieceConfig = this.determinePiece(index, selectedCells, isLastCell);
        
        // Find the actual DOM element and its current piece
        const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
        const currentPieceElement = cellElement ? cellElement.querySelector('.snake-piece') : null;
        const currentPieceName = currentPieceElement ? currentPieceElement.getAttribute('data-piece-type') : 'none';
        
        // Determine additional directional info based on position
        let directionInfo = '';
        
        if (index === 0) {
          directionInfo = selectedCells.length > 1 
            ? `Next cell: (${selectedCells[1].x}, ${selectedCells[1].y})`
            : 'No next cell';
        } else if (isLastCell) {
          directionInfo = `Previous cell: (${selectedCells[index-1].x}, ${selectedCells[index-1].y})`;
        } else {
          directionInfo = `Previous: (${selectedCells[index-1].x}, ${selectedCells[index-1].y}), Next: (${selectedCells[index+1].x}, ${selectedCells[index+1].y})`;
        }
        
        // Add cell info to HTML
        piecesHtml += `
          <li style="margin-bottom:15px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px;">
            <strong>Cell ${index} (${cell.x},${cell.y}):</strong> 
            <div style="margin-left:15px;">
              <div>Type: ${pieceConfig.type.toUpperCase()}</div>
              <div>Piece: <span style="color:#80cbc4">${pieceConfig.piece}</span></div>
              <div>Current DOM: <span style="color:#ff9e80">${currentPieceName}</span></div>
              <div>Description: ${pieceConfig.description || 'No description'}</div>
              <div style="font-size:11px; margin-top:5px;">${directionInfo}</div>
            </div>
          </li>
        `;
      });
      
      piecesHtml += '</ul>';
      currentPiecesDiv.innerHTML = piecesHtml;
    } else {
      currentPiecesDiv.innerHTML = '<p>No cells currently selected</p>';
    }
  }
  
  /**
   * Shows all piece images in a visual grid for testing
   */
  showAllPieceImages() {
    // Remove any existing display
    const existingDisplay = document.getElementById('piece-images-test');
    if (existingDisplay) existingDisplay.remove();
    
    // Create container
    const container = document.createElement('div');
    container.id = 'piece-images-test';
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.backgroundColor = 'rgba(0,0,0,0.9)';
    container.style.color = 'white';
    container.style.padding = '20px';
    container.style.borderRadius = '8px';
    container.style.zIndex = '10000';
    container.style.width = '80%';
    container.style.maxHeight = '90vh';
    container.style.overflow = 'auto';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'All Snake Piece Images';
    title.style.marginBottom = '20px';
    title.style.color = '#ff80ab';
    container.appendChild(title);
    
    // Create grid for images
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    grid.style.gap = '15px';
    grid.style.width = '100%';
    
    // Add each image to the grid
    Object.entries(this.pieceImages).forEach(([key, url]) => {
      const cell = document.createElement('div');
      cell.style.display = 'flex';
      cell.style.flexDirection = 'column';
      cell.style.alignItems = 'center';
      cell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      cell.style.padding = '10px';
      cell.style.borderRadius = '4px';
      
      // Create image
      const img = document.createElement('img');
      img.src = url;
      img.alt = key;
      img.style.width = '60px';
      img.style.height = '60px';
      img.style.marginBottom = '8px';
      img.style.backgroundColor = '#61E7A7'; // Green background like the cells
      img.style.padding = '5px';
      img.style.borderRadius = '4px';
      
      // Add label
      const label = document.createElement('div');
      label.textContent = key;
      label.style.fontSize = '12px';
      label.style.fontFamily = 'monospace';
      label.style.textAlign = 'center';
      
      cell.appendChild(img);
      cell.appendChild(label);
      grid.appendChild(cell);
    });
    
    container.appendChild(grid);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '20px';
    closeBtn.style.padding = '8px 15px';
    closeBtn.style.backgroundColor = '#ff80ab';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => container.remove());
    
    container.appendChild(closeBtn);
    
    // Add to document
    document.body.appendChild(container);
  }
  
  /**
   * Public method to force a snake path update
   * Can be called from other components
   */
  refreshSnakePath() {
    console.log('Manual refresh of snake path triggered');
    this.updateSnakePath();
  }
  
  /**
   * Test method to visualize a specific direction
   * @param {number} fromDir - From direction (0-3)
   * @param {number} toDir - To direction (0-3)
   */
  testDirection(fromDir, toDir) {
    const key = `${fromDir},${toDir}`;
    const mapping = this.directionMappings[key];
    
    if (!mapping) {
      console.warn(`No mapping found for direction combination ${key}`);
      return;
    }
    
    console.log(`Direction ${fromDir} to ${toDir} (${key}):`);
    console.log(`  Piece: ${mapping.piece}`);
    console.log(`  Description: ${mapping.description}`);
    
    // Show a visual preview
    alert(`Direction ${this.directionNames[fromDir]} to ${this.directionNames[toDir]} = ${mapping.piece}\nDescription: ${mapping.description}`);
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

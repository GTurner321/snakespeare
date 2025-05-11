/**
 * FINAL CORRECTED SNAKE PATH SOLUTION
 * 
 * This file provides a completely fixed replacement for snakepath.js
 * It correctly handles the piece orientation by focusing on each cell's entry and exit directions
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
      1: { piece: 'head_lr', description: 'Head facing right (coming from right)' },
      2: { piece: 'head_bt', description: 'Head facing bottom (coming from bottom)' },
      3: { piece: 'head_rl', description: 'Head facing left (coming from left)' }
    };
    
    // Tail piece mappings - direction indicates where the tail is going TO
    this.tailMappings = {
      0: { piece: 'tail_bt', description: 'Tail going to top (bottom to top)' },
      1: { piece: 'tail_lr', description: 'Tail going to right (left to right)' },
      2: { piece: 'tail_tb', description: 'Tail going to bottom (top to bottom)' },
      3: { piece: 'tail_rl', description: 'Tail going to left (right to left)' }
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
   * Get the relative direction from one cell to another
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
   * Determine the piece type for a specific cell in the path
   * @param {number} index - Index of the cell in the selected path
   * @param {Array} cells - Array of selected cell coordinates
   * @param {boolean} isLastCell - Whether this is the last cell in the path
   * @return {Object} Configuration for the piece
   */
  determinePiece(index, cells, isLastCell) {
    console.log(`\n🔍 DETERMINING PIECE FOR CELL ${index} at (${cells[index].x}, ${cells[index].y})`);
    
    // For the first cell (tail piece)
    if (index === 0) {
      // If we only have one cell selected, default to tail from bottom
      if (cells.length === 1) {
        console.log(`  → Single cell selected, using default tail (bottom to top)`);
        return { piece: 'tail_bt', type: 'tail', description: 'Default tail (bottom to top)' };
      }
      
      // For tail, we need to know the direction TO the next cell
      const exitDirection = this.getDirection(cells[0], cells[1]);
      console.log(`  → Tail exit direction: ${exitDirection} (${this.directionNames[exitDirection]})`);
      
      // Use tailMappings to get the correct piece (exits to direction)
      const tailMapping = this.tailMappings[exitDirection];
      if (tailMapping) {
        console.log(`  → Selected TAIL piece: ${tailMapping.piece} - ${tailMapping.description}`);
        return { 
          piece: tailMapping.piece, 
          type: 'tail', 
          description: tailMapping.description 
        };
      } else {
        console.warn(`  ⚠️ No tail mapping found for direction ${exitDirection}, using default`);
        return { piece: 'tail_bt', type: 'tail', description: 'Default tail (bottom to top)' };
      }
    }
    
    // For the last cell (head piece)
    if (isLastCell) {
      console.log(`  → This is the HEAD piece (last selected cell)`);
      
      // For head, we need to know the direction FROM the previous cell
      const prevDirection = this.getDirection(cells[index-1], cells[index]);
      
      // The entry direction is OPPOSITE of the previous cell's exit direction
      const entryDirection = this.getOppositeDirection(prevDirection);
      console.log(`  → From previous: ${prevDirection} (${this.directionNames[prevDirection]})`);
      console.log(`  → Head entry direction: ${entryDirection} (${this.directionNames[entryDirection]})`);
      
      // Use headMappings to get the correct piece (enters from direction)
      const headMapping = this.headMappings[entryDirection];
      if (headMapping) {
        console.log(`  → Selected HEAD piece: ${headMapping.piece} - ${headMapping.description}`);
        return { 
          piece: headMapping.piece, 
          type: 'head', 
          description: headMapping.description 
        };
      } else {
        console.warn(`  ⚠️ No head mapping found for direction ${entryDirection}, using default`);
        return { piece: 'head_tb', type: 'head', description: 'Default head (top to bottom)' };
      }
    }
    
    // For middle cells (non-head, non-tail)
    console.log(`  → This is a MIDDLE piece (connects two segments)`);
    
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
    
    console.log(`  → From previous: ${prevDirection} (${this.directionNames[prevDirection]})`);
    console.log(`  → Entry direction: ${entryDirection} (${this.directionNames[entryDirection]})`);
    console.log(`  → Exit direction: ${exitDirection} (${this.directionNames[exitDirection]})`);
    
    // Create key for direction mappings
    const key = `${entryDirection},${exitDirection}`;
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
    
    // If no mapping found, use a fallback based on alignment
    console.warn(`  ⚠️ No mapping found for direction combination ${key}`);
    
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
      
      <h3 style="color:#ff80ab;">Key Principle</h3>
      <p>Each piece is defined by its "entry" and "exit" points</p>
      <p>Example: "lr" means "enter from left, exit to right"</p>
      <p>Middle pieces: entry = OPPOSITE of previous direction</p>
      
      <h3 style="color:#ff80ab;">Direction Mappings</h3>
      <pre style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">${JSON.stringify(this.directionMappings, null, 2)}</pre>
      
      <h3 style="color:#ff80ab;">Head Mappings</h3>
      <pre style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">${JSON.stringify(this.headMappings, null, 2)}</pre>
      
      <h3 style="color:#ff80ab;">Tail Mappings</h3>
      <pre style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">${JSON.stringify(this.tailMappings, null, 2)}</pre>
      
      <h3 style="color:#ff80ab;">Current Path Analysis</h3>
      <div id="path-analysis"></div>
      
      <button id="close-debug" style="margin-top:10px;padding:5px 10px;background:#ff80ab;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>
    `;
    
    // Add to document
    document.body.appendChild(debug);
    
    // Set up close button
    document.getElementById('close-debug').addEventListener('click', () => {
      debug.remove();
    });
    
    // Show detailed path analysis
    const pathAnalysisDiv = document.getElementById('path-analysis');
    const selectedCells = this.gridRenderer.selectedCells;
    
    if (selectedCells && selectedCells.length > 0) {
      let analysisHtml = '<div style="background:rgba(255,255,255,0.1);padding:10px;border-radius:4px;overflow:auto;">';
      
      selectedCells.forEach((cell, index) => {
        const isLastCell = index === selectedCells.length - 1;
        const cellType = index === 0 ? 'TAIL' : (isLastCell ? 'HEAD' : 'MIDDLE');
        
        // Get cell's piece info
        const pieceConfig = this.determinePiece(index, selectedCells, isLastCell);
        
        // Add cell info
        analysisHtml += `
          <div style="margin-bottom:15px; padding:8px; border:1px solid rgba(255,255,255,0.2); border-radius:4px;">
            <div style="font-weight:bold; margin-bottom:5px;">Cell ${index} (${cell.x}, ${cell.y}) - ${cellType}</div>
            <div style="display:flex; flex-direction:column; gap:5px;">
              <div>Piece: <span style="color:#80cbc4">${pieceConfig.piece}</span></div>
              <div>Description: ${pieceConfig.description}</div>
          `;
        
        // Add specific details based on cell type
        if (index === 0) {
          // Tail piece
          if (selectedCells.length > 1) {
            const nextCell = selectedCells[1];
            const exitDir = this.getDirection(cell, nextCell);
            analysisHtml += `
              <div>Exit direction: ${exitDir} (${this.directionNames[exitDir]})</div>
              <div>Next cell: (${nextCell.x}, ${nextCell.y})</div>
            `;
          }
        } else if (isLastCell) {
          // Head piece
          const prevCell = selectedCells[index - 1];
          const prevDir = this.getDirection(prevCell, cell);
          const entryDir = this.getOppositeDirection(prevDir);
          analysisHtml += `
            <div>From previous: ${prevDir} (${this.directionNames[prevDir]})</div>
            <div>Entry direction: ${entryDir} (${this.directionNames[entryDir]})</div>
            <div>Previous cell: (${prevCell.x}, ${prevCell.y})</div>
          `;
        } else {
          // Middle piece
          const prevCell = selectedCells[index - 1];
          const nextCell = selectedCells[index + 1];
          const prevDir = this.getDirection(prevCell, cell);
          const nextDir = this.getDirection(cell, nextCell);
          const entryDir = this.getOppositeDirection(prevDir);
          
          analysisHtml += `
            <div>From previous: ${prevDir} (${this.directionNames[prevDir]})</div>
            <div>Entry direction: ${entryDir} (${this.directionNames[entryDir]})</div>
            <div>Exit direction: ${nextDir} (${this.directionNames[nextDir]})</div>
            <div>Previous cell: (${prevCell.x}, ${prevCell.y})</div>
            <div>Next cell: (${nextCell.x}, ${nextCell.y})</div>
            <div>Direction key: ${entryDir},${nextDir}</div>
          `;
        }
        
        analysisHtml += `
            </div>
          </div>
        `;
      });
      
      analysisHtml += '</div>';
      pathAnalysisDiv.innerHTML = analysisHtml;
    } else {
      pathAnalysisDiv.innerHTML = '<p>No cells currently selected</p>';
    }
  }
  
  /**
   * Public method to force a snake path update
   * Can be called from other components
   */
  refreshSnakePath() {
    console.log('Manual refresh of snake path triggered');
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

/**
 * Snake Path Visualizer for Grid Game
 * Renders snake pieces on selected cells
 * With critical fixes to ensure proper rendering
 */

// Make the class available globally first, then export it
window.SnakePath = class SnakePath {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    
    // Use direct raw URLs for images
    this.pieceImages = {
      tail: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/tailpiece.png',
      straight: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/straightpiece.png',
      curved: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/curvedpiece.png',
      head: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/headpiece.png'
    };
    
    // Store instance in window for global access
    window.snakePath = this;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Flag initialization as complete
    console.log('SnakePath initialized with image URLs:', this.pieceImages);
    
    // Initial update after a delay
    setTimeout(() => this.updateSnakePath(), 500);
  }
  
  setupEventListeners() {
    // Hook into GridRenderer's handleCellSelection method
    if (this.gridRenderer.handleCellSelection) {
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
    if (this.gridRenderer.handleSelectionChange) {
      const originalHandleSelectionChange = this.gridRenderer.handleSelectionChange;
      this.gridRenderer.handleSelectionChange = (...args) => {
        const result = originalHandleSelectionChange.apply(this.gridRenderer, args);
        
        // Update snake path after selection changes
        setTimeout(() => this.updateSnakePath(), 50);
        
        return result;
      };
      console.log('Hooked into GridRenderer.handleSelectionChange');
    }
    
    // Check for changes occasionally
    setInterval(() => {
      if (this.gridRenderer && this.gridRenderer.selectedCells && 
          this.gridRenderer.selectedCells.length > 0) {
        this.updateSnakePath();
      }
    }, 2000);
    
    console.log('SnakePath event listeners set up');
  }
  
  clearSnakeImages() {
    const snakeImages = document.querySelectorAll('.snake-piece');
    snakeImages.forEach(image => image.remove());
  }
  
  getDirection(fromCell, toCell) {
    if (fromCell.y > toCell.y) return 0; // Going up
    if (fromCell.x < toCell.x) return 1; // Going right
    if (fromCell.y < toCell.y) return 2; // Going down
    if (fromCell.x > toCell.x) return 3; // Going left
    return -1;
  }
  
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
    
    // Simple direction mapping for middle pieces
    if (fromDir === toDir || (fromDir % 2 === toDir % 2)) {
      // Same direction or both horizontal/vertical = straight piece
      return { 
        piece: 'straight',
        rotation: fromDir % 2 === 0 ? 0 : 90, // 0 for vertical, 90 for horizontal 
        flip: false
      };
    } else {
      // Different directions = curved piece
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
  
  createPieceImage(config) {
    const img = document.createElement('img');
    img.src = this.pieceImages[config.piece];
    img.className = `snake-piece snake-${config.piece}`;
    
    // CRITICAL: Apply all styles as inline styles with high z-index
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.zIndex = '500'; // CRITICAL: Much higher z-index for visibility
    img.style.pointerEvents = 'none';
    img.style.display = 'block'; // Ensure it's displayed
    img.style.opacity = '1';     // Full opacity
    
    // Apply the rotation and flip transformation
    img.style.transform = `rotate(${config.rotation}deg) ${config.flip ? 'scaleX(-1)' : ''}`;
    
    return img;
  }
  
  updateSnakePath() {
    // Clear existing snake images
    this.clearSnakeImages();
    
    // Get selected cells
    const selectedCells = this.gridRenderer.selectedCells;
    if (!selectedCells || selectedCells.length === 0) {
      return;
    }
    
    // For each selected cell, determine piece type and add image
    selectedCells.forEach((cell, index) => {
      // Find the corresponding DOM element
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      
      if (!cellElement) {
        return;
      }
      
      // CRITICAL: Force position relative
      cellElement.style.position = 'relative';
      
      // Determine if this is the last cell
      const isLastCell = index === selectedCells.length - 1;
      
      // Get the configuration for this piece
      const pieceConfig = this.determinePiece(index, selectedCells, isLastCell);
      
      // Create and add the image to the cell
      const pieceImage = this.createPieceImage(pieceConfig);
      cellElement.appendChild(pieceImage);
    });
    
    // Handle the special case for start cell (first cell) which might not have the selected-cell class
    if (selectedCells.length > 0) {
      const startCell = selectedCells[0];
      const startCellElement = document.querySelector(`.grid-cell[data-grid-x="${startCell.x}"][data-grid-y="${startCell.y}"]`);
      
      if (startCellElement) {
        if (!startCellElement.classList.contains('selected-cell')) {
          // CRITICAL: Force position relative
          startCellElement.style.position = 'relative';
          
          // Clear any existing pieces
          const existingPieces = startCellElement.querySelectorAll('.snake-piece');
          existingPieces.forEach(piece => piece.remove());
          
          // Add the tail piece
          const pieceConfig = this.determinePiece(0, selectedCells, false);
          const pieceImage = this.createPieceImage(pieceConfig);
          startCellElement.appendChild(pieceImage);
        }
      }
    }
  }
};

// Export class for use in other modules
export default window.SnakePath;

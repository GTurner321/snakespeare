/**
 * Grid Renderer for Grid Game
 * Renders the game grid with the path and random letters
 */

class GridRenderer {
  constructor(containerId, options = {}) {
    // Container element
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }
    
    // Default options
    this.options = {
      gridWidth: options.gridWidth || 13,           // Changed from 8 to 13 for large screens
      gridHeight: options.gridHeight || 9,          // Changed from 10 to 9
      gridWidthSmall: options.gridWidthSmall || 9,  // NEW: Added for small screens
      gridHeightSmall: options.gridHeightSmall || 9,// NEW: Added for small screens
      cellSize: options.cellSize || 50,            // Cell size in pixels
      randomFillPercentage: options.randomFillPercentage || 0.5, // NEW: 50% random fill
      highlightPath: options.highlightPath || false, // Whether to highlight the path initially
      onCellClick: options.onCellClick || null,     // Cell click callback
      onSelectionChange: options.onSelectionChange || null,
      ...options
    };
    
    // Grid state
    this.fullGridSize = 51;              // NEW: 51x51 grid
    this.grid = [];                      // 2D array of cell data
    this.viewOffset = { x: 19, y: 21 };  // Updated for new initial view position
    this.path = [];                      // Current path data
    this.selectedCells = [];             // Array of selected cell coordinates {x, y}
    this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // For random letter generation
    
    // Initialize the grid
    this.initializeGrid();
    
    // Create DOM elements
    this.createGridElements();
    
    // Responsive handling
    this.handleResponsive();
    window.addEventListener('resize', () => this.handleResponsive());
  }
  
  /**
   * Initialize the grid data structure
   */
  initializeGrid() {
    // Create 51x51 grid
    this.grid = Array(this.fullGridSize).fill().map(() => 
      Array(this.fullGridSize).fill().map(() => ({
        letter: '',
        isPath: false,
        isStart: false,
        isSelected: false,
        pathIndex: -1
      }))
    );
    
    // Set center as start (changed to 25,25 for 51x51 grid)
    const centerX = 25;
    const centerY = 25;
    this.grid[centerY][centerX] = {
      letter: '',
      isPath: true,
      isStart: true, 
      isSelected: false,
      pathIndex: 0
    };
  }
  
  /**
   * Create DOM elements for the grid
   */
createGridElements() {
  // Clear container
  this.container.innerHTML = '';
  
  // Ensure container has proper dimensions
  this.container.style.width = '100%';
  this.container.style.minHeight = '450px';
  this.container.style.position = 'relative';
  this.container.style.display = 'flex';
  this.container.style.justifyContent = 'center';
  this.container.style.alignItems = 'center';
  
  // Create grid container
  this.gridElement = document.createElement('div');
  this.gridElement.className = 'grid-container';
  
  // Force grid display
  this.gridElement.style.display = 'grid';
  this.gridElement.style.gap = '2px';
  
  // Update grid template based on screen size
  this.updateGridTemplate();
  
  // Create cells
  this.renderVisibleGrid();
  
  // Add grid to container
  this.container.appendChild(this.gridElement);
}
  
  /**
   * Update grid template based on screen size
   */
updateGridTemplate() {
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
  const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
  
  // Force reset the grid display
  this.gridElement.style.display = 'grid';
  
  // Set explicit grid template columns and rows
  this.gridElement.style.gridTemplateColumns = `repeat(${width}, ${this.options.cellSize}px)`;
  this.gridElement.style.gridTemplateRows = `repeat(${height}, ${this.options.cellSize}px)`;
  
  // Set explicit dimensions including gaps
  const totalWidth = width * this.options.cellSize + (width - 1) * 2; // 2px gap
  const totalHeight = height * this.options.cellSize + (height - 1) * 2; // 2px gap
  
  this.gridElement.style.width = `${totalWidth}px`;
  this.gridElement.style.height = `${totalHeight}px`;
  this.gridElement.style.maxWidth = '100%'; // Prevent overflow on small screens
  
  // Debug log to check values
  console.log('Grid template update:', {
    width,
    height,
    cellSize: this.options.cellSize,
    gridTemplateColumns: this.gridElement.style.gridTemplateColumns,
    gridTemplateRows: this.gridElement.style.gridTemplateRows,
    totalWidth,
    totalHeight
  });
}
  
  /**
   * Render the currently visible portion of the grid
   */
renderVisibleGrid() {
  // Clear grid element
  this.gridElement.innerHTML = '';
  
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
  const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
  
  // Calculate visible bounds
  const endX = this.viewOffset.x + width;
  const endY = this.viewOffset.y + height;
  
  // Debug log
  console.log('Rendering visible grid:', {
    viewOffset: this.viewOffset,
    width,
    height,
    endX,
    endY,
    gridLength: this.grid.length,
    gridWidth: this.grid[0]?.length
  });
  
  let cellCount = 0;
  
  // Render visible cells
  for (let y = this.viewOffset.y; y < endY; y++) {
    for (let x = this.viewOffset.x; x < endX; x++) {
      const cellElement = document.createElement('div');
      cellElement.className = 'grid-cell';
      
      // Force cell dimensions
      cellElement.style.width = `${this.options.cellSize}px`;
      cellElement.style.height = `${this.options.cellSize}px`;
      
      // Debug: Add visible border
      cellElement.style.border = '1px solid red';
      
      // If cell is within grid bounds
      if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
        const cell = this.grid[y][x];
        
        // Set cell content
        cellElement.textContent = cell.letter || '•'; // Use dot if no letter
        
        // Debug log
        console.log(`Cell at (${x},${y}):`, cell.letter, cell.isStart);
        
        // Store grid coordinates as data attributes for click handling
        cellElement.dataset.gridX = x;
        cellElement.dataset.gridY = y;
        
        // Apply styling
        if (cell.isStart) {
          cellElement.classList.add('start-cell');
          console.log('Start cell found at:', x, y);
        } else if (cell.isSelected) {
          cellElement.classList.add('selected-cell');
        } else if (cell.isPath && this.options.highlightPath) {
          cellElement.classList.add('path-cell');
        }
        
        // Add click event handler for cell selection
        cellElement.addEventListener('click', () => {
          this.toggleCellSelection(x, y);
          
          // Call the click handler if provided
          if (this.options.onCellClick) {
            this.options.onCellClick(x, y, cell);
          }
        });
      } else {
        // Out of bounds cell - display as empty
        cellElement.classList.add('out-of-bounds');
        cellElement.textContent = '×'; // Use × for out of bounds
        console.log(`Out of bounds cell at (${x},${y})`);
      }
      
      this.gridElement.appendChild(cellElement);
      cellCount++;
    }
  }
  
  console.log(`Created ${cellCount} cells`);
  console.log('Grid element children:', this.gridElement.children.length);
  console.log('Grid element computed style:', window.getComputedStyle(this.gridElement).display);
  
  // Force a reflow to ensure grid layout is applied
  this.gridElement.offsetHeight;
}
  
  /**
   * Toggle selection state of a cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  toggleCellSelection(x, y) {
    // Check if coordinates are within grid bounds
    if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
      const cell = this.grid[y][x];
      
      // If this is the start cell, don't toggle selection
      if (cell.isStart) {
        return;
      }
      
      // Toggle selection state
      cell.isSelected = !cell.isSelected;
      
      // Update selectedCells array
      if (cell.isSelected) {
        this.selectedCells.push({ x, y });
      } else {
        this.selectedCells = this.selectedCells.filter(pos => 
          !(pos.x === x && pos.y === y)
        );
      }
      
      // Re-render grid
      this.renderVisibleGrid();
      
      // Update arrow buttons if needed
      if (this.options.onSelectionChange) {
        this.options.onSelectionChange(this.selectedCells);
      }
    }
  }
  
  /**
   * Set a path on the grid
   * @param {Array} path - Array of {x, y, letter} objects
   */
  setPath(path) {
    this.path = path;
    this.selectedCells = [];
    
    // Reset all cells
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[0].length; x++) {
        this.grid[y][x].isPath = false;
        this.grid[y][x].isSelected = false;
        this.grid[y][x].pathIndex = -1;
        this.grid[y][x].letter = ''; // Clear all letters initially
      }
    }
    
    // Set start cell
    const centerX = 25;
    const centerY = 25;
    this.grid[centerY][centerX].isPath = true;
    this.grid[centerY][centerX].isStart = true;
    this.grid[centerY][centerX].pathIndex = 0;
    
    // Update cells with path data
    path.forEach((point, index) => {
      // Convert from coordinate system to grid indices
      const gridX = centerX + point.x;
      const gridY = centerY + point.y;
      
      // Check if within grid bounds
      if (gridY >= 0 && gridY < this.grid.length && gridX >= 0 && gridX < this.grid[0].length) {
        this.grid[gridY][gridX].letter = point.letter;
        this.grid[gridY][gridX].isPath = true;
        this.grid[gridY][gridX].pathIndex = index;
      }
    });
    
    // NEW: Fill random letters based on percentage
    this.fillRandomLetters();
    
    // Re-render grid
    this.renderVisibleGrid();
  }
  
  /**
   * Fill empty cells with random letters based on configured percentage
   */
  fillRandomLetters() {
    const totalCells = this.fullGridSize * this.fullGridSize;
    const pathCells = this.path.length + 1; // +1 for start cell
    const emptyCells = totalCells - pathCells;
    const randomFillCount = Math.floor(emptyCells * this.options.randomFillPercentage);
    
    let filled = 0;
    
    while (filled < randomFillCount) {
      const x = Math.floor(Math.random() * this.fullGridSize);
      const y = Math.floor(Math.random() * this.fullGridSize);
      
      if (!this.grid[y][x].isPath && this.grid[y][x].letter === '') {
        this.grid[y][x].letter = this.getRandomLetter();
        filled++;
      }
    }
  }
  
  /**
   * Scroll the grid in the given direction
   * @param {string} direction - 'up', 'down', 'left', or 'right'
   */
  scroll(direction) {
    // Calculate new offset based on direction
    let newOffsetX = this.viewOffset.x;
    let newOffsetY = this.viewOffset.y;
    
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
    const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
    
    switch (direction) {
      case 'up':
        newOffsetY = Math.max(0, this.viewOffset.y - 1);
        break;
      case 'down':
        newOffsetY = Math.min(
          this.fullGridSize - height,
          this.viewOffset.y + 1
        );
        break;
      case 'left':
        newOffsetX = Math.max(0, this.viewOffset.x - 1);
        break;
      case 'right':
        newOffsetX = Math.min(
          this.fullGridSize - width,
          this.viewOffset.x + 1
        );
        break;
    }
    
    // Update view offset
    this.viewOffset.x = newOffsetX;
    this.viewOffset.y = newOffsetY;
    this.renderVisibleGrid();
  }
  
  /**
   * Get letters from selected cells in order of selection
   * @return {Array} Array of letter objects with position and letter
   */
  getSelectedLetters() {
    const letters = [];
    
    // Start with the start cell (if it has a letter)
    const centerX = 25;
    const centerY = 25;
    const startCell = this.grid[centerY][centerX];
    
    if (startCell.letter) {
      letters.push({
        x: centerX,
        y: centerY,
        letter: startCell.letter
      });
    }
    
    // Add all selected cells
    this.selectedCells.forEach(pos => {
      const cell = this.grid[pos.y][pos.x];
      letters.push({
        x: pos.x,
        y: pos.y,
        letter: cell.letter
      });
    });
    
    return letters;
  }
  
  /**
   * Clear all selected cells
   */
  clearSelections() {
    // Reset selected state for all cells
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[0].length; x++) {
        this.grid[y][x].isSelected = false;
      }
    }
    
    // Clear selected cells array
    this.selectedCells = [];
    
    // Re-render grid
    this.renderVisibleGrid();
  }
  
  /**
   * Handle responsive layout changes
   */
  handleResponsive() {
    const isMobile = window.innerWidth < 768;
    
    // Update view offset for different screen sizes
    if (isMobile) {
      // Small screen: 9x9 starting at position 21,21
      this.viewOffset.x = 21;
      this.viewOffset.y = 21;
    } else {
      // Large screen: 13x9 starting at position 19,21
      this.viewOffset.x = 19;
      this.viewOffset.y = 21;
    }
    
    this.updateGridTemplate();
    this.renderVisibleGrid();
  }
  
  /**
   * Generate a random letter for empty cells
   * @return {string} Random uppercase letter
   */
  getRandomLetter() {
    return this.letters.charAt(Math.floor(Math.random() * this.letters.length));
  }
}

// Export class for use in other modules
export default GridRenderer;

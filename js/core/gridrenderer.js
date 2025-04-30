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
    
    // Default options - FIXED to ensure values are set
    this.options = {
      gridWidth: 13,              // Default for large screens
      gridHeight: 9,              // Default height
      gridWidthSmall: 9,          // Default for small screens
      gridHeightSmall: 9,         // Default for small screens
      cellSize: 50,               // Cell size in pixels
      randomFillPercentage: 0,    // 50% random fill - adapted to 0% temporary
      highlightPath: false,       // Whether to highlight the path initially
      onCellClick: null,          // Cell click callback
      onSelectionChange: null,
      ...options                  // Override with provided options
    };
    
    // Debug log to check options
    console.log('GridRenderer options:', this.options);
    
    // Grid state
    this.fullGridSize = 51;              // 51x51 grid
    this.grid = [];                      // 2D array of cell data
    this.viewOffset = { x: 19, y: 21 };  // Initial view position
    this.path = [];                      // Current path data
    this.selectedCells = [];             // Array of selected cell coordinates {x, y}
    this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // For random letter generation
    
    // New: Track last selected cell for adjacency check
    this.lastSelectedCell = null;
    // New: Track touch state for swiping
    this.touchState = {
      active: false,
      lastCellX: -1,
      lastCellY: -1
    };
    
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
    
    // REMOVED: The code that added 100 random letters for testing
    // This was causing random letters to appear even when randomFillPercentage is set to 0
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
    
    // Explicitly set grid display style
    this.gridElement.style.display = 'grid';
    this.gridElement.style.gap = '2px';
    
    // Update grid template based on screen size
    this.updateGridTemplate();
    
    // Create cells
    this.renderVisibleGrid();
    
    // Add grid to container
    this.container.appendChild(this.gridElement);
    
    // NEW: Add touch event listeners for swiping
    this.setupTouchEvents();
    
    // Force a reflow to make sure the grid is rendered
    void this.gridElement.offsetHeight;
    
    // Add debug info
    console.log('Grid element after appending:', this.gridElement);
    console.log('Container children:', this.container.children);
  }
  
  /**
   * NEW: Set up touch events for swiping
   */
  setupTouchEvents() {
    // Add touch events to the grid element
    this.gridElement.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.gridElement.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.gridElement.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    this.gridElement.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
  }
  
  /**
   * NEW: Handle touch start event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    // Prevent default to avoid page scrolling
    e.preventDefault();
    
    if (e.touches.length !== 1) return; // Only handle single touches
    
    const touch = e.touches[0];
    const cellElement = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (!cellElement || !cellElement.classList.contains('grid-cell')) return;
    
    // Get cell coordinates
    const x = parseInt(cellElement.dataset.gridX, 10);
    const y = parseInt(cellElement.dataset.gridY, 10);
    
    if (isNaN(x) || isNaN(y)) return;
    
    // If this is our first selection, make sure it's the start cell
    if (this.selectedCells.length === 0) {
      const cell = this.grid[y][x];
      if (!cell.isStart) {
        // Show a quick visual feedback that the first cell must be the start
        cellElement.classList.add('invalid-selection');
        setTimeout(() => {
          cellElement.classList.remove('invalid-selection');
        }, 300);
        return;
      }
    }
    
    // Set touch as active
    this.touchState.active = true;
    this.touchState.lastCellX = x;
    this.touchState.lastCellY = y;
    
    // Try to select this cell
    this.toggleCellSelection(x, y);
  }
  
  /**
   * NEW: Handle touch move event for swiping
   * @param {TouchEvent} e - Touch event
   */
  handleTouchMove(e) {
    // Only process if touch is active
    if (!this.touchState.active) return;
    
    // Prevent default to avoid page scrolling
    e.preventDefault();
    
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const cellElement = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (!cellElement || !cellElement.classList.contains('grid-cell')) return;
    
    // Get cell coordinates
    const x = parseInt(cellElement.dataset.gridX, 10);
    const y = parseInt(cellElement.dataset.gridY, 10);
    
    if (isNaN(x) || isNaN(y)) return;
    
    // Skip if we're still on the same cell
    if (x === this.touchState.lastCellX && y === this.touchState.lastCellY) return;
    
    // Update last cell position
    this.touchState.lastCellX = x;
    this.touchState.lastCellY = y;
    
    // Try to select this cell (adjacency will be checked in toggleCellSelection)
    this.toggleCellSelection(x, y);
  }
  
  /**
   * NEW: Handle touch end event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    // Reset touch state
    this.touchState.active = false;
    this.touchState.lastCellX = -1;
    this.touchState.lastCellY = -1;
    
    // Prevent default to be safe
    e.preventDefault();
  }
  
  /**
   * Update grid template based on screen size
   */
  updateGridTemplate() {
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
    const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
    
    // Set data attribute for CSS to use
    this.gridElement.dataset.gridSize = isMobile ? 'mobile' : 'desktop';
    
    // Set explicit grid template columns and rows
    this.gridElement.style.gridTemplateColumns = `repeat(${width}, ${this.options.cellSize}px)`;
    this.gridElement.style.gridTemplateRows = `repeat(${height}, ${this.options.cellSize}px)`;
    
    // Set explicit dimensions including gaps
    const totalWidth = width * this.options.cellSize + (width - 1) * 2; // 2px gap
    const totalHeight = height * this.options.cellSize + (height - 1) * 2; // 2px gap
    
    this.gridElement.style.width = `${totalWidth}px`;
    this.gridElement.style.height = `${totalHeight}px`;
    this.gridElement.style.maxWidth = '100%'; // Prevent overflow on small screens
    
    console.log('Updated grid template:', {
      width,
      height,
      isMobile,
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
    
    // Render visible cells - ENSURE LOOPS ARE RUNNING
    for (let y = this.viewOffset.y; y < endY && y < this.fullGridSize; y++) {
      for (let x = this.viewOffset.x; x < endX && x < this.fullGridSize; x++) {
        // Debug
        console.log(`Creating cell at (${x},${y})`);
        
        const cellElement = document.createElement('div');
        cellElement.className = 'grid-cell';
        
        // Ensure proper cell dimensions
        cellElement.style.width = `${this.options.cellSize}px`;
        cellElement.style.height = `${this.options.cellSize}px`;
        
        // Remove debug red border
        // cellElement.style.border = '1px solid red';
        
        // If cell is within grid bounds
        if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
          const cell = this.grid[y][x];
          
          // Set cell content - ensure it has something visible
          cellElement.textContent = cell.letter || '•'; // Use dot if no letter
          
          // Store grid coordinates as data attributes for click handling
          cellElement.dataset.gridX = x;
          cellElement.dataset.gridY = y;
          
          // Apply styling for different cell states
          if (cell.isStart) {
            cellElement.classList.add('start-cell');
            console.log('Start cell found at:', x, y);
          } else if (cell.isSelected) {
            cellElement.classList.add('selected-cell');
          } 
          
          // Path cells are now always marked, but only highlighted in purple if option is enabled
          if (cell.isPath) {
            cellElement.classList.add('path-cell');
            
            // Add highlight-enabled class only if path highlighting is turned on
            if (this.options.highlightPath) {
              cellElement.classList.add('highlight-enabled');
            }
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
        }
        
        // Add to grid
        this.gridElement.appendChild(cellElement);
        cellCount++;
        
        // Debug info for first few cells
        if (cellCount < 5) {
          console.log(`Added cell ${cellCount}:`, cellElement);
        }
      }
    }
    
    console.log(`Created ${cellCount} cells`);
    console.log('Grid element children:', this.gridElement.children.length);
  }
  
  /**
   * Check if two cells are adjacent
   * @param {number} x1 - First cell X coordinate
   * @param {number} y1 - First cell Y coordinate
   * @param {number} x2 - Second cell X coordinate
   * @param {number} y2 - Second cell Y coordinate
   * @return {boolean} True if cells are adjacent (horizontally or vertically)
   */
  areCellsAdjacent(x1, y1, x2, y2) {
    // Check if cells are horizontally adjacent
    const horizontallyAdjacent = (Math.abs(x1 - x2) === 1 && y1 === y2);
    // Check if cells are vertically adjacent
    const verticallyAdjacent = (Math.abs(y1 - y2) === 1 && x1 === x2);
    
    return horizontallyAdjacent || verticallyAdjacent;
  }
  
  /**
   * UPDATED: Toggle selection state of a cell with adjacency enforcement
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  toggleCellSelection(x, y) {
    // Check if coordinates are within grid bounds
    if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
      const cell = this.grid[y][x];
      
      // If this cell is already selected, deselect it only if it's the last one selected
      if (cell.isSelected) {
        // Only allow deselecting the last selected cell
        if (this.selectedCells.length > 0) {
          const lastSelected = this.selectedCells[this.selectedCells.length - 1];
          if (lastSelected.x === x && lastSelected.y === y) {
            // Deselect this cell
            cell.isSelected = false;
            this.selectedCells.pop();
            
            // Update last selected cell reference
            if (this.selectedCells.length > 0) {
              const newLastSelected = this.selectedCells[this.selectedCells.length - 1];
              this.lastSelectedCell = { x: newLastSelected.x, y: newLastSelected.y };
            } else {
              this.lastSelectedCell = null;
            }
            
            // Re-render and notify
            this.renderVisibleGrid();
            if (this.options.onSelectionChange) {
              this.options.onSelectionChange(this.selectedCells);
            }
          }
        }
        return;
      }
      
      // If first selection, enforce it must be the start cell
      if (this.selectedCells.length === 0) {
        if (!cell.isStart) {
          console.log('First selection must be the start cell');
          return;
        }
      } 
      // For subsequent selections, check if it's adjacent to the last selected cell
      else if (this.lastSelectedCell) {
        if (!this.areCellsAdjacent(x, y, this.lastSelectedCell.x, this.lastSelectedCell.y)) {
          console.log('Selection must be adjacent to the last selected cell');
          return;
        }
      }
      
      // If we got here, we can select the cell
      cell.isSelected = true;
      this.selectedCells.push({ x, y });
      this.lastSelectedCell = { x, y };
      
      // Re-render grid
      this.renderVisibleGrid();
      
      // Notify of selection change
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
    this.lastSelectedCell = null; // Reset last selected cell
    
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
    
    // Fill random letters based on percentage
    this.fillRandomLetters();
    
    // Re-render grid
    this.renderVisibleGrid();
  }
  
  /**
   * NEW: Reset view position to center the grid on the start cell
   */
  centerGridOnStartCell() {
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
    const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
    
    // Calculate offset to center the start cell (which is at 25,25)
    this.viewOffset.x = 25 - Math.floor(width / 2);
    this.viewOffset.y = 25 - Math.floor(height / 2);
    
    // Ensure offset is within bounds
    this.viewOffset.x = Math.max(0, Math.min(this.fullGridSize - width, this.viewOffset.x));
    this.viewOffset.y = Math.max(0, Math.min(this.fullGridSize - height, this.viewOffset.y));
    
    console.log('Centered grid on start cell, new offset:', this.viewOffset);
    
    // Re-render the grid with the new offset
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
    this.lastSelectedCell = null; // Reset last selected cell
    
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

export default GridRenderer;

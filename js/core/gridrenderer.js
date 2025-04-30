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
      lastCellY: -1,
      isDragging: false,       // Track if we're in a swiping/dragging operation
      startCellSelected: false // Track if the start cell has been selected
    };
    // New: Flag to prevent double event handling (touch and click)
    this.recentlyHandledTouch = false;
    
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
    
    // Explicitly set grid display style
    this.gridElement.style.display = 'grid';
    this.gridElement.style.gap = '2px';
    
    // Update grid template based on screen size
    this.updateGridTemplate();
    
    // Create cells
    this.renderVisibleGrid();
    
    // Add grid to container
    this.container.appendChild(this.gridElement);
    
    // Add touch event listeners for swiping
    this.setupTouchEvents();
    
    // Force a reflow to make sure the grid is rendered
    void this.gridElement.offsetHeight;
    
    console.log('Grid element created:', this.gridElement);
  }
  
  /**
   * Set up touch events for swiping
   */
  setupTouchEvents() {
    console.log('Setting up touch events for grid');
    
    // Add touch events to the grid container itself
    this.gridElement.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.gridElement.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.gridElement.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    this.gridElement.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
    
    // Prevent click events from firing on touchend by adding this:
    this.gridElement.addEventListener('click', (e) => {
      if (this.recentlyHandledTouch) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { capture: true });
    
    console.log('Touch event listeners attached to grid container');
  }
  
  /**
   * Get grid cell from touch coordinates
   * @param {number} clientX - Touch X coordinate
   * @param {number} clientY - Touch Y coordinate
   * @return {Object|null} Object with cell info or null if no valid cell found
   */
  getCellFromTouchCoordinates(clientX, clientY) {
    // Get the element at the touch point
    const element = document.elementFromPoint(clientX, clientY);
    
    // Check if it's a grid cell
    if (!element || !element.classList.contains('grid-cell')) {
      return null;
    }
    
    // Get cell coordinates from data attributes
    const x = parseInt(element.dataset.gridX, 10);
    const y = parseInt(element.dataset.gridY, 10);
    
    // Validate coordinates
    if (isNaN(x) || isNaN(y)) {
      return null;
    }
    
    // Get the cell data
    const cell = this.grid[y][x];
    
    // Return cell info
    return { x, y, element, cell };
  }
  
  /**
   * Find and select the start cell
   * @return {boolean} True if start cell was found and selected
   */
  findAndSelectStartCell() {
    // The start cell is at 25,25
    const centerX = 25;
    const centerY = 25;
    
    // Check if it's within the visible area
    const isVisible = (
      centerX >= this.viewOffset.x && 
      centerX < this.viewOffset.x + this.options.gridWidth &&
      centerY >= this.viewOffset.y && 
      centerY < this.viewOffset.y + this.options.gridHeight
    );
    
    if (isVisible) {
      // If start cell is visible, select it
      this.handleCellSelection(centerX, centerY, true);
      console.log('Start cell was automatically selected');
      return true;
    }
    
    console.log('Start cell is not visible in current view');
    return false;
  }
  
  /**
   * Handle touch start event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    // Only handle single touches
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const cellInfo = this.getCellFromTouchCoordinates(touch.clientX, touch.clientY);
    
    // If no valid cell was touched, exit
    if (!cellInfo) return;
    
    // Prevent default behavior to avoid scrolling
    e.preventDefault();
    
    const { x, y, element, cell } = cellInfo;
    
    // Start tracking touch
    this.touchState = {
      active: true,
      lastCellX: x,
      lastCellY: y,
      // Start with isDragging as false and set true after movement
      isDragging: false,
      startTime: Date.now(),
      // Track initial cell position for drag detection
      startX: x,
      startY: y,
      startCellSelected: false
    };
    
    // Add visual indicator that the cell is being touched
    element.classList.add('touch-active');
    
    console.log(`Touch started on cell (${x}, ${y})`);
    
    // If this is the start cell and no cells are selected yet, select it immediately
    if (cell.isStart && this.selectedCells.length === 0) {
      this.handleCellSelection(x, y, true);
      this.touchState.startCellSelected = true;
      console.log('Start cell selected on touch start');
    } 
    // If we already have a start cell selected, try to continue from there
    else if (this.selectedCells.length > 0) {
      this.touchState.startCellSelected = true;
    }
  }
  
/**
 * Handle touch move event for swiping
 * @param {TouchEvent} e - Touch event
 */
handleTouchMove(e) {
  // Only process if touch is active
  if (!this.touchState.active) return;
  
  // Prevent default to avoid page scrolling
  e.preventDefault();
  
  // Get the current touch
  if (e.touches.length !== 1) return;
  
  const touch = e.touches[0];
  const cellInfo = this.getCellFromTouchCoordinates(touch.clientX, touch.clientY);
  
  // If no valid cell under touch point, exit
  if (!cellInfo) return;
  
  const { x, y, element, cell } = cellInfo;
  
  // Skip if we're still on the same cell
  if (x === this.touchState.lastCellX && y === this.touchState.lastCellY) return;
  
  console.log(`Touch moved to cell (${x}, ${y})`);
  
  // Determine if this is now a drag operation
  if (!this.touchState.isDragging) {
    this.touchState.isDragging = true;
  }
  
  // If no cells are selected yet, we need to handle the start case
  if (this.selectedCells.length === 0) {
    // If this cell is the start cell, select it
    if (cell.isStart) {
      this.handleCellSelection(x, y, true);
      this.touchState.startCellSelected = true;
    } else {
      // Try to find and select the start cell first
      const startSelected = this.findAndSelectStartCell();
      if (startSelected) {
        this.touchState.startCellSelected = true;
      } else {
        // Invalid - show feedback
        element.classList.add('invalid-selection');
        setTimeout(() => {
          element.classList.remove('invalid-selection');
        }, 300);
        console.log('Cannot select: must select start cell first');
        return;
      }
    }
  }
  
  // At this point we should have at least one cell selected
  if (this.selectedCells.length > 0) {
    // Get current last selected cell as the reference point
    const lastSelected = this.selectedCells[this.selectedCells.length - 1];
    
    // Check if cell is already selected
    if (cell.isSelected) {
      // Just update the last cell position for tracking
      this.touchState.lastCellX = x;
      this.touchState.lastCellY = y;
      return;
    }
    
    // IMPORTANT: Check if this is a valid cell to select (must be part of the path)
    if (!cell.isPath) {
      console.log('Cannot select non-path cell');
      // Show invalid feedback
      element.classList.add('invalid-selection');
      setTimeout(() => {
        element.classList.remove('invalid-selection');
      }, 300);
      return;
    }
    
    // Check if this cell is adjacent to the last selected cell
    if (this.areCellsAdjacent(x, y, lastSelected.x, lastSelected.y)) {
      // Valid next cell - select it
      this.handleCellSelection(x, y, false);
      
      // Update tracking for next cell in the swipe
      this.touchState.lastCellX = x;
      this.touchState.lastCellY = y;
    } 
    else {
      // Cell is not adjacent - show invalid feedback
      element.classList.add('invalid-selection');
      setTimeout(() => {
        element.classList.remove('invalid-selection');
      }, 300);
      console.log('Cell is not adjacent to last selected cell');
    }
  }
}
  
/**
 * Find and select a path from a starting cell to a target cell
 * @param {number} startX - Starting cell X coordinate
 * @param {number} startY - Starting cell Y coordinate
 * @param {number} targetX - Target cell X coordinate
 * @param {number} targetY - Target cell Y coordinate
 * @return {boolean} True if a path was found and selected
 */
findAndSelectPathToCell(startX, startY, targetX, targetY) {
  // Simple breadth-first search to find path
  const queue = [{ x: startX, y: startY, path: [] }];
  const visited = new Set();
  
  // Mark the start position as visited
  visited.add(`${startX},${startY}`);
  
  // Start BFS
  while (queue.length > 0) {
    const { x, y, path } = queue.shift();
    
    // Check all four adjacent positions
    const adjacentPositions = [
      { x: x + 1, y }, // right
      { x: x - 1, y }, // left
      { x, y: y + 1 }, // down
      { x, y: y - 1 }, // up
    ];
    
    for (const pos of adjacentPositions) {
      // Skip if out of bounds
      if (pos.y < 0 || pos.y >= this.grid.length || pos.x < 0 || pos.x >= this.grid[0].length) {
        continue;
      }
      
      // Skip if already visited
      const posKey = `${pos.x},${pos.y}`;
      if (visited.has(posKey)) {
        continue;
      }
      
      // Skip if cell is already selected
      if (this.grid[pos.y][pos.x].isSelected) {
        continue;
      }
      
      // Mark as visited
      visited.add(posKey);
      
      // Create new path with this position
      const newPath = [...path, { x: pos.x, y: pos.y }];
      
      // Check if we reached the target
      if (pos.x === targetX && pos.y === targetY) {
        // We found a path! Select all cells in the path
        for (const cell of newPath) {
          this.handleCellSelection(cell.x, cell.y, false);
        }
        return true;
      }
      
      // Add to queue to continue searching
      queue.push({ x: pos.x, y: pos.y, path: newPath });
    }
  }
  
  // No path found
  return false;
}
  
  /**
   * Handle touch end event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    // If touch wasn't active, nothing to do
    if (!this.touchState.active) return;
    
    e.preventDefault();
    
    // Flag that we just handled a touch to prevent double triggers with click
    this.recentlyHandledTouch = true;
    
    // If this was a tap (not a drag), handle as click
    if (!this.touchState.isDragging) {
      const x = this.touchState.lastCellX;
      const y = this.touchState.lastCellY;
      
      if (x >= 0 && y >= 0) {
        console.log(`Touch ended as tap on cell (${x}, ${y})`);
        // For taps, we always want to attempt selection
        this.handleCellSelection(x, y, false);
      }
    } else {
      console.log('Touch ended as drag/swipe');
    }
    
    // Remove the touch active class from all cells
    const cells = document.querySelectorAll('.grid-cell.touch-active');
    cells.forEach(cell => cell.classList.remove('touch-active'));
    
    // Reset touch state
    this.touchState = {
      active: false,
      lastCellX: -1,
      lastCellY: -1,
      isDragging: false,
      startCellSelected: false
    };
    
    // Clear the recently handled touch flag after a short delay
    setTimeout(() => {
      this.recentlyHandledTouch = false;
    }, 300);
  }
  
  /**
   * Unified cell selection handler for both click and touch
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {boolean} forceSelect - Force selection without adjacency check
   */
  handleCellSelection(x, y, forceSelect = false) {
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
      
      // First selection must be the start cell
      if (this.selectedCells.length === 0) {
        if (!cell.isStart) {
          console.log('First selection must be the start cell');
          // Find the element for this cell to show invalid selection
          const element = document.querySelector(`.grid-cell[data-grid-x="${x}"][data-grid-y="${y}"]`);
          if (element) {
            element.classList.add('invalid-selection');
            setTimeout(() => {
              element.classList.remove('invalid-selection');
            }, 300);
          }
          return;
        }
      } 
      // For subsequent selections, check adjacency (unless forceSelect is true)
      else if (this.lastSelectedCell && !forceSelect) {
        if (!this.areCellsAdjacent(x, y, this.lastSelectedCell.x, this.lastSelectedCell.y)) {
          console.log('Selection must be adjacent to the last selected cell');
          // Find the element for this cell to show invalid selection
          const element = document.querySelector(`.grid-cell[data-grid-x="${x}"][data-grid-y="${y}"]`);
          if (element) {
            element.classList.add('invalid-selection');
            setTimeout(() => {
              element.classList.remove('invalid-selection');
            }, 300);
          }
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
      endY
    });
    
    let cellCount = 0;
    
    // Render visible cells
    for (let y = this.viewOffset.y; y < endY && y < this.fullGridSize; y++) {
      for (let x = this.viewOffset.x; x < endX && x < this.fullGridSize; x++) {
        const cellElement = document.createElement('div');
        cellElement.className = 'grid-cell';
        
        // Ensure proper cell dimensions
        cellElement.style.width = `${this.options.cellSize}px`;
        cellElement.style.height = `${this.options.cellSize}px`;
        
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
          } 
          
          if (cell.isSelected) {
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
          cellElement.addEventListener('click', (e) => {
            // Skip if this is part of a touch sequence (prevent double triggering)
            if (this.recentlyHandledTouch) return;
            
            this.handleCellSelection(x, y, false);
            
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
      }
    }
    
    console.log(`Created ${cellCount} cells`);
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
   * Toggle selection state of a cell (legacy method, now calls handleCellSelection)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  toggleCellSelection(x, y) {
    // For backward compatibility, just redirect to the new method
    this.handleCellSelection(x, y, false);
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
   * Reset view position to center the grid on the start cell
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
    
    // Update grid template and size
    this.updateGridTemplate();
    
    // Center on the start cell after resizing
    this.centerGridOnStartCell();
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

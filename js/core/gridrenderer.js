/**
 * Grid Renderer for Grid Game
 * Renders the game grid with the path and random letters
 * Updated to work with new scroll areas instead of arrow buttons
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
    randomFillPercentage: 0,    // Percentage used differently now - controls adjacent filling
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
  this.randomLetters = [];             // Store generated random letters
  
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
  
  // Track the last render offset to avoid unnecessary rebuilds
  this._lastRenderOffset = null;
  
  // New: Add completed state
  this.isCompleted = false;  // Track if the phrase is completed
  
  // NEW: Add hint system properties
  this.hintLevel = 1;                             // Default hint level (0-3)
  this.revealedCells = [];                        // Array to track revealed cell coordinates
  this.hintLevelPercentages = [0, 0.15, 0.25, 0.35]; // Percentages for each level
  
  // Initialize the grid
  this.initializeGrid();
  
  // Create DOM elements
  this.createGridElements();
  
  // Set up responsive handling
  this.handleResponsive();
  
  // Add resize listener with proper binding to maintain 'this' context
  window.addEventListener('resize', this.handleResponsive.bind(this));
  
  // Dispatch event that initialization is complete
  document.dispatchEvent(new CustomEvent('gridRendererInitialized', { 
    detail: { gridRenderer: this }
  }));
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
    
    // Dispatch an event for grid creation (used by scroll areas)
    document.dispatchEvent(new CustomEvent('gridCreated', { 
      detail: { grid: this.gridElement, gridRenderer: this }
    }));
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
    
    // CRITICAL FIX: Add a global touch move handler to prevent page scrolling during swiping
    document.addEventListener('touchmove', (e) => {
      if (this.touchState && this.touchState.active) {
        e.preventDefault();
      }
    }, { passive: false });
    
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
   * Handle touch start event - with updated state tracking
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    // If the grid is completed, ignore touch events
    if (this.isCompleted) {
      e.preventDefault();
      return;
    }
    // Only handle single touches
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const cellInfo = this.getCellFromTouchCoordinates(touch.clientX, touch.clientY);
    
    // If no valid cell was touched, exit
    if (!cellInfo) return;
    
    // Prevent default behavior to avoid scrolling
    e.preventDefault();
    
    const { x, y, element, cell } = cellInfo;
    
    // Start tracking touch with more data for better tap detection
    this.touchState = {
      active: true,
      lastCellX: x,
      lastCellY: y,
      isDragging: false,
      startTime: Date.now(),
      startClientX: touch.clientX,
      startClientY: touch.clientY,
      startX: x,
      startY: y,
      startCellSelected: false,
      hasAddedCellsDuringDrag: false, // Track if we've added cells during this drag
      selectionIntent: null // Store the intended selection action
    };
    
    // Add visual indicator that the cell is being touched
    element.classList.add('touch-active');
    
    console.log(`Touch started on cell (${x}, ${y})`);
    
    // IMPORTANT: We DO NOT select the cell here, only prepare for potential selection
    // We'll set the selectionIntent to handle in touchEnd
    
    // Case 1: No selections yet - must be the start cell
    if (this.selectedCells.length === 0) {
      if (cell.isStart) {
        // Mark that we intend to select the start cell on touchEnd
        this.touchState.selectionIntent = 'select-start';
      } else {
        // Show invalid feedback - must select start cell first
        element.classList.add('invalid-selection');
        setTimeout(() => {
          element.classList.remove('invalid-selection');
        }, 300);
        console.log('Cannot select: must select start cell first');
        this.touchState.selectionIntent = null;
      }
      return;
    }
    
    // Case 2: We have selections already
    if (this.selectedCells.length > 0) {
      const lastSelected = this.selectedCells[this.selectedCells.length - 1];
      
      // Case 2a: This is the same cell as the last selected (potential deselection)
      if (x === lastSelected.x && y === lastSelected.y) {
        this.touchState.selectionIntent = 'deselect-last';
        console.log('Touch on already selected cell - potential deselection');
        return;
      }
      
      // Case 2b: Check if this is an adjacent unselected cell that's part of the path
      if (!cell.isSelected && cell.isPath && 
          this.areCellsAdjacent(x, y, lastSelected.x, lastSelected.y)) {
        // Mark that we intend to select this adjacent cell
        this.touchState.selectionIntent = 'select-adjacent';
        console.log('Touch on adjacent cell - potential selection');
        return;
      }
      
      // Case 2c: This is a non-adjacent or non-path cell
      console.log('Cell is not adjacent or not on path');
      element.classList.add('invalid-selection');
      setTimeout(() => {
        element.classList.remove('invalid-selection');
      }, 300);
      this.touchState.selectionIntent = null;
    }
  }
  
  /**
   * Handle touch move event for swiping - with support for auto-scrolling
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
    
    // Calculate movement distance to determine if this is a drag
    const moveX = Math.abs(touch.clientX - this.touchState.startClientX);
    const moveY = Math.abs(touch.clientY - this.touchState.startClientY);
    
    // Only consider it a drag if the movement is significant
    const dragThreshold = 10;
    const isDragging = moveX > dragThreshold || moveY > dragThreshold;
    
    // Update drag state - only set to true when threshold is exceeded
    if (isDragging && !this.touchState.isDragging) {
      this.touchState.isDragging = true;
      console.log('Touch identified as dragging/swiping');
      
      // If this was intended to be a start cell selection and we're now dragging,
      // go ahead and select the start cell
      if (this.touchState.selectionIntent === 'select-start' && 
          this.selectedCells.length === 0) {
        // Get the start cell coordinates (25,25)
        const startX = 25;
        const startY = 25;
        // Select the start cell
        this.handleCellSelection(startX, startY, false);
        console.log('Selected start cell for drag');
      }
      
      // IMPORTANT: If we're starting a drag from an adjacent unselected cell,
      // select that cell first to begin the swipe from there
      if (this.touchState.selectionIntent === 'select-adjacent' && 
          !this.isCellSelected(this.touchState.startX, this.touchState.startY)) {
        // Select the adjacent cell that was tapped to start the swipe
        this.handleCellSelection(this.touchState.startX, this.touchState.startY, false);
        console.log('Selected adjacent cell to begin swipe');
        this.touchState.hasAddedCellsDuringDrag = true;
      }
    }
    
    const cellInfo = this.getCellFromTouchCoordinates(touch.clientX, touch.clientY);
    
    // If no valid cell under touch point, exit
    if (!cellInfo) return;
    
    const { x, y, element, cell } = cellInfo;
    
    // Skip if we're on the same cell as last time
    if (x === this.touchState.lastCellX && y === this.touchState.lastCellY) {
      return;
    }
    
    // Update current touch position
    this.touchState.lastCellX = x;
    this.touchState.lastCellY = y;
    
    // Only proceed with cell selection logic if we're actually dragging
    if (!this.touchState.isDragging) {
      return;
    }
    
    // DESELECTION SUPPORT: Check if this is a reverse swipe for deselection
    if (this.selectedCells.length > 1) {
      // Check if we're on the second-to-last cell in the selection
      const secondLastIndex = this.selectedCells.length - 2;
      if (secondLastIndex >= 0) {
        const secondLastCell = this.selectedCells[secondLastIndex];
        if (x === secondLastCell.x && y === secondLastCell.y) {
          // This is a reverse swipe - deselect the last cell
          console.log('Deselection via reverse swipe detected');
          this.deselectLastCell();
          return;
        }
      }
    }
    
    // If no cells are selected yet, we need to handle the start case
    if (this.selectedCells.length === 0) {
      // If this cell is the start cell, select it
      if (cell.isStart) {
        this.handleCellSelection(x, y, false);
      } else {
        // Try to find and select the start cell first
        const startSelected = this.findAndSelectStartCell();
        if (startSelected) {
          // Start cell selected
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
      // Skip if cell is already selected
      if (cell.isSelected) return;
      
      // Check if this is a valid cell to select (must be part of the path)
      if (!cell.isPath) {
        console.log('Cannot select non-path cell');
        // Show invalid feedback
        element.classList.add('invalid-selection');
        setTimeout(() => {
          element.classList.remove('invalid-selection');
        }, 300);
        return;
      }
      
      // Get current last selected cell as the reference point
      const lastSelected = this.selectedCells[this.selectedCells.length - 1];
      
      // Check if this cell is adjacent to the last selected cell
      if (this.areCellsAdjacent(x, y, lastSelected.x, lastSelected.y)) {
        // Do NOT force selection during swipe - let the adjacency check work properly
        // The handleCellSelection method now includes auto-scrolling
        const selectionResult = this.handleCellSelection(x, y, false);
        
        // Track that we've added cells during this drag (for deselection logic)
        if (selectionResult) {
          this.touchState.hasAddedCellsDuringDrag = true;
        }
      } else {
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
   * Handle touch end event - with improved selection handling
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    // If touch wasn't active, nothing to do
    if (!this.touchState.active) return;
    
    e.preventDefault();
    
    const currentTime = Date.now();
    const touchDuration = currentTime - this.touchState.startTime;
    
    const x = this.touchState.lastCellX;
    const y = this.touchState.lastCellY;
    const startX = this.touchState.startX;
    const startY = this.touchState.startY;
    
    // Determine if this was a tap (not a drag and short duration)
    const MAX_TAP_DURATION = 300; // milliseconds
    const isTap = (touchDuration < MAX_TAP_DURATION) && 
                (!this.touchState.isDragging || (x === startX && y === startY));
    
    if (isTap) {
      console.log(`Touch ended as tap on cell (${x}, ${y})`);
      
      // Execute the selection intent that was determined in touchStart
      if (this.touchState.selectionIntent === 'select-start') {
        console.log('Selecting start cell');
        this.handleCellSelection(x, y, false); // Don't force selection - use normal adjacency checks
      } 
      else if (this.touchState.selectionIntent === 'deselect-last') {
        console.log('Deselecting last cell');
        this.deselectLastCell();
      }
      else if (this.touchState.selectionIntent === 'select-adjacent') {
        console.log('Selecting adjacent cell');
        this.handleCellSelection(x, y, false); // Don't force selection - use normal adjacency checks
      }
      
      // Set flag with a shorter timeout for taps
      this.recentlyHandledTouch = true;
      setTimeout(() => {
        this.recentlyHandledTouch = false;
      }, 100); // Shorter timeout for taps
    } else {
      // For drags, handle based on what happened during the drag
      if (this.touchState.hasAddedCellsDuringDrag) {
        console.log('Drag added cells - keeping selection');
      } else if (this.touchState.selectionIntent === 'deselect-last') {
        console.log('Drag on last selected cell - deselecting');
        this.deselectLastCell();
      }
      
      console.log('Touch ended as drag/swipe');
      
      // For drags, we use a slightly longer timeout to prevent accidental clicks
      this.recentlyHandledTouch = true;
      setTimeout(() => {
        this.recentlyHandledTouch = false;
      }, 300);
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
      startCellSelected: false,
      hasAddedCellsDuringDrag: false,
      selectionIntent: null
    };
  }

  /**
   * Check if the cell at coordinates is the last selected cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {boolean} True if this is the last selected cell
   */
  isLastSelectedCell(x, y) {
    if (this.selectedCells.length === 0) return false;
    
    const lastSelected = this.selectedCells[this.selectedCells.length - 1];
    return (lastSelected.x === x && lastSelected.y === y);
  }

  /**
   * Deselect the last cell in the selection
   */
  deselectLastCell() {
    // If the grid is completed, prevent deselection
    if (this.isCompleted) {
      console.log('Game is completed. No further deselection allowed.');
      return;
    }

    if (this.selectedCells.length === 0) return;
    
    const lastSelected = this.selectedCells[this.selectedCells.length - 1];
    const cell = this.grid[lastSelected.y][lastSelected.x];
    
    // Deselect this cell
    cell.isSelected = false;
    this.selectedCells.pop();
    
    // Update last selected cell reference
    if (this.selectedCells.length > 0) {
      const newLastSelected = this.selectedCells[this.selectedCells.length - 1];
      this.lastSelectedCell = { x: newLastSelected.x, y: newLastSelected.y };
      
      // NEW: Check if we need to auto-scroll after deselection
      // This could happen when we deselect a cell and the new last cell is close to an edge
      this.handleAutoScroll();
    } else {
      this.lastSelectedCell = null;
    }
    
    // Re-render and notify
    this.renderVisibleGrid();
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(this.selectedCells);
    }
  }
  
  /**
   * Helper function to check if a cell is already selected
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {boolean} True if the cell is selected
   */
  isCellSelected(x, y) {
    // Check if coordinates are valid
    if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) {
      return false;
    }
    
    // Return the cell's selected state
    return this.grid[y][x].isSelected;
  }

  /**
   * Unified cell selection handler for both click and touch - Updated with completion check
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {boolean} forceSelect - Force selection without adjacency check
   * @return {boolean} True if selection was successful
   */
  handleCellSelection(x, y, forceSelect = false) {
    // If the grid is completed, prevent any further selection
    if (this.isCompleted) {
      console.log('Game is completed. No further selection allowed.');
      return false;
    }
    // Check if coordinates are within grid bounds
    if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
      const cell = this.grid[y][x];
      
      // If this cell is already selected, deselect it only if it's the last one selected
      // AND we're not forcing selection (important for swipe/touch)
      if (cell.isSelected && !forceSelect) {
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
            return true;
          }
        }
        return false;
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
          return false;
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
          return false;
        }
      }
      
      // If we got here, we can select the cell
      cell.isSelected = true;
      this.selectedCells.push({ x, y });
      this.lastSelectedCell = { x, y };
      
      // NEW: Check if we need to auto-scroll after selecting a cell
      this.handleAutoScroll();
      
      // Re-render grid
      this.renderVisibleGrid();
      
      // Notify of selection change
      if (this.options.onSelectionChange) {
        this.options.onSelectionChange(this.selectedCells);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Apply random letters to the grid from the list of adjacent cells 
   * @param {Array} randomLetterCells - Array of {x, y, letter} objects to apply
   */
  applyAdjacentRandomLetters(randomLetterCells) {
    // Reset current random letters
    this.randomLetters = randomLetterCells;
    
    // Get the center point coordinates (25, 25)
    const centerX = 25;
    const centerY = 25;
    
    // Apply each random letter to the grid
    randomLetterCells.forEach(cell => {
      // Convert from coordinate system (centered at 0,0) to grid indices (centered at 25,25)
      const gridX = centerX + cell.x;
      const gridY = centerY + cell.y;
      
      // Check if within grid bounds
      if (gridY >= 0 && gridY < this.grid.length && gridX >= 0 && gridX < this.grid[0].length) {
        // Only apply if cell is not part of the path
        if (!this.grid[gridY][gridX].isPath) {
          this.grid[gridY][gridX].letter = cell.letter;
        }
      }
    });
    
    console.log(`Applied ${randomLetterCells.length} adjacent random letters to grid`);
  }

  /**
   * Handles automatic scrolling when the last selected cell is too close to an edge
   * Should be called after each successful cell selection
   * Now includes smooth animation at half speed
   */
  handleAutoScroll() {
    // Only proceed if we have selected cells
    if (!this.selectedCells.length) return;
    
    // Get the last selected cell
    const lastCell = this.selectedCells[this.selectedCells.length - 1];
    
    // Buffer size - how many cells we want to maintain between edge and selected cell
    const bufferSize = 4;
    
    // Minimum distance before scrolling is triggered
    const minDistance = 0;
    
    // Get current view dimensions
    const isMobile = window.innerWidth < 768;
    const viewWidth = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
    const viewHeight = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
    
    // Calculate distances to each edge
    const distToLeftEdge = lastCell.x - this.viewOffset.x;
    const distToRightEdge = (this.viewOffset.x + viewWidth - 1) - lastCell.x;
    const distToTopEdge = lastCell.y - this.viewOffset.y;
    const distToBottomEdge = (this.viewOffset.y + viewHeight - 1) - lastCell.y;
    
    // Track if we need to scroll
    let needsScroll = false;

// Calculate new offset positions
    let newOffsetX = this.viewOffset.x;
    let newOffsetY = this.viewOffset.y;
    
    // Check proximity to edges and calculate new offsets
    
    // Check left edge
    if (distToLeftEdge <= minDistance && this.viewOffset.x > 0) {
      newOffsetX = Math.max(0, lastCell.x - bufferSize);
      needsScroll = true;
    }
    
    // Check right edge
    if (distToRightEdge <= minDistance && this.viewOffset.x + viewWidth < this.fullGridSize) {
      newOffsetX = Math.min(
        this.fullGridSize - viewWidth,
        lastCell.x + bufferSize + 1 - viewWidth
      );
      needsScroll = true;
    }
    
    // Check top edge
    if (distToTopEdge <= minDistance && this.viewOffset.y > 0) {
      newOffsetY = Math.max(0, lastCell.y - bufferSize);
      needsScroll = true;
    }
    
    // Check bottom edge
    if (distToBottomEdge <= minDistance && this.viewOffset.y + viewHeight < this.fullGridSize) {
      newOffsetY = Math.min(
        this.fullGridSize - viewHeight,
        lastCell.y + bufferSize + 1 - viewHeight
      );
      needsScroll = true;
    }
    
    // If we need to scroll, apply CSS transition and update position
    if (needsScroll) {
      console.log('Auto-scrolling grid with slow animation due to cell proximity to edge');
      
      // Add the slow-scroll class to enable smooth animation
      if (this.gridElement) {
        // Remove any existing transition classes first
        this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
        
        // Add the slow animation class
        this.gridElement.classList.add('slow-scroll');
      }
      
      // Update the view offset
      this.viewOffset.x = newOffsetX;
      this.viewOffset.y = newOffsetY;
      
      // Force a full rebuild
      this._lastRenderOffset = null;
      
      // Re-render the grid
      this.renderVisibleGrid();
      
      // Notify about the scroll
      document.dispatchEvent(new CustomEvent('gridAutoScrolled', { 
        detail: { offset: this.viewOffset, lastCell, gridRenderer: this }
      }));
      
      // Remove the transition class after animation completes
      setTimeout(() => {
        if (this.gridElement) {
          this.gridElement.classList.remove('slow-scroll');
        }
      }, 450); // Slightly longer than transition to ensure it completes
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
    
    // Dispatch an event when grid size changes
    document.dispatchEvent(new CustomEvent('gridResized', { 
      detail: { width: totalWidth, height: totalHeight, gridRenderer: this }
    }));
  }

  /**
   * Render the currently visible portion of the grid - optimized for touch
   */
  renderVisibleGrid() {
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
    const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
    
    // Calculate visible bounds
    const endX = this.viewOffset.x + width;
    const endY = this.viewOffset.y + height;
    
    // Check if grid needs to be rebuilt (initial render or after scrolling)
    const needsRebuild = !this.gridElement.children.length || 
                         this._lastRenderOffset?.x !== this.viewOffset.x || 
                         this._lastRenderOffset?.y !== this.viewOffset.y;
    
    // Save current render offset
    this._lastRenderOffset = { ...this.viewOffset };
    
    // Full rebuild if needed
    if (needsRebuild) {
      console.log('Full grid rebuild');
      this.gridElement.innerHTML = '';
      let cellCount = 0;
      
      // Render visible cells
      for (let y = this.viewOffset.y; y < endY && y < this.fullGridSize; y++) {
        for (let x = this.viewOffset.x; x < endX && x < this.fullGridSize; x++) {
          const cellElement = this.createCellElement(x, y);
          this.gridElement.appendChild(cellElement);
          cellCount++;
        }
      }
      
      console.log(`Created ${cellCount} cells`);
      
      // Notify that grid was rebuilt
      document.dispatchEvent(new CustomEvent('gridRebuilt', { 
        detail: { gridElement: this.gridElement, gridRenderer: this }
      }));
    }
    // Otherwise just update cell states
    else {
      console.log('Updating cell states only');
      // Update all visible cells without rebuilding DOM
      const cells = this.gridElement.querySelectorAll('.grid-cell');
      cells.forEach(cellElement => {
        const x = parseInt(cellElement.dataset.gridX, 10);
        const y = parseInt(cellElement.dataset.gridY, 10);
        
        // Skip if invalid coordinates
        if (isNaN(x) || isNaN(y)) return;
        
        // Update cell classes based on current state
        this.updateCellElementClasses(cellElement, x, y);
      });
    }
    
    // Check if we need to update scroll limits
    this.checkScrollLimits();
  }
  
  /**
   * Check scroll limits and update UI accordingly
   * This is used by the ScrollAreaHandler to update scroll area states
   */
  checkScrollLimits() {
    // Dispatch event for scroll limits check
    document.dispatchEvent(new CustomEvent('scrollLimitsCheck', { 
      detail: { gridRenderer: this }
    }));
  }

/**
 * Reveal pathway letters based on the current hint level
 * This should be called after setPath() is complete
 */
revealPathLetters() {
  // Clear any previously revealed cells
  this.revealedCells = [];
  
  // If hint level is 0, no letters are revealed
  if (this.hintLevel === 0) {
    console.log('Hint level 0 - no letters revealed');
    // Make sure to clear any previously revealed letter markers
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[0].length; x++) {
        if (this.grid[y][x].isRevealed) {
          this.grid[y][x].isRevealed = false;
        }
      }
    }
    // Update the phrase display to reflect no revealed letters
    this.updatePhraseWithRevealedLetters();
    this.renderVisibleGrid();
    return;
  }
  
  // Get percentage based on hint level
  const percentage = this.hintLevelPercentages[this.hintLevel];
  
  // Calculate number of cells to reveal (round to nearest whole number)
  // IMPORTANT: Skip the start cell at index 0 when calculating
  const totalPathCells = this.path.length - 1; // Subtract 1 to exclude start cell
  const cellsToReveal = Math.round(totalPathCells * percentage);
  
  console.log(`Revealing ${cellsToReveal} cells (${percentage * 100}%) at hint level ${this.hintLevel}`);
  
  // Create array of path indices (skip start cell at index 0)
  const indices = Array.from({ length: totalPathCells }, (_, i) => i + 1);
  
  // Shuffle the indices
  const shuffledIndices = this.shuffleArray([...indices]);
  
  // Clear any previously revealed cells first
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[0].length; x++) {
      if (this.grid[y][x].isRevealed) {
        this.grid[y][x].isRevealed = false;
      }
    }
  }
  
  // For level 1, ensure revealed cells are not adjacent in the path
  if (this.hintLevel === 1) {
    const selectedIndices = [];
    const usedIndices = new Set();
    
    // Add indices that don't have adjacent neighbors already selected
    for (let i = 0; i < shuffledIndices.length && selectedIndices.length < cellsToReveal; i++) {
      const index = shuffledIndices[i];
      
      // Skip if this index is adjacent to an already selected index
      if (usedIndices.has(index - 1) || usedIndices.has(index + 1)) {
        continue;
      }
      
      selectedIndices.push(index);
      usedIndices.add(index);
      
      // Also mark adjacent indices as "used" to prevent them from being selected
      usedIndices.add(index - 1);
      usedIndices.add(index + 1);
    }
    
    // Sort indices to maintain path order
    selectedIndices.sort((a, b) => a - b);
    console.log('Level 1 - Selected indices:', selectedIndices);
    
    // Mark cells as revealed
    for (const index of selectedIndices) {
      const pathCell = this.path[index];
      const gridX = 25 + pathCell.x; // Convert from path coords to grid coords
      const gridY = 25 + pathCell.y;
      
      this.revealedCells.push({ x: gridX, y: gridY, pathIndex: index });
      this.grid[gridY][gridX].isRevealed = true;
    }
  } 
  // For levels 2 and 3, we need to maintain the level 1 non-adjacent cells,
  // then add additional random cells without the adjacency restriction
  else if (this.hintLevel === 2 || this.hintLevel === 3) {
    // First, get the level 1 percentage for non-adjacent cells
    const level1Percentage = this.hintLevelPercentages[1]; // 0.15 or 15%
    const level1CellCount = Math.round(totalPathCells * level1Percentage);
    
    // Calculate additional cells for current level
    const additionalCellCount = cellsToReveal - level1CellCount;
    
    // Step 1: Select level 1 cells (non-adjacent)
    const level1Indices = [];
    const usedIndices = new Set();
    
    // Add indices that don't have adjacent neighbors already selected
    for (let i = 0; i < shuffledIndices.length && level1Indices.length < level1CellCount; i++) {
      const index = shuffledIndices[i];
      
      // Skip if this index is adjacent to an already selected index
      if (usedIndices.has(index - 1) || usedIndices.has(index + 1)) {
        continue;
      }
      
      level1Indices.push(index);
      usedIndices.add(index);
      
      // Also mark adjacent indices as "used" to prevent them from being selected in level 1
      usedIndices.add(index - 1);
      usedIndices.add(index + 1);
    }
    
    console.log(`Level ${this.hintLevel} - Selected ${level1Indices.length} non-adjacent cells from level 1`);
    
    // Step 2: Select additional cells for current level (can be adjacent)
    const remainingIndices = shuffledIndices.filter(index => !level1Indices.includes(index));
    const additionalIndices = remainingIndices.slice(0, additionalCellCount);
    
    console.log(`Level ${this.hintLevel} - Selected ${additionalIndices.length} additional cells`);
    
    // Combine all indices
    const allSelectedIndices = [...level1Indices, ...additionalIndices];
    
    // Sort indices to maintain path order
    allSelectedIndices.sort((a, b) => a - b);
    
    // Mark cells as revealed
    for (const index of allSelectedIndices) {
      const pathCell = this.path[index];
      const gridX = 25 + pathCell.x; // Convert from path coords to grid coords
      const gridY = 25 + pathCell.y;
      
      this.revealedCells.push({ x: gridX, y: gridY, pathIndex: index });
      this.grid[gridY][gridX].isRevealed = true;
    }
  }
  
  console.log(`Total revealed cells: ${this.revealedCells.length}`);
  
  // Re-render grid to show revealed cells
  this.renderVisibleGrid();
  
  // Update the phrase display with revealed letters
  this.updatePhraseWithRevealedLetters();
}
  
/**
 * Helper method to shuffle an array using Fisher-Yates algorithm
 * If PathGenerator already has this method, you can skip adding it here
 * @param {Array} array - Array to shuffle
 * @return {Array} Shuffled array
 */
shuffleArray(array) {
  const newArray = [...array]; // Create a copy to avoid modifying the original
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Sets the hint level (0-3) and updates revealed cells
 * @param {number} level - Hint level (0-3)
 */
setHintLevel(level) {
  // Validate level
  if (level < 0 || level > 3) {
    console.error('Invalid hint level. Must be between 0 and 3.');
    return;
  }
  
  this.hintLevel = level;
  console.log(`Hint level set to ${level}`);
  
  // Reveal letters for the new hint level
  this.revealPathLetters();
}

/**
 * Get the letters from revealed cells for updating the phrase template
 * @return {Array} Array of {x, y, letter, pathIndex} objects for revealed cells
 */
getRevealedLetters() {
  const letters = [];
  
  // Add all revealed cells
  this.revealedCells.forEach(pos => {
    const cell = this.grid[pos.y][pos.x];
    if (cell.letter && cell.letter.trim() !== '') {
      letters.push({
        x: pos.x,
        y: pos.y,
        letter: cell.letter,
        pathIndex: pos.pathIndex
      });
    }
  });
  
  return letters;
}

/**
 * Update the phrase with revealed letters
 * This will be called from setPath and revealPathLetters
 */
updatePhraseWithRevealedLetters() {
  // Dispatch event with revealed letters
  document.dispatchEvent(new CustomEvent('revealedLettersUpdated', { 
    detail: { 
      revealedLetters: this.getRevealedLetters(),
      gridRenderer: this
    }
  }));
}  
  
  /**
   * Create a cell element with proper attributes and event handlers
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {HTMLElement} The created cell element
   */
  createCellElement(x, y) {
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
      
      // Update cell classes based on current state
      this.updateCellElementClasses(cellElement, x, y);
      
      // Add click event handler for cell selection
      cellElement.addEventListener('click', (e) => {
        // CRITICAL CHANGE: Only process clicks if not recently handled touch
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
    
    return cellElement;
  }
  
/**
 * Update cell element classes with proper precedence
 * @param {HTMLElement} cellElement - DOM element for the cell
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
updateCellElementClasses(cellElement, x, y) {
  // Clear existing state classes
  cellElement.classList.remove('start-cell', 'selected-cell', 'path-cell', 'highlight-enabled', 'completed-cell', 'revealed-cell');
  
  // If cell is within grid bounds
  if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
    const cell = this.grid[y][x];
    
    // Class application with proper precedence:
    
    // 1. Path cell class is applied first as a base state
    if (cell.isPath) {
      cellElement.classList.add('path-cell');
      
      // Add highlight-enabled class only if path highlighting is turned on
      if (this.options.highlightPath) {
        cellElement.classList.add('highlight-enabled');
      }
    }
    
    // 2. Revealed state - applied after path but before selection/completion
    if (cell.isRevealed) {
      cellElement.classList.add('revealed-cell');
    }
    
    // 3. Start cell, selected, and completed states have highest precedence
    if (cell.isCompleted) {
      cellElement.classList.add('completed-cell');
      return; // No need to check other states when completed
    }
    
    if (cell.isStart) {
      cellElement.classList.add('start-cell');
    } 
    else if (cell.isSelected) {
      cellElement.classList.add('selected-cell');
    }
  }
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
 * Set the path for the grid
 * @param {Array} path - Array of {x, y, letter} objects
 * @return {boolean} True if all path cells were successfully placed
 */
setPath(path) {
  this.path = path;
  this.selectedCells = [];
  this.lastSelectedCell = null; // Reset last selected cell
  
  // Reset the completed state
  this.isCompleted = false;
  
  // Reset all cells
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[0].length; x++) {
      this.grid[y][x].isPath = false;
      this.grid[y][x].isSelected = false;
      this.grid[y][x].pathIndex = -1;
      this.grid[y][x].letter = ''; // Clear all letters initially
      // Reset the completed state for each cell
      this.grid[y][x].isCompleted = false;
      // NEW: Reset the revealed state
      this.grid[y][x].isRevealed = false;
    }
  }
  
  // Set start cell
  const centerX = 25;
  const centerY = 25;
  this.grid[centerY][centerX].isPath = true;
  this.grid[centerY][centerX].isStart = true;
  this.grid[centerY][centerX].pathIndex = 0;
  
  // Track if all path cells were successfully placed
  let allCellsPlaced = true;
  
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
    } else {
      // Path point is outside grid bounds
      allCellsPlaced = false;
      console.warn(`Path cell at (${point.x}, ${point.y}) is outside grid bounds`);
    }
  });
  
  // Force a full rebuild of the grid
  this._lastRenderOffset = null;
  
  // Re-render grid
  this.renderVisibleGrid();
  
  // Notify that path has been set
  document.dispatchEvent(new CustomEvent('pathSet', { 
    detail: { 
      path: path, 
      gridRenderer: this,
      success: allCellsPlaced // Add success flag to the event
    }
  }));
  
  // After the path is set and random letters are applied, call revealPathLetters
  // Add this right before returning from the method:
  if (allCellsPlaced) {
    // Clear any previous revealed cells
    this.revealedCells = [];
    // Set new revealed cells based on hint level
    this.revealPathLetters();
  }
  
  // Return success flag so caller knows if generation succeeded
  return allCellsPlaced;
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
    
    // Force a full rebuild since the view position changed
    this._lastRenderOffset = null;
    
    // Re-render the grid with the new offset
    this.renderVisibleGrid();
    
    // Dispatch event for grid centering
    document.dispatchEvent(new CustomEvent('gridCentered', { 
      detail: { offset: this.viewOffset, gridRenderer: this }
    }));
  }
  
  /**
   * Scroll the grid in the given direction with variable speed
   * @param {string} direction - 'up', 'down', 'left', or 'right'
   * @param {boolean} slowMotion - Whether to use slow scrolling speed
   */
  scroll(direction, slowMotion = false) {
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
    
    // Apply CSS transition class based on speed
    if (this.gridElement) {
      // Remove any existing transition classes
      this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
      
      // Add the appropriate transition class
      this.gridElement.classList.add(slowMotion ? 'slow-scroll' : 'fast-scroll');
    }
    
    // Update view offset
    this.viewOffset.x = newOffsetX;
    this.viewOffset.y = newOffsetY;
    
    // Force a rebuild since we've scrolled
    this._lastRenderOffset = null;
    
    // Re-render grid
    this.renderVisibleGrid();
    
    // After transition is complete, remove the transition classes
    setTimeout(() => {
      if (this.gridElement) {
        this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
      }
    }, slowMotion ? 450 : 250); // Slightly longer than transition to ensure it completes
    
    // Dispatch event for scroll
    document.dispatchEvent(new CustomEvent('gridScrolled', { 
      detail: { direction, offset: this.viewOffset, gridRenderer: this, slowMotion }
    }));
  }
  
  getSelectedLetters() {
  const letters = [];
  
  // Add all selected cells (EXPLICITLY skipping the start cell)
  this.selectedCells.forEach(pos => {
    const cell = this.grid[pos.y][pos.x];
    
    // Skip the start cell at 25,25
    const isStartCell = (pos.x === 25 && pos.y === 25);
    if (isStartCell) {
      return; // Skip the start cell
    }
    
    // Only include if the cell has a letter
    if (cell.letter && cell.letter.trim() !== '') {
      letters.push({
        x: pos.x,
        y: pos.y,
        letter: cell.letter,
        pathIndex: cell.pathIndex
      });
    }
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
    
    // Dispatch event for selections cleared
    document.dispatchEvent(new CustomEvent('selectionsCleared', { 
      detail: { gridRenderer: this }
    }));
  }

  setCompleted(completed) {
    // Set the completion state first
    this.isCompleted = completed;
    
    if (completed) {
      // Convert all selected cells to completed state
      // Important: Include the start cell only if it has a letter
      const centerX = 25;
      const centerY = 25;
      
      // Mark the start cell as completed if it has a letter
      if (this.grid[centerY][centerX].letter && this.grid[centerY][centerX].letter.trim() !== '') {
        this.grid[centerY][centerX].isCompleted = true;
      }
      
      // Mark all selected cells as completed
      this.selectedCells.forEach(pos => {
        this.grid[pos.y][pos.x].isCompleted = true;
        // Keep the isSelected property true as well for visual consistency
        this.grid[pos.y][pos.x].isSelected = true;
      });
    } else {
      // Reset completion state for all cells
      for (let y = 0; y < this.grid.length; y++) {
        for (let x = 0; x < this.grid[0].length; x++) {
          this.grid[y][x].isCompleted = false;
        }
      }
    }
    
    // Re-render to show the updated state
    this.renderVisibleGrid();
    
    // Dispatch event for completion state change
    document.dispatchEvent(new CustomEvent('gridCompletionChanged', { 
      detail: { completed: this.isCompleted, gridRenderer: this }
    }));
  }
  
  /**
   * Handle responsive layout changes
   */
  handleResponsive() {
    const isMobile = window.innerWidth < 768;
    
    // Update grid template and size
    this.updateGridTemplate();
    
    // Force grid rebuild on resize
    this._lastRenderOffset = null;
    
    // Center on the start cell after resizing
    this.centerGridOnStartCell();
    
    // Dispatch event for responsive change
    document.dispatchEvent(new CustomEvent('gridResponsiveChange', { 
      detail: { isMobile, gridRenderer: this }
    }));
  }
}

export default GridRenderer;

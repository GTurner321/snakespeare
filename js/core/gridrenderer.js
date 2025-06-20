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
  this.fullGridSize = 71;              // 71x71 grid
  this.grid = [];                      // 2D array of cell data
  this.viewOffset = { x: 29, y: 31 };  // Initial view position
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

  this.level1HintIndices = [];  // Store level 1 hint indices (15%)
  this.level2HintIndices = [];  // Store level 2 hint indices (25%)
  this.level3HintIndices = [];  // Store level 3 hint indices (35%)

  // NEW: Add island reduction level properties
  this.islandReductionLevel = 0;                 // Default island reduction level (0-2)
  this.highestIslandReductionLevelUsed = 0;      // Track highest level used

  // Initialize the grid
  this.initializeGrid();

  // Set up event listeners
  this.setupEventListeners();
  
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
/**
 * Initialize the grid data structure
 */
initializeGrid() {
  // Create 71x71 grid
  this.grid = Array(this.fullGridSize).fill().map(() => 
    Array(this.fullGridSize).fill().map(() => ({
      letter: '',
      isPath: false,
      isStart: false,
      isSelected: false,
      pathIndex: -1,
      // NEW: Add sea icon properties to grid data model
      hasSeaIcon: undefined,
      seaIconData: null
    }))
  );
  
  // Set center as start (changed to 35,35 for 71x71 grid)
  const centerX = 35;
  const centerY = 35;
  this.grid[centerY][centerX] = {
    letter: '',
    isPath: true,
    isStart: true, 
    isSelected: false,
    pathIndex: 0,
    // NEW: Start cell never has sea icon
    hasSeaIcon: false,
    seaIconData: null
  };
}
  
/**
 * Set up event listeners for grid interaction and scrolling coordination
 */
setupEventListeners() {
  // Add this property for scroll state tracking
  this._isScrolling = false;
  
  // Listen for grid scroll complete events
  document.addEventListener('gridScrollComplete', () => {
    this._isScrolling = false;
    
    // Notify snake path that scrolling is complete
    if (window.snakePath) {
      window.snakePath._scrollInProgress = false;
    }
  });
  
  // Listen for grid scroll events
  document.addEventListener('gridScrolled', (e) => {
    // Mark as scrolling when programmatic scrolling happens
    this._isScrolling = true;
    
    // Notify snake path that scrolling is in progress
    if (window.snakePath) {
      window.snakePath._scrollInProgress = true;
    }
  });
  
  // Create a throttled version of the update function for performance
  let scrollUpdateTimeout;
  const throttledUpdateOnScroll = () => {
    if (scrollUpdateTimeout) {
      clearTimeout(scrollUpdateTimeout);
    }
    scrollUpdateTimeout = setTimeout(() => {
      // Only update if not in the middle of a programmatic scroll
      if (!this._isScrolling) {
        this.renderVisibleGrid();
      }
    }, 100);
  };
  
  // Listen for scroll events on the container (if grid is within a scrollable container)
  const scrollContainer = this.container.closest('.scroll-container');
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', throttledUpdateOnScroll);
  }
  
  // Handle window resize events
  window.addEventListener('resize', () => {
    // Don't update during scrolling
    if (!this._isScrolling) {
      this.handleResponsive();
    }
  });
  
  console.log('Grid event listeners set up with scroll optimization');
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
    const centerX = 35;
    const centerY = 35;
    
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
 * Modified handleTouchStart to allow selection of any cell with a letter
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
  
  // CRITICAL CHECK: Only allow cells with letters to be selected
  if (!cell.letter || cell.letter.trim() === '') {
    console.log('Cell has no letter, cannot select');
    element.classList.add('invalid-selection');
    setTimeout(() => {
      element.classList.remove('invalid-selection');
    }, 300);
    return;
  }
  
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
    
    // Case 2b: Check if this is an adjacent unselected cell with a letter
    // CHANGED: Removed cell.isPath check to allow any cell with a letter to be selected
    if (!cell.isSelected && 
        this.areCellsAdjacent(x, y, lastSelected.x, lastSelected.y)) {
      // Mark that we intend to select this adjacent cell
      this.touchState.selectionIntent = 'select-adjacent';
      console.log('Touch on adjacent cell - potential selection');
      return;
    }
    
    // Case 2c: This is a non-adjacent cell
    console.log('Cell is not adjacent');
    element.classList.add('invalid-selection');
    setTimeout(() => {
      element.classList.remove('invalid-selection');
    }, 300);
    this.touchState.selectionIntent = null;
  }
}
  
/**
 * Handle touch move event for swiping - Modified to use improved auto-scroll
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
      // Get the start cell coordinates
      const startX = 35;
      const startY = 35;
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
    
    // CRITICAL FIX: Check if this cell has a letter - only allow cells with letters
    if (!cell.letter || cell.letter.trim() === '') {
      console.log('Cell has no letter, cannot select');
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
      // The handleCellSelection method will use the improved auto-scroll function
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
  
  // CRITICAL FIX: Make sure to remove touch-active class from all cells
  const touchActiveCells = document.querySelectorAll('.grid-cell.touch-active');
  touchActiveCells.forEach(cell => cell.classList.remove('touch-active'));
  
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
 * Deselect the last cell in the selection and apply improved auto-scroll
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
    
    // Use improved auto-scroll after deselection
    // This is important when deselecting might bring the new last cell close to an edge
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
 * Unified cell selection handler for both click and touch - Modified to use improved auto-scroll
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {boolean} forceSelect - Force selection without adjacency check
 * @return {boolean} True if selection was successful
 */
/**
 * Modified handleCellSelection method for GridRenderer
 * Ensures that selection changes properly trigger phrase updates
 */
handleCellSelection(x, y, forceSelect = false) {
  // If the grid is completed, prevent any further selection
  if (this.isCompleted) {
    console.log('Game is completed. No further selection allowed.');
    return false;
  }
  
  // NEW: Check if this is the start cell being selected for the first time
  const centerX = 35;
  const centerY = 35;
  const isStartCell = (x === centerX && y === centerY);
  
  // If selecting the start cell and no cells are currently selected, stop flashing
  if (isStartCell && this.selectedCells.length === 0) {
    this.stopFlashingStartCell();
  }
  
  // Check if coordinates are within grid bounds
  if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
    const cell = this.grid[y][x];
    
    // CRITICAL FIX: Check if this cell has a letter (except for the start cell)
    const isStartCell = (x === 35 && y === 35);
    if (!isStartCell && (!cell.letter || cell.letter.trim() === '')) {
      console.log('Cell has no letter, cannot select');
      
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
          
          // Re-render and notify - CRITICAL: Ensure notification happens
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
    
    // Now we can select the cell
    cell.isSelected = true;
    this.selectedCells.push({ x, y });
    this.lastSelectedCell = { x, y };

    // Check if we need to auto-scroll after selecting a cell
    this.handleAutoScroll();
    
    // Re-render grid
    this.renderVisibleGrid();
    
    // CRITICAL: Notify of selection change immediately
    if (this.options.onSelectionChange) {
      console.log('Cell selected, notifying GameController');
      this.options.onSelectionChange(this.selectedCells);
    }
    
    return true;
  }
  
  return false;
}  
  
/**
 * Apply random letters to the grid
 * @param {Array} cells - Array of {x, y, letter} objects
 */
applyRandomLetters(cells) {
  // Reset any existing random cells first
  this.clearRandomLetters();
  
  // Store the provided random cells
  this.randomLetters = cells;
  
  // Get the center point coordinates (35, 35)
  const centerX = 35;
  const centerY = 35;
  
  // Apply each cell to the grid
  cells.forEach(cell => {
    // Convert from coordinate system (centered at 0,0) to grid indices (centered at 35,35)
    const gridX = centerX + cell.x;
    const gridY = centerY + cell.y;
    
    // Check if within grid bounds
    if (gridY >= 0 && gridY < this.grid.length && gridX >= 0 && gridX < this.grid[0].length) {
      // Apply letter (don't overwrite path cells if they have a letter)
      if (!this.grid[gridY][gridX].isPath || !this.grid[gridY][gridX].letter) {
        this.grid[gridY][gridX].letter = cell.letter;
        
        // NEW: Clear sea icon properties when adding letters
        // Cells with letters should not have sea icons
        if (this.grid[gridY][gridX].letter && this.grid[gridY][gridX].letter.trim() !== '') {
          this.grid[gridY][gridX].hasSeaIcon = false;
          this.grid[gridY][gridX].seaIconData = null;
        }
      }
    }
  });
  
  console.log(`Applied ${cells.length} random letter cells to grid`);
  
  // Trigger a grid rebuild
  this._lastRenderOffset = null;
  this.renderVisibleGrid();
  
  // Notify about the updated island appearance
  document.dispatchEvent(new CustomEvent('islandLettersUpdated', { 
    detail: { 
      letterCount: cells.length,
      gridRenderer: this 
    }
  }));
}
  
/**
 * Clear random letters from the grid
 * @return {number} Number of cells that were cleared
 */
clearRandomLetters() {
  // Keep track of how many cells were cleared
  let clearedCount = 0;
  
  // For each cell in the grid
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[0].length; x++) {
      // If this cell is not part of the path and has a letter, clear it
      if (!this.grid[y][x].isPath && this.grid[y][x].letter !== '') {
        this.grid[y][x].letter = '';
        clearedCount++;
        
        // NEW: Reset sea icon properties when clearing letters
        // These cells may now be eligible for sea icons again
        this.grid[y][x].hasSeaIcon = undefined;
        this.grid[y][x].seaIconData = null;
      }
    }
  }
  
  console.log(`Cleared ${clearedCount} random letters from grid`);
  return clearedCount;
}
  
/**
 * Manual fix for handleAutoScroll with direction-specific buffer thresholds
 */
handleAutoScroll() {
  // Only proceed if we have selected cells
  if (!this.selectedCells.length) return;
  
  // Get the last selected cell
  const lastCell = this.selectedCells[this.selectedCells.length - 1];
  
  // Direction-specific buffer thresholds
  const leftBufferThreshold = -1;   // Trigger at this buffer value for left edge
  const rightBufferThreshold = 1;   // Trigger at this buffer value for right edge
  const topBufferThreshold = -1;    // Trigger at this buffer value for top edge
  const bottomBufferThreshold = 1;  // Trigger at this buffer value for bottom edge
  
  // Scroll amount - how many cells to scroll when triggered
  const scrollAmount = 4;
  
  // Get current view dimensions
  const isMobile = window.innerWidth < 768;
  const viewWidth = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
  const viewHeight = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
  
  // Calculate edge positions
  const leftEdge = this.viewOffset.x;
  const rightEdge = this.viewOffset.x + viewWidth - 1; // -1 because it's 0-indexed
  const topEdge = this.viewOffset.y;
  const bottomEdge = this.viewOffset.y + viewHeight - 1; // -1 because it's 0-indexed
  
  // Calculate buffer distances
  const leftBuffer = lastCell.x - leftEdge;
  const rightBuffer = rightEdge - lastCell.x;
  const topBuffer = lastCell.y - topEdge;
  const bottomBuffer = bottomEdge - lastCell.y;
  
  // Debug logging for buffer values
  console.log('Auto-scroll buffer values:', {
    leftBuffer,
    rightBuffer,
    topBuffer,
    bottomBuffer,
    thresholds: {
      left: leftBufferThreshold,
      right: rightBufferThreshold,
      top: topBufferThreshold,
      bottom: bottomBufferThreshold
    },
    scrollAmount,
    lastCell: {x: lastCell.x, y: lastCell.y},
    edges: {leftEdge, rightEdge, topEdge, bottomEdge}
  });
  
  // Track if we need to scroll in any direction
  let needsHorizontalScroll = false;
  let needsVerticalScroll = false;
  
  // Calculate new offset positions (start with current)
  let newOffsetX = this.viewOffset.x;
  let newOffsetY = this.viewOffset.y;
  
  // Left edge check - use direction-specific threshold
  if (leftBuffer <= leftBufferThreshold) {
    // Scroll left by scrollAmount cells
    newOffsetX = Math.max(0, this.viewOffset.x - scrollAmount);
    needsHorizontalScroll = true;
    console.log(`At left edge (buffer=${leftBuffer} <= threshold=${leftBufferThreshold}). Scrolling left by ${scrollAmount} cells.`);
  }
  // Right edge check - use direction-specific threshold
  else if (rightBuffer <= rightBufferThreshold) {
    // Scroll right by scrollAmount cells
    newOffsetX = Math.min(
      this.fullGridSize - viewWidth,
      this.viewOffset.x + scrollAmount
    );
    needsHorizontalScroll = true;
    console.log(`At right edge (buffer=${rightBuffer} <= threshold=${rightBufferThreshold}). Scrolling right by ${scrollAmount} cells.`);
  }
  
  // Top edge check - use direction-specific threshold
  if (topBuffer <= topBufferThreshold) {
    // Scroll up by scrollAmount cells
    newOffsetY = Math.max(0, this.viewOffset.y - scrollAmount);
    needsVerticalScroll = true;
    console.log(`At top edge (buffer=${topBuffer} <= threshold=${topBufferThreshold}). Scrolling up by ${scrollAmount} cells.`);
  }
  // Bottom edge check - use direction-specific threshold 
  else if (bottomBuffer <= bottomBufferThreshold) {
    // Scroll down by scrollAmount cells
    newOffsetY = Math.min(
      this.fullGridSize - viewHeight,
      this.viewOffset.y + scrollAmount
    );
    needsVerticalScroll = true;
    console.log(`At bottom edge (buffer=${bottomBuffer} <= threshold=${bottomBufferThreshold}). Scrolling down by ${scrollAmount} cells.`);
  }
  
  // If we need to scroll in either direction, apply the combined scroll
  if (needsHorizontalScroll || needsVerticalScroll) {
    console.log('Auto-scrolling grid with combined scrolling:', {
      from: { x: this.viewOffset.x, y: this.viewOffset.y },
      to: { x: newOffsetX, y: newOffsetY },
      horizontal: needsHorizontalScroll,
      vertical: needsVerticalScroll
    });
    
    // Add the slow-scroll class to enable smooth animation
    if (this.gridElement) {
      // Remove any existing transition classes first
      this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
      
      // Add the slow animation class
      this.gridElement.classList.add('slow-scroll');
    }
    
    // Store old offsets for event reporting
    const oldOffsetX = this.viewOffset.x;
    const oldOffsetY = this.viewOffset.y;
    
    // Update the view offset for both axes at once
    this.viewOffset.x = newOffsetX;
    this.viewOffset.y = newOffsetY;
    
    // Force a full rebuild
    this._lastRenderOffset = null;
    
    // Re-render the grid
    this.renderVisibleGrid();
    
    // Notify about the scroll with both coordinates
    document.dispatchEvent(new CustomEvent('gridAutoScrolled', { 
      detail: { 
        offset: this.viewOffset, 
        lastCell, 
        gridRenderer: this,
        horizontalScroll: needsHorizontalScroll,
        verticalScroll: needsVerticalScroll,
        oldOffset: { x: oldOffsetX, y: oldOffsetY }
      }
    }));
    
    // Remove the transition class after animation completes
    setTimeout(() => {
      if (this.gridElement) {
        this.gridElement.classList.remove('slow-scroll');
      }
    }, 450); // Slightly longer than transition to ensure it completes
    
    return true; // Scrolling happened
  }
  
  return false; // No scrolling needed
}
  
/**
 * Add this method to your GridRenderer class to replace the existing updateGridTemplate method
 * This version calculates cell sizes dynamically for mobile to ensure all 9 cells fit
 */
updateGridTemplate() {
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
  const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
  
  // Set data attribute for CSS to use
  this.gridElement.dataset.gridSize = isMobile ? 'mobile' : 'desktop';
  
  if (isMobile) {
    // Mobile: Calculate cell size based on available screen width
    const availableWidth = Math.min(window.innerWidth - 40, 450); // Max 450px, min padding 40px
    const gapSize = width > 7 ? 1 : 2; // Smaller gaps for larger grids
    const totalGapWidth = (width - 1) * gapSize;
    const cellSize = Math.floor((availableWidth - totalGapWidth) / width);
    
    // Ensure minimum cell size
    const finalCellSize = Math.max(cellSize, 28);
    
    // Set CSS custom properties for mobile
    this.gridElement.style.setProperty('--mobile-cell-size', `${finalCellSize}px`);
    this.gridElement.style.setProperty('--mobile-gap-size', `${gapSize}px`);
    
    // Use CSS Grid with calculated sizes
    this.gridElement.style.gridTemplateColumns = `repeat(${width}, ${finalCellSize}px)`;
    this.gridElement.style.gridTemplateRows = `repeat(${height}, ${finalCellSize}px)`;
    this.gridElement.style.gap = `${gapSize}px`;
    
    // Set container dimensions
    const totalWidth = width * finalCellSize + (width - 1) * gapSize;
    const totalHeight = height * finalCellSize + (height - 1) * gapSize;
    
    this.gridElement.style.width = `${totalWidth}px`;
    this.gridElement.style.height = `${totalHeight}px`;
    this.gridElement.style.maxWidth = '100%';
    
    // Update the cellSize option for other calculations
    this.options.cellSize = finalCellSize;
    
    console.log('Mobile grid template updated:', {
      cellSize: finalCellSize,
      gap: gapSize,
      totalWidth,
      totalHeight,
      availableWidth
    });
    
  } else {
    // Desktop: Use original fixed sizing
    this.gridElement.style.gridTemplateColumns = `repeat(${width}, ${this.options.cellSize}px)`;
    this.gridElement.style.gridTemplateRows = `repeat(${height}, ${this.options.cellSize}px)`;
    this.gridElement.style.gap = '2px';
    
    // Set explicit dimensions including gaps
    const totalWidth = width * this.options.cellSize + (width - 1) * 2; // 2px gap
    const totalHeight = height * this.options.cellSize + (height - 1) * 2; // 2px gap
    
    this.gridElement.style.width = `${totalWidth}px`;
    this.gridElement.style.height = `${totalHeight}px`;
    this.gridElement.style.maxWidth = '100%';
  }
  
  // Always ensure overflow is hidden
  this.gridElement.style.overflow = 'hidden';
  
  console.log('Updated grid template:', {
    width,
    height,
    isMobile,
    gridTemplateColumns: this.gridElement.style.gridTemplateColumns,
    gridTemplateRows: this.gridElement.style.gridTemplateRows
  });
  
  // Dispatch an event when grid size changes
  document.dispatchEvent(new CustomEvent('gridResized', { 
    detail: { 
      width: parseInt(this.gridElement.style.width), 
      height: parseInt(this.gridElement.style.height), 
      gridRenderer: this 
    }
  }));
}
  
/**
 * Render visible portion of the grid with scroll optimization
 */
renderVisibleGrid() {
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
  const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
  
  // Track if we're currently scrolling
  const isScrolling = this._isScrolling || false;
  
  // Add buffer zone (1 cell in each direction)
  const bufferSize = 1;
  const visibleStartX = Math.max(0, this.viewOffset.x - bufferSize);
  const visibleStartY = Math.max(0, this.viewOffset.y - bufferSize);
  const visibleEndX = Math.min(this.fullGridSize, this.viewOffset.x + width + bufferSize);
  const visibleEndY = Math.min(this.fullGridSize, this.viewOffset.y + height + bufferSize);
  
  // Calculate visible bounds including buffer
  const visibleWidth = visibleEndX - visibleStartX;
  const visibleHeight = visibleEndY - visibleStartY;
  
  // Check if grid needs a complete rebuild
  const needsRebuild = !this.gridElement.children.length || 
                      this._lastRenderOffset === null ||
                      Math.abs(this._lastRenderOffset.x - this.viewOffset.x) > 1 ||
                      Math.abs(this._lastRenderOffset.y - this.viewOffset.y) > 1;
  
  // Save current render offset
  this._lastRenderOffset = { ...this.viewOffset };
  
  // Full rebuild if needed
  if (needsRebuild) {
    console.log('Full grid rebuild with buffer zone');
    
    // Clear the grid
    this.gridElement.innerHTML = '';
    
    // Set visible dimensions for grid template
    const visibleCols = Math.min(visibleWidth, width + 2*bufferSize);
    const visibleRows = Math.min(visibleHeight, height + 2*bufferSize);
    this.gridElement.style.gridTemplateColumns = `repeat(${visibleCols}, ${this.options.cellSize}px)`;
    this.gridElement.style.gridTemplateRows = `repeat(${visibleRows}, ${this.options.cellSize}px)`;
    
    // Ensure grid container dimensions remain fixed to visible area only
    const totalVisibleWidth = width * this.options.cellSize + (width - 1) * 2; // 2px gap
    const totalVisibleHeight = height * this.options.cellSize + (height - 1) * 2; // 2px gap
    this.gridElement.style.width = `${totalVisibleWidth}px`;
    this.gridElement.style.height = `${totalVisibleHeight}px`;
    
    let cellCount = 0;
    
    // Render visible cells including buffer zone
    for (let y = visibleStartY; y < visibleEndY && y < this.fullGridSize; y++) {
      for (let x = visibleStartX; x < visibleEndX && x < this.fullGridSize; x++) {
        const cellElement = this.createCellElement(x, y);
        
        // Set explicit position for better performance
        cellElement.style.gridColumn = (x - visibleStartX + 1).toString();
        cellElement.style.gridRow = (y - visibleStartY + 1).toString();
        
        this.gridElement.appendChild(cellElement);
        cellCount++;
      }
    }
    
    console.log(`Created ${cellCount} cells with buffer zone`);
    
    // Notify that grid was rebuilt with scrolling information
    document.dispatchEvent(new CustomEvent('gridRebuilt', { 
      detail: { 
        gridElement: this.gridElement, 
        gridRenderer: this,
        isScrolling: isScrolling
      }
    }));
  } 
  // Otherwise just update cell states and content
  else {
    console.log('Updating cell states and content without rebuild');
    
    // Update all visible cells without rebuilding DOM
    const cells = this.gridElement.querySelectorAll('.grid-cell');
    cells.forEach(cellElement => {
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      // Skip if invalid coordinates
      if (isNaN(x) || isNaN(y)) return;
      
      // Check if cell is still in visible area (including buffer)
      const isStillVisible = 
        x >= visibleStartX && x < visibleEndX && 
        y >= visibleStartY && y < visibleEndY;
      
      if (!isStillVisible) {
        // Cell is outside visible area - remove it
        cellElement.remove();
      } else {
        // Cell is still visible - update content and classes
        this.updateCellElementContent(cellElement, x, y);
        this.updateCellElementClasses(cellElement, x, y);
      }
    });
    
    // Add any new cells that have come into view
    const existingCellCoords = new Set();
    cells.forEach(cell => {
      if (cell.parentNode) { // Only count cells still in the DOM
        const x = parseInt(cell.dataset.gridX, 10);
        const y = parseInt(cell.dataset.gridY, 10);
        if (!isNaN(x) && !isNaN(y)) {
          existingCellCoords.add(`${x},${y}`);
        }
      }
    });
    
    // Check for new cells to add
    let newCellCount = 0;
    for (let y = visibleStartY; y < visibleEndY && y < this.fullGridSize; y++) {
      for (let x = visibleStartX; x < visibleEndX && x < this.fullGridSize; x++) {
        const coordKey = `${x},${y}`;
        if (!existingCellCoords.has(coordKey)) {
          // This is a new cell that needs to be added
          const cellElement = this.createCellElement(x, y);
          
          // Set explicit position for better performance
          cellElement.style.gridColumn = (x - visibleStartX + 1).toString();
          cellElement.style.gridRow = (y - visibleStartY + 1).toString();
          
          this.gridElement.appendChild(cellElement);
          newCellCount++;
        }
      }
    }
    
    if (newCellCount > 0) {
      console.log(`Added ${newCellCount} new cells that came into view`);
    }
  }
  
  // Check if we need to update scroll limits
  this.checkScrollLimits();
  
  // If we need to preserve snake path during grid updates, notify SnakePath
  if (!isScrolling && window.snakePath && !needsRebuild) {
    // Only refresh the snake path for minor updates and when not scrolling
    requestAnimationFrame(() => {
      if (window.snakePath.refreshSnakePath) {
        window.snakePath.refreshSnakePath(false);
      }
    });
  }
}
    
/**
 * Update the content of a cell element without handling icons
 * @param {HTMLElement} cellElement - The cell element to update
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
updateCellElementContent(cellElement, x, y) {
  // Only update if within grid bounds
  if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
    const cell = this.grid[y][x];
    
    // Update the cell content if it's different
    const currentText = cellElement.textContent;
    const modelText = cell.letter || '•'; // Use dot if no letter
    if (currentText !== modelText) {
      cellElement.textContent = modelText;
    }
  }
}
  
/**
 * Updated version of updateCellElementClasses to preserve snake pieces
 */
updateCellElementClasses(cellElement, x, y) {
  // Clear existing state classes
  cellElement.classList.remove('start-cell', 'selected-cell', 'path-cell', 'highlight-enabled', 'completed-cell', 'revealed-cell', 'correct-path');
  
  // If cell is within grid bounds
  if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
    const cell = this.grid[y][x];
    
    // First check if the cell has a letter, regardless of isPath
    if (cell.letter && cell.letter.trim() !== '') {
      cellElement.classList.add('path-cell');
    }
    
    // Apply additional special states in priority order
    
    // 1. Path cell class is applied first as a base state
    if (cell.isPath) {
      // Don't add path-cell class again if already added above
      if (!cellElement.classList.contains('path-cell')) {
        cellElement.classList.add('path-cell');
      }
      
      // Add highlight-enabled class only if path highlighting is turned on
      if (this.options.highlightPath) {
        cellElement.classList.add('highlight-enabled');
      }
    }
    
    // 2. Revealed state - applied after path but before selection/completion
    if (cell.isRevealed) {
      cellElement.classList.add('revealed-cell');
    }
    
    // 3. Completed state has highest precedence
    if (cell.isCompleted) {
      cellElement.classList.add('completed-cell');
      
      // REMOVED: Don't add correct-path class to avoid color change
      // if (cell.isCorrectPath) {
      //   cellElement.classList.add('correct-path');
      // }
    }
    
    // 4. Apply selected state BEFORE start cell state
    if (cell.isSelected) {
      cellElement.classList.add('selected-cell');
    }
    
    // 5. Apply start cell state last
    if (cell.isStart) {
      cellElement.classList.add('start-cell');
    }
    
    // Re-append any existing snake pieces that were removed
    const existingSnakePieces = Array.from(cellElement.querySelectorAll('.snake-piece'));
    if (existingSnakePieces.length > 0) {
      existingSnakePieces.forEach(snakePiece => {
        cellElement.appendChild(snakePiece);
      });
    }
  }
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
  
  // IMPORTANT CHANGE: Create array of available path indices INCLUDING start cell at index 0
  const availableIndices = [];
  for (let i = 0; i < this.path.length; i++) {
    availableIndices.push(i);
  }
  
  // Calculate number of cells to reveal (round to nearest whole number)
  const totalAvailablePathCells = availableIndices.length;
  const cellsToReveal = Math.round(totalAvailablePathCells * percentage);
  
  console.log(`Revealing ${cellsToReveal} cells (${percentage * 100}%) at hint level ${this.hintLevel} from ${totalAvailablePathCells} available cells`);
  
  // Shuffle the indices
  const shuffledIndices = this.shuffleArray([...availableIndices]);
  
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
      const gridX = 35 + pathCell.x; // Convert from path coords to grid coords
      const gridY = 35 + pathCell.y;
      
      // Store the pathIndex for proper phrase syncing
      this.revealedCells.push({ x: gridX, y: gridY, pathIndex: index });
      this.grid[gridY][gridX].isRevealed = true;
      
      // If this is the start cell (index 0), we may need special handling
      if (index === 0) {
        console.log('Start cell revealed as hint');
        // You might want to add special UI handling here
      }
    }
  } 
  // For levels 2 and 3, we need to maintain the level 1 non-adjacent cells,
  // then add additional random cells without the adjacency restriction
  else if (this.hintLevel === 2 || this.hintLevel === 3) {
    // First, get the level 1 percentage for non-adjacent cells
    const level1Percentage = this.hintLevelPercentages[1]; // 0.15 or 15%
    
    // Calculate level 1 cells based on totalAvailablePathCells
    const level1CellCount = Math.round(totalAvailablePathCells * level1Percentage);
    
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
      const gridX = 35 + pathCell.x; // Convert from path coords to grid coords
      const gridY = 35 + pathCell.y;
      
      this.revealedCells.push({ x: gridX, y: gridY, pathIndex: index });
      this.grid[gridY][gridX].isRevealed = true;
      
      // If this is the start cell (index 0), we may need special handling
      if (index === 0) {
        console.log('Start cell revealed as hint');
        // You might want to add special UI handling here
      }
    }
  }
  
  console.log(`Total revealed cells: ${this.revealedCells.length}`);
  console.log('Revealed cells pathIndices:', this.revealedCells.map(cell => cell.pathIndex).join(', '));
  
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
 * Enhanced method to pre-generate hint indices for all levels
 * Uses filtered eligible positions and mathematical spacing for better hint distribution
 */
preGenerateHintIndices() {
  // Reset all hint indices
  this.level1HintIndices = [];
  this.level2HintIndices = [];
  this.level3HintIndices = [];
  
  // CRITICAL FIX: Check if path exists and has content
  if (!this.path || !Array.isArray(this.path) || this.path.length === 0) {
    console.warn('No path available for hint generation - path is empty or undefined');
    return;
  }
  
  console.log(`Pre-generating hint indices for path with ${this.path.length} positions`);
  
  // Step 1: Create list of eligible indices (excluding start cell, vowels, and short words)
  const eligibleIndices = this.getEligibleHintIndices();
  
  if (eligibleIndices.length === 0) {
    console.warn('No eligible indices found for hints');
    return;
  }
  
  console.log(`Found ${eligibleIndices.length} eligible hint positions out of ${this.path.length} total path positions`);
  console.log('Eligible indices:', eligibleIndices);
  
  // Step 2: Generate Level 1 hints (6n-2: positions 4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64...)
  for (let n = 1; n * 6 - 2 <= eligibleIndices.length; n++) {
    const position = n * 6 - 2; // 6n-2
    if (position - 1 < eligibleIndices.length) { // Convert to 0-based index
      this.level1HintIndices.push(eligibleIndices[position - 1]);
    }
  }
  
  // Fallback: ensure at least one hint for Level 1
  if (this.level1HintIndices.length === 0 && eligibleIndices.length > 0) {
    console.log('Level 1: No hints from 6n-2 sequence, using fallback position 1');
    this.level1HintIndices.push(eligibleIndices[0]); // Position 1 (0-based index 0)
  }
  
  // Step 3: Generate Level 2 hints (Level 1 + 6n: positions 6, 12, 18, 24, 30, 36, 42, 48, 54, 60...)
  this.level2HintIndices = [...this.level1HintIndices];
  const level2StartCount = this.level2HintIndices.length;
  
  for (let n = 1; n * 6 <= eligibleIndices.length; n++) {
    const position = n * 6; // 6n
    if (position - 1 < eligibleIndices.length) { // Convert to 0-based index
      const index = eligibleIndices[position - 1];
      if (!this.level2HintIndices.includes(index)) {
        this.level2HintIndices.push(index);
      }
    }
  }
  
  // Fallback: ensure at least one extra hint for Level 2
  if (this.level2HintIndices.length === level2StartCount && eligibleIndices.length > 1) {
    console.log('Level 2: No additional hints from 6n sequence, using fallback position 2');
    const fallbackIndex = eligibleIndices[1]; // Position 2 (0-based index 1)
    if (!this.level2HintIndices.includes(fallbackIndex)) {
      this.level2HintIndices.push(fallbackIndex);
    }
  }
  
  // Step 4: Generate Level 3 hints (Level 1 + Level 2 + 6n-4: positions 2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62...)
  this.level3HintIndices = [...this.level2HintIndices];
  const level3StartCount = this.level3HintIndices.length;
  
  for (let n = 1; n * 6 - 4 <= eligibleIndices.length; n++) {
    const position = n * 6 - 4; // 6n-4
    if (position >= 1 && position - 1 < eligibleIndices.length) { // Ensure position is at least 1, convert to 0-based index
      const index = eligibleIndices[position - 1];
      if (!this.level3HintIndices.includes(index)) {
        this.level3HintIndices.push(index);
      }
    }
  }
  
  // Fallback: ensure at least one extra hint for Level 3
  if (this.level3HintIndices.length === level3StartCount && eligibleIndices.length > 2) {
    console.log('Level 3: No additional hints from 6n-4 sequence, using fallback position 3');
    const fallbackIndex = eligibleIndices[2]; // Position 3 (0-based index 2)
    if (!this.level3HintIndices.includes(fallbackIndex)) {
      this.level3HintIndices.push(fallbackIndex);
    }
  }
  
  // Sort all arrays to maintain path order
  this.level1HintIndices.sort((a, b) => a - b);
  this.level2HintIndices.sort((a, b) => a - b);
  this.level3HintIndices.sort((a, b) => a - b);
  
  console.log('Generated hint indices with mathematical spacing:');
  console.log('Level 1 (6n-2):', this.level1HintIndices, `(${this.level1HintIndices.length} hints)`);
  console.log('Level 2 (6n-2 + 6n):', this.level2HintIndices, `(${this.level2HintIndices.length} hints)`);
  console.log('Level 3 (6n-2 + 6n + 6n-4):', this.level3HintIndices, `(${this.level3HintIndices.length} hints)`);
}
  
/**
 * New method to get eligible hint indices
 * Excludes: start cell (index 0), vowels, and letters from 1-2 letter words
 * @return {Array} Array of eligible path indices for hints
 */
getEligibleHintIndices() {
  const eligibleIndices = [];
  const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
  
  // CRITICAL: Check if path exists
  if (!this.path || !Array.isArray(this.path) || this.path.length === 0) {
    console.warn('No path available for eligible hint indices');
    return eligibleIndices;
  }
  
  // Get word boundaries from GameController if available
  const wordBoundaries = this.getWordBoundaries();
  
  // Create a set of indices to exclude (from short words)
  const excludedIndices = new Set();
  
  if (wordBoundaries && wordBoundaries.length > 0) {
    // Mark indices from 1-2 letter words for exclusion
    wordBoundaries.forEach(boundary => {
      // Count only alphanumeric characters in the word
      const alphanumericCount = boundary.word.replace(/[^a-zA-Z0-9]/g, '').length;
      
      if (alphanumericCount <= 2) {
        // This is a short word - exclude its indices
        console.log(`Excluding short word "${boundary.word}" (${alphanumericCount} letters)`);
        
        // Find the path indices for this word's letters
        const wordIndices = this.getPathIndicesForWordBoundary(boundary);
        wordIndices.forEach(index => excludedIndices.add(index));
      }
    });
  }
  
  // Go through each path position (starting from index 1, excluding start cell)
  for (let i = 1; i < this.path.length; i++) {
    const pathCell = this.path[i];
    
    // SAFETY CHECK: Make sure path cell exists and has a letter
    if (!pathCell || !pathCell.letter) {
      console.warn(`Path cell at index ${i} is missing or has no letter`);
      continue;
    }
    
    const letter = pathCell.letter.toUpperCase();
    
    // Skip if this index is from a short word
    if (excludedIndices.has(i)) {
      console.log(`Skipping index ${i} (letter '${letter}') - from short word`);
      continue;
    }
    
    // Skip vowels
    if (vowels.has(letter)) {
      console.log(`Skipping index ${i} (letter '${letter}') - vowel`);
      continue;
    }
    
    // This index is eligible
    eligibleIndices.push(i);
    console.log(`Including index ${i} (letter '${letter}') - eligible consonant`);
  }
  
  return eligibleIndices;
}
  
/**
 * Get word boundaries from GameController
 * @return {Array|null} Word boundaries array or null if not available
 */
getWordBoundaries() {
  // Try to get word boundaries from the global game controller
  if (window.gameController && window.gameController.wordBoundaries) {
    return window.gameController.wordBoundaries;
  }
  
  // Alternative: check if there's a phrase and try to parse words
  if (window.gameController && window.gameController.currentPhrase && window.gameController.currentPhrase.phrase) {
    console.log('Word boundaries not found, attempting to parse from current phrase');
    return this.parseWordBoundariesFromPhrase(window.gameController.currentPhrase.phrase);
  }
  
  console.warn('Could not access word boundaries for hint filtering - no phrase available');
  return null;
}

/**
 * Get path indices for letters within a word boundary
 * @param {Object} boundary - Word boundary object with start/end positions
 * @return {Array} Array of path indices corresponding to this word's letters
 */
getPathIndicesForWordBoundary(boundary) {
  const indices = [];
  
  if (!window.gameController || !window.gameController.currentPhrase) {
    console.warn('No game controller or current phrase available');
    return indices;
  }
  
  // FIXED: Use 'phrase' instead of 'letterlist'
  const phraseText = window.gameController.currentPhrase.phrase;
  if (!phraseText) {
    console.warn('No phrase text available');
    return indices;
  }
  
  let pathIndex = 0; // This will track our position in the path
  
  // Go through each character in the phrase
  for (let phrasePos = 0; phrasePos < phraseText.length; phrasePos++) {
    const char = phraseText[phrasePos];
    
    // If this is an alphanumeric character, it corresponds to a path position
    if (/[a-zA-Z0-9]/.test(char)) {
      // Check if this phrase position is within the word boundary
      if (phrasePos >= boundary.start && phrasePos <= boundary.end) {
        indices.push(pathIndex);
      }
      pathIndex++; // Increment path index for each alphanumeric character
    }
  }
  
  return indices;
}

/**
 * Fallback method to parse word boundaries if not available from GameController
 * @param {string} letterList - The phrase string
 * @return {Array} Array of word boundary objects
 */
parseWordBoundariesFromPhrase(phraseText) {
  if (!phraseText) {
    console.warn('No phrase text provided for parsing word boundaries');
    return [];
  }
  
  const boundaries = [];
  let currentWordStart = null;
  let inWord = false;
  
  for (let i = 0; i < phraseText.length; i++) {
    const char = phraseText[i];
    const isWordChar = /[a-zA-Z0-9']/.test(char);
    
    if (isWordChar && !inWord) {
      currentWordStart = i;
      inWord = true;
    } else if (!isWordChar && inWord) {
      if (i > currentWordStart) {
        boundaries.push({
          start: currentWordStart,
          end: i - 1,
          word: phraseText.substring(currentWordStart, i)
        });
      }
      inWord = false;
    }
  }
  
  // Handle case where phrase ends with a word
  if (inWord) {
    boundaries.push({
      start: currentWordStart,
      end: phraseText.length - 1,
      word: phraseText.substring(currentWordStart)
    });
  }
  
  return boundaries;
}
  
/**
 * New method to apply stored hint letters based on current hint level
 */
applyStoredHintLetters() {
  // Clear any previously revealed cells
  this.revealedCells = [];
  
  // Clear revealed state for all cells
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[0].length; x++) {
      if (this.grid[y][x].isRevealed) {
        this.grid[y][x].isRevealed = false;
      }
    }
  }
  
  // If hint level is 0, no letters are revealed
  if (this.hintLevel === 0) {
    console.log('Hint level 0 - no letters revealed');
    this.updatePhraseWithRevealedLetters();
    this.renderVisibleGrid();
    return;
  }
  
  // Determine which hint indices to use based on current level
  let indicesToReveal = [];
  
  if (this.hintLevel === 1) {
    indicesToReveal = this.level1HintIndices;
  } else if (this.hintLevel === 2) {
    indicesToReveal = this.level2HintIndices;
  } else if (this.hintLevel === 3) {
    indicesToReveal = this.level3HintIndices;
  }
  
  console.log(`Applying ${indicesToReveal.length} stored hint indices for level ${this.hintLevel}`);
  
  // Mark cells as revealed based on stored indices
  for (const index of indicesToReveal) {
    if (index >= this.path.length) {
      console.warn(`Invalid path index ${index} - skipping`);
      continue;
    }
    
    const pathCell = this.path[index];
    const gridX = 35 + pathCell.x; // Convert from path coords to grid coords
    const gridY = 35 + pathCell.y;
    
    this.revealedCells.push({ x: gridX, y: gridY, pathIndex: index });
    this.grid[gridY][gridX].isRevealed = true;
  }
  
  // Re-render grid to show revealed cells
  this.renderVisibleGrid();
  
  // Update the phrase display with revealed letters
  this.updatePhraseWithRevealedLetters();
}

/**
 * Modified setHintLevel method
 */
setHintLevel(level) {
  // Validate level
  if (level < 0 || level > 3) {
    console.error('Invalid hint level. Must be between 0 and 3.');
    return;
  }
  
  this.hintLevel = level;
  console.log(`Hint level set to ${level}`);
  
  // Apply the pre-stored hint letters for this level
  this.applyStoredHintLetters();
}

setIslandReductionLevel(level) {
  // Validate level
  if (level < 0 || level > 2) {
    console.error('Invalid island reduction level. Must be between 0 and 2.');
    return;
  }
  
  // Don't allow going back to a lower level
  if (level < this.highestIslandReductionLevelUsed) {
    console.log(`Cannot go back to island reduction level ${level} after using level ${this.highestIslandReductionLevelUsed}`);
    return;
  }
  
  // Store previous level for comparison
  const previousLevel = this.islandReductionLevel;
  
  // Update the level
  this.islandReductionLevel = level;
  this.highestIslandReductionLevelUsed = Math.max(this.highestIslandReductionLevelUsed, level);

document.dispatchEvent(new CustomEvent('islandReductionLevelChanged', { 
  detail: { 
    level: this.islandReductionLevel,
    previousLevel: previousLevel,
    gridRenderer: this 
  }
}));
  
  console.log(`Grid renderer island reduction level set to ${level} from ${previousLevel}`);
  
  // Trigger event for island reduction level change
  document.dispatchEvent(new CustomEvent('islandReductionLevelChanged', { 
    detail: { 
      level: this.islandReductionLevel,
      previousLevel: previousLevel,
      gridRenderer: this 
    }
  }));
}
  
/**
 * Apply random letters based on the current island reduction level
 * Enhanced to ensure proper rendering of letter cells
 * @param {PathGenerator} pathGenerator - The path generator with pre-generated cells
 */
applyIslandReductionLetters(pathGenerator) {
  // First, clear all existing random letters and log how many were removed
  const clearedLetterCount = this.clearRandomLetters();
  console.log(`Cleared ${clearedLetterCount} random letters from grid`);
  
  // Get random letters for the current level
  const randomLetters = pathGenerator.getRandomLettersForLevel(this.islandReductionLevel);
  console.log(`Retrieved ${randomLetters.length} random letters for island reduction level ${this.islandReductionLevel}`);
  
  // Apply these letters to the grid
  this.applyRandomLetters(randomLetters);
  
  // CRITICAL: Set _lastRenderOffset to null to force a complete grid rebuild
  this._lastRenderOffset = null;
  
  // Re-render the grid to show changes
  this.renderVisibleGrid();
  
  // ENHANCED: Add a second delayed render to ensure cell content updates
  setTimeout(() => {
    this._lastRenderOffset = null;
    this.renderVisibleGrid();
    console.log("Secondary grid render to ensure letter updates");
  }, 100);
  
  // Dispatch an event to notify that letters were updated
  document.dispatchEvent(new CustomEvent('islandLettersUpdated', { 
    detail: { 
      level: this.islandReductionLevel,
      letterCount: randomLetters.length,
      gridRenderer: this 
    }
  }));
  
  // Trigger an island appearance update to ensure styling is properly applied
  setTimeout(() => {
    // Try to find the IslandRenderer instance if it's attached to window
    if (window.islandRenderer && typeof window.islandRenderer.updateIslandAppearance === 'function') {
      console.log('Calling IslandRenderer.updateIslandAppearance() after letter updates');
      window.islandRenderer.updateIslandAppearance();
    } else {
      // Otherwise dispatch an event that IslandRenderer can listen for
      console.log('Dispatching updateIslandStyling event for IslandRenderer');
      document.dispatchEvent(new CustomEvent('updateIslandStyling', { 
        detail: { 
          level: this.islandReductionLevel,
          gridRenderer: this 
        }
      }));
    }
  }, 150);
}
  
/**
 * Replace the existing revealPathLetters method with this one
 */
revealPathLetters() {
  // Instead of generating new hint indices, use the pre-stored ones
  this.applyStoredHintLetters();
}

/**
 * Get the letters from revealed cells for updating the phrase template
 * @return {Array} Array of {x, y, letter, pathIndex} objects for revealed cells
 */
getRevealedLetters() {
  const letters = [];
  
  // Add all revealed cells INCLUDING start cell if it's revealed
  this.revealedCells.forEach(pos => {
    const cell = this.grid[pos.y][pos.x];
    // Only add if it has a non-empty letter and a valid path index
    if (cell.letter && cell.letter.trim() !== '' && pos.pathIndex !== undefined && pos.pathIndex >= 0) {
      letters.push({
        x: pos.x,
        y: pos.y,
        letter: cell.letter,
        pathIndex: pos.pathIndex
      });
    }
  });
  
  // Sort by pathIndex to ensure correct order
  letters.sort((a, b) => a.pathIndex - b.pathIndex);
  
  console.log('Revealed letters:', letters.map(l => `${l.letter}(${l.pathIndex})`).join(', '));
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
 * Also add this method to properly handle cell element sizing on mobile
 * This should replace or supplement your existing createCellElement method
 */
createCellElement(x, y) {
  const cellElement = document.createElement('div');
  cellElement.className = 'grid-cell';
  
  // Dynamic cell sizing for mobile
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    // Use CSS Grid sizing - let the grid handle the sizing
    cellElement.style.width = '100%';
    cellElement.style.height = '100%';
  } else {
    // Desktop: use fixed sizing
    cellElement.style.width = `${this.options.cellSize}px`;
    cellElement.style.height = `${this.options.cellSize}px`;
  }
  
  // ... rest of your existing createCellElement code remains the same ...
  
  // If cell is within grid bounds
  if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
    const cell = this.grid[y][x];
    
    // Set cell content - ensure it has something visible
    cellElement.textContent = cell.letter || '•'; // Use dot if no letter
    
    // Store grid coordinates as data attributes for click handling
    cellElement.dataset.gridX = x;
    cellElement.dataset.gridY = y;
    
    // Update cell classes FIRST so we can detect beach cells
    this.updateCellElementClasses(cellElement, x, y);
    
    // Handle sea icons AFTER classes are set and ONLY for deep sea cells
    // Skip cells with letters
    if (!cell.letter || cell.letter.trim() === '') {
      // Skip beach/seashore cells (they have sea-adjacent class)
      if (!this.isSeashoreCell(x, y)) {
        // This is a deep sea cell - ensure it has a sea icon decision
        this.ensureSeaIconDecision(x, y);
        
        // Apply SVG sea icon if the cell should have one
        if (cell.hasSeaIcon && cell.seaIconData) {
          this.addSVGSeaIcon(cellElement, cell.seaIconData);
        }
      }
    }
    
    // Add click event handler for cell selection
    cellElement.addEventListener('click', (e) => {
      // Only process clicks if not recently handled touch and not a sea icon click
      if (this.recentlyHandledTouch || e._seaIconClick) return;
      
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
 * Add SVG sea icon to cell element
 * @param {HTMLElement} cellElement - The cell element
 * @param {Object} iconData - Icon data with icon class and tooltip
 */
addSVGSeaIcon(cellElement, iconData) {
  // Create Font Awesome icon element
  const iconElement = document.createElement('i');
  iconElement.className = iconData.icon + ' sea-icon-svg';
  iconElement.setAttribute('data-sea-tooltip', iconData.tooltip);
  
  // Style the icon for perfect positioning and smooth transforms
  iconElement.style.position = 'absolute';
  iconElement.style.top = '50%';
  iconElement.style.left = '50%';
  iconElement.style.transform = 'translate(-50%, -50%)';
  iconElement.style.fontSize = '14px';
  iconElement.style.color = 'var(--sea-icon-color, #4a90e2)';
  iconElement.style.opacity = '0.7';
  iconElement.style.pointerEvents = 'auto';
  iconElement.style.zIndex = '3';
  iconElement.style.cursor = 'pointer';
  
  // CRITICAL: Ensure smooth CSS transforms
  iconElement.style.willChange = 'transform';
  iconElement.style.backfaceVisibility = 'hidden';
  iconElement.style.transformOrigin = 'center center';
  
  // Make cell relative positioned for absolute icon
  cellElement.style.position = 'relative';
  
  // Add the icon to the cell
  cellElement.appendChild(iconElement);
  cellElement.classList.add('has-sea-icon');
  
  // Set up event listeners for sea icon interaction
  this.setupSeaIconEventListeners(iconElement);
  
  console.log('Added SVG sea icon:', iconData.icon);
}
  
/**
 * Set up event listeners for SVG sea icon interaction
 * @param {HTMLElement} iconElement - The icon element
 */
setupSeaIconEventListeners(iconElement) {
  // Mouse click handler with proper event delegation
  iconElement.addEventListener('click', (e) => {
    if (window.islandRenderer && window.islandRenderer.handleSeaIconClick) {
      window.islandRenderer.handleSeaIconClick(e);
    }
  }, true);
  
  // Touch handlers for mobile devices
  iconElement.addEventListener('touchstart', (e) => {
    // Store touch start info to detect taps vs swipes
    iconElement._seaIconTouchStart = {
      time: Date.now(),
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    
    // Prevent event from bubbling to cell
    e.stopPropagation();
  }, true);
  
  iconElement.addEventListener('touchend', (e) => {
    // Only handle if we have touch start data
    if (!iconElement._seaIconTouchStart) return;
    
    const touchDuration = Date.now() - iconElement._seaIconTouchStart.time;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const moveDistance = Math.sqrt(
      Math.pow(touchEndX - iconElement._seaIconTouchStart.x, 2) + 
      Math.pow(touchEndY - iconElement._seaIconTouchStart.y, 2)
    );
    
    // Consider it a tap if duration < 500ms and movement < 10px
    const isTap = touchDuration < 500 && moveDistance < 10;
    
    if (isTap) {
      // Handle as sea icon click
      if (window.islandRenderer && window.islandRenderer.handleSeaIconClick) {
        window.islandRenderer.handleSeaIconClick(e);
      }
    }
    
    // Clean up touch start data
    delete iconElement._seaIconTouchStart;
    
    // Prevent event from bubbling to cell
    e.stopPropagation();
  }, true);
  
  // Add hover effects for better UX
  iconElement.addEventListener('mouseenter', () => {
    iconElement.style.opacity = '1';
    iconElement.style.transform = 'translate(-50%, -50%) scale(1.1)';
    iconElement.style.transition = 'all 0.2s ease';
  });
  
  iconElement.addEventListener('mouseleave', () => {
    iconElement.style.opacity = '0.7';
    iconElement.style.transform = 'translate(-50%, -50%) scale(1)';
  });
}
  
/**
 * Handle sea icon click events
 * @param {Event} e - Click or touch event
 */
handleSeaIconClick(e) {
  // Only handle clicks on the pseudo-element area (center of cell)
  const rect = e.currentTarget.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Handle both mouse and touch events
  let clickX, clickY;
  if (e.type === 'touchend' && e.changedTouches && e.changedTouches.length > 0) {
    // Touch event
    clickX = e.changedTouches[0].clientX;
    clickY = e.changedTouches[0].clientY;
  } else {
    // Mouse event
    clickX = e.clientX;
    clickY = e.clientY;
  }
  
  // Check if click/touch is near center (where icon is)
  const distance = Math.sqrt(Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2));
  if (distance > 25) return; // Click too far from icon
  
  // Prevent the click from propagating
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  const tooltip = e.currentTarget.dataset.seaTooltip;
  if (!tooltip) return;
  
  // Mark this as a sea icon click
  e._seaIconClick = true;
  
  // Delegate to IslandRenderer for tooltip handling if available
  if (window.islandRenderer && window.islandRenderer.handleSeaIconClick) {
    window.islandRenderer.handleSeaIconClick(e);
  } else {
    // Simple fallback tooltip handling
    console.log('Sea icon clicked:', tooltip);
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
 * Set the path for the grid - MODIFIED to add start cell flashing
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
      // Reset the revealed state
      this.grid[y][x].isRevealed = false;
      // Reset sea icon properties
      this.grid[y][x].hasSeaIcon = undefined;
      this.grid[y][x].seaIconData = null;
    }
  }
  
  // Set start cell
  const centerX = 35;
  const centerY = 35;
  this.grid[centerY][centerX].isPath = true;
  this.grid[centerY][centerX].isStart = true;
  this.grid[centerY][centerX].pathIndex = 0;
  // Start cell never has sea icon
  this.grid[centerY][centerX].hasSeaIcon = false;
  this.grid[centerY][centerX].seaIconData = null;
  
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
      
      // Path cells never have sea icons
      if (this.grid[gridY][gridX].letter && this.grid[gridY][gridX].letter.trim() !== '') {
        this.grid[gridY][gridX].hasSeaIcon = false;
        this.grid[gridY][gridX].seaIconData = null;
      }
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
  
  // NEW: Start flashing the start cell after a short delay
  setTimeout(() => {
    this.startFlashingStartCell();
  }, 500); // Half second delay to let the grid settle
  
  // Notify that path has been set
  document.dispatchEvent(new CustomEvent('pathSet', { 
    detail: { 
      path: path, 
      gridRenderer: this,
      success: allCellsPlaced
    }
  }));
  
  if (allCellsPlaced) {
    // Clear any previous revealed cells
    this.revealedCells = [];
    
    // Pre-generate hint indices first
    console.log("Generating hint indices for new path with length:", path.length);
    this.preGenerateHintIndices();
    
    // Then apply based on current hint level
    this.applyStoredHintLetters();
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
    this.viewOffset.x = 35 - Math.floor(width / 2);
    this.viewOffset.y = 35 - Math.floor(height / 2);
    
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
 * Fixed optimizeGridView method for GridRenderer class
 * It scans for empty rows/columns and auto-scrolls to optimize the view.
 * Fixed to correctly reduce empty space instead of adding more.
 */
/**
 * Improved optimizeGridView method for GridRenderer class
 * Balances empty rows/columns between opposite edges
 */
optimizeGridView() {
  console.log('Optimizing grid view to balance empty space between opposite edges');
  
  // Skip if not on large screen
  if (window.innerWidth < 768) {
    console.log('Skipping grid view optimization for small screens');
    return;
  }
  
  // Get current visible dimensions
  const width = this.options.gridWidth;
  const height = this.options.gridHeight;
  
  // Track empty rows and columns from each edge
  let emptyRowsTop = 0;
  let emptyRowsBottom = 0;
  let emptyColsLeft = 0;
  let emptyColsRight = 0;
  
  // Check for empty rows at the top
  for (let y = this.viewOffset.y; y < this.viewOffset.y + height && y < this.fullGridSize; y++) {
    let rowIsEmpty = true;
    
    for (let x = this.viewOffset.x; x < this.viewOffset.x + width && x < this.fullGridSize; x++) {
      if (this.cellHasContent(x, y)) {
        rowIsEmpty = false;
        break;
      }
    }
    
    if (rowIsEmpty) {
      emptyRowsTop++;
    } else {
      break;
    }
  }
  
  // Check for empty rows at the bottom
  for (let y = this.viewOffset.y + height - 1; y >= this.viewOffset.y && y < this.fullGridSize; y--) {
    let rowIsEmpty = true;
    
    for (let x = this.viewOffset.x; x < this.viewOffset.x + width && x < this.fullGridSize; x++) {
      if (this.cellHasContent(x, y)) {
        rowIsEmpty = false;
        break;
      }
    }
    
    if (rowIsEmpty) {
      emptyRowsBottom++;
    } else {
      break;
    }
  }
  
  // Check for empty columns on the left
  for (let x = this.viewOffset.x; x < this.viewOffset.x + width && x < this.fullGridSize; x++) {
    let colIsEmpty = true;
    
    for (let y = this.viewOffset.y; y < this.viewOffset.y + height && y < this.fullGridSize; y++) {
      if (this.cellHasContent(x, y)) {
        colIsEmpty = false;
        break;
      }
    }
    
    if (colIsEmpty) {
      emptyColsLeft++;
    } else {
      break;
    }
  }
  
  // Check for empty columns on the right
  for (let x = this.viewOffset.x + width - 1; x >= this.viewOffset.x && x < this.fullGridSize; x--) {
    let colIsEmpty = true;
    
    for (let y = this.viewOffset.y; y < this.viewOffset.y + height && y < this.fullGridSize; y++) {
      if (this.cellHasContent(x, y)) {
        colIsEmpty = false;
        break;
      }
    }
    
    if (colIsEmpty) {
      emptyColsRight++;
    } else {
      break;
    }
  }
  
  console.log('Empty space analysis:', {
    emptyRowsTop,
    emptyRowsBottom, 
    emptyColsLeft,
    emptyColsRight
  });
  
  // Calculate vertical balance adjustments
  let verticalAdjustment = 0;
  
  // If both top and bottom have less than 2 empty rows, no adjustment needed
  if (emptyRowsTop < 2 && emptyRowsBottom < 2) {
    console.log('Vertical balance: Both edges have fewer than 2 empty rows, no adjustment needed');
  } else {
    // Calculate the difference between empty rows
    const verticalDifference = Math.abs(emptyRowsTop - emptyRowsBottom);
    
    // If difference is already 1 or less, no adjustment needed
    if (verticalDifference <= 1) {
      console.log('Vertical balance: Difference is already 1 or less, no adjustment needed');
    } else {
      // Calculate how much to adjust to make the difference 1
      const targetAdjustment = Math.floor(verticalDifference / 2);
      
      if (emptyRowsTop > emptyRowsBottom) {
        // Move view down to reduce top empty space
        verticalAdjustment = targetAdjustment;
        console.log(`Vertical balance: Moving down by ${verticalAdjustment} rows to balance top/bottom empty space`);
      } else {
        // Move view up to reduce bottom empty space
        verticalAdjustment = -targetAdjustment;
        console.log(`Vertical balance: Moving up by ${Math.abs(verticalAdjustment)} rows to balance top/bottom empty space`);
      }
    }
  }
  
  // Calculate horizontal balance adjustments
  let horizontalAdjustment = 0;
  
  // If both left and right have less than 2 empty columns, no adjustment needed
  if (emptyColsLeft < 2 && emptyColsRight < 2) {
    console.log('Horizontal balance: Both edges have fewer than 2 empty columns, no adjustment needed');
  } else {
    // Calculate the difference between empty columns
    const horizontalDifference = Math.abs(emptyColsLeft - emptyColsRight);
    
    // If difference is already 1 or less, no adjustment needed
    if (horizontalDifference <= 1) {
      console.log('Horizontal balance: Difference is already 1 or less, no adjustment needed');
    } else {
      // Calculate how much to adjust to make the difference 1
      const targetAdjustment = Math.floor(horizontalDifference / 2);
      
      if (emptyColsLeft > emptyColsRight) {
        // Move view right to reduce left empty space
        horizontalAdjustment = targetAdjustment;
        console.log(`Horizontal balance: Moving right by ${horizontalAdjustment} columns to balance left/right empty space`);
      } else {
        // Move view left to reduce right empty space
        horizontalAdjustment = -targetAdjustment;
        console.log(`Horizontal balance: Moving left by ${Math.abs(horizontalAdjustment)} columns to balance left/right empty space`);
      }
    }
  }
  
  // Apply the calculated adjustments
  if (verticalAdjustment !== 0 || horizontalAdjustment !== 0) {
    // Apply vertical adjustment
    if (verticalAdjustment > 0) {
      // Move view down
      this.viewOffset.y = Math.min(
        this.fullGridSize - height,
        this.viewOffset.y + verticalAdjustment
      );
    } else if (verticalAdjustment < 0) {
      // Move view up
      this.viewOffset.y = Math.max(0, this.viewOffset.y + verticalAdjustment);
    }
    
    // Apply horizontal adjustment
    if (horizontalAdjustment > 0) {
      // Move view right
      this.viewOffset.x = Math.min(
        this.fullGridSize - width,
        this.viewOffset.x + horizontalAdjustment
      );
    } else if (horizontalAdjustment < 0) {
      // Move view left
      this.viewOffset.x = Math.max(0, this.viewOffset.x + horizontalAdjustment);
    }
    
    // Add slow animation class for smoother transition
    if (this.gridElement) {
      this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
      this.gridElement.classList.add('slow-scroll');
    }
    
    // Force grid rebuild
    this._lastRenderOffset = null;
    this.renderVisibleGrid();
    
    // Remove transition class after animation completes
    setTimeout(() => {
      if (this.gridElement) {
        this.gridElement.classList.remove('slow-scroll');
      }
    }, 450);
    
    // Notify about the optimization
    document.dispatchEvent(new CustomEvent('gridViewOptimized', { 
      detail: { 
        offset: this.viewOffset, 
        gridRenderer: this,
        adjustments: {
          vertical: verticalAdjustment,
          horizontal: horizontalAdjustment
        }
      }
    }));
    
    return true; // Scrolling happened
  }
  
  return false; // No scrolling needed
}
  
/**
 * Helper method to check if a cell has any content (letter)
 * Add this to the GridRenderer class
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @return {boolean} True if the cell has content
 */
cellHasContent(x, y) {
  // Check if coordinates are within grid bounds
  if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) {
    return false;
  }
  
  // Check if the cell has a non-empty letter
  const cell = this.grid[y][x];
  return cell && cell.letter && cell.letter.trim() !== '';
}

/**
 * Updated ensureSeaIconDecision method (no changes needed but included for completeness)
 * @param {number} x - Grid X coordinate
 * @param {number} y - Grid Y coordinate
 */
ensureSeaIconDecision(x, y) {
  // Skip if coordinates are out of bounds
  if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) {
    return;
  }
  
  const cell = this.grid[y][x];
  
  // Skip if cell already has ANY sea icon decision made (including false)
  if (cell.hasSeaIcon !== undefined) {
    return; // Decision already exists
  }
  
  // Skip if this cell has a letter (path cells, random letters, etc.)
  if (cell.letter && cell.letter.trim() !== '') {
    cell.hasSeaIcon = false;
    cell.seaIconData = null;
    return;
  }
  
  // Skip if this is a beach/shore cell (sea-adjacent)
  if (this.isSeashoreCell(x, y)) {
    cell.hasSeaIcon = false;
    cell.seaIconData = null;
    return;
  }
  
  // Make the decision only once
  const iconChance = 0.03; // 3% chance
  const shouldHaveIcon = Math.random() < iconChance;
  
  if (shouldHaveIcon && window.islandRenderer) {
    const iconData = window.islandRenderer.getRandomIconData();
    cell.hasSeaIcon = true;
    cell.seaIconData = iconData;
  } else {
    cell.hasSeaIcon = false;
    cell.seaIconData = null;
  }
}
  
/**
 * Helper method to check if a cell is a seashore/beach cell
 * @param {number} x - Grid X coordinate  
 * @param {number} y - Grid Y coordinate
 * @return {boolean} True if this is a beach cell
 */
isSeashoreCell(x, y) {
  // Direct check without relying on IslandRenderer
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left
  
  for (const [dx, dy] of directions) {
    const checkX = x + dx;
    const checkY = y + dy;
    
    // Skip if out of bounds
    if (checkY < 0 || checkY >= this.grid.length || checkX < 0 || checkX >= this.grid[0].length) {
      continue;
    }
    
    // If adjacent cell has a letter, this is a beach cell
    if (this.grid[checkY][checkX].letter && this.grid[checkY][checkX].letter.trim() !== '') {
      return true;
    }
  }
  
  return false;
}
  
/**
 * Enhanced Scroll Method for GridRenderer
 * Makes individual scrolls smoother
 * Replace this in your GridRenderer class
 */
scroll(direction, slowMotion = false) {
  // Signal to components that scrolling is starting
  this._isScrolling = true;
  document.dispatchEvent(new CustomEvent('gridScrollStarted', { 
    detail: { direction, slowMotion }
  }));
  
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
  
  // If no movement is possible in requested direction, exit early
  if (newOffsetX === this.viewOffset.x && newOffsetY === this.viewOffset.y) {
    this._isScrolling = false;
    document.dispatchEvent(new CustomEvent('gridScrollComplete', { 
      detail: { direction, noChange: true }
    }));
    return;
  }
  
  // Preserve beach cell styles if possible
  if (window.islandRenderer && window.islandRenderer._preserveBeachCellStyles) {
    window.islandRenderer._preserveBeachCellStyles();
  }
  
  // Improved timing values for smoother transitions
  const transitionDuration = 180; // Faster for more responsive feel
  
  // Determine if this is a small scroll (1 unit in any direction)
  const isSmallScroll = (Math.abs(newOffsetX - this.viewOffset.x) <= 1 && 
                         Math.abs(newOffsetY - this.viewOffset.y) <= 1);
  
  // Notify components that need to prepare for scrolling
  document.dispatchEvent(new CustomEvent('gridScrolling', { 
    detail: { 
      from: {...this.viewOffset}, 
      to: {x: newOffsetX, y: newOffsetY},
      isSmallScroll 
    }
  }));
  
  // Use CSS transform for smooth scrolling
  if (isSmallScroll && this.gridElement) {
    // Remove any existing transition classes
    this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
    
    // Add custom inline transition for maximum smoothness
    this.gridElement.style.transition = `transform ${transitionDuration}ms cubic-bezier(0.2, 0.0, 0.1, 1.0)`;
    
    // Add hardware acceleration properties
    this.gridElement.style.willChange = 'transform';
    this.gridElement.style.backfaceVisibility = 'hidden';
    
    // Apply transform to move the grid - SMOOTH ANIMATION
    const cellSize = this.options.cellSize;
    const gapSize = 2; // Gap between cells
    
    // Calculate translation amounts based on scroll direction
    const translateX = (this.viewOffset.x - newOffsetX) * (cellSize + gapSize);
    const translateY = (this.viewOffset.y - newOffsetY) * (cellSize + gapSize);
    
    // Apply translation with hardware acceleration
    this.gridElement.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    
    // Update internal view offset (but DOM updates after animation)
    const oldOffsetX = this.viewOffset.x;
    const oldOffsetY = this.viewOffset.y;
    this.viewOffset.x = newOffsetX;
    this.viewOffset.y = newOffsetY;
    
    // After transition completes, reset transform and rebuild grid
    setTimeout(() => {
      // Reset transform
      this.gridElement.style.transform = 'translate3d(0, 0, 0)';
      
      // Reset transition property to default
      this.gridElement.style.transition = '';
      this.gridElement.style.willChange = 'auto';
      
      // Remove transition classes
      this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
      
      // Force a rebuild to ensure correct grid state
      this._lastRenderOffset = null;
      this.renderVisibleGrid();
      
      // Signal that scrolling is complete
      this._isScrolling = false;
      
      // Dispatch event for scroll completion
      document.dispatchEvent(new CustomEvent('gridScrollComplete', { 
        detail: { 
          direction, 
          from: { x: oldOffsetX, y: oldOffsetY },
          to: { x: newOffsetX, y: newOffsetY }
        }
      }));
    }, transitionDuration + 20); // Smaller buffer for faster consecutive scrolls
  } else {
    // For larger scrolls, use the standard approach
    this.viewOffset.x = newOffsetX;
    this.viewOffset.y = newOffsetY;
    
    // Force a rebuild
    this._lastRenderOffset = null;
    this.renderVisibleGrid();
    
    // Reset scrolling flag and notify completion
    setTimeout(() => {
      this._isScrolling = false;
      
      // Dispatch event for scroll completion
      document.dispatchEvent(new CustomEvent('gridScrollComplete', { 
        detail: { direction, offset: this.viewOffset }
      }));
    }, 50);
  }
  
  // Dispatch event for scroll in progress
  document.dispatchEvent(new CustomEvent('gridScrolled', { 
    detail: { direction, offset: this.viewOffset, gridRenderer: this, slowMotion }
  }));
}
  
/**
 * Add this method to your GridRenderer class to support continuous scrolling
 * It enables scrolling multiple grid cells in a single smooth animation
 * 
 * @param {string} direction - Scroll direction ('up', 'right', 'down', 'left')
 * @param {number} cellCount - Number of cells to scroll
 * @param {boolean} slowMotion - Whether to use slow scroll animation
 */
scrollMultipleCells(direction, cellCount, slowMotion = false) {
  // Signal to components that scrolling is starting
  this._isScrolling = true;
  document.dispatchEvent(new CustomEvent('gridScrollStarted', { 
    detail: { direction, slowMotion, cellCount }
  }));
  
  // Calculate new offset based on direction and cell count
  let newOffsetX = this.viewOffset.x;
  let newOffsetY = this.viewOffset.y;
  
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
  const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
  
  switch (direction) {
    case 'up':
      newOffsetY = Math.max(0, this.viewOffset.y - cellCount);
      break;
    case 'down':
      newOffsetY = Math.min(
        this.fullGridSize - height,
        this.viewOffset.y + cellCount
      );
      break;
    case 'left':
      newOffsetX = Math.max(0, this.viewOffset.x - cellCount);
      break;
    case 'right':
      newOffsetX = Math.min(
        this.fullGridSize - width,
        this.viewOffset.x + cellCount
      );
      break;
  }
  
  // If no movement is possible in requested direction, exit early
  if (newOffsetX === this.viewOffset.x && newOffsetY === this.viewOffset.y) {
    this._isScrolling = false;
    document.dispatchEvent(new CustomEvent('gridScrollComplete', { 
      detail: { direction, noChange: true }
    }));
    return;
  }
  
  // Let islandRenderer know we're about to transform (if available)
  if (window.islandRenderer && window.islandRenderer._preserveBeachCellStyles) {
    window.islandRenderer._preserveBeachCellStyles();
  }
  
  // IMPORTANT: For continuous scrolling, we want a constant speed regardless of cell count
  // So we use a fixed duration rather than scaling it with distance
  const transitionDuration = slowMotion ? 350 : 220; // Same durations as single-cell scrolling
  
  // Notify components that need to prepare for scrolling
  document.dispatchEvent(new CustomEvent('gridScrolling', { 
    detail: { 
      from: {...this.viewOffset}, 
      to: {x: newOffsetX, y: newOffsetY},
      cellCount
    }
  }));
  
  // Use CSS transform for smooth scrolling
  if (this.gridElement) {
    // Remove any existing transition classes
    this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
    
    // Add custom inline transition for maximum smoothness
    this.gridElement.style.transition = `transform ${transitionDuration}ms cubic-bezier(0.2, 0.0, 0.1, 1.0)`;
    
    // Add hardware acceleration properties
    this.gridElement.style.willChange = 'transform';
    this.gridElement.style.backfaceVisibility = 'hidden';
    
    // Pre-populate cells that will come into view (if available)
    if (this._prepareNewCellsForScroll) {
      this._prepareNewCellsForScroll(direction, newOffsetX, newOffsetY);
    }
  }
  
  // Apply transform to move the grid - SMOOTH ANIMATION
  const cellSize = this.options.cellSize;
  const gapSize = 2; // Gap between cells
  
  // Calculate translation amounts based on scroll direction
  const translateX = (this.viewOffset.x - newOffsetX) * (cellSize + gapSize);
  const translateY = (this.viewOffset.y - newOffsetY) * (cellSize + gapSize);
  
  // Apply translation with hardware acceleration
  this.gridElement.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
  
  // Update internal view offset (but DOM updates after animation)
  const oldOffsetX = this.viewOffset.x;
  const oldOffsetY = this.viewOffset.y;
  this.viewOffset.x = newOffsetX;
  this.viewOffset.y = newOffsetY;
  
  // After transition completes, reset transform and rebuild grid
  setTimeout(() => {
    // Reset transform
    this.gridElement.style.transform = 'translate3d(0, 0, 0)';
    
    // Reset transition property to default
    this.gridElement.style.transition = '';
    this.gridElement.style.willChange = 'auto';
    
    // Remove transition classes
    this.gridElement.classList.remove('fast-scroll', 'slow-scroll');
    
    // Force a rebuild to ensure correct grid state
    this._lastRenderOffset = null;
    this.renderVisibleGrid();
    
    // Signal that scrolling is complete
    this._isScrolling = false;
    
    // Dispatch event for scroll completion
    document.dispatchEvent(new CustomEvent('gridScrollComplete', { 
      detail: { 
        direction, 
        from: { x: oldOffsetX, y: oldOffsetY },
        to: { x: newOffsetX, y: newOffsetY },
        cellCount
      }
    }));
  }, transitionDuration + 30); // Small buffer
  
  // Dispatch event for scroll in progress
  document.dispatchEvent(new CustomEvent('gridScrolled', { 
    detail: { direction, offset: this.viewOffset, gridRenderer: this, slowMotion, cellCount }
  }));
}
  
/**
 * Prepare new cells that will come into view during small scrolls
 * This improves performance by pre-creating cells before they're needed
 * @param {string} direction - Scroll direction
 * @param {number} newOffsetX - New X offset after scroll
 * @param {number} newOffsetY - New Y offset after scroll
 * @private
 */
_prepareNewCellsForScroll(direction, newOffsetX, newOffsetY) {
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? this.options.gridWidthSmall : this.options.gridWidth;
  const height = isMobile ? this.options.gridHeightSmall : this.options.gridHeight;
  
  // Determine which new cells need to be created based on direction
  const newCellPositions = [];
  
  switch (direction) {
    case 'up': 
      // Top row comes into view
      for (let x = newOffsetX; x < newOffsetX + width; x++) {
        newCellPositions.push({x, y: newOffsetY});
      }
      break;
    case 'down':
      // Bottom row comes into view
      for (let x = newOffsetX; x < newOffsetX + width; x++) {
        newCellPositions.push({x, y: newOffsetY + height - 1});
      }
      break;
    case 'left':
      // Left column comes into view
      for (let y = newOffsetY; y < newOffsetY + height; y++) {
        newCellPositions.push({x: newOffsetX, y});
      }
      break;
    case 'right':
      // Right column comes into view
      for (let y = newOffsetY; y < newOffsetY + height; y++) {
        newCellPositions.push({x: newOffsetX + width - 1, y});
      }
      break;
  }
  
  // Create a map of existing cells
  const existingCellMap = new Map();
  this.gridElement.querySelectorAll('.grid-cell').forEach(cell => {
    const x = parseInt(cell.dataset.gridX, 10);
    const y = parseInt(cell.dataset.gridY, 10);
    if (!isNaN(x) && !isNaN(y)) {
      existingCellMap.set(`${x},${y}`, cell);
    }
  });
  
  // Add new cells that will come into view
  newCellPositions.forEach(({x, y}) => {
    // Skip if cell already exists
    if (existingCellMap.has(`${x},${y}`)) return;
    
    // Only create if within grid bounds
    if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
      const cellElement = this.createCellElement(x, y);
      
      // Position for post-scroll view (will become visible after scroll)
      cellElement.style.gridColumn = (x - newOffsetX + 1).toString();
      cellElement.style.gridRow = (y - newOffsetY + 1).toString();
      
      // Make it initially invisible during transition
      cellElement.style.opacity = '0';
      
      // Add to grid
      this.gridElement.appendChild(cellElement);
    }
  });
}
  
  /**
 * Get selected letters from the grid
 * Modified to work with any selected cells, not just path cells
 * @return {Array} Array of selected letter objects
 */
getSelectedLetters() {
  const letters = [];
  
  // Get the start cell directly - this ensures we don't miss it
  const centerX = 35;
  const centerY = 35;
  const startCell = this.grid[centerY][centerX];
  
  // Check if start cell is selected
  if (startCell.isSelected) {
    // We'll only return the start cell letter if specifically requested
    // This is used in GameController's updatePhraseWithHints
    console.log('Start cell is selected with letter:', startCell.letter);
  }
  
  // Add all selected cells (EXPLICITLY skipping the start cell)
  this.selectedCells.forEach(pos => {
    const cell = this.grid[pos.y][pos.x];
    
    // Skip the start cell at 35,35
    const isStartCell = (pos.x === 35 && pos.y === 35);
    if (isStartCell) {
      return; // Skip the start cell
    }
    
    // Only include if the cell has a letter
    if (cell.letter && cell.letter.trim() !== '') {
      letters.push({
        x: pos.x,
        y: pos.y,
        letter: cell.letter,
        pathIndex: cell.pathIndex,
        isPathCell: cell.isPath, // Added flag to indicate if this is a path cell
        isRevealed: cell.isRevealed // Add flag to indicate if this is a revealed cell
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
  
  // NEW: Restart flashing the start cell since no cells are selected
  setTimeout(() => {
    this.startFlashingStartCell();
  }, 100); // Small delay to let the grid update
  
  // Dispatch event for selections cleared
  document.dispatchEvent(new CustomEvent('selectionsCleared', { 
    detail: { gridRenderer: this }
  }));
}

  /**
 * Modified setCompleted method to visually indicate if the path is correct
 * @param {boolean} completed - Whether the phrase is completed
 * @param {boolean} isCorrect - Whether the completed phrase is correct
 */
setCompleted(completed, isCorrect = true) {
  // Set the completion state first
  this.isCompleted = completed;
  
  if (completed) {
    // Convert all selected cells to completed state
    // Important: Include the start cell only if it has a letter
    const centerX = 35;
    const centerY = 35;
    
    // Mark the start cell as completed if it has a letter
    if (this.grid[centerY][centerX].letter && this.grid[centerY][centerX].letter.trim() !== '') {
      this.grid[centerY][centerX].isCompleted = true;
      
      // Add correctPath flag without adding the CSS class (which changes color)
      if (isCorrect) {
        this.grid[centerY][centerX].isCorrectPath = true;
      }
    }
    
    // Mark all selected cells as completed
    this.selectedCells.forEach(pos => {
      this.grid[pos.y][pos.x].isCompleted = true;
      
      // Add correctPath flag without adding the CSS class
      if (isCorrect) {
        this.grid[pos.y][pos.x].isCorrectPath = true;
      }
      
      // Keep the isSelected property true as well for visual consistency
      this.grid[pos.y][pos.x].isSelected = true;
    });
    
    // If correct, trigger the flash animation instead of color change
    if (isCorrect) {
      this.triggerFlashAnimation();
    }
  } else {
    // Reset completion state for all cells
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[0].length; x++) {
        this.grid[y][x].isCompleted = false;
        this.grid[y][x].isCorrectPath = false;
      }
    }
  }
  
  // Re-render to show the updated state
  this.renderVisibleGrid();
  
  // Dispatch event for completion state change
  document.dispatchEvent(new CustomEvent('gridCompletionChanged', { 
    detail: { 
      completed: this.isCompleted, 
      isCorrect: isCorrect, 
      gridRenderer: this 
    }
  }));
}

/**
 * Enhanced start flashing method with better debugging
 */
startFlashingStartCell() {
  console.log('startFlashingStartCell called');
  console.log('Selected cells length:', this.selectedCells.length);
  
  // Only flash if the start cell is not already selected
  if (this.selectedCells.length === 0) {
    // Try multiple selectors to find the start cell
    let startCellElement = document.querySelector('.grid-cell.start-cell');
    
    if (!startCellElement) {
      // Alternative: find by data attributes
      startCellElement = document.querySelector('.grid-cell[data-grid-x="35"][data-grid-y="35"]');
      console.log('Found start cell by coordinates:', startCellElement);
    }
    
    if (!startCellElement) {
      // Wait a bit longer for DOM to be ready
      console.log('Start cell not found, retrying in 500ms...');
      setTimeout(() => {
        this.startFlashingStartCell();
      }, 500);
      return;
    }
    
    console.log('Start cell element found:', startCellElement);
    console.log('Current classes:', startCellElement.className);
    
    // Remove any existing flash class first
    startCellElement.classList.remove('flash-unselected');
    
    // Force a reflow
    void startCellElement.offsetWidth;
    
    // Add the flash class
    startCellElement.classList.add('flash-unselected');
    
    console.log('Added flash-unselected class');
    console.log('Classes after adding flash:', startCellElement.className);
    
    // Verify the animation is applied
    const computedStyle = window.getComputedStyle(startCellElement);
    console.log('Animation name:', computedStyle.animationName);
    console.log('Animation duration:', computedStyle.animationDuration);
    
  } else {
    console.log('Start cell not flashing because cells are already selected');
  }
}

/**
 * Enhanced stop flashing method with better debugging
 */
stopFlashingStartCell() {
  console.log('stopFlashingStartCell called');
  
  // Try multiple selectors
  let startCellElement = document.querySelector('.grid-cell.start-cell');
  
  if (!startCellElement) {
    startCellElement = document.querySelector('.grid-cell[data-grid-x="35"][data-grid-y="35"]');
  }
  
  if (startCellElement) {
    console.log('Removing flash-unselected class from start cell');
    startCellElement.classList.remove('flash-unselected');
    console.log('Stopped flashing start cell');
  } else {
    console.log('Start cell element not found when trying to stop flashing');
  }
}
  
triggerFlashAnimation() {
  // First, ensure we have the flash animation CSS
  this.ensureFlashAnimationCSS();
  
  // Wait for snake pieces to be fully placed and settled
  setTimeout(() => {
    // Get all snake pieces currently in the DOM
    const snakePieces = document.querySelectorAll('.snake-piece');
    
    // If no snake pieces found, log and return
    if (snakePieces.length === 0) {
      console.log('No snake pieces found to animate');
      return;
    }
    
    console.log(`Triggering phrase completion flash for ${snakePieces.length} snake pieces`);
    
    // Flash the snake twice (off-on, off-on) with 500ms intervals
    let flashCount = 0;
    const maxFlashes = 4; // 2 complete cycles (off-on, off-on)
    
    const flashInterval = setInterval(() => {
      // Toggle visibility
      const isVisible = flashCount % 2 === 0;
      
      snakePieces.forEach(piece => {
        piece.style.visibility = isVisible ? 'hidden' : 'visible';
      });
      
      flashCount++;
      
      // Stop after max flashes
      if (flashCount >= maxFlashes) {
        clearInterval(flashInterval);
        
        // Ensure snake is visible at the end
        snakePieces.forEach(piece => {
          piece.style.visibility = 'visible';
        });
        
        console.log('Snake phrase completion flash animation complete');
      }
    }, 500); // 500ms = half a second
    
  }, 600); // Wait 600ms for snake pieces to be fully placed
}
  
/**
 * Ensure flash animation CSS exists and uses the correct colors
 */
ensureFlashAnimationCSS() {
  // Check if we've already added the styles
  if (document.getElementById('snake-flash-animation-styles')) {
    return;
  }
  
  // Create style element
  const style = document.createElement('style');
  style.id = 'snake-flash-animation-styles';
  style.textContent = `
    .snake-piece {
      transition: visibility 0.1s ease;
      transform-origin: center;
    }
    
    /* Use existing maingreen variables for completed cells */
    .grid-cell.completed-cell {
      background-color: var(--maingreen) !important;
      border-color: var(--maingreen-dark) !important;
      color: var(--text-dark) !important;
      border: 1px solid var(--maingreen-dark) !important;
      text-shadow: 0px 1px 1px rgba(255, 255, 255, 0.8) !important;
    }
    
    /* Make sure correct-path also uses the same color */
    .grid-cell.correct-path {
      background-color: var(--maingreen) !important;
      border-color: var(--maingreen-dark) !important;
    }
  `;
  
  // Add to document
  document.head.appendChild(style);
  console.log('Added flash animation styles with correct island colors');
}
  
  /**
 * Start flashing cells to indicate imminent erosion
 * @param {Array} cells - Array of cells to flash
 */
startFlashingCells(cells) {
  // Add CSS for flashing if it doesn't exist yet
  this.ensureErosionCSSExists();
  
  // Mark cells as flashing in the data model
  cells.forEach(cell => {
    const gridX = 35 + cell.x; // Convert from path coords to grid coords
    const gridY = 35 + cell.y;
    
    // Check if coordinates are within bounds
    if (gridY >= 0 && gridY < this.grid.length && 
        gridX >= 0 && gridX < this.grid[0].length) {
      // Add flashing flag to the cell data
      this.grid[gridY][gridX].isFlashing = true;
    }
  });
  
  // Update the DOM cells to show flashing
  this.updateFlashingCellsInDOM();
  
  // Start flashing animation interval if not already running
  if (!this.flashingAnimationInterval) {
    this.flashingAnimationInterval = setInterval(() => {
      this.updateFlashingCellsInDOM();
    }, 500); // Flash every 500ms
  }
}

/**
 * Stop flashing all cells
 */
stopFlashingCells() {
  // Stop the animation interval
  if (this.flashingAnimationInterval) {
    clearInterval(this.flashingAnimationInterval);
    this.flashingAnimationInterval = null;
  }
  
  // Clear flashing state for all cells
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[0].length; x++) {
      if (this.grid[y][x].isFlashing) {
        this.grid[y][x].isFlashing = false;
      }
    }
  }
  
  // Update DOM to stop flashing
  this.updateFlashingCellsInDOM(true);
}

/**
 * Update flashing cells in the DOM
 * @param {boolean} forceVisible - Force cells to be visible (for stopping flash)
 */
updateFlashingCellsInDOM(forceVisible = false) {
  // Find all currently visible cell elements
  const cellElements = document.querySelectorAll('.grid-cell');
  
  cellElements.forEach(cellElement => {
    const x = parseInt(cellElement.dataset.gridX, 10);
    const y = parseInt(cellElement.dataset.gridY, 10);
    
    // Skip if invalid coordinates
    if (isNaN(x) || isNaN(y) || y >= this.grid.length || x >= this.grid[0].length) {
      return;
    }
    
    // Get cell data
    const cell = this.grid[y][x];
    
    // Handle flashing cells
    if (cell.isFlashing) {
      if (forceVisible) {
        // Force visible and stop flashing
        cellElement.style.visibility = 'visible';
        cellElement.classList.remove('eroding-cell');
        cell.isFlashing = false;
      } else {
        // Toggle visibility for flashing effect
        cellElement.classList.add('eroding-cell');
        
        // Toggle the flashing class for better visual effect
        if (cellElement.classList.contains('flash-visible')) {
          cellElement.classList.remove('flash-visible');
        } else {
          cellElement.classList.add('flash-visible');
        }
      }
    } else {
      // Ensure non-flashing cells have normal styles
      cellElement.classList.remove('eroding-cell', 'flash-visible');
    }
  });
}

/**
 * Remove cells from the grid
 * @param {Array} cells - Array of cells to remove
 */
removeCells(cells) {
  // Mark cells for removal in the data model
  cells.forEach(cell => {
    const gridX = 35 + cell.x; // Convert from path coords to grid coords
    const gridY = 35 + cell.y;
    
    // Check if coordinates are within bounds
    if (gridY >= 0 && gridY < this.grid.length && 
        gridX >= 0 && gridX < this.grid[0].length) {
      // Clear flashing state
      this.grid[gridY][gridX].isFlashing = false;
      
      // Clear the cell's letter (the main visual indicator it's gone)
      this.grid[gridY][gridX].letter = '';
      
      // If this is a path cell, only remove letter but keep path flag
      // This ensures path integrity for game logic
    }
  });
  
  // Re-render grid to show removed cells
  this.renderVisibleGrid();
  
  // After a short delay, dispatch an event for island appearance update
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('updateIslandStyling', { 
      detail: { gridRenderer: this }
    }));
  }, 100);
}

/**
 * Get all island cells (with letters)
 * @return {Array} Array of all cells with letters
 */
getIslandCells() {
  const cells = [];
  
  // Get the center point coordinates (35, 35)
  const centerX = 35;
  const centerY = 35;
  
  // Find all cells with letters
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[0].length; x++) {
      if (this.grid[y][x].letter && this.grid[y][x].letter.trim() !== '') {
        cells.push({
          x: x - centerX, // Convert to coordinate system centered at (0,0)
          y: y - centerY,
          letter: this.grid[y][x].letter,
          isPath: this.grid[y][x].isPath
        });
      }
    }
  }
  
  return cells;
}

/**
 * Get all path cells
 * @return {Array} Array of path cells
 */
getPathCells() {
  const cells = [];
  
  // Get the center point coordinates (35, 35)
  const centerX = 35;
  const centerY = 35;
  
  // Find all path cells
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[0].length; x++) {
      if (this.grid[y][x].isPath) {
        cells.push({
          x: x - centerX, // Convert to coordinate system centered at (0,0)
          y: y - centerY,
          letter: this.grid[y][x].letter
        });
      }
    }
  }
  
  return cells;
}

/**
 * Ensure CSS for erosion animation exists
 */
ensureErosionCSSExists() {
  // Check if erosion CSS already exists
  if (document.getElementById('erosion-animation-css')) {
    return;
  }
  
  // Create and add CSS for erosion animation
  const style = document.createElement('style');
  style.id = 'erosion-animation-css';
  style.textContent = `
    /* Styling for cells that are about to be eroded */
    .grid-cell.eroding-cell {
      animation: eroding-pulse 1s infinite alternate;
      transition: background-color 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
      z-index: 8; /* Ensure eroding cells appear above regular cells */
    }
    
    /* Flashing animation */
    @keyframes eroding-pulse {
      0% {
        opacity: 1;
        background-color: var(--defaultblue-light);
        border-color: var(--defaultblue);
      }
      100% {
        opacity: 0.5;
        background-color: var(--maingreen-light);
        border-color: var(--maingreen-dark);
      }
    }
    
    /* Class toggled for flash animation */
    .grid-cell.eroding-cell.flash-visible {
      opacity: 1;
      background-color: var(--sandyellow);
      border-color: var(--sandyellow);
    }
    
    /* Path cells flashing as final warning is higher priority */
    .grid-cell.eroding-cell.path-cell.flash-visible {
      z-index: 10;
      background-color: #ff6b6b !important;
      color: white !important;
      font-weight: bold !important;
      box-shadow: 0 0 8px rgba(255, 0, 0, 0.6) !important;
      transform: scale(1.05);
    }
  `;
  
  // Add to document head
  document.head.appendChild(style);
  console.log('Added erosion animation CSS');
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

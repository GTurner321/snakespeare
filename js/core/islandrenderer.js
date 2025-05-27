/**
 * IslandRenderer - Beach Cell Styling and Sea Icon Support
 * 
 * Handles two main responsibilities:
 * 1. Beach cell styling - applies light blue background and yellow sand borders 
 *    to cells adjacent to islands (cells with letters)
 * 2. Sea icon tooltip support - provides helper methods and tooltip handling
 *    for sea icons that are managed by GridRenderer
 * 
 * Sea icons themselves are now handled directly by GridRenderer during cell
 * creation and move smoothly with CSS transforms like letters do.
 */
class IslandRenderer {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
    // Cell style cache to avoid redundant calculations
    this.cellStyleCache = new Map();
    
    // Track scroll state
    this._scrollInProgress = false;
    
    // Track visible cell bounds to detect newly visible cells
    this._visibleBounds = {
      minX: 0, maxX: 0,
      minY: 0, maxY: 0
    };

    // Add buffer size for pre-styling cells outside view
    this._bufferSize = 4;
    
    // Add critical CSS for beach cells to ensure styles persist during transforms
    this._injectCriticalBeachCellStyles();
    
    // Make this instance available globally for GridRenderer access
    window.islandRenderer = this;
    
    // Initial setup
    this._setupInitialState();
    this.coordWithGridRenderer();
    this._setupEventListeners();
    
    // Initialize sea icon data and tooltip support
    this.initializeSeaIconSupport();
    
    console.log('IslandRenderer initialized - focused on beach styling and sea icon support');
    this.initialized = true;
  }

 /**
 * Initialize sea icon support with Font Awesome SVG icons
 */
initializeSeaIconSupport() {
  console.log('IslandRenderer: Initializing SVG-based sea icon support...');
  
  // Complete sea icon data with your original icons and tooltips
  this.iconData = [
    { icon: 'fa-solid fa-cloud-showers-water', tooltip: "Methinks the heavens are having a weep." },
    { icon: 'fa-solid fa-map', tooltip: "X marks the spot—if ye dare to dream!" },
    { icon: 'fa-solid fa-cloud-bolt', tooltip: "By my troth, the sky throws tantrums." },
    { icon: 'fa-solid fa-person-drowning', tooltip: "He walked the plank… with questionable flair." },
    { icon: 'fa-solid fa-person-swimming', tooltip: "Another bold stroke for Neptune's ledger." },
    { icon: 'fa-solid fa-dharmachakra', tooltip: "Another ship? Or just a wheel of misfortune?" },
    { icon: 'fa-solid fa-compass', tooltip: "North by bardwest, I reckon." },
    { icon: 'fa-solid fa-water', tooltip: "Sea, sea, everywhere—but not a drop for tea." },
    { icon: 'fa-brands fa-octopus-deploy', tooltip: "The kraken sends its compliments." },
    { icon: 'fa-solid fa-skull-crossbones', tooltip: "Avast! A pirate ship on poetic business." },
    { icon: 'fa-solid fa-fish-fins', tooltip: "Enough fish here to feed the whole crew." },
    { icon: 'fa-solid fa-anchor', tooltip: "Droppeth anchor, not thy spirits." },
    { icon: 'fa-solid fa-sailboat', tooltip: "To sail, perchance to drift." },
    { icon: 'fa-solid fa-wine-bottle', tooltip: "A message! Or a mermaid's forgotten flask." },
    { icon: 'fa-solid fa-wind', tooltip: "The wind fancies itself a playwright." }
  ];

  // Track currently visible tooltip
  this.activeTooltip = null;
  this.tooltipTimeout = null;

  // Create tooltip container
  this.createTooltipContainer();
  
  console.log('SVG-based sea icon support initialized with complete icon set');
}
  
  /**
   * Get random icon data for GridRenderer to use
   * @return {Object} Random icon data object
   */
  getRandomIconData() {
    const index = Math.floor(Math.random() * this.iconData.length);
    return this.iconData[index];
  }

  /**
   * Create tooltip container for sea icons
   */
  createTooltipContainer() {
    // Check if tooltip container already exists
    if (document.getElementById('sea-icon-tooltip')) return;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'sea-icon-tooltip';
    tooltip.className = 'sea-icon-tooltip';
    tooltip.style.display = 'none';
    
    // Add to document body
    document.body.appendChild(tooltip);
    console.log('Created sea icon tooltip container');
  }

  /**
   * Handle sea icon click events (called by GridRenderer)
   * @param {Event} e - Click or touch event
   */
 handleSeaIconClick(e) {
  // Prevent the click from propagating to cell selection
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  // Mark this as a sea icon click
  e._seaIconClick = true;
  
  const tooltip = e.currentTarget.dataset.seaTooltip || 
                  e.currentTarget.getAttribute('data-sea-tooltip');
  if (!tooltip) return;
  
  // Check if this tooltip is already showing for this cell
  const isCurrentlyShowing = this.activeTooltip && 
                            this.activeTooltip.textContent === tooltip &&
                            this.activeTooltip.classList.contains('visible');
  
  if (isCurrentlyShowing) {
    // Same icon clicked again - hide the tooltip
    console.log('Same sea icon clicked - hiding tooltip');
    this.hideTooltip();
  } else {
    // Different icon or no tooltip showing - show this tooltip
    console.log('Sea icon clicked - showing tooltip:', tooltip);
    this.showTooltip(tooltip, e.currentTarget);
  }
}
  
/**
 * Show tooltip for sea icon (updated positioning for SVG icons)
 * @param {string} message - Tooltip message
 * @param {HTMLElement} iconElement - Icon element that was clicked
 */
showTooltip(message, iconElement) {
  const tooltipContainer = document.getElementById('sea-icon-tooltip');
  if (!tooltipContainer) return;
  
  // Hide any existing tooltip first
  this.hideTooltip();
  
  // Set tooltip content
  tooltipContainer.textContent = message;
  
  // Get the cell containing the icon for positioning
  const cellElement = iconElement.closest('.grid-cell') || iconElement;
  const rect = cellElement.getBoundingClientRect();
  
  // Position tooltip above the cell
  let left = rect.left + rect.width / 2;
  let top = rect.top - 10;
  
  // Adjust for screen edges
  const padding = 10;
  const tooltipWidth = 220; // max-width from CSS
  
  if (left + tooltipWidth / 2 > window.innerWidth - padding) {
    left = window.innerWidth - tooltipWidth / 2 - padding;
  }
  if (left - tooltipWidth / 2 < padding) {
    left = tooltipWidth / 2 + padding;
  }
  
  tooltipContainer.style.left = `${left}px`;
  tooltipContainer.style.top = `${top}px`;
  tooltipContainer.style.transform = 'translateX(-50%) translateY(-100%)';
  
  // Show tooltip
  tooltipContainer.style.display = 'block';
  requestAnimationFrame(() => {
    tooltipContainer.classList.add('visible');
  });
  
  // Store reference
  this.activeTooltip = tooltipContainer;
  this.activeTooltipIcon = iconElement;
  
  // Hide after 8 seconds
  this.tooltipTimeout = setTimeout(() => {
    this.hideTooltip();
  }, 8000);
  
  console.log('Tooltip shown:', message);
}
  
  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.activeTooltip) {
      this.activeTooltip.classList.remove('visible');
      this.activeTooltip.style.display = 'none';
      this.activeTooltip = null;
      this.activeTooltipCell = null;
    }
    
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

/**
   * Inject critical CSS styles to fix beach cell flashing
   * @private
   */
  _injectCriticalBeachCellStyles() {
    if (document.getElementById('island-renderer-critical-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'island-renderer-critical-styles';
    style.textContent = `
      /* Fix for beach cells during scrolling */
      .grid-cell.sea-adjacent {
        background-color: var(--lightblue) !important;
        position: relative !important;
        z-index: 2 !important;
        will-change: transform !important;
      }
      
      .grid-cell.sea-adjacent.shore-edge-top {
        border-top: 6px solid var(--sandyellow) !important;
      }
      
      .grid-cell.sea-adjacent.shore-edge-right {
        border-right: 6px solid var(--sandyellow) !important;
      }
      
      .grid-cell.sea-adjacent.shore-edge-bottom {
        border-bottom: 6px solid var(--sandyellow) !important;
      }
      
      .grid-cell.sea-adjacent.shore-edge-left {
        border-left: 6px solid var(--sandyellow) !important;
      }
      
      /* Special class to disable transitions during scrolling */
      .grid-cell.sea-adjacent.no-transition {
        transition: none !important;
      }
      
      /* Class for preserved beach cells during transforms */
      .grid-cell.preserved-beach-cell {
        background-color: var(--lightblue) !important;
        z-index: 2 !important;
        transition: none !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('Injected critical beach cell styles');
  }

  /**
   * Initial setup with delayed updates for better loading performance
   * @private
   */
  _setupInitialState() {
    // Perform an initial calculation of styles after a short delay
    setTimeout(() => {
      this._calculateStyles();
      this._applyStyles();
    }, 200);
    
    // Schedule a second update to ensure everything renders correctly
    setTimeout(() => {
      this._calculateStyles();
      this._applyStyles();
    }, 500);
  }

  /**
   * Coordinate with GridRenderer for initial styling
   */
  coordWithGridRenderer() {
    if (!this.gridRenderer) return;
    
    // Force an initial beach cell style calculation when the renderer is ready
    setTimeout(() => {
      this._calculateStyles();
      this._applyStyles(true); // Force application
      console.log("Initial beach cell styling applied");
    }, 300);
    
    // Also do another refresh after everything is loaded
    setTimeout(() => {
      this.refreshBeachCells(true);
    }, 1000);
    
    // Intercept GridRenderer's scroll method to preserve beach cell styles
    this._interceptGridRendererScroll();
  }

  /**
   * Intercept GridRenderer's scroll method to preserve beach cells during transformation
   * This is the key fix for the flashing issue
   * @private
   */
  _interceptGridRendererScroll() {
    if (!this.gridRenderer || !this.gridRenderer.scroll) return;
    
    // Save original scroll method
    const originalScroll = this.gridRenderer.scroll;
    
    // Override the scroll method to preserve beach cell styles during CSS transforms
    this.gridRenderer.scroll = (direction, slowMotion = false) => {
      // BEFORE the transform begins, preserve all beach cell styles
      this._preserveBeachCellStyles();
      
      // Calculate the new offset based on scroll direction
      const newOffsetX = this._calculateNewOffset(direction, 'x');
      const newOffsetY = this._calculateNewOffset(direction, 'y');
      
      // Pre-style cells that will come into view during scrolling
      if (newOffsetX !== null && newOffsetY !== null) {
        this._preStyleBeachCellsForOffset(newOffsetX, newOffsetY);
      }
      
      // Call the original scroll method to perform the transform
      originalScroll.call(this.gridRenderer, direction, slowMotion);
      
      // Calculate transition duration with buffer
      const transitionDuration = slowMotion ? 450 : 250; // Extra 50ms buffer
      
      // For longer transitions, reinforce styles halfway through
      if (slowMotion) {
        setTimeout(() => {
          this._reinforceBeachCellStyles();
        }, transitionDuration / 2);
      }
      
      // After transition completes, restore normal styling
      setTimeout(() => {
        this._restoreBeachCellStyles();
        this._applyBeachCellStyles(true); // Force apply correct styles
      }, transitionDuration + 50);
    };
    
    console.log('Intercepted GridRenderer scroll method for beach cell preservation');
  }
  
  /**
   * Preserve beach cell styles before transform by adding inline styles
   * @private
   */
  _preserveBeachCellStyles() {
    const beachCells = document.querySelectorAll('.grid-cell.sea-adjacent');
    console.log(`Preserving styles for ${beachCells.length} beach cells before transform`);
    
    beachCells.forEach(cell => {
      // Add a marker class to identify preserved cells
      cell.classList.add('preserved-beach-cell');
      
      // Force critical styles as inline with !important to override transitions
      cell.style.setProperty('background-color', 'var(--lightblue)', 'important');
      cell.style.setProperty('transition', 'none', 'important');
      cell.style.setProperty('will-change', 'transform', 'important');
      
      // Add solid borders based on edge classes with !important
      if (cell.classList.contains('shore-edge-top')) {
        cell.style.setProperty('border-top', '6px solid var(--sandyellow)', 'important');
      }
      if (cell.classList.contains('shore-edge-right')) {
        cell.style.setProperty('border-right', '6px solid var(--sandyellow)', 'important');
      }
      if (cell.classList.contains('shore-edge-bottom')) {
        cell.style.setProperty('border-bottom', '6px solid var(--sandyellow)', 'important');
      }
      if (cell.classList.contains('shore-edge-left')) {
        cell.style.setProperty('border-left', '6px solid var(--sandyellow)', 'important');
      }
    });
  }
  
  /**
   * Reinforce beach cell styles during long transitions
   * @private
   */
  _reinforceBeachCellStyles() {
    const preservedCells = document.querySelectorAll('.preserved-beach-cell');
    preservedCells.forEach(cell => {
      // Re-apply critical styles to ensure they don't get lost during animation
      cell.style.setProperty('background-color', 'var(--lightblue)', 'important');
      
      // Re-apply borders if needed
      if (cell.classList.contains('shore-edge-top')) {
        cell.style.setProperty('border-top', '6px solid var(--sandyellow)', 'important');
      }
      if (cell.classList.contains('shore-edge-right')) {
        cell.style.setProperty('border-right', '6px solid var(--sandyellow)', 'important');
      }
      if (cell.classList.contains('shore-edge-bottom')) {
        cell.style.setProperty('border-bottom', '6px solid var(--sandyellow)', 'important');
      }
      if (cell.classList.contains('shore-edge-left')) {
        cell.style.setProperty('border-left', '6px solid var(--sandyellow)', 'important');
      }
    });
  }
  
  /**
   * Restore class-based styling after transform animation completes
   * @private
   */
  _restoreBeachCellStyles() {
    const preservedCells = document.querySelectorAll('.preserved-beach-cell');
    
    preservedCells.forEach(cell => {
      // Remove inline styles and marker class
      cell.classList.remove('preserved-beach-cell');
      
      // Remove inline styles
      cell.style.removeProperty('background-color');
      cell.style.removeProperty('transition');
      cell.style.removeProperty('will-change');
      cell.style.removeProperty('border-top');
      cell.style.removeProperty('border-right');
      cell.style.removeProperty('border-bottom');
      cell.style.removeProperty('border-left');
    });
  }

  /**
   * Calculate new offset based on scroll direction
   * @param {string} direction - Scroll direction ('up', 'right', 'down', 'left')
   * @param {string} axis - Axis to calculate for ('x' or 'y')
   * @return {number|null} The new offset value or null if invalid
   * @private
   */
  _calculateNewOffset(direction, axis) {
    if (!this.gridRenderer || !this.gridRenderer.viewOffset) return null;
    
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.gridRenderer.options.gridWidthSmall : this.gridRenderer.options.gridWidth;
    const height = isMobile ? this.gridRenderer.options.gridHeightSmall : this.gridRenderer.options.gridHeight;
    
    let newOffset = this.gridRenderer.viewOffset[axis];
    
    if (axis === 'x') {
      if (direction === 'left') {
        newOffset = Math.max(0, this.gridRenderer.viewOffset.x - 1);
      } else if (direction === 'right') {
        newOffset = Math.min(
          this.gridRenderer.fullGridSize - width,
          this.gridRenderer.viewOffset.x + 1
        );
      }
    } else if (axis === 'y') {
      if (direction === 'up') {
        newOffset = Math.max(0, this.gridRenderer.viewOffset.y - 1);
      } else if (direction === 'down') {
        newOffset = Math.min(
          this.gridRenderer.fullGridSize - height,
          this.gridRenderer.viewOffset.y + 1
        );
      }
    }
    
    return newOffset;
  }
  
  /**
   * Pre-style beach cells for a specific target offset
   * This ensures cells that will come into view are already styled correctly
   * @param {number} targetOffsetX - Target X offset after scrolling
   * @param {number} targetOffsetY - Target Y offset after scrolling
   * @private
   */
  _preStyleBeachCellsForOffset(targetOffsetX, targetOffsetY) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return;
    
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.gridRenderer.options.gridWidthSmall : this.gridRenderer.options.gridWidth;
    const height = isMobile ? this.gridRenderer.options.gridHeightSmall : this.gridRenderer.options.gridHeight;
    
    // Calculate the new visible area that will appear after scrolling
    const newVisibleArea = {
      minX: targetOffsetX,
      maxX: targetOffsetX + width,
      minY: targetOffsetY,
      maxY: targetOffsetY + height
    };
    
    // Determine cells that will be newly visible
    const xDiff = targetOffsetX - this.gridRenderer.viewOffset.x;
    const yDiff = targetOffsetY - this.gridRenderer.viewOffset.y;
    const newCells = [];
    
    // Check horizontal movement
    if (xDiff > 0) { // Moving right
      for (let x = this._visibleBounds.maxX; x < newVisibleArea.maxX; x++) {
        for (let y = newVisibleArea.minY; y < newVisibleArea.maxY; y++) {
          newCells.push({x, y});
        }
      }
    } else if (xDiff < 0) { // Moving left
      for (let x = newVisibleArea.minX; x < this._visibleBounds.minX; x++) {
        for (let y = newVisibleArea.minY; y < newVisibleArea.maxY; y++) {
          newCells.push({x, y});
        }
      }
    }
    
    // Check vertical movement
    if (yDiff > 0) { // Moving down
      for (let y = this._visibleBounds.maxY; y < newVisibleArea.maxY; y++) {
        for (let x = newVisibleArea.minX; x < newVisibleArea.maxX; x++) {
          if (!newCells.some(cell => cell.x === x && cell.y === y)) {
            newCells.push({x, y});
          }
        }
      }
    } else if (yDiff < 0) { // Moving up
      for (let y = newVisibleArea.minY; y < this._visibleBounds.minY; y++) {
        for (let x = newVisibleArea.minX; x < newVisibleArea.maxX; x++) {
          if (!newCells.some(cell => cell.x === x && cell.y === y)) {
            newCells.push({x, y});
          }
        }
      }
    }
    
    // For each new cell, check if it needs beach cell styling
    newCells.forEach(({x, y}) => {
      // Skip if outside grid bounds
      if (y < 0 || y >= this.gridRenderer.grid.length || 
          x < 0 || x >= this.gridRenderer.grid[0].length) {
        return;
      }
      
      // Skip if this is a path/island cell
      if (this.isCellPath(x, y) || this.cellHasLetter(x, y)) {
        return;
      }
      
      // Check if this cell should be a beach cell
      const adjacentDirections = this.getAdjacentLetterCells(x, y);
      if (adjacentDirections.length > 0) {
        // Check if the cell element already exists
        const cellElement = document.querySelector(`.grid-cell[data-grid-x="${x}"][data-grid-y="${y}"]`);
        if (cellElement) {
          // Add beach cell styles with inline properties for transform persistence
          cellElement.classList.add('sea-adjacent', 'preserved-beach-cell');
          cellElement.style.setProperty('background-color', 'var(--lightblue)', 'important');
          
          // Add specific edge classes and styles
          adjacentDirections.forEach(direction => {
            cellElement.classList.add(`shore-edge-${direction}`);
            
            // Add inline styles for the borders
            switch(direction) {
              case 'top':
                cellElement.style.setProperty('border-top', '6px solid var(--sandyellow)', 'important');
                break;
              case 'right':
                cellElement.style.setProperty('border-right', '6px solid var(--sandyellow)', 'important');
                break;
              case 'bottom':
                cellElement.style.setProperty('border-bottom', '6px solid var(--sandyellow)', 'important');
                break;
              case 'left':
                cellElement.style.setProperty('border-left', '6px solid var(--sandyellow)', 'important');
                break;
            }
          });
        }
      }
    });
  }

/**
   * Set up event listeners for beach cell styling
   * Much simplified - only handles beach cell updates, no sea icon management
   */
  _setupEventListeners() {
    // Track scroll events to pause updates during scrolling
    document.addEventListener('gridScrollStarted', (e) => {
      this._scrollInProgress = true;
      
      // Update visible bounds immediately when scrolling starts
      this._updateVisibleBounds();
      
      // Pre-calculate and apply beach cell styles with a larger buffer before scrolling
      this._calculateStyles();
      this._applyBeachCellStyles(true);
      
      // Hide any active tooltips during scrolling
      this.hideTooltip();
      
      console.log('Scroll started - beach cells preserved during transform');
    });
    
    document.addEventListener('gridScrolled', (e) => {
      // Keep track that scrolling is in progress
      this._scrollInProgress = true;
      
      // Update visible bounds
      this._updateVisibleBounds();
    });
    
    // Listen for grid rebuild events (which happen during scrolling)
    document.addEventListener('gridRebuilt', (e) => {
      // Update visible bounds
      this._updateVisibleBounds();
      
      // Only handle beach cell styling during grid rebuilds
      if (e.detail.isScrolling) {
        console.log('Grid rebuilt during scrolling - maintaining beach cell styles');
        // Only handle beach cell styling during scrolling
        setTimeout(() => {
          this._applyBeachCellStyles(true);
        }, 0);
        return;
      }
      
      // Process beach cells after grid is rebuilt (non-scrolling)
      requestAnimationFrame(() => {
        this._calculateStyles();
        this._applyStyles();
      });
    });
    
    document.addEventListener('gridScrollComplete', () => {
      this._scrollInProgress = false;
      
      // Update styles after scroll completes
      this._updateVisibleBounds();
      
      requestAnimationFrame(() => {
        this._calculateStyles();
        this._applyStyles();
      });
    });
    
    // Event categories for different processing approaches
    const immediateEvents = [
      'pathSet',
      'islandLettersUpdated',
      'islandReductionLevelChanged'
    ];
    
    const delayedEvents = [
      'gridCompletionChanged', 
      'selectionsCleared'
    ];
    
    // Handle high-priority events immediately
    immediateEvents.forEach(eventName => {
      document.addEventListener(eventName, () => {
        // Don't update during scrolling
        if (this._scrollInProgress) {
          console.log(`Skipping ${eventName} update during scroll`);
          return;
        }
        
        // Update on next animation frame
        requestAnimationFrame(() => {
          this._calculateStyles();
          this._applyStyles();
        });
      });
    });
    
    // Handle lower-priority events with debouncing
    let updateTimeoutId = null;
    delayedEvents.forEach(eventName => {
      document.addEventListener(eventName, () => {
        // Don't update during scrolling
        if (this._scrollInProgress) {
          console.log(`Skipping ${eventName} update during scroll`);
          return;
        }
        
        // Clear existing timeout to debounce multiple events
        if (updateTimeoutId) {
          clearTimeout(updateTimeoutId);
        }
        
        // Schedule update with delay
        updateTimeoutId = setTimeout(() => {
          requestAnimationFrame(() => {
            this._calculateStyles();
            this._applyStyles();
          });
        }, 100);
      });
    });
    
    // Handle explicit update requests
    document.addEventListener('updateIslandStyling', () => {
      if (this._scrollInProgress) {
        console.log('Skipping island styling update during scroll');
        return;
      }
      
      requestAnimationFrame(() => {
        this._calculateStyles();
        this._applyStyles();
      });
    });
    
    // Grid created event handler
    document.addEventListener('gridCreated', (e) => {
      console.log('IslandRenderer: Grid created event detected');
      setTimeout(() => {
        this._calculateStyles();
        this._applyStyles(true);
      }, 400);
    });
    
    // Enhanced click handler to hide tooltips when clicking elsewhere
    document.addEventListener('click', (e) => {
      // Don't hide tooltip during scrolling
      if (this._scrollInProgress) return;
      
      // Don't hide tooltip if this was a sea icon click
      if (e._seaIconClick) {
        return;
      }
      
      // Check if click was on a sea icon cell or its pseudo-element
      const isSeaIconClick = e.target.closest('.has-sea-icon') || 
                            e.target.classList.contains('has-sea-icon');
      
      if (!isSeaIconClick) {
        this.hideTooltip();
      }
    }, true); // Use capture phase to handle before other listeners
    
    // Touch handler for hiding tooltips on touch devices
    document.addEventListener('touchend', (e) => {
      // Don't hide tooltip during scrolling
      if (this._scrollInProgress) return;
      
      // Don't hide tooltip if this was a sea icon touch
      if (e._seaIconClick) {
        return;
      }
      
      // Check if touch was on a sea icon cell
      const touchTarget = document.elementFromPoint(
        e.changedTouches[0].clientX, 
        e.changedTouches[0].clientY
      );
      
      const isSeaIconTouch = touchTarget && (
        touchTarget.closest('.has-sea-icon') || 
        touchTarget.classList.contains('has-sea-icon')
      );
      
      if (!isSeaIconTouch) {
        this.hideTooltip();
      }
    }, true); // Use capture phase to handle before other listeners
        
    console.log('IslandRenderer: Event listeners set up - focused on beach cell styling');
  }
  
  /**
   * Calculate current visible bounds of the grid
   * @private
   */
  _updateVisibleBounds() {
    if (!this.gridRenderer) return;
    
    const viewOffset = this.gridRenderer.viewOffset || { x: 0, y: 0 };
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.gridRenderer.options.gridWidthSmall : this.gridRenderer.options.gridWidth;
    const height = isMobile ? this.gridRenderer.options.gridHeightSmall : this.gridRenderer.options.gridHeight;
    
    this._visibleBounds = {
      minX: viewOffset.x,
      maxX: viewOffset.x + width,
      minY: viewOffset.y,
      maxY: viewOffset.y + height
    };
  }
    
  /**
   * Calculate styles for all visible cells
   * @private
   */
  _calculateStyles() {
    if (!this.gridRenderer || !this.gridRenderer.grid) {
      return;
    }
    
    // Clear existing cache
    const newStyleCache = new Map();
    
    // Process all cells in visible bounds AND a buffer zone
    for (let y = this._visibleBounds.minY - this._bufferSize; y < this._visibleBounds.maxY + this._bufferSize; y++) {
      for (let x = this._visibleBounds.minX - this._bufferSize; x < this._visibleBounds.maxX + this._bufferSize; x++) {
        if (y < 0 || y >= this.gridRenderer.grid.length || 
            x < 0 || x >= this.gridRenderer.grid[0].length) {
          continue;
        }
        
        // Get cell's style configuration
        const styleConfig = this._getCellStyleConfig(x, y);
        
        // Also pre-calculate sea-adjacent (shore) cells
        if (!styleConfig.isPathCell) {
          const adjacentDirections = this.getAdjacentLetterCells(x, y);
          if (adjacentDirections.length > 0) {
            styleConfig.isSeaAdjacent = true;
            styleConfig.shoreEdges = adjacentDirections;
          }
        }
        
        // Store in cache
        newStyleCache.set(`${x},${y}`, styleConfig);
      }
    }
    
    // Replace cache atomically
    this.cellStyleCache = newStyleCache;
  }
    
  /**
   * Apply cached styles to DOM elements
   * @param {boolean} force - Force application even during scrolling
   * @private
   */
  _applyStyles(force = false) {
    // Get all visible cells in the DOM
    const cells = document.querySelectorAll('.grid-cell');
    
    // Process each visible cell
    cells.forEach(cellElement => {
      // Get cell coordinates
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      if (isNaN(x) || isNaN(y)) {
        return;
      }
      
      // Get cached style configuration
      const cacheKey = `${x},${y}`;
      const styleConfig = this.cellStyleCache.get(cacheKey);
      
      // Skip if no style config found and not forced
      if (!styleConfig && !force) return;
      
      // Apply shore styles even during scrolling to maintain continuity
      if (styleConfig && styleConfig.isSeaAdjacent) {
        this._applyShoreStyles(cellElement, styleConfig);
        return;
      }
      
      // For non-shore cells, only apply styles if not scrolling or if forced
      if (force || !this._scrollInProgress) {
        // If we have a style config, apply it
        if (styleConfig) {
          this._applyStyleConfig(cellElement, styleConfig);
        } 
        // If forced but no style config, check adjacency directly
        else if (force) {
          const adjacentDirections = this.getAdjacentLetterCells(x, y);
          if (adjacentDirections.length > 0) {
            const newStyleConfig = {
              isSeaAdjacent: true,
              shoreEdges: adjacentDirections
            };
            this._applyShoreStyles(cellElement, newStyleConfig);
            // Cache this result for future use
            this.cellStyleCache.set(cacheKey, newStyleConfig);
          }
        }
      }
    });
  }

  /**
   * Apply beach cell styles directly to DOM
   * @param {boolean} force - Force application even during scrolling
   * @private
   */
  _applyBeachCellStyles(force = false) {
    if (!this.gridRenderer || !this.gridRenderer.grid || (!force && this._scrollInProgress)) {
      return;
    }
    
    const cells = document.querySelectorAll('.grid-cell');
    
    cells.forEach(cellElement => {
      // Get cell coordinates
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      if (isNaN(x) || isNaN(y)) {
        return;
      }
      
      // Skip if this cell is a path cell or has a letter - focus only on potential beach cells
      if (cellElement.classList.contains('path-cell')) {
        return;
      }
      
      // Check if this should be a beach cell by looking for adjacent letter cells
      const adjacentDirections = this.getAdjacentLetterCells(x, y);
      
      if (adjacentDirections.length > 0) {
        // This should be a beach cell
        cellElement.classList.add('sea-adjacent');
        
        // Remove any existing shore edge classes first
        cellElement.classList.remove(
          'shore-edge-top', 
          'shore-edge-right', 
          'shore-edge-bottom', 
          'shore-edge-left'
        );
        
        // Add specific edge classes
        adjacentDirections.forEach(direction => {
          cellElement.classList.add(`shore-edge-${direction}`);
        });
        
        // During scrolling, disable transitions
        if (this._scrollInProgress) {
          cellElement.classList.add('no-transition');
        } else {
          cellElement.classList.remove('no-transition');
        }
      } else {
        // Not a beach cell, remove sea-adjacent class if present
        cellElement.classList.remove(
          'sea-adjacent',
          'shore-edge-top',
          'shore-edge-right',
          'shore-edge-bottom',
          'shore-edge-left',
          'no-transition'
        );
      }
    });
  }

  /**
   * Apply shore/beach specific styles to cell element
   * @param {HTMLElement} cellElement - Cell DOM element
   * @param {Object} styleConfig - Style configuration
   * @private
   */
  _applyShoreStyles(cellElement, styleConfig) {
    // Add sea-adjacent class
    cellElement.classList.add('sea-adjacent');
    
    // During scrolling, disable transitions for better performance
    if (this._scrollInProgress) {
      cellElement.classList.add('no-transition');
    } else {
      cellElement.classList.remove('no-transition');
    }
    
    // Clear existing edge classes
    cellElement.classList.remove(
      'shore-edge-top',
      'shore-edge-right',
      'shore-edge-bottom',
      'shore-edge-left'
    );
    
    // Add edge-specific classes
    styleConfig.shoreEdges.forEach(direction => {
      cellElement.classList.add(`shore-edge-${direction}`);
    });
  }
    
  /**
   * Get style configuration for a cell based on its state
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {Object} Style configuration for the cell
   * @private
   */
  _getCellStyleConfig(x, y) {
    // Base configuration
    const config = {
      isPathCell: false,
      isSeaAdjacent: false,
      shoreEdges: []
    };
    
    // Check if cell has a letter or is a path cell
    const hasLetter = this.cellHasLetter(x, y);
    const isPath = this.isCellPath(x, y);
    
    // Island cells (path or letter cells)
    if (isPath || hasLetter) {
      config.isPathCell = true;
      return config;
    }
    
    // Check if this is a sea cell adjacent to an island
    const adjacentDirections = this.getAdjacentLetterCells(x, y);
    if (adjacentDirections.length > 0) {
      config.isSeaAdjacent = true;
      config.shoreEdges = adjacentDirections;
    }
    
    return config;
  }

  /**
   * Apply style configuration to a cell element
   * @param {HTMLElement} cellElement - Cell DOM element
   * @param {Object} styleConfig - Style configuration
   * @private
   */
  _applyStyleConfig(cellElement, styleConfig) {
    // Reset classes we manage
    cellElement.classList.remove(
      'path-cell',
      'sea-adjacent',
      'shore-edge-top',
      'shore-edge-right',
      'shore-edge-bottom',
      'shore-edge-left',
      'no-transition'
    );
    
    // Apply path-cell class if needed
    if (styleConfig.isPathCell) {
      cellElement.classList.add('path-cell');
      return;
    }
    
    // Apply sea adjacent styling if needed
    if (styleConfig.isSeaAdjacent) {
      cellElement.classList.add('sea-adjacent');
      
      // During scrolling, disable transitions
      if (this._scrollInProgress) {
        cellElement.classList.add('no-transition');
      }
      
      // Apply shore edge classes
      styleConfig.shoreEdges.forEach(direction => {
        cellElement.classList.add(`shore-edge-${direction}`);
      });
    }
  }

  /**
   * Get a list of directions where adjacent cells have letters
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {Array} Array of directions ('top', 'right', 'bottom', 'left')
   */
  getAdjacentLetterCells(x, y) {
    const directions = [];
    
    // Check cell above
    if (this.cellHasLetter(x, y-1) || this.isCellPath(x, y-1)) {
      directions.push('top');
    }
    
    // Check cell to the right
    if (this.cellHasLetter(x+1, y) || this.isCellPath(x+1, y)) {
      directions.push('right');
    }
    
    // Check cell below
    if (this.cellHasLetter(x, y+1) || this.isCellPath(x, y+1)) {
      directions.push('bottom');
    }
    
    // Check cell to the left
    if (this.cellHasLetter(x-1, y) || this.isCellPath(x-1, y)) {
      directions.push('left');
    }
    
    return directions;
  }

  /**
   * Check if a cell has any letter (path or random)
   */
  cellHasLetter(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    // Check if the cell has a non-empty letter
    const cell = this.gridRenderer.grid[y][x];
    return cell && cell.letter && cell.letter.trim() !== '';
  }

  /**
   * Check if a cell is a path cell
   */
  isCellPath(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    // Check if this cell is part of the path
    return this.gridRenderer.grid[y][x].isPath;
  }

  /**
   * Public method to update beach cell appearance
   * Maintained for backwards compatibility
   */
  updateIslandAppearance() {
    // Skip if scrolling in progress
    if (this._scrollInProgress) return;
    
    // Use animation frame for better performance
    requestAnimationFrame(() => {
      this._calculateStyles();
      this._applyStyles();
    });
  }
  
  /**
   * Refresh beach cell rendering - Public API for forced updates
   * @param {boolean} force - Force immediate update even during scrolling
   */
  refreshBeachCells(force = false) {
    // Skip if scrolling in progress and not forced
    if (this._scrollInProgress && !force) return;
    
    console.log("Refreshing beach cell appearance" + (force ? " (forced)" : ""));
    
    // Update visible bounds
    this._updateVisibleBounds();
    
    // Calculate styles for all cells including beach cells
    this._calculateStyles();
    
    // Apply beach cell styles with forced application
    this._applyBeachCellStyles(true);
    
    // Then apply all other styles
    this._applyStyles(force);
  }
}

export default IslandRenderer;

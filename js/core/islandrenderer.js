/**
 * IslandRenderer - Enhanced with direct style preservation
 * Fixes beach cell flashing issues during scroll by preserving styles during CSS transforms
 */

/**
 * IslandRenderer - Enhanced with direct style preservation and sea icons
 * Fixes beach cell flashing issues during scroll and adds nautical icons to deep sea
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

    // ENHANCED: Add buffer size for pre-styling cells outside view
    this._bufferSize = 4; // Increased from 3 to ensure smoother scrolling
    
    // Add critical CSS for beach cells to ensure styles persist during transforms
    this._injectCriticalBeachCellStyles();
    
    // Make this instance available globally for direct access
    window.islandRenderer = this;
    
    // Initial setup with delayed updates
    this._setupInitialState();

    this.coordWithGridRenderer();
    
    // Set up optimized event listeners
    this._setupEventListeners();
    
    // SEA ICONS INTEGRATION: Initialize sea icons functionality
    this.initializeSeaIcons();
    
    console.log('IslandRenderer initialized with enhanced beach cell style preservation and sea icons');
    this.initialized = true;
  }

/**
 * Initialize sea icons functionality
 */
initializeSeaIcons() {
  console.log('IslandRenderer: Initializing sea icons functionality...');
  
  // Set of Font Awesome nautical icons to use with their tooltips
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

  // Chance of a sea cell having an icon (1 in 20)
  this.iconChance = 0.05;

  // Map to track which cells have icons
  this.cellsWithIcons = new Map();

  // Add CSS for nautical icons and tooltips
  this.addIconStyles();
  
  // Create tooltip container once
  this.createTooltipContainer();
  
  // Initial icon application with delay to ensure grid is ready
  setTimeout(() => {
    this.applyIcons();
    console.log('IslandRenderer: Applied sea icons during initialization');
  }, 800);
  
  // Set up interval to periodically check for new deep sea cells
  this.checkInterval = setInterval(() => this.applyIcons(), 2000);
}
  
  /**
   * NEW: Inject critical CSS styles to fix beach cell flashing
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
 * Add CSS styles for sea icons and tooltips
 */
addIconStyles() {
  if (document.getElementById('sea-icons-css')) return;
  
  const style = document.createElement('style');
  style.id = 'sea-icons-css';
  style.textContent = `
    /* Icon styles */
    .sea-icon {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      color: #444444 !important; /* Dark grey instead of blue */
      font-size: 22px !important;
      opacity: 0.7 !important;
      z-index: 50 !important;
      pointer-events: auto !important;
      text-shadow: 0 0 2px rgba(255, 255, 255, 0.3) !important;
      user-select: none !important;
      background: transparent !important;
      cursor: help !important;
    }
    
    /* Add subtle animation to make icons feel alive */
    @keyframes float {
      0% { transform: translate(-50%, -50%) rotate(0deg) !important; }
      50% { transform: translate(-50%, -50%) rotate(5deg) !important; }
      100% { transform: translate(-50%, -50%) rotate(0deg) !important; }
    }
    
    .sea-icon {
      animation: float 3s ease-in-out infinite !important;
    }
    
    /* Different animation timing for variety */
    .sea-icon:nth-child(odd) {
      animation-duration: 4s !important;
      animation-delay: 1s !important;
    }
    
    /* Tooltip styles - post-it note style */
    .sea-icon-tooltip {
      position: absolute;
      background-color: rgba(255, 246, 122, 0.9); /* Muted yellow with transparency */
      color: #444444; /* Dark grey text */
      padding: 10px 15px;
      border-radius: 2px; /* Less rounded for post-it look */
      font-size: 14px;
      max-width: 200px;
      text-align: center;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-style: italic;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      /* Add subtle post-it shadow and border */
      border: 1px solid rgba(180, 160, 60, 0.5);
    }
    
    .sea-icon-tooltip.visible {
      opacity: 1;
    }
    
    /* Remove tooltip arrow - no speech bubble effect */
    /* .sea-icon-tooltip:after { ... } - removed */
  `;
  
  document.head.appendChild(style);
  console.log('IslandRenderer: Added sea icon styles to document');
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
  console.log('IslandRenderer: Created sea icon tooltip container');
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
    
    // Force an initial island style calculation when the renderer is ready
    setTimeout(() => {
      this._calculateStyles();
      this._applyStyles(true); // Force application
      console.log("Initial island styling applied");
    }, 300);
    
    // Also do another refresh after everything is loaded
    setTimeout(() => {
      this.refreshIsland(true);
    }, 1000);
    
    // CRITICAL FIX: Intercept GridRenderer's scroll method to preserve beach cell styles
    this._interceptGridRendererScroll();
  }

  /**
   * NEW: Intercept GridRenderer's scroll method to preserve beach cells during transformation
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
   * NEW: Preserve beach cell styles before transform by adding inline styles
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
   * NEW: Reinforce beach cell styles during long transitions
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
   * NEW: Restore class-based styling after transform animation completes
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
   * NEW: Pre-style beach cells for a specific target offset
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
 * Set up optimized event listeners with scroll awareness
 * Handles both beach cell styling and sea icons
 * @private
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
    
    // Hide sea icons during scrolling to improve performance
    const seaIcons = document.querySelectorAll('.sea-icon');
    seaIcons.forEach(icon => {
      icon.style.opacity = '0';
    });
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
    
    // If a rebuild happens during scrolling, ensure beach cells are styled
    if (e.detail.isScrolling) {
      setTimeout(() => {
        this._applyBeachCellStyles(true);
      }, 0);
    } else {
      // Only process if not during a scroll
      requestAnimationFrame(() => {
        this._calculateStyles();
        this._applyStyles();
        
        // Apply sea icons after grid is rebuilt
        setTimeout(() => this.applyIcons(), 100);
      });
    }
  });
  
document.addEventListener('gridScrollComplete', () => {
  this._scrollInProgress = false;
  
  // Update styles after scroll completes
  this._updateVisibleBounds();
  
  requestAnimationFrame(() => {
    this._calculateStyles();
    this._applyStyles();
    
    // Ensure sea icons are visible again after scroll
    const seaIcons = document.querySelectorAll('.sea-icon');
    seaIcons.forEach(icon => {
      icon.style.opacity = '0.7'; // Make icons visible
    });
    
    // Apply sea icons after scroll completes
    setTimeout(() => this.applyIcons(), 200);
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
      if (this._scrollInProgress) return;
      
      // Update on next animation frame
      requestAnimationFrame(() => {
        this._calculateStyles();
        this._applyStyles();
        
        // Update sea icons after high-priority events
        setTimeout(() => this.applyIcons(), 100);
      });
    });
  });
  
  // Handle lower-priority events with debouncing
  let updateTimeoutId = null;
  delayedEvents.forEach(eventName => {
    document.addEventListener(eventName, () => {
      // Don't update during scrolling
      if (this._scrollInProgress) return;
      
      // Clear existing timeout to debounce multiple events
      if (updateTimeoutId) {
        clearTimeout(updateTimeoutId);
      }
      
      // Schedule update with delay
      updateTimeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          this._calculateStyles();
          this._applyStyles();
          
          // Update sea icons after delayed events
          setTimeout(() => this.applyIcons(), 100);
        });
      }, 100);
    });
  });
  
  // Handle explicit update requests
  document.addEventListener('updateIslandStyling', () => {
    if (this._scrollInProgress) return;
    
    requestAnimationFrame(() => {
      this._calculateStyles();
      this._applyStyles();
      
      // Update sea icons after explicit styling requests
      setTimeout(() => this.applyIcons(), 100);
    });
  });
  
  // Listen for grid created events (initial setup)
  document.addEventListener('gridCreated', (e) => {
    console.log('IslandRenderer: Grid created event detected');
    setTimeout(() => {
      this._calculateStyles();
      this._applyStyles(true);
      this.applyIcons();
    }, 200);
  });
  
  console.log('IslandRenderer: Event listeners set up for beach cells and sea icons');
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
   * Check if cell coordinates are currently visible
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {boolean} True if cell is visible
   * @private
   */
  _isCellVisible(x, y) {
    return x >= this._visibleBounds.minX && 
           x < this._visibleBounds.maxX && 
           y >= this._visibleBounds.minY && 
           y < this._visibleBounds.maxY;
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
   * Apply beach cell styles directly to DOM - focused implementation that only handles beach cells
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
 * Public method to update island appearance
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
 * Get random icon data from the icon set
 * @return {Object} Random icon data with icon class and tooltip
 */
getRandomIconData() {
  const index = Math.floor(Math.random() * this.iconData.length);
  return this.iconData[index];
}

/**
 * Check if a color is a deep blue sea color
 * @param {string} backgroundColor - CSS color value
 * @return {boolean} True if this is a deep blue sea color
 */
isDeepBlueSeaColor(backgroundColor) {
  // Check for the default blue sea color
  if (!backgroundColor) return false;
  
  // Convert rgb/rgba to lowercase for consistent comparison
  const colorStr = backgroundColor.toLowerCase();
  
  // Check for any of the default blue variations
  const isDefaultBlue = 
    colorStr === 'rgb(86, 165, 214)' || // var(--defaultblue)
    colorStr === 'rgb(74, 145, 187)' || // var(--defaultblue-dark)
    colorStr === 'rgb(58, 130, 173)' || // var(--defaultblue-darker)
    colorStr === '#56a5d6' ||
    colorStr === '#4a91bb';
  
  // If exact match for default blue colors
  if (isDefaultBlue) return true;
  
  // Also check RGB components for bluish colors
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    
    // Check if it's a blue color (blue component much higher than others)
    return r < 120 && g < 180 && b > 160 && b > (r + g) / 2;
  }
  
  return false;
}

/**
 * Setup tooltip events for an icon element
 * @param {HTMLElement} iconElement - The icon element to attach events to
 */
setupTooltipEvents(iconElement) {
  const tooltipContainer = document.getElementById('sea-icon-tooltip');
  if (!tooltipContainer) return;
  
  // Mouse enter - show tooltip
  iconElement.addEventListener('mouseenter', (e) => {
    const tooltip = e.target.getAttribute('data-tooltip');
    if (!tooltip) return;
    
    // Set tooltip content
    tooltipContainer.textContent = tooltip;
    
    // Position tooltip above the icon
    const rect = iconElement.getBoundingClientRect();
    tooltipContainer.style.left = `${rect.left + rect.width / 2}px`;
    tooltipContainer.style.top = `${rect.top - 10 - tooltipContainer.offsetHeight}px`;
    
    // Make tooltip visible
    tooltipContainer.style.display = 'block';
    tooltipContainer.classList.add('visible');
    
    // Ensure icon remains visible
    iconElement.style.opacity = '0.8'; // Slightly boost opacity when hovered
  });
  
  // Mouse leave - hide tooltip immediately
  iconElement.addEventListener('mouseleave', () => {
    // Remove visible class
    tooltipContainer.classList.remove('visible');
    
    // Hide the tooltip immediately
    tooltipContainer.style.display = 'none';
    
    // Return icon to normal opacity
    iconElement.style.opacity = '0.7';
  });
}
  
/**
 * Refresh island rendering - Public API for forced updates
 * @param {boolean} force - Force immediate update even during scrolling
 */
refreshIsland(force = false) {
  // Skip if scrolling in progress and not forced
  if (this._scrollInProgress && !force) return;
  
  console.log("Refreshing island appearance" + (force ? " (forced)" : ""));
  
  // Update visible bounds
  this._updateVisibleBounds();
  
  // Calculate styles for all cells including beach cells
  this._calculateStyles();
  
  // Apply beach cell styles with forced application
  this._applyBeachCellStyles(true);
  
  // Then apply all other styles
  this._applyStyles(force);
}

/**
 * Apply icons to deep sea cells
 * This should be called after grid updates
 */
applyIcons() {
  // Get the grid element
  const gridElement = this.gridRenderer.gridElement;
  if (!gridElement) {
    console.warn('IslandRenderer: Grid element not found for sea icons');
    return;
  }

  console.log('IslandRenderer: Applying sea icons to deep sea cells');

  // Get all grid cells and check for deep sea conditions
  const allCells = gridElement.querySelectorAll('.grid-cell');
  
  let deepSeaCount = 0;
  let iconedCellCount = 0;

  // Process each cell
  allCells.forEach(cellElement => {
    const x = parseInt(cellElement.dataset.gridX, 10);
    const y = parseInt(cellElement.dataset.gridY, 10);
    
    // Skip if invalid coordinates
    if (isNaN(x) || isNaN(y)) return;
    
    const cellKey = `${x},${y}`;
    
    // Check for deep sea color
    const computedStyle = window.getComputedStyle(cellElement);
    const backgroundColor = computedStyle.backgroundColor;
    
    // Check if this is a deep sea cell by color and classes
    const isDeepSeaCell = this.isDeepBlueSeaColor(backgroundColor) && 
                         !cellElement.classList.contains('sea-adjacent') &&
                         !cellElement.classList.contains('path-cell') &&
                         !cellElement.classList.contains('selected-cell') &&
                         !cellElement.classList.contains('start-cell');
    
    if (!isDeepSeaCell) {
      // If not a deep sea cell, remove any existing icon
      const existingIcon = cellElement.querySelector('.sea-icon');
      if (existingIcon) {
        cellElement.removeChild(existingIcon);
        this.cellsWithIcons.delete(cellKey);
      }
      return;
    }
    
    // Count deep sea cells for debugging
    deepSeaCount++;
    
    // Check if this cell already has an icon decision
    if (!this.cellsWithIcons.has(cellKey)) {
      // Make a random decision: should this cell have an icon?
      const shouldHaveIcon = Math.random() < this.iconChance;
      
      // Store the decision and icon
      if (shouldHaveIcon) {
        this.cellsWithIcons.set(cellKey, {
          hasIcon: true,
          iconData: this.getRandomIconData()
        });
      } else {
        this.cellsWithIcons.set(cellKey, { hasIcon: false });
      }
    }
    
    // Get the cell's icon status
    const cellIconInfo = this.cellsWithIcons.get(cellKey);
    
    // Check if cell should have an icon
    if (cellIconInfo && cellIconInfo.hasIcon) {
      // See if icon already exists
      let iconElement = cellElement.querySelector('.sea-icon');
      
      // If no icon exists, create one
      if (!iconElement) {
        iconElement = document.createElement('i');
        iconElement.className = `sea-icon ${cellIconInfo.iconData.icon}`;
        iconElement.setAttribute('data-tooltip', cellIconInfo.iconData.tooltip);
        
        // Set up the tooltip functionality
        this.setupTooltipEvents(iconElement);
        
        // DIRECT STYLE APPLICATION for better visibility
        iconElement.style.position = 'absolute';
        iconElement.style.top = '50%';
        iconElement.style.left = '50%';
        iconElement.style.transform = 'translate(-50%, -50%)';
        iconElement.style.color = '#444444'; // Dark grey
        iconElement.style.fontSize = '22px';
        iconElement.style.zIndex = '50';
        iconElement.style.opacity = '0.7';
        iconElement.style.pointerEvents = 'auto';
        iconElement.style.textShadow = '0 0 2px rgba(255, 255, 255, 0.3)';
        iconElement.style.background = 'transparent';
        iconElement.style.cursor = 'help';
        
        // Append after any text content to ensure it's not overwritten
        cellElement.appendChild(iconElement);
        iconedCellCount++;
        
        console.log(`IslandRenderer: Added sea icon ${cellIconInfo.iconData.icon} to cell at ${x},${y}`);
      }
    } else {
      // Remove any existing icon if cell shouldn't have one
      const existingIcon = cellElement.querySelector('.sea-icon');
      if (existingIcon) {
        cellElement.removeChild(existingIcon);
      }
    }
  });
  
  console.log(`IslandRenderer: Found ${deepSeaCount} deep sea cells, added icons to ${iconedCellCount} cells`);
}
  
/**
 * NEW: Fix beach cells after any DOM manipulation
 * This should be called whenever grid cells might have been altered or rebuilt
 */
fixBeachCellsAfterDOMChange() {
  // Short circuit if scrolling
  if (this._scrollInProgress) return;
  
  // Use requestAnimationFrame to ensure DOM is stable
  requestAnimationFrame(() => {
    this._applyBeachCellStyles(true);
  });
}

/**
 * NEW: Update all beach cells when the grid changes size or position
 * Handles responsive layout changes
 */
handleGridResize() {
  // Update visible bounds
  this._updateVisibleBounds();
  
  // Calculate new styles based on current grid
  this._calculateStyles();
  
  // Apply beach cell styles with forced application
  this._applyBeachCellStyles(true);
  
  // Apply all other styles
  this._applyStyles(true);
}
}

export default IslandRenderer;

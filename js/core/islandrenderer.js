/**
 * IslandRenderer - Optimized for scroll performance
 * Enhanced with improved beach/seashore cell handling during scrolling
 * Ensures efficient styling of island cells with cached states
 * and scroll-aware updates.
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
    this._bufferSize = 3; // Increased from 2 to ensure smoother scrolling
    
    // Make this instance available globally for direct access
    window.islandRenderer = this;
    
    // Initial setup with delayed updates
    this._setupInitialState();
    
    // Set up optimized event listeners
    this._setupEventListeners();
    
    console.log('IslandRenderer initialized with enhanced beach cell handling');
    this.initialized = true;
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
   * Set up optimized event listeners with scroll awareness
   * ENHANCED: Improved coordination with GridRenderer for pre-styling cells
   * @private
   */
  _setupEventListeners() {
    // Enhanced coordination with GridRenderer's scroll system
    this.coordWithGridRenderer();

    // Track scroll events to pause updates during scrolling
    document.addEventListener('gridScrollStarted', (e) => {
      this._scrollInProgress = true;
      
      // ENHANCED: Update visible bounds immediately when scrolling starts
      this._updateVisibleBounds();
      
      // IMPORTANT: Pre-calculate styles with an increased buffer before the scroll starts
      // This ensures cells just outside the view are properly styled
      this._calculateStylesWithBuffer(e.detail.direction);
      
      // Apply shore/beach styles to all cells in the expanded view region
      this._applyBeachCellsDuringScroll();
    });
    
    document.addEventListener('gridScrolled', (e) => {
      // Keep track that scrolling is in progress
      this._scrollInProgress = true;
      
      // Update visible bounds
      this._updateVisibleBounds();
      
      // IMPORTANT: Apply shore styles even during scrolling with requestAnimationFrame
      // for better performance
      requestAnimationFrame(() => {
        this._applyBeachCellsDuringScroll();
      });
    });
    
    // Listen for grid rebuild events (which happen during scrolling)
    document.addEventListener('gridRebuilt', (e) => {
      // Update visible bounds
      this._updateVisibleBounds();
      
      // IMPORTANT: If a rebuild happens during scrolling, still apply shore styles
      if (e.detail.isScrolling) {
        setTimeout(() => {
          // Calculate styles with a larger buffer during scroll rebuilds
          this._calculateStylesWithBuffer();
          this._applyBeachCellsDuringScroll();
        }, 0);
      } else {
        // Only process if not during a scroll
        requestAnimationFrame(() => {
          this._calculateStyles();
          this._applyStyles();
        });
      }
    });
    
    document.addEventListener('gridScrollComplete', () => {
      this._scrollInProgress = false;
      // Update styles after scroll completes, using animation frame for smoother performance
      this._updateVisibleBounds();
      
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        this._calculateStyles();
        this._applyStyles();
      });
    });
    
    // NEW: Create categories for different event types
    const immediateEvents = [
      'pathSet',
      'islandLettersUpdated',
      'islandReductionLevelChanged'
    ];
    
    const delayedEvents = [
      'gridCompletionChanged', 
      'selectionsCleared'
    ];
    
    // Handle high-priority events immediately (but still respect scrolling)
    immediateEvents.forEach(eventName => {
      document.addEventListener(eventName, () => {
        // Don't update during scrolling
        if (this._scrollInProgress) return;
        
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
      });
    });
  }

  /**
   * NEW: Enhanced method to coordinate with GridRenderer's scroll system
   * This ensures seashore styles are preserved during CSS transform animations
   */
  coordWithGridRenderer() {
    if (!this.gridRenderer || !this.gridRenderer.scroll) return;
    
    // Save original scroll method
    const originalScroll = this.gridRenderer.scroll;
    
    // Override the scroll method to add beach cell preservation
    this.gridRenderer.scroll = (direction, slowMotion = false) => {
      // Before scrolling, ensure we preserve current beach cell styles
      this._preserveBeachCellStyles();
      
      // Call the original scroll method
      originalScroll.call(this.gridRenderer, direction, slowMotion);
    };
    
    console.log('Enhanced GridRenderer scroll method with beach cell style preservation');
  }

  /**
   * NEW: Preserve beach cell styles during transitions by adding inline styles
   * This critical method ensures visible beach cells maintain their appearance during CSS transforms
   * @private
   */
  _preserveBeachCellStyles() {
    // Get all sea-adjacent cells currently visible
    const beachCells = document.querySelectorAll('.grid-cell.sea-adjacent');
    
    beachCells.forEach(cell => {
      // Create a styles object to track what needs to be preserved
      const styles = {
        borderTop: cell.classList.contains('shore-edge-top') ? 
          '6px solid var(--sandyellow)' : cell.style.borderTop,
        borderRight: cell.classList.contains('shore-edge-right') ? 
          '6px solid var(--sandyellow)' : cell.style.borderRight,
        borderBottom: cell.classList.contains('shore-edge-bottom') ? 
          '6px solid var(--sandyellow)' : cell.style.borderBottom,
        borderLeft: cell.classList.contains('shore-edge-left') ? 
          '6px solid var(--sandyellow)' : cell.style.borderLeft,
        backgroundColor: 'var(--lightblue)',
        transition: 'none' // Disable transitions to prevent flicker
      };
      
      // Apply inline styles to override any class changes during transition
      Object.assign(cell.style, styles);
      
      // Store original class list to restore after transition
      cell.dataset.originalClasses = Array.from(cell.classList).join(' ');
    });
    
    // After a delay matching the CSS transform duration, restore class-based styling
    setTimeout(() => {
      beachCells.forEach(cell => {
        if (cell.dataset.originalClasses) {
          // Restore original classes if element still exists in DOM
          if (document.body.contains(cell)) {
            // Clear inline styles
            cell.style.borderTop = '';
            cell.style.borderRight = '';
            cell.style.borderBottom = '';
            cell.style.borderLeft = '';
            cell.style.backgroundColor = '';
            cell.style.transition = '';
          }
          
          // Remove dataset property
          delete cell.dataset.originalClasses;
        }
      });
    }, 500); // Slightly longer than the longest possible transition
  }

  /**
   * NEW: Pre-style beach cells specifically for cells that will come into view after scrolling
   * This is the key enhancement for smoother beach cell transitions
   * @param {string} direction - Scroll direction ('up', 'right', 'down', 'left')
   * @param {number} newOffsetX - New X offset after scroll
   * @param {number} newOffsetY - New Y offset after scroll
   * @private
   */
  _preStyleBeachCellsForScroll(direction, newOffsetX, newOffsetY) {
    if (!this.gridRenderer || !this.gridRenderer.grid) {
      return;
    }
    
    // Get current view dimensions
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.gridRenderer.options.gridWidthSmall : this.gridRenderer.options.gridWidth;
    const height = isMobile ? this.gridRenderer.options.gridHeightSmall : this.gridRenderer.options.gridHeight;
    
    // Determine which new cells need to be styled based on direction
    const newCellPositions = [];
    
    // Define the region of new cells that will come into view
    switch (direction) {
      case 'up': 
        // Top row(s) come into view
        for (let x = newOffsetX; x < newOffsetX + width; x++) {
          for (let y = newOffsetY; y < this.gridRenderer.viewOffset.y; y++) {
            newCellPositions.push({x, y});
          }
        }
        break;
      case 'down':
        // Bottom row(s) come into view
        for (let x = newOffsetX; x < newOffsetX + width; x++) {
          for (let y = this.gridRenderer.viewOffset.y + height; y < newOffsetY + height; y++) {
            newCellPositions.push({x, y});
          }
        }
        break;
      case 'left':
        // Left column(s) come into view
        for (let x = newOffsetX; x < this.gridRenderer.viewOffset.x; x++) {
          for (let y = newOffsetY; y < newOffsetY + height; y++) {
            newCellPositions.push({x, y});
          }
        }
        break;
      case 'right':
        // Right column(s) come into view
        for (let x = this.gridRenderer.viewOffset.x + width; x < newOffsetX + width; x++) {
          for (let y = newOffsetY; y < newOffsetY + height; y++) {
            newCellPositions.push({x, y});
          }
        }
        break;
    }
    
    // Process each new cell position
    newCellPositions.forEach(({x, y}) => {
      // Skip if outside grid bounds
      if (y < 0 || y >= this.gridRenderer.grid.length || 
          x < 0 || x >= this.gridRenderer.grid[0].length) {
        return;
      }
      
      // Skip if this is a path/island cell
      if (this.isCellPath(x, y) || this.cellHasLetter(x, y)) {
        return;
      }
      
      // Check if this is a sea cell adjacent to any island
      const adjacentDirections = this.getAdjacentLetterCells(x, y);
      if (adjacentDirections.length > 0) {
        // Find the cell element
        const cellElement = document.querySelector(`.grid-cell[data-grid-x="${x}"][data-grid-y="${y}"]`);
        if (cellElement) {
          // Apply sea-adjacent and shore edge classes
          const styleConfig = {
            isSeaAdjacent: true,
            shoreEdges: adjacentDirections
          };
          
          // Apply beach styles to the cell
          this._applyShoreStyles(cellElement, styleConfig);
          
          // Cache this style configuration
          this.cellStyleCache.set(`${x},${y}`, styleConfig);
        }
      }
    });
  }

  /**
   * ENHANCED: Calculate styles for all visible cells plus a larger buffer zone
   * @param {string} direction - Optional scroll direction for targeted buffer expansion
   * @private
   */
  _calculateStylesWithBuffer(direction = null) {
    if (!this.gridRenderer || !this.gridRenderer.grid) {
      return;
    }
    
    // Clear existing cache
    const newStyleCache = new Map();
    
    // Use a larger buffer when direction is provided (during scrolling)
    // This ensures smoother transitions in the scroll direction
    const baseBuffer = this._bufferSize;
    const topBuffer = direction === 'up' ? baseBuffer * 2 : baseBuffer;
    const rightBuffer = direction === 'right' ? baseBuffer * 2 : baseBuffer;
    const bottomBuffer = direction === 'down' ? baseBuffer * 2 : baseBuffer;
    const leftBuffer = direction === 'left' ? baseBuffer * 2 : baseBuffer;
    
    // Process all cells in visible bounds AND the enhanced buffer zone
    for (let y = this._visibleBounds.minY - topBuffer; y < this._visibleBounds.maxY + bottomBuffer; y++) {
      for (let x = this._visibleBounds.minX - leftBuffer; x < this._visibleBounds.maxX + rightBuffer; x++) {
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
   * Apply beach/shore cell styles during scrolling
   * ENHANCED: Better handling of new cells coming into view
   * @private
   */
  _applyBeachCellsDuringScroll() {
    // Skip if no grid renderer or grid
    if (!this.gridRenderer || !this.gridRenderer.grid) {
      return;
    }
    
    // Get current visible cells
    const cells = document.querySelectorAll('.grid-cell');
    
    // Find sea-adjacent cells needing shore styling
    cells.forEach(cellElement => {
      // Get cell coordinates
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      if (isNaN(x) || isNaN(y)) {
        return;
      }
      
      // Don't process path cells (letters/islands) - just focus on sea cells
      if (cellElement.classList.contains('path-cell')) {
        return;
      }
      
      // Get cached style if available
      const cacheKey = `${x},${y}`;
      const cachedStyle = this.cellStyleCache.get(cacheKey);
      
      if (cachedStyle && cachedStyle.isSeaAdjacent) {
        // Use cached style data if available
        this._applyShoreStyles(cellElement, cachedStyle);
      } else {
        // Otherwise calculate on the fly for this cell
        const adjacentDirections = this.getAdjacentLetterCells(x, y);
        if (adjacentDirections.length > 0) {
          // Apply sea-adjacent and shore edge classes
          const styleConfig = {
            isSeaAdjacent: true,
            shoreEdges: adjacentDirections
          };
          this._applyShoreStyles(cellElement, styleConfig);
          
          // Cache this result for future use
          this.cellStyleCache.set(cacheKey, styleConfig);
        }
      }
    });
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
   * @private
   */
  _applyStyles() {
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
      
      // Skip if no style config found
      if (!styleConfig) return;
      
      // ENHANCED: Apply shore styles even during scrolling to maintain continuity
      if (styleConfig.isSeaAdjacent) {
        this._applyShoreStyles(cellElement, styleConfig);
        return;
      }
      
      // For non-shore cells, only apply styles if not scrolling
      if (!this._scrollInProgress) {
        this._applyStyleConfig(cellElement, styleConfig);
      }
    });
  }

  /**
   * Apply shore/beach specific styles to cell element
   * ENHANCED: Check current state before modifying to avoid unnecessary reflows
   * @param {HTMLElement} cellElement - Cell DOM element
   * @param {Object} styleConfig - Style configuration
   * @private
   */
  _applyShoreStyles(cellElement, styleConfig) {
    // Store the current state for comparison
    const currentClasses = {
      isSeaAdjacent: cellElement.classList.contains('sea-adjacent'),
      top: cellElement.classList.contains('shore-edge-top'),
      right: cellElement.classList.contains('shore-edge-right'),
      bottom: cellElement.classList.contains('shore-edge-bottom'),
      left: cellElement.classList.contains('shore-edge-left')
    };
    
    // Create a map of needed classes
    const neededClasses = {
      isSeaAdjacent: true,
      top: styleConfig.shoreEdges.includes('top'),
      right: styleConfig.shoreEdges.includes('right'),
      bottom: styleConfig.shoreEdges.includes('bottom'),
      left: styleConfig.shoreEdges.includes('left')
    };
    
    // Only add/remove classes if there's a difference from current state
    
    // Handle sea-adjacent class
    if (currentClasses.isSeaAdjacent !== neededClasses.isSeaAdjacent) {
      if (neededClasses.isSeaAdjacent) {
        cellElement.classList.add('sea-adjacent');
      } else {
        cellElement.classList.remove('sea-adjacent');
      }
    }
    
    // Handle top edge
    if (currentClasses.top !== neededClasses.top) {
      if (neededClasses.top) {
        cellElement.classList.add('shore-edge-top');
      } else {
        cellElement.classList.remove('shore-edge-top');
      }
    }
    
    // Handle right edge
    if (currentClasses.right !== neededClasses.right) {
      if (neededClasses.right) {
        cellElement.classList.add('shore-edge-right');
      } else {
        cellElement.classList.remove('shore-edge-right');
      }
    }
    
    // Handle bottom edge
    if (currentClasses.bottom !== neededClasses.bottom) {
      if (neededClasses.bottom) {
        cellElement.classList.add('shore-edge-bottom');
      } else {
        cellElement.classList.remove('shore-edge-bottom');
      }
    }
    
    // Handle left edge
    if (currentClasses.left !== neededClasses.left) {
      if (neededClasses.left) {
        cellElement.classList.add('shore-edge-left');
      } else {
        cellElement.classList.remove('shore-edge-left');
      }
    }
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
      'shore-edge-left'
    );
    
    // Apply path-cell class if needed
    if (styleConfig.isPathCell) {
      cellElement.classList.add('path-cell');
      return;
    }
    
    // Apply sea adjacent styling if needed
    if (styleConfig.isSeaAdjacent) {
      cellElement.classList.add('sea-adjacent');
      
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
   * Check if a cell is adjacent to any cell that has a letter
   * KEPT for backwards compatibility
   */
  isAdjacentToAnyLetterCell(x, y) {
    return this.getAdjacentLetterCells(x, y).length > 0;
  }
    
  /**
   * Refresh island rendering - Public API for forced updates
   * @param {boolean} force - Force immediate update even during scrolling
   */
  refreshIsland(force = false) {
    if (this._scrollInProgress && !force) return;
    
    requestAnimationFrame(() => {
      this._calculateStyles();
      this._applyStyles();
    });
  }
}

export default IslandRenderer;

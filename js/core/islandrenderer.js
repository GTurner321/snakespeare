/**
 * IslandRenderer - Clean rewrite with transform-based sea icons
 * Removes all old conflicting methods and uses only CSS-based approach
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
    this._bufferSize = 4; // Same as other styles
    
    // Add critical CSS for beach cells to ensure styles persist during transforms
    this._injectCriticalBeachCellStyles();
    
    // Make this instance available globally for direct access
    window.islandRenderer = this;
    
    // Initial setup with delayed updates
    this._setupInitialState();

    this.coordWithGridRenderer();
    
    // Set up optimized event listeners
    this._setupEventListeners();
    
    // SEA ICONS: Initialize sea icons functionality with CSS-based system
    this.initializeSeaIcons();
    
    console.log('IslandRenderer initialized with clean CSS-based sea icons');
    this.initialized = true;
  }

  /**
   * Initialize sea icons functionality with transform-based approach
   */
 initializeSeaIcons() {
  console.log('IslandRenderer: Initializing transform-based sea icons...');
  
  // Set of Font Awesome nautical icons with tooltips - FIXED UNICODE VALUES
  this.iconData = [
    { icon: 'fa-solid fa-cloud-rain', tooltip: "Methinks the heavens are having a weep." }, // Changed from cloud-showers-water
    { icon: 'fa-solid fa-map', tooltip: "X marks the spot—if ye dare to dream!" },
    { icon: 'fa-solid fa-compass', tooltip: "North by bardwest, I reckon." },
    { icon: 'fa-solid fa-anchor', tooltip: "Droppeth anchor, not thy spirits." },
    { icon: 'fa-solid fa-sailboat', tooltip: "To sail, perchance to drift." },
    { icon: 'fa-solid fa-skull-crossbones', tooltip: "Avast! A pirate ship on poetic business." },
    { icon: 'fa-solid fa-fish-fins', tooltip: "Enough fish here to feed the whole crew." },
    { icon: 'fa-solid fa-water', tooltip: "Sea, sea, everywhere—but not a drop for tea." },
    { icon: 'fa-solid fa-wind', tooltip: "The wind fancies itself a playwright." },
    { icon: 'fa-solid fa-wine-bottle', tooltip: "A message! Or a mermaid's forgotten flask." }
  ];

  // Chance of a sea cell having an icon (1 in 20)
  this.iconChance = 0.05;

  // Store icon decisions permanently by grid coordinates
  this.seaIconDecisions = new Map(); // key: "x,y", value: {hasIcon: boolean, iconData: object}
  
  // Track currently visible tooltip
  this.activeTooltip = null;
  this.tooltipTimeout = null;

  // Add CSS for sea icons
  this.addSeaIconStyles();
  
  // Create tooltip container
  this.createTooltipContainer();
  
  console.log('Sea icons initialized with transform-based approach');
}

  /**
   * Add CSS styles that work with transforms and buffer zones
   */
  addSeaIconStyles() {
    if (document.getElementById('sea-icons-transform-css')) return;
    
    const style = document.createElement('style');
    style.id = 'sea-icons-transform-css';
    style.textContent = `
      /* Sea icons as permanent cell styling */
      .grid-cell.has-sea-icon {
        position: relative;
      }
      
      .grid-cell.has-sea-icon::after {
        content: attr(data-sea-icon);
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important;
        font-weight: 900 !important;
        color: #444444 !important;
        font-size: 22px !important;
        opacity: 0.7 !important;
        z-index: 50 !important;
        pointer-events: auto !important;
        text-shadow: 0 0 2px rgba(255, 255, 255, 0.3) !important;
        user-select: none !important;
        cursor: pointer !important;
        visibility: visible !important;
        display: block !important;
        /* CRITICAL: Preserve during transforms */
        will-change: auto !important;
        transition: opacity 0.2s ease, transform 0.2s ease !important;
      }
      
      /* Hover effect for clickability indication */
      .grid-cell.has-sea-icon:hover::after {
        opacity: 1 !important;
        transform: translate(-50%, -50%) scale(1.1) !important;
        color: #222222 !important;
      }
      
      /* Animation for visual appeal */
      @keyframes seaIconFloat {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        50% { transform: translate(-50%, -50%) rotate(3deg); }
        100% { transform: translate(-50%, -50%) rotate(0deg); }
      }
      
      .grid-cell.has-sea-icon::after {
        animation: seaIconFloat 4s ease-in-out infinite;
      }
      
      /* Different timing for variety */
      .grid-cell.has-sea-icon:nth-child(odd)::after {
        animation-duration: 5s;
        animation-delay: 1s;
      }
      
      /* Tooltip styles */
      .sea-icon-tooltip {
        position: fixed;
        background-color: rgba(255, 246, 122, 0.95);
        color: #444444;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 14px;
        max-width: 220px;
        text-align: center;
        z-index: 2000;
        pointer-events: none;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        font-style: italic;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(180, 160, 60, 0.7);
        display: none;
        font-family: 'Trebuchet MS', Arial, sans-serif;
        line-height: 1.3;
      }
      
      .sea-icon-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
        display: block;
      }
      
      .sea-icon-tooltip::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid rgba(255, 246, 122, 0.95);
      }
    `;
    
    document.head.appendChild(style);
    console.log('Added transform-based sea icon styles');
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

applySeaIconsWithBuffer() {
  // CRITICAL FIX: Don't do ANY DOM updates during scrolling
  if (this._scrollInProgress) {
    console.log('Skipping sea icon updates during scroll - icons move with CSS transforms');
    return;
  }
  
  if (!this.gridRenderer) return;
  
  console.log('Applying sea icons with buffer zone approach');
  
  // Calculate visible bounds with buffer
  const bufferMinX = this._visibleBounds.minX - this._bufferSize;
  const bufferMaxX = this._visibleBounds.maxX + this._bufferSize;
  const bufferMinY = this._visibleBounds.minY - this._bufferSize;
  const bufferMaxY = this._visibleBounds.maxY + this._bufferSize;
  
  // Get all grid cells in buffer zone
  const bufferedCells = document.querySelectorAll('.grid-cell');
  
  let processedCount = 0;
  let iconsApplied = 0;
  
  bufferedCells.forEach(cellElement => {
    const x = parseInt(cellElement.dataset.gridX, 10);
    const y = parseInt(cellElement.dataset.gridY, 10);
    
    // Skip if invalid coordinates
    if (isNaN(x) || isNaN(y)) return;
    
    // Only process cells within buffer zone
    if (x < bufferMinX || x >= bufferMaxX || y < bufferMinY || y >= bufferMaxY) {
      return;
    }
    
    processedCount++;
    const cellKey = `${x},${y}`;
    
    // FIXED: Enhanced deep sea check - exclude seashore cells
    const isDeepSeaCell = this.isDeepSeaCell(cellElement);
    
    // Skip non-deep-sea cells (including seashore cells)
    if (!isDeepSeaCell) {
      return;
    }
    
    // Check if we already have a decision for this cell
    if (!this.seaIconDecisions.has(cellKey)) {
      // Make a permanent decision for this cell
      const shouldHaveIcon = Math.random() < this.iconChance;
      
      if (shouldHaveIcon) {
        const iconData = this.getRandomIconData();
        this.seaIconDecisions.set(cellKey, {
          hasIcon: true,
          iconData: iconData
        });
      } else {
        this.seaIconDecisions.set(cellKey, { hasIcon: false });
      }
    }
    
    // Apply icon based on decision
    const decision = this.seaIconDecisions.get(cellKey);
    if (decision.hasIcon) {
      this.applySeaIconToCell(cellElement, decision.iconData);
      iconsApplied++;
    }
  });
  
  console.log(`Processed ${processedCount} cells in buffer zone, applied ${iconsApplied} sea icons`);
}
  
  applySeaIconToCell(cellElement, iconData) {
  // Check if cell already has the icon
  if (cellElement.classList.contains('has-sea-icon') && 
      cellElement.dataset.seaIcon === this.getIconUnicode(iconData.icon)) {
    return; // Already applied
  }
  
  // Apply the icon as CSS class and data
  cellElement.classList.add('has-sea-icon');
  cellElement.dataset.seaIcon = this.getIconUnicode(iconData.icon);
  cellElement.dataset.seaTooltip = iconData.tooltip;
  
  // SIMPLIFIED: Set up click event (no need for cleanup since icons persist)
  if (!cellElement.dataset.seaIconListener) {
    cellElement.addEventListener('click', (e) => this.handleSeaIconClick(e), true);
    cellElement.dataset.seaIconListener = 'true';
  }
}
  
  /**
   * Remove sea icon from a cell
   */
removeSeaIconFromCell(cellElement) {
  cellElement.classList.remove('has-sea-icon');
  delete cellElement.dataset.seaIcon;
  delete cellElement.dataset.seaTooltip;
  delete cellElement.dataset.seaIconListener;
  // Note: Event listeners will be cleaned up when DOM elements are replaced
}
  
  /**
   * Check if a cell is a deep sea cell
   */
isDeepSeaCell(cellElement) {
  // FIXED: Explicit check for seashore/beach cells first
  if (cellElement.classList.contains('sea-adjacent')) {
    console.log('Cell is sea-adjacent (seashore), excluding from sea icons');
    return false;
  }
  
  if (cellElement.classList.contains('preserved-beach-cell')) {
    console.log('Cell is preserved beach cell, excluding from sea icons');
    return false;
  }
  
  // Check computed background color
  const computedStyle = window.getComputedStyle(cellElement);
  const backgroundColor = computedStyle.backgroundColor;
  
  // FIXED: More specific color checks
  const isDeepBlue = this.isDeepBlueSeaColor(backgroundColor);
  
  // Additional exclusions
  const hasLetter = cellElement.classList.contains('path-cell') ||
                   cellElement.classList.contains('selected-cell') ||
                   cellElement.classList.contains('start-cell');
  
  // Must be deep blue AND not have any letters/special states
  const result = isDeepBlue && !hasLetter;
  
  if (!result && isDeepBlue) {
    console.log('Deep blue cell excluded due to letter/special state');
  }
  
  return result;
}
  
  /**
   * Handle sea icon click events
   */
 handleSeaIconClick(e) {
  // Only handle clicks on the pseudo-element area (center of cell)
  const rect = e.currentTarget.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const clickX = e.clientX;
  const clickY = e.clientY;
  
  // Check if click is near center (where icon is)
  const distance = Math.sqrt(Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2));
  if (distance > 25) return; // Click too far from icon
  
  // FIXED: Prevent the click from propagating AND mark it as handled
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  const tooltip = e.currentTarget.dataset.seaTooltip;
  if (!tooltip) return;
  
  // FIXED: Add a flag to indicate this was a sea icon click
  e._seaIconClick = true;
  
  this.showTooltip(tooltip, e.currentTarget);
  
  console.log('Sea icon clicked - showing tooltip:', tooltip);
}

  /**
   * Show tooltip for sea icon
   */
  showTooltip(message, cellElement) {
    const tooltipContainer = document.getElementById('sea-icon-tooltip');
    if (!tooltipContainer) return;
    
    // Hide any existing tooltip
    this.hideTooltip();
    
    // Set tooltip content
    tooltipContainer.textContent = message;
    
    // Position tooltip above the cell
    const rect = cellElement.getBoundingClientRect();
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
    }
    
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  /**
   * Get Unicode character for Font Awesome icon
   */
getIconUnicode(iconClass) {
  // FIXED: Map of Font Awesome classes to correct Unicode characters
  const iconMap = {
    'fa-solid fa-cloud-rain': '\uf73d',        // FIXED: Correct rain cloud icon
    'fa-solid fa-map': '\uf279',               // Map icon
    'fa-solid fa-compass': '\uf14e',           // Compass icon  
    'fa-solid fa-anchor': '\uf13d',            // Anchor icon
    'fa-solid fa-sailboat': '\ue445',          // Sailboat icon (FA6)
    'fa-solid fa-skull-crossbones': '\uf714',  // Skull crossbones
    'fa-solid fa-fish-fins': '\ue4f2',         // Fish with fins (FA6)
    'fa-solid fa-water': '\uf773',             // Water droplet
    'fa-solid fa-wind': '\uf72e',              // Wind icon
    'fa-solid fa-wine-bottle': '\uf72f'        // Wine bottle
  };
  
  return iconMap[iconClass] || '\uf279'; // Default to map icon
}
  
  /**
   * Get random icon data from the icon set
   */
  getRandomIconData() {
    const index = Math.floor(Math.random() * this.iconData.length);
    return this.iconData[index];
  }

  /**
   * Clear all sea icon decisions (for new puzzle)
   */
  clearSeaIconDecisions() {
    this.seaIconDecisions.clear();
    
    // Remove all existing sea icons from DOM
    document.querySelectorAll('.grid-cell.has-sea-icon').forEach(cell => {
      this.removeSeaIconFromCell(cell);
    });
    
    console.log('Cleared all sea icon decisions and DOM icons');
  }

  /**
   * Legacy method - redirects to new buffer approach
   */
  applyIcons() {
    this._updateVisibleBounds();
    this.applySeaIconsWithBuffer();
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
 * FIXED: _setupEventListeners method for IslandRenderer
 * Prevents sea icon updates during smooth CSS transforms
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
    
    console.log('Scroll started - sea icons preserved during transform');
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
        
        // Apply sea icons with buffer zone after grid is rebuilt
        setTimeout(() => {
          this.applySeaIconsWithBuffer();
        }, 100);
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
      
      // ONLY NOW apply sea icons after scroll is completely finished
      setTimeout(() => {
        this.applySeaIconsWithBuffer();
      }, 400); // Longer delay to ensure transforms are done
    });
  });
  
  // ... rest of your existing event listeners unchanged ...
  // (Keep all the existing immediateEvents, delayedEvents, etc. exactly as they were)
  
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
        
        // Update sea icons with buffer zone after high-priority events
        setTimeout(() => {
          this.applySeaIconsWithBuffer();
        }, 100);
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
          
          // Update sea icons with buffer zone after delayed events
          setTimeout(() => {
            this.applySeaIconsWithBuffer();
          }, 100);
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
      
      // Update sea icons with buffer zone after explicit styling requests
      setTimeout(() => {
        this.applySeaIconsWithBuffer();
      }, 100);
    });
  });
  
  // Listen for grid created events (initial setup)
  document.addEventListener('gridCreated', (e) => {
    console.log('IslandRenderer: Grid created event detected');
    setTimeout(() => {
      this._calculateStyles();
      this._applyStyles(true);
      
      // Apply sea icons with buffer zone after grid creation
      this.applySeaIconsWithBuffer();
    }, 200);
  });
  
  // SEA ICONS: Listen for new puzzle/phrase events
  document.addEventListener('pathSet', () => {
    console.log('New path set - refreshing sea icons');
    // Clear old decisions
    this.clearSeaIconDecisions();
    
    // Apply new icons after a delay to let grid settle
    setTimeout(() => {
      this._updateVisibleBounds();
      this.applySeaIconsWithBuffer();
    }, 300);
  });
  
  // SEA ICONS: Listen for island letters updated (new puzzle)
  document.addEventListener('islandLettersUpdated', () => {
    setTimeout(() => {
      this._updateVisibleBounds();
      this.applySeaIconsWithBuffer();
    }, 200);
  });

  document.addEventListener('click', (e) => {
    // Don't hide tooltip if this was a sea icon click
    if (e._seaIconClick) {
      return;
    }
    
    // More robust check for sea icon clicks
    const isSeaIconClick = e.target.closest('.has-sea-icon') || 
                          e.target.classList.contains('has-sea-icon');
    
    if (!isSeaIconClick) {
      this.hideTooltip();
    }
  }, true);
        
  console.log('IslandRenderer: Clean event listeners set up');
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
   * Check if a color is a deep blue sea color
   * @param {string} backgroundColor - CSS color value
   * @return {boolean} True if this is a deep blue sea color
   */
isDeepBlueSeaColor(backgroundColor) {
  if (!backgroundColor) return false;
  
  // Convert to lowercase for consistent comparison
  const colorStr = backgroundColor.toLowerCase();
  
  // FIXED: Exclude seashore light blue colors explicitly
  const isSeashoreBlue = 
    colorStr === 'rgb(100, 192, 235)' || // var(--lightblue) - seashore color
    colorStr === '#64c0eb' ||
    colorStr.includes('100, 192, 235');
  
  if (isSeashoreBlue) {
    console.log('Color identified as seashore blue, excluding');
    return false;
  }
  
  // Check for default deep blue sea colors
  const isDefaultBlue = 
    colorStr === 'rgb(86, 165, 214)' || // var(--defaultblue)
    colorStr === 'rgb(74, 145, 187)' || // var(--defaultblue-dark)
    colorStr === 'rgb(58, 130, 173)' || // var(--defaultblue-darker)
    colorStr === '#56a5d6' ||
    colorStr === '#4a91bb' ||
    colorStr === '#3a82ad';
  
  if (isDefaultBlue) {
    console.log('Color identified as deep sea blue');
    return true;
  }
  
  // Parse RGB components for additional blue color detection
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    
    // FIXED: More restrictive blue detection to avoid seashore colors
    // Deep sea: blue dominant, but not too bright (seashore is brighter)
    const isDeepBlue = r < 100 && g < 180 && b > 160 && b > (r + g) / 1.5;
    
    if (isDeepBlue) {
      console.log(`Color RGB(${r}, ${g}, ${b}) identified as deep sea blue`);
    }
    
    return isDeepBlue;
  }
  
  return false;
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
    
    // Apply sea icons with buffer zone
    if (force || !this._scrollInProgress) {
      this.applySeaIconsWithBuffer();
    }
  }
}

export default IslandRenderer;

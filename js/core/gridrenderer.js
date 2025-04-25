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
      gridWidth: options.gridWidth || 8,           // Grid width for mobile
      gridHeight: options.gridHeight || 10,        // Grid height for desktop
      cellSize: options.cellSize || 50,            // Cell size in pixels
      maxScrollDistance: options.maxScrollDistance || 6,  // Max scroll distance from path
      highlightPath: options.highlightPath || false, // Whether to highlight the path initially
      ...options
    };
    
    // Grid state
    this.grid = [];              // 2D array of cell data
    this.viewOffset = { x: 0, y: 0 }; // Current view offset
    this.path = [];              // Current path data
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
    // Calculate grid dimensions to ensure they're odd (for center placement)
    const width = this.options.gridWidth % 2 === 0 ? this.options.gridWidth + 1 : this.options.gridWidth;
    const height = this.options.gridHeight % 2 === 0 ? this.options.gridHeight + 1 : this.options.gridHeight;
    
    // Initialize empty grid
    this.grid = Array(height).fill().map(() => Array(width).fill().map(() => ({
      letter: this.getRandomLetter(),
      isPath: false,
      isStart: false,
      pathIndex: -1
    })));
    
    // Set center as start
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    this.grid[centerY][centerX] = {
      letter: '',
      isPath: true,
      isStart: true, 
      pathIndex: 0
    };
    
    // Center the view
    this.viewOffset.x = centerX - Math.floor(this.options.gridWidth / 2);
    this.viewOffset.y = centerY - Math.floor(this.options.gridHeight / 2);
  }
  
  /**
   * Create DOM elements for the grid
   */
  createGridElements() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create grid container
    this.gridElement = document.createElement('div');
    this.gridElement.className = 'grid-container';
    this.gridElement.style.display = 'grid';
    this.gridElement.style.gridTemplateColumns = `repeat(${this.options.gridWidth}, ${this.options.cellSize}px)`;
    this.gridElement.style.gridTemplateRows = `repeat(${this.options.gridHeight}, ${this.options.cellSize}px)`;
    
    // Create cells
    this.renderVisibleGrid();
    
    // Add grid to container
    this.container.appendChild(this.gridElement);
  }
  
  /**
   * Render the currently visible portion of the grid
   */
  renderVisibleGrid() {
    // Clear grid element
    this.gridElement.innerHTML = '';
    
    // Calculate visible bounds
    const endX = this.viewOffset.x + this.options.gridWidth;
    const endY = this.viewOffset.y + this.options.gridHeight;
    
    // Render visible cells
    for (let y = this.viewOffset.y; y < endY; y++) {
      for (let x = this.viewOffset.x; x < endX; x++) {
        const cellElement = document.createElement('div');
        cellElement.className = 'grid-cell';
        cellElement.style.width = `${this.options.cellSize}px`;
        cellElement.style.height = `${this.options.cellSize}px`;
        
        // If cell is within grid bounds
        if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
          const cell = this.grid[y][x];
          
          // Set cell content
          cellElement.textContent = cell.letter;
          
          // Apply styling
          if (cell.isStart) {
            cellElement.classList.add('start-cell');
          } else if (cell.isPath && this.options.highlightPath) {
            cellElement.classList.add('path-cell');
            cellElement.dataset.pathIndex = cell.pathIndex;
          }
        } else {
          // Out of bounds cell - display as empty
          cellElement.classList.add('out-of-bounds');
        }
        
        this.gridElement.appendChild(cellElement);
      }
    }
  }
  
  /**
   * Set a path on the grid
   * @param {Array} path - Array of {x, y, letter} objects
   */
  setPath(path) {
    this.path = path;
    
    // Reset all cells' path status
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[0].length; x++) {
        this.grid[y][x].isPath = false;
        this.grid[y][x].pathIndex = -1;
      }
    }
    
    // Set start cell
    const centerX = Math.floor(this.grid[0].length / 2);
    const centerY = Math.floor(this.grid.length / 2);
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
    
    // Re-render grid
    this.renderVisibleGrid();
  }
  
  /**
   * Scroll the grid in the given direction
   * @param {string} direction - 'up', 'down', 'left', or 'right'
   */
  scroll(direction) {
    // Calculate new offset based on direction
    let newOffsetX = this.viewOffset.x;
    let newOffsetY = this.viewOffset.y;
    
    switch (direction) {
      case 'up':
        newOffsetY = Math.max(0, this.viewOffset.y - 1);
        break;
      case 'down':
        newOffsetY = Math.min(
          this.grid.length - this.options.gridHeight,
          this.viewOffset.y + 1
        );
        break;
      case 'left':
        newOffsetX = Math.max(0, this.viewOffset.x - 1);
        break;
      case 'right':
        newOffsetX = Math.min(
          this.grid[0].length - this.options.gridWidth,
          this.viewOffset.x + 1
        );
        break;
    }
    
    // Check if we're scrolling too far from the path
    const canScroll = this.isScrollWithinLimits(newOffsetX, newOffsetY);
    
    if (canScroll) {
      this.viewOffset.x = newOffsetX;
      this.viewOffset.y = newOffsetY;
      this.renderVisibleGrid();
    }
  }
  
  /**
   * Check if the scroll is within limits relative to the path
   * @param {number} offsetX - New X offset to check
   * @param {number} offsetY - New Y offset to check
   * @return {boolean} Whether scroll is within limits
   */
  isScrollWithinLimits(offsetX, offsetY) {
    // If no path exists yet, allow scrolling
    if (!this.path || this.path.length === 0) {
      return true;
    }
    
    // Get path extents
    const centerX = Math.floor(this.grid[0].length / 2);
    const centerY = Math.floor(this.grid.length / 2);
    
    let minX = centerX, maxX = centerX;
    let minY = centerY, maxY = centerY;
    
    // Calculate min/max coordinates used in the path
    this.path.forEach(point => {
      const gridX = centerX + point.x;
      const gridY = centerY + point.y;
      
      minX = Math.min(minX, gridX);
      maxX = Math.max(maxX, gridX);
      minY = Math.min(minY, gridY);
      maxY = Math.max(maxY, gridY);
    });
    
    // Check if new scroll offset would be too far from path
    const maxDistance = this.options.maxScrollDistance;
    
    const tooFarLeft = offsetX < minX - maxDistance;
    const tooFarRight = offsetX + this.options.gridWidth > maxX + maxDistance;
    const tooFarUp = offsetY < minY - maxDistance;
    const tooFarDown = offsetY + this.options.gridHeight > maxY + maxDistance;
    
    return !(tooFarLeft || tooFarRight || tooFarUp || tooFarDown);
  }
  
  /**
   * Handle responsive layout changes
   */
  handleResponsive() {
    // Check if we're on mobile
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // Mobile layout: narrower grid
      this.options.gridWidth = 8;
      this.gridElement.style.gridTemplateColumns = `repeat(8, ${this.options.cellSize}px)`;
    } else {
      // Desktop layout: wider grid
      this.options.gridWidth = 10;
      this.gridElement.style.gridTemplateColumns = `repeat(10, ${this.options.cellSize}px)`;
    }
    
    // Re-render with updated dimensions
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

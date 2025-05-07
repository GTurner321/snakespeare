/**
 * IslandRenderer - Extension to Grid Game
 * Adds island-like appearance to grid game cells
 */

class IslandRenderer {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
    // Initialize when grid renderer is ready
    this.init();
    
    // Listen for path set event to update island rendering
    document.addEventListener('pathSet', (e) => {
      if (e.detail.success) {
        this.updateIslandAppearance();
      }
    });
    
    // Listen for grid rebuilt event to reapply island styling
    document.addEventListener('gridRebuilt', () => {
      this.updateIslandAppearance();
    });
    
    // Listen for selections changed
    document.addEventListener('selectionsCleared', () => {
      this.updateIslandAppearance();
    });
    
    console.log('IslandRenderer initialized');
  }
  
  /**
   * Initialize the island renderer
   */
  init() {
    if (!this.gridRenderer) {
      console.error('Grid renderer not available');
      return;
    }
    
    // Apply initial island appearance
    this.updateIslandAppearance();
    this.initialized = true;
  }
  
  /**
   * Update island appearance for all visible cells
   */
  updateIslandAppearance() {
    // Get all grid cells
    const cells = document.querySelectorAll('.grid-cell');
    if (!cells.length) {
      console.log('No grid cells found');
      return;
    }
    
    // First pass: clear existing island edge classes
    cells.forEach(cellElement => {
      cellElement.classList.remove(
        'sea-adjacent',
        'island-edge-top',
        'island-edge-right',
        'island-edge-bottom',
        'island-edge-left'
      );
    });
    
    // Second pass: process each cell
    cells.forEach(cellElement => {
      // Get cell coordinates
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      // Skip if coordinates are invalid
      if (isNaN(x) || isNaN(y)) return;
      
      // Get cell data
      const cell = this.getCellData(x, y);
      if (!cell) return;
      
      // Is this a path cell (letter cell)?
      if (cell.isPath) {
        // Check each direction for edges
        this.checkIslandEdges(cellElement, x, y);
      } else {
        // Non-path cell (sea) - check if adjacent to any letter cell
        this.checkSeaAdjacent(cellElement, x, y);
      }
    });
    
    console.log('Island appearance updated');
  }
  
  /**
   * Get cell data from grid renderer
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {Object|null} Cell data or null if invalid
   */
  getCellData(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return null;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return null;
    }
    
    return this.gridRenderer.grid[y][x];
  }
  
  /**
   * Check if a non-path cell (sea) is adjacent to any letter cells
   * @param {HTMLElement} cellElement - DOM element for the cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  checkSeaAdjacent(cellElement, x, y) {
    // Check all four directions
    const directions = [
      [0, -1], // top
      [1, 0],  // right
      [0, 1],  // bottom
      [-1, 0]  // left
    ];
    
    // Check each direction
    for (const [dx, dy] of directions) {
      const adjacentX = x + dx;
      const adjacentY = y + dy;
      
      // Get adjacent cell
      const adjacentCell = this.getCellData(adjacentX, adjacentY);
      
      // If adjacent cell is a path cell (letter cell)
      if (adjacentCell && adjacentCell.isPath) {
        // Mark this sea cell as adjacent to an island
        cellElement.classList.add('sea-adjacent');
        break; // One adjacency is enough
      }
    }
  }
  
  /**
   * Check island edges for a path cell (letter cell)
   * @param {HTMLElement} cellElement - DOM element for the cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  checkIslandEdges(cellElement, x, y) {
    // Define directions and corresponding edge classes
    const edgeDirections = [
      { dx: 0, dy: -1, edge: 'island-edge-top' },    // top
      { dx: 1, dy: 0, edge: 'island-edge-right' },   // right
      { dx: 0, dy: 1, edge: 'island-edge-bottom' },  // bottom
      { dx: -1, dy: 0, edge: 'island-edge-left' }    // left
    ];
    
    // Check each direction
    edgeDirections.forEach(direction => {
      const adjacentX = x + direction.dx;
      const adjacentY = y + direction.dy;
      
      // Get adjacent cell
      const adjacentCell = this.getCellData(adjacentX, adjacentY);
      
      // If adjacent cell is not a path cell (is sea) or is out of bounds
      if (!adjacentCell || !adjacentCell.isPath) {
        // Add edge class for this direction
        cellElement.classList.add(direction.edge);
      }
    });
  }
}

// Export for use in other modules
export default IslandRenderer;

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
      console.log('Path set event received, updating island appearance');
      setTimeout(() => this.updateIslandAppearance(), 200);
    });
    
    // Listen for grid rebuilt event to reapply island styling
    document.addEventListener('gridRebuilt', () => {
      console.log('Grid rebuilt event received, updating island appearance');
      setTimeout(() => this.updateIslandAppearance(), 200);
    });
    
    // Listen for selections changed
    document.addEventListener('selectionsCleared', () => {
      console.log('Selections cleared, updating island appearance');
      setTimeout(() => this.updateIslandAppearance(), 200);
    });
    
    // Additional listeners for other grid state changes
    document.addEventListener('gridScrolled', () => {
      console.log('Grid scrolled, updating island appearance');
      setTimeout(() => this.updateIslandAppearance(), 200);
    });
    
    document.addEventListener('gridCompletionChanged', () => {
      console.log('Grid completion changed, updating island appearance');
      setTimeout(() => this.updateIslandAppearance(), 200);
    });
    
    // Listen for selection changes
    document.addEventListener('revealedLettersUpdated', () => {
      console.log('Revealed letters updated, updating island appearance');
      setTimeout(() => this.updateIslandAppearance(), 200);
    });
    
    console.log('IslandRenderer initialized and listening for events');
  }
  
  /**
   * Initialize the island renderer
   */
  init() {
    if (!this.gridRenderer) {
      console.error('Grid renderer not available');
      return;
    }
    
    console.log('Initializing IslandRenderer...');
    
    // Apply initial island appearance - delayed to ensure grid is ready
    setTimeout(() => {
      this.updateIslandAppearance();
      this.initialized = true;
      console.log('Initial island appearance applied.');
    }, 500);
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
    
    console.log(`Updating island appearance for ${cells.length} cells...`);
    
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
    
    // Create a map of cell positions for faster lookup
    const cellMap = new Map();
    cells.forEach(cellElement => {
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      if (!isNaN(x) && !isNaN(y)) {
        cellMap.set(`${x},${y}`, {
          element: cellElement,
          x: x,
          y: y,
          isPath: this.isCellPath(x, y),
          isSelected: this.isCellSelected(x, y),
          isStart: this.isStartCell(x, y),
          isRevealed: this.isCellRevealed(x, y),
          isCompleted: this.isCellCompleted(x, y)
        });
      }
    });
    
    // Second pass: process path cells first to identify islands
    // and apply edge classes to them
    cellMap.forEach((cellInfo, key) => {
      const { element, x, y, isPath } = cellInfo;
      
      // Only process path (letter) cells first
      if (isPath) {
        // Skip processing for selected, completed or start cells
        // as they have different visual styles that take precedence
        if (cellInfo.isSelected || cellInfo.isCompleted) {
          return;
        }
        
        // Process letter cell to add edge classes
        this.processIslandCell(element, x, y, cellMap);
      }
    });
    
    // Third pass: process non-path cells to add sea-adjacent class
    cellMap.forEach((cellInfo, key) => {
      const { element, x, y, isPath } = cellInfo;
      
      // Only process non-path (sea) cells
      if (!isPath) {
        // Process sea cell to add adjacent class if needed
        this.processSeaCell(element, x, y, cellMap);
      }
    });
    
    console.log('Island appearance updated');
  }
  
  /**
   * Process an island cell, adding edge classes as needed
   * @param {HTMLElement} element - The cell element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Map} cellMap - Map of all cell positions
   */
  processIslandCell(element, x, y, cellMap) {
    // Define directions to check
    const directions = [
      { dx: 0, dy: -1, edge: 'island-edge-top' },
      { dx: 1, dy: 0, edge: 'island-edge-right' },
      { dx: 0, dy: 1, edge: 'island-edge-bottom' },
      { dx: -1, dy: 0, edge: 'island-edge-left' }
    ];
    
    // Check each direction
    directions.forEach(dir => {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const neighborKey = `${nx},${ny}`;
      const neighbor = cellMap.get(neighborKey);
      
      // If no neighbor or neighbor is not a path cell, add edge class
      if (!neighbor || !neighbor.isPath) {
        // Add yellow border on this edge since it's adjacent to sea
        element.classList.add(dir.edge);
      }
    });
  }
  
  /**
   * Process a sea cell, adding adjacent class if next to an island
   * @param {HTMLElement} element - The cell element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Map} cellMap - Map of all cell positions
   */
  processSeaCell(element, x, y, cellMap) {
    // Define directions to check
    const directions = [
      { dx: 0, dy: -1 },  // top
      { dx: 1, dy: 0 },   // right
      { dx: 0, dy: 1 },   // bottom
      { dx: -1, dy: 0 }   // left
    ];
    
    // Check each direction
    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const neighborKey = `${nx},${ny}`;
      const neighbor = cellMap.get(neighborKey);
      
      // If neighbor is a path cell (island), mark this cell as adjacent to sea
      if (neighbor && neighbor.isPath) {
        element.classList.add('sea-adjacent');
        break; // One adjacent island is enough
      }
    }
  }
  
  /**
   * Check if a cell is a path cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @return {boolean} True if the cell is a path cell
   */
  isCellPath(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    return this.gridRenderer.grid[y][x].isPath;
  }
  
  /**
   * Check if a cell is selected
   */
  isCellSelected(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    return this.gridRenderer.grid[y][x].isSelected;
  }
  
  /**
   * Check if a cell is the start cell
   */
  isStartCell(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    return this.gridRenderer.grid[y][x].isStart;
  }
  
  /**
   * Check if a cell is revealed
   */
  isCellRevealed(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    return this.gridRenderer.grid[y][x].isRevealed;
  }
  
  /**
   * Check if a cell is completed
   */
  isCellCompleted(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    return this.gridRenderer.grid[y][x].isCompleted;
  }
}

// Export for use in other modules
export default IslandRenderer;

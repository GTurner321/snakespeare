/**
 * IslandRenderer - Extension to Grid Game
 * Adds island-like appearance to grid game cells
 */

class IslandRenderer {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
    // Make this instance available globally for direct access
    window.islandRenderer = this;
    
    // Initialize with a slight delay to ensure grid is fully rendered
    setTimeout(() => this.updateIslandAppearance(), 500);
    
    // Set up event listeners for game state changes that require updating island appearance
    const events = [
      'pathSet',            // When a new path is set
      'gridRebuilt',        // When grid is rebuilt
      'selectionsCleared',  // When selections are cleared
      'gridScrolled',       // When grid is scrolled (new cells become visible)
      'gridCompletionChanged', // When phrase is completed
      'revealedLettersUpdated', // When hint letters are revealed
      'islandLettersUpdated'    // When island reduction happens
    ];
    
    events.forEach(eventName => {
      document.addEventListener(eventName, () => {
        // Use a short timeout to ensure grid state is settled
        setTimeout(() => this.updateIslandAppearance(), 200);
      });
    });
    
    // Listen for explicit update request
    document.addEventListener('updateIslandStyling', () => {
      console.log('Explicit request to update island styling received');
      setTimeout(() => this.updateIslandAppearance(), 100);
    });
    
    // Also update on window resize
    window.addEventListener('resize', () => {
      setTimeout(() => this.updateIslandAppearance(), 300);
    });
    
    console.log('IslandRenderer initialized and listening for events');
    this.initialized = true;
  }
  
  /**
   * Update island appearance for all visible cells
   */
  updateIslandAppearance() {
    console.log('Updating island appearance...');
    
    // Get all grid cells
    const cells = document.querySelectorAll('.grid-cell');
    if (!cells.length) {
      console.log('No grid cells found');
      return;
    }
    
    console.log(`Updating island appearance for ${cells.length} cells...`);
    
    // First pass: clear existing island classes
    cells.forEach(cellElement => {
      cellElement.classList.remove(
        'sea-adjacent',
        'island-edge-top',
        'island-edge-right',
        'island-edge-bottom',
        'island-edge-left'
      );
    });
    
    // Create a cell map for quick lookups
    const cellMap = new Map();
    cells.forEach(cellElement => {
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      if (!isNaN(x) && !isNaN(y)) {
        const isPath = this.isCellPath(x, y);
        
        // Store in map with coordinates as key
        cellMap.set(`${x},${y}`, {
          element: cellElement,
          x: x,
          y: y,
          isPath: isPath,
          // Also store other cell states for proper styling decisions
          isSelected: this.isCellSelected(x, y),
          isStart: this.isStartCell(x, y),
          isRevealed: this.isCellRevealed(x, y),
          isCompleted: this.isCellCompleted(x, y)
        });
        
        // Force path-cell class if it's a path cell
        if (isPath && !cellElement.classList.contains('path-cell')) {
          cellElement.classList.add('path-cell');
        }
      }
    });
    
    // Second pass: process all cells
    cellMap.forEach((cellInfo, key) => {
      const { element, x, y, isPath } = cellInfo;
      
      if (isPath) {
        // This is a letter cell (island) - add edge classes where needed
        this.processIslandEdges(element, x, y, cellMap);
      } else {
        // This is a sea cell - add sea-adjacent class if next to an island
        this.processSeaAdjacency(element, x, y, cellMap);
      }
    });
    
    console.log('Island appearance updated');
  }
  
  /**
   * Process island edges to add yellow borders where needed
   */
  processIslandEdges(element, x, y, cellMap) {
    // Check each direction for sea cells
    if (!this.hasNeighborPath(x, y-1, cellMap)) {
      element.classList.add('island-edge-top');
    }
    
    if (!this.hasNeighborPath(x+1, y, cellMap)) {
      element.classList.add('island-edge-right');
    }
    
    if (!this.hasNeighborPath(x, y+1, cellMap)) {
      element.classList.add('island-edge-bottom');
    }
    
    if (!this.hasNeighborPath(x-1, y, cellMap)) {
      element.classList.add('island-edge-left');
    }
  }
  
  /**
   * Process sea cells to add lighter blue adjacent to islands
   */
  processSeaAdjacency(element, x, y, cellMap) {
    // Check if this sea cell is adjacent to any island cell
    if (this.hasNeighborPath(x, y-1, cellMap) || 
        this.hasNeighborPath(x+1, y, cellMap) || 
        this.hasNeighborPath(x, y+1, cellMap) || 
        this.hasNeighborPath(x-1, y, cellMap)) {
      element.classList.add('sea-adjacent');
    }
  }
  
  /**
   * Check if a cell at the given coordinates is a path cell
   */
  hasNeighborPath(x, y, cellMap) {
    const neighbor = cellMap.get(`${x},${y}`);
    return neighbor && neighbor.isPath;
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

export default IslandRenderer;

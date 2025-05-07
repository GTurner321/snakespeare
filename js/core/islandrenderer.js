/**
 * IslandRenderer - Simplified version focused on core functionality
 */
class IslandRenderer {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    
    // Initialize when grid renderer is ready
    setTimeout(() => this.updateIslandAppearance(), 500);
    
    // Set up event listeners for game state changes
    const events = [
      'pathSet', 'gridRebuilt', 'selectionsCleared', 
      'gridScrolled', 'gridCompletionChanged', 'revealedLettersUpdated'
    ];
    
    events.forEach(eventName => {
      document.addEventListener(eventName, () => {
        setTimeout(() => this.updateIslandAppearance(), 200);
      });
    });
    
    console.log('IslandRenderer initialized and listening for events');
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
    
    // Clear existing island classes
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
        cellMap.set(`${x},${y}`, {
          element: cellElement,
          x: x,
          y: y,
          isPath: this.isCellPath(x, y)
        });
      }
    });
    
    // Process each cell
    cellMap.forEach((cellInfo, key) => {
      const { element, x, y, isPath } = cellInfo;
      
      if (isPath) {
        // This is a letter cell (island)
        this.processIslandEdges(element, x, y, cellMap);
      } else {
        // This is a sea cell
        this.processSeaAdjacency(element, x, y, cellMap);
      }
    });
    
    console.log('Island appearance updated');
  }
  
  /**
   * Process island edges to add yellow borders where needed
   */
  processIslandEdges(element, x, y, cellMap) {
    // Check each direction
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
}

// Export for use in other modules
export default IslandRenderer;

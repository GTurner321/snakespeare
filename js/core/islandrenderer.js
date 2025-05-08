/**
 * IslandRenderer - Focused fix to ensure proper class application
 * Ensures letter cells are green and non-letter cells are blue
 */

class IslandRenderer {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialized = false;
    
    // Make this instance available globally for direct access
    window.islandRenderer = this;
    
    // Force immediate update on initialization
    console.log('IslandRenderer initializing - forcing immediate update');
    this.updateIslandAppearance();
    
    // Also schedule a delayed update to ensure grid is fully rendered
    setTimeout(() => {
      console.log('IslandRenderer delayed update executing');
      this.updateIslandAppearance();
    }, 500);
    
    // Add specific event listeners focused on when cell content might change
    const criticalEvents = [
      'pathSet',              // When a path is newly set
      'gridRebuilt',          // When grid is rebuilt
      'islandLettersUpdated', // When island letters are updated 
      'islandReductionLevelChanged' // When reduction level changes
    ];
    
    criticalEvents.forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        console.log(`IslandRenderer: Critical event '${eventName}' received - updating appearance`);
        // Force update immediately
        this.updateIslandAppearance();
        
        // Also update again after a delay to ensure all changes are processed
        setTimeout(() => this.updateIslandAppearance(), 100);
      });
    });
    
    // Explicitly handle reduction level changes
    document.addEventListener('islandReductionLevelChanged', (e) => {
      console.log(`IslandRenderer: Reduction level changed to ${e.detail.level}`);
      // Triple-ensure update for reduction level changes
      this.updateIslandAppearance();
      setTimeout(() => this.updateIslandAppearance(), 100);
      setTimeout(() => this.updateIslandAppearance(), 300);
    });
    
    console.log('IslandRenderer initialized with critical event handling');
    this.initialized = true;
  }
  
  /**
   * Force update of island appearance - direct grid manipulation approach
   */
  updateIslandAppearance() {
    console.log('Updating island appearance with direct cell class manipulation');
    
    if (!this.gridRenderer || !this.gridRenderer.grid) {
      console.warn('Grid renderer or grid not available');
      return;
    }
    
    // Step 1: Get all DOM cells that are currently visible
    const cells = document.querySelectorAll('.grid-cell');
    if (!cells.length) {
      console.warn('No grid cells found in DOM');
      return;
    }
    
    console.log(`Processing ${cells.length} visible cells`);
    
    // Step 2: Direct application of core classes
    cells.forEach(cellElement => {
      // Get cell coordinates
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      if (isNaN(x) || isNaN(y)) {
        return;
      }
      
      try {
        // Critical: Check if the cell is a letter cell (path cell)
        const isPath = this.isCellPath(x, y);
        
        // IMPORTANT: Force add/remove the path-cell class based on whether it's a letter cell
        if (isPath) {
          if (!cellElement.classList.contains('path-cell')) {
            console.log(`Adding path-cell class to cell at (${x},${y})`);
            cellElement.classList.add('path-cell');
          }
        } else {
          if (cellElement.classList.contains('path-cell')) {
            console.log(`Removing path-cell class from cell at (${x},${y})`);
            cellElement.classList.remove('path-cell');
          }
        }
        
        // Process sea cells adjacent to islands
        if (!isPath) {
          const isAdjacent = this.isAdjacentToPath(x, y);
          if (isAdjacent) {
            cellElement.classList.add('sea-adjacent');
          } else {
            cellElement.classList.remove('sea-adjacent');
          }
        }
        
        // If it is a path cell, check for island edges
        if (isPath) {
          this.processIslandEdges(cellElement, x, y);
        }
      } catch (error) {
        console.error(`Error processing cell at (${x},${y}):`, error);
      }
    });
    
    console.log('Island appearance update completed');
  }
  
  /**
   * Process island edges to add yellow borders where needed
   */
  processIslandEdges(element, x, y) {
    // Clear existing edge classes
    element.classList.remove(
      'island-edge-top',
      'island-edge-right',
      'island-edge-bottom',
      'island-edge-left'
    );
    
    // Check each direction for sea cells
    if (!this.isCellPath(x, y-1)) {
      element.classList.add('island-edge-top');
    }
    
    if (!this.isCellPath(x+1, y)) {
      element.classList.add('island-edge-right');
    }
    
    if (!this.isCellPath(x, y+1)) {
      element.classList.add('island-edge-bottom');
    }
    
    if (!this.isCellPath(x-1, y)) {
      element.classList.add('island-edge-left');
    }
  }
  
  /**
   * Check if a cell is adjacent to any path cell
   */
  isAdjacentToPath(x, y) {
    return this.isCellPath(x, y-1) || 
           this.isCellPath(x+1, y) || 
           this.isCellPath(x, y+1) || 
           this.isCellPath(x-1, y);
  }
  
  /**
   * Check if a cell is a path cell - robust implementation
   */
  isCellPath(x, y) {
    if (!this.gridRenderer || !this.gridRenderer.grid) return false;
    
    // Check if coordinates are within grid bounds
    if (y < 0 || y >= this.gridRenderer.grid.length || 
        x < 0 || x >= this.gridRenderer.grid[0].length) {
      return false;
    }
    
    // Check if this cell is part of the path (has a letter)
    return this.gridRenderer.grid[y][x].isPath;
  }
}

export default IslandRenderer;

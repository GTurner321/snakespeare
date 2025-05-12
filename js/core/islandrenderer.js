/**
 * IslandRenderer - Modified to move beach effect to sea cells (FIXED)
 * Ensures both path cells and random letter cells are green but the
 * yellow border "beach" effect is on the sea cells on the proper sides
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
    
    // Add event listeners for all scenarios that might affect cell styling
    const criticalEvents = [
      'pathSet',                   // When a path is newly set
      'gridRebuilt',               // When grid is rebuilt
      'gridScrolled',              // When grid is scrolled
      'islandLettersUpdated',      // When island letters are updated 
      'islandReductionLevelChanged', // When reduction level changes
      'selectionsCleared',         // When selections are cleared
      'gridCompletionChanged'      // When grid is completed
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
    
    // Explicitly handle reduction level changes with multiple updates
    document.addEventListener('islandReductionLevelChanged', (e) => {
      console.log(`IslandRenderer: Reduction level changed to ${e.detail?.level}`);
      // Triple-ensure update for reduction level changes
      this.updateIslandAppearance();
      setTimeout(() => this.updateIslandAppearance(), 100);
      setTimeout(() => this.updateIslandAppearance(), 300);
    });
    
    // Listen for explicit update request
    document.addEventListener('updateIslandStyling', () => {
      console.log('IslandRenderer: Explicit request to update island styling');
      this.updateIslandAppearance();
    });
    
    console.log('IslandRenderer initialized with comprehensive event handling');
    this.initialized = true;
  }
  
  /**
   * Key method: Update island appearance by checking all visible cells
   * FIXED to put correct beach borders on sea cells
   */
  updateIslandAppearance() {
    console.log('Updating island appearance with beach effect on sea cells');
    
    if (!this.gridRenderer || !this.gridRenderer.grid) {
      console.warn('Grid renderer or grid not available');
      return;
    }
    
    // Get all visible cells in the DOM
    const cells = document.querySelectorAll('.grid-cell');
    if (!cells.length) {
      console.warn('No grid cells found in DOM');
      return;
    }
    
    console.log(`Processing ${cells.length} visible cells`);
    
    // Counter for debugging
    let letterCellCount = 0;
    let pathCellCount = 0;
    let seaCellCount = 0;
    let beachCellCount = 0;
    
    // Process each cell
    cells.forEach(cellElement => {
      // Get cell coordinates
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      if (isNaN(x) || isNaN(y)) {
        return;
      }
      
      try {
        // IMPORTANT: Check both isPath AND hasLetter
        const isPath = this.isCellPath(x, y);
        const hasLetter = this.cellHasLetter(x, y);
        
        // Count for debugging
        if (isPath) pathCellCount++;
        if (hasLetter && !isPath) letterCellCount++;
        if (!hasLetter && !isPath) seaCellCount++;
        
        // ANY cell with a letter should be styled as an island (green)
        if (isPath || hasLetter) {
          // Add path-cell class to make it green
          if (!cellElement.classList.contains('path-cell')) {
            cellElement.classList.add('path-cell');
          }
          
          // REMOVE island edge classes (yellow borders) from island cells
          cellElement.classList.remove(
            'island-edge-top',
            'island-edge-right',
            'island-edge-bottom',
            'island-edge-left'
          );
        } else {
          // Remove path-cell class from non-letter cells
          if (cellElement.classList.contains('path-cell')) {
            cellElement.classList.remove('path-cell');
          }
          
          // Process sea adjacency
          const adjacentIslands = this.getAdjacentLetterCells(x, y);
          
          if (adjacentIslands.length > 0) {
            // This is a sea cell adjacent to at least one island
            cellElement.classList.add('sea-adjacent');
            beachCellCount++;
            
            // FIXED: Add shore edge classes to sea cells in the CORRECT orientation
            // Reset previous shore edge classes
            cellElement.classList.remove(
              'shore-edge-top',
              'shore-edge-right',
              'shore-edge-bottom',
              'shore-edge-left'
            );
            
            // Add appropriate shore edge classes based on adjacent islands
            adjacentIslands.forEach(direction => {
              // Now the border should be on the SAME side as the direction of the island
              if (direction === 'top') {
                cellElement.classList.add('shore-edge-top'); // TOP border when island is above
              }
              if (direction === 'right') {
                cellElement.classList.add('shore-edge-right'); // RIGHT border when island is to the right
              }
              if (direction === 'bottom') {
                cellElement.classList.add('shore-edge-bottom'); // BOTTOM border when island is below
              }
              if (direction === 'left') {
                cellElement.classList.add('shore-edge-left'); // LEFT border when island is to the left
              }
            });
          } else {
            // Not adjacent to any islands
            cellElement.classList.remove('sea-adjacent');
            // Remove any shore edge classes
            cellElement.classList.remove(
              'shore-edge-top',
              'shore-edge-right',
              'shore-edge-bottom',
              'shore-edge-left'
            );
          }
        }
      } catch (error) {
        console.error(`Error processing cell at (${x},${y}):`, error);
      }
    });
    
    console.log(`Island appearance update completed: ${pathCellCount} path cells, ${letterCellCount} random letter cells, ${seaCellCount} sea cells, ${beachCellCount} beach cells`);
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
   * Check if a cell is adjacent to any cell that has a letter
   * KEPT for backwards compatibility
   */
  isAdjacentToAnyLetterCell(x, y) {
    return this.getAdjacentLetterCells(x, y).length > 0;
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
}

export default IslandRenderer;

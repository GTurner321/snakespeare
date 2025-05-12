/**
 * Path Generator for Grid Game
 * Creates a snake-like path for letters in a phrase
 * Based on coordinate grid with start at (0,0)
 * FIXED: Now properly verifies path completion and returns null if incomplete
 */

class PathGenerator {
  constructor() {
    this.visited = new Set(); // Track visited coordinates
    this.path = [];           // Store generated path coordinates
    this.directions = [       // Possible move directions (up, right, down, left)
      [0, -1], [1, 0], [0, 1], [-1, 0]
    ];
    // Maximum grid limits to ensure path stays within 51x51 bounds
    this.maxDistance = 25; // Since 51/2 = 25.5
    
    // Distribution of letters for weighted random selection
    this.letterDistribution = [
      'E','E','E','E','E','E','E','E','E','E','E','E',
      'T','T','T','T','T','T','T','T',
      'A','A','A','A','A','A','A',
      'O','O','O','O','O','O','O',
      'I','I','I','I','I','I','I',
      'N','N','N','N','N','N','N',
      'S','S','S','S','S','S',
      'H','H','H','H','H','H',
      'R','R','R','R','R','R',
      'D','D','D','D',
      'L','L','L','L',
      'C','C','C',
      'U','U','U',
      'M','M',
      'W','W',
      'F','F',
      'G','G',
      'Y','Y',
      'P','P',
      'B',
      'V',
      'K',
      'J',
      'Q',
      'X',
      'Z'
    ];
    
    // Store pre-generated random cell selections for each level
    this.preGeneratedCells = {
      0: [], // Level 0: 100% selection
      1: [], // Level 1: 40% initial + 70% secondary
      2: []  // Level 2: 30% initial + 60% secondary
    };
    
    // NEW: Store cells with 3 adjacent edges to path
    this.highPriorityCornerCells = [];
  }
  
  /**
   * Generate a path for the given letter sequence
   * FIXED: Now returns null if the path cannot be fully generated
   * @param {Array|String} letterList - Array of letters or string to be positioned on the grid
   * @return {Array|null} Array of {x, y, letter} objects representing the path, or null if incomplete
   */
  generatePath(letterList) {
    // Reset state for new path generation
    this.visited = new Set();
    this.path = [];
    
    // Reset pre-generated cells
    this.preGeneratedCells = {
      0: [],
      1: [],
      2: []
    };
    
    // Reset high priority corner cells
    this.highPriorityCornerCells = [];
    
    // Parse letter list to ensure it's in the right format (skipping spaces)
    const letters = this.parseLetterList(letterList);
    
    // Start at coordinate (0,0)
    let currentX = 0;
    let currentY = 0;
    
    // Add starting point with first letter
    this.addToPath(currentX, currentY, letters[0]);
    
    // Generate rest of the path for remaining letters
    for (let i = 1; i < letters.length; i++) {
      // Try to find next valid position
      const nextPos = this.findNextPosition(currentX, currentY);
      
      // If no valid position found, return null to indicate incomplete path
      if (!nextPos) {
        console.error('Could not find valid next position for letter:', letters[i]);
        return null; // FIXED: Return null instead of breaking out to signal incomplete path
      }
      
      // Update current position
      currentX = nextPos.x;
      currentY = nextPos.y;
      
      // Add position to path with current letter
      this.addToPath(currentX, currentY, letters[i]);
    }
    
    // Only return the path if all letters were placed successfully
    return this.path;
  }
  
  /**
   * Parse letter list to ensure it's an array of characters, skipping spaces and punctuation
   * @param {Array|String} letterList - Input letter list
   * @return {Array} Array of letters without spaces or punctuation
   */
  parseLetterList(letterList) {
    // Define a regex pattern for characters to include (letters and numbers only)
    const includePattern = /[a-zA-Z0-9]/;
    
    // Log the input for debugging
    console.log('Parsing letter list:', letterList);
    
    // Always treat it as a single string
    if (typeof letterList === 'string') {
      // Filter out non-alphanumeric characters when splitting the string
      const filtered = letterList.split('')
        .filter(char => includePattern.test(char));
      
      console.log('Filtered letter list:', filtered);
      return filtered;
    }
    // If it's already an array
    else if (Array.isArray(letterList)) {
      return letterList.filter(char => includePattern.test(char));
    }
    // Default fallback
    return "TESTPHRASE".split('');
  }
  
  /**
   * Add a position to the path
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} letter - Letter to place at this position
   */
  addToPath(x, y, letter) {
    const key = `${x},${y}`;
    this.visited.add(key);
    this.path.push({ x, y, letter });
  }
  
  /**
   * Check if a position is valid for the next move
   * @param {number} newX - Candidate X coordinate
   * @param {number} newY - Candidate Y coordinate
   * @param {number} currentX - Current X coordinate
   * @param {number} currentY - Current Y coordinate
   * @return {boolean} Whether the position is valid
   */
  isValidNextPosition(newX, newY, currentX, currentY) {
    // Check if position is already visited
    const key = `${newX},${newY}`;
    if (this.visited.has(key)) {
      return false;
    }
    
    // Check if position is within bounds
    if (Math.abs(newX) > this.maxDistance || Math.abs(newY) > this.maxDistance) {
      return false;
    }
    
    // Check if position is adjacent to current position
    const isAdjacentToCurrent = (Math.abs(newX - currentX) === 1 && newY === currentY) || 
                               (Math.abs(newY - currentY) === 1 && newX === currentX);
    if (!isAdjacentToCurrent) {
      return false;
    }
    
    // Check that it's not adjacent to any other visited cells
    // except the current one
    for (const point of this.path) {
      // Skip checking against current position
      if (point.x === currentX && point.y === currentY) {
        continue;
      }
      
      // Check if adjacent to this path point
      const isAdjacent = (Math.abs(newX - point.x) === 1 && newY === point.y) || 
                         (Math.abs(newY - point.y) === 1 && newX === point.x);
      
      // If adjacent to any other point, it's not valid
      if (isAdjacent) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Find next valid position with improved path planning
   * @param {number} x - Current X coordinate
   * @param {number} y - Current Y coordinate
   * @return {Object|null} Next position {x, y} or null if no valid position
   */
  findNextPosition(x, y) {
    // Get current path length
    const pathLength = this.path.length;
    
    // For longer paths, prioritize directions that lead away from the center
    // to avoid the path folding back on itself too early
    let shuffledDirs;
    
    if (pathLength > 5) {
      // Calculate distance from center (0,0)
      const distFromCenter = Math.sqrt(x*x + y*y);
      
      // If we're still close to the center, prioritize moving outward
      if (distFromCenter < 5) {
        // Find directions that lead away from center
        const outwardDirs = this.directions.filter(([dx, dy]) => {
          const newX = x + dx;
          const newY = y + dy;
          const newDist = Math.sqrt(newX*newX + newY*newY);
          return newDist > distFromCenter;
        });
        
        // Use outward directions first, then any other valid directions
        shuffledDirs = [
          ...this.shuffleArray([...outwardDirs]),
          ...this.shuffleArray(this.directions.filter(d => !outwardDirs.includes(d)))
        ];
      } else {
        // Otherwise shuffle normally
        shuffledDirs = this.shuffleArray([...this.directions]);
      }
    } else {
      // For short paths, just shuffle normally
      shuffledDirs = this.shuffleArray([...this.directions]);
    }
    
    // Try each direction
    for (const [dx, dy] of shuffledDirs) {
      const newX = x + dx;
      const newY = y + dy;
      
      // Check if this is a valid next position
      if (this.isValidNextPosition(newX, newY, x, y)) {
        return { x: newX, y: newY };
      }
    }
    
    return null; // No valid position found
  }
  
  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @return {Array} Shuffled array
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Check if a cell would create congestion (is between path cells on opposite sides)
   * @param {number} x - X coordinate to check
   * @param {number} y - Y coordinate to check
   * @param {Map} pathCellMap - Map of path cells for lookup
   * @return {boolean} True if the cell would create congestion
   */
  isCellCongested(x, y, pathCellMap) {
    // Check if this cell is between two path cells horizontally
    const hasHorizontalCongestion = 
      pathCellMap.has(`${x-1},${y}`) && 
      pathCellMap.has(`${x+1},${y}`);
    
    // Check if this cell is between two path cells vertically
    const hasVerticalCongestion = 
      pathCellMap.has(`${x},${y-1}`) && 
      pathCellMap.has(`${x},${y+1}`);
    
    // Return true if either type of congestion is detected
    return hasHorizontalCongestion || hasVerticalCongestion;
  }

  /**
   * NEW: Check if a cell has 3 adjacent edges to the path
   * @param {number} x - X coordinate to check
   * @param {number} y - Y coordinate to check
   * @param {Map} pathCellMap - Map of path cells for lookup
   * @return {boolean} True if the cell has 3 adjacent edges to the path
   */
  hasThreeAdjacentEdges(x, y, pathCellMap) {
    // Count adjacent path cells
    let adjacentCount = 0;
    
    // Check all four directions
    if (pathCellMap.has(`${x-1},${y}`)) adjacentCount++;
    if (pathCellMap.has(`${x+1},${y}`)) adjacentCount++;
    if (pathCellMap.has(`${x},${y-1}`)) adjacentCount++;
    if (pathCellMap.has(`${x},${y+1}`)) adjacentCount++;
    
    // Return true if exactly 3 adjacent edges
    return adjacentCount === 3;
  }

  /**
   * Find cells adjacent to the path, excluding congested areas and marking high-priority corner cells
   * @return {Object} Object with adjacentCells array and highPriorityCornerCells array
   */
  findAdjacentCells() {
    const adjacentCells = new Set();
    const excludedCells = new Set();
    this.highPriorityCornerCells = []; // Reset the corner cells
    
    // First, build a map of all path cells for quick lookup
    const pathCellMap = new Map();
    for (const pathCell of this.path) {
      pathCellMap.set(`${pathCell.x},${pathCell.y}`, pathCell);
    }
    
    // Iterate through each cell in the path
    for (const pathCell of this.path) {
      // For each path cell, check all four adjacent directions
      for (const [dx, dy] of this.directions) {
        const newX = pathCell.x + dx;
        const newY = pathCell.y + dy;
        const key = `${newX},${newY}`;
        
        // Skip if the cell is already in the path
        if (this.visited.has(key)) {
          continue;
        }
        
        // Skip if outside bounds
        if (Math.abs(newX) > this.maxDistance || Math.abs(newY) > this.maxDistance) {
          continue;
        }
        
        // Check if this cell has 3 adjacent edges to the path (corner/turn case)
        if (this.hasThreeAdjacentEdges(newX, newY, pathCellMap)) {
          // This is a high-priority corner cell - add to special list
          this.highPriorityCornerCells.push({ x: newX, y: newY });
          // Also add to adjacent cells
          adjacentCells.add(key);
          continue;
        }
        
        // Check if this adjacent cell would create congestion
        if (this.isCellCongested(newX, newY, pathCellMap)) {
          // This cell is between two path cells - exclude it
          excludedCells.add(key);
          continue;
        }
        
        // Otherwise, it's a valid adjacent cell
        adjacentCells.add(key);
      }
    }
    
    // Remove any excluded cells from the adjacentCells set
    for (const key of excludedCells) {
      adjacentCells.delete(key);
    }
    
    // Convert adjacentCells Set to array of {x, y} objects
    const adjacentCellsList = Array.from(adjacentCells).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    
    console.log(`Found ${this.highPriorityCornerCells.length} high-priority corner cells (3 adjacent edges)`);
    
    return adjacentCellsList;
  }

  /**
   * Pre-generate random letter cells for all reduction levels
   * Will be called after path generation is complete
   */
  preGenerateRandomLetterCells() {
    // First, build a map of all path cells for quick lookup (used throughout)
    const pathCellMap = new Map();
    for (const pathCell of this.path) {
      pathCellMap.set(`${pathCell.x},${pathCell.y}`, pathCell);
    }
    
    // Step 1: Find all cells adjacent to the path (excluding congested areas)
    const adjacentCellList = this.findAdjacentCells();
    console.log(`Found ${adjacentCellList.length} valid cells adjacent to the path (excluding congested areas)`);
    console.log(`Including ${this.highPriorityCornerCells.length} high-priority corner cells`);
    
    // Generate cells for Level 0 (100% selection)
    this.preGeneratedCells[0] = this.generateLevel0Cells(adjacentCellList);
    
    // Generate cells for Level 1 (40% initial + 70% secondary)
    this.preGeneratedCells[1] = this.generateLevel1Cells(adjacentCellList, pathCellMap);
    
    // Generate cells for Level 2 (30% initial + 60% secondary) - should be subset of Level 1
    this.preGeneratedCells[2] = this.generateLevel2Cells(this.preGeneratedCells[1], adjacentCellList, pathCellMap);
    
    console.log('Pre-generated random letter cells for all levels:');
    console.log(`Level 0: ${this.preGeneratedCells[0].length} cells`);
    console.log(`Level 1: ${this.preGeneratedCells[1].length} cells`);
    console.log(`Level 2: ${this.preGeneratedCells[2].length} cells`);

    console.log('Details of pre-generated cells:');
    console.log(`Level 0: ${JSON.stringify(this.preGeneratedCells[0].slice(0, 3))}... (total: ${this.preGeneratedCells[0].length})`);
    console.log(`Level 1: ${JSON.stringify(this.preGeneratedCells[1].slice(0, 3))}... (total: ${this.preGeneratedCells[1].length})`);
    console.log(`Level 2: ${JSON.stringify(this.preGeneratedCells[2].slice(0, 3))}... (total: ${this.preGeneratedCells[2].length})`);
    
    // Make sure Level 1 is more than Level 2
    if (this.preGeneratedCells[1].length <= this.preGeneratedCells[2].length) {
      console.error('Error: Level 1 should have more cells than Level 2!');
    }
    
    // Make sure Level 0 is more than Level 1
    if (this.preGeneratedCells[0].length <= this.preGeneratedCells[1].length) {
      console.error('Error: Level 0 should have more cells than Level 1!');
    }
    
    return true;
  }
  
  /**
   * Generate cells for Level 0 (100% selection)
   * @param {Array} adjacentCellList - List of all valid adjacent cells
   * @return {Array} Array of {x, y, letter} objects
   */
  generateLevel0Cells(adjacentCellList) {
    // For level 0, select all adjacent cells
    return adjacentCellList.map(cell => ({
      x: cell.x,
      y: cell.y,
      letter: this.getWeightedRandomLetter()
    }));
  }
  
  /**
   * Generate cells for Level 1 (40% initial + 70% secondary)
   * @param {Array} adjacentCellList - List of all valid adjacent cells
   * @param {Map} pathCellMap - Map of path cells for lookup
   * @return {Array} Array of {x, y, letter} objects
   */
  generateLevel1Cells(adjacentCellList, pathCellMap) {
    // Create a map of high-priority corner cells for fast lookup
    const cornerCellsMap = new Map();
    for (const cell of this.highPriorityCornerCells) {
      cornerCellsMap.set(`${cell.x},${cell.y}`, cell);
    }
    
    // Filter out high-priority corner cells from the adjacent cells list
    // They'll be added separately to ensure they're always included
    const regularAdjacentCells = adjacentCellList.filter(cell => 
      !cornerCellsMap.has(`${cell.x},${cell.y}`)
    );
    
    // Step 1: Randomly select 40% of adjacent cells
    const selectedCount = Math.max(1, Math.ceil(regularAdjacentCells.length * 0.4));
    const shuffledAdjacentCells = this.shuffleArray([...regularAdjacentCells]);
    const primarySelectedCells = shuffledAdjacentCells.slice(0, selectedCount);
    
    // Create a set for fast lookups of selected cells
    const selectedCellsSet = new Set(
      primarySelectedCells.map(cell => `${cell.x},${cell.y}`)
    );
    
    // Step 2: Find cells adjacent to the 40% selected cells but still adjacent to the path
    const adjacentToSelected = [];
    
    for (const cell of regularAdjacentCells) {
      const cellKey = `${cell.x},${cell.y}`;
      
      // Skip if this cell is already in the 40% selected
      if (selectedCellsSet.has(cellKey)) {
        continue;
      }
      
      // Skip if this cell would create congestion
      if (this.isCellCongested(cell.x, cell.y, pathCellMap)) {
        continue;
      }
      
      // Check if this cell is adjacent to any of the 40% selected cells
      let isAdjacentToSelected = false;
      for (const selectedCell of primarySelectedCells) {
        const isAdjacent = (
          (Math.abs(cell.x - selectedCell.x) === 1 && cell.y === selectedCell.y) ||
          (Math.abs(cell.y - selectedCell.y) === 1 && cell.x === selectedCell.x)
        );
        
        if (isAdjacent) {
          isAdjacentToSelected = true;
          break;
        }
      }
      
      // If it's adjacent to one of the 40% selected cells, add it to our list
      if (isAdjacentToSelected) {
        adjacentToSelected.push(cell);
      }
    }
    
    // Step 3: Randomly select 70% of cells adjacent to the 40% selected
    const secondarySelectedCount = Math.ceil(adjacentToSelected.length * 0.7);
    const shuffledSecondary = this.shuffleArray([...adjacentToSelected]);
    const secondarySelectedCells = shuffledSecondary.slice(0, secondarySelectedCount);
    
    // Step 4: Combine both lists and assign random letters
    const allSelectedCells = [
      ...primarySelectedCells,
      ...secondarySelectedCells,
      ...this.highPriorityCornerCells // Add ALL high-priority corner cells
    ];
    
    return allSelectedCells.map(cell => ({
      x: cell.x,
      y: cell.y,
      letter: this.getWeightedRandomLetter()
    }));
  }
  
  /**
   * Generate cells for Level 2 (30% initial + 60% secondary)
   * @param {Array} level1Cells - The cells selected for Level 1
   * @param {Array} adjacentCellList - List of all valid adjacent cells
   * @param {Map} pathCellMap - Map of path cells for lookup
   * @return {Array} Array of {x, y, letter} objects
   */
  generateLevel2Cells(level1Cells, adjacentCellList, pathCellMap) {
    // Create a map of high-priority corner cells for fast lookup
    const cornerCellsMap = new Map();
    for (const cell of this.highPriorityCornerCells) {
      cornerCellsMap.set(`${cell.x},${cell.y}`, cell);
    }
    
    // Create a map of Level 1 cells for fast lookup
    const level1CellMap = new Map();
    for (const cell of level1Cells) {
      level1CellMap.set(`${cell.x},${cell.y}`, cell);
    }
    
    // Filter out high-priority corner cells from the adjacent cells list
    const regularAdjacentCells = adjacentCellList.filter(cell => 
      !cornerCellsMap.has(`${cell.x},${cell.y}`)
    );
    
    // Step 1: Randomly select 30% of adjacent cells
    const selectedCount = Math.max(1, Math.ceil(regularAdjacentCells.length * 0.3));
    const shuffledAdjacentCells = this.shuffleArray([...regularAdjacentCells]);
    const primarySelectedCells = shuffledAdjacentCells.slice(0, selectedCount);
    
    // Step 2: Find cells adjacent to the 30% selected cells but still adjacent to the path
    const adjacentToSelected = [];
    const selectedCellsSet = new Set(
      primarySelectedCells.map(cell => `${cell.x},${cell.y}`)
    );
    
    for (const cell of regularAdjacentCells) {
      const cellKey = `${cell.x},${cell.y}`;
      
      // Skip if this cell is already in the 30% selected
      if (selectedCellsSet.has(cellKey)) {
        continue;
      }
      
      // Skip if this cell would create congestion
      if (this.isCellCongested(cell.x, cell.y, pathCellMap)) {
        continue;
      }
      
      // Check if this cell is adjacent to any of the 30% selected cells
      let isAdjacentToSelected = false;
      for (const selectedCell of primarySelectedCells) {
        const isAdjacent = (
          (Math.abs(cell.x - selectedCell.x) === 1 && cell.y === selectedCell.y) ||
          (Math.abs(cell.y - selectedCell.y) === 1 && cell.x === selectedCell.x)
        );
        
        if (isAdjacent) {
          isAdjacentToSelected = true;
          break;
        }
      }
      
      // If it's adjacent to one of the 30% selected cells, add it to our list
      if (isAdjacentToSelected) {
        adjacentToSelected.push(cell);
      }
    }
    
    // Step 3: Randomly select 60% of cells adjacent to the 30% selected
    const secondarySelectedCount = Math.ceil(adjacentToSelected.length * 0.6);
    const shuffledSecondary = this.shuffleArray([...adjacentToSelected]);
    const secondarySelectedCells = shuffledSecondary.slice(0, secondarySelectedCount);
    
    // Step 4: Combine both lists and assign random letters
    const allSelectedCells = [
      ...primarySelectedCells,
      ...secondarySelectedCells,
      ...this.highPriorityCornerCells // Add ALL high-priority corner cells
    ];
    
    // Step 5: Ensure all selected cells are also in Level 1
    const level2Cells = allSelectedCells.filter(cell => {
      const key = `${cell.x},${cell.y}`;
      return level1CellMap.has(key) || cornerCellsMap.has(key);
    });
    
    // Map to include letters
    return level2Cells.map(cell => {
      // Use the same letter that was assigned at Level 1
      const key = `${cell.x},${cell.y}`;
      const level1Cell = level1CellMap.get(key);
      return {
        x: cell.x,
        y: cell.y,
        letter: level1Cell ? level1Cell.letter : this.getWeightedRandomLetter()
      };
    });
  }
  
  getRandomLettersForLevel(level) {
    if (level < 0 || level > 2) {
      console.error(`Invalid island reduction level: ${level}. Using level 0.`);
      level = 0;
    }
    
    const cellCount = this.preGeneratedCells[level].length;
    console.log(`Getting ${cellCount} pre-generated cells for island reduction level ${level}`);
    
    // Deep clone the cells to prevent modification of the originals
    return JSON.parse(JSON.stringify(this.preGeneratedCells[level]));
  }
  
  /**
   * Legacy method for backward compatibility
   * Now uses pre-generated cells for the default level (2)
   * @return {Array} Array of {x, y, letter} objects with random letters
   */
  generateAdjacentRandomLetters() {
    // If we haven't pre-generated cells yet, do it now
    if (this.preGeneratedCells[0].length === 0) {
      this.preGenerateRandomLetterCells();
    }
    
    // Return the cells for level 2 (default)
    return this.preGeneratedCells[2];
  }
  
  /**
   * Get a random letter based on English letter frequency distribution
   * @return {string} Random uppercase letter
   */
  getWeightedRandomLetter() {
    const randomIndex = Math.floor(Math.random() * this.letterDistribution.length);
    return this.letterDistribution[randomIndex];
  }
  
  /**
   * Convert coordinate-based path to grid-relative coordinates
   * @param {Array} path - Path with {x, y, letter} objects
   * @param {number} gridSize - Size of the grid
   * @return {Array} Path with grid-relative coordinates
   */
  convertToGridCoordinates(path, gridSize = 8) {
    const centerOffset = Math.floor(gridSize / 2);
    return path.map(point => ({
      x: point.x + centerOffset,
      y: point.y + centerOffset,
      letter: point.letter
    }));
  }
}

// Export the class for use in other modules
export default PathGenerator;

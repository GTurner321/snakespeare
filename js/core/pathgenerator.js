/**
 * Path Generator for Grid Game
 * Creates a snake-like path for letters in a phrase
 * Based on coordinate grid with start at (0,0)
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
  }
  
  /**
   * Generate a path for the given letter sequence
   * @param {Array|String} letterList - Array of letters or string to be positioned on the grid
   * @return {Array} Array of {x, y, letter} objects representing the path
   */
  generatePath(letterList) {
    // Reset state for new path generation
    this.visited = new Set();
    this.path = [];
    
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
      
      // If no valid position found, break out (this shouldn't happen with proper grid size)
      if (!nextPos) {
        console.error('Could not find valid next position for letter:', letters[i]);
        break;
      }
      
      // Update current position
      currentX = nextPos.x;
      currentY = nextPos.y;
      
      // Add position to path with current letter
      this.addToPath(currentX, currentY, letters[i]);
    }
    
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
   * Find cells adjacent to the path
   * @return {Array} Array of {x, y} objects representing cells adjacent to the path
   */
  findAdjacentCells() {
    const adjacentCells = new Set();
    
    // Iterate through each cell in the path
    for (const pathCell of this.path) {
      // Check all four directions (up, right, down, left)
      for (const [dx, dy] of this.directions) {
        const newX = pathCell.x + dx;
        const newY = pathCell.y + dy;
        
        // Create key for this position
        const key = `${newX},${newY}`;
        
        // Check if this position is already in the path
        if (this.visited.has(key)) {
          continue; // Skip if already in path
        }
        
        // Check if within bounds
        if (Math.abs(newX) > this.maxDistance || Math.abs(newY) > this.maxDistance) {
          continue; // Skip if out of bounds
        }
        
        // It's a valid adjacent cell that's not part of the path
        adjacentCells.add(key);
      }
    }
    
    // Convert adjacentCells Set to array of {x, y} objects
    return Array.from(adjacentCells).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }
  
  /**
   * Generate random letters for cells adjacent to the path
   * @return {Array} Array of {x, y, letter} objects with random letters
   */
  generateAdjacentRandomLetters() {
    // Step 1: Find all cells adjacent to the path
    const adjacentCellList = this.findAdjacentCells();
    console.log(`Found ${adjacentCellList.length} cells adjacent to the path`);
    
    // Step 2: Randomly select X% of these cells
    const selectedCount = Math.max(1, Math.ceil(adjacentCellList.length * 0.25));
    const shuffledAdjacentCells = this.shuffleArray([...adjacentCellList]);
    const adjacentCellList20Percent = shuffledAdjacentCells.slice(0, selectedCount);
    
    // Create a set for fast lookups of selected cells
    const selectedCellsSet = new Set(
      adjacentCellList20Percent.map(cell => `${cell.x},${cell.y}`)
    );
    
    // Step 3: Find cells adjacent to the 20% selected cells but still adjacent to the path
    const adjacentToSelected = [];
    
    for (const cell of adjacentCellList) {
      const cellKey = `${cell.x},${cell.y}`;
      
      // Skip if this cell is already in the 20% selected
      if (selectedCellsSet.has(cellKey)) {
        continue;
      }
      
      // Check if this cell is adjacent to any of the 20% selected cells
      let isAdjacentToSelected = false;
      for (const selectedCell of adjacentCellList20Percent) {
        const isAdjacent = (
          (Math.abs(cell.x - selectedCell.x) === 1 && cell.y === selectedCell.y) ||
          (Math.abs(cell.y - selectedCell.y) === 1 && cell.x === selectedCell.x)
        );
        
        if (isAdjacent) {
          isAdjacentToSelected = true;
          break;
        }
      }
      
      // If it's adjacent to one of the 20% selected cells, add it to our list
      if (isAdjacentToSelected) {
        adjacentToSelected.push(cell);
      }
    }
    
    // Step 4: Randomly select Y% of the cells adjacent to the X% selected
    const secondarySelectedCount = Math.ceil(adjacentToSelected.length * 0.6);
    const shuffledSecondary = this.shuffleArray([...adjacentToSelected]);
    const adjacentCellListSecondary = shuffledSecondary.slice(0, secondarySelectedCount);
    
    // Step 5: Combine both lists and assign random letters
    const allSelectedCells = [
      ...adjacentCellList20Percent,
      ...adjacentCellListSecondary
    ];
    
    // Step 6: Assign random letters based on letter distribution
    const cellsWithLetters = allSelectedCells.map(cell => ({
      x: cell.x,
      y: cell.y,
      letter: this.getWeightedRandomLetter()
    }));
    
    console.log(`Generated ${cellsWithLetters.length} random letters adjacent to path`);
    return cellsWithLetters;
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

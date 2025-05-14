/**
 * Path Generator for Grid Game
 * Creates a snake-like path for letters in a phrase
 * Includes enhanced two-layer island generation with erosion support
 * Based on coordinate grid with start at (0,0)
 */

class PathGenerator {
  constructor() {
    this.visited = new Set(); // Track visited coordinates
    this.path = [];           // Store generated path coordinates
    this.directions = [       // Possible move directions (up, right, down, left)
      [0, -1], [1, 0], [0, 1], [-1, 0]
    ];
    // Maximum grid limits to ensure path stays within 71x71 bounds
    this.maxDistance = 35; // Since 71/2 = 35.5
    
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
    
    // Store pre-generated island cells
    this.islandCells = [];
    
    // NEW: Store cells that are adjacent to shore for erosion
    this.erodableCells = [];
    
    // NEW: Store cells with 3 adjacent edges to path
    this.highPriorityCornerCells = [];
  }
  
  /**
   * Generate a path for the given letter sequence
   * @param {Array|String} letterList - Array of letters or string to be positioned on the grid
   * @return {Array|null} Array of {x, y, letter} objects representing the path, or null if incomplete
   */
  generatePath(letterList) {
    // Reset state for new path generation
    this.visited = new Set();
    this.path = [];
    
    // Reset pre-generated cells
    this.islandCells = [];
    this.erodableCells = [];
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
        return null; // Return null to signal incomplete path
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
    
    // Always treat it as a single string
    if (typeof letterList === 'string') {
      // Filter out non-alphanumeric characters when splitting the string
      const filtered = letterList.split('')
        .filter(char => includePattern.test(char));
      
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
    const newArray = [...array]; // Create a copy to avoid modifying original
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
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
   * Check if a cell has 3 adjacent edges to the path
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
   * NEW: Find cells to include in two-layer system
   * Layer 1: Cells adjacent to the path
   * Layer 2: Cells adjacent to layer 1
   * @return {Object} Object with islandCells and erodableCells
   */
  generateTwoLayerIsland() {
    // Reset our collections
    this.islandCells = [];
    this.erodableCells = [];
    this.highPriorityCornerCells = [];
    
    // Maps for quicker lookups
    const pathCellMap = new Map();
    const layer1CellMap = new Map();
    
    // Step 1: Map all path cells for quick reference
    for (const pathCell of this.path) {
      pathCellMap.set(`${pathCell.x},${pathCell.y}`, pathCell);
    }
    
    // Step 2: Generate Layer 1 (cells directly adjacent to path)
    // First, find all valid adjacent cells (excluding congested areas)
    for (const pathCell of this.path) {
      // For each path cell, check all four adjacent directions
      for (const [dx, dy] of this.directions) {
        const newX = pathCell.x + dx;
        const newY = pathCell.y + dy;
        const key = `${newX},${newY}`;
        
        // Skip if the cell is already in the path
        if (pathCellMap.has(key)) {
          continue;
        }
        
        // Skip if outside bounds
        if (Math.abs(newX) > this.maxDistance || Math.abs(newY) > this.maxDistance) {
          continue;
        }
        
        // Skip if this cell would create congestion
        if (this.isCellCongested(newX, newY, pathCellMap)) {
          continue;
        }
        
        // Special case: Check if this cell has 3 adjacent edges to path (high priority)
        if (this.hasThreeAdjacentEdges(newX, newY, pathCellMap)) {
          this.highPriorityCornerCells.push({ x: newX, y: newY });
        }
        
        // This is a valid Layer 1 cell
        const letter = this.getWeightedRandomLetter();
        const cell = { x: newX, y: newY, letter, layer: 1 };
        this.islandCells.push(cell);
        layer1CellMap.set(key, cell);
      }
    }
    
    console.log(`Generated ${this.islandCells.length} Layer 1 cells adjacent to path`);
    
    // Step 3: Generate Layer 2 (cells adjacent to Layer 1 but not path)
    const layer2Cells = [];
    
    for (const layer1Cell of this.islandCells) {
      // For each Layer 1 cell, check all four adjacent directions
      for (const [dx, dy] of this.directions) {
        const newX = layer1Cell.x + dx;
        const newY = layer1Cell.y + dy;
        const key = `${newX},${newY}`;
        
        // Skip if already in path or Layer 1
        if (pathCellMap.has(key) || layer1CellMap.has(key)) {
          continue;
        }
        
        // Skip if already added to Layer 2
        if (layer2Cells.some(cell => cell.x === newX && cell.y === newY)) {
          continue;
        }
        
        // Skip if outside bounds
        if (Math.abs(newX) > this.maxDistance || Math.abs(newY) > this.maxDistance) {
          continue;
        }
        
        // This is a valid Layer 2 cell
        const letter = this.getWeightedRandomLetter();
        layer2Cells.push({ x: newX, y: newY, letter, layer: 2 });
      }
    }
    
    console.log(`Generated ${layer2Cells.length} Layer 2 cells`);
    
    // Step 4: Combine layers and mark all erodable cells
    this.islandCells = [...this.islandCells, ...layer2Cells];
    
    // Step 5: Remove ~20% of the island cells in adjacent pairs
    this.removeIslandCellPairs();
    
    // Step 6: Identify which cells are erodable (adjacent to sea)
    this.identifyErodableCells();
    
    console.log(`Final island has ${this.islandCells.length} cells (${this.erodableCells.length} erodable)`);
    
    return {
      islandCells: this.islandCells,
      erodableCells: this.erodableCells
    };
  }
  
  /**
   * NEW: Remove ~20% of island cells in adjacent pairs
   * This makes the island shape more natural
   */
  removeIslandCellPairs() {
    if (this.islandCells.length <= 4) {
      console.log('Not enough island cells to remove pairs');
      return;
    }
    
    // Calculate how many cells to remove (20% rounded up to nearest 2)
    const removeCount = Math.ceil(this.islandCells.length * 0.2);
    const adjustedRemoveCount = Math.ceil(removeCount / 2) * 2; // Ensure it's an even number
    const pairsToRemove = adjustedRemoveCount / 2;
    
    console.log(`Removing ${pairsToRemove} pairs (${adjustedRemoveCount} cells) from island`);
    
    // Find all possible adjacent pairs (preference for layer 2)
    const possiblePairs = [];
    
    // Create a map for quick lookups
    const cellMap = new Map();
    this.islandCells.forEach(cell => {
      cellMap.set(`${cell.x},${cell.y}`, cell);
    });
    
    // Find all pairs
    for (const cell of this.islandCells) {
      for (const [dx, dy] of this.directions) {
        const adjX = cell.x + dx;
        const adjY = cell.y + dy;
        const key = `${adjX},${adjY}`;
        
        // Check if adjacent cell exists in the island
        if (cellMap.has(key)) {
          const adjacentCell = cellMap.get(key);
          
          // Skip pairs that involve high priority corner cells
          if (this.highPriorityCornerCells.some(
              c => (c.x === cell.x && c.y === cell.y) || (c.x === adjX && c.y === adjY))) {
            continue;
          }
          
          // Prefer pairs where both cells are in layer 2
          const pairLayer = (cell.layer === 2 && adjacentCell.layer === 2) ? 2 : 1;
          
          // Create a pair object with a unique ID to avoid duplicates
          const pairId = [
            `${Math.min(cell.x, adjX)},${Math.min(cell.y, adjY)}`,
            `${Math.max(cell.x, adjX)},${Math.max(cell.y, adjY)}`
          ].join('-');
          
          possiblePairs.push({
            id: pairId,
            cells: [{ x: cell.x, y: cell.y }, { x: adjX, y: adjY }],
            layer: pairLayer
          });
        }
      }
    }
    
    // Remove duplicates by ID
    const uniquePairs = [];
    const seenIds = new Set();
    for (const pair of possiblePairs) {
      if (!seenIds.has(pair.id)) {
        uniquePairs.push(pair);
        seenIds.add(pair.id);
      }
    }
    
    // Sort pairs: layer 2 first
    uniquePairs.sort((a, b) => b.layer - a.layer);
    
    // Shuffle the first groups to ensure randomness
    const layer2Pairs = uniquePairs.filter(p => p.layer === 2);
    const layer1Pairs = uniquePairs.filter(p => p.layer === 1);
    
    const shuffledLayer2 = this.shuffleArray(layer2Pairs);
    const shuffledLayer1 = this.shuffleArray(layer1Pairs);
    
    const shuffledPairs = [...shuffledLayer2, ...shuffledLayer1];
    
    // Select pairs to remove
    const pairsToKeep = Math.max(0, shuffledPairs.length - pairsToRemove);
    const selectedPairs = shuffledPairs.slice(pairsToKeep);
    
    // Create a set of cell coordinates to remove
    const cellsToRemove = new Set();
    for (const pair of selectedPairs) {
      for (const cell of pair.cells) {
        cellsToRemove.add(`${cell.x},${cell.y}`);
      }
    }
    
    // Filter out the cells to remove
    this.islandCells = this.islandCells.filter(
      cell => !cellsToRemove.has(`${cell.x},${cell.y}`)
    );
    
    console.log(`Removed ${cellsToRemove.size} cells in ${selectedPairs.length} pairs`);
  }
  
  /**
   * NEW: Identify which cells are erodable (adjacent to sea)
   * These are cells that can be removed during erosion
   */
  identifyErodableCells() {
    this.erodableCells = [];
    
    // Create maps for quick lookups
    const pathCellMap = new Map();
    this.path.forEach(cell => {
      pathCellMap.set(`${cell.x},${cell.y}`, cell);
    });
    
    const islandCellMap = new Map();
    this.islandCells.forEach(cell => {
      islandCellMap.set(`${cell.x},${cell.y}`, cell);
    });
    
    // Check each island cell to see if it's adjacent to a "sea" cell
    for (const cell of this.islandCells) {
      let isAdjacentToSea = false;
      
      // Skip path cells - they can't be eroded
      if (pathCellMap.has(`${cell.x},${cell.y}`)) {
        continue;
      }
      
      // Check all adjacent cells
      for (const [dx, dy] of this.directions) {
        const adjX = cell.x + dx;
        const adjY = cell.y + dy;
        const key = `${adjX},${adjY}`;
        
        // If this adjacent spot is not in the path and not in the island, it's sea
        if (!pathCellMap.has(key) && !islandCellMap.has(key)) {
          isAdjacentToSea = true;
          break;
        }
      }
      
      if (isAdjacentToSea) {
        this.erodableCells.push({ ...cell, isErodable: true });
      }
    }
    
    console.log(`Identified ${this.erodableCells.length} erodable cells`);
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
   * Get the current island cells including path and random letters
   * @return {Array} Array of all island cells with letters
   */
  getIslandCells() {
    // If we haven't generated the island yet, do so now
    if (this.islandCells.length === 0) {
      this.generateTwoLayerIsland();
    }
    
    return this.islandCells;
  }
  
  /**
   * Get the current erodable cells
   * @return {Array} Array of cells that can be eroded
   */
  getErodableCells() {
    return this.erodableCells;
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

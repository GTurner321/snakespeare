/**
 * Path Generator for Grid Game
 * Creates a snake-like path for letters in a phrase
 * Includes enhanced three-layer island generation with erosion support
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
    
    // Store cells that are adjacent to shore for erosion
    this.erodableCells = [];
    
    // Store cells with 3 adjacent edges to path
    this.highPriorityCornerCells = [];
    
    // NEW: Store layer 3 cells separately
    this.layer3Cells = [];
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
    this.layer3Cells = []; // NEW: Reset layer 3 cells
    
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
   * Modified: Find cells to include in three-layer system
   * Layer 1: Cells adjacent to the path
   * Layer 2: Cells adjacent to layer 1
   * Layer 3: Cells adjacent to layer 2 with special pattern removal
   * @return {Object} Object with islandCells and erodableCells
   */
  generateTwoLayerIsland() {
    // Forward to three-layer system for enhanced path obscuring
    return this.generateThreeLayerIsland();
  }
  
  /**
   * NEW: Enhanced version of generateTwoLayerIsland that adds a third layer
   * with a specific pattern of removals to obscure the path
   * @return {Object} Object with islandCells and erodableCells
   */
  generateThreeLayerIsland() {
    // Reset our collections
    this.islandCells = [];
    this.erodableCells = [];
    this.highPriorityCornerCells = [];
    this.layer3Cells = [];
    
    // Maps for quicker lookups
    const pathCellMap = new Map();
    const layer1CellMap = new Map();
    const layer2CellMap = new Map();
    
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
        const cell = { x: newX, y: newY, letter, layer: 2 };
        layer2Cells.push(cell);
        layer2CellMap.set(key, cell);
      }
    }
    
    console.log(`Generated ${layer2Cells.length} Layer 2 cells`);
    
    // NEW Step 4: Generate Layer 3 (cells adjacent to Layer 2 but not Layer 1 or path)
    const layer3Cells = [];
    
    for (const layer2Cell of layer2Cells) {
      // For each Layer 2 cell, check all four adjacent directions
      for (const [dx, dy] of this.directions) {
        const newX = layer2Cell.x + dx;
        const newY = layer2Cell.y + dy;
        const key = `${newX},${newY}`;
        
        // Skip if already in path, Layer 1, or Layer 2
        if (pathCellMap.has(key) || layer1CellMap.has(key) || layer2CellMap.has(key)) {
          continue;
        }
        
        // Skip if already added to Layer 3
        if (layer3Cells.some(cell => cell.x === newX && cell.y === newY)) {
          continue;
        }
        
        // Skip if outside bounds
        if (Math.abs(newX) > this.maxDistance || Math.abs(newY) > this.maxDistance) {
          continue;
        }
        
        // This is a valid Layer 3 cell
        const letter = this.getWeightedRandomLetter();
        const cell = { x: newX, y: newY, letter, layer: 3 };
        layer3Cells.push(cell);
      }
    }
    
    console.log(`Generated ${layer3Cells.length} Layer 3 cells`);
    
    // Step 5: Store generated layer 3 cells before processing
    this.layer3Cells = [...layer3Cells];
    
    // Step 6: Apply the special pattern removal to Layer 3
    const processedLayer3 = this.applyLayer3RemovalPattern(layer3Cells);
    
    console.log(`After pattern removal: ${processedLayer3.length} Layer 3 cells remain`);
    
    // Step 7: Combine all layers
    this.islandCells = [...this.islandCells, ...layer2Cells, ...processedLayer3];
    
    // Step 8: Remove ~25% of the island cells in adjacent pairs (increased from 20%)
    this.removeIslandCellPairs(0.25); // Changed percentage from 0.2 to 0.25
    
    // Step 9: Identify which cells are erodable (adjacent to sea)
    this.identifyErodableCells();
    
    console.log(`Final island has ${this.islandCells.length} cells (${this.erodableCells.length} erodable)`);
    
    return {
      islandCells: this.islandCells,
      erodableCells: this.erodableCells
    };
  }
  
  /**
   * NEW: Arrange Layer 3 cells in clockwise order and apply the removal pattern
   * @param {Array} layer3Cells - Array of Layer 3 cells
   * @return {Array} Modified Layer 3 cells with pattern-based removals
   */
  applyLayer3RemovalPattern(layer3Cells) {
    if (layer3Cells.length === 0) {
      return [];
    }
    
    // Step 1: Find a starting cell (we'll use the one closest to the origin)
    let startCell = layer3Cells[0];
    let minDistance = Math.sqrt(startCell.x * startCell.x + startCell.y * startCell.y);
    
    for (const cell of layer3Cells) {
      const distance = Math.sqrt(cell.x * cell.x + cell.y * cell.y);
      if (distance < minDistance) {
        minDistance = distance;
        startCell = cell;
      }
    }
    
    // Step 2: Arrange cells in clockwise order from the starting cell
    const orderedCells = this.arrangeClockwise(startCell, layer3Cells);
    
    // Step 3: Apply the removal pattern
    const processedCells = [];
    
    // Choose random removal and keep counts for this pattern
    const removeCount = Math.floor(Math.random() * 5) + 4; // 4-8 cells removed
    const keepCount = Math.floor(Math.random() * 4) + 1;   // 1-4 cells kept
    
    let index = 0;
    let mode = 'remove'; // Start by removing cells
    let currentCount = 0;
    
    while (index < orderedCells.length) {
      if (mode === 'remove') {
        // Skip (remove) this cell
        currentCount++;
        if (currentCount >= removeCount) {
          // Switch to keep mode
          mode = 'keep';
          currentCount = 0;
        }
      } else { // mode === 'keep'
        // Keep this cell
        processedCells.push(orderedCells[index]);
        currentCount++;
        if (currentCount >= keepCount) {
          // Switch to remove mode
          mode = 'remove';
          currentCount = 0;
        }
      }
      index++;
    }
    
    console.log(`Applied Layer 3 pattern: ${removeCount} remove, ${keepCount} keep, resulting in ${processedCells.length} cells`);
    
    return processedCells;
  }
  
  /**
   * NEW: Arrange cells in clockwise order around a starting cell
   * @param {Object} startCell - The cell to start from
   * @param {Array} cells - Array of cells to arrange
   * @return {Array} Cells arranged in clockwise order
   */
  arrangeClockwise(startCell, cells) {
    // Remove the start cell from the list
    const remainingCells = cells.filter(cell => 
      !(cell.x === startCell.x && cell.y === startCell.y)
    );
    
    // Function to calculate the angle between two points
    const calculateAngle = (center, point) => {
      return Math.atan2(point.y - center.y, point.x - center.x);
    };
    
    // Sort cells by their angle relative to the start cell
    const sortedByAngle = [...remainingCells].sort((a, b) => {
      const angleA = calculateAngle(startCell, a);
      const angleB = calculateAngle(startCell, b);
      return angleA - angleB;
    });
    
    // Put the start cell at the beginning
    return [startCell, ...sortedByAngle];
  }

/**
   * Modified: Remove island cells in adjacent pairs with configurable percentage
   * This makes the island shape more natural
   * @param {number} removalPercentage - Percentage of cells to remove (0.0-1.0), defaults to 0.25
   */
  removeIslandCellPairs(removalPercentage = 0.25) {
    if (this.islandCells.length <= 4) {
      console.log('Not enough island cells to remove pairs');
      return;
    }
    
    // Calculate how many cells to remove (25% rounded up to nearest 2)
    const removeCount = Math.ceil(this.islandCells.length * removalPercentage);
    const adjustedRemoveCount = Math.ceil(removeCount / 2) * 2; // Ensure it's an even number
    const pairsToRemove = adjustedRemoveCount / 2;
    
    console.log(`Removing ${pairsToRemove} pairs (${adjustedRemoveCount} cells) from island`);
    
    // Find all possible adjacent pairs (preference for layer 2 and 3)
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
          
          // Determine layer priority for removal
          // Start with default layer values if not set
          const cellLayer = cell.layer || 1;
          const adjCellLayer = adjacentCell.layer || 1;
          
          // Calculate pair layer - prioritize higher layers for removal
          // For layer 3 cells, we want highest priority
          let pairLayer;
          
          if (cellLayer === 3 && adjCellLayer === 3) {
            pairLayer = 3; // Highest priority - both layer 3
          } else if (cellLayer === 3 || adjCellLayer === 3) {
            pairLayer = 2.5; // High priority - one layer 3
          } else if (cellLayer === 2 && adjCellLayer === 2) {
            pairLayer = 2; // Medium priority - both layer 2
          } else if (cellLayer === 2 || adjCellLayer === 2) {
            pairLayer = 1.5; // Low-medium priority - one layer 2
          } else {
            pairLayer = 1; // Lowest priority - both layer 1
          }
          
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
    
    // Group pairs by layer for better organization and randomization
    const layer3Pairs = uniquePairs.filter(p => p.layer === 3);
    const layer2dot5Pairs = uniquePairs.filter(p => p.layer === 2.5);
    const layer2Pairs = uniquePairs.filter(p => p.layer === 2);
    const layer1dot5Pairs = uniquePairs.filter(p => p.layer === 1.5);
    const layer1Pairs = uniquePairs.filter(p => p.layer === 1);
    
    // Shuffle each group independently for proper randomness
    const shuffledLayer3 = this.shuffleArray(layer3Pairs);
    const shuffledLayer2dot5 = this.shuffleArray(layer2dot5Pairs);
    const shuffledLayer2 = this.shuffleArray(layer2Pairs);
    const shuffledLayer1dot5 = this.shuffleArray(layer1dot5Pairs);
    const shuffledLayer1 = this.shuffleArray(layer1Pairs);
    
    // Combine in priority order
    const shuffledPairs = [
      ...shuffledLayer3,
      ...shuffledLayer2dot5,
      ...shuffledLayer2,
      ...shuffledLayer1dot5,
      ...shuffledLayer1
    ];
    
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
   * Identify which cells are erodable (adjacent to sea)
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
      this.generateThreeLayerIsland(); // Modified to use the enhanced version
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
   * NEW: Get random letters for a specific island reduction level
   * @param {number} level - Island reduction level (0-2)
   * @return {Array} Array of cells with letters for the given level
   */
  getRandomLettersForLevel(level) {
    // If we don't have any cells yet, generate them
    if (this.islandCells.length === 0) {
      this.generateThreeLayerIsland();
    }
    
    // Just return all cells for level 0
    if (level === 0) {
      return this.islandCells;
    }
    
    // For level 1 and 2, we need to selectively return cells based on their layer
    
    // Level 1: Return only layer 1 cells (adjacent to path)
    if (level === 1) {
      return this.islandCells.filter(cell => cell.layer === 1);
    }
    
    // Level 2: Return layer 1 and some layer 2 cells (specifically, ones adjacent to layer 1)
    if (level === 2) {
      // For level 2, we return all layer 1 cells and a subset of layer 2 cells
      const layer1Cells = this.islandCells.filter(cell => cell.layer === 1);
      
      // Get a subset of layer 2 cells - we'll take 60% of them
      const layer2Cells = this.islandCells.filter(cell => cell.layer === 2);
      const layer2Count = Math.ceil(layer2Cells.length * 0.6); // 60% of layer 2
      const shuffledLayer2 = this.shuffleArray([...layer2Cells]);
      const selectedLayer2 = shuffledLayer2.slice(0, layer2Count);
      
      return [...layer1Cells, ...selectedLayer2];
    }
    
    // Fallback - return everything
    return this.islandCells;
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

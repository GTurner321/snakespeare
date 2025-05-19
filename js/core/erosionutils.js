/**
 * Erosion Utilities for Grid Game
 * Shared utilities for island generation and erosion
 * Handles edge detection and cell selection for both initial formation and gameplay erosion
 */

/**
 * Identify cells that are adjacent to "sea" (empty spaces)
 * @param {Array} cellsArray - Array of all cells with {x, y} coordinates
 * @param {Array|Map} pathCells - Array or Map of path cells to exclude
 * @param {Array|Map} [selectedCells=null] - Optional array or Map of currently selected cells to exclude
 * @param {Set} [flashingCells=null] - Optional Set of cells already scheduled for erosion
 * @return {Array} Array of cells that are adjacent to sea
 */
export function identifyErodableCells(cellsArray, pathCells, selectedCells = null, flashingCells = null) {
  const erodableCells = [];
  
  // Create a map of all cells for adjacency checks
  const cellMap = new Map();
  cellsArray.forEach(cell => {
    cellMap.set(`${cell.x},${cell.y}`, cell);
  });
  
  // Convert pathCells to Map if it's an array
  const pathMap = pathCells instanceof Map ? pathCells : new Map();
  if (Array.isArray(pathCells)) {
    pathCells.forEach(cell => {
      pathMap.set(`${cell.x},${cell.y}`, cell);
    });
  }
  
  // Convert selectedCells to Map if it's an array
  const selectedCellMap = selectedCells instanceof Map ? selectedCells : new Map();
  if (Array.isArray(selectedCells)) {
    selectedCells.forEach(cell => {
      selectedCellMap.set(`${cell.x},${cell.y}`, cell);
    });
  }
  
  // Check each cell to see if it's adjacent to a sea cell
  for (const cell of cellsArray) {
    // Skip path cells - they can't be eroded
    if (pathMap.has(`${cell.x},${cell.y}`)) {
      continue;
    }
    
    // Skip selected cells
    if (selectedCellMap && selectedCellMap.has(`${cell.x},${cell.y}`)) {
      continue;
    }
    
    // Skip cells that are already flashing/scheduled for removal
    if (flashingCells && flashingCells.has(`${cell.x},${cell.y}`)) {
      continue;
    }
    
    // Check if this cell is adjacent to sea
    let adjacentToSea = false;
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // Up, right, down, left
    
    for (const [dx, dy] of directions) {
      const adjX = cell.x + dx;
      const adjY = cell.y + dy;
      const key = `${adjX},${adjY}`;
      
      // If adjacent cell is not in our cellMap, it's a sea cell
      if (!cellMap.has(key)) {
        adjacentToSea = true;
        break;
      }
    }
    
    if (adjacentToSea) {
      erodableCells.push(cell);
    }
  }
  
  return erodableCells;
}

/**
 * Select cells to erode, with some pairs selection
 * @param {Array} erodableCells - Array of cells eligible for erosion
 * @param {number} count - Number of cells to erode
 * @param {boolean} [prioritizePairs=true] - Whether to prioritize removing adjacent pairs
 * @return {Array} Array of cells to erode
 */
export function selectCellsToErode(erodableCells, count, prioritizePairs = true) {
  if (erodableCells.length <= count) {
    return [...erodableCells]; // Return all cells if we need more than available
  }
  
  const selectedCells = [];
  const remainingCells = [...erodableCells];
  const cellMap = new Map();
  
  // Create a cell map for adjacency checks
  erodableCells.forEach(cell => {
    cellMap.set(`${cell.x},${cell.y}`, cell);
  });
  
  // Find possible pairs (adjacent erodable cells)
  const possiblePairs = [];
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // Up, right, down, left
  
  for (const cell of erodableCells) {
    for (const [dx, dy] of directions) {
      const adjX = cell.x + dx;
      const adjY = cell.y + dy;
      const key = `${adjX},${adjY}`;
      
      // If adjacent cell is also erodable, form a pair
      if (cellMap.has(key)) {
        const pairId = [
          `${Math.min(cell.x, adjX)},${Math.min(cell.y, adjY)}`,
          `${Math.max(cell.x, adjX)},${Math.max(cell.y, adjY)}`
        ].join('-');
        
        possiblePairs.push({
          id: pairId,
          cells: [
            { x: cell.x, y: cell.y, letter: cell.letter, layer: cell.layer },
            { x: adjX, y: adjY, letter: cellMap.get(key).letter, layer: cellMap.get(key).layer }
          ]
        });
      }
    }
  }
  
  // Remove duplicates
  const uniquePairs = [];
  const seenIds = new Set();
  for (const pair of possiblePairs) {
    if (!seenIds.has(pair.id)) {
      uniquePairs.push(pair);
      seenIds.add(pair.id);
    }
  }
  
  // Shuffle pairs for randomness
  const shuffledPairs = shuffleArray(uniquePairs);
  
  // Define strategy for selection based on prioritizePairs flag
  let remainingToSelect = count;
  
  if (prioritizePairs && shuffledPairs.length > 0) {
    // Select pairs first (up to half of the total count, in pairs of 2)
    const maxPairs = Math.min(
      shuffledPairs.length,
      Math.floor(count / 2)
    );
    
    for (let i = 0; i < maxPairs && remainingToSelect >= 2; i++) {
      const pair = shuffledPairs[i];
      
      // Add both cells from the pair
      selectedCells.push(...pair.cells);
      
      // Mark these cells as used
      pair.cells.forEach(cell => {
        const idx = remainingCells.findIndex(c => c.x === cell.x && c.y === cell.y);
        if (idx !== -1) {
          remainingCells.splice(idx, 1);
        }
      });
      
      remainingToSelect -= 2;
    }
  }
  
  // Fill remaining count with individual cells
  if (remainingToSelect > 0 && remainingCells.length > 0) {
    // Shuffle remaining cells
    const shuffledRemaining = shuffleArray(remainingCells);
    
    // Take as many as needed
    const additionalCells = shuffledRemaining.slice(0, remainingToSelect);
    selectedCells.push(...additionalCells);
  }
  
  return selectedCells;
}

/**
 * Group pairs by layer for prioritized removal
 * Useful for initial island formation where we want to remove higher layers first
 * @param {Array} pairs - Array of cell pairs
 * @return {Array} Array of pairs sorted by layer priority
 */
export function prioritizePairsByLayer(pairs) {
  // Calculate layer value for each pair
  const pairsWithLayerScore = pairs.map(pair => {
    // Get layer values for both cells in the pair
    const cell1Layer = pair.cells[0].layer || 1;
    const cell2Layer = pair.cells[1].layer || 1;
    
    // Calculate pair layer priority
    let pairLayer;
    if (cell1Layer === 3 && cell2Layer === 3) {
      pairLayer = 3; // Highest priority - both layer 3
    } else if (cell1Layer === 3 || cell2Layer === 3) {
      pairLayer = 2.5; // High priority - one layer 3
    } else if (cell1Layer === 2 && cell2Layer === 2) {
      pairLayer = 2; // Medium priority - both layer 2
    } else if (cell1Layer === 2 || cell2Layer === 2) {
      pairLayer = 1.5; // Low-medium priority - one layer 2
    } else {
      pairLayer = 1; // Lowest priority - both layer 1
    }
    
    return { ...pair, layer: pairLayer };
  });
  
  // Group pairs by layer score
  const layer3Pairs = pairsWithLayerScore.filter(p => p.layer === 3);
  const layer2dot5Pairs = pairsWithLayerScore.filter(p => p.layer === 2.5);
  const layer2Pairs = pairsWithLayerScore.filter(p => p.layer === 2);
  const layer1dot5Pairs = pairsWithLayerScore.filter(p => p.layer === 1.5);
  const layer1Pairs = pairsWithLayerScore.filter(p => p.layer === 1);
  
  // Shuffle each group independently
  const shuffledLayer3 = shuffleArray(layer3Pairs);
  const shuffledLayer2dot5 = shuffleArray(layer2dot5Pairs);
  const shuffledLayer2 = shuffleArray(layer2Pairs);
  const shuffledLayer1dot5 = shuffleArray(layer1dot5Pairs);
  const shuffledLayer1 = shuffleArray(layer1Pairs);
  
  // Combine in priority order
  return [
    ...shuffledLayer3,
    ...shuffledLayer2dot5,
    ...shuffledLayer2,
    ...shuffledLayer1dot5,
    ...shuffledLayer1
  ];
}

/**
 * Check if a cell has 3 adjacent edges to the path
 * Used to identify high priority corner cells that shouldn't be eroded
 * @param {number} x - X coordinate to check
 * @param {number} y - Y coordinate to check
 * @param {Map} pathCellMap - Map of path cells for lookup
 * @return {boolean} True if the cell has 3 adjacent edges to the path
 */
export function hasThreeAdjacentEdges(x, y, pathCellMap) {
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
 * Check if a cell would create congestion (is between path cells on opposite sides)
 * @param {number} x - X coordinate to check
 * @param {number} y - Y coordinate to check
 * @param {Map} pathCellMap - Map of path cells for lookup
 * @return {boolean} True if the cell would create congestion
 */
export function isCellCongested(x, y, pathCellMap) {
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
 * Arrange cells in clockwise order around a starting cell
 * Used for applying pattern removal to Layer 3
 * @param {Object} startCell - The cell to start from
 * @param {Array} cells - Array of cells to arrange
 * @return {Array} Cells arranged in clockwise order
 */
export function arrangeClockwise(startCell, cells) {
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
 * Apply a removal pattern to Layer 3 cells for more natural edge appearance
 * @param {Array} layer3Cells - Array of Layer 3 cells
 * @return {Array} Modified Layer 3 cells with pattern-based removals
 */
export function applyLayer3RemovalPattern(layer3Cells) {
  if (layer3Cells.length === 0) {
    return [];
  }
  
  // Step 1: Find a starting cell (closest to the origin)
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
  const orderedCells = arrangeClockwise(startCell, layer3Cells);
  
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
  
  return processedCells;
}

/**
 * Apply initial erosion to the island to create a natural shape
 * Uses the same logic as the erosion controller but batched for initial formation
 * @param {Array} islandCells - All cells in the island
 * @param {Array} pathCells - Path cells to exclude from erosion
 * @param {number} [percentage=0.25] - Percentage of cells to remove
 * @return {Array} Updated island cells after erosion
 */
export function applyInitialErosion(islandCells, pathCells, percentage = 0.25) {
  // Skip if too few cells
  if (islandCells.length <= 4) {
    return islandCells;
  }
  
  // Calculate how many cells to remove
  const removeCount = Math.ceil(islandCells.length * percentage);
  
  // Create Maps for faster lookups
  const pathCellMap = new Map();
  pathCells.forEach(cell => {
    pathCellMap.set(`${cell.x},${cell.y}`, cell);
  });
  
  // Copy the island cells to avoid modifying the original
  let remainingCells = [...islandCells];
  let cellsRemoved = 0;
  
  // Keep removing cells until we've reached the target
  while (cellsRemoved < removeCount && remainingCells.length > 0) {
    // Find erodable cells (those adjacent to sea)
    const erodableCells = identifyErodableCells(remainingCells, pathCellMap);
    
    // If no erodable cells left, break
    if (erodableCells.length === 0) break;
    
    // Calculate how many to remove in this batch (up to half of remaining target)
    const batchRemoveCount = Math.min(
      erodableCells.length,
      Math.ceil((removeCount - cellsRemoved) / 2)
    );
    
    // Select cells to erode, preferring pairs
    const cellsToErode = selectCellsToErode(erodableCells, batchRemoveCount);
    
    // Remove these cells from the remaining set
    remainingCells = remainingCells.filter(cell => 
      !cellsToErode.some(erodeCell => 
        erodeCell.x === cell.x && erodeCell.y === cell.y
      )
    );
    
    // Update count
    cellsRemoved += cellsToErode.length;
  }
  
  // Return the remaining cells
  return remainingCells;
}

/**
 * Get a weighted random letter based on English letter frequency
 * @param {Array} letterDistribution - Array with weighted letter distribution
 * @return {string} Random uppercase letter
 */
export function getWeightedRandomLetter(letterDistribution) {
  const randomIndex = Math.floor(Math.random() * letterDistribution.length);
  return letterDistribution[randomIndex];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @return {Array} Shuffled array
 */
export function shuffleArray(array) {
  const newArray = [...array]; // Create a copy to avoid modifying original
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Island Erosion Controller
 * Manages the timed erosion of island cells in the Grid Game
 * Creates a "rising water" effect where cells gradually disappear over time
 */

class ErosionController {
  constructor(gridRenderer, pathGenerator) {
    this.gridRenderer = gridRenderer;
    this.pathGenerator = pathGenerator;
    
    // Erosion state
    this.erosionActive = false;
    this.erosionTimer = null;
    this.erosionCounter = 0;
    this.erosionPhase = 0; // Tracks which phase of erosion we're in
    
    // Configuration
    this.initialErosionPercentage = 0.05; // 5%
    this.initialErosionInterval = 15000; // 15 seconds
    this.standardErosionPercentage = 0.10; // 10% 
    this.standardErosionInterval = 10000; // 10 seconds
    this.initialPhaseCount = 2; // Start with 2 slow erosion cycles
    
    // Set for tracking cells that are scheduled for erosion/flashing
    this.flashingCells = new Set();
    
    // Final warning state
    this.finalWarningActive = false;
    this.finalWarningTimer = null;
    
    // Listen for grid completion to stop erosion
    document.addEventListener('gridCompletionChanged', (e) => {
      if (e.detail.completed && e.detail.isCorrect) {
        this.stopErosion();
      }
    });
    
    // Make this instance accessible globally for debugging
    window.erosionController = this;
    
    console.log('Erosion Controller initialized');
  }
  
  /**
   * Start the erosion process
   */
  startErosion() {
    if (this.erosionActive) return;
    
    console.log('Starting island erosion');
    this.erosionActive = true;
    this.erosionCounter = 0;
    this.erosionPhase = 0;
    this.finalWarningActive = false;
    
    // Schedule the first erosion event
    this.scheduleNextErosion();
    
    // Dispatch event that erosion has started
    document.dispatchEvent(new CustomEvent('erosionStarted', { 
      detail: { controller: this }
    }));
  }
  
  /**
   * Stop the erosion process
   */
  stopErosion() {
    if (!this.erosionActive) return;
    
    console.log('Stopping island erosion');
    this.erosionActive = false;
    
    // Clear any existing timer
    if (this.erosionTimer) {
      clearTimeout(this.erosionTimer);
      this.erosionTimer = null;
    }
    
    // Clear any final warning timer
    if (this.finalWarningTimer) {
      clearTimeout(this.finalWarningTimer);
      this.finalWarningTimer = null;
    }
    
    // Clear any flashing cells
    this.clearFlashingCells();
    
    // Dispatch event that erosion has stopped
    document.dispatchEvent(new CustomEvent('erosionStopped', { 
      detail: { controller: this }
    }));
  }
  
  /**
   * Schedule the next erosion event
   */
  scheduleNextErosion() {
    if (!this.erosionActive) return;
    
    // Determine erosion parameters based on phase
    const isInitialPhase = this.erosionPhase < this.initialPhaseCount;
    const interval = isInitialPhase ? this.initialErosionInterval : this.standardErosionInterval;
    
    console.log(`Scheduling next erosion in ${interval/1000} seconds (Phase ${this.erosionPhase + 1})`);
    
    // Clear any existing timer
    if (this.erosionTimer) {
      clearTimeout(this.erosionTimer);
    }
    
    // Set timer for next erosion
    this.erosionTimer = setTimeout(() => {
      this.performErosion();
    }, interval);
  }
  
  /**
   * Perform one cycle of erosion by selecting and removing erodable cells
   */
  performErosion() {
    if (!this.erosionActive || !this.gridRenderer) return;
    
    this.erosionCounter++;
    const isInitialPhase = this.erosionPhase < this.initialPhaseCount;
    const erosionPercentage = isInitialPhase ? this.initialErosionPercentage : this.standardErosionPercentage;
    
    console.log(`Performing erosion cycle #${this.erosionCounter} (Phase ${this.erosionPhase + 1})`);
    
    // Get current erodable cells (those adjacent to sea)
    const currentErodableCells = this.identifyCurrentErodableCells();
    
    if (currentErodableCells.length === 0) {
      console.log('No erodable cells remaining, checking if path cells remain');
      
      // If no erodable cells remain, check if the phrase path has been completed
      if (this.gridRenderer.isCompleted) {
        console.log('Phrase already completed, stopping erosion');
        this.stopErosion();
        return;
      }
      
      // If not completed, prepare to erode the path itself after a final warning
      console.log('Phrase not completed, preparing to erode path cells');
      this.preparePathErosion();
      return;
    }
    
    // Calculate how many cells to erode (min 1, round up)
    const cellsToErodeCount = Math.max(1, Math.ceil(currentErodableCells.length * erosionPercentage));
    console.log(`Eroding ${cellsToErodeCount} of ${currentErodableCells.length} available cells`);
    
    // Randomly select cells to erode
    const cellsToErode = this.selectCellsToErode(currentErodableCells, cellsToErodeCount);
    
    // Begin flashing these cells to indicate imminent removal
    this.startFlashingCells(cellsToErode);
    
    // After flashing for a few seconds, remove the cells
    setTimeout(() => {
      if (!this.erosionActive) return; // Check if erosion was stopped
      
      // Remove the cells
      this.removeCells(cellsToErode);
      
      // Increment phase if needed
      if (isInitialPhase) {
        this.erosionPhase++;
      }
      
      // Schedule the next erosion
      this.scheduleNextErosion();
    }, 3000); // 3 seconds of flashing before removal
  }
  
  /**
   * Identify which cells are currently erodable (adjacent to sea)
   * @return {Array} Array of erodable cell coordinates
   */
  identifyCurrentErodableCells() {
    // Get all island cells from the grid renderer
    const allCells = this.gridRenderer.getIslandCells();
    const erodableCells = [];
    
    // Create a map of all cells in the grid for adjacency checks
    const cellMap = new Map();
    allCells.forEach(cell => {
      cellMap.set(`${cell.x},${cell.y}`, cell);
    });
    
    // Get path cells to exclude
    const pathMap = new Map();
    this.gridRenderer.getPathCells().forEach(cell => {
      pathMap.set(`${cell.x},${cell.y}`, cell);
    });
    
    // Check each cell to see if it's adjacent to a sea cell
    for (const cell of allCells) {
      // Skip path cells - they can't be eroded yet
      if (pathMap.has(`${cell.x},${cell.y}`)) {
        continue;
      }
      
      // Skip cells that are already flashing/scheduled for removal
      if (this.flashingCells.has(`${cell.x},${cell.y}`)) {
        continue;
      }
      
      // Check if this cell is adjacent to sea (or a soon-to-be sea cell)
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
   * @return {Array} Array of cells to erode
   */
  selectCellsToErode(erodableCells, count) {
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
              { x: cell.x, y: cell.y },
              { x: adjX, y: adjY }
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
    const shuffledPairs = this.shuffleArray(uniquePairs);
    
    // Strategy:
    // 1. Decide how many pairs vs. singles to select
    // 2. Select that many pairs and singles
    
    let remainingToSelect = count;
    
    // With 50% chance, prioritize pairs, otherwise prioritize singles
    const prioritizePairs = Math.random() < 0.5;
    
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
      const shuffledRemaining = this.shuffleArray(remainingCells);
      
      // Take as many as needed
      const additionalCells = shuffledRemaining.slice(0, remainingToSelect);
      selectedCells.push(...additionalCells);
    }
    
    console.log(`Selected ${selectedCells.length} cells for erosion`);
    return selectedCells;
  }
  
  /**
   * Start flashing cells to indicate imminent removal
   * @param {Array} cells - Array of cells to flash
   */
  startFlashingCells(cells) {
    // Add cells to the flashing set
    cells.forEach(cell => {
      this.flashingCells.add(`${cell.x},${cell.y}`);
    });
    
    // Tell the grid renderer to flash these cells
    this.gridRenderer.startFlashingCells(cells);
    
    // Dispatch event about cells beginning to flash
    document.dispatchEvent(new CustomEvent('cellsFlashing', { 
      detail: { 
        cells: cells,
        controller: this 
      }
    }));
  }
  
  /**
   * Stop flashing all cells
   */
  clearFlashingCells() {
    this.flashingCells.clear();
    this.gridRenderer.stopFlashingCells();
  }
  
  /**
   * Remove cells from the grid
   * @param {Array} cells - Array of cells to remove
   */
  removeCells(cells) {
    // Remove each cell
    this.gridRenderer.removeCells(cells);
    
    // Clear these cells from the flashing set
    cells.forEach(cell => {
      this.flashingCells.delete(`${cell.x},${cell.y}`);
    });
    
    // Dispatch event about cells being removed
    document.dispatchEvent(new CustomEvent('cellsEroded', { 
      detail: { 
        cells: cells,
        controller: this 
      }
    }));
  }
  
  /**
   * Prepare for final path erosion when no erodable cells remain
   * Flashes all path cells as a final warning
   */
  preparePathErosion() {
    if (this.finalWarningActive) return;
    
    console.log('Starting final warning - path cells will flash for 10 seconds');
    this.finalWarningActive = true;
    
    // Get all path cells
    const pathCells = this.gridRenderer.getPathCells();
    
    // Begin flashing the path cells
    this.startFlashingCells(pathCells);
    
    // Set timer for final removal
    this.finalWarningTimer = setTimeout(() => {
      if (!this.erosionActive) return;
      
      console.log('Final warning expired - eroding path cells');
      
      // Remove path cells
      this.removeCells(pathCells);
      
      // Game over - dispatch event and stop erosion
      document.dispatchEvent(new CustomEvent('pathEroded', { 
        detail: { controller: this }
      }));
      
      // Stop erosion
      this.stopErosion();
      
      // Show game over message
      this.showGameOverMessage();
    }, 10000); // 10 second final warning
  }
  
  /**
   * Show game over message when path is eroded
   */
  showGameOverMessage() {
    // Find or create message container
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'message-container';
      messageContainer.style.position = 'absolute';
      messageContainer.style.top = '50%';
      messageContainer.style.left = '50%';
      messageContainer.style.transform = 'translate(-50%, -50%)';
      messageContainer.style.padding = '20px 30px';
      messageContainer.style.backgroundColor = 'rgba(180, 0, 0, 0.9)';
      messageContainer.style.color = 'white';
      messageContainer.style.borderRadius = '10px';
      messageContainer.style.fontWeight = 'bold';
      messageContainer.style.fontSize = '24px';
      messageContainer.style.textAlign = 'center';
      messageContainer.style.zIndex = '1000';
      messageContainer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
      document.body.appendChild(messageContainer);
    }

    // Set game over message
    messageContainer.innerHTML = 'Game Over!<br>The sea has risen too high.<br><button id="retry-button" style="margin-top:15px; padding:8px 15px; background:#fff; color:#d32f2f; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">Try Again</button>';
    
    // Add retry button click handler
    setTimeout(() => {
      const retryButton = document.getElementById('retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          messageContainer.style.display = 'none';
          
          // Try to trigger new phrase loading via global controller
          if (window.gameController && typeof window.gameController.loadRandomPhrase === 'function') {
            window.gameController.loadRandomPhrase();
          }
        });
      }
    }, 100);
    
    // Show message
    messageContainer.style.display = 'block';
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
}

export default ErosionController;

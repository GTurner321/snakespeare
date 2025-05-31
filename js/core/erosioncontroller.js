/**
 * Island Erosion Controller
 * Manages the timed erosion of island cells in the Grid Game
 * Creates a "rising water" effect where cells gradually disappear over time
 * Now using shared erosionUtils for consistent cell selection
 */

import {
  identifyErodableCells,
  selectCellsToErode,
  shuffleArray
} from './erosionutils.js';

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
    this.initialErosionPercentage = 0.07; // 7%
    this.initialErosionInterval = 15000; // 15 seconds
    this.standardErosionPercentage = 0.14; // 14% 
    this.standardErosionInterval = 10000; // 10 seconds
    this.initialPhaseCount = 1; // Start with 1 slow erosion cycle
    
    // Set for tracking cells that are scheduled for erosion/flashing
    this.flashingCells = new Set();
    
    // Final warning state
    this.finalWarningActive = false;
    this.finalWarningTimer = null;
    
    this.pausedErosion = false;
    
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
 * Pause the erosion process
 */
pauseErosion() {
  if (!this.erosionActive || this.pausedErosion) {
    console.log('Erosion not active or already paused');
    return;
  }
  
  this.pausedErosion = true;
  
  // Clear current timer
  if (this.erosionTimer) {
    clearTimeout(this.erosionTimer);
    this.erosionTimer = null;
  }
  
  // Clear any final warning timer
  if (this.finalWarningTimer) {
    clearTimeout(this.finalWarningTimer);
    this.finalWarningTimer = null;
  }
  
  // Stop any flashing cells and clear flashing state
  this.clearFlashingCells();
  
  console.log('Erosion paused - all timers cleared and flashing stopped');
  
  // Dispatch event that erosion was paused
  document.dispatchEvent(new CustomEvent('erosionPaused', { 
    detail: { controller: this }
  }));
}

/**
 * Unpause the erosion process and resume from beginning of cycle
 */
unpauseErosion() {
  if (!this.erosionActive || !this.pausedErosion) {
    console.log('Erosion not active or not paused');
    return;
  }
  
  this.pausedErosion = false;
  this.finalWarningActive = false; // Reset final warning state
  
  // Resume erosion cycle from beginning (fresh start)
  this.scheduleNextErosion();
  
  console.log('Erosion unpaused - resuming cycle from beginning');
  
  // Dispatch event that erosion was unpaused
  document.dispatchEvent(new CustomEvent('erosionUnpaused', { 
    detail: { controller: this }
  }));
}

/**
 * Check if erosion is currently paused
 * @return {boolean} True if erosion is paused
 */
isPaused() {
  return this.pausedErosion;
}
  
  /**
   * Schedule the next erosion event
   */
  scheduleNextErosion() {
    
      if (!this.erosionActive || this.pausedErosion) {
    console.log('Erosion paused - not scheduling next erosion');
    return;
  }
    
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

      if (!this.erosionActive || this.pausedErosion) {
    console.log('Erosion paused - skipping erosion cycle');
    return;
  }
    
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
    
    // Randomly select cells to erode - use utility function
    const cellsToErode = selectCellsToErode(currentErodableCells, cellsToErodeCount);
    
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
   * Using the utility function for consistent edge detection
   * @return {Array} Array of erodable cell coordinates
   */
  identifyCurrentErodableCells() {
    // Get all island cells from the grid renderer
    const allCells = this.gridRenderer.getIslandCells();
    
    // Create a map of path cells to exclude
    const pathMap = new Map();
    this.gridRenderer.getPathCells().forEach(cell => {
      pathMap.set(`${cell.x},${cell.y}`, cell);
    });
    
    // Create a map of currently selected cells
    const selectedCellMap = new Map();
    
    // Check if gridRenderer has selected cells
    if (this.gridRenderer && this.gridRenderer.selectedCells) {
      // Convert grid coordinates (35,35 centered) to path coordinates (0,0 centered)
      const centerX = 35;
      const centerY = 35;
      
      // Add all selected cells to the map
      this.gridRenderer.selectedCells.forEach(selectedCell => {
        // Convert to path coordinates (centered at 0,0)
        const pathX = selectedCell.x - centerX;
        const pathY = selectedCell.y - centerY;
        // Create a key in the same format as other cell maps
        const key = `${pathX},${pathY}`;
        
        // Store in map
        selectedCellMap.set(key, true);
      });
    }
    
    // Use the utility function to identify erodable cells
    // Pass the set of already flashing cells to exclude them
    const erodableCells = identifyErodableCells(
      allCells,
      pathMap,
      selectedCellMap,
      this.flashingCells
    );
    
    console.log(`Found ${erodableCells.length} erodable cells (excluding selected cells)`);
    return erodableCells;
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
}

export default ErosionController;

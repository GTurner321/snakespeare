/**
 * Trackpad Control for Grid Game
 * Provides a 5x5 trackpad for grid navigation with swipe support
 * Extends the original ArrowButtons/ScrollAreaHandler class
 */

class Trackpad {
  constructor(gridRenderer, options = {}) {
    this.gridRenderer = gridRenderer;
    
    // Default options
    this.options = {
      gameContainerId: options.gameContainerId || 'game-container',
      trackpadSize: options.trackpadSize || 5, // 5x5 grid
      ...options
    };
    
    // Track last known grid offset for auto-scroll feedback
    this._lastKnownOffset = null;
    this._hadPreviousOffset = false;
    
    // Swipe tracking state
    this.swipeState = {
      active: false,
      startCell: null,
      currentCell: null,
      lastCell: null,
      horizontalCrossings: 0,
      verticalCrossings: 0
    };
    
    // Create trackpad
    this.createTrackpad();
    
    // Add event listeners
    this.setupEventListeners();
  }
  
  /**
   * Create the trackpad for navigation
   */
  createTrackpad() {
    // Get reference to the game container
    this.gameContainer = document.getElementById(this.options.gameContainerId);
    if (!this.gameContainer) {
      console.error(`Game container with id '${this.options.gameContainerId}' not found`);
      return;
    }
    
    // Create the gameplay area that will contain all elements
    const gameplayArea = document.createElement('div');
    gameplayArea.id = 'gameplay-area';
    
    // Get the existing grid container
    const gridContainer = document.getElementById(this.gridRenderer.container.id);
    if (!gridContainer) {
      console.error('Grid container not found');
      return;
    }
    
    // Get existing phrase display if it exists
    const oldPhraseDisplay = document.getElementById('phrase-display');
    let phraseDisplay;
    if (oldPhraseDisplay) {
      // Preserve existing phrase display
      phraseDisplay = oldPhraseDisplay;
      oldPhraseDisplay.parentNode.removeChild(oldPhraseDisplay);
    } else {
      // Create new phrase display if it doesn't exist
      phraseDisplay = document.createElement('div');
      phraseDisplay.id = 'phrase-display';
      phraseDisplay.className = 'phrase-display';
      
      // Create phrase text element
      const phraseText = document.createElement('p');
      phraseText.id = 'phrase-text';
      phraseText.textContent = '_ * * * * * * * * *';
      phraseDisplay.appendChild(phraseText);
    }
    
    // Create trackpad container
    const trackpadContainer = document.createElement('div');
    trackpadContainer.id = 'trackpad-container';
    trackpadContainer.className = 'trackpad-container';
    
    // Create trackpad grid
    const trackpad = document.createElement('div');
    trackpad.id = 'trackpad';
    trackpad.className = 'trackpad';
    
    // Create cells for the trackpad
    const size = this.options.trackpadSize;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = document.createElement('div');
        cell.className = 'trackpad-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        
        // Add arrow indicators to middle cells on each edge
        const middleIdx = Math.floor(size / 2);
        
        if (x === middleIdx && y === 0) {
          // Top middle - up arrow
          cell.classList.add('trackpad-arrow', 'arrow-up');
          const arrow = document.createElement('div');
          arrow.className = 'arrow-indicator';
          arrow.innerHTML = '&#9650;'; // Up triangle
          cell.appendChild(arrow);
        } else if (x === size - 1 && y === middleIdx) {
          // Right middle - right arrow
          cell.classList.add('trackpad-arrow', 'arrow-right');
          const arrow = document.createElement('div');
          arrow.className = 'arrow-indicator';
          arrow.innerHTML = '&#9654;'; // Right triangle
          cell.appendChild(arrow);
        } else if (x === middleIdx && y === size - 1) {
          // Bottom middle - down arrow
          cell.classList.add('trackpad-arrow', 'arrow-down');
          const arrow = document.createElement('div');
          arrow.className = 'arrow-indicator';
          arrow.innerHTML = '&#9660;'; // Down triangle
          cell.appendChild(arrow);
        } else if (x === 0 && y === middleIdx) {
          // Left middle - left arrow
          cell.classList.add('trackpad-arrow', 'arrow-left');
          const arrow = document.createElement('div');
          arrow.className = 'arrow-indicator';
          arrow.innerHTML = '&#9664;'; // Left triangle
          cell.appendChild(arrow);
        } else if (x === middleIdx && y === middleIdx) {
          // Center cell - add center marker
          cell.classList.add('trackpad-center');
        }
        
        trackpad.appendChild(cell);
      }
    }
    
    // Add trackpad to container
    trackpadContainer.appendChild(trackpad);
    
    // Move the grid container's parent node
    const gridContainerParent = gridContainer.parentNode;
    
    // Reorganize the DOM structure
    gridContainer.parentNode.removeChild(gridContainer);
    
    // Set up the proper order:
    // 1. Phrase display at the top
    // 2. Grid container in the middle
    // 3. Trackpad at the bottom
    gameplayArea.appendChild(phraseDisplay);
    gameplayArea.appendChild(gridContainer);
    gameplayArea.appendChild(trackpadContainer);
    
    // Insert the gameplay area into the main container
    // Either in place of the original grid container or at the end
    if (gridContainerParent) {
      gridContainerParent.appendChild(gameplayArea);
    } else {
      this.gameContainer.appendChild(gameplayArea);
    }
    
    // Store references for later use
    this.trackpad = trackpad;
    this.phraseDisplay = phraseDisplay;
    
    // Define arrow groups (primary and adjacent cells)
    this._defineArrowGroups();
    
    // Adjust phrase display width to match grid width
    this.adjustPhraseDisplayWidth();
  }
  
  /**
   * Define arrow cell groups with adjacent cells
   * @private
   */
  _defineArrowGroups() {
    const size = this.options.trackpadSize;
    const middleIdx = Math.floor(size / 2);
    
    // Define the groups of cells that correspond to each arrow direction
    this.arrowGroups = {
      up: [
        { x: middleIdx, y: 0 },     // Primary arrow cell
        { x: middleIdx - 1, y: 0 },  // Left adjacent
        { x: middleIdx + 1, y: 0 },  // Right adjacent
        { x: middleIdx, y: 1 }       // Bottom adjacent
      ],
      right: [
        { x: size - 1, y: middleIdx },  // Primary arrow cell
        { x: size - 1, y: middleIdx - 1 }, // Top adjacent
        { x: size - 1, y: middleIdx + 1 }, // Bottom adjacent
        { x: size - 2, y: middleIdx }      // Left adjacent
      ],
      down: [
        { x: middleIdx, y: size - 1 },  // Primary arrow cell
        { x: middleIdx - 1, y: size - 1 }, // Left adjacent
        { x: middleIdx + 1, y: size - 1 }, // Right adjacent
        { x: middleIdx, y: size - 2 }      // Top adjacent
      ],
      left: [
        { x: 0, y: middleIdx },  // Primary arrow cell
        { x: 0, y: middleIdx - 1 }, // Top adjacent
        { x: 0, y: middleIdx + 1 }, // Bottom adjacent
        { x: 1, y: middleIdx }      // Right adjacent
      ]
    };
    
    // Store the mapping from cell coordinates to direction
    this.cellToDirectionMap = new Map();
    
    // Map each cell in each group to its direction
    Object.entries(this.arrowGroups).forEach(([direction, cells]) => {
      cells.forEach(cell => {
        this.cellToDirectionMap.set(`${cell.x},${cell.y}`, direction);
      });
    });
  }
  
  /**
   * Set up event listeners for trackpad interaction
   */
  setupEventListeners() {
    // Initialize tracking variables
    this._isScrolling = false;
    this._scrollAnimationTimeout = null;
    
    // Set up different types of listeners
    this._setupTrackpadEvents();
    this._setupKeyboardListeners();
    this._setupGridEventListeners();
    
    // Initial updates with delay to ensure DOM is ready
    this._scheduleInitialUpdates();
  }
  
  /**
   * Schedule initial updates with delay
   * @private
   */
  _scheduleInitialUpdates() {
    // Initial updates with delay to ensure DOM is ready
    setTimeout(() => {
      this.adjustPhraseDisplayWidth();
      this.updateScrollAreaStates();
    }, 100);
    
    // Additional update after longer delay to catch any late-loading elements
    setTimeout(() => {
      this.adjustPhraseDisplayWidth();
      this.updateScrollAreaStates();
    }, 500);
  }
  
  /**
   * Set up touch and mouse events for the trackpad
   * @private
   */
  _setupTrackpadEvents() {
    if (!this.trackpad) return;
    
    // Add mouse events
    this.trackpad.addEventListener('mousedown', (e) => this._handleTrackpadStart(e));
    document.addEventListener('mousemove', (e) => this._handleTrackpadMove(e));
    document.addEventListener('mouseup', (e) => this._handleTrackpadEnd(e));
    
    // Add touch events
    this.trackpad.addEventListener('touchstart', (e) => this._handleTrackpadStart(e));
    document.addEventListener('touchmove', (e) => this._handleTrackpadMove(e));
    document.addEventListener('touchend', (e) => this._handleTrackpadEnd(e));
    
    // Add click events for all trackpad cells
    const cells = this.trackpad.querySelectorAll('.trackpad-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', (e) => {
        // Only handle if not currently swiping
        if (!this.swipeState.active) {
          // Get cell coordinates
          const x = parseInt(cell.dataset.x, 10);
          const y = parseInt(cell.dataset.y, 10);
          
          // Check if this cell is part of an arrow group
          const key = `${x},${y}`;
          const direction = this.cellToDirectionMap.get(key);
          
          if (direction) {
            // Handle as arrow cell click
            this._handleArrowGroupClick(direction);
          }
        }
      });
    });
  }
  
  /**
   * Set up keyboard navigation listeners
   * @private
   */
  _setupKeyboardListeners() {
    let keyboardScrollTimeout = null;
    
    document.addEventListener('keydown', (event) => {
      // Prevent rapid keypresses
      if (this._isScrolling) {
        return;
      }
      
      let direction = null;
      
      switch (event.key) {
        case 'ArrowUp':
          direction = 'up';
          break;
        case 'ArrowRight':
          direction = 'right';
          break;
        case 'ArrowDown':
          direction = 'down';
          break;
        case 'ArrowLeft':
          direction = 'left';
          break;
      }
      
      if (direction) {
        event.preventDefault();
        
        // Set scrolling flag
        this._isScrolling = true;
        
        // Scroll grid in the pressed direction
        this.gridRenderer.scroll(direction);
        
        // Update scroll area states
        this.updateScrollAreaStates();
        
        // Visual feedback for keyboard navigation
        this._flashArrowGroup(direction);
        
        // Clear any existing timeout
        if (keyboardScrollTimeout) {
          clearTimeout(keyboardScrollTimeout);
        }
        
        // Reset scrolling flag after a short delay
        keyboardScrollTimeout = setTimeout(() => {
          this._isScrolling = false;
        }, 300);
      }
    });
  }
  
  /**
   * Set up grid-related event listeners
   * @private
   */
  _setupGridEventListeners() {
    // Listen for grid creation events
    document.addEventListener('gridCreated', (e) => {
      // Update after grid creation
      this.adjustPhraseDisplayWidth();
    });
    
    // Listen for grid resize events
    document.addEventListener('gridResized', (e) => {
      this.adjustPhraseDisplayWidth();
    });
    
    // Listen for grid scroll start events
    document.addEventListener('gridScrollStarted', (e) => {
      // Set scrolling flag
      this._isScrolling = true;
      
      // Highlight the appropriate arrow
      this._flashArrowGroup(e.detail.direction);
    });
    
    // Listen for grid scroll complete events
    document.addEventListener('gridScrollComplete', () => {
      // Update scroll area states
      this.updateScrollAreaStates();
      
      // Clear scrolling flag after a short delay to prevent rapid scrolling
      setTimeout(() => {
        this._isScrolling = false;
      }, 100);
      
      // Adjust phrase display height if needed
      this.adjustPhraseDisplayHeight();
    });
    
    // Add window resize listener
    window.addEventListener('resize', () => {
      this.adjustPhraseDisplayWidth();
    });
  }
  
  /**
   * Handle the start of a trackpad interaction (touch or mouse)
   * @param {Event} e - The event object
   * @private
   */
  _handleTrackpadStart(e) {
    // Prevent default to avoid page scrolling on touch devices
    e.preventDefault();
    
    // Get touch/mouse coordinates
    const point = e.type.includes('touch') ? e.touches[0] : e;
    const { x, y } = this._getTrackpadCoordinates(point.clientX, point.clientY);
    
    // Invalid coordinates or already scrolling
    if (x === -1 || y === -1 || this._isScrolling) {
      return;
    }
    
    // Initialize swipe state
    this.swipeState = {
      active: true,
      startCell: { x, y },
      currentCell: { x, y },
      lastCell: { x, y },
      horizontalCrossings: 0,
      verticalCrossings: 0,
      startTime: Date.now()
    };
    
    // Add active class to trackpad for visual feedback
    this.trackpad.classList.add('active');
  }
  
  /**
   * Handle trackpad movement (touch or mouse)
   * @param {Event} e - The event object
   * @private
   */
  _handleTrackpadMove(e) {
    // Skip if not active or scrolling in progress
    if (!this.swipeState.active || this._isScrolling) {
      return;
    }
    
    // Get touch/mouse coordinates
    const point = e.type.includes('touch') ? e.touches[0] : e;
    const { x, y } = this._getTrackpadCoordinates(point.clientX, point.clientY);
    
    // Invalid coordinates
    if (x === -1 || y === -1) {
      return;
    }
    
    // If position changed, update and check for boundary crossings
    if (x !== this.swipeState.currentCell.x || y !== this.swipeState.currentCell.y) {
      // Store the last cell before updating current
      this.swipeState.lastCell = { ...this.swipeState.currentCell };
      
      // Check for horizontal boundary crossing
      if (x !== this.swipeState.currentCell.x) {
        const crossingDirection = x > this.swipeState.currentCell.x ? 'left' : 'right';
        this.swipeState.horizontalCrossings += (crossingDirection === 'left' ? 1 : -1);
        
        // Trigger scroll for each boundary crossed
        this._triggerScroll(crossingDirection);
      }
      
      // Check for vertical boundary crossing
      if (y !== this.swipeState.currentCell.y) {
        const crossingDirection = y > this.swipeState.currentCell.y ? 'up' : 'down';
        this.swipeState.verticalCrossings += (crossingDirection === 'up' ? 1 : -1);
        
        // Trigger scroll for each boundary crossed
        this._triggerScroll(crossingDirection);
      }
      
      // Update current cell
      this.swipeState.currentCell = { x, y };
      
      // NO MORE HIGHLIGHT EFFECT FOR SWIPES
      // this._highlightTrackpadCell(x, y);
    }
  }
  
  /**
   * Handle the end of a trackpad interaction
   * @param {Event} e - The event object
   * @private
   */
  _handleTrackpadEnd(e) {
    // Skip if not active
    if (!this.swipeState.active) {
      return;
    }
    
    // Check if this was a quick tap rather than a swipe
    const interactionDuration = Date.now() - this.swipeState.startTime;
    const wasQuickTap = interactionDuration < 300;
    const startX = this.swipeState.startCell.x;
    const startY = this.swipeState.startCell.y;
    const endX = this.swipeState.currentCell.x;
    const endY = this.swipeState.currentCell.y;
    const wasShortMovement = Math.abs(startX - endX) <= 1 && Math.abs(startY - endY) <= 1;
    
    // If this was a quick tap on an arrow group cell, trigger a single scroll
    if (wasQuickTap && wasShortMovement) {
      const key = `${startX},${startY}`;
      const direction = this.cellToDirectionMap.get(key);
      
      if (direction) {
        // Handle as arrow group click
        this._handleArrowGroupClick(direction);
      }
    }
    
    // Reset highlight effects - no more visual feedback for swipes
    this._resetTrackpadHighlights();
    
    // Remove active class from trackpad
    this.trackpad.classList.remove('active');
    
    // Reset swipe state
    this.swipeState.active = false;
  }
  
  /**
   * Handle arrow group clicks (including adjacent cells)
   * @param {string} direction - The direction ('up', 'down', 'left', 'right')
   * @private
   */
  _handleArrowGroupClick(direction) {
    // Skip if scrolling in progress
    if (this._isScrolling) {
      return;
    }
    
    // Find the primary arrow cell
    const arrowClass = `arrow-${direction}`;
    const arrowCell = this.trackpad.querySelector(`.${arrowClass}`);
    
    if (!arrowCell) return;
    
    // Skip if direction is disabled
    if (arrowCell.classList.contains('disabled')) return;
    
    // Set scrolling flag
    this._isScrolling = true;
    
    // Flash all cells in the arrow group
    this._flashArrowGroup(direction);
    
    // Scroll the grid
    this.gridRenderer.scroll(direction);
    
    // Update scroll area states
    this.updateScrollAreaStates();
    
    // Remove active class after animation
    setTimeout(() => {
      this._isScrolling = false;
    }, 300);
  }
  
  /**
   * Flash all cells in an arrow group
   * @param {string} direction - The direction ('up', 'down', 'left', 'right')
   * @private
   */
  _flashArrowGroup(direction) {
    // Get the arrow group cells
    const arrowGroup = this.arrowGroups[direction];
    if (!arrowGroup) return;
    
    // Find the primary arrow cell (the one with the arrow symbol)
    const arrowClass = `arrow-${direction}`;
    const primaryArrowCell = this.trackpad.querySelector(`.${arrowClass}`);
    
    if (!primaryArrowCell) return;
    
    // Get the arrow indicator element
    const arrowIndicator = primaryArrowCell.querySelector('.arrow-indicator');
    
    if (!arrowIndicator) return;
    
    // Pulse only the arrow indicator
    arrowIndicator.classList.add('active-pulse');
    
    // Remove pulse class after animation
    setTimeout(() => {
      arrowIndicator.classList.remove('active-pulse');
    }, 300);
  }
  
  /**
   * Trigger a scroll in the specified direction
   * @param {string} direction - The scroll direction ('up', 'down', 'left', 'right')
   * @private
   */
  _triggerScroll(direction) {
    // Skip if scrolling in progress
    if (this._isScrolling) {
      return;
    }
    
    // Set scrolling flag
    this._isScrolling = true;
    
    // Get the arrow group cells
    const arrowGroup = this.arrowGroups[direction];
    if (!arrowGroup) return;
    
    // Find the primary arrow cell
    const arrowClass = `arrow-${direction}`;
    const arrowCell = this.trackpad.querySelector(`.${arrowClass}`);
    
    if (!arrowCell) return;
    
    // Skip if direction is disabled
    if (arrowCell.classList.contains('disabled')) {
      this._isScrolling = false;
      return;
    }
    
    // Scroll the grid with enhanced smooth transitions
    this.gridRenderer.scroll(direction);
    
    // Update scroll area states
    this.updateScrollAreaStates();
    
    // Flash the arrow indicator for visual feedback
    const arrowIndicator = arrowCell.querySelector('.arrow-indicator');
    if (arrowIndicator) {
      arrowIndicator.classList.add('active-pulse');
      
      // Remove after animation
      setTimeout(() => {
        arrowIndicator.classList.remove('active-pulse');
      }, 300);
    }
    
    // Reset scrolling flag after a short delay
    setTimeout(() => {
      this._isScrolling = false;
    }, 300); // Match transform duration
  }
  
  /**
   * Reset all trackpad cell highlights
   * @private
   */
  _resetTrackpadHighlights() {
    this.trackpad.querySelectorAll('.trackpad-cell').forEach(cell => {
      cell.classList.remove('highlight');
    });
  }
  
  /**
   * Get trackpad cell coordinates from client coordinates
   * @param {number} clientX - Client X coordinate
   * @param {number} clientY - Client Y coordinate
   * @return {Object} Cell coordinates {x, y} or {-1, -1} if invalid
   * @private
   */
  _getTrackpadCoordinates(clientX, clientY) {
    // Get trackpad bounds
    const trackpadRect = this.trackpad.getBoundingClientRect();
    
    // Check if point is within trackpad bounds
    if (clientX < trackpadRect.left || clientX >= trackpadRect.right || 
        clientY < trackpadRect.top || clientY >= trackpadRect.bottom) {
      return { x: -1, y: -1 };
    }
    
    // Calculate relative position within trackpad
    const relX = clientX - trackpadRect.left;
    const relY = clientY - trackpadRect.top;
    
    // Calculate cell size
    const cellWidth = trackpadRect.width / this.options.trackpadSize;
    const cellHeight = trackpadRect.height / this.options.trackpadSize;
    
    // Calculate cell coordinates
    const x = Math.floor(relX / cellWidth);
    const y = Math.floor(relY / cellHeight);
    
    // Validate coordinates
    if (x >= 0 && x < this.options.trackpadSize && y >= 0 && y < this.options.trackpadSize) {
      return { x, y };
    }
    
    return { x: -1, y: -1 };
  }
  
  /**
   * Get trackpad cell element from coordinates
   * @param {number} x - X coordinate in trackpad grid
   * @param {number} y - Y coordinate in trackpad grid
   * @return {HTMLElement|null} The cell element or null if not found
   * @private
   */
  _getTrackpadCellElement(x, y) {
    return this.trackpad.querySelector(`.trackpad-cell[data-x="${x}"][data-y="${y}"]`);
  }
  
  /**
   * Adjust phrase display width to match grid
   */
  adjustPhraseDisplayWidth() {
    const gridElement = this.gridRenderer?.gridElement;
    
    if (!gridElement || !this.phraseDisplay) return;
    
    const gridRect = gridElement.getBoundingClientRect();
    
    // Set phrase display width to match grid width
    this.phraseDisplay.style.width = `${gridRect.width}px`;
    
    // Adjust height based on content
    this.adjustPhraseDisplayHeight();
  }
  
  /**
   * Adjust phrase display height based on content
   */
  adjustPhraseDisplayHeight() {
    const phraseText = document.getElementById('phrase-text');
    
    if (!phraseText || !this.phraseDisplay) return;
    
    // Reset min-height to get accurate scrollHeight
    this.phraseDisplay.style.minHeight = 'auto';
    
    // Get content height and add padding
    const contentHeight = phraseText.scrollHeight;
    const padding = 30; // Total top and bottom padding
    
    // Set min-height to fit content
    this.phraseDisplay.style.minHeight = `${contentHeight + padding}px`;
  }
  
  /**
   * Update scroll area states (enabled/disabled) based on grid scroll limits
   */
  updateScrollAreaStates() {
    // Get current view offset
    const { x: offsetX, y: offsetY } = this.gridRenderer.viewOffset;
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.gridRenderer.options.gridWidthSmall : this.gridRenderer.options.gridWidth;
    const height = isMobile ? this.gridRenderer.options.gridHeightSmall : this.gridRenderer.options.gridHeight;
    
    // Check each direction for possible scrolling
    const canScrollUp = offsetY > 0;
    const canScrollRight = offsetX + width < this.gridRenderer.fullGridSize;
    const canScrollDown = offsetY + height < this.gridRenderer.fullGridSize;
    const canScrollLeft = offsetX > 0;
    
    // Update trackpad arrow disabled states
    const arrowUp = this.trackpad.querySelector('.arrow-up');
    const arrowRight = this.trackpad.querySelector('.arrow-right');
    const arrowDown = this.trackpad.querySelector('.arrow-down');
    const arrowLeft = this.trackpad.querySelector('.arrow-left');
    
    if (arrowUp) arrowUp.classList.toggle('disabled', !canScrollUp);
    if (arrowRight) arrowRight.classList.toggle('disabled', !canScrollRight);
    if (arrowDown) arrowDown.classList.toggle('disabled', !canScrollDown);
    if (arrowLeft) arrowLeft.classList.toggle('disabled', !canScrollLeft);
  }
  
  /**
   * Show or hide the trackpad
   * @param {boolean} show - Whether to show the trackpad
   */
  setVisibility(show) {
    if (this.trackpad) {
      this.trackpad.style.display = show ? 'grid' : 'none';
    }
  }
}

// Export as both Trackpad and ArrowButtons for backward compatibility
window.Trackpad = Trackpad;
window.ArrowButtons = Trackpad;

export default Trackpad;

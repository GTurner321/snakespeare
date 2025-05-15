/**
 * Scroll Area Handler for Grid Game
 * Creates and manages the scroll areas for navigating the grid
 * Replaces the original arrow buttons with surrounding scroll areas
 * Added support for auto-scrolling when cells are near edges
 */

class ScrollAreaHandler {
  constructor(gridRenderer, options = {}) {
    this.gridRenderer = gridRenderer;
    
    // Default options
    this.options = {
      gameContainerId: options.gameContainerId || 'game-container',
      ...options
    };
    
    // Track last known grid offset for auto-scroll feedback
    this._lastKnownOffset = null;
    this._hadPreviousOffset = false;
    
    // Create scroll areas
    this.createScrollAreas();
    
    // Add event listeners
    this.setupEventListeners();
  }
  
  /**
   * Create the scroll areas for navigation
   */
  createScrollAreas() {
    // Get reference to the game container
    this.gameContainer = document.getElementById(this.options.gameContainerId);
    if (!this.gameContainer) {
      console.error(`Game container with id '${this.options.gameContainerId}' not found`);
      return;
    }
    
    // Create the gameplay area that will contain all elements
    const gameplayArea = document.createElement('div');
    gameplayArea.id = 'gameplay-area';
    
    // Create top scroll area
    const scrollTop = this.createScrollArea('scroll-top', 'scroll-area-top', '▲');
    
    // Create horizontal container for left, grid, and right
    const scrollHorizontalContainer = document.createElement('div');
    scrollHorizontalContainer.id = 'scroll-horizontal-container';
    
    // Create left and right scroll areas
    const scrollLeft = this.createScrollArea('scroll-left', 'scroll-area-left', '◀');
    const scrollRight = this.createScrollArea('scroll-right', 'scroll-area-right', '▶');
    
    // Get the existing grid container and move it
    const gridContainer = document.getElementById(this.gridRenderer.container.id);
    if (gridContainer) {
      // Move the grid container between the left and right scroll areas
      gridContainer.parentNode.removeChild(gridContainer);
      scrollHorizontalContainer.appendChild(scrollLeft);
      scrollHorizontalContainer.appendChild(gridContainer);
      scrollHorizontalContainer.appendChild(scrollRight);
    } else {
      console.error('Grid container not found');
      // Still create the structure even if grid container is missing
      scrollHorizontalContainer.appendChild(scrollLeft);
      scrollHorizontalContainer.appendChild(scrollRight);
    }
    
    // Create bottom scroll area
    const scrollBottom = this.createScrollArea('scroll-bottom', 'scroll-area-bottom', '▼');
    
    // Assemble the gameplay area
    gameplayArea.appendChild(scrollTop);
    gameplayArea.appendChild(scrollHorizontalContainer);
    gameplayArea.appendChild(scrollBottom);
    
    // Store references to scroll areas
    this.scrollAreas = {
      top: scrollTop,
      right: scrollRight,
      bottom: scrollBottom,
      left: scrollLeft
    };
    
    // Create phrase display
    const phraseDisplay = document.createElement('div');
    phraseDisplay.id = 'phrase-display';
    phraseDisplay.className = 'phrase-display';
    
    // Move phrase text from the old container to the new one if it exists
    const oldPhraseDisplay = document.getElementById('phrase-display');
    const phraseText = oldPhraseDisplay ? 
                        oldPhraseDisplay.querySelector('#phrase-text') : 
                        document.createElement('p');
    
    if (!phraseText.id) {
      phraseText.id = 'phrase-text';
    }
    
    if (oldPhraseDisplay && phraseText) {
      // If we have existing phrase content, use it
      phraseDisplay.appendChild(phraseText);
    } else {
      // Otherwise create a placeholder
      phraseText.textContent = '_ * * * * * * * * *';
      phraseDisplay.appendChild(phraseText);
    }
    
    // Insert elements at appropriate positions
    const existingElements = Array.from(this.gameContainer.children);
    let inserted = false;
    
    for (let i = 0; i < existingElements.length; i++) {
      const element = existingElements[i];
      // Find the grid container or a suitable injection point
      if (element.classList.contains('styled-box') ||
          element.classList.contains('grid-container-wrapper') ||
          i === existingElements.length - 1) {
        // Insert our new elements here
        this.gameContainer.insertBefore(gameplayArea, element);
        if (element.classList.contains('styled-box') && 
            element.id === 'phrase-display') {
          // Replace the existing phrase display
          this.gameContainer.replaceChild(phraseDisplay, element);
        } else {
          // Insert the phrase display after the gameplay area
          this.gameContainer.insertBefore(phraseDisplay, element);
        }
        inserted = true;
        break;
      }
    }
    
    // If no suitable element was found, append to the end
    if (!inserted) {
      this.gameContainer.appendChild(gameplayArea);
      this.gameContainer.appendChild(phraseDisplay);
    }
    
    // Remove original boxes if they exist
    const gameInfo = document.getElementById('game-info');
    if (gameInfo) {
      gameInfo.style.display = 'none';
    }
    
    // Store reference to phrase display for resizing
    this.phraseDisplay = phraseDisplay;
    
    // Adjust phrase display to match grid width
    this.adjustPhraseDisplayWidth();
  }
    
  /**
   * Create a scroll area with the specified properties
   * @param {string} id - Element ID
   * @param {string} className - Additional CSS class
   * @param {string} arrowSymbol - Unicode arrow symbol to display
   * @return {HTMLElement} The created scroll area
   */
  createScrollArea(id, className, arrowSymbol) {
    const scrollArea = document.createElement('div');
    scrollArea.id = id;
    scrollArea.className = `scroll-area ${className}`;
    
    const arrow = document.createElement('div');
    arrow.className = 'scroll-arrow';
    arrow.textContent = arrowSymbol;
    
    scrollArea.appendChild(arrow);
    
    return scrollArea;
  }
  
/**
 * Set up event listeners for scroll areas - Main coordinator function
 */
setupEventListeners() {
  // Initialize tracking variables for scroll state
  this._isScrolling = false;
  this._lastOffset = { x: 0, y: 0 };
  this._scrollAnimationTimeout = null;
  
  // Set up different types of listeners
  this._setupScrollAreaClickListeners();
  this._setupKeyboardListeners();
  this._setupScrollEventListeners();
  this._setupGridEventListeners();
  
  // Initial updates with delay to ensure DOM is ready
  this._scheduleInitialUpdates();
}

/**
 * Set up click and touch listeners for scroll areas
 * @private
 */
_setupScrollAreaClickListeners() {
  // Map positions to scroll directions
  const directions = {
    'top': 'up',
    'right': 'right',
    'bottom': 'down',
    'left': 'left'
  };
  
  // Set up click handlers for each scroll area
  if (this.scrollAreas) {
    Object.entries(this.scrollAreas).forEach(([position, element]) => {
      const direction = directions[position];
      
      // Add click handlers with proper debouncing
      element.addEventListener('click', (e) => {
        // Prevent clicking while scrolling is in progress
        if (this._isScrolling) {
          e.preventDefault();
          return;
        }
        
        // Call handler with clicked element
        this.handleScrollAreaClick(direction, element);
      });
      
      // Add touch events for mobile (with debounce)
      this._setupTouchListenersForElement(element, direction);
    });
  }
}

/**
 * Set up touch listeners for a specific scroll area element
 * @param {HTMLElement} element - Scroll area element
 * @param {string} direction - Scroll direction
 * @private
 */
_setupTouchListenersForElement(element, direction) {
  let touchStartTime = 0;
  let touchTimeout = null;
  
  element.addEventListener('touchstart', () => {
    touchStartTime = Date.now();
    
    // Clear any existing timeout
    if (touchTimeout) {
      clearTimeout(touchTimeout);
    }
    
    // Add active class for visual feedback
    element.classList.add('touch-active');
  });
  
  element.addEventListener('touchend', () => {
    // Remove touch-active class
    element.classList.remove('touch-active');
    
    // Check if this was a quick tap (not a long press)
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration < 300) {
      // Prevent rapid tapping - use timeout
      if (!this._isScrolling) {
        // Set scrolling flag
        this._isScrolling = true;
        
        // Trigger scroll
        this.handleScrollAreaClick(direction, element);
        
        // Reset after a short delay
        touchTimeout = setTimeout(() => {
          this._isScrolling = false;
        }, 300);
      }
    }
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
      this._highlightScrollArea(direction);
      
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
 * Set up scroll-related event listeners
 * @private
 */
_setupScrollEventListeners() {
  // Listen for scroll start events
  document.addEventListener('gridScrollStarted', (e) => {
    // Set scrolling flag
    this._isScrolling = true;
    
    // Highlight the appropriate scroll area
    this._highlightScrollArea(e.detail.direction);
    
    // Store current offset for comparison
    if (this.gridRenderer && this.gridRenderer.viewOffset) {
      this._lastOffset = { ...this.gridRenderer.viewOffset };
    }
  });
  
  // Listen for scroll in progress events
  document.addEventListener('gridScrolled', () => {
    // Keep scrolling flag active
    this._isScrolling = true;
    
    // Update scroll area states during scrolling
    this.updateScrollAreaStates();
  });
  
  // Listen for scroll complete events
  document.addEventListener('gridScrollComplete', () => {
    // Update scroll area states
    this.updateScrollAreaStates();
    
    // Clear scrolling flag after a short delay to prevent rapid scrolling
    setTimeout(() => {
      this._isScrolling = false;
    }, 100);
    
    // If phrase display needs height adjustment, do it now
    if (this.adjustPhraseDisplayHeight) {
      this.adjustPhraseDisplayHeight();
    }
  });
  
  // Listen for auto-scroll events with improved feedback
  document.addEventListener('gridAutoScrolled', (e) => {
    // Update scroll area states
    this.updateScrollAreaStates();
    
    this._handleAutoScrollFeedback(e.detail);
  });
}

/**
 * Handle auto-scroll event feedback
 * @param {Object} detail - Event detail object
 * @private
 */
_handleAutoScrollFeedback(detail) {
  // Provide visual feedback for auto-scrolling
  if (detail.horizontalScroll) {
    // Determine horizontal direction from offset change
    const horizontalDirection = detail.offset.x > this._lastOffset.x ? 'right' : 'left';
    this._highlightScrollArea(horizontalDirection);
  }
  
  if (detail.verticalScroll) {
    // Determine vertical direction from offset change
    const verticalDirection = detail.offset.y > this._lastOffset.y ? 'down' : 'up';
    this._highlightScrollArea(verticalDirection);
  }
  
  // Update last known offset
  this._lastOffset = { ...detail.offset };
}

/**
 * Set up grid-related event listeners
 * @private
 */
_setupGridEventListeners() {
  // Listen for grid creation events
  document.addEventListener('gridCreated', (e) => {
    this.adjustScrollAreasToGrid(e.detail.gridRenderer);
    
    // Store initial offset
    if (e.detail.gridRenderer && e.detail.gridRenderer.viewOffset) {
      this._lastOffset = { ...e.detail.gridRenderer.viewOffset };
    }
  });
  
  // Listen for grid resize events
  document.addEventListener('gridResized', (e) => {
    this.adjustPhraseDisplayWidth();
    this.adjustScrollAreasToGrid(e.detail.gridRenderer);
  });
  
  // Listen for grid rebuild events (only when not scrolling)
  document.addEventListener('gridRebuilt', (e) => {
    // Only adjust if not during a scroll operation
    if (!e.detail.isScrolling) {
      this.adjustScrollAreasToGrid(e.detail.gridRenderer);
    }
  });
}

/**
 * Schedule initial updates with delays
 * @private
 */
_scheduleInitialUpdates() {
  // Initial updates with delay to ensure DOM is ready
  setTimeout(() => {
    this.adjustPhraseDisplayWidth();
    this.adjustScrollAreasToGrid(this.gridRenderer);
    this.updateScrollAreaStates();
  }, 100);
  
  // Additional update after longer delay to catch any late-loading elements
  setTimeout(() => {
    this.adjustPhraseDisplayWidth();
    this.adjustScrollAreasToGrid(this.gridRenderer);
    this.updateScrollAreaStates();
  }, 500);
}
  
/**
 * Show visual feedback for auto-scrolling to indicate direction
 * @param {Object} detail - Event detail with offset and lastCell
 */
showAutoScrollFeedback(detail) {
  if (!detail || !detail.offset) return;
  
  // Determine which edges the cell was close to
  const oldOffset = this._lastKnownOffset || { x: 0, y: 0 };
  const newOffset = detail.offset;
  
  // If this is the first time, just save the offset without feedback
  if (!this._hadPreviousOffset) {
    this._lastKnownOffset = { ...newOffset };
    this._hadPreviousOffset = true;
    return;
  }
  
  // Determine scroll directions and provide feedback
  if (newOffset.y < oldOffset.y) {
    this._highlightScrollArea('up');
  } else if (newOffset.y > oldOffset.y) {
    this._highlightScrollArea('down');
  }
  
  if (newOffset.x < oldOffset.x) {
    this._highlightScrollArea('left');
  } else if (newOffset.x > oldOffset.x) {
    this._highlightScrollArea('right');
  }
  
  // Store current offset for next comparison
  this._lastKnownOffset = { ...newOffset };
}
  
  /**
   * Display brief highlight animation on a scroll area
   * @param {HTMLElement} scrollArea - The scroll area to highlight
   */
  showScrollFeedback(scrollArea) {
    // Add active class
    scrollArea.classList.add('auto-scroll-feedback');
    
    // Remove after animation
    setTimeout(() => {
      scrollArea.classList.remove('auto-scroll-feedback');
    }, 300);
  }
  
  /**
 * Enhanced click handler for scroll areas with animation speed control
 * @param {string} direction - The scroll direction
 * @param {HTMLElement} scrollArea - The scroll area element
 */
handleScrollAreaClick(direction, scrollArea) {
  // Skip if disabled
  if (scrollArea.classList.contains('disabled')) return;
  
  // Add active class
  scrollArea.classList.add('active');
  
  // Scroll the grid with fast scroll (false = fast motion)
  this.gridRenderer.scroll(direction, false);
  
  // Update scroll area states
  this.updateScrollAreaStates();
  
  // Remove active class after animation
  setTimeout(() => {
    this.handleScrollAnimationComplete(scrollArea);
  }, 200); // Match the fast scroll duration
}
  
  /**
   * Handle the completion of a scroll area animation
   * Makes sure the background returns to transparent
   * @param {HTMLElement} scrollArea - The scroll area element
   */
  handleScrollAnimationComplete(scrollArea) {
    if (!scrollArea) return;
    
    // Remove active class
    scrollArea.classList.remove('active');
    
    // Ensure background is transparent
    scrollArea.style.backgroundColor = 'transparent';
  }
  
  /**
   * Adjust the scroll areas to perfectly match the grid dimensions
   * @param {GridRenderer} gridRenderer - The grid renderer instance
   */
  adjustScrollAreasToGrid(gridRenderer) {
    if (!gridRenderer || !gridRenderer.gridElement) return;
    
    const gridElement = gridRenderer.gridElement;
    const gridRect = gridElement.getBoundingClientRect();
    
    // Get the grid width and height
    const gridWidth = gridRect.width;
    const gridHeight = gridRect.height;
    
    // Calculate the scroll area height (twice the cell height)
    const scrollHeight = gridRenderer.options.cellSize * 2;
    
    // Set the top and bottom scroll area dimensions
    if (this.scrollAreas.top && this.scrollAreas.bottom) {
      this.scrollAreas.top.style.width = `${gridWidth}px`;
      this.scrollAreas.top.style.height = `${scrollHeight}px`;
      this.scrollAreas.bottom.style.width = `${gridWidth}px`;
      this.scrollAreas.bottom.style.height = `${scrollHeight}px`;
    }
    
    // Set the left and right scroll area dimensions
    if (this.scrollAreas.left && this.scrollAreas.right) {
      this.scrollAreas.left.style.width = `${scrollHeight}px`;
      this.scrollAreas.left.style.height = `${gridHeight}px`;
      this.scrollAreas.right.style.width = `${scrollHeight}px`;
      this.scrollAreas.right.style.height = `${gridHeight}px`;
    }
    
    console.log('Adjusted scroll areas to match grid dimensions:', {
      gridWidth,
      gridHeight,
      scrollHeight
    });
  }

/**
 * Highlight a scroll area to provide visual feedback
 * @param {string} direction - Scroll direction ('up', 'right', 'down', 'left')
 * @private
 */  
_highlightScrollArea(direction) {
  // Map directions to positions
  const positionMap = {
    'up': 'top',
    'right': 'right',
    'down': 'bottom',
    'left': 'left'
  };
  
  const position = positionMap[direction];
  const scrollArea = this.scrollAreas[position];
  
  if (scrollArea) {
    // Add feedback class
    scrollArea.classList.add('auto-scroll-feedback');
    
    // Remove after animation completes
    setTimeout(() => {
      scrollArea.classList.remove('auto-scroll-feedback');
    }, 300);
  }
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
    
    // Update scroll area disabled states
    if (this.scrollAreas) {
      this.scrollAreas.top.classList.toggle('disabled', !canScrollUp);
      this.scrollAreas.right.classList.toggle('disabled', !canScrollRight);
      this.scrollAreas.bottom.classList.toggle('disabled', !canScrollDown);
      this.scrollAreas.left.classList.toggle('disabled', !canScrollLeft);
    }
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
   * Show or hide the scroll areas
   * @param {boolean} show - Whether to show the scroll areas
   */
  setVisibility(show) {
    if (this.scrollAreas) {
      Object.values(this.scrollAreas).forEach(area => {
        area.style.display = show ? 'flex' : 'none';
      });
    }
  }
}

// Export for backward compatibility
class ArrowButtons extends ScrollAreaHandler {
  constructor(gridRenderer, options = {}) {
    super(gridRenderer, options);
    console.log('Using ScrollAreaHandler (formerly ArrowButtons)');
  }
}

// Export class for use in other modules
export default ArrowButtons;

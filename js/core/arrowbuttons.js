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
    
    // Insert the gameplay area and phrase display into the game container
    this.createMenuSystem();
    
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
   * Create menu system
   */
  createMenuSystem() {
    const menuContainer = document.createElement('div');
    menuContainer.id = 'menu-button-container';
    
    // Create menu toggle button
    const menuToggle = document.createElement('button');
    menuToggle.id = 'menu-toggle';
    menuToggle.className = 'metallic-button menu-button';
    
    // Create the menu icon (three bars)
    const menuIcon = document.createElement('span');
    menuIcon.className = 'menu-icon';
    menuIcon.innerHTML = '<span></span>'; // Middle bar
    
    menuToggle.appendChild(menuIcon);
    
    // Create dropdown menu
    const menuDropdown = document.createElement('div');
    menuDropdown.id = 'menu-dropdown';
    menuDropdown.className = 'menu-dropdown';
    
    // Create menu items
    const newPhraseButton = document.createElement('button');
    newPhraseButton.id = 'new-phrase-button';
    newPhraseButton.className = 'menu-item';
    newPhraseButton.textContent = 'New Random Phrase';
    
    const resetSelectionsButton = document.createElement('button');
    resetSelectionsButton.id = 'reset-selections-button';
    resetSelectionsButton.className = 'menu-item';
    resetSelectionsButton.textContent = 'Reset Selections';
    
    // Add menu items to dropdown
    menuDropdown.appendChild(newPhraseButton);
    menuDropdown.appendChild(resetSelectionsButton);
    
    // Assemble menu
    menuContainer.appendChild(menuToggle);
    menuContainer.appendChild(menuDropdown);
    
    // Add to game container
    this.gameContainer.appendChild(menuContainer);
    
    // Setup menu event handlers
    this.setupMenuHandlers(menuToggle, menuDropdown);
  }
  
  /**
   * Setup menu event handlers
   */
  setupMenuHandlers(menuToggle, menuDropdown) {
    // Toggle menu on button click
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent click from immediately closing menu
      menuToggle.classList.toggle('active');
      menuDropdown.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuToggle.classList.remove('active');
        menuDropdown.classList.remove('active');
      }
    });
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
   * Set up event listeners for scroll areas - UPDATED with auto-scroll support
   */
  setupEventListeners() {
    // Scroll area click events
    if (this.scrollAreas) {
      // Map directions to scroll areas
      const directions = {
        'top': 'up',
        'right': 'right',
        'bottom': 'down',
        'left': 'left'
      };
      
      // Set up click handlers for each scroll area
      Object.entries(this.scrollAreas).forEach(([position, element]) => {
        const direction = directions[position];
        
        element.addEventListener('click', () => {
          this.handleScrollAreaClick(direction, element);
        });
      });
    }
    
    // Set up menu button handlers
    const newPhraseButton = document.getElementById('new-phrase-button');
    if (newPhraseButton) {
      // The actual event handler will be set up by the game controller
      // Just making sure the element exists
    }
    
    const resetSelectionsButton = document.getElementById('reset-selections-button');
    if (resetSelectionsButton) {
      // The actual event handler will be set up by the game controller
      // Just making sure the element exists
    }
    
    // Keyboard navigation (preserved from original code)
    document.addEventListener('keydown', (event) => {
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
        // Scroll grid in the pressed direction
        this.gridRenderer.scroll(direction);
        
        // Update scroll area states
        this.updateScrollAreaStates();
      }
    });
    
    // Add listener for auto-scrolling events
    document.addEventListener('gridAutoScrolled', (e) => {
      // Update scroll area states when auto-scrolling occurs
      this.updateScrollAreaStates();
      
      // Visual feedback for auto-scroll
      this.showAutoScrollFeedback(e.detail);
    });
    
    // Initial update of scroll area states
    this.updateScrollAreaStates();
    
    // Listen for window resize
    window.addEventListener('resize', () => {
      this.adjustPhraseDisplayWidth();
      this.updateScrollAreaStates();
      if (this.gridRenderer) {
        this.adjustScrollAreasToGrid(this.gridRenderer);
      }
    });
    
    // Add listener for grid creation to adjust scroll areas
    document.addEventListener('gridCreated', (e) => {
      this.adjustScrollAreasToGrid(e.detail.gridRenderer);
    });
    
    // Add listener for grid resize to adjust scroll areas
    document.addEventListener('gridResized', (e) => {
      this.adjustPhraseDisplayWidth();
      this.adjustScrollAreasToGrid(e.detail.gridRenderer);
    });
    
    // Add listener for grid rebuild to adjust scroll areas
    document.addEventListener('gridRebuilt', (e) => {
      this.adjustScrollAreasToGrid(e.detail.gridRenderer);
    });
    
    // Adjust phrase display on initial load
    setTimeout(() => {
      this.adjustPhraseDisplayWidth();
      this.adjustScrollAreasToGrid(this.gridRenderer);
    }, 100);
  }
  
  /**
   * Show visual feedback for auto-scrolling to indicate direction
   * @param {Object} detail - Event detail with offset and lastCell
   */
  showAutoScrollFeedback(detail) {
    if (!detail || !detail.lastCell) return;
    
    // Determine which edges the cell was close to
    const lastCell = detail.lastCell;
    const oldOffset = this._lastKnownOffset || { x: 0, y: 0 };
    const newOffset = detail.offset;
    
    // Store current offset for next comparison
    this._lastKnownOffset = { ...newOffset };
    
    // If this is the first time, just save the offset without feedback
    if (!this._hadPreviousOffset) {
      this._hadPreviousOffset = true;
      return;
    }
    
    // Determine scroll directions
    const scrolledUp = newOffset.y < oldOffset.y;
    const scrolledDown = newOffset.y > oldOffset.y;
    const scrolledLeft = newOffset.x < oldOffset.x;
    const scrolledRight = newOffset.x > oldOffset.x;
    
    // Apply visual feedback to corresponding scroll areas
    if (scrolledUp && this.scrollAreas.top) {
      this.showScrollFeedback(this.scrollAreas.top);
    }
    
    if (scrolledDown && this.scrollAreas.bottom) {
      this.showScrollFeedback(this.scrollAreas.bottom);
    }
    
    if (scrolledLeft && this.scrollAreas.left) {
      this.showScrollFeedback(this.scrollAreas.left);
    }
    
    if (scrolledRight && this.scrollAreas.right) {
      this.showScrollFeedback(this.scrollAreas.right);
    }
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
   * Enhanced click handler for scroll areas with better animation cleanup
   * @param {string} direction - The scroll direction
   * @param {HTMLElement} scrollArea - The scroll area element
   */
  handleScrollAreaClick(direction, scrollArea) {
    // Skip if disabled
    if (scrollArea.classList.contains('disabled')) return;
    
    // Add active class
    scrollArea.classList.add('active');
    
    // Scroll the grid
    this.gridRenderer.scroll(direction);
    
    // Update scroll area states
    this.updateScrollAreaStates();
    
    // Remove active class and clear background after animation
    setTimeout(() => {
      this.handleScrollAnimationComplete(scrollArea);
    }, 150);
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

/**
 * Simplified Triangular Arrow Controller
 * Creates 4 triangular buttons arranged in a square formation with an X pattern
 * CSS styles are now handled externally in grid.css
 */

class ArrowButtons {
  constructor(gridRenderer, options = {}) {
    this.gridRenderer = gridRenderer;
    
    // Configuration options
    this.options = {
      gameContainerId: options.gameContainerId || 'game-container',
      tapThreshold: 350,        // ms - anything shorter is a tap
      movementRate: 400,        // ms per grid square for long press
      animationDuration: 300,   // ms for single square animations
      ...options
    };
    
    // State tracking
    this.isPressed = false;
    this.pressStartTime = 0;
    this.currentDirection = null;
    this.isLongPressing = false;
    this.animationFrameId = null;
    this.longPressTimer = null;
    
    // Movement state
    this._isScrolling = false;
    this._lastMovementTime = 0;
    
    // Track input type to handle mouse vs touch differently
    this.currentInputType = null;
    
    // Create the controller
    this.createController();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Make globally accessible for compatibility
    window.arrowButtons = this;
  }
  
  /**
   * Create the triangular controller interface
   */
  createController() {
    // Get reference to the game container
    this.gameContainer = document.getElementById(this.options.gameContainerId);
    if (!this.gameContainer) {
      console.error(`Game container with id '${this.options.gameContainerId}' not found`);
      return;
    }
    
    // Get existing elements
    const gridContainer = document.getElementById(this.gridRenderer.container.id);
    let phraseDisplay = document.getElementById('phrase-display');
    
    // Preserve existing phrase display or create new one
    if (!phraseDisplay) {
      phraseDisplay = document.createElement('div');
      phraseDisplay.id = 'phrase-display';
      phraseDisplay.className = 'phrase-display';
      
      const phraseText = document.createElement('p');
      phraseText.id = 'phrase-text';
      phraseText.textContent = '_ * * * * * * * * *';
      phraseDisplay.appendChild(phraseText);
    }
    
    // Create gameplay area container
    const gameplayArea = document.createElement('div');
    gameplayArea.id = 'gameplay-area';
    gameplayArea.style.cssText = `
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0 auto;
    `;
    
    // Create square controller container
    const controllerContainer = document.createElement('div');
    controllerContainer.id = 'triangular-controller-container';
    controllerContainer.className = 'triangular-controller-container';
    
    // Create the four triangular buttons
    const triangles = [
      { id: 'triangle-up', direction: 'up', className: 'triangle-button triangle-up' },
      { id: 'triangle-right', direction: 'right', className: 'triangle-button triangle-right' },
      { id: 'triangle-down', direction: 'down', className: 'triangle-button triangle-down' },
      { id: 'triangle-left', direction: 'left', className: 'triangle-button triangle-left' }
    ];
    
    triangles.forEach(triangle => {
      const triangleElement = document.createElement('div');
      triangleElement.id = triangle.id;
      triangleElement.className = triangle.className;
      triangleElement.dataset.direction = triangle.direction;
      
      // Add arrow indicator
      const arrow = document.createElement('div');
      arrow.className = 'triangle-arrow';
      
      // Set arrow character based on direction
      const arrowChars = {
        up: '▲',
        right: '▶',
        down: '▼',
        left: '◀'
      };
      arrow.textContent = arrowChars[triangle.direction];
      
      triangleElement.appendChild(arrow);
      controllerContainer.appendChild(triangleElement);
    });
    
    // Assemble the layout
    const gridContainerParent = gridContainer.parentNode;
    gridContainer.parentNode.removeChild(gridContainer);
    
    gameplayArea.appendChild(phraseDisplay);
    gameplayArea.appendChild(gridContainer);
    gameplayArea.appendChild(controllerContainer);
    
    if (gridContainerParent) {
      gridContainerParent.appendChild(gameplayArea);
    } else {
      this.gameContainer.appendChild(gameplayArea);
    }
    
    // Store references
    this.controller = controllerContainer;
    this.phraseDisplay = phraseDisplay;
    this.triangles = triangles.map(t => document.getElementById(t.id));
    
    // Initial adjustments
    setTimeout(() => {
      this.adjustPhraseDisplayWidth();
      this.updateScrollStates();
    }, 100);
  }
  
  /**
   * Set up event listeners for touch and mouse interactions
   */
  setupEventListeners() {
    // Add event listeners to each triangle
    this.triangles.forEach(triangle => {
      // Mouse events - handle long click properly
      triangle.addEventListener('mousedown', (e) => {
        this.currentInputType = 'mouse';
        this.handlePressStart(e);
      });
      
      triangle.addEventListener('mouseup', (e) => {
        if (this.currentInputType === 'mouse') {
          this.handlePressEnd(e);
        }
      });
      
      // Only end on mouseleave if we're not in a long press
      triangle.addEventListener('mouseleave', (e) => {
        if (this.currentInputType === 'mouse' && !this.isLongPressing) {
          this.handlePressEnd(e);
        }
      });
      
      // Touch events
      triangle.addEventListener('touchstart', (e) => {
        this.currentInputType = 'touch';
        this.handlePressStart(e);
      });
      
      triangle.addEventListener('touchend', (e) => {
        if (this.currentInputType === 'touch') {
          this.handlePressEnd(e);
        }
      });
      
      triangle.addEventListener('touchcancel', (e) => {
        if (this.currentInputType === 'touch') {
          this.handlePressEnd(e);
        }
      });
    });
    
    // Global mouse up to catch releases outside the element
    document.addEventListener('mouseup', (e) => {
      if (this.isPressed && this.currentInputType === 'mouse') {
        console.log('Global mouseup detected - ending press');
        this.handlePressEnd(e);
      }
    });
    
    // Also listen for mouse leave on document for edge cases
    document.addEventListener('mouseleave', (e) => {
      if (this.isPressed && this.currentInputType === 'mouse') {
        console.log('Mouse left document - ending press');
        this.handlePressEnd(e);
      }
    });
    
    // Grid scroll completion events
    document.addEventListener('gridScrollComplete', () => {
      this._isScrolling = false;
      this.updateScrollStates();
    });
    
    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase();
        this.handleSingleMove(direction);
      }
    });
    
    // Window resize
    window.addEventListener('resize', () => {
      this.adjustPhraseDisplayWidth();
    });
  }
  
  /**
   * Handle press start (mouse down or touch start)
   */
  handlePressStart(e) {
    e.preventDefault();
    
    if (this._isScrolling || this.isPressed) return;
    
    const triangle = e.currentTarget;
    const direction = triangle.dataset.direction;
    
    if (triangle.classList.contains('disabled')) return;
    
    console.log(`Press start: ${direction} (${this.currentInputType})`);
    
    // Set press state
    this.isPressed = true;
    this.pressStartTime = Date.now();
    this.currentDirection = direction;
    this.isLongPressing = false;
    
    // Visual feedback
    triangle.classList.add('active');
    
    // Set up long press detection
    this.longPressTimeout = setTimeout(() => {
      if (this.isPressed && this.currentDirection === direction) {
        console.log(`Long press timeout reached for ${direction}`);
        this.startLongPress();
      }
    }, this.options.tapThreshold);
  }
  
  /**
   * Handle press end (mouse up or touch end)
   */
  handlePressEnd(e) {
    if (!this.isPressed) return;
    
    console.log(`Press end: ${this.currentDirection} (${this.currentInputType})`);
    
    const pressDuration = Date.now() - this.pressStartTime;
    const direction = this.currentDirection;
    
    // Clear the long press timeout
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    // Clear visual states
    this.triangles.forEach(t => {
      t.classList.remove('active', 'long-pressing');
    });
    
    // Stop long press if active
    if (this.isLongPressing) {
      console.log('Stopping long press');
      this.stopLongPress();
    } else if (pressDuration < this.options.tapThreshold) {
      // This was a tap - do single move
      console.log(`Short press detected (${pressDuration}ms) - single move`);
      this.handleSingleMove(direction);
    }
    
    // Reset state
    this.isPressed = false;
    this.currentDirection = null;
    this.isLongPressing = false;
    this.currentInputType = null;
  }
  
  /**
   * Start long press continuous movement
   */
  startLongPress() {
    if (!this.isPressed || this.isLongPressing) return;
    
    console.log(`Starting long press for direction: ${this.currentDirection}`);
    
    this.isLongPressing = true;
    this._isScrolling = true;
    this._lastMovementTime = Date.now();
    
    // Add visual feedback
    const triangle = this.triangles.find(t => t.dataset.direction === this.currentDirection);
    if (triangle) {
      triangle.classList.remove('active');
      triangle.classList.add('long-pressing');
    }
    
    // Perform initial scroll immediately
    this.gridRenderer.scroll(this.currentDirection, false);
    
    // Start continuous movement
    this.longPressTimer = setInterval(() => {
      this.performScrollMove();
    }, this.options.movementRate);
  }

  /**
   * Perform a single scroll move
   */
  performScrollMove() {
    if (!this.isLongPressing || !this.isPressed) {
      console.log('Stopping scroll move - not long pressing or not pressed');
      return;
    }
    
    if (this._isScrolling) {
      // Skip if still scrolling
      return;
    }
    
    this._isScrolling = true;
    
    // Perform the grid scroll
    this.gridRenderer.scroll(this.currentDirection, false);
    
    // Update states
    this.updateScrollStates();
  }

  /**
   * Stop long press movement
   */
  stopLongPress() {
    console.log('Stopping long press');
    this.isLongPressing = false;
    
    // Clear the interval timer
    if (this.longPressTimer) {
      clearInterval(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    // Clear any animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clear timeout if it exists
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    this._isScrolling = false;
    this._lastMovementTime = 0;
  }
  
  /**
   * Handle single grid square movement (tap)
   */
  handleSingleMove(direction) {
    if (this._isScrolling) return;
    
    this._isScrolling = true;
    
    // Use existing grid renderer scroll method
    this.gridRenderer.scroll(direction, false);
    
    // Add visual feedback
    this.flashDirection(direction);
    
    // Reset scrolling flag after animation
    setTimeout(() => {
      this._isScrolling = false;
      this.updateScrollStates();
    }, this.options.animationDuration);
  }
  
  /**
   * Flash visual feedback for direction
   */
  flashDirection(direction) {
    const triangle = this.triangles.find(t => t.dataset.direction === direction);
    if (!triangle) return;
    
    triangle.classList.add('active');
    
    setTimeout(() => {
      triangle.classList.remove('active');
    }, 200);
  }
  
  /**
   * Update scroll state (enable/disable buttons based on grid limits)
   */
  updateScrollStates() {
    const { x: offsetX, y: offsetY } = this.gridRenderer.viewOffset;
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.gridRenderer.options.gridWidthSmall : this.gridRenderer.options.gridWidth;
    const height = isMobile ? this.gridRenderer.options.gridHeightSmall : this.gridRenderer.options.gridHeight;
    
    // Check each direction for possible scrolling
    const canScrollUp = offsetY > 0;
    const canScrollRight = offsetX + width < this.gridRenderer.fullGridSize;
    const canScrollDown = offsetY + height < this.gridRenderer.fullGridSize;
    const canScrollLeft = offsetX > 0;
    
    // Update triangle disabled states
    this.triangles.forEach(triangle => {
      const direction = triangle.dataset.direction;
      let canScroll = true;
      
      switch (direction) {
        case 'up': canScroll = canScrollUp; break;
        case 'right': canScroll = canScrollRight; break;
        case 'down': canScroll = canScrollDown; break;
        case 'left': canScroll = canScrollLeft; break;
      }
      
      triangle.classList.toggle('disabled', !canScroll);
    });
  }

  /**
   * Adjust phrase display width to match grid
   */
  adjustPhraseDisplayWidth() {
    const gridElement = this.gridRenderer?.gridElement;
    
    if (!gridElement || !this.phraseDisplay) return;
    
    const gridRect = gridElement.getBoundingClientRect();
    this.phraseDisplay.style.width = `${gridRect.width}px`;
    this.adjustPhraseDisplayHeight();
  }
  
  /**
   * Adjust phrase display height based on content
   */
  adjustPhraseDisplayHeight() {
    const phraseText = document.getElementById('phrase-text');
    
    if (!phraseText || !this.phraseDisplay) return;
    
    this.phraseDisplay.style.minHeight = 'auto';
    const contentHeight = phraseText.scrollHeight;
    const padding = 30;
    
    this.phraseDisplay.style.minHeight = `${contentHeight + padding}px`;
  }
  
  // Legacy compatibility methods
  updateScrollAreaStates() {
    this.updateScrollStates();
  }
  
  setVisibility(show) {
    const container = document.getElementById('triangular-controller-container');
    if (container) {
      container.style.display = show ? 'grid' : 'none';
    }
  }
}

// Export for module use and ensure global availability
window.ArrowButtons = ArrowButtons;
export default ArrowButtons;

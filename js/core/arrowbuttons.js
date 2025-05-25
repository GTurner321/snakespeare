/**
 * Fixed Triangular Arrow Controller
 * Creates 4 triangular buttons arranged in a square formation with an X pattern
 * Properly handles touch, click, and long press events
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
    
    // Movement state
    this._isScrolling = false;
    this._lastMovementTime = 0;
    
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
    // Note: Changed to make buttons meet at the center to form an X pattern
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
    
    // Inject CSS styles
    this.injectStyles();
    
    // Initial adjustments
    setTimeout(() => {
      this.adjustPhraseDisplayWidth();
      this.updateScrollStates();
    }, 100);
  }
  
  /**
   * Inject CSS styles for triangular buttons
   */
  injectStyles() {
    if (document.getElementById('triangular-controller-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'triangular-controller-styles';
    style.textContent = `
      /* Triangular Controller Styles */
      .triangular-controller-container {
        width: 120px;
        height: 120px;
        position: relative;
        margin: 20px auto;
        user-select: none;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
      }
      
      .triangle-button {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
        /* Base metallic styling from buttonsboxes.css */
        background: repeating-linear-gradient(
          120deg,
          var(--btn-metal-light, #e8e8e8) 0px,
          var(--btn-metal-medium, #d5d5d5) 10px,
          var(--btn-metal-light, #e8e8e8) 30px,
          var(--btn-metal-mediumlight, #dfdfdf) 55px,
          var(--btn-metal-medium, #d5d5d5) 80px,
          var(--btn-metal-mediumlight, #dfdfdf) 95px,
          var(--btn-metal-light, #e8e8e8) 120px,
          var(--btn-metal-medium, #d5d5d5) 135px
        );
        border: 2px solid var(--btn-metal-border, #b8b8b8);
        box-shadow: 
          0 4px 8px 1px var(--btn-metal-shadow, rgba(0, 0, 0, 0.25)),
          0 1px 3px 1px rgba(0, 0, 0, 0.15),
          inset 0 1px 2px var(--btn-metal-inner-highlight, rgba(255, 255, 255, 0.6)),
          inset 0 -1px 2px var(--btn-metal-inner-shadow, rgba(0, 0, 0, 0.2));
      }
      
      /* Top triangle pointing down toward center */
      .triangle-up {
        grid-column: 1 / 3;
        grid-row: 1;
        height: 60px;
        clip-path: polygon(0 0, 100% 0, 50% 100%);
        z-index: 2;
        border-bottom: none;
      }
      
      /* Right triangle pointing left toward center */
      .triangle-right {
        grid-column: 2;
        grid-row: 1 / 3;
        width: 60px;
        clip-path: polygon(100% 0, 100% 100%, 0 50%);
        z-index: 2;
        border-left: none;
      }
      
      /* Bottom triangle pointing up toward center */
      .triangle-down {
        grid-column: 1 / 3;
        grid-row: 2;
        height: 60px;
        clip-path: polygon(0 100%, 100% 100%, 50% 0);
        z-index: 2;
        border-top: none;
      }
      
      /* Left triangle pointing right toward center */
      .triangle-left {
        grid-column: 1;
        grid-row: 1 / 3;
        width: 60px;
        clip-path: polygon(0 0, 0 100%, 100% 50%);
        z-index: 2;
        border-right: none;
      }
      
      .triangle-arrow {
        font-size: 18px;
        color: var(--btn-text-color, #444);
        text-shadow: 
          0px 1px 1px var(--btn-text-shadow-light, rgba(255, 255, 255, 0.8)),
          0px -1px 1px var(--btn-text-shadow-dark, rgba(0, 0, 0, 0.2));
        transition: transform 0.15s ease, color 0.15s ease;
        pointer-events: none;
        z-index: 10;
        position: relative;
      }
      
      /* Position the arrows in the correct locations */
      .triangle-up .triangle-arrow {
        transform: translateY(-10px);
      }
      
      .triangle-right .triangle-arrow {
        transform: translateX(10px);
      }
      
      .triangle-down .triangle-arrow {
        transform: translateY(10px);
      }
      
      .triangle-left .triangle-arrow {
        transform: translateX(-10px);
      }
      
      /* Hover effects */
      @media (hover: hover) {
        .triangle-button:hover:not(.disabled) {
          background: repeating-linear-gradient(
            120deg,
            var(--btn-metal-lighter, #f0f0f0) 0px,
            var(--btn-metal-light, #e8e8e8) 15px,
            var(--btn-metal-lighter, #f0f0f0) 35px,
            var(--btn-metal-mediumlight, #dfdfdf) 60px,
            var(--btn-metal-light, #e8e8e8) 85px,
            var(--btn-metal-mediumlight, #dfdfdf) 100px,
            var(--btn-metal-lighter, #f0f0f0) 125px,
            var(--btn-metal-light, #e8e8e8) 140px
          );
        }
        
        .triangle-button:hover:not(.disabled) .triangle-arrow {
          transform: scale(1.15);
          color: var(--btn-text-hover, #222);
        }
        
        /* Keep the positioning transforms */
        .triangle-up:hover:not(.disabled) .triangle-arrow {
          transform: translateY(-10px) scale(1.15);
        }
        
        .triangle-right:hover:not(.disabled) .triangle-arrow {
          transform: translateX(10px) scale(1.15);
        }
        
        .triangle-down:hover:not(.disabled) .triangle-arrow {
          transform: translateY(10px) scale(1.15);
        }
        
        .triangle-left:hover:not(.disabled) .triangle-arrow {
          transform: translateX(-10px) scale(1.15);
        }
      }
      
      /* Active/pressed state matching buttonsboxes.css */
      .triangle-button.active {
        background: repeating-linear-gradient(
          120deg,
          var(--btn-metal-dark, #b8b8b8) 0px,
          var(--btn-metal-darker, #a0a0a0) 10px,
          var(--btn-metal-dark, #b8b8b8) 30px,
          var(--btn-metal-mediumdark, #c8c8c8) 55px,
          var(--btn-metal-darker, #a0a0a0) 80px,
          var(--btn-metal-mediumdark, #c8c8c8) 95px,
          var(--btn-metal-dark, #b8b8b8) 120px,
          var(--btn-metal-darker, #a0a0a0) 135px
        ) !important;
        box-shadow: 
          inset 0 4px 8px rgba(0, 0, 0, 0.5),
          inset 0 2px 4px rgba(0, 0, 0, 0.6);
        transform: scale(0.95);
        animation: triangle-button-pulse 0.2s ease;
      }
      
      .triangle-button.active .triangle-arrow {
        color: var(--btn-text-active, #000);
        text-shadow: 
          0px 1px 0px var(--btn-text-shadow-pressed-light, rgba(255, 255, 255, 0.3)),
          0px -1px 0px var(--btn-text-shadow-pressed-dark, rgba(0, 0, 0, 0.5));
      }
      
      /* Keep the positioning transforms for active state */
      .triangle-up.active .triangle-arrow {
        transform: translateY(-10px) scale(0.95);
      }
      
      .triangle-right.active .triangle-arrow {
        transform: translateX(10px) scale(0.95);
      }
      
      .triangle-down.active .triangle-arrow {
        transform: translateY(10px) scale(0.95);
      }
      
      .triangle-left.active .triangle-arrow {
        transform: translateX(-10px) scale(0.95);
      }
      
      /* Long press pulsing animation */
      .triangle-button.long-pressing {
        background: repeating-linear-gradient(
          120deg,
          var(--btn-metal-dark, #b8b8b8) 0px,
          var(--btn-metal-darker, #a0a0a0) 10px,
          var(--btn-metal-dark, #b8b8b8) 30px,
          var(--btn-metal-mediumdark, #c8c8c8) 55px,
          var(--btn-metal-darker, #a0a0a0) 80px,
          var(--btn-metal-mediumdark, #c8c8c8) 95px,
          var(--btn-metal-dark, #b8b8b8) 120px,
          var(--btn-metal-darker, #a0a0a0) 135px
        ) !important;
        animation: triangle-long-press-pulse 0.6s infinite;
        transform: scale(0.95);
      }
      
      @keyframes triangle-button-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(0.95); }
      }
      
      @keyframes triangle-long-press-pulse {
        0%, 100% { 
          box-shadow: 
            inset 0 4px 8px rgba(0, 0, 0, 0.5),
            inset 0 2px 4px rgba(0, 0, 0, 0.6);
        }
        50% { 
          box-shadow: 
            inset 0 6px 12px rgba(0, 0, 0, 0.7),
            inset 0 3px 6px rgba(0, 0, 0, 0.8);
        }
      }
      
      /* Disabled state */
      .triangle-button.disabled {
        opacity: 0.3;
        cursor: default;
        pointer-events: none;
      }
      
      .triangle-button.disabled .triangle-arrow {
        color: #999;
        text-shadow: none;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .triangular-controller-container {
          width: 100px;
          height: 100px;
        }
        
        .triangle-up, .triangle-down {
          height: 50px;
        }
        
        .triangle-left, .triangle-right {
          width: 50px;
        }
        
        .triangle-arrow {
          font-size: 16px;
        }
      }
      
      @media (max-width: 480px) {
        .triangular-controller-container {
          width: 85px;
          height: 85px;
          margin: 15px auto;
        }
        
        .triangle-up, .triangle-down {
          height: 42px;
        }
        
        .triangle-left, .triangle-right {
          width: 42px;
        }
        
        .triangle-arrow {
          font-size: 14px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Set up event listeners for touch and mouse interactions
   */
  setupEventListeners() {
    // Add event listeners to each triangle
    this.triangles.forEach(triangle => {
      // Mouse events
      triangle.addEventListener('mousedown', (e) => this.handlePressStart(e));
      triangle.addEventListener('mouseup', (e) => this.handlePressEnd(e));
      triangle.addEventListener('mouseleave', (e) => this.handlePressEnd(e));
      
      // Touch events
      triangle.addEventListener('touchstart', (e) => this.handlePressStart(e));
      triangle.addEventListener('touchend', (e) => this.handlePressEnd(e));
      triangle.addEventListener('touchcancel', (e) => this.handlePressEnd(e));
    });
    
    // Global mouse up to catch releases outside the element
    document.addEventListener('mouseup', (e) => {
      if (this.isPressed) {
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
    
    // Set press state
    this.isPressed = true;
    this.pressStartTime = Date.now();
    this.currentDirection = direction;
    this.isLongPressing = false;
    
    // Visual feedback
    triangle.classList.add('active');
    
    // Set up long press detection
    setTimeout(() => {
      if (this.isPressed && this.currentDirection === direction) {
        this.startLongPress();
      }
    }, this.options.tapThreshold);
  }
  
  /**
   * Handle press end (mouse up or touch end)
   */
  handlePressEnd(e) {
    if (!this.isPressed) return;
    
    const pressDuration = Date.now() - this.pressStartTime;
    const direction = this.currentDirection;
    
    // Clear visual states
    this.triangles.forEach(t => {
      t.classList.remove('active', 'long-pressing');
    });
    
    // Stop long press if active
    if (this.isLongPressing) {
      this.stopLongPress();
    } else if (pressDuration < this.options.tapThreshold) {
      // This was a tap - do single move
      this.handleSingleMove(direction);
    }
    
    // Reset state
    this.isPressed = false;
    this.currentDirection = null;
    this.isLongPressing = false;
  }
  
/**
 * Start long press continuous movement
 * Simplified for reliable timing and response
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
  
  // Perform initial scroll immediately for more responsive feel
  this.gridRenderer.scroll(this.currentDirection, false);
  
  // Start continuous movement with a reliable timer
  this.longPressTimer = setInterval(() => {
    this.performScrollMove();
  }, this.options.movementRate); // Use existing rate (typically 400ms)
}

/**
 * Perform a single scroll move
 * Simple and reliable method for continuous scrolling
 */
performScrollMove() {
  if (!this.isLongPressing || !this.isPressed) {
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
 * Simple cleanup for reliable stopping
 */
stopLongPress() {
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

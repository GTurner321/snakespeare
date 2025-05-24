/**
 * Enhanced Circular Arrow Controller
 * Replaces the trackpad with a circular 4-quarter navigation system
 * Supports both tap (1 square) and long-press (fractional) movement
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
      smoothAnimationDuration: 200, // ms for fractional movements
      accelerationStartTime: 1000,  // ms - when to start acceleration
      maxSpeed: 150,           // ms per grid square (conservative to start)
      accelerationCap: 0.6,    // Max acceleration factor (conservative)
      momentumDecayRate: 0.85, // How quickly momentum fades (0-1)
      ...options
    };
    
    // State tracking
    this.isPressed = false;
    this.pressStartTime = 0;
    this.currentDirection = null;
    this.isLongPressing = false;
    this.animationFrameId = null;
    this.currentFractionalOffset = { x: 0, y: 0 };
    this.currentSpeed = this.options.movementRate; // Current movement speed
    this.momentum = 0; // Current momentum for easing
    
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
   * Create the circular controller interface
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
    
    // Create circular controller container
    const controllerContainer = document.createElement('div');
    controllerContainer.id = 'circular-controller-container';
    controllerContainer.className = 'circular-controller-container';
    
    // Create the circular controller
    const controller = document.createElement('div');
    controller.id = 'circular-controller';
    controller.className = 'circular-controller metallic-button';
    
    // Create the four quarter buttons
    const quarters = [
      { id: 'quarter-up', direction: 'up', className: 'quarter quarter-up' },
      { id: 'quarter-right', direction: 'right', className: 'quarter quarter-right' },
      { id: 'quarter-down', direction: 'down', className: 'quarter quarter-down' },
      { id: 'quarter-left', direction: 'left', className: 'quarter quarter-left' }
    ];
    
    quarters.forEach(quarter => {
      const quarterElement = document.createElement('div');
      quarterElement.id = quarter.id;
      quarterElement.className = quarter.className;
      quarterElement.dataset.direction = quarter.direction;
      
      // Add arrow indicator
      const arrow = document.createElement('div');
      arrow.className = 'arrow-indicator';
      
      // Set arrow character based on direction
      const arrowChars = {
        up: '▲',
        right: '▶',
        down: '▼',
        left: '◀'
      };
      arrow.textContent = arrowChars[quarter.direction];
      
      quarterElement.appendChild(arrow);
      controller.appendChild(quarterElement);
    });
    
    // Create center nipple
    const centerNipple = document.createElement('div');
    centerNipple.className = 'center-nipple';
    controller.appendChild(centerNipple);
    
    // Add controller to container
    controllerContainer.appendChild(controller);
    
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
    this.controller = controller;
    this.phraseDisplay = phraseDisplay;
    this.quarters = quarters.map(q => document.getElementById(q.id));
    
    // Inject CSS styles
    this.injectStyles();
    
    // Initial adjustments
    setTimeout(() => {
      this.adjustPhraseDisplayWidth();
      this.updateScrollStates();
    }, 100);
  }
  
  /**
   * Inject CSS styles for the circular controller
   */
  injectStyles() {
    if (document.getElementById('circular-controller-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'circular-controller-styles';
    style.textContent = `
      /* Circular Controller Styles */
      .circular-controller-container {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 0;
        position: relative;
        z-index: 20;
        user-select: none;
      }
      
      .circular-controller {
        position: relative;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        /* Use metallic styling from buttonsboxes.css */
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
          0 6px 12px 2px var(--btn-metal-shadow, rgba(0, 0, 0, 0.25)),
          0 2px 6px 1px rgba(0, 0, 0, 0.15),
          inset 0 1px 2px var(--btn-metal-inner-highlight, rgba(255, 255, 255, 0.6)),
          inset 0 -1px 2px var(--btn-metal-inner-shadow, rgba(0, 0, 0, 0.2));
        overflow: hidden;
        touch-action: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
      }
      
      .quarter {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
        /* Add borders to separate quarters */
        border: 1px solid var(--btn-metal-border, #b8b8b8);
      }
      
      /* FIXED: Proper X-shaped division with borders */
      .quarter-up {
        top: 0;
        left: 25%;
        right: 25%;
        height: 50%;
        clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
        transform-origin: 50% 100%;
        border-bottom: 2px solid var(--btn-metal-border, #b8b8b8);
      }
      
      .quarter-right {
        top: 25%;
        right: 0;
        bottom: 25%;
        width: 50%;
        clip-path: polygon(0% 0%, 100% 25%, 100% 75%, 0% 100%);
        transform-origin: 0% 50%;
        border-left: 2px solid var(--btn-metal-border, #b8b8b8);
      }
      
      .quarter-down {
        bottom: 0;
        left: 25%;
        right: 25%;
        height: 50%;
        clip-path: polygon(0% 0%, 100% 0%, 75% 100%, 25% 100%);
        transform-origin: 50% 0%;
        border-top: 2px solid var(--btn-metal-border, #b8b8b8);
      }
      
      .quarter-left {
        top: 25%;
        left: 0;
        bottom: 25%;
        width: 50%;
        clip-path: polygon(100% 0%, 0% 25%, 0% 75%, 100% 100%);
        transform-origin: 100% 50%;
        border-right: 2px solid var(--btn-metal-border, #b8b8b8);
      }
      
      .arrow-indicator {
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
      
      /* Hover effects */
      @media (hover: hover) {
        .quarter:hover:not(.disabled) {
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
        
        .quarter:hover:not(.disabled) .arrow-indicator {
          transform: scale(1.1);
          color: var(--btn-text-hover, #222);
        }
      }
      
      /* FIXED: Active/pressed state with proper button depression */
      .quarter.active {
        background: repeating-linear-gradient(
          120deg,
          var(--btn-metal-medium, #d5d5d5) 0px,
          var(--btn-metal-dark, #b8b8b8) 10px,
          var(--btn-metal-medium, #d5d5d5) 30px,
          var(--btn-metal-mediumdark, #c8c8c8) 55px,
          var(--btn-metal-dark, #b8b8b8) 80px,
          var(--btn-metal-mediumdark, #c8c8c8) 95px,
          var(--btn-metal-medium, #d5d5d5) 120px,
          var(--btn-metal-dark, #b8b8b8) 135px
        ) !important;
        /* Inset shadow for pressed effect */
        box-shadow: 
          inset 0 2px 4px rgba(0, 0, 0, 0.3),
          inset 0 1px 2px rgba(0, 0, 0, 0.4) !important;
        transform: scale(0.98);
        animation: button-pulse 0.2s ease;
      }
      
      .quarter.active .arrow-indicator {
        transform: scale(1.1) translateY(1px);
        color: var(--btn-text-active, #000);
        text-shadow: 
          0px 1px 0px var(--btn-text-shadow-pressed-light, rgba(255, 255, 255, 0.5)),
          0px -1px 0px var(--btn-text-shadow-pressed-dark, rgba(0, 0, 0, 0.3));
      }
      
      /* Long press continuous movement with pulsing */
      .quarter.long-pressing {
        background: repeating-linear-gradient(
          120deg,
          var(--btn-metal-medium, #d5d5d5) 0px,
          var(--btn-metal-dark, #b8b8b8) 10px,
          var(--btn-metal-medium, #d5d5d5) 30px,
          var(--btn-metal-mediumdark, #c8c8c8) 55px,
          var(--btn-metal-dark, #b8b8b8) 80px,
          var(--btn-metal-mediumdark, #c8c8c8) 95px,
          var(--btn-metal-medium, #d5d5d5) 120px,
          var(--btn-metal-dark, #b8b8b8) 135px
        ) !important;
        animation: long-press-pulse 0.8s infinite;
        box-shadow: 
          inset 0 2px 4px rgba(0, 0, 0, 0.3),
          inset 0 1px 2px rgba(0, 0, 0, 0.4);
      }
      
      @keyframes button-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(0.98); }
        100% { transform: scale(0.98); }
      }
      
      @keyframes long-press-pulse {
        0%, 100% { 
          box-shadow: 
            inset 0 2px 4px rgba(0, 0, 0, 0.3),
            inset 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        50% { 
          box-shadow: 
            inset 0 3px 6px rgba(0, 0, 0, 0.4),
            inset 0 2px 3px rgba(0, 0, 0, 0.5);
        }
      }
      
      /* Disabled state */
      .quarter.disabled {
        opacity: 0.3;
        cursor: default;
        pointer-events: none;
      }
      
      .quarter.disabled .arrow-indicator {
        color: #999;
        text-shadow: none;
      }
      
      /* Center nipple */
      .center-nipple {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--btn-metal-dark, #aaa);
        border: 1px solid var(--btn-metal-darker, #888);
        transform: translate(-50%, -50%);
        box-shadow: 
          inset 0 1px 2px rgba(0, 0, 0, 0.3),
          0 1px 1px rgba(255, 255, 255, 0.5);
        z-index: 15;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .circular-controller {
          width: 100px;
          height: 100px;
        }
        
        .arrow-indicator {
          font-size: 16px;
        }
        
        .center-nipple {
          width: 14px;
          height: 14px;
        }
      }
      
      @media (max-width: 480px) {
        .circular-controller {
          width: 85px;
          height: 85px;
        }
        
        .arrow-indicator {
          font-size: 14px;
        }
        
        .center-nipple {
          width: 12px;
          height: 12px;
        }
        
        .circular-controller-container {
          padding: 15px 0;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Set up event listeners for touch and mouse interactions
   */
  setupEventListeners() {
    // Add event listeners to each quarter
    this.quarters.forEach(quarter => {
      // Mouse events
      quarter.addEventListener('mousedown', (e) => this.handlePressStart(e));
      quarter.addEventListener('mouseup', (e) => this.handlePressEnd(e));
      quarter.addEventListener('mouseleave', (e) => this.handlePressEnd(e));
      
      // Touch events
      quarter.addEventListener('touchstart', (e) => this.handlePressStart(e));
      quarter.addEventListener('touchend', (e) => this.handlePressEnd(e));
      quarter.addEventListener('touchcancel', (e) => this.handlePressEnd(e));
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
    
    const quarter = e.currentTarget;
    const direction = quarter.dataset.direction;
    
    if (quarter.classList.contains('disabled')) return;
    
    // Set press state
    this.isPressed = true;
    this.pressStartTime = Date.now();
    this.currentDirection = direction;
    this.isLongPressing = false;
    
    // Visual feedback
    quarter.classList.add('active');
    
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
    this.quarters.forEach(q => {
      q.classList.remove('active', 'long-pressing');
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
   */
  startLongPress() {
    if (!this.isPressed || this.isLongPressing) return;
    
    this.isLongPressing = true;
    this._isScrolling = true;
    
    // Add visual feedback
    const quarter = this.quarters.find(q => q.dataset.direction === this.currentDirection);
    if (quarter) {
      quarter.classList.remove('active');
      quarter.classList.add('long-pressing');
    }
    
    // Start continuous movement
    this.continuousMove();
  }
  
  /**
   * Continuous movement during long press with conservative acceleration
   */
  continuousMove() {
    if (!this.isLongPressing || !this.isPressed) return;
    
    const now = Date.now();
    const timeSinceStart = now - this.pressStartTime - this.options.tapThreshold;
    const timeSinceLastMove = now - this._lastMovementTime;
    
    // Calculate acceleration - conservative approach for testing
    let currentMovementRate = this.options.movementRate;
    if (timeSinceStart > this.options.accelerationStartTime) {
      const accelerationProgress = Math.min(
        (timeSinceStart - this.options.accelerationStartTime) / 3000, // 3 seconds to reach max
        1.0
      );
      const accelerationFactor = accelerationProgress * this.options.accelerationCap;
      
      currentMovementRate = this.options.movementRate * (1 - accelerationFactor) + 
                           this.options.maxSpeed * accelerationFactor;
    }
    
    // Calculate movement amount - no artificial cap, let buffer handle it
    if (timeSinceLastMove >= currentMovementRate) {
      const movementAmount = timeSinceLastMove / currentMovementRate;
      
      this.handleFractionalMove(this.currentDirection, movementAmount);
      this._lastMovementTime = now;
      this.currentSpeed = currentMovementRate;
      this.momentum = movementAmount; // Store momentum for easing
    }
    
    // Continue the loop
    this.animationFrameId = requestAnimationFrame(() => this.continuousMove());
  }
  
  /**
   * Stop long press movement with momentum easing
   */
  stopLongPress() {
    const wasLongPressing = this.isLongPressing;
    this.isLongPressing = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Apply momentum easing if we had momentum
    if (wasLongPressing && this.momentum > 0.1 && this.currentDirection) {
      this.applyMomentumEasing();
    } else {
      this._isScrolling = false;
      this._lastMovementTime = 0;
      this.momentum = 0;
    }
  }
  
  /**
   * Apply momentum easing after long press ends
   */
  applyMomentumEasing() {
    const easeStep = () => {
      if (this.momentum < 0.05) {
        // Momentum has decayed enough, stop
        this._isScrolling = false;
        this._lastMovementTime = 0;
        this.momentum = 0;
        return;
      }
      
      // Apply decaying movement
      this.handleFractionalMove(this.currentDirection, this.momentum * 0.3);
      
      // Decay momentum
      this.momentum *= this.options.momentumDecayRate;
      
      // Continue easing
      requestAnimationFrame(easeStep);
    };
    
    requestAnimationFrame(easeStep);
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
    }, this.options.animationDuration);
  }
  
  /**
   * Handle fractional movement (long press) - FIXED calculation
   */
  handleFractionalMove(direction, amount) {
    // Get current view offset
    const currentOffset = this.gridRenderer.viewOffset;
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? this.gridRenderer.options.gridWidthSmall : this.gridRenderer.options.gridWidth;
    const height = isMobile ? this.gridRenderer.options.gridHeightSmall : this.gridRenderer.options.gridHeight;
    
    // FIXED: Much smaller fractional movements
    const fractionalAmount = amount * 0.1; // Only move 10% of calculated amount
    
    // Calculate new offset
    let newOffsetX = currentOffset.x;
    let newOffsetY = currentOffset.y;
    
    switch (direction) {
      case 'up':
        newOffsetY = Math.max(0, currentOffset.y - fractionalAmount);
        break;
      case 'down':
        newOffsetY = Math.min(this.gridRenderer.fullGridSize - height, currentOffset.y + fractionalAmount);
        break;
      case 'left':
        newOffsetX = Math.max(0, currentOffset.x - fractionalAmount);
        break;
      case 'right':
        newOffsetX = Math.min(this.gridRenderer.fullGridSize - width, currentOffset.x + fractionalAmount);
        break;
    }
    
    // Only apply if there's actually a change
    if (Math.abs(newOffsetX - currentOffset.x) > 0.01 || Math.abs(newOffsetY - currentOffset.y) > 0.01) {
      // Apply fractional movement using CSS transform
      this.applyFractionalTransform(currentOffset.x, currentOffset.y, newOffsetX, newOffsetY);
      
      // Update internal offset tracking
      this.gridRenderer.viewOffset.x = newOffsetX;
      this.gridRenderer.viewOffset.y = newOffsetY;
    }
  }
  
  /**
   * Apply fractional transform to grid - FIXED
   */
  applyFractionalTransform(currentX, currentY, targetX, targetY) {
    const gridElement = this.gridRenderer.gridElement;
    if (!gridElement) return;
    
    // Calculate transform values based on the difference
    const cellSize = this.gridRenderer.options.cellSize;
    const gap = 2; // Gap between cells
    
    const fractionalOffsetX = (currentX - targetX) * (cellSize + gap);
    const fractionalOffsetY = (currentY - targetY) * (cellSize + gap);
    
    // Apply smooth transform - no transition for continuous movement
    gridElement.style.transition = 'none';
    gridElement.style.transform = `translate3d(${fractionalOffsetX}px, ${fractionalOffsetY}px, 0)`;
    
    // Store fractional offset
    this.currentFractionalOffset = { x: fractionalOffsetX, y: fractionalOffsetY };
  }
  
  /**
   * Flash visual feedback for direction
   */
  flashDirection(direction) {
    const quarter = this.quarters.find(q => q.dataset.direction === direction);
    if (!quarter) return;
    
    quarter.classList.add('active');
    
    setTimeout(() => {
      quarter.classList.remove('active');
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
    
    // Update quarter disabled states
    this.quarters.forEach(quarter => {
      const direction = quarter.dataset.direction;
      let canScroll = true;
      
      switch (direction) {
        case 'up': canScroll = canScrollUp; break;
        case 'right': canScroll = canScrollRight; break;
        case 'down': canScroll = canScrollDown; break;
        case 'left': canScroll = canScrollLeft; break;
      }
      
      quarter.classList.toggle('disabled', !canScroll);
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
    const container = document.getElementById('circular-controller-container');
    if (container) {
      container.style.display = show ? 'flex' : 'none';
    }
  }
}

// Export for module use and ensure global availability
window.ArrowButtons = ArrowButtons;
export default ArrowButtons;

/**
 * Arrow Buttons for Grid Game
 * Creates and manages the navigation buttons for scrolling the grid
 */

class ArrowButtons {
  constructor(gridRenderer, options = {}) {
    this.gridRenderer = gridRenderer;
    
    // Default options
    this.options = {
      container: options.container || 'game-container',
      buttonHeight: options.buttonHeight || 125,  // 2.5 * 50px cell size
      buttonDepth: options.buttonDepth || 37.5,   // 0.75 * 50px cell size
      ...options
    };
    
    // Create buttons
    this.createButtons();
    
    // Add event listeners
    this.setupEventListeners();
  }
  
  /**
   * Create the arrow buttons for navigation
   */
  createButtons() {
    // Get grid container for positioning
    const gridContainer = this.gridRenderer.container;
    if (!gridContainer) {
      throw new Error('Grid container not found');
    }
    
    // Create a wrapper div for arrow buttons that sits OUTSIDE the grid element
    // but overlays the grid using absolute positioning
    const arrowButtonsWrapper = document.createElement('div');
    arrowButtonsWrapper.className = 'arrow-buttons-wrapper';
    arrowButtonsWrapper.style.position = 'absolute';
    arrowButtonsWrapper.style.top = '0';
    arrowButtonsWrapper.style.left = '0';
    arrowButtonsWrapper.style.width = '100%';
    arrowButtonsWrapper.style.height = '100%';
    arrowButtonsWrapper.style.pointerEvents = 'none';
    arrowButtonsWrapper.style.zIndex = '20'; // Higher than grid cells
    
    // Store reference to wrapper
    this.arrowButtonsWrapper = arrowButtonsWrapper;
    
    // Create button container inside the wrapper
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'arrow-buttons-container';
    
    // Position container
    this.buttonContainer.style.position = 'relative';
    this.buttonContainer.style.width = '100%';
    this.buttonContainer.style.height = '100%';
    this.buttonContainer.style.pointerEvents = 'none';
    
    // Create buttons for each direction
    const directions = [
      { 
        dir: 'up', 
        html: '&#9650;', 
        position: { 
          top: '0', 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: `${this.options.buttonHeight}px`,
          height: `${this.options.buttonDepth}px`
        } 
      },
      { 
        dir: 'right', 
        html: '&#9654;', 
        position: { 
          top: '50%', 
          right: '0', 
          transform: 'translateY(-50%)',
          width: `${this.options.buttonDepth}px`,
          height: `${this.options.buttonHeight}px`
        } 
      },
      { 
        dir: 'down', 
        html: '&#9660;', 
        position: { 
          bottom: '0', 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: `${this.options.buttonHeight}px`,
          height: `${this.options.buttonDepth}px`
        } 
      },
      { 
        dir: 'left', 
        html: '&#9664;', 
        position: { 
          top: '50%', 
          left: '0', 
          transform: 'translateY(-50%)',
          width: `${this.options.buttonDepth}px`,
          height: `${this.options.buttonHeight}px`
        } 
      }
    ];
    
    this.buttons = {};
    
    directions.forEach(({ dir, html, position }) => {
      // Create button element
      const button = document.createElement('button');
      button.className = `metallic-button arrow-button arrow-${dir}`;
      button.innerHTML = html;
      button.setAttribute('aria-label', `Scroll ${dir}`);
      
      // Apply positioning
      button.style.position = 'absolute';
      button.style.pointerEvents = 'auto';
      
      // Apply size and positioning
      Object.entries(position).forEach(([prop, value]) => {
        button.style[prop] = value;
      });
      
      // Store reference
      this.buttons[dir] = button;
      
      // Add to container
      this.buttonContainer.appendChild(button);
    });
    
    // Add button container to wrapper
    arrowButtonsWrapper.appendChild(this.buttonContainer);
    
    // Clean up any existing button wrapper to prevent duplicates
    const existingWrapper = gridContainer.querySelector('.arrow-buttons-wrapper');
    if (existingWrapper) {
      existingWrapper.remove();
    }
    
    // Add wrapper directly to the grid container, NOT the grid element
    // This is crucial - we want it overlaying the grid but not inside it
    // so it doesn't get removed on grid re-renders
    this.gridRenderer.container.appendChild(arrowButtonsWrapper);
    
    // Position the wrapper to match the grid element's position
    this.updateButtonPosition();
    
    // Add resize handler to update button position when window size changes
    window.addEventListener('resize', () => this.updateButtonPosition());
  }
  
  /**
   * Update button position to match current grid element position
   */
  updateButtonPosition() {
    if (!this.gridRenderer.gridElement || !this.arrowButtonsWrapper) return;
    
    // Get the current position and dimensions of the grid element
    const gridRect = this.gridRenderer.gridElement.getBoundingClientRect();
    const containerRect = this.gridRenderer.container.getBoundingClientRect();
    
    // Calculate position relative to container
    const top = gridRect.top - containerRect.top;
    const left = gridRect.left - containerRect.left;
    
    // Update wrapper position and size to match grid element
    this.arrowButtonsWrapper.style.top = `${top}px`;
    this.arrowButtonsWrapper.style.left = `${left}px`;
    this.arrowButtonsWrapper.style.width = `${gridRect.width}px`;
    this.arrowButtonsWrapper.style.height = `${gridRect.height}px`;
  }
  
  /**
   * Setup event listeners for button clicks
   */
  setupEventListeners() {
    // Arrow button click events
    Object.entries(this.buttons).forEach(([direction, button]) => {
      button.addEventListener('click', () => {
        button.classList.add('clicked');
        
        // Scroll grid in the clicked direction
        this.gridRenderer.scroll(direction);
        
        // Update button position after scrolling
        this.updateButtonPosition();
        
        // Update button states after scrolling
        this.updateButtonStates();
        
        // Remove clicked class after animation
        setTimeout(() => {
          button.classList.remove('clicked');
        }, 200);
      });
    });
    
    // Keyboard navigation
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
        this.buttons[direction].click();
      }
    });
    
    // Initial button state update
    this.updateButtonStates();
  }
  
  /**
   * Update button states (enabled/disabled) based on grid scroll limits
   */
  updateButtonStates() {
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
    
    // Update button disabled states
    this.buttons.up.disabled = !canScrollUp;
    this.buttons.right.disabled = !canScrollRight;
    this.buttons.down.disabled = !canScrollDown;
    this.buttons.left.disabled = !canScrollLeft;
  }
  
  /**
   * Show or hide the arrow buttons
   * @param {boolean} show - Whether to show the buttons
   */
  setVisibility(show) {
    this.arrowButtonsWrapper.style.display = show ? 'block' : 'none';
  }
}

// Export class for use in other modules
export default ArrowButtons;

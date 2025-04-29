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
    
    // Create button container
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'arrow-buttons-container';
    
    // Position container directly over grid
    this.buttonContainer.style.position = 'absolute';
    this.buttonContainer.style.top = '0';
    this.buttonContainer.style.left = '0';
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
    
    // Add to grid container instead of game container
    gridContainer.style.position = 'relative';
    
    // Position button container relative to the grid element, not the container
    if (this.gridRenderer.gridElement) {
      this.gridRenderer.gridElement.appendChild(this.buttonContainer);
    } else {
      gridContainer.appendChild(this.buttonContainer);
    }
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
    this.buttonContainer.style.display = show ? 'block' : 'none';
  }
}

// Export class for use in other modules
export default ArrowButtons;

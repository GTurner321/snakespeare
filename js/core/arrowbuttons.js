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
      buttonSize: options.buttonSize || 50,
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
    const container = document.getElementById(this.options.container);
    if (!container) {
      throw new Error(`Container element with id '${this.options.container}' not found`);
    }
    
    // Create button container
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'arrow-buttons-container';
    
    // Position the container
    this.buttonContainer.style.position = 'relative';
    this.buttonContainer.style.width = '100%';
    this.buttonContainer.style.height = '100%';
    
    // Create buttons for each direction
    const directions = [
      { dir: 'up', html: '&#9650;', position: { top: '10px', left: '50%', transform: 'translateX(-50%)' } },
      { dir: 'right', html: '&#9654;', position: { top: '50%', right: '10px', transform: 'translateY(-50%)' } },
      { dir: 'down', html: '&#9660;', position: { bottom: '10px', left: '50%', transform: 'translateX(-50%)' } },
      { dir: 'left', html: '&#9664;', position: { top: '50%', left: '10px', transform: 'translateY(-50%)' } }
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
      Object.entries(position).forEach(([prop, value]) => {
        button.style[prop] = value;
      });
      
      // Store reference
      this.buttons[dir] = button;
      
      // Add to container
      this.buttonContainer.appendChild(button);
    });
    
    // Add button container to game container
    container.appendChild(this.buttonContainer);
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
    
    // Check each direction for possible scrolling
    const canScrollUp = this.gridRenderer.isScrollWithinLimits(offsetX, offsetY - 1) && offsetY > 0;
    const canScrollRight = this.gridRenderer.isScrollWithinLimits(offsetX + 1, offsetY) && 
                          offsetX + this.gridRenderer.options.gridWidth < this.gridRenderer.grid[0].length;
    const canScrollDown = this.gridRenderer.isScrollWithinLimits(offsetX, offsetY + 1) && 
                         offsetY + this.gridRenderer.options.gridHeight < this.gridRenderer.grid.length;
    const canScrollLeft = this.gridRenderer.isScrollWithinLimits(offsetX - 1, offsetY) && offsetX > 0;
    
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

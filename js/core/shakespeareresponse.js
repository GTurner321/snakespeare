/**
 * Shakespeare Response Component
 * Shows Shakespeare image and response in speech bubble when a phrase is completed
 */

class ShakespeareResponse {
  constructor(options = {}) {
    this.options = {
      containerId: options.containerId || 'game-container',
      imagePath: options.imagePath || 'snakespeare/assets/shakespeare.png',
      displayDuration: options.displayDuration || 10000, // 10 seconds
      fadeDuration: options.fadeDuration || 1000, // 1 second
      ...options
    };
    
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      console.error(`Container with ID '${this.options.containerId}' not found`);
      return;
    }
    
    // Create container for Shakespeare
    this.shakespeareContainer = document.createElement('div');
    this.shakespeareContainer.className = 'shakespeare-container';
    this.container.appendChild(this.shakespeareContainer);
    
    // Create container for the response speech bubble
    this.bubbleContainer = document.createElement('div');
    this.bubbleContainer.className = 'speech-bubble';
    this.shakespeareContainer.appendChild(this.bubbleContainer);
    
    // Create paragraph for the response text
    this.responseText = document.createElement('p');
    this.responseText.className = 'response-text';
    this.bubbleContainer.appendChild(this.responseText);
    
    // Create image element for Shakespeare
    this.shakespeareImage = document.createElement('img');
    this.shakespeareImage.className = 'shakespeare-image';
    this.shakespeareImage.src = this.options.imagePath;
    this.shakespeareImage.alt = 'Shakespeare';
    this.shakespeareContainer.appendChild(this.shakespeareImage);
    
    // Hide the Shakespeare container initially
    this.shakespeareContainer.style.display = 'none';
    
    // Add CSS styles
    this.addStyles();
    
    // Subscribe to the gridCompletionChanged event
    document.addEventListener('gridCompletionChanged', (e) => {
      const { completed, gridRenderer } = e.detail;
      if (completed) {
        this.showResponseIfAvailable();
      }
    });
    
    console.log('ShakespeareResponse component initialized');
  }
  
  /**
   * Add CSS styles for Shakespeare and speech bubble
   */
  addStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .shakespeare-container {
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 1000;
        opacity: 1;
        transition: opacity 1s ease;
      }
      
      .shakespeare-container.fade-out {
        opacity: 0;
      }
      
      .shakespeare-image {
        width: 150px;
        height: auto;
        filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.3));
      }
      
      .speech-bubble {
        position: relative;
        background: #fff;
        border-radius: 15px;
        padding: 15px;
        margin-bottom: 20px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        max-width: 250px;
        text-align: center;
      }
      
      .speech-bubble:after {
        content: '';
        position: absolute;
        bottom: -15px;
        right: 30px;
        border-width: 15px 15px 0;
        border-style: solid;
        border-color: #fff transparent;
        display: block;
        width: 0;
      }
      
      .response-text {
        margin: 0;
        font-family: 'Georgia', serif;
        font-size: 16px;
        line-height: 1.4;
        color: #333;
      }
      
      /* Mobile responsive adjustments */
      @media (max-width: 768px) {
        .shakespeare-container {
          right: 10px;
        }
        
        .shakespeare-image {
          width: 100px;
        }
        
        .speech-bubble {
          padding: 10px;
          max-width: 200px;
        }
        
        .response-text {
          font-size: 14px;
        }
      }
      
      /* Small screens */
      @media (max-width: 480px) {
        .shakespeare-container {
          right: 5px;
        }
        
        .shakespeare-image {
          width: 80px;
        }
        
        .speech-bubble {
          padding: 8px;
          max-width: 150px;
        }
        
        .response-text {
          font-size: 12px;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  /**
   * Show Shakespeare and the response bubble
   * @param {string} response - The response text to display
   */
  showResponse(response) {
    // Set the response text
    this.responseText.textContent = response;
    
    // Show the container
    this.shakespeareContainer.style.display = 'flex';
    this.shakespeareContainer.classList.remove('fade-out');
    
    // Set a timeout to hide after the specified duration
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      // Add fade-out class
      this.shakespeareContainer.classList.add('fade-out');
      
      // Hide completely after fade animation completes
      setTimeout(() => {
        this.shakespeareContainer.style.display = 'none';
      }, this.options.fadeDuration);
    }, this.options.displayDuration);
  }
  
  /**
   * Show response if available in the game controller
   */
  showResponseIfAvailable() {
    // Get the game controller instance (should be accessible from window)
    const gameController = window.gameController;
    if (!gameController || !gameController.currentPhrase) {
      console.error('Game controller or current phrase not found');
      return;
    }
    
    // Get the response from the current phrase
    const response = gameController.currentPhrase.response;
    if (response) {
      this.showResponse(response);
    } else {
      console.warn('No response found in current phrase');
    }
  }
}

// Export the class
export default ShakespeareResponse;

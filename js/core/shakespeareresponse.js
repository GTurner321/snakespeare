/**
 * Shakespeare Response Component - Improved Modal Version with Close Button
 * Shows Shakespeare image and response in speech bubble when a phrase is completed
 */

class ShakespeareResponse {
  constructor(options = {}) {
    this.options = {
      containerId: options.containerId || 'game-container',
      imagePath: options.imagePath || 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/shakespeare.png',
      displayDuration: options.displayDuration || 10000, // 10 seconds
      fadeDuration: options.fadeDuration || 1000, // 1 second
      ...options
    };
    
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      console.error(`Container with ID '${this.options.containerId}' not found`);
      return;
    }
    
    // Create modal overlay
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'shakespeare-modal-overlay';
    document.body.appendChild(this.modalOverlay);
    
    // Create container for Shakespeare
    this.shakespeareContainer = document.createElement('div');
    this.shakespeareContainer.className = 'shakespeare-container';
    this.modalOverlay.appendChild(this.shakespeareContainer);
    
    // Create container for the response speech bubble
    this.bubbleContainer = document.createElement('div');
    this.bubbleContainer.className = 'speech-bubble';
    this.shakespeareContainer.appendChild(this.bubbleContainer);
    
    // Create close button (X) in top right of speech bubble
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'speech-bubble-close';
    this.closeButton.innerHTML = '&times;'; // × symbol
    this.closeButton.setAttribute('aria-label', 'Close');
    this.closeButton.title = 'Close';
    this.bubbleContainer.appendChild(this.closeButton);
    
    // Add event listener to close button
    this.closeButton.addEventListener('click', () => this.hideResponse());
    
    // Create paragraph for the response text
    this.responseText = document.createElement('p');
    this.responseText.className = 'response-text';
    this.bubbleContainer.appendChild(this.responseText);
    
    // Create image element for Shakespeare
    this.shakespeareImage = document.createElement('img');
    this.shakespeareImage.className = 'shakespeare-image';
    this.shakespeareImage.src = this.options.imagePath;
    this.shakespeareImage.alt = 'Shakespeare';
    // Add error handling for image loading
    this.shakespeareImage.onerror = () => {
      console.error(`Failed to load Shakespeare image from: ${this.options.imagePath}`);
      this.shakespeareImage.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="10" y="50" font-family="Arial" font-size="12">Image not found</text></svg>';
    };
    this.shakespeareImage.onload = () => {
      console.log('Shakespeare image loaded successfully');
    };
    this.shakespeareContainer.appendChild(this.shakespeareImage);
    
    // Hide the modal overlay initially
    this.modalOverlay.style.display = 'none';
    
    // Add CSS styles
    this.addStyles();
    
    // Subscribe to the gridCompletionChanged event
    document.addEventListener('gridCompletionChanged', (e) => {
      const { completed, gridRenderer } = e.detail;
      if (completed) {
        this.showResponseIfAvailable();
      }
    });
    
    console.log('ShakespeareResponse component initialized with image path:', this.options.imagePath);
  }
  
  /**
   * Add CSS styles for Shakespeare and speech bubble
   */
  addStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .shakespeare-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        opacity: 1;
        transition: opacity 1s ease;
      }
      
      .shakespeare-modal-overlay.fade-out {
        opacity: 0;
      }
      
      .shakespeare-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: 90%;
        margin: 0 auto;
      }
      
      .shakespeare-image {
        width: 200px;
        height: auto;
        filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.3));
        margin-top: 20px;
      }
      
      .speech-bubble {
        position: relative;
        background: #fff;
        border-radius: 20px;
        padding: 25px;
        margin-bottom: 30px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 100%;
        text-align: center;
      }
      
      .speech-bubble:after {
        content: '';
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 20px 20px 0;
        border-style: solid;
        border-color: #fff transparent;
        display: block;
        width: 0;
      }
      
      .speech-bubble-close {
        position: absolute;
        top: 8px;
        right: 12px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: #f44336;
        color: white;
        border: none;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease-in-out;
        z-index: 10;
      }
      
      .speech-bubble-close:hover {
        background-color: #d32f2f;
        transform: scale(1.1);
      }
      
      .speech-bubble-close:active {
        transform: scale(0.95);
      }
      
      .speech-bubble-close:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.3);
      }
      
      .response-text {
        margin: 0;
        font-family: 'Georgia', serif;
        font-size: 24px;
        line-height: 1.5;
        color: #333;
      }
      
      /* Mobile responsive adjustments */
      @media (max-width: 768px) {
        .shakespeare-image {
          width: 150px;
        }
        
        .speech-bubble {
          padding: 20px;
          max-width: 400px;
        }
        
        .response-text {
          font-size: 20px;
        }
        
        .speech-bubble-close {
          width: 26px;
          height: 26px;
          font-size: 18px;
        }
      }
      
      /* Small screens */
      @media (max-width: 480px) {
        .shakespeare-image {
          width: 120px;
        }
        
        .speech-bubble {
          padding: 15px;
          max-width: 300px;
        }
        
        .response-text {
          font-size: 18px;
        }
        
        .speech-bubble-close {
          width: 24px;
          height: 24px;
          font-size: 16px;
          top: 6px;
          right: 10px;
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
    
    // Show the modal overlay
    this.modalOverlay.style.display = 'flex';
    this.modalOverlay.classList.remove('fade-out');
    
    // Set a timeout to hide after the specified duration
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      this.hideResponse();
    }, this.options.displayDuration);
    
    // Log that we're showing the response
    console.log('Showing Shakespeare response:', response);
  }
  
  /**
   * Hide the response modal with fade animation
   */
  hideResponse() {
    // Add fade-out class
    this.modalOverlay.classList.add('fade-out');
    
    // Hide completely after fade animation completes
    setTimeout(() => {
      this.modalOverlay.style.display = 'none';
    }, this.options.fadeDuration);
    
    // Clear any existing timeout
    clearTimeout(this.hideTimeout);
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

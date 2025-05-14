/**
 * Shakespeare Response Component - Improved Version with Info Box
 * Shows Shakespeare image and response in speech bubble when a phrase is completed
 * Also displays information from the 'combined' column in a separate info box
 */

class ShakespeareResponse {
  constructor(options = {}) {
    this.options = {
      containerId: options.containerId || 'game-container',
      imagePath: options.imagePath || 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/shakespeare.png',
      fadeDuration: options.fadeDuration || 1000, // 1 second fade duration (kept for animations)
      ...options
    };
    
    // Note: displayDuration option removed since we don't want auto-closing behavior
    
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
    
    // NEW: Create the information box
    this.infoBoxContainer = document.createElement('div');
    this.infoBoxContainer.className = 'info-box-container';
    document.body.appendChild(this.infoBoxContainer);
    
    this.infoBox = document.createElement('div');
    this.infoBox.className = 'info-box';
    this.infoBoxContainer.appendChild(this.infoBox);
    
    // Create close button for info box
    this.infoBoxCloseButton = document.createElement('button');
    this.infoBoxCloseButton.className = 'info-box-close';
    this.infoBoxCloseButton.innerHTML = '&times;'; // × symbol
    this.infoBoxCloseButton.setAttribute('aria-label', 'Close Info');
    this.infoBoxCloseButton.title = 'Close Info';
    this.infoBox.appendChild(this.infoBoxCloseButton);
    
    // Add event listener to info box close button
    this.infoBoxCloseButton.addEventListener('click', () => this.hideInfoBox());
    
    // Create paragraph for the info text
    this.infoText = document.createElement('p');
    this.infoText.className = 'info-text';
    this.infoBox.appendChild(this.infoText);
    
    // Hide the modal overlay and info box initially
    this.modalOverlay.style.display = 'none';
    this.infoBoxContainer.style.display = 'none';
    
    // Add CSS styles
    this.addStyles();
    
    // Subscribe to the gridCompletionChanged event
    document.addEventListener('gridCompletionChanged', (e) => {
      const { completed, isCorrect, gridRenderer } = e.detail;
      if (completed && isCorrect) {
        this.showResponseIfAvailable();
      }
    });
    
    console.log('ShakespeareResponse component initialized with image path:', this.options.imagePath);
  }
  
  /**
   * Add CSS styles for Shakespeare, speech bubble, and info box
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
      
      .speech-bubble-close,
      .info-box-close {
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
      
      .speech-bubble-close:hover,
      .info-box-close:hover {
        background-color: #d32f2f;
        transform: scale(1.1);
      }
      
      .speech-bubble-close:active,
      .info-box-close:active {
        transform: scale(0.95);
      }
      
      .speech-bubble-close:focus,
      .info-box-close:focus {
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
      
      /* Info Box Styles */
      .info-box-container {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: center;
        z-index: 1900;
        padding: 20px;
        opacity: 1;
        transition: opacity 1s ease, transform 0.5s ease;
      }
      
      .info-box-container.fade-out {
        opacity: 0;
        transform: translateY(100%);
      }
      
      .info-box {
        position: relative;
        background: #f5f5dc;
        border: 2px solid #8b4513;
        border-radius: 10px;
        padding: 20px 25px;
        box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.2);
        max-width: 700px;
        width: 100%;
        text-align: center;
      }
      
      .info-text {
        margin: 0;
        font-family: 'Georgia', serif;
        font-size: 20px;
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
        
        .info-box {
          padding: 15px 20px;
          max-width: 95%;
        }
        
        .info-text {
          font-size: 18px;
        }
        
        .speech-bubble-close,
        .info-box-close {
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
        
        .info-box {
          padding: 12px 15px;
        }
        
        .info-text {
          font-size: 16px;
        }
        
        .speech-bubble-close,
        .info-box-close {
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
    
    // Removed auto-hide timeout
    // The response will stay visible until manually closed
    
    // Log that we're showing the response
    console.log('Showing Shakespeare response:', response);
  }
  
  /**
   * Show information box
   * @param {string} info - The info text to display
   */
  showInfoBox(info) {
    // Set the info text
    this.infoText.textContent = info;
    
    // Show the info box
    this.infoBoxContainer.style.display = 'flex';
    this.infoBoxContainer.classList.remove('fade-out');
    
    // Removed auto-hide timeout
    // The info box will stay visible until manually closed
    
    // Log that we're showing the info
    console.log('Showing info box:', info);
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
  }
  
  /**
   * Hide the info box with fade animation
   */
  hideInfoBox() {
    // Add fade-out class
    this.infoBoxContainer.classList.add('fade-out');
    
    // Hide completely after fade animation completes
    setTimeout(() => {
      this.infoBoxContainer.style.display = 'none';
    }, this.options.fadeDuration);
  }
  
  /**
   * Show response and info if available in the game controller
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
    
    // Get the combined info from the current phrase
    const combinedInfo = gameController.currentPhrase.combined;
    if (combinedInfo) {
      // Add a slight delay to the info box appearance for better UX
      setTimeout(() => {
        this.showInfoBox(combinedInfo);
      }, 500);
    } else {
      console.warn('No combined info found in current phrase');
    }
  }
}

// Export the class
export default ShakespeareResponse;

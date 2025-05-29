/**
 * Enhanced Shakespeare Response Component with Interactive Quiz
 * Shows Shakespeare image, response, interactive question, and feedback
 */

class ShakespeareResponse {
  constructor(options = {}) {
    this.options = {
      containerId: options.containerId || 'game-container',
      imagePath: options.imagePath || 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/shakespeare.png',
      fadeDuration: options.fadeDuration || 1000,
      questionDelay: options.questionDelay || 4000, // 4 seconds before question appears
      ...options
    };
    
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      console.error(`Container with ID '${this.options.containerId}' not found`);
      return;
    }
    
    // Track current phrase data for author checking
    this.currentPhrase = null;
    
    // Create modal overlay for Shakespeare response
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
    
    // Create paragraph for the response text
    this.responseText = document.createElement('p');
    this.responseText.className = 'response-text';
    this.bubbleContainer.appendChild(this.responseText);
    
    // Create question container (initially hidden)
    this.questionContainer = document.createElement('div');
    this.questionContainer.className = 'question-container';
    this.questionContainer.style.opacity = '0';
    this.questionContainer.style.transition = 'opacity 1s ease-in-out';
    this.bubbleContainer.appendChild(this.questionContainer);
    
    // Create question text
    this.questionText = document.createElement('p');
    this.questionText.className = 'question-text';
    this.questionText.textContent = '... but did I write this?';
    this.questionContainer.appendChild(this.questionText);
    
    // Create button container
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'button-container';
    this.questionContainer.appendChild(this.buttonContainer);
    
    // Create YES button
    this.yesButton = document.createElement('button');
    this.yesButton.className = 'choice-button yes-button';
    this.yesButton.textContent = 'YES';
    this.yesButton.addEventListener('click', () => this.handleAnswer(true));
    this.buttonContainer.appendChild(this.yesButton);
    
    // Create NO button
    this.noButton = document.createElement('button');
    this.noButton.className = 'choice-button no-button';
    this.noButton.textContent = 'NO';
    this.noButton.addEventListener('click', () => this.handleAnswer(false));
    this.buttonContainer.appendChild(this.noButton);
    
    // Create image element for Shakespeare
    this.shakespeareImage = document.createElement('img');
    this.shakespeareImage.className = 'shakespeare-image';
    this.shakespeareImage.src = this.options.imagePath;
    this.shakespeareImage.alt = 'Shakespeare';
    this.shakespeareImage.onerror = () => {
      console.error(`Failed to load Shakespeare image from: ${this.options.imagePath}`);
      this.shakespeareImage.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="10" y="50" font-family="Arial" font-size="12">Image not found</text></svg>';
    };
    this.shakespeareContainer.appendChild(this.shakespeareImage);
    
    // Create the feedback/info box container
    this.infoBoxContainer = document.createElement('div');
    this.infoBoxContainer.className = 'info-box-container';
    document.body.appendChild(this.infoBoxContainer);
    
    this.infoBox = document.createElement('div');
    this.infoBox.className = 'info-box';
    this.infoBoxContainer.appendChild(this.infoBox);
    
    // Create close button for info box (keep the X for this one)
    this.infoBoxCloseButton = document.createElement('button');
    this.infoBoxCloseButton.className = 'info-box-close';
    this.infoBoxCloseButton.innerHTML = '&times;';
    this.infoBoxCloseButton.setAttribute('aria-label', 'Close Info');
    this.infoBoxCloseButton.title = 'Close Info';
    this.infoBox.appendChild(this.infoBoxCloseButton);
    
    this.infoBoxCloseButton.addEventListener('click', () => this.hideInfoBox());
    
    // Create feedback message container
    this.feedbackMessage = document.createElement('p');
    this.feedbackMessage.className = 'feedback-message';
    this.infoBox.appendChild(this.feedbackMessage);
    
    // Create paragraph for the combined info text
    this.infoText = document.createElement('p');
    this.infoText.className = 'info-text';
    this.infoBox.appendChild(this.infoText);
    
    // Hide containers initially
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
    
    console.log('Enhanced ShakespeareResponse component initialized');
  }
  
  /**
   * Add CSS styles for all components
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
      
      .response-text {
        margin: 0 0 20px 0;
        font-family: 'Georgia', serif;
        font-size: 24px;
        line-height: 1.5;
        color: #333;
      }
      
      .question-container {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 2px solid #ddd;
      }
      
      .question-text {
        margin: 0 0 20px 0;
        font-family: 'Georgia', serif;
        font-size: 20px;
        font-style: italic;
        color: #555;
        line-height: 1.4;
      }
      
      .button-container {
        display: flex;
        gap: 20px;
        justify-content: center;
        margin-top: 15px;
      }
      
      .choice-button {
        padding: 12px 30px;
        border: none;
        border-radius: 25px;
        font-family: 'Georgia', serif;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        min-width: 80px;
      }
      
      .yes-button {
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
      }
      
      .yes-button:hover {
        background: linear-gradient(135deg, #45a049, #3d8b40);
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      }
      
      .no-button {
        background: linear-gradient(135deg, #f44336, #da190b);
        color: white;
      }
      
      .no-button:hover {
        background: linear-gradient(135deg, #da190b, #c62828);
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      }
      
      .choice-button:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
      
      .info-box-close:hover {
        background-color: #d32f2f;
        transform: scale(1.1);
      }
      
      .info-box-close:active {
        transform: scale(0.95);
      }
      
      .feedback-message {
        margin: 0 0 15px 0;
        font-family: 'Georgia', serif;
        font-size: 22px;
        font-weight: bold;
        line-height: 1.4;
        padding: 10px;
        border-radius: 8px;
      }
      
      .feedback-message.correct {
        color: #2e7d32;
        background-color: #e8f5e8;
        border: 2px solid #4caf50;
      }
      
      .feedback-message.incorrect {
        color: #c62828;
        background-color: #fde7e7;
        border: 2px solid #f44336;
      }
      
      .info-text {
        margin: 0;
        font-family: 'Georgia', serif;
        font-size: 18px;
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
        
        .question-text {
          font-size: 18px;
        }
        
        .choice-button {
          padding: 10px 20px;
          font-size: 16px;
          min-width: 70px;
        }
        
        .button-container {
          gap: 15px;
        }
        
        .info-box {
          padding: 15px 20px;
          max-width: 95%;
        }
        
        .feedback-message {
          font-size: 20px;
        }
        
        .info-text {
          font-size: 16px;
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
        
        .question-text {
          font-size: 16px;
        }
        
        .choice-button {
          padding: 8px 16px;
          font-size: 14px;
          min-width: 60px;
        }
        
        .button-container {
          gap: 12px;
          flex-direction: column;
          align-items: center;
        }
        
        .choice-button {
          width: 120px;
        }
        
        .info-box {
          padding: 12px 15px;
        }
        
        .feedback-message {
          font-size: 18px;
        }
        
        .info-text {
          font-size: 14px;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  /**
   * Show Shakespeare response and start the question sequence
   */
  showResponse(response) {
    this.responseText.textContent = response;
    this.modalOverlay.style.display = 'flex';
    this.modalOverlay.classList.remove('fade-out');
    
    // Reset question visibility
    this.questionContainer.style.opacity = '0';
    
    // Show question after delay
    setTimeout(() => {
      this.questionContainer.style.opacity = '1';
    }, this.options.questionDelay);
    
    console.log('Showing Shakespeare response with delayed question');
  }
  
  /**
   * Handle user's answer to the Shakespeare question
   */
  handleAnswer(userAnsweredYes) {
    console.log(`User answered: ${userAnsweredYes ? 'YES' : 'NO'}`);
    
    // Get current phrase data from game controller
    const gameController = window.gameController;
    if (!gameController || !gameController.currentPhrase) {
      console.error('Game controller or current phrase not found');
      return;
    }
    
    this.currentPhrase = gameController.currentPhrase;
    
    // Determine if the answer is correct
    const isShakespeare = this.isFromShakespeare();
    const isCorrect = (userAnsweredYes && isShakespeare) || (!userAnsweredYes && !isShakespeare);
    
    console.log(`Shakespeare: ${isShakespeare}, User said yes: ${userAnsweredYes}, Correct: ${isCorrect}`);
    
    // Hide the response modal
    this.hideResponse();
    
    // Show the feedback after a brief delay
    setTimeout(() => {
      this.showFeedback(isCorrect);
    }, 500);
  }
  
  /**
   * Check if current phrase is from Shakespeare based on author column
   */
  isFromShakespeare() {
    if (!this.currentPhrase || !this.currentPhrase.author) {
      console.warn('No author information available');
      return false;
    }
    
    const author = this.currentPhrase.author.trim().toLowerCase();
    const isShakespeare = author === 'william shakespeare';
    
    console.log(`Author: "${this.currentPhrase.author}", Is Shakespeare: ${isShakespeare}`);
    return isShakespeare;
  }
  
  /**
   * Show feedback message with combined info
   */
  showFeedback(isCorrect) {
    // Set feedback message
    if (isCorrect) {
      this.feedbackMessage.textContent = 'Indeed, you are correct!';
      this.feedbackMessage.className = 'feedback-message correct';
    } else {
      this.feedbackMessage.textContent = 'Alas, you have chosen poorly.';
      this.feedbackMessage.className = 'feedback-message incorrect';
    }
    
    // Get combined info from current phrase
    const combinedInfo = this.currentPhrase.combined || 'No additional information available.';
    this.infoText.textContent = combinedInfo;
    
    // Show the info box
    this.infoBoxContainer.style.display = 'flex';
    this.infoBoxContainer.classList.remove('fade-out');
    
    console.log(`Showing ${isCorrect ? 'correct' : 'incorrect'} feedback`);
  }
  
  /**
   * Hide the response modal
   */
  hideResponse() {
    this.modalOverlay.classList.add('fade-out');
    setTimeout(() => {
      this.modalOverlay.style.display = 'none';
    }, this.options.fadeDuration);
  }
  
  /**
   * Hide the info box
   */
  hideInfoBox() {
    this.infoBoxContainer.classList.add('fade-out');
    setTimeout(() => {
      this.infoBoxContainer.style.display = 'none';
    }, this.options.fadeDuration);
  }
  
  /**
   * Show response and start the interactive sequence if available
   */
  showResponseIfAvailable() {
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

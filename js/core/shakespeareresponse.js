/**
 * Enhanced Shakespeare Response Component with Welcome Modal
 * Shows Shakespeare image, response, interactive question, feedback, and welcome modal
 */

class ShakespeareResponse {
  constructor(options = {}) {
    this.options = {
      containerId: options.containerId || 'game-container',
      imagePath: options.imagePath || 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/shakespeare.png',
      fadeDuration: options.fadeDuration || 2000,
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
    this.questionText.textContent = this.getRandomQuestionPhrase();
    this.questionContainer.appendChild(this.questionText);
    
    // Create button container
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'button-container';
    this.questionContainer.appendChild(this.buttonContainer);
    
    // Create YES button
    this.yesButton = document.createElement('button');
    this.yesButton.className = 'choice-button yes-button';
    this.yesButton.textContent = 'YEA';
    this.yesButton.addEventListener('click', () => this.handleAnswer(true));
    this.buttonContainer.appendChild(this.yesButton);
    
    // Create NO button
    this.noButton = document.createElement('button');
    this.noButton.className = 'choice-button no-button';
    this.noButton.textContent = 'NAY';
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
    
    // NEW: Create welcome modal components
    this.createWelcomeModal();
    
    // Add CSS styles
    this.addStyles();
    
    // Subscribe to the gridCompletionChanged event
    document.addEventListener('gridCompletionChanged', (e) => {
      const { completed, isCorrect, gridRenderer } = e.detail;
      if (completed && isCorrect) {
        this.showResponseIfAvailable();
      }
    });
    
    console.log('Enhanced ShakespeareResponse component initialized with welcome modal');
  }

  /**
   * NEW: Create welcome modal components
   */
  createWelcomeModal() {
    // Create welcome modal overlay
    this.welcomeOverlay = document.createElement('div');
    this.welcomeOverlay.className = 'shakespeare-modal-overlay welcome-modal-overlay';
    document.body.appendChild(this.welcomeOverlay);
    
    // Create container for Shakespeare in welcome modal
    this.welcomeContainer = document.createElement('div');
    this.welcomeContainer.className = 'shakespeare-container welcome-shakespeare-container';
    this.welcomeOverlay.appendChild(this.welcomeContainer);
    
    // Create larger speech bubble for welcome content
    this.welcomeBubble = document.createElement('div');
    this.welcomeBubble.className = 'speech-bubble welcome-speech-bubble';
    this.welcomeContainer.appendChild(this.welcomeBubble);
    
    // Create title container for SNAKESPEARE
    this.createGameTitle();
    
    // Create instructions container
    this.createInstructions();
    
    // Create Shakespeare image for welcome modal (positioned lower)
    this.welcomeShakespeareImage = document.createElement('img');
    this.welcomeShakespeareImage.className = 'shakespeare-image welcome-shakespeare-image';
    this.welcomeShakespeareImage.src = this.options.imagePath;
    this.welcomeShakespeareImage.alt = 'Shakespeare';
    this.welcomeShakespeareImage.onerror = () => {
      console.error(`Failed to load Shakespeare image from: ${this.options.imagePath}`);
      this.welcomeShakespeareImage.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="10" y="50" font-family="Arial" font-size="12">Image not found</text></svg>';
    };
    this.welcomeContainer.appendChild(this.welcomeShakespeareImage);
    
    // Hide welcome modal initially
    this.welcomeOverlay.style.display = 'none';
  }

  /**
   * NEW: Create game title using cell-style elements
   */
  createGameTitle() {
    this.titleContainer = document.createElement('div');
    this.titleContainer.className = 'game-title-container';
    this.welcomeBubble.appendChild(this.titleContainer);
    
    const title = 'SNAKESPEARE';
    const titleGrid = document.createElement('div');
    titleGrid.className = 'title-grid';
    
    // Create individual cells for each letter
    for (let i = 0; i < title.length; i++) {
      const letter = title[i];
      const cellElement = document.createElement('div');
      cellElement.className = 'title-cell';
      
      // Add snake icon to the first 'S'
      if (i === 0) {
        const snakeIcon = document.createElement('i');
        snakeIcon.className = 'fa-solid fa-staff-snake title-snake-icon';
        cellElement.appendChild(snakeIcon);
      }
      
      // Add letter
      const letterSpan = document.createElement('span');
      letterSpan.textContent = letter;
      letterSpan.className = 'title-letter';
      cellElement.appendChild(letterSpan);
      
      titleGrid.appendChild(cellElement);
    }
    
    this.titleContainer.appendChild(titleGrid);
  }

  /**
   * NEW: Create instructions section
   */
  createInstructions() {
    this.instructionsContainer = document.createElement('div');
    this.instructionsContainer.className = 'instructions-container';
    this.welcomeBubble.appendChild(this.instructionsContainer);
    
    const instructions = [
      "Begin thy quest where the emerald square doth lie, and seek a hidden phrase 'mongst neighboring tiles.",
      "Unveil the phrase ere the surging sea o'ertake the isle.",      
      "Shouldst thou falter, find counsel within the menu."
      ];
    
    const instructionsList = document.createElement('ul');
    instructionsList.className = 'instructions-list';
    
    instructions.forEach(instruction => {
      const listItem = document.createElement('li');
      listItem.textContent = instruction;
      listItem.className = 'instruction-item';
      instructionsList.appendChild(listItem);
    });
    
    this.instructionsContainer.appendChild(instructionsList);
    
    // Create ENTER button
    this.createEnterButton();
    
    // Create farewell message (initially hidden)
    this.createFarewellMessage();
  }

  /**
   * NEW: Create ENTER button
   */
  createEnterButton() {
    this.enterButtonContainer = document.createElement('div');
    this.enterButtonContainer.className = 'enter-button-container';
    this.instructionsContainer.appendChild(this.enterButtonContainer);
    
    this.enterButton = document.createElement('button');
    this.enterButton.className = 'choice-button yes-button enter-button';
    this.enterButton.textContent = 'ENTER';
    this.enterButton.addEventListener('click', () => this.handleEnterClick());
    this.enterButtonContainer.appendChild(this.enterButton);
  }

  /**
   * NEW: Create farewell message
   */
  createFarewellMessage() {
    this.farewellContainer = document.createElement('div');
    this.farewellContainer.className = 'farewell-container';
    this.farewellContainer.style.opacity = '0';
    this.farewellContainer.style.transition = 'opacity 0.5s ease-in-out';
    this.instructionsContainer.appendChild(this.farewellContainer);
    
    this.farewellMessage = document.createElement('p');
    this.farewellMessage.className = 'farewell-message';
    this.farewellMessage.textContent = 'Come, let us assay the measure of thy wit!';
    this.farewellContainer.appendChild(this.farewellMessage);
  }

  /**
   * NEW: Handle ENTER button click
   */
  handleEnterClick() {
    console.log('ENTER button clicked - starting welcome sequence');
    
    // Fade out the button
    this.enterButtonContainer.style.opacity = '0';
    this.enterButtonContainer.style.transition = 'opacity 0.5s ease-in-out';
    
    // After button fades out, show farewell message
    setTimeout(() => {
      this.enterButtonContainer.style.display = 'none';
      this.farewellContainer.style.opacity = '1';
      
      // After 2.5 seconds, hide the entire welcome modal
      setTimeout(() => {
        this.hideWelcomeModal();
      }, 2500);
    }, 500);
  }

  /**
   * NEW: Show welcome modal
   */
  showWelcomeModal() {
    console.log('Showing welcome modal');
    this.welcomeOverlay.style.display = 'flex';
    this.welcomeOverlay.classList.remove('fade-out');
    
    // Reset state for potential re-showing
    this.enterButtonContainer.style.display = 'block';
    this.enterButtonContainer.style.opacity = '1';
    this.farewellContainer.style.opacity = '0';
  }

  /**
   * NEW: Hide welcome modal
   */
  hideWelcomeModal() {
    console.log('Hiding welcome modal');
    this.welcomeOverlay.classList.add('fade-out');
    
    setTimeout(() => {
      this.welcomeOverlay.style.display = 'none';
      console.log('Welcome modal hidden, game ready to start');
      
      // Dispatch event that welcome is complete
      document.dispatchEvent(new CustomEvent('welcomeModalComplete'));
    }, this.options.fadeDuration);
  }

  /**
   * Get random question phrase for Shakespeare quiz
   */
  getRandomQuestionPhrase() {
    const phrases = [
      "Yet dost thou reckon these words sprang from my quill?",
      "Still! Did I, in sooth, give breath to this utterance?",
      "Howbeit, from mine own hand, came this verse—or not?",
      "Dost thou believe these words were writ by mine own hand?",
      "Perchance, came this speech from mine ink, or another's?",
      "Wouldst thou claim this verse as mine own crafting?",
      "Say then, thinkest thou I did father this phrase?"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Get random correct response phrase
   */
  getRandomCorrectPhrase() {
    const phrases = [
      "Thou hast spoken true!",
      "Aye, thy wit hath struck the mark!",
      "Rightly thou hast judged!",
      "Thy wisdom doth shine—'tis correct!",
      "Well said! Thy judgment serveth thee well.",
      "Thou hast nailed it with great precision!",
      "By my troth, thou art most astute!",
      "Verily, thy mind doth shine bright."
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Get random incorrect response phrase
   */
  getRandomIncorrectPhrase() {
    const phrases = [
      "Alack, thy guess falleth wide of the mark.",
      "Forsooth, thy wit hath failed thee this time.",
      "Misfortune! Thy choice was ill made.",
      "O, a misstep! That path leadeth not to truth.",
      "Fie! Thou art deceived, for this choice rings false.",
      "Woe! That was a false scent thou didst follow.",
      "Fortune frowns—thy pick was in error.",
      "Nay, that be not the truth thou seek'st.",
      "That choice leadeth thee astray, dear player.",
      "O, misfortune! Thou art mistaken.",
      "Alas, thy answer strays from wisdom's path."
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
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
   * Show feedback message with combined info - FIXED VERSION
   */
  showFeedback(isCorrect) {
    if (isCorrect) {
      this.feedbackMessage.textContent = this.getRandomCorrectPhrase();
      this.feedbackMessage.className = 'feedback-message correct';
    } else {
      this.feedbackMessage.textContent = this.getRandomIncorrectPhrase();
      this.feedbackMessage.className = 'feedback-message incorrect';
    }
    
    const combinedInfo = this.currentPhrase.combined || 'No additional information available.';
    this.infoText.textContent = combinedInfo;
    
    // DON'T hide the modal overlay - just hide the speech bubble
    this.bubbleContainer.style.opacity = '0';
    
    this.infoBoxContainer.style.display = 'flex';
    this.infoBoxContainer.classList.remove('fade-out');
    
    console.log(`Showing ${isCorrect ? 'correct' : 'incorrect'} feedback`);
  }

  /**
   * Hide the info box - FIXED VERSION
   */
  hideInfoBox() {
    this.infoBoxContainer.classList.add('fade-out');
    setTimeout(() => {
      this.infoBoxContainer.style.display = 'none';
      // NOW hide the entire modal overlay including Shakespeare
      this.modalOverlay.style.display = 'none';
      this.modalOverlay.classList.add('fade-out');
      // Reset speech bubble opacity for next time
      this.bubbleContainer.style.opacity = '1';
      console.log('Info box hidden, interaction complete');
    }, this.options.fadeDuration);
  }

  /**
   * Hide the response speech bubble but keep Shakespeare visible - FIXED VERSION
   */
  hideResponse() {
    // Only hide the speech bubble, not the entire modal
    this.bubbleContainer.style.opacity = '0';
    console.log('Shakespeare speech bubble hidden, image remains visible');
  }
  
  /**
   * Add CSS styles - simplified since styles are now in grid.css
   */
  addStyles() {
    // Styles are now in the grid.css file under section 10
    // This method is kept for any dynamic style additions if needed in the future
    console.log('Shakespeare component styles loaded from grid.css');
  }
}

// Export the class
export default ShakespeareResponse;

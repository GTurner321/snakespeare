/**
 * Word Checker Module for Grid Game
 * Provides word-by-word completion checking and visual feedback
 */

class WordChecker {
  /**
   * Constructor for WordChecker
   * @param {GameController} gameController - Reference to the game controller
   */
  constructor(gameController) {
    this.gameController = gameController;
    this.enabled = true; // Toggle for enabling/disabling word feedback
    this.completedWords = new Set(); // Track which words have been completed
    this.wordBoundaries = []; // Store the start/end indices of words in the phrase
    this.currentPhraseHTML = ''; // Store the current phrase HTML with styling
    
    // Make it globally accessible for debugging
    window.wordChecker = this;
    
    // Set up initialization after a short delay
    setTimeout(() => this.initialize(), 500);
  }
  
  /**
   * Initialize the word checker
   */
  initialize() {
    // Parse word boundaries for the current phrase
    this.parseWordBoundaries();
    
    // Hook into the game controller's handleSelectionChange method
    this.setupSelectionChangeHook();
    
    console.log('WordChecker initialized');
  }
  
  /**
   * Sets up a hook into the game controller's handleSelectionChange method
   */
  setupSelectionChangeHook() {
    if (!this.gameController || !this.gameController.handleSelectionChange) {
      console.error('GameController or handleSelectionChange not available');
      return;
    }
    
    // Store original method
    const originalHandleSelectionChange = this.gameController.handleSelectionChange;
    
    // Replace with our hooked version
    this.gameController.handleSelectionChange = () => {
      // Call original method
      originalHandleSelectionChange.call(this.gameController);
      
      // Then check for word completion
      if (this.enabled) {
        this.checkForCompletedWords();
      }
    };
    
    console.log('Selection change hook established');
  }
  
  /**
   * Sets up a hook into the game controller's updatePhraseWithHints method
   */
  setupPhraseUpdateHook() {
    if (!this.gameController || !this.gameController.updatePhraseWithHints) {
      console.error('GameController or updatePhraseWithHints not available');
      return;
    }
    
    // Store original method
    const originalUpdatePhraseWithHints = this.gameController.updatePhraseWithHints;
    
    // Replace with our hooked version
    this.gameController.updatePhraseWithHints = function() {
      // Call original method
      originalUpdatePhraseWithHints.call(this);
      
      // Apply light grey to all characters that aren't completed
      const displayElement = document.getElementById('phrase-text');
      if (displayElement) {
        const phraseCharSpans = displayElement.querySelectorAll('.phrase-char');
        phraseCharSpans.forEach(span => {
          if (!span.classList.contains('completed-word-char')) {
            span.style.color = '#999999'; // Light grey for incomplete words
          }
        });
      }
      
      // Store current HTML for later updates
      const wordChecker = window.wordChecker;
      if (wordChecker && displayElement) {
        wordChecker.currentPhraseHTML = displayElement.innerHTML;
      }
    };
    
    console.log('Phrase update hook established');
  }
  
  /**
   * Sets up a hook into the game controller's loadPhrase method
   */
  setupLoadPhraseHook() {
    if (!this.gameController || !this.gameController.loadPhrase) {
      console.error('GameController or loadPhrase not available');
      return;
    }
    
    // Store original method
    const originalLoadPhrase = this.gameController.loadPhrase;
    
    // Replace with our hooked version
    this.gameController.loadPhrase = async function(phraseData) {
      // Call original method with await since it's async
      await originalLoadPhrase.call(this, phraseData);
      
      // Reset word checker state for new phrase
      const wordChecker = window.wordChecker;
      if (wordChecker) {
        wordChecker.parseWordBoundaries();
        wordChecker.completedWords = new Set();
      }
    };
    
    console.log('Load phrase hook established');
  }
  
  /**
   * Parses the phrase to identify word boundaries
   */
  parseWordBoundaries() {
    if (!this.gameController.currentPhrase || !this.gameController.currentPhrase.letterlist) return;
    
    const letterList = this.gameController.currentPhrase.letterlist;
    this.wordBoundaries = [];
    
    let currentWordStart = null;
    let inWord = false;
    
    // Parse through the letterlist character by character
    for (let i = 0; i < letterList.length; i++) {
      const char = letterList[i];
      const isAlphaNumeric = /[a-zA-Z0-9]/.test(char);
      
      if (isAlphaNumeric && !inWord) {
        // Start of a new word
        currentWordStart = i;
        inWord = true;
      } else if (!isAlphaNumeric && inWord) {
        // End of a word
        this.wordBoundaries.push({
          start: currentWordStart,
          end: i - 1,
          word: letterList.substring(currentWordStart, i)
        });
        inWord = false;
      }
    }
    
    // Handle case where phrase ends with a word
    if (inWord) {
      this.wordBoundaries.push({
        start: currentWordStart,
        end: letterList.length - 1,
        word: letterList.substring(currentWordStart)
      });
    }
    
    console.log('Word boundaries parsed:', this.wordBoundaries);
    
    // Reset completed words tracker
    this.completedWords = new Set();
  }
  
  /**
   * Checks if a specific word in the phrase is correctly filled
   * @param {number} wordIndex - Index of the word to check
   * @return {boolean} True if the word is completed correctly
   */
  isWordCompleted(wordIndex) {
    if (!this.enabled || wordIndex < 0 || wordIndex >= this.wordBoundaries.length) return false;
    
    // If word is already marked as completed, return true
    if (this.completedWords.has(wordIndex)) return true;
    
    const wordBoundary = this.wordBoundaries[wordIndex];
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) return false;
    
    const currentPhraseText = displayElement.textContent;
    
    // Extract the current word from the display
    const currentWord = currentPhraseText.substring(wordBoundary.start, wordBoundary.end + 1);
    
    // Extract the expected word from the original phrase
    const expectedWord = this.gameController.currentPhrase.letterlist.substring(
      wordBoundary.start, wordBoundary.end + 1
    );
    
    // Check if the current word matches the expected word (no underscores)
    const isComplete = currentWord.indexOf('_') === -1;
    const isCorrect = currentWord.toUpperCase() === expectedWord.toUpperCase();
    
    return isComplete && isCorrect;
  }
  
  /**
   * Checks for newly completed words and handles visual feedback
   */
  checkForCompletedWords() {
    if (!this.enabled) return;
    
    // If no word boundaries parsed yet, do it now
    if (this.wordBoundaries.length === 0) {
      this.parseWordBoundaries();
    }
    
    // Get display element
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) return;
    
    // Check each word to see if it's newly completed
    for (let i = 0; i < this.wordBoundaries.length; i++) {
      // Skip already completed words
      if (this.completedWords.has(i)) continue;
      
      // Check if this word is now complete
      if (this.isWordCompleted(i)) {
        // Mark word as completed
        this.completedWords.add(i);
        
        // Flash the cells for this word
        this.flashCompletedWord(i);
        
        // Update the text color for this word
        this.updateWordTextColor(i);
      }
    }
  }
  
  /**
   * Handles flashing the snake cells for a completed word
   * @param {number} wordIndex - Index of the completed word
   */
  flashCompletedWord(wordIndex) {
    if (!this.enabled) return;
    
    // Get the selected cells that make up the word
    const selectedCells = this.gameController.gridRenderer.selectedCells;
    const wordBoundary = this.wordBoundaries[wordIndex];
    
    // If no boundary found or no cells selected, return
    if (!wordBoundary || selectedCells.length === 0) return;
    
    // We need to determine which selected cells correspond to the completed word
    // Start by getting the word length (excluding spaces and punctuation)
    const expectedWordLength = wordBoundary.word.length;
    
    // Get the most recent cells that could form this word
    const recentCells = [...selectedCells].slice(-expectedWordLength);
    
    console.log(`Flashing ${recentCells.length} cells for completed word: ${wordBoundary.word}`);
    
    // Flash those cells
    for (const cell of recentCells) {
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      if (cellElement) {
        // Add special class for flashing darker green
        cellElement.classList.add('word-completed-flash');
        
        // Remove the class after the flash (500ms)
        setTimeout(() => {
          cellElement.classList.remove('word-completed-flash');
        }, 500);
      }
    }
  }
  
  /**
   * Updates the text color for a completed word in the phrase display
   * @param {number} wordIndex - Index of the completed word
   */
  updateWordTextColor(wordIndex) {
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) return;
    
    // Get the word boundary
    const wordBoundary = this.wordBoundaries[wordIndex];
    if (!wordBoundary) return;
    
    // Create a DOM parser to manipulate the HTML
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(displayElement.innerHTML, 'text/html');
    const spans = htmlDoc.querySelectorAll('.phrase-char');
    
    // Process spans within the word boundaries
    for (let j = wordBoundary.start; j <= wordBoundary.end; j++) {
      if (j < spans.length) {
        const span = spans[j];
        span.style.color = 'black';
        span.style.fontWeight = 'bold';
        span.classList.add('completed-word-char');
      }
    }
    
    // Update the display with the modified HTML
    displayElement.innerHTML = htmlDoc.body.innerHTML;
    
    // Store the updated HTML for future reference
    this.currentPhraseHTML = displayElement.innerHTML;
  }
  
  /**
   * Toggles the word completion feedback feature
   * @param {boolean|null} enable - True to enable, false to disable, null to toggle
   * @return {boolean} Current enabled state
   */
  toggle(enable = null) {
    // If enable is provided, set to that value; otherwise toggle current value
    this.enabled = (enable !== null) ? enable : !this.enabled;
    
    console.log(`Word completion feedback ${this.enabled ? 'enabled' : 'disabled'}`);
    
    // If disabling, reset any visual changes
    if (!this.enabled) {
      // Reset phrase display to all light grey
      const displayElement = document.getElementById('phrase-text');
      if (displayElement) {
        const phraseCharSpans = displayElement.querySelectorAll('.phrase-char');
        phraseCharSpans.forEach(span => {
          span.style.color = '#999999'; // Light grey for all characters
          span.style.fontWeight = 'normal';
          span.classList.remove('completed-word-char');
        });
      }
      
      // Clear completed words tracking
      this.completedWords = new Set();
    } else {
      // If enabling, recheck all words
      for (let i = 0; i < this.wordBoundaries.length; i++) {
        if (this.isWordCompleted(i)) {
          this.completedWords.add(i);
          this.updateWordTextColor(i);
        }
      }
    }
    
    return this.enabled;
  }
}

// Export the class for use in other modules
export default WordChecker;

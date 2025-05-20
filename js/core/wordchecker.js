// Modified WordChecker.js with improved debugging and fixes

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
    this.debugMode = true; // Enable extra console logging
    
    // Make it globally accessible for debugging
    window.wordChecker = this;
    
    // Log initialization
    console.log('WordChecker constructor called with gameController:', !!gameController);
    
    // Add debugging button to page for testing
    this.addDebugButton();
    
    // Set up initialization after a short delay
    setTimeout(() => this.initialize(), 1000); // Increased delay
  }
  
  /**
   * Add a debug button to the page for easy testing
   */
  addDebugButton() {
    if (!this.debugMode) return;
    
    // Create button container
    const btnContainer = document.createElement('div');
    btnContainer.style.position = 'fixed';
    btnContainer.style.bottom = '10px';
    btnContainer.style.right = '10px';
    btnContainer.style.zIndex = '9999';
    
    // Create button
    const debugBtn = document.createElement('button');
    debugBtn.innerText = 'Debug WordChecker';
    debugBtn.style.padding = '5px 10px';
    debugBtn.style.backgroundColor = '#f44336';
    debugBtn.style.color = 'white';
    debugBtn.style.border = 'none';
    debugBtn.style.borderRadius = '4px';
    debugBtn.style.cursor = 'pointer';
    
    // Add click event
    debugBtn.addEventListener('click', () => {
      this.runDiagnostics();
    });
    
    // Add to page
    btnContainer.appendChild(debugBtn);
    document.body.appendChild(btnContainer);
  }
  
  /**
   * Run diagnostics for debugging
   */
  runDiagnostics() {
    console.group('WordChecker Diagnostics');
    console.log('Enabled:', this.enabled);
    console.log('Completed words:', [...this.completedWords]);
    console.log('Word boundaries:', this.wordBoundaries);
    console.log('Current phrase:', this.gameController.currentPhrase?.letterlist);
    console.log('Phrase template:', this.gameController.phraseTemplate);
    
    // Check phrase display
    const displayElement = document.getElementById('phrase-text');
    console.log('Phrase display element:', !!displayElement);
    if (displayElement) {
      console.log('Current display text:', displayElement.textContent);
      console.log('Current display HTML:', displayElement.innerHTML);
    }
    
    // Check selected cells
    const selectedCells = this.gameController.gridRenderer?.selectedCells || [];
    console.log('Selected cells:', selectedCells.length);
    
    // Force CSS check
    this.checkCSSApplication();
    
    // Try forcing word check
    if (this.wordBoundaries.length > 0) {
      for (let i = 0; i < this.wordBoundaries.length; i++) {
        const isCompleted = this.isWordCompleted(i);
        console.log(`Word ${i} "${this.wordBoundaries[i].word}": completed = ${isCompleted}`);
        
        if (isCompleted && !this.completedWords.has(i)) {
          console.log(`Force completing word ${i}`);
          this.completedWords.add(i);
          this.updateWordTextColor(i);
          this.flashCompletedWord(i);
        }
      }
    } else {
      console.log('No word boundaries parsed yet');
      this.parseWordBoundaries();
    }
    
    console.groupEnd();
  }
  
  /**
   * Check if CSS is properly applied
   */
  checkCSSApplication() {
    // Check if our styles exist
    const styleElements = document.querySelectorAll('style');
    let foundStyles = false;
    
    styleElements.forEach(style => {
      if (style.textContent.includes('word-completed-flash')) {
        foundStyles = true;
      }
    });
    
    console.log('Found WordChecker CSS styles:', foundStyles);
    
    // If not found, inject them
    if (!foundStyles) {
      this.injectCriticalCSS();
    }
  }
  
  /**
   * Inject critical CSS if not found
   */
  injectCriticalCSS() {
    const style = document.createElement('style');
    style.id = 'wordchecker-critical-css';
    style.textContent = `
      /* Animation for word completion flash effect */
      @keyframes word-completed-flash {
        0% { background-color: var(--maingreen); }
        50% { background-color: #3b9c68; /* Darker green */ }
        100% { background-color: var(--maingreen); }
      }
      
      /* Class applied to cells when a word is completed */
      .word-completed-flash {
        animation: word-completed-flash 0.5s ease-in-out;
      }
      
      /* Style for completed word characters in phrase display */
      .completed-word-char {
        color: black !important;
        font-weight: bold !important;
      }
      
      /* Initial style for all phrase characters */
      #phrase-text .phrase-char:not(.completed-word-char) {
        color: #999999 !important; /* Light grey */
      }
    `;
    
    document.head.appendChild(style);
    console.log('Injected critical CSS');
  }
  
  /**
   * Initialize the word checker
   */
  initialize() {
    console.log('WordChecker.initialize() called');
    
    // Ensure we have gameController
    if (!this.gameController) {
      console.error('No gameController available');
      return;
    }
    
    // Check if we have access to required methods
    if (!this.gameController.handleSelectionChange) {
      console.error('gameController.handleSelectionChange not available');
    }
    
    if (!this.gameController.updatePhraseWithHints) {
      console.error('gameController.updatePhraseWithHints not available');
    }
    
    if (!this.gameController.loadPhrase) {
      console.error('gameController.loadPhrase not available');
    }
    
    // Parse word boundaries for the current phrase
    this.parseWordBoundaries();
    
    // Setup hooks
    this.setupSelectionChangeHook();
    this.setupPhraseUpdateHook();
    this.setupLoadPhraseHook();
    
    // Initial text color setup
    setTimeout(() => {
      this.initialTextSetup();
    }, 1000);
    
    console.log('WordChecker initialization complete');
  }
  
  /**
   * Initial text setup to ensure all text starts grey
   */
  initialTextSetup() {
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) {
      console.error('Cannot find phrase-text element');
      return;
    }
    
    // Inject CSS directly if not already present
    this.injectCriticalCSS();
    
    // Set all characters to light grey initially
    const phraseCharSpans = displayElement.querySelectorAll('.phrase-char');
    if (phraseCharSpans.length === 0) {
      console.warn('No phrase character spans found');
    }
    
    phraseCharSpans.forEach(span => {
      // Store original color if not already grey
      if (span.style.color !== '#999999') {
        span.dataset.originalColor = span.style.color || '';
      }
      
      // Set to grey
      span.style.color = '#999999';
    });
    
    console.log(`Set ${phraseCharSpans.length} character spans to grey`);
    
    // Check any completed words immediately
    this.checkForCompletedWords();
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
      // Call original method first
      originalHandleSelectionChange.call(this.gameController);
      
      // Then check for word completion
      if (this.enabled) {
        // Add a small delay to allow the phrase to update first
        setTimeout(() => {
          this.checkForCompletedWords();
        }, 50);
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
      // Call original method first
      originalUpdatePhraseWithHints.call(this);
      
      // Get WordChecker instance
      const wordChecker = window.wordChecker;
      if (!wordChecker) return;
      
      // Get display element
      const displayElement = document.getElementById('phrase-text');
      if (!displayElement) return;
      
      // First store the current HTML
      wordChecker.currentPhraseHTML = displayElement.innerHTML;
      
      // Apply light grey to all non-completed characters
      const phraseCharSpans = displayElement.querySelectorAll('.phrase-char');
      phraseCharSpans.forEach(span => {
        if (!span.classList.contains('completed-word-char')) {
          span.style.color = '#999999';
        }
      });
      
      // Re-apply black to completed words
      if (wordChecker.completedWords.size > 0) {
        [...wordChecker.completedWords].forEach(wordIndex => {
          wordChecker.updateWordTextColor(wordIndex);
        });
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
      
      // Get WordChecker instance
      const wordChecker = window.wordChecker;
      if (!wordChecker) return;
      
      // Reset word checker state for new phrase
      wordChecker.parseWordBoundaries();
      wordChecker.completedWords = new Set();
      
      // Log phrase data
      if (wordChecker.debugMode) {
        console.log('New phrase loaded:', phraseData);
        console.log('Letter list:', phraseData.letterlist);
        console.log('Word boundaries:', wordChecker.wordBoundaries);
      }
      
      // Initial text color setup after a delay
      setTimeout(() => {
        wordChecker.initialTextSetup();
      }, 1000);
    };
    
    console.log('Load phrase hook established');
  }
  
  /**
   * Parses the phrase to identify word boundaries
   */
  parseWordBoundaries() {
    if (!this.gameController.currentPhrase || !this.gameController.currentPhrase.letterlist) {
      console.warn('No current phrase available for parsing word boundaries');
      return;
    }
    
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
    if (!this.enabled || wordIndex < 0 || wordIndex >= this.wordBoundaries.length) {
      return false;
    }
    
    // If word is already marked as completed, return true
    if (this.completedWords.has(wordIndex)) {
      return true;
    }
    
    // Get the word boundary
    const wordBoundary = this.wordBoundaries[wordIndex];
    if (!wordBoundary) {
      console.error(`No word boundary found for index ${wordIndex}`);
      return false;
    }
    
    // Get the display element
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) {
      console.error('No phrase-text element found');
      return false;
    }
    
    // Get the current text content
    const currentPhraseText = displayElement.textContent;
    if (!currentPhraseText) {
      console.error('Empty phrase text content');
      return false;
    }
    
    // Ensure the word boundaries are within the text range
    if (wordBoundary.start >= currentPhraseText.length || wordBoundary.end >= currentPhraseText.length) {
      console.error(`Word boundary (${wordBoundary.start}-${wordBoundary.end}) outside text range (0-${currentPhraseText.length - 1})`);
      return false;
    }
    
    // Extract the current word from the display
    const currentWord = currentPhraseText.substring(wordBoundary.start, wordBoundary.end + 1);
    
    // Extract the expected word from the original phrase
    const expectedWord = this.gameController.currentPhrase.letterlist.substring(
      wordBoundary.start, wordBoundary.end + 1
    );
    
    // Check if the current word matches the expected word (no underscores)
    const isComplete = currentWord.indexOf('_') === -1;
    const isCorrect = currentWord.toUpperCase() === expectedWord.toUpperCase();
    
    if (this.debugMode) {
      console.log(`Word check - Index: ${wordIndex}, Word: "${wordBoundary.word}"`);
      console.log(`Current: "${currentWord}", Expected: "${expectedWord}"`);
      console.log(`Complete: ${isComplete}, Correct: ${isCorrect}`);
    }
    
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
      if (this.wordBoundaries.length === 0) {
        console.warn('Failed to parse word boundaries');
        return;
      }
    }
    
    // Get display element
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) {
      console.error('No phrase-text element found');
      return;
    }
    
    // Check each word to see if it's newly completed
    let anyNewCompletions = false;
    
    for (let i = 0; i < this.wordBoundaries.length; i++) {
      // Skip already completed words
      if (this.completedWords.has(i)) continue;
      
      // Check if this word is now complete
      if (this.isWordCompleted(i)) {
        // Mark word as completed
        this.completedWords.add(i);
        anyNewCompletions = true;
        
        console.log(`Word completed: "${this.wordBoundaries[i].word}"`);
        
        // Flash the cells for this word
        this.flashCompletedWord(i);
        
        // Update the text color for this word
        this.updateWordTextColor(i);
      }
    }
    
    if (anyNewCompletions) {
      console.log('Words completed:', [...this.completedWords]);
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
    if (!wordBoundary || selectedCells.length === 0) {
      console.error(`Cannot flash - No boundary found for word ${wordIndex} or no selected cells`);
      return;
    }
    
    // We need to determine which selected cells correspond to the completed word
    // Start by getting the word length (excluding spaces and punctuation)
    const expectedWordLength = wordBoundary.word.length;
    
    // Get the most recent cells that could form this word
    // Ensure we don't exceed the number of selected cells
    const cellsToUse = Math.min(expectedWordLength, selectedCells.length);
    const recentCells = [...selectedCells].slice(-cellsToUse);
    
    console.log(`Flashing ${recentCells.length} cells for word "${wordBoundary.word}"`);
    
    // Flash those cells
    for (const cell of recentCells) {
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      if (cellElement) {
        // Remove any existing animation class first to reset animation
        cellElement.classList.remove('word-completed-flash');
        
        // Force a reflow to restart animation
        void cellElement.offsetWidth;
        
        // Add special class for flashing darker green
        cellElement.classList.add('word-completed-flash');
        
        // Remove the class after the flash (600ms)
        setTimeout(() => {
          cellElement.classList.remove('word-completed-flash');
        }, 600);
      } else {
        console.warn(`Cell element not found for coordinates ${cell.x},${cell.y}`);
      }
    }
  }
  
  /**
   * Updates the text color for a completed word in the phrase display
   * @param {number} wordIndex - Index of the completed word
   */
  updateWordTextColor(wordIndex) {
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) {
      console.error('No phrase-text element found');
      return;
    }
    
    // Get the word boundary
    const wordBoundary = this.wordBoundaries[wordIndex];
    if (!wordBoundary) {
      console.error(`No word boundary found for index ${wordIndex}`);
      return;
    }
    
    console.log(`Updating text color for word "${wordBoundary.word}"`);
    
    // Get all character spans
    const spans = displayElement.querySelectorAll('.phrase-char');
    
    // Process spans within the word boundaries
    let updatedCount = 0;
    
    for (let j = wordBoundary.start; j <= wordBoundary.end; j++) {
      if (j < spans.length) {
        const span = spans[j];
        span.style.color = 'black';
        span.style.fontWeight = 'bold';
        span.classList.add('completed-word-char');
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} character spans to black`);
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

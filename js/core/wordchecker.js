// SIMPLIFIED VERSION OF WORDCHECKER.JS
// Focus on reliable loading and initialization

/**
 * Word Checker Module for Grid Game
 * Provides word-by-word completion checking and visual feedback
 */

class WordChecker {
  constructor(gameController) {
    console.log("WordChecker constructor called");
    this.gameController = gameController;
    this.enabled = true;
    this.completedWords = new Set();
    this.wordBoundaries = [];
    
    // Make it globally accessible
    window.wordChecker = this;
    
    // Add required CSS immediately
    this.injectCSS();
    
    // Initialize with delay to ensure GameController is fully loaded
    setTimeout(() => {
      console.log("WordChecker delayed initialization");
      this.initialize();
    }, 1500);
  }
  
  /**
   * Inject required CSS
   */
  injectCSS() {
    if (document.getElementById('wordchecker-css')) return;
    
    console.log("Injecting WordChecker CSS");
    const style = document.createElement('style');
    style.id = 'wordchecker-css';
    style.textContent = `
      /* Animation for word completion flash effect */
      @keyframes word-completed-flash {
        0% { background-color: var(--maingreen); }
        50% { background-color: #3b9c68; /* Darker green */ }
        100% { background-color: var(--maingreen); }
      }
      
      /* Class applied to cells when a word is completed */
      .word-completed-flash {
        animation: word-completed-flash 0.5s ease-in-out !important;
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
  }
  
  /**
   * Initialize and add debug button
   */
  initialize() {
    if (!this.gameController) {
      console.error("WordChecker: No gameController found");
      return;
    }
    
    console.log("WordChecker initializing with gameController:", !!this.gameController);
    
    // Add a debug button
    this.addDebugButton();
    
    // Parse initial word boundaries
    this.parseWordBoundaries();
    
    // Set up hooks
    this.setupHooks();
    
    console.log("WordChecker initialization complete");
  }
  
  /**
   * Add a simple debug button
   */
  addDebugButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Debug WordChecker';
    btn.style.position = 'fixed';
    btn.style.bottom = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '9999';
    btn.style.padding = '8px 12px';
    btn.style.backgroundColor = '#f44336';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    
    btn.addEventListener('click', () => {
      console.log("Debug button clicked");
      this.debug();
    });
    
    document.body.appendChild(btn);
    console.log("Debug button added");
  }
  
  /**
   * Set up all necessary hooks in one method
   */
  setupHooks() {
    if (!this.gameController) return;
    
    console.log("Setting up WordChecker hooks");
    
    // 1. Hook into handleSelectionChange
    if (this.gameController.handleSelectionChange) {
      const original = this.gameController.handleSelectionChange;
      this.gameController.handleSelectionChange = function() {
        original.apply(this, arguments);
        
        // Check for completed words after selection
        if (window.wordChecker) {
          setTimeout(() => window.wordChecker.checkForCompletedWords(), 100);
        }
      };
      console.log("Selection change hook established");
    } else {
      console.error("handleSelectionChange method not found");
    }
    
    // 2. Hook into updatePhraseWithHints
    if (this.gameController.updatePhraseWithHints) {
      const original = this.gameController.updatePhraseWithHints;
      this.gameController.updatePhraseWithHints = function() {
        original.apply(this, arguments);
        
        // Apply grey color to phrase text
        const displayEl = document.getElementById('phrase-text');
        if (displayEl) {
          const phraseChars = displayEl.querySelectorAll('.phrase-char');
          phraseChars.forEach(span => {
            if (!span.classList.contains('completed-word-char')) {
              span.style.color = '#999999';
            }
          });
        }
        
        // Reapply completed word styling
        if (window.wordChecker) {
          window.wordChecker.reapplyCompletedWordStyling();
        }
      };
      console.log("Phrase update hook established");
    } else {
      console.error("updatePhraseWithHints method not found");
    }
    
    // 3. Hook into loadPhrase
    if (this.gameController.loadPhrase) {
      const original = this.gameController.loadPhrase;
      this.gameController.loadPhrase = async function() {
        const result = await original.apply(this, arguments);
        
        // Reset word checker for new phrase
        if (window.wordChecker) {
          setTimeout(() => {
            window.wordChecker.parseWordBoundaries();
            window.wordChecker.completedWords = new Set();
          }, 500);
        }
        
        return result;
      };
      console.log("Load phrase hook established");
    } else {
      console.error("loadPhrase method not found");
    }
  }
  
  /**
   * Parse word boundaries from the current phrase
   */
  parseWordBoundaries() {
    if (!this.gameController || !this.gameController.currentPhrase) {
      console.error("Cannot parse word boundaries - no current phrase");
      return;
    }
    
    const letterList = this.gameController.currentPhrase.letterlist;
    if (!letterList) {
      console.error("Cannot parse word boundaries - no letterlist");
      return;
    }
    
    console.log("Parsing word boundaries from:", letterList);
    
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
    
    console.log("Parsed word boundaries:", this.wordBoundaries);
  }
  
  /**
   * Check for completed words
   */
  checkForCompletedWords() {
    if (!this.enabled || !this.gameController) return;
    
    if (this.wordBoundaries.length === 0) {
      this.parseWordBoundaries();
      if (this.wordBoundaries.length === 0) return;
    }
    
    console.log("Checking for completed words");
    
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) return;
    
    const currentText = displayElement.textContent;
    
    // Check each word
    for (let i = 0; i < this.wordBoundaries.length; i++) {
      // Skip already completed words
      if (this.completedWords.has(i)) continue;
      
      const wordBoundary = this.wordBoundaries[i];
      
      // Extract word from current display
      const currentWord = currentText.substring(wordBoundary.start, wordBoundary.end + 1);
      
      // Extract expected word from phrase
      const expectedWord = this.gameController.currentPhrase.letterlist.substring(
        wordBoundary.start, wordBoundary.end + 1
      );
      
      // Check if word is complete and correct
      const isComplete = !currentWord.includes('_');
      const isCorrect = currentWord.toUpperCase() === expectedWord.toUpperCase();
      
      console.log(`Word ${i} "${wordBoundary.word}": complete=${isComplete}, correct=${isCorrect}`);
      
      if (isComplete && isCorrect) {
        console.log(`Word "${wordBoundary.word}" completed!`);
        this.completedWords.add(i);
        this.flashCompletedWord(i);
        this.updateWordTextColor(i);
      }
    }
  }
  
  /**
   * Reapply styling to all completed words
   */
  reapplyCompletedWordStyling() {
    if (this.completedWords.size === 0) return;
    
    console.log("Reapplying styling to completed words");
    
    for (const wordIndex of this.completedWords) {
      this.updateWordTextColor(wordIndex);
    }
  }
  
  /**
   * Flash cells for completed word
   */
  flashCompletedWord(wordIndex) {
    if (!this.enabled) return;
    
    const wordBoundary = this.wordBoundaries[wordIndex];
    if (!wordBoundary) return;
    
    console.log(`Flashing cells for word "${wordBoundary.word}"`);
    
    // Get selected cells
    const selectedCells = this.gameController.gridRenderer.selectedCells;
    if (!selectedCells || selectedCells.length === 0) return;
    
    // Get word length
    const wordLength = wordBoundary.word.length;
    
    // Use most recently selected cells
    const cellsToFlash = Math.min(wordLength, selectedCells.length);
    const recentCells = [...selectedCells].slice(-cellsToFlash);
    
    console.log(`Flashing ${recentCells.length} cells`);
    
    // Flash each cell
    recentCells.forEach(cell => {
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      if (cellElement) {
        // Remove existing class and force reflow
        cellElement.classList.remove('word-completed-flash');
        void cellElement.offsetWidth;
        
        // Add animation class
        cellElement.classList.add('word-completed-flash');
        
        // Remove class after animation
        setTimeout(() => cellElement.classList.remove('word-completed-flash'), 600);
      }
    });
  }
  
  /**
   * Update text color for completed word
   */
  updateWordTextColor(wordIndex) {
    const wordBoundary = this.wordBoundaries[wordIndex];
    if (!wordBoundary) return;
    
    console.log(`Updating text color for word "${wordBoundary.word}"`);
    
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) return;
    
    // Get all spans
    const spans = displayElement.querySelectorAll('.phrase-char');
    if (spans.length === 0) return;
    
    // Update spans for this word
    for (let i = wordBoundary.start; i <= wordBoundary.end; i++) {
      if (i < spans.length) {
        spans[i].style.color = 'black';
        spans[i].style.fontWeight = 'bold';
        spans[i].classList.add('completed-word-char');
      }
    }
  }
  
  /**
   * Debug method to help diagnose issues
   */
  debug() {
    console.group("WordChecker Debug");
    
    // 1. Check if WordChecker is properly loaded
    console.log("WordChecker loaded:", !!window.wordChecker);
    
    // 2. Check game controller
    console.log("GameController reference:", !!this.gameController);
    
    if (this.gameController) {
      // 3. Check current phrase
      console.log("Current phrase:", this.gameController.currentPhrase?.letterlist);
      
      // 4. Check word boundaries
      console.log("Word boundaries:", this.wordBoundaries);
      
      // 5. Check phrase display
      const displayEl = document.getElementById('phrase-text');
      console.log("Phrase display element:", !!displayEl);
      if (displayEl) {
        console.log("Current display text:", displayEl.textContent);
      }
      
      // 6. Check selected cells
      console.log("Selected cells:", this.gameController.gridRenderer?.selectedCells?.length || 0);
      
      // 7. Try to force parse word boundaries
      this.parseWordBoundaries();
      
      // 8. Try to force check for completed words
      this.checkForCompletedWords();
      
      // 9. Check CSS
      const style = document.getElementById('wordchecker-css');
      console.log("CSS injected:", !!style);
      if (!style) {
        console.log("Re-injecting CSS");
        this.injectCSS();
      }
      
      // 10. Force grey color on all phrase chars
      if (displayEl) {
        const spans = displayEl.querySelectorAll('.phrase-char');
        spans.forEach(span => {
          if (!span.classList.contains('completed-word-char')) {
            span.style.color = '#999999';
          }
        });
        console.log(`Set ${spans.length} spans to grey`);
      }
    }
    
    console.groupEnd();
  }
}

// Export the class
export default WordChecker;

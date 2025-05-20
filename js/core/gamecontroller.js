/**
 * Game Controller for Grid Game
 * Coordinates pathGenerator, gridRenderer, and scroll areas
 * Handles CSV data loading and game state management
 * Updated to use adjacent-cell random letter filling
 */

import PathGenerator from './pathgenerator.js';
import GridRenderer from './gridrenderer.js';
import ArrowButtons from './arrowbuttons.js';

// Note: We're using PapaParse loaded from CDN in index.html

class GameController {
  /**
 * Modified constructor for GameController
 * Adds initialization of erosion controller
 */
/**
 * Modified constructor for GameController
 * Adds initialization of word completion functionality
 */
constructor(options = {}) {
  // Default options with proper structure for gridSize
  this.options = {
    gameContainerId: options.gameContainerId || 'game-container',
    gridContainerId: options.gridContainerId || 'grid-container',
    gridSize: { 
      mobile: { width: 9, height: 9 },
      desktop: { width: 13, height: 9 }
    },
    cellSize: options.cellSize || 50,
    randomFillPercentage: options.randomFillPercentage !== undefined ? options.randomFillPercentage : 0,
    initialErosionPercentage: options.initialErosionPercentage !== undefined ? options.initialErosionPercentage : 0.15, // Add initial erosion percentage with default 15%
  };
  
  // Override default gridSize if provided with correct structure
  if (options.gridSize) {
    if (options.gridSize.mobile) {
      if (typeof options.gridSize.mobile.width === 'number' && 
          typeof options.gridSize.mobile.height === 'number') {
        this.options.gridSize.mobile = options.gridSize.mobile;
      } 
      else if (typeof options.gridSize.mobile === 'number') {
        console.warn('Deprecated: gridSize.mobile should be an object with width/height properties');
        this.options.gridSize.mobile = { 
          width: options.gridSize.mobile, 
          height: options.gridSize.mobile 
        };
      }
    }
    
    if (options.gridSize.desktop) {
      if (typeof options.gridSize.desktop.width === 'number' && 
          typeof options.gridSize.desktop.height === 'number') {
        this.options.gridSize.desktop = options.gridSize.desktop;
      } 
      else if (typeof options.gridSize.desktop === 'number') {
        console.warn('Deprecated: gridSize.desktop should be an object with width/height properties');
        this.options.gridSize.desktop = { 
          width: options.gridSize.desktop, 
          height: 9 // Default height
        };
      }
    }
  }
  
  // Log the final configuration to help with debugging
  console.log('GameController initialized with options:', this.options);
  
  // Game state
  this.currentPhrase = null;
  this.currentPath = null;
  this.phrases = [];
  this.phraseTemplate = null; // Store the underscores template
  this.highestHintLevelUsed = 0; // Track the highest hint level used for the current phrase
  this.initialErosionPercentage = this.options.initialErosionPercentage; // Store for easy access
    
  // Initialize components
  this.pathGenerator = new PathGenerator();
  
  // Pass the initial erosion percentage to the path generator
  this.pathGenerator.initialErosionPercentage = this.initialErosionPercentage;
  console.log(`Initial erosion percentage set to ${this.initialErosionPercentage * 100}%`);
  
  // Pass gridSize correctly to GridRenderer
  this.gridRenderer = new GridRenderer(this.options.gridContainerId, {
    gridWidth: this.options.gridSize.desktop.width,
    gridHeight: this.options.gridSize.desktop.height,
    gridWidthSmall: this.options.gridSize.mobile.width,
    gridHeightSmall: this.options.gridSize.mobile.height,
    cellSize: this.options.cellSize,
    randomFillPercentage: this.options.randomFillPercentage,
    highlightPath: false,
    onCellClick: (x, y, cell) => this.handleCellClick(x, y, cell),
    onSelectionChange: () => this.handleSelectionChange()
  });

  // Add this event listener for pathSet events
  document.addEventListener('pathSet', (e) => {
    if (e.detail.success) {
      // If path was successfully set, generate hint indices
      this.gridRenderer.preGenerateHintIndices();
      console.log("Hint indices generated after pathSet event");
    }
  });
    
  // Initialize scroll areas AFTER grid renderer is fully created
  this.scrollHandler = new ArrowButtons(this.gridRenderer, {
    gameContainerId: this.options.gameContainerId
  });
  
  // Set up menu handlers
  this.setupMenuHandlers();

  const levelDisplay = document.getElementById('hint-level-display');
  if (levelDisplay) {
    levelDisplay.textContent = this.gridRenderer.hintLevel;
  }
    
  // Add event listener for revealed letters
  document.addEventListener('revealedLettersUpdated', (e) => {
    this.updatePhraseWithHints();
  });
  
  // Add window resize handler
  window.addEventListener('resize', () => {
    this.handleResize();
  });

  // Initialize Erosion Controller
  this.initErosionController();

  // Dispatch custom event for initialization complete
  document.dispatchEvent(new CustomEvent('gameInitialized', { 
    detail: { controller: this }
  }));

  // Initialize Shakespeare component
  this.initShakespeareComponent();

  // Add event listener to coordinate scroll completion and snake/island updates
  document.addEventListener('gridScrollComplete', () => {
    // Notify all components that need to know scrolling is complete
    if (window.snakePath) {
      window.snakePath._scrollInProgress = false;
    }
    
    if (window.islandRenderer) {
      window.islandRenderer._scrollInProgress = false;
    }
    
    // Update island appearance
    setTimeout(() => {
      if (window.islandRenderer && window.islandRenderer.refreshIsland) {
        window.islandRenderer.refreshIsland();
      }
    }, 50);
  });
  
  // ====== WORD COMPLETION FUNCTIONALITY ======
  
  // Word completion properties
  this.enableWordCompletionFeedback = true;    // Toggle for enabling/disabling word feedback
  this.completedWords = new Set();             // Track which words have been completed
  this.wordBoundaries = [];                    // Store the start/end indices of words in the phrase
  
  // Inject CSS for word completion effects
  this.injectWordCompletionCSS();
}
  
/**
 * Modified setupMenuHandlers for GameController.js
 * Removes island reduction buttons from the menu
 */
setupMenuHandlers() {
  console.log('Setting up menu handlers');
  
  // Step 1: Find the menu elements
  const menuToggle = document.getElementById('menu-toggle');
  const menuDropdown = document.getElementById('menu-dropdown');
  
  if (!menuToggle || !menuDropdown) {
    console.error('Menu elements not found. Make sure "menu-toggle" and "menu-dropdown" elements exist in the HTML.');
    return;
  }
  
  // Step 2: Clear existing menu content
  menuDropdown.innerHTML = '';
  
  // Step 3: Create menu items - UPDATED to remove island reduction levels
  const menuItems = [
    { id: 'new-phrase-button', text: 'New Phrase', action: () => this.loadRandomPhrase() },
    { id: 'reset-selections-button', text: 'Reset Selections', action: () => this.resetSelections() },
    { id: 'separator-1', text: 'divider', type: 'separator' },
    { id: 'hint-level-1-button', text: 'Hint Level 1 (15%)', action: () => this.setHintLevel(1), hintLevel: 1 },
    { id: 'hint-level-2-button', text: 'Hint Level 2 (25%)', action: () => this.setHintLevel(2), hintLevel: 2 },
    { id: 'hint-level-3-button', text: 'Hint Level 3 (35%)', action: () => this.setHintLevel(3), hintLevel: 3 }
    // Island reduction buttons removed
  ];
  
  // Step 4: Add to menu and set up click handlers
  menuItems.forEach(item => {
    // For separators, create a divider
    if (item.type === 'separator') {
      const divider = document.createElement('div');
      divider.className = 'menu-separator';
      menuDropdown.appendChild(divider);
      return;
    }
    
    // Create button for normal menu items
    const button = document.createElement('button');
    button.id = item.id;
    button.className = 'menu-item';
    
    // Add special classes for hint buttons
    if (item.hintLevel) {
      button.classList.add('hint-button');
    }
    
    button.textContent = item.text;
    
    button.addEventListener('click', () => {
      console.log(`${item.id} clicked`);
      
      // For hint buttons, check if they're disabled
      if (item.hintLevel && item.hintLevel <= this.highestHintLevelUsed && 
          item.hintLevel !== this.gridRenderer.hintLevel) {
        console.log(`Hint level ${item.hintLevel} is disabled`);
        return; // Don't execute the action
      }
      
      // Execute the action
      item.action();
      
      // Update button styles
      if (item.hintLevel) {
        this.updateHintButtonStyles();
      } else {
        // Close the menu for non-hint buttons
        menuDropdown.classList.remove('active');
        menuToggle.classList.remove('active');
      }
    });
    
    menuDropdown.appendChild(button);
  });
  
  // Step 5: Set up menu toggle
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menuToggle.classList.toggle('active');
    menuDropdown.classList.toggle('active');
  });
  
  // Step 6: Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
      menuToggle.classList.remove('active');
      menuDropdown.classList.remove('active');
    }
  });
  
  // Step 7: Initialize hint level
  this.resetHintLevel = () => {
    if (this.gridRenderer) {
      console.log('Resetting hint level to 0');
      this.gridRenderer.setHintLevel(0);
      
      // Update hint button styles
      document.querySelectorAll('.hint-button').forEach(btn => {
        btn.classList.remove('active-hint');
      });
    }
  };
  
  // Initialize with no hints
  if (this.gridRenderer) {
    this.gridRenderer.setHintLevel(0);
  }
  
  console.log('Menu handlers setup complete');
}
  
/**
 * Handle cell click events
 * @param {number} x - X coordinate of clicked cell
 * @param {number} y - Y coordinate of clicked cell
 * @param {Object} cell - Cell data
 */
handleCellClick(x, y, cell) {
  // Cell click is handled by GridRenderer.toggleCellSelection
  // This method is called after the cell state has been updated
  
  // Update UI based on current selections
  this.handleSelectionChange();
}
  
checkHintLetterConflict(selectedLetters) {
  if (!this.currentPhrase || !this.phraseTemplate) return false;
  
  // Get the revealed hint letters
  const revealedLetters = this.gridRenderer.getRevealedLetters();
  
  // If no revealed hint letters, no conflicts possible
  if (revealedLetters.length === 0) return false;
  
  console.log('Checking hint letter conflict with revealed letters:', 
    revealedLetters.map(l => `${l.letter}(${l.pathIndex})`).join(', '));
  
  // Map revealed letters to their expected positions in the phrase
  const letterlistArray = this.currentPhrase.letterlist.split('');
  const alphaPositions = [];
  let alphaIndex = 0;
  
  // Find positions of all alphanumeric characters in the phrase
  for (let i = 0; i < letterlistArray.length; i++) {
    if (/[a-zA-Z0-9]/.test(letterlistArray[i])) {
      alphaPositions[alphaIndex] = i;
      alphaIndex++;
    }
  }
  
  // Create an array representing the phrase with hint letters
  const hintArray = this.createBlankTemplate(this.currentPhrase.letterlist).split('');
  
  // Fill in hint positions
  for (const revealedLetter of revealedLetters) {
    if (revealedLetter.pathIndex >= 0 && revealedLetter.pathIndex < alphaPositions.length) {
      const phrasePos = alphaPositions[revealedLetter.pathIndex];
      if (phrasePos !== undefined) {
        hintArray[phrasePos] = letterlistArray[phrasePos].toUpperCase();
      }
    }
  }
  
  // Create an array representing selected letters
  const selectedArray = this.createBlankTemplate(this.currentPhrase.letterlist).split('');
  
  // Fill in selected positions (excluding start cell which is already accounted for)
  // Important: start with position 1 since position 0 is the start cell
  for (let i = 0; i < selectedLetters.length; i++) {
    if (i + 1 < alphaPositions.length) { // +1 to account for start cell
      const phrasePos = alphaPositions[i + 1];
      selectedArray[phrasePos] = selectedLetters[i].letter.toUpperCase();
    }
  }
  
  // Now check for conflicts between hint letters and selected letters
  for (let i = 0; i < hintArray.length; i++) {
    // If this position has a hint letter
    if (hintArray[i] !== '_') {
      // And if a selected letter has reached this position
      if (selectedArray[i] !== '_') {
        // Check if they match
        if (selectedArray[i] !== hintArray[i]) {
          console.log(`Hint letter conflict at position ${i}: Expected ${hintArray[i]}, got ${selectedArray[i]}`);
          return {
            position: i,
            expectedLetter: hintArray[i],
            actualLetter: selectedArray[i]
          };
        }
      }
    }
  }
  
  // No conflicts found
  return false;
}
  
/**
 * Modified handleSelectionChange method to check for completed words
 */
handleSelectionChange() {
  // Get selected letters
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  
  // Check for hint letter conflicts BEFORE updating the phrase display
  const conflict = this.checkHintLetterConflict(selectedLetters);
  
  if (conflict) {
    console.log('Hint letter conflict detected!', conflict);
    
    // Show error message
    this.showHintMismatchMessage(conflict);
    
    // Deselect the last cell that caused the conflict
    this.gridRenderer.deselectLastCell();
    
    // Update again after deselection
    this.updatePhraseWithHints();
    
    // Early return to prevent further processing
    return;
  }
  
  // IMPORTANT: Make sure to call updatePhraseWithHints here
  this.updatePhraseWithHints();
  
  // Update scroll area states
  if (this.scrollHandler && this.scrollHandler.updateScrollAreaStates) {
    this.scrollHandler.updateScrollAreaStates();
  }
  
  // Adjust phrase display height after content change
  if (this.scrollHandler && this.scrollHandler.adjustPhraseDisplayHeight) {
    setTimeout(() => {
      this.scrollHandler.adjustPhraseDisplayHeight();
    }, 50);
  }
  
  // Check if the phrase is completed
  if (!this.gridRenderer.isCompleted && this.checkPhraseCompleted()) {
    console.log('Phrase completed! Checking if it is correct...');
    
    // Check if the completed phrase is correct by comparing display text
    const isCorrectPhrase = this.isCorrectPhrase();
    
    // Set completed state with correctness flag
    this.gridRenderer.setCompleted(true, isCorrectPhrase);
    
    if (isCorrectPhrase) {
      console.log('Correct phrase! Turning path green.');
      // Do not show success message - Shakespeare response will be shown via the event
    } else {
      console.log('Phrase length complete but incorrect.');
      this.showIncorrectMessage();
    }
  }
  
  // NEW: Check for completed words
  this.checkForCompletedWords();
}

  
/**
 * New method to check if the selected phrase is correct
 * Compares the selected letters against the expected phrase
 * @return {boolean} True if the phrase is correct
 */
isCorrectPhrase() {
  if (!this.currentPhrase) return false;
  
  // Get the current phrase displayed in the UI
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return false;
  
  // Get the current displayed phrase text
  const currentDisplayText = displayElement.textContent;
  
  // Check if there are any underscores left (incomplete phrase)
  if (currentDisplayText.includes('_')) {
    console.log(`Phrase still has underscores: "${currentDisplayText}"`);
    return false;
  }
  
  // Get the expected phrase text - use letterlist which includes spaces and punctuation
  const expectedText = this.currentPhrase.letterlist;
  
  // Compare ignoring case - we just need the text to match
  const isEqual = currentDisplayText.toUpperCase() === expectedText.toUpperCase();
  
  console.log(`Phrase check - current: "${currentDisplayText}", expected: "${expectedText}", isEqual: ${isEqual}`);
  
  return isEqual;
}
  
/**
 * Extract expected letters from the phrase (excluding spaces and punctuation)
 * @return {Array} Array of expected letters
 */
parseExpectedLetters() {
  if (!this.currentPhrase) return [];
  
  // Use letterlist as the source of expected letters
  const letterList = this.currentPhrase.letterlist;
  
  // Filter out only alphanumeric characters
  return letterList.split('')
    .filter(char => /[a-zA-Z0-9]/i.test(char))
    .map(char => char.toUpperCase());
}

/**
 * Check if the selection follows the predefined path
 * @param {Array} selectedLetters - Array of selected letter objects
 * @return {boolean} True if all selected letters follow the path
 */
checkIfSelectionFollowsPath(selectedLetters) {
  // Easy case - no letters selected
  if (!selectedLetters.length) return false;
  
  // Check if each selected letter is on the path
  // Note: First check if there's at least one path cell, otherwise it would be impossible
  // to find the correct path
  const hasPathCells = selectedLetters.some(cell => cell.isPathCell);
  if (!hasPathCells) {
    console.log('None of the selected cells are on the path');
    return false;
  }
  
  // Check if each selected letter is on the path
  // A stricter check would be to verify they're in the right order too
  const allOnPath = selectedLetters.every(cell => cell.isPathCell);
  
  return allOnPath;
}
  
createPhraseTemplate(phrase) {
  // Only replace alphanumeric characters with underscores
  // Keep spaces, punctuation and other special characters as is
  return phrase.replace(/[a-zA-Z0-9]/g, '_');
}

createBlankTemplate(phrase) {
  return phrase.replace(/[a-zA-Z0-9]/g, '_');
}
  
/**
 * Updated fillPhraseTemplate method to show actual selected letters in sequence
 * @param {string} template - The phrase template with underscores for letters
 * @param {string} phrase - The correct phrase
 * @param {Array} selectedLetters - Array of selected cell objects
 * @return {string} Updated template with selected letters filled in
 */
// 4. Modify the fillPhraseTemplate method to respect hint letters
fillPhraseTemplate(template, phrase, selectedLetters) {
  // Check if we have empty input
  if (!template || !phrase || !selectedLetters) {
    return template || '';
  }
  
  // Create array from template
  const templateArray = template.split('');
  
  // Get a template with revealed hint letters first
  const hintTemplate = this.fillPhraseTemplateWithHints(
    template,
    phrase,
    this.gridRenderer.getRevealedLetters()
  ).split('');
  
  // Only use letters that actually have content
  const validSelectedLetters = selectedLetters.filter(cell => 
    cell.letter && cell.letter.trim() !== '');
  
  // Check if the start cell is selected
  const startCellIsSelected = this.gridRenderer && 
                             this.gridRenderer.grid[35][35] && 
                             this.gridRenderer.grid[35][35].isSelected;
  
  // Count positions that need letters (underscores) that are not already filled with hints
  const letterPositions = [];
  for (let i = 0; i < hintTemplate.length; i++) {
    if (hintTemplate[i] === '_') {
      letterPositions.push(i);
    }
  }
  
  // Start filling in the template with the actual selected letters in sequence
  let letterIndex = 0;
  
  // If start cell is selected and has a letter, use it first
  if (startCellIsSelected && this.currentPath && this.currentPath.length > 0) {
    const startCellLetter = this.currentPath[0].letter.toUpperCase();
    if (startCellLetter && startCellLetter.trim() !== '' && letterPositions.length > 0) {
      templateArray[letterPositions[0]] = startCellLetter;
      letterIndex = 1; // Start with the next position
    }
  }
  
  // Fill remaining positions with selected letters in sequence
  // Skip positions that already have hint letters
  for (let i = 0; i < validSelectedLetters.length && letterIndex < letterPositions.length; i++) {
    const letter = validSelectedLetters[i].letter.toUpperCase();
    if (letter && letter.trim() !== '') {
      templateArray[letterPositions[letterIndex]] = letter;
      letterIndex++;
    }
  }
  
  return templateArray.join('');
}

/**
 * Modified updatePhraseWithHints to properly handle punctuation and underscore characters
 */
updatePhraseWithHints() {
  if (!this.gridRenderer || !this.currentPhrase || !this.phraseTemplate) {
    return;
  }
  
  // Get the display element
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return;
  
  console.log('Updating phrase with hints');
  
  // Track which hint letters were previously showing
  const previousHintLetters = Array.from(document.querySelectorAll('.hint-letter')).map(el => {
    return {
      position: parseInt(el.dataset.index, 10),
      wasMatched: el.classList.contains('hint-letter-match')
    };
  });
  
  // Start with the original template
  const templateArray = this.phraseTemplate.split('');
  
  // Get revealed hint letters
  const revealedLetters = this.gridRenderer.getRevealedLetters();
  
  // Map path indices to positions in the phrase
  const letterlistArray = this.currentPhrase.letterlist.split('');
  const alphaPositions = [];
  let alphaIndex = 0;
  
  // Find positions of all alphanumeric characters
  for (let i = 0; i < letterlistArray.length; i++) {
    if (/[a-zA-Z0-9]/.test(letterlistArray[i])) {
      alphaPositions[alphaIndex] = i;
      alphaIndex++;
    }
  }
  
  // Store revealed hint letter positions and their path indices
  const hintLetters = [];
  
  // Apply hint letters first (they take precedence)
  if (revealedLetters.length > 0) {
    console.log('Applying revealed letters:', revealedLetters.map(l => `${l.letter}(${l.pathIndex})`).join(', '));
    
    // Apply each revealed letter
    for (const revealedLetter of revealedLetters) {
      if (revealedLetter.pathIndex >= 0 && revealedLetter.pathIndex < alphaPositions.length) {
        const phrasePos = alphaPositions[revealedLetter.pathIndex];
        if (phrasePos !== undefined) {
          templateArray[phrasePos] = letterlistArray[phrasePos].toUpperCase();
          
          // Store this hint letter
          hintLetters.push({
            position: phrasePos,
            pathIndex: revealedLetter.pathIndex,
            letter: letterlistArray[phrasePos].toUpperCase()
          });
        }
      }
    }
  }
  
  // Check if start cell is selected and has a letter
  const centerX = 35;
  const centerY = 35;
  const startCell = this.gridRenderer.grid[centerY][centerX];
  const isStartSelected = startCell.isSelected;
  
  // If start cell is selected and has a letter, fill in the first letter position
  if (isStartSelected && startCell.letter && startCell.letter.trim() !== '') {
    console.log(`Start cell is selected with letter '${startCell.letter}', adding to first position`);
    const firstLetterPos = alphaPositions[0]; // First letter position
    if (firstLetterPos !== undefined && templateArray[firstLetterPos] === '_') { // Only replace underscore (not a hint)
      templateArray[firstLetterPos] = startCell.letter.toUpperCase();
    }
  }
  
  // Now apply regular selected letters, skipping positions that already have hint letters
  // and excluding the start cell since we already handled it
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  
  // DEBUG: Log the selected letters
  console.log('Selected letters for phrase update:', selectedLetters.map(l => l.letter).join(''));
  
  if (selectedLetters.length > 0) {
    console.log('Applying selected letters:', selectedLetters.map(l => `${l.letter}`).join(', '));
    
    // Apply selected letters, starting at position 1 (after start cell)
    for (let i = 0; i < selectedLetters.length; i++) {
      if (i + 1 < alphaPositions.length) { // +1 to account for start cell
        const phrasePos = alphaPositions[i + 1];
        
        // Only fill if not already filled by a hint
        if (phrasePos !== undefined && templateArray[phrasePos] === '_') {
          templateArray[phrasePos] = selectedLetters[i].letter.toUpperCase();
        }
      }
    }
  }
  
  // Convert template array to HTML with spans for each character
  let phraseHtml = '';
  for (let i = 0; i < templateArray.length; i++) {
    const hintLetter = hintLetters.find(h => h.position === i);
    const currentChar = templateArray[i];
    
    // Wrap each character in a span with data attributes
    // Check if this is a hint letter
    if (hintLetter) {
      // Add data attributes for hint letters
      phraseHtml += `<span class="phrase-char hint-letter" data-index="${i}" data-path-index="${hintLetter.pathIndex}" data-char="${currentChar}">${currentChar}</span>`;
    } 
    // Check if this is a punctuation character (not alphanumeric AND not an underscore)
    else if (!/[a-zA-Z0-9_]/.test(currentChar) && currentChar !== '_') {
      phraseHtml += `<span class="phrase-char punctuation-char" data-index="${i}" data-char="${currentChar}">${currentChar}</span>`;
    } 
    // Check if this is an underscore - special styling
    else if (currentChar === '_') {
      phraseHtml += `<span class="phrase-char" data-index="${i}" data-char="_">${currentChar}</span>`;
    }
    // Regular character
    else {
      phraseHtml += `<span class="phrase-char" data-index="${i}" data-char="${currentChar}">${currentChar}</span>`;
    }
  }
  
  // Update the display with the HTML spans
  displayElement.innerHTML = phraseHtml;
  
  // Find which selected cells match hint letters
  const matchingHints = this.findNewlyMatchedHintLetters(hintLetters);
  
  // Apply animation to newly matched hint letters
  if (matchingHints.length > 0) {
    console.log('Newly matched hint letters:', matchingHints);
    
    matchingHints.forEach(position => {
      const charSpan = displayElement.querySelector(`.hint-letter[data-index="${position}"]`);
      if (charSpan) {
        // Remove any existing animation first
        charSpan.classList.remove('hint-letter-match');
        
        // Force a reflow to restart animation
        void charSpan.offsetWidth;
        
        // Add class to trigger animation
        charSpan.classList.add('hint-letter-match');
        
        // Remove class after animation completes
        setTimeout(() => {
          charSpan.classList.remove('hint-letter-match');
        }, 1000);
      }
    });
  }
  
  // Re-apply black to completed words
  if (this.completedWords.size > 0) {
    [...this.completedWords].forEach(wordIndex => {
      this.updateWordTextColor(wordIndex);
    });
  }
  
  // Adjust phrase display height if needed
  if (this.scrollHandler && this.scrollHandler.adjustPhraseDisplayHeight) {
    setTimeout(() => {
      this.scrollHandler.adjustPhraseDisplayHeight();
    }, 50);
  }
}
  
/**
 * Helper method to find newly matched hint letters
 * This will only return hint letter positions that were just matched in this update
 * @param {Array} hintLetters - Array of hint letter information
 * @return {Array} Array of newly matched hint letter positions
 */
findNewlyMatchedHintLetters(hintLetters) {
  // This array will store positions of newly matched hint letters
  const newlyMatchedPositions = [];
  
  // Skip if no hints or no grid renderer
  if (!hintLetters.length || !this.gridRenderer) {
    return newlyMatchedPositions;
  }
  
  // Get the most recently selected cell (if any)
  const selectedCells = this.gridRenderer.selectedCells;
  if (!selectedCells.length) {
    return newlyMatchedPositions;
  }
  
  // Get the most recently selected cell (last in the array)
  const lastSelectedCell = selectedCells[selectedCells.length - 1];
  if (!lastSelectedCell) {
    return newlyMatchedPositions;
  }
  
  // Get the path index for this cell
  const cell = this.gridRenderer.grid[lastSelectedCell.y][lastSelectedCell.x];
  if (!cell || cell.pathIndex === undefined) {
    return newlyMatchedPositions;
  }
  
  // Find hint letters that match this path index
  hintLetters.forEach(hint => {
    if (hint.pathIndex === cell.pathIndex) {
      newlyMatchedPositions.push(hint.position);
    }
  });
  
  return newlyMatchedPositions;
}
  
/**
 * Enhanced version of fillPhraseTemplateWithHints method for GameController.js
 * This adds detailed debugging to help identify why the first letter might be showing
 * as revealed or why consecutive letters are being revealed in level 1
 */
fillPhraseTemplateWithHints(template, phrase, revealedLetters) {
  // Check if we have empty input
  if (!template || !phrase || !revealedLetters || revealedLetters.length === 0) {
    return template || '';
  }
  
  const templateArray = template.split('');
  const phraseArray = phrase.toUpperCase().split('');
  
  // Create a mapping from pathIndex to phrase position
  const pathIndexToCharPosition = new Map();
  
  // Track which alphanumeric characters in the phrase map to which path positions
  let pathPosition = 0;
  for (let i = 0; i < phrase.length; i++) {
    if (/[a-zA-Z0-9]/.test(phrase[i])) {
      pathIndexToCharPosition.set(pathPosition, i);
      pathPosition++;
    }
  }
  
  // Now map each revealed letter to its correct position in the phrase
  for (const revealedCell of revealedLetters) {
    const phrasePosition = pathIndexToCharPosition.get(revealedCell.pathIndex);
    
    if (phrasePosition !== undefined) {
      // Only update the template if the position is valid
      if (phrasePosition < templateArray.length) {
        templateArray[phrasePosition] = phraseArray[phrasePosition];
      }
    }
  }
  
  return templateArray.join('');
}
  
updatePhraseFromSelections(selectedLetters) {
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement || !this.currentPhrase) return;
  
  // Debug: log the selected letters
  console.log('Updating phrase from selections:');
  console.log('- Selected letters:', selectedLetters.map(l => `${l.letter || '[empty]'}`).join(', '));
  
  // If we have a phrase and template
  if (this.phraseTemplate) {
    // Fill in the template with selected letters using letterlist instead of phrase
    const updatedDisplay = this.fillPhraseTemplate(
      this.phraseTemplate,
      this.currentPhrase.letterlist, // Changed from phrase to letterlist
      selectedLetters
    );
    
    // Display the updated template
    displayElement.textContent = updatedDisplay;
    
    // Adjust phrase display height
    if (this.scrollHandler && this.scrollHandler.adjustPhraseDisplayHeight) {
      this.scrollHandler.adjustPhraseDisplayHeight();
    }
  } else {
    // Fallback if no template (shouldn't happen)
    const selectedString = selectedLetters.map(cell => cell.letter).join('');
    displayElement.textContent = selectedString || "Select letters to form a phrase";
  }
}

/**
 * Update the text color for a completed word in the phrase display
 * @param {number} wordIndex - Index of the completed word
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
 * Check if a specific word in the phrase is correctly filled
 * @param {number} wordIndex - Index of the word to check
 * @return {boolean} True if the word is completed correctly
 */
isWordCompleted(wordIndex) {
  if (!this.enableWordCompletionFeedback || wordIndex < 0 || wordIndex >= this.wordBoundaries.length) {
    return false;
  }
  
  // If word is already marked as completed, return true
  if (this.completedWords.has(wordIndex)) {
    return true;
  }
  
  const wordBoundary = this.wordBoundaries[wordIndex];
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return false;
  
  const currentPhraseText = displayElement.textContent;
  
  // Ensure the word boundaries are within the text range
  if (wordBoundary.start >= currentPhraseText.length || wordBoundary.end >= currentPhraseText.length) {
    return false;
  }
  
  // Extract the current word from the display
  const currentWord = currentPhraseText.substring(wordBoundary.start, wordBoundary.end + 1);
  
  // Extract the expected word from the original phrase
  const expectedWord = this.currentPhrase.letterlist.substring(
    wordBoundary.start, wordBoundary.end + 1
  );
  
  // Check if the current word matches the expected word (no underscores)
  const isComplete = currentWord.indexOf('_') === -1;
  const isCorrect = currentWord.toUpperCase() === expectedWord.toUpperCase();
  
  return isComplete && isCorrect;
}
  
/**
 * Updated checkPhraseCompleted method to work with any selection
 * Checks if we've selected enough letters to fill all positions
 */
checkPhraseCompleted() {
  if (!this.currentPhrase) return false;
  
  // Get selected letters (which already excludes the start cell)
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  const validSelectedLetters = selectedLetters.filter(cell => cell.letter.trim() !== '');
  
  // Count non-space/non-punctuation characters in the letterlist that need to be filled
  const letterListArray = this.currentPhrase.letterlist.split('');
  const letterPositions = letterListArray.filter(char => /[a-zA-Z0-9]/.test(char)).length;
  
  // Subtract 1 from the total count to account for the start cell which is excluded
  const targetLetterCount = letterPositions - 1;
  
  console.log('Letter count check:', {
    validSelectedCount: validSelectedLetters.length,
    totalLetterPositions: letterPositions,
    targetLetterCount
  });
  
  // Check if we've selected exactly the right number of letters (excluding start cell)
  return validSelectedLetters.length === targetLetterCount;
}

/**
 * Check for newly completed words and handle visual feedback
 */
checkForCompletedWords() {
  if (!this.enableWordCompletionFeedback) return;
  
  // If no word boundaries parsed yet, do it now
  if (this.wordBoundaries.length === 0) {
    this.parseWordBoundaries();
    if (this.wordBoundaries.length === 0) return;
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
  
showSuccessMessage() {
  // Do nothing - Shakespeare response will show instead
  console.log('Success message suppressed - Shakespeare response will be shown instead');
}

/**
 * Enhanced flashCompletedWord method to ensure the last cells are included
 * @param {number} wordIndex - Index of the completed word
 */
flashCompletedWord(wordIndex) {
  const wordBoundary = this.wordBoundaries[wordIndex];
  if (!wordBoundary) return;
  
  console.log(`Flashing snake pieces for word "${wordBoundary.word}"`);
  
  // Get selected cells
  const selectedCells = this.gridRenderer.selectedCells;
  if (!selectedCells || selectedCells.length === 0) return;
  
  // Count the number of alphanumeric characters in the word (excluding punctuation)
  const wordLetterCount = wordBoundary.word.replace(/[^a-zA-Z0-9]/g, '').length;
  
  console.log(`Word "${wordBoundary.word}" has ${wordLetterCount} alphanumeric characters`);
  
  // ENHANCED: Include a buffer to ensure we don't miss any cells
  const cellsToTake = Math.min(wordLetterCount + 2, selectedCells.length);
// Take cells from the end of the selection with buffer
  const cellsToFlash = selectedCells.slice(-cellsToTake);
  
  console.log(`Will flash the last ${cellsToFlash.length} selected cells for word completion (including ${cellsToTake - wordLetterCount} buffer cells)`);
  
  // Check if we can use the snakePath utility to flash pieces
  if (window.snakePath && typeof window.snakePath.flashSnakePiecesInCells === 'function') {
    // Use snakePath's method if available
    window.snakePath.flashSnakePiecesInCells(cellsToFlash);
  } 
  // Otherwise implement the flashing directly
  else {
    // Collect all snake pieces from the specified cells
    const snakePieces = [];
    
    cellsToFlash.forEach(cell => {
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      if (cellElement) {
        // Try multiple selector strategies to ensure we get ALL pieces
        const allPieces = cellElement.querySelectorAll('img[class*="snake-"], .snake-piece');
        allPieces.forEach(piece => snakePieces.push(piece));
      }
    });
    
    if (snakePieces.length === 0) {
      console.log('No snake pieces found in the word cells');
      return;
    }
    
    console.log(`Found a total of ${snakePieces.length} snake pieces to flash`);
    
    // Flash the snake pieces twice (off-on, off-on) with 250ms intervals
    let flashCount = 0;
    const maxFlashes = 4; // 2 complete cycles (off-on, off-on)
    
    const flashInterval = setInterval(() => {
      // Toggle visibility and opacity
      const isVisible = flashCount % 2 === 0;
      
      snakePieces.forEach(piece => {
        piece.style.visibility = isVisible ? 'hidden' : 'visible';
        piece.style.opacity = isVisible ? '0' : '1';
      });
      
      flashCount++;
      
      // Stop after max flashes
      if (flashCount >= maxFlashes) {
        clearInterval(flashInterval);
        
        // Ensure snake pieces are visible at the end
        snakePieces.forEach(piece => {
          piece.style.visibility = 'visible';
          piece.style.opacity = '1';
        });
        
        console.log('Word completion snake flash animation complete');
      }
    }, 250); // 250ms = quarter of a second for faster word completion feedback
  }
}
  
/**
 * Flashes specific snake pieces in the given cells - Enhanced for debugging
 * @param {Array} cellsToFlash - Array of cells containing snake pieces to flash
 */
flashSnakePiecesInCells(cellsToFlash) {
  if (!cellsToFlash || cellsToFlash.length === 0) return;
  
  console.log(`SnakePath: Flashing snake pieces in ${cellsToFlash.length} cells`);
  
  // Collect all snake pieces from the specified cells
  const snakePieces = [];
  
  cellsToFlash.forEach(cell => {
    const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
    if (cellElement) {
      const pieces = cellElement.querySelectorAll('.snake-piece');
      if (pieces.length > 0) {
        console.log(`Found ${pieces.length} snake pieces in cell (${cell.x}, ${cell.y})`);
        pieces.forEach(piece => snakePieces.push(piece));
      } else {
        console.log(`No snake pieces found in cell (${cell.x}, ${cell.y})`);
      }
    } else {
      console.log(`Could not find cell element for (${cell.x}, ${cell.y})`);
    }
  });
  
  if (snakePieces.length === 0) {
    console.log('No snake pieces found in the specified cells');
    return;
  }
  
  console.log(`Found a total of ${snakePieces.length} snake pieces to flash`);
  
  // Flash the snake pieces twice (off-on, off-on) with 250ms intervals
  let flashCount = 0;
  const maxFlashes = 4; // 2 complete cycles (off-on, off-on)
  
  const flashInterval = setInterval(() => {
    // Toggle visibility
    const isVisible = flashCount % 2 === 0;
    
    snakePieces.forEach(piece => {
      piece.style.visibility = isVisible ? 'hidden' : 'visible';
    });
    
    flashCount++;
    
    // Stop after max flashes
    if (flashCount >= maxFlashes) {
      clearInterval(flashInterval);
      
      // Ensure snake pieces are visible at the end
      snakePieces.forEach(piece => {
        piece.style.visibility = 'visible';
      });
      
      console.log('Word completion snake flash animation complete');
    }
  }, 250); // 250ms = quarter of a second for faster word completion feedback
}
  
/**
 * Display an incorrect message when the wrong phrase is found
 */
showIncorrectMessage() {
  // Find or create message container
  let messageContainer = document.getElementById('message-container');
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'message-container';
    messageContainer.style.position = 'absolute';
    messageContainer.style.top = '10px';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translateX(-50%)';
    messageContainer.style.padding = '10px 20px';
    messageContainer.style.backgroundColor = 'rgba(180, 0, 0, 0.8)';
    messageContainer.style.color = 'white';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.fontWeight = 'bold';
    messageContainer.style.zIndex = '1000';
    messageContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    document.getElementById(this.options.gameContainerId).appendChild(messageContainer);
  }

  // Set incorrect message
  messageContainer.textContent = 'Try again! Follow the hidden path.';
  messageContainer.style.backgroundColor = 'rgba(180, 0, 0, 0.8)';
  
  // Show message
  messageContainer.style.display = 'block';
  
  // Hide after a delay
  setTimeout(() => {
    messageContainer.style.display = 'none';
  }, 3000);
}
  
// New method to initialize ShakespeareResponse component with correct GitHub URL
initShakespeareComponent() {
  // Import the ShakespeareResponse module
  import('./shakespeareresponse.js')
    .then(module => {
      const ShakespeareResponse = module.default;
      
      // Create instance with the correct GitHub URL
      this.shakespeareComponent = new ShakespeareResponse({
        containerId: this.options.gameContainerId,
        imagePath: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/shakespeare.png'
      });
      
      console.log('Shakespeare component initialized with GitHub image URL');
      
      // Make game controller accessible to the Shakespeare component
      window.gameController = this;
    })
    .catch(error => {
      console.error('Failed to load Shakespeare component:', error);
    });
}

/**
 * Initialize the erosion controller
 * This should be called after PathGenerator and GridRenderer are initialized
 */
initErosionController() {
  // Import the ErosionController module
  import('./erosioncontroller.js')
    .then(module => {
      const ErosionController = module.default;
      
      // Create instance with gridRenderer and pathGenerator
      this.erosionController = new ErosionController(
        this.gridRenderer,
        this.pathGenerator
      );
      
      console.log('Erosion controller initialized');
      
      // Make it globally accessible for debugging
      window.erosionController = this.erosionController;
    })
    .catch(error => {
      console.error('Failed to load Erosion Controller:', error);
    });
}
  
updateIslandReductionButtonStyles() {
  // Get all island reduction buttons specifically
  const islandButtons = document.querySelectorAll('[id^="island-level-"]');
  
  // Update each button
  islandButtons.forEach(button => {
    // Extract level from button ID (island-level-X-button)
    const buttonLevel = parseInt(button.id.split('-')[2], 10);
    
    // Remove any existing state classes - use distinct class names to avoid cross-contamination
    button.classList.remove('active-hint', 'disabled-hint', 'active-island', 'disabled-island');
    
    // Current level - active (using active-island to distinguish from hint buttons)
    if (buttonLevel === this.gridRenderer.islandReductionLevel) {
      button.classList.add('active-island');  // Use different class name
    }
    
    // Lower than highest used - disabled
    if (buttonLevel < this.highestIslandReductionLevelUsed) {
      button.classList.add('disabled-island');  // Use different class name
      button.style.color = 'grey';
    } else {
      button.style.color = '';  // Reset to default
    }
  });
}
  
/**
 * Modified setIslandReductionLevel method with enhanced updating
 */
setIslandReductionLevel(level) {
  if (this.gridRenderer) {
    // Don't allow going back to a lower level
    if (level < this.highestIslandReductionLevelUsed) {
      console.log(`Cannot go back to island reduction level ${level} after using level ${this.highestIslandReductionLevelUsed}`);
      return;
    }
    
    console.log(`Setting island reduction level to ${level} from ${this.gridRenderer.islandReductionLevel}`);
    
    // Set the level in the grid renderer
    this.gridRenderer.setIslandReductionLevel(level);
    
    // Apply island reduction letters with the pathGenerator
    this.gridRenderer.applyIslandReductionLetters(this.pathGenerator);
    
    // Update the highest level used
    this.highestIslandReductionLevelUsed = Math.max(this.highestIslandReductionLevelUsed, level);
    this.gridRenderer.highestIslandReductionLevelUsed = this.highestIslandReductionLevelUsed;
    
    // Update button styles
    this.updateIslandReductionButtonStyles();
    
    // CRITICAL: Force a complete grid rebuild, not just a re-render
    // Set _lastRenderOffset to null to trigger a full rebuild
    this.gridRenderer._lastRenderOffset = null;
    
    // Force a grid re-render immediately
    this.gridRenderer.renderVisibleGrid();
    
    // ENHANCED: Add multiple delayed renders to ensure cell content updates properly
    setTimeout(() => {
      // Set _lastRenderOffset to null again for second rebuild
      this.gridRenderer._lastRenderOffset = null;
      this.gridRenderer.renderVisibleGrid();
      console.log("Secondary grid rebuild for letter updates");
    }, 50);
    
    // Add a third rebuild with a longer delay
    setTimeout(() => {
      this.gridRenderer._lastRenderOffset = null;
      this.gridRenderer.renderVisibleGrid();
      console.log("Tertiary grid rebuild for letter updates");
    }, 150);
    
    // Additional updates to ensure visual changes take effect
    if (this.scrollHandler && this.scrollHandler.updateScrollAreaStates) {
      this.scrollHandler.updateScrollAreaStates();
    }
    
    // Explicitly refresh island appearance if the IslandRenderer is available
    if (window.islandRenderer && typeof window.islandRenderer.updateIslandAppearance === 'function') {
      console.log('Forcing island appearance update after reduction level change');
      window.islandRenderer.updateIslandAppearance();
      
      // Another update after a delay
      setTimeout(() => {
        window.islandRenderer.updateIslandAppearance();
      }, 200);
    }
    
    // Close the menu to show the changes
    const menuDropdown = document.getElementById('menu-dropdown');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuDropdown && menuToggle) {
      menuDropdown.classList.remove('active');
      menuToggle.classList.remove('active');
    }
    
    console.log(`Island reduction level set to ${level}`);
  }
}
  
// 3. Add a method to show the hint mismatch message
showHintMismatchMessage(conflict) {
  // Find or create message container
  let messageContainer = document.getElementById('message-container');
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'message-container';
    messageContainer.style.position = 'absolute';
    messageContainer.style.top = '10px';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translateX(-50%)';
    messageContainer.style.padding = '10px 20px';
    messageContainer.style.backgroundColor = 'rgba(180, 80, 0, 0.8)';
    messageContainer.style.color = 'white';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.fontWeight = 'bold';
    messageContainer.style.zIndex = '1000';
    messageContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    document.getElementById(this.options.gameContainerId).appendChild(messageContainer);
  }

  // Set hint mismatch message
  messageContainer.textContent = 'Hint letter mismatch. Deselect cells and try again.';
  
  // Show details about the mismatch
  if (conflict) {
    const detailsEl = document.createElement('div');
    detailsEl.className = 'mismatch-details';
    detailsEl.textContent = `Expected '${conflict.expectedLetter}' but got '${conflict.actualLetter}' at position ${conflict.position + 1}`;
    detailsEl.style.fontSize = '0.8em';
    detailsEl.style.marginTop = '5px';
    messageContainer.appendChild(detailsEl);
  }
  
  // Show message
  messageContainer.style.display = 'block';
  
  // Hide after a delay
  setTimeout(() => {
    messageContainer.style.display = 'none';
  }, 4000);
}

/**
 * Set the initial erosion percentage used when generating islands
 * @param {number} percentage - Value between 0 and 1 (e.g., 0.25 for 25%)
 * @return {boolean} Success flag
 */
setInitialErosionPercentage(percentage) {
  // Validate input
  if (typeof percentage !== 'number' || percentage < 0 || percentage > 1) {
    console.error('Initial erosion percentage must be a number between 0 and 1');
    return false;
  }
  
  // Update the percentage in both the controller and path generator
  this.initialErosionPercentage = percentage;
  this.options.initialErosionPercentage = percentage;
  
  if (this.pathGenerator) {
    this.pathGenerator.initialErosionPercentage = percentage;
    console.log(`Initial erosion percentage updated to ${percentage * 100}%`);
  }
  
  return true;
}
  
/**
 * Modified loadPhrase method for GameController.js
 * Fixes both the path generation validation and async/await usage
 */

/**
 * Modified loadPhrase method for GameController.js
 * Adds word boundary parsing for word completion feedback
 */
async loadPhrase(phraseData) {
  this.currentPhrase = phraseData;
  
  // Log response for debugging
  console.log(`Phrase response: "${phraseData.response}"`);
  
  // Reset any highlighting
  this.gridRenderer.options.highlightPath = false;
  
  // Reset the completion state
  this.gridRenderer.setCompleted(false);
  
  // Parse letter list from phrase data 
  const letterList = phraseData.letterlist;
  
  console.log(`Loading phrase: "${letterList}" with letterlist: "${letterList}"`);
  
  // Create the phrase template with underscores using letterlist
  this.phraseTemplate = this.createPhraseTemplate(letterList);

  this.highestHintLevelUsed = 0;
  if (this.gridRenderer) {
    this.gridRenderer.setHintLevel(0);
    this.updateHintButtonStyles(); // Update button styles
  }
  
  // NEW: Parse word boundaries for word completion feedback
  this.parseWordBoundaries();
  this.completedWords = new Set();
  
  // Track generation attempts
  let generationSuccessful = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  
  // Try generating the path up to MAX_ATTEMPTS times
  while (!generationSuccessful && attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`Path generation attempt #${attempts} of ${MAX_ATTEMPTS}`);
    
    // Generate path using path generator (will filter out non-alphanumerics)
    this.currentPath = this.pathGenerator.generatePath(letterList);
    
    // Check if path is null (incomplete) before setting
    if (this.currentPath === null) {
      console.warn(`Path generation attempt #${attempts} failed - path was incomplete`);
      
      // Force seed randomization between attempts
      if (attempts < MAX_ATTEMPTS) {
        // Shuffle more aggressively to get different paths
        this.pathGenerator.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        // Add a small delay to allow for better randomization
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      continue; // Skip to next attempt
    }
    
    // Apply path to grid renderer and check if successful
    generationSuccessful = this.gridRenderer.setPath(this.currentPath);
    
    if (!generationSuccessful) {
      console.warn(`Path generation attempt #${attempts} failed - some cells were outside bounds`);
      // Force seed randomization between attempts
      if (attempts < MAX_ATTEMPTS) {
        // Shuffle more aggressively
        this.pathGenerator.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        // Add a small delay to allow for better randomization
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
  }
  
  if (!generationSuccessful) {
    console.error(`Failed to generate valid path after ${MAX_ATTEMPTS} attempts. Phrase may be too long.`);
    console.log('Loading a different phrase instead...');
    setTimeout(() => this.loadRandomPhrase(), 100);
    return; // Exit this method early
  }
  
  // Only proceed with the rest of the setup if generation was successful
  console.log('Path generation successful after', attempts, 'attempts');
  
  // NEW: Generate island with the two-layer system
  this.pathGenerator.generateTwoLayerIsland();
  
  // Apply the island cells to the grid
  const islandCells = this.pathGenerator.getIslandCells();
  this.gridRenderer.applyRandomLetters(islandCells);
  
  console.log(`Applied ${islandCells.length} island cells to grid`);
  
  // Center the grid on the start cell
  this.gridRenderer.centerGridOnStartCell();
  
  // Optimize the grid view
  setTimeout(() => {
    this.gridRenderer.optimizeGridView();
    console.log("Grid view optimized to minimize empty space");
  }, 300);
  
  // Update scroll area states
  if (this.scrollHandler && this.scrollHandler.updateScrollAreaStates) {
    this.scrollHandler.updateScrollAreaStates();
  }
  
  // Display the initial template
  const displayElement = document.getElementById('phrase-text');
  if (displayElement) {
    displayElement.textContent = this.phraseTemplate;
    
    // Adjust phrase display height after loading new content
    if (this.scrollHandler && this.scrollHandler.adjustPhraseDisplayHeight) {
      setTimeout(() => {
        this.scrollHandler.adjustPhraseDisplayHeight();
      }, 50);
    }
  }
  
  // NEW: Start the erosion process after a short delay
  setTimeout(() => {
    if (this.erosionController) {
      // First stop any current erosion
      this.erosionController.stopErosion();
      
      // Then start new erosion for this phrase
      this.erosionController.startErosion();
      console.log('Started erosion process for new phrase');
    } else {
      console.warn('Erosion controller not available, skipping erosion start');
    }
  }, 2000); // 2 second delay before starting erosion
}
  
/**
 * Handle window resize events
 */
handleResize() {
  // Let gridRenderer handle it
  this.gridRenderer.handleResponsive();
  
  // Adjust scroll areas and phrase display
  if (this.scrollHandler) {
    if (this.scrollHandler.updateScrollAreaStates) {
      this.scrollHandler.updateScrollAreaStates();
    }
    
    if (this.scrollHandler.adjustPhraseDisplayWidth) {
      this.scrollHandler.adjustPhraseDisplayWidth();
    }
  }
}
  
/**
 * Load sample data for testing
 * Updated to be async since it calls loadPhrase which is now async
 */
async loadSampleData() {
  // Sample phrase data for testing when CSV isn't available
  const samplePhrase = {
    id: 1,
    phrase: "TIME FLIES LIKE AN ARROW",
    letterlist: "TIME FLIES LIKE AN ARROW", // Now with spaces
    lettercount: 23,
    wordcount: 5,
    meaning: "Time passes quickly",
    info: "Common English expression",
    source: "Unknown",
    sourcetype: "Phrase",
    date: "",
    era: "Modern",
    author: "",
    phrasetags: "time,idiom",
    usagetype: "Common"
  };
  
  // Use await here since loadPhrase is now async
  await this.loadPhrase(samplePhrase);
}
  
/**
 * Updated loadPhraseData method to be async and properly handle the async loadPhrase
 */
async loadPhraseData(csvUrl) {
  try {
    // Fetch CSV file
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvData = await response.text();
    
    // Check if we have data
    if (!csvData || csvData.trim() === '') {
      throw new Error('CSV file is empty');
    }
    
    // Parse CSV using PapaParse
    const allPhrases = this.parseCSV(csvData);
    
    // In loadPhraseData(), after parsing CSV:
    console.log('First few phrases and their IDs:');
    allPhrases.slice(0, 10).forEach(phrase => {
      console.log(`Phrase: "${phrase.phrase}", ID: ${phrase.id}, Type: ${typeof phrase.id}`);
    });
    
    // In gamecontroller.js, update the filtering logic in loadPhraseData:
    // Filter phrases to only those with IDs between 3001-3050
    const shakespearePhrases = allPhrases.filter(phrase => {
      // Parse the id as an integer
      const id = parseInt(phrase.id, 10);
      
      // Debug: Log each ID check
      console.log(`Checking phrase ID: ${phrase.id}, parsed as: ${id}, valid ID: ${!isNaN(id)}, in range: ${id >= 3001 && id <= 3050}`);
      
      // Make sure id is a valid number and within range
      return !isNaN(id) && id >= 3001 && id <= 3050;
    });
    
    console.log(`Loaded ${shakespearePhrases.length} Shakespeare phrases from CSV`);
    
    // Debug: Show which phrases were selected
    shakespearePhrases.forEach(phrase => {
      console.log(`Selected Shakespeare phrase ID ${phrase.id}: "${phrase.phrase}"`);
    });
    
    // Rest of the code remains the same...
    // If no phrases in range, fall back to all phrases
    if (shakespearePhrases.length === 0) {
      console.warn('No phrases found in ID range 3001-3050, using all phrases');
      this.phrases = allPhrases;
    } else {
      this.phrases = shakespearePhrases;
    }
    
    // Load a random phrase
    if (this.phrases.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.phrases.length);
      const randomPhrase = this.phrases[randomIndex];
      
      console.log('Loading random Shakespeare phrase ID:', randomPhrase.id);
      // Use await here since loadPhrase is now async
      await this.loadPhrase(randomPhrase);
    } else {
      console.warn('No phrases found in CSV');
      this.loadSampleData();
    }
    
    return this.phrases;
  } catch (error) {
    console.error('Error loading phrase data:', error);
    this.loadSampleData();
    return [];
  }
}
  
/**
 * Parse CSV data into an array of phrase objects using PapaParse
 * @param {string} csvData - CSV data string
 * @return {Array} Array of phrase objects
 */
parseCSV(csvData) {
  try {
    const result = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transform: (value, field) => {
        return typeof value === 'string' ? value.trim() : value;
      }
    });
    
    // Debug: Check headers
    console.log('CSV headers:', result.meta.fields);
    
    if (result.errors && result.errors.length > 0) {
      console.warn('CSV parsing had errors:', result.errors);
    }
    
    return result.data || [];
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

/**
 * Modified parseWordBoundaries to handle punctuation characters better
 */
parseWordBoundaries() {
  console.log('Parsing word boundaries');
  
  if (!this.currentPhrase || !this.currentPhrase.letterlist) {
    console.log('No current phrase to parse');
    return;
  }
  
  const letterList = this.currentPhrase.letterlist;
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
      // End of a word - only include if it has at least one character
      if (i > currentWordStart) {
        this.wordBoundaries.push({
          start: currentWordStart,
          end: i - 1,
          word: letterList.substring(currentWordStart, i)
        });
      }
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
 * Load a random phrase from the loaded phrases
 * Updated to be async since it calls loadPhrase which is now async
 */
async loadRandomPhrase() {
  if (!this.phrases || this.phrases.length === 0) {
    console.warn('No phrases available to load randomly');
    this.loadSampleData();
    return;
  }
  
  // Pick a random phrase
  const randomIndex = Math.floor(Math.random() * this.phrases.length);
  const randomPhrase = this.phrases[randomIndex];
  
  console.log(`Loading random phrase: "${randomPhrase.phrase}"`);
  
  // Load the phrase
  await this.loadPhrase(randomPhrase);
}

/**
 * Toggle the word completion feedback feature
 * @param {boolean|null} enable - True to enable, false to disable, null to toggle current state
 * @return {boolean} Current enabled state
 */
toggleWordCompletionFeedback(enable = null) {
  // If enable is provided, set to that value; otherwise toggle current value
  this.enableWordCompletionFeedback = (enable !== null) ? enable : !this.enableWordCompletionFeedback;
  
  console.log(`Word completion feedback ${this.enableWordCompletionFeedback ? 'enabled' : 'disabled'}`);
  
  // If disabling, reset any visual changes
  if (!this.enableWordCompletionFeedback) {
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
  
  return this.enableWordCompletionFeedback;
}
  
setHintLevel(level) {
  if (this.gridRenderer) {
    // Don't allow going back to a lower level
    if (level < this.highestHintLevelUsed) {
      console.log(`Cannot go back to hint level ${level} after using level ${this.highestHintLevelUsed}`);
      return;
    }
    
    // Set the hint level in the grid renderer
    this.gridRenderer.setHintLevel(level);
    
    // Update the highest level used
    this.highestHintLevelUsed = level;
    
    // Update phrase display with revealed letters
    this.updatePhraseWithHints();
    
    // Update button styles to reflect disabled state
    this.updateHintButtonStyles();
    
    console.log(`Hint level set to ${level} (${this.gridRenderer.hintLevelPercentages[level] * 100}%)`);
  }
}

updateHintButtonStyles() {
  // Get all hint buttons specifically (not island reduction buttons)
  const hintButtons = document.querySelectorAll('[id^="hint-level-"]');
  
  // Update each button
  hintButtons.forEach(button => {
    // Extract level from button ID (hint-level-X-button)
    const buttonLevel = parseInt(button.id.split('-')[2], 10);
    
    // Remove any existing state classes
    button.classList.remove('active-hint', 'disabled-hint');
    
    // Current level - active
    if (buttonLevel === this.gridRenderer.hintLevel) {
      button.classList.add('active-hint');
    }
    
    // Lower than highest used - disabled
    if (buttonLevel <= this.highestHintLevelUsed && buttonLevel !== this.gridRenderer.hintLevel) {
      button.classList.add('disabled-hint');
      button.style.color = 'grey';
    } else {
      button.style.color = '';  // Reset to default
    }
  });
}

/**
 * Inject CSS for word completion effects
 */
injectWordCompletionCSS() {
  if (document.getElementById('word-completion-css')) return;
  
  console.log('Injecting word completion CSS with grammar and hint handling');
  const style = document.createElement('style');
  style.id = 'word-completion-css';
  style.textContent = `
    /* Animation for word completion flash effect - IMPROVED */
    @keyframes word-completed-flash {
      0% { background-color: var(--maingreen) !important; }
      50% { background-color: #3b9c68 !important; /* Darker green */ }
      100% { background-color: var(--maingreen) !important; }
    }
    
    /* Class applied to cells when a word is completed - IMPROVED */
    .grid-cell.word-completed-flash {
      animation: word-completed-flash 0.5s ease-in-out !important;
      transition: none !important; /* Override any existing transitions */
    }
    
    /* Style for completed word characters in phrase display */
    .completed-word-char {
      color: black !important;
      font-weight: bold !important;
    }
    
    /* Style for punctuation and special characters - always black */
    .phrase-char.punctuation-char {
      color: black !important;
    }
    
    /* Style for revealed hint letters - also black from the start */
    .phrase-char.hint-letter {
      color: black !important;
    }
    
    /* Initial style for all other phrase characters */
    #phrase-text .phrase-char:not(.completed-word-char):not(.punctuation-char):not(.hint-letter) {
      color: #999999 !important; /* Light grey */
    }
  `;
  document.head.appendChild(style);
}
  
/**
 * Reset all selections
 */
resetSelections() {
  this.gridRenderer.clearSelections();
  this.handleSelectionChange();
  
  // Reset the phrase display to show just the template
  if (this.phraseTemplate) {
    const displayElement = document.getElementById('phrase-text');
    if (displayElement) {
      displayElement.textContent = this.phraseTemplate;
      
      // Adjust phrase display height
      if (this.scrollHandler && this.scrollHandler.adjustPhraseDisplayHeight) {
        setTimeout(() => {
          this.scrollHandler.adjustPhraseDisplayHeight();
        }, 50);
      }
    }
  }
  
  // Force island appearance update after reset
  if (window.islandRenderer && typeof window.islandRenderer.updateIslandAppearance === 'function') {
    setTimeout(() => {
      window.islandRenderer.updateIslandAppearance();
    }, 100);
  }
}
  
/**
 * Modified setIslandReductionLevel method with forced island updates
 */
setIslandReductionLevel(level) {
  if (this.gridRenderer) {
    // Don't allow going back to a lower level
    if (level < this.highestIslandReductionLevelUsed) {
      console.log(`Cannot go back to island reduction level ${level} after using level ${this.highestIslandReductionLevelUsed}`);
      return;
    }
    
    console.log(`Setting island reduction level to ${level} from ${this.gridRenderer.islandReductionLevel}`);
    
    // Set the level in the grid renderer
    this.gridRenderer.setIslandReductionLevel(level);
    
    // Apply island reduction letters with the pathGenerator
    this.gridRenderer.applyIslandReductionLetters(this.pathGenerator);
    
    // Update the highest level used
    this.highestIslandReductionLevelUsed = Math.max(this.highestIslandReductionLevelUsed, level);
    this.gridRenderer.highestIslandReductionLevelUsed = this.highestIslandReductionLevelUsed;
    
    // Update button styles
    this.updateIslandReductionButtonStyles();
    
    // Force a grid re-render immediately
    this.gridRenderer.renderVisibleGrid();
    
    // Explicitly trigger the ScrollHandler to update scroll areas
    if (this.scrollHandler && this.scrollHandler.updateScrollAreaStates) {
      this.scrollHandler.updateScrollAreaStates();
    }
    
    // Explicitly refresh island appearance
    if (window.islandRenderer && typeof window.islandRenderer.updateIslandAppearance === 'function') {
      console.log('Forcing island appearance update after reduction level change');
      window.islandRenderer.updateIslandAppearance();
      
      // Another update after a delay to ensure all changes are applied
      setTimeout(() => {
        window.islandRenderer.updateIslandAppearance();
      }, 200);
    }
    
    // Close the menu to show the changes
    const menuDropdown = document.getElementById('menu-dropdown');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuDropdown && menuToggle) {
      menuDropdown.classList.remove('active');
      menuToggle.classList.remove('active');
    }
    
    console.log(`Island reduction level set to ${level}`);
  }
}
}

// Initialize IslandRenderer on document ready
document.addEventListener('DOMContentLoaded', () => {
  // Ensure IslandRenderer is initialized when the grid is ready
  document.addEventListener('gridRendererInitialized', (e) => {
    console.log('Grid renderer initialized, initializing IslandRenderer');
    if (!window.islandRenderer) {
      import('./islandrenderer.js')
        .then(module => {
          const IslandRenderer = module.default;
          const islandRenderer = new IslandRenderer(e.detail.gridRenderer);
          console.log('IslandRenderer initialized via import');
        })
        .catch(error => {
          console.error('Failed to import IslandRenderer:', error);
        });
    }
  });
});

// Make GameController accessible globally for debugging
window.GameController = GameController;

// Export class for use in other modules
export default GameController;

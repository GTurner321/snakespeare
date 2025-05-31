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
/**
 * Modified constructor for GameController
 * Adds initialization of trackpad navigation control
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
 * Complete setupMenuHandlers method for GameController
 * Replace your existing setupMenuHandlers method with this complete version
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
  
  // Step 3: Create menu items - UPDATED to replace Reset Selections with Pause Erosion
  const menuItems = [
    { id: 'new-phrase-button', text: 'New Phrase', action: () => this.loadRandomPhrase() },
    { id: 'pause-erosion-button', text: 'Pause Erosion', action: () => this.toggleErosionPause() }, // CHANGED FROM RESET SELECTIONS
    { id: 'separator-1', text: 'divider', type: 'separator' },
    { id: 'hint-level-1-button', text: 'Hint Level 1', action: () => this.setHintLevel(1), hintLevel: 1 },
    { id: 'hint-level-2-button', text: 'Hint Level 2', action: () => this.setHintLevel(2), hintLevel: 2 },
    { id: 'hint-level-3-button', text: 'Hint Level 3', action: () => this.setHintLevel(3), hintLevel: 3 }
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
    
    // Add special class for erosion button
    if (item.id === 'pause-erosion-button') {
      button.classList.add('erosion-button');
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
      } 
      // For erosion button, don't close menu automatically (toggleErosionPause handles it)
      else if (item.id === 'pause-erosion-button') {
        // Menu closing is handled in toggleErosionPause method
      }
      else {
        // Close the menu for other buttons
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
 * NEW METHOD: Toggle erosion pause/unpause state
 * Add this method after setupMenuHandlers
 */
toggleErosionPause() {
  if (!this.erosionController) {
    console.warn('Erosion controller not available');
    return;
  }
  
  const button = document.getElementById('pause-erosion-button');
  if (!button) {
    console.error('Pause erosion button not found');
    return;
  }
  
  if (this.erosionController.isPaused()) {
    // Currently paused, so unpause
    this.erosionController.unpauseErosion();
    button.textContent = 'Pause Erosion';
    button.classList.remove('erosion-paused');
    console.log('Erosion unpaused via menu button');
  } else {
    // Currently running, so pause
    this.erosionController.pauseErosion();
    button.textContent = 'Unpause Erosion';
    button.classList.add('erosion-paused');
    console.log('Erosion paused via menu button');
  }
  
  // Close menu after action
  const menuDropdown = document.getElementById('menu-dropdown');
  const menuToggle = document.getElementById('menu-toggle');
  if (menuDropdown && menuToggle) {
    menuDropdown.classList.remove('active');
    menuToggle.classList.remove('active');
  }
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
  
  // FIXED: Use 'phrase' instead of 'letterlist'
  if (!this.currentPhrase.phrase) {
    console.error('Current phrase is missing phrase property');
    return false;
  }
  
  // Map revealed letters to their expected positions in the phrase
  const phraseArray = this.currentPhrase.phrase.split('');
  const alphaPositions = [];
  let alphaIndex = 0;
  
  // Find positions of all alphanumeric characters in the phrase
  for (let i = 0; i < phraseArray.length; i++) {
    if (/[a-zA-Z0-9]/.test(phraseArray[i])) {
      alphaPositions[alphaIndex] = i;
      alphaIndex++;
    }
  }
  
  // Create an array representing the phrase with hint letters
  const hintArray = this.createBlankTemplate(this.currentPhrase.phrase).split('');
  
  // Fill in hint positions
  for (const revealedLetter of revealedLetters) {
    if (revealedLetter.pathIndex >= 0 && revealedLetter.pathIndex < alphaPositions.length) {
      const phrasePos = alphaPositions[revealedLetter.pathIndex];
      if (phrasePos !== undefined) {
        hintArray[phrasePos] = phraseArray[phrasePos].toUpperCase();
      }
    }
  }
  
  // Create an array representing selected letters
  const selectedArray = this.createBlankTemplate(this.currentPhrase.phrase).split('');
  
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
  
  // Get the expected phrase text - use phrase which includes spaces and punctuation
  const expectedText = this.currentPhrase.phrase;
  
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
  if (!this.currentPhrase || !this.currentPhrase.phrase) {
    console.warn('No current phrase available for parsing expected letters');
    return [];
  }
  
  // FIXED: Use 'phrase' as the source of expected letters
  const phrase = this.currentPhrase.phrase;
  
  // Filter out only alphanumeric characters
  return phrase.split('')
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

/**
 * FIXED: createBlankTemplate to handle apostrophes correctly
 * Only replace alphanumeric characters with underscores, leave apostrophes as-is
 */
createBlankTemplate(phrase) {
  // FIXED: Only replace alphanumeric characters with underscores
  // Keep apostrophes, spaces, and other punctuation as they are
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
 * FIXED: updatePhraseWithHints method to flash only newly matched hint letters
 * This method should replace the existing updatePhraseWithHints in GameController class
 */
updatePhraseWithHints() {
  if (!this.gridRenderer || !this.currentPhrase || !this.phraseTemplate) {
    return;
  }
  
  // Get the display element
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return;
  
  console.log('Updating phrase with hints (FIXED VERSION)');
  
  // Start with the original template
  const templateArray = this.phraseTemplate.split('');
  
  // Get revealed hint letters
  const revealedLetters = this.gridRenderer.getRevealedLetters();
  
  // FIXED: Use 'phrase' instead of 'letterlist'
  if (!this.currentPhrase.phrase) {
    console.error('Current phrase is missing phrase property');
    return;
  }
  
  // Map path indices to positions in the phrase
  const phraseArray = this.currentPhrase.phrase.split('');
  const alphaPositions = [];
  let alphaIndex = 0;
  
  // Find positions of ONLY alphanumeric characters (NOT apostrophes)
  for (let i = 0; i < phraseArray.length; i++) {
    // Only alphanumeric characters count as letters that need to be filled
    if (/[a-zA-Z0-9]/.test(phraseArray[i])) {
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
          templateArray[phrasePos] = phraseArray[phrasePos].toUpperCase();
          
          // Store this hint letter
          hintLetters.push({
            position: phrasePos,
            pathIndex: revealedLetter.pathIndex,
            letter: phraseArray[phrasePos].toUpperCase()
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
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  
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
      // Add data attributes for hint letters and the revealed-char class
      phraseHtml += `<span class="phrase-char hint-letter revealed-char" data-index="${i}" data-path-index="${hintLetter.pathIndex}" data-char="${currentChar}">${currentChar}</span>`;
    } 
    // Check if this is a punctuation character (including apostrophes)
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
  
  // FIXED: Find only the newly matched hint letters
  const matchingHints = this.findNewlyMatchedHintLetters(hintLetters);
  
  // FIXED: Apply animation ONLY to newly matched hint letters
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
  
  // SIMPLIFIED: Use simple logic - delay only if hint letters were matched
  if (matchingHints.length > 0) {
    // Delay word completion check to allow hint animation to start
    setTimeout(() => {
      console.log('Checking for completed words after hint letter match');
      this.checkForCompletedWords();
    }, 100);
  } else {
    // No hint matches, check immediately
    this.checkForCompletedWords();
  }
  
  // Adjust phrase display height if needed
  if (this.scrollHandler && this.scrollHandler.adjustPhraseDisplayHeight) {
    setTimeout(() => {
      this.scrollHandler.adjustPhraseDisplayHeight();
    }, 50);
  }
}
  
/**
 * FIXED: findNewlyMatchedHintLetters method to accurately identify only newly matched hint letters
 * This method should replace the existing findNewlyMatchedHintLetters in GameController class
 */
findNewlyMatchedHintLetters(hintLetters) {
  // This array will store positions of newly matched hint letters
  const newlyMatchedPositions = [];
  
  // Skip if no hints or no grid renderer
  if (!hintLetters.length || !this.gridRenderer) {
    return newlyMatchedPositions;
  }
  
  // Get selected cells
  const selectedCells = this.gridRenderer.selectedCells;
  if (!selectedCells.length) {
    return newlyMatchedPositions;
  }
  
  // FIXED: Only check the LAST selected cell to find newly matched hint letters
  // This ensures we only flash hint letters that were just matched by the latest selection
  const lastSelectedCell = selectedCells[selectedCells.length - 1];
  if (!lastSelectedCell) {
    return newlyMatchedPositions;
  }
  
  // Get the grid cell at the last selected position
  const lastGridCell = this.gridRenderer.grid[lastSelectedCell.y][lastSelectedCell.x];
  if (!lastGridCell) {
    return newlyMatchedPositions;
  }
  
  // Get the path index of the last selected cell
  const lastSelectedPathIndex = lastGridCell.pathIndex;
  
  // Find hint letters that match this path index
  hintLetters.forEach(hint => {
    if (hint.pathIndex === lastSelectedPathIndex) {
      newlyMatchedPositions.push(hint.position);
    }
  });
  
  // Also check if the start cell was just selected (path index 0)
  if (selectedCells.length === 1) {
    const startCell = selectedCells[0];
    const centerX = 35;
    const centerY = 35;
    
    // If this is the start cell and it was just selected
    if (startCell.x === centerX && startCell.y === centerY) {
      // Find hint letters with path index 0 (start cell)
      hintLetters.forEach(hint => {
        if (hint.pathIndex === 0) {
          newlyMatchedPositions.push(hint.position);
        }
      });
    }
  }
  
  console.log('Newly matched hint letters:', newlyMatchedPositions);
  return newlyMatchedPositions;
}

/**
 * Enhanced fillPhraseTemplateWithHints method to properly handle apostrophes
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
    // CRITICAL FIX: Include apostrophes as alphanumeric characters
    if (/[a-zA-Z0-9']/.test(phrase[i])) {
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
  
/**
 * Modified updatePhraseFromSelections to properly handle apostrophes
 */
updatePhraseFromSelections(selectedLetters) {
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement || !this.currentPhrase) return;
  
  // Debug: log the selected letters
  console.log('Updating phrase from selections:');
  console.log('- Selected letters:', selectedLetters.map(l => `${l.letter || '[empty]'}`).join(', '));
  
  // If we have a phrase and template
  if (this.phraseTemplate) {
    // Create a mapping from path indices to phrase positions
    const phraseArray = this.currentPhrase.phrase.split('');
    const alphaPositions = [];
    let alphaIndex = 0;
    
    // CRITICAL FIX: Include apostrophes in valid character mapping
    for (let i = 0; i < phraseArray.length; i++) {
      if (/[a-zA-Z0-9']/.test(phraseArray[i])) {
        alphaPositions[alphaIndex] = i;
        alphaIndex++;
      }
    }
    
    // Start with the template
    const templateArray = this.phraseTemplate.split('');
    
    // Check if start cell is selected and has a letter
    const centerX = 35;
    const centerY = 35;
    const startCell = this.gridRenderer.grid[centerY][centerX];
    const isStartSelected = startCell.isSelected;
    
    // If start cell is selected, fill in first position
    if (isStartSelected && startCell.letter && startCell.letter.trim() !== '') {
      const firstLetterPos = alphaPositions[0];
      if (firstLetterPos !== undefined) {
        templateArray[firstLetterPos] = startCell.letter.toUpperCase();
      }
    }
    
    // Now apply the selected letters in sequence
    for (let i = 0; i < selectedLetters.length; i++) {
      // Calculate the correct position in the phrase (+1 to skip start cell position)
      const letterPosition = i + 1;
      if (letterPosition < alphaPositions.length) {
        const phrasePos = alphaPositions[letterPosition];
        if (phrasePos !== undefined) {
          templateArray[phrasePos] = selectedLetters[i].letter.toUpperCase();
        }
      }
    }
    
    // Display the updated template
    displayElement.textContent = templateArray.join('');
    
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
 * FIXED: isWordCompleted with proper hint letter end-of-word checking
 * Prevents premature completion when hint letters exist at end of word
 * 
 * REPLACE your existing isWordCompleted() method with this version
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
  
  // Get all alphanumeric characters in this word
  const expectedLetters = [];
  const letterPositions = [];
  
  // Build array of expected letters and their positions
  for (let i = wordBoundary.start; i <= wordBoundary.end; i++) {
    const char = this.currentPhrase.phrase[i];
    if (/[a-zA-Z0-9]/.test(char)) {
      expectedLetters.push(char.toUpperCase());
      letterPositions.push(i);
    }
  }
  
  console.log(`Checking word completion for "${wordBoundary.word}":`, {
    expectedLetters,
    letterPositions
  });
  
  // Get the phrase display spans
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return false;
  
  const spans = Array.from(displayElement.querySelectorAll('.phrase-char'));
  
  // CRITICAL NEW CHECK: Before checking completion, verify if there are unmatched hint letters in this word
  let hasUnmatchedHintLetters = false;
  
  for (let i = 0; i < expectedLetters.length; i++) {
    const phrasePosition = letterPositions[i];
    const span = spans[phrasePosition];
    if (!span) continue;
    
    const isHintLetter = span.classList.contains('hint-letter');
    
    if (isHintLetter) {
      // This is a hint letter - check if it's matched by a user selection
      const pathIndex = parseInt(span.getAttribute('data-path-index'), 10);
      const isMatched = this.isHintLetterMatched(pathIndex);
      
      if (!isMatched) {
        hasUnmatchedHintLetters = true;
        console.log(`Word "${wordBoundary.word}" has unmatched hint letter at position ${i} (path index ${pathIndex})`);
        break; // Found an unmatched hint, no need to check further
      }
    }
  }
  
  // If there are unmatched hint letters, word cannot be complete yet
  if (hasUnmatchedHintLetters) {
    console.log(`Word "${wordBoundary.word}" cannot complete - has unmatched hint letters`);
    return false;
  }
  
  // Now check each letter position for completion (original logic)
  for (let i = 0; i < expectedLetters.length; i++) {
    const phrasePosition = letterPositions[i];
    const expectedLetter = expectedLetters[i];
    
    // Get the span for this position
    const span = spans[phrasePosition];
    if (!span) return false;
    
    const actualChar = span.textContent;
    const isUnderscore = actualChar === '_';
    
    // If any position is empty or incorrect, word is not complete
    if (isUnderscore) {
      console.log(`Position ${i}: Still empty (underscore)`);
      return false;
    }
    
    if (actualChar.toUpperCase() !== expectedLetter) {
      console.log(`Position ${i}: Incorrect letter "${actualChar}" (expected "${expectedLetter}")`);
      return false;
    }
    
    console.log(`Position ${i}: Correct letter "${actualChar}"`);
  }
  
  // All positions are filled correctly AND all hint letters are matched
  console.log(`Word "${wordBoundary.word}" is completed!`);
  return true;
}

/**
 * NEW: Check if a hint letter at a specific path index has been matched by user selection
 * @param {number} pathIndex - The path index of the hint letter to check
 * @return {boolean} True if the hint letter is matched by a user selection
 * 
 * ADD this new method to your GameController class (it doesn't exist yet)
 */
isHintLetterMatched(pathIndex) {
  // Check if there's a selected cell that corresponds to this path index
  const selectedCells = this.gridRenderer.selectedCells;
  
  // Check start cell (path index 0)
  if (pathIndex === 0) {
    const centerX = 35;
    const centerY = 35;
    const startCell = this.gridRenderer.grid[centerY][centerX];
    return startCell.isSelected;
  }
  
  // Check other selected cells
  for (const cell of selectedCells) {
    const pathCell = this.gridRenderer.grid[cell.y][cell.x];
    if (pathCell && pathCell.pathIndex === pathIndex) {
      return true;
    }
  }
  
  return false;
}
  
/**
 * FIXED: checkPhraseCompleted to handle apostrophes correctly
 * Only count alphanumeric characters, not apostrophes
 */
checkPhraseCompleted() {
  if (!this.currentPhrase || !this.currentPhrase.phrase) {
    console.warn('No current phrase available for completion check');
    return false;
  }
  
  // Get selected letters (which already excludes the start cell)
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  const validSelectedLetters = selectedLetters.filter(cell => cell.letter.trim() !== '');
  
  // FIXED: Count ONLY alphanumeric characters in the phrase (NOT apostrophes)
  const phraseArray = this.currentPhrase.phrase.split('');
  const letterPositions = phraseArray.filter(char => /[a-zA-Z0-9]/.test(char)).length;
  
  // Subtract 1 from the total count to account for the start cell which is excluded
  const targetLetterCount = letterPositions - 1;
  
  console.log('Letter count check (FIXED):', {
    validSelectedCount: validSelectedLetters.length,
    totalAlphanumericPositions: letterPositions,
    targetLetterCount
  });
  
  // Check if we've selected exactly the right number of letters (excluding start cell)
  return validSelectedLetters.length === targetLetterCount;
}

/**
 * Enhanced checkForCompletedWords method with better logging
 */
checkForCompletedWords() {
  if (!this.enableWordCompletionFeedback) return;
  
  // If no word boundaries parsed yet, do it now
  if (this.wordBoundaries.length === 0) {
    this.parseWordBoundaries();
    if (this.wordBoundaries.length === 0) return;
  }
  
  // Log all words and their status
  console.log('Words in phrase:');
  this.wordBoundaries.forEach((boundary, index) => {
    console.log(`Word ${index}: "${boundary.word}" (${boundary.start}-${boundary.end}), completed: ${this.completedWords.has(index)}`);
  });
  
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
    console.log('Words completed:', [...this.completedWords].map(i => this.wordBoundaries[i].word).join(', '));
  }
}
  
showSuccessMessage() {
  // Do nothing - Shakespeare response will show instead
  console.log('Success message suppressed - Shakespeare response will be shown instead');
}

/**
 * COMPLETE flashCompletedWord function with timing fix
 * This preserves all your original functionality while fixing the timing issue
 */

flashCompletedWord(wordIndex) {
  const wordBoundary = this.wordBoundaries[wordIndex];
  if (!wordBoundary) return;
  
  console.log(`Flashing snake pieces for CORRECTLY completed word "${wordBoundary.word}"`);
  
  // Get the expected word (without apostrophes or punctuation)
  const expectedWord = this.currentPhrase.phrase
    .substring(wordBoundary.start, wordBoundary.end + 1)
    .replace(/[^a-zA-Z0-9]/g, '') // Remove all non-alphanumeric characters
    .toUpperCase();
  
  // Get the phrase display element to verify which positions are correctly filled
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return;

  const spans = Array.from(displayElement.querySelectorAll('.phrase-char'));
  const wordSpans = spans.filter((span, i) => 
    i >= wordBoundary.start && i <= wordBoundary.end && /[a-zA-Z0-9]/.test(span.getAttribute('data-char'))
  );
  
  // Create a mapping of correct letter positions to path indices
  const correctPathIndices = [];
  
  // Map each alphanumeric character in the entire phrase to its path index
  const phraseArray = this.currentPhrase.phrase.split('');
  let pathIndex = 0;
  
  for (let i = 0; i < phraseArray.length; i++) {
    const char = phraseArray[i];
    
    // If this is an alphanumeric character
    if (/[a-zA-Z0-9]/.test(char)) {
      // Check if this position is within our word boundary
      if (i >= wordBoundary.start && i <= wordBoundary.end) {
        // Get the corresponding span
        const spanIndex = wordSpans.findIndex(span => {
          const spanIndex = parseInt(span.getAttribute('data-index'), 10);
          return spanIndex === i;
        });
        
        if (spanIndex >= 0) {
          const span = wordSpans[spanIndex];
          const actualChar = span.textContent.toUpperCase();
          const expectedChar = char.toUpperCase();
          
          // Only include this path index if the character is CORRECT
          if (actualChar === expectedChar && actualChar !== '_') {
            correctPathIndices.push(pathIndex);
          }
        }
      }
      
      pathIndex++; // Increment path index for each alphanumeric character
    }
  }
  
  console.log(`Word "${wordBoundary.word}" correct path indices:`, correctPathIndices);
  
  // Find all cells corresponding to these CORRECT path indices
  const cellsToFlash = [];
  
  // Check for start cell (index 0)
  if (correctPathIndices.includes(0)) {
    const centerX = 35;
    const centerY = 35;
    cellsToFlash.push({ x: centerX, y: centerY });
  }
  
  // Check selected cells
  const selectedCells = this.gridRenderer.selectedCells;
  selectedCells.forEach(cell => {
    const pathCell = this.gridRenderer.grid[cell.y][cell.x];
    if (pathCell && correctPathIndices.includes(pathCell.pathIndex)) {
      cellsToFlash.push({ x: cell.x, y: cell.y });
    }
  });
  
  // Check revealed hint cells
  const revealedHints = this.gridRenderer.getRevealedLetters();
  revealedHints.forEach(hint => {
    if (correctPathIndices.includes(hint.pathIndex)) {
      cellsToFlash.push({ x: hint.x, y: hint.y });
    }
  });
  
  // Remove duplicates
  const uniqueCellsMap = new Map();
  cellsToFlash.forEach(cell => {
    const key = `${cell.x},${cell.y}`;
    uniqueCellsMap.set(key, cell);
  });
  
  const uniqueCells = Array.from(uniqueCellsMap.values());
  
  console.log(`Flashing ${uniqueCells.length} cells for CORRECTLY completed word "${wordBoundary.word}"`);
  
  // Flash the cells with improved timing for consistency
  if (window.snakePath && uniqueCells.length > 0) {
    // TIMING FIX: Remove extra setTimeout delay and add flashOnce option
    window.snakePath.flashSnakePiecesInCells(uniqueCells, { flashOnce: true });
  }
}
  
/**
 * Delayed flash method that allows time for snake pieces to update
 * Uses a combination of both approaches for maximum reliability
 * @param {Array} cells - Array of cells to flash
 */
delayedFlashWordCells(cells) {
  if (!cells || cells.length === 0) return;
  
  console.log(`Delayed flashing ${cells.length} cells`);
  
  // Ensure CSS is added
  this.ensureWordCompletionCSS();
  
  // Collect all snake pieces from the cells AND create backup highlighters
  const snakePieces = [];
  const highlighters = [];
  
  cells.forEach(cell => {
    const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
    if (cellElement) {
      // 1. Try to find snake pieces first
      const pieces = cellElement.querySelectorAll('.snake-piece, [class*="snake-"], img[src*="piece"]');
      pieces.forEach(piece => snakePieces.push(piece));
      
      // 2. Create a highlighter as backup
      const highlighter = document.createElement('div');
      highlighter.className = 'word-completion-highlighter';
      cellElement.appendChild(highlighter);
      highlighters.push(highlighter);
      
      // 3. Add a class to the cell itself for additional visual feedback
      cellElement.classList.add('word-completed-flash');
    }
  });
  
  console.log(`Found ${snakePieces.length} snake pieces and created ${highlighters.length} backup highlighters`);
  
  // Flash both snake pieces and highlighters for redundancy
  let flashCount = 0;
  const maxFlashes = 4; // 2 complete cycles
  
  const flashInterval = setInterval(() => {
    // Toggle visibility
    const isVisible = flashCount % 2 === 0;
    
    // 1. Toggle snake pieces if available
    if (snakePieces.length > 0) {
      snakePieces.forEach(piece => {
        piece.style.visibility = isVisible ? 'hidden' : 'visible';
        piece.style.opacity = isVisible ? '0' : '1';
      });
    }
    
    // 2. Toggle highlighters as backup
    highlighters.forEach(highlighter => {
      highlighter.style.opacity = isVisible ? '0' : '1';
    });
    
    flashCount++;
    
    // Stop after max flashes
    if (flashCount >= maxFlashes) {
      clearInterval(flashInterval);
      
      // Clean up and restore visibility
      snakePieces.forEach(piece => {
        piece.style.visibility = 'visible';
        piece.style.opacity = '1';
      });
      
      // Remove the highlighters
      highlighters.forEach(highlighter => {
        if (highlighter && highlighter.parentNode) {
          highlighter.parentNode.removeChild(highlighter);
        }
      });
      
      // Remove the flash class from cells
      cells.forEach(cell => {
        const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
        if (cellElement) {
          cellElement.classList.remove('word-completed-flash');
        }
      });
      
      console.log('Word completion flash animation complete');
    }
  }, 250);
}

/**
 * Ensure CSS for word completion effects exists
 */
ensureWordCompletionCSS() {
  if (document.getElementById('word-completion-highlighter-css')) return;
  
  const style = document.createElement('style');
  style.id = 'word-completion-highlighter-css';
  style.textContent = `
    /* Animation for cell background flashing */
    @keyframes word-completed-flash {
      0% { background-color: var(--maingreen) !important; }
      50% { background-color: #3b9c68 !important; /* Darker green */ }
      100% { background-color: var(--maingreen) !important; }
    }
    
    /* Class for cells when a word is completed */
    .grid-cell.word-completed-flash {
      animation: word-completed-flash 0.5s ease-in-out !important;
      z-index: 10 !important;
    }
    
    /* Highlighter styling */
    .word-completion-highlighter {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-color: rgba(65, 185, 105, 0.5) !important;
      border-radius: 5px !important;
      box-shadow: 0 0 15px rgba(65, 185, 105, 0.8) !important;
      z-index: 550 !important; /* Above snake pieces */
      pointer-events: none !important;
      transition: opacity 0.25s ease-in-out !important;
      opacity: 1 !important;
      will-change: opacity !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('Added word completion CSS');
}
  
/**
 * Completely revised flashSnakePiecesInCells with consistent timing and reliable element selection
 * @param {Array} cellsToFlash - Array of cells containing snake pieces to flash
 */
flashSnakePiecesInCells(cellsToFlash) {
  if (!cellsToFlash || cellsToFlash.length === 0) return;
  
  console.log(`SnakePath: Flashing snake pieces in ${cellsToFlash.length} cells`);
  
  // STANDARDIZED TIMING: Always use a 200ms delay for consistency
  setTimeout(() => {
    // Using multiple techniques to find ALL types of snake pieces
    let allElements = [];
    
    // APPROACH 1: Direct cell elements
    const cellElements = [];
    cellsToFlash.forEach(cell => {
      const cellElement = document.querySelector(`.grid-cell[data-grid-x="${cell.x}"][data-grid-y="${cell.y}"]`);
      if (cellElement) {
        cellElements.push(cellElement);
      }
    });
    
    // APPROACH 2: Find all snake pieces in these cells
    cellElements.forEach(cellElement => {
      // Use multiple selectors to ensure we find ALL piece types
      const pieceCandidates = [
        ...Array.from(cellElement.querySelectorAll('.snake-piece')),
        ...Array.from(cellElement.querySelectorAll('[class*="snake-"]')),
        ...Array.from(cellElement.querySelectorAll('img[src*="piece"]'))
      ];
      
      // Filter out duplicates
      const uniquePieces = Array.from(new Set(pieceCandidates));
      allElements.push(...uniquePieces);
      
      // If no pieces found, create a visual indicator
      if (uniquePieces.length === 0) {
        // Add visual indicator overlay
        const overlay = document.createElement('div');
        overlay.className = 'flash-indicator';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(76, 175, 80, 0.4)';
        overlay.style.borderRadius = '5px';
        overlay.style.zIndex = '700';
        
        cellElement.appendChild(overlay);
        allElements.push(overlay);
      }
    });
    
    // STANDARDIZED FLASHING: Same timing and pattern for all flashing
    let flashCount = 0;
    const maxFlashes = 4; // 2 complete cycles (4 transitions)
    const flashInterval = setInterval(() => {
      // Toggle visibility
      const isVisible = flashCount % 2 === 0;
      
      allElements.forEach(element => {
        // Multiple approaches to ensure visibility changes work
        element.style.visibility = isVisible ? 'hidden' : 'visible';
        element.style.opacity = isVisible ? '0' : '1';
      });
      
      flashCount++;
      
      // Stop after max flashes
      if (flashCount >= maxFlashes) {
        clearInterval(flashInterval);
        
        // Restore visibility
        allElements.forEach(element => {
          element.style.visibility = 'visible';
          element.style.opacity = '1';
          
          // Remove any overlays we created
          if (element.className === 'flash-indicator') {
            if (element.parentNode) {
              element.parentNode.removeChild(element);
            }
          }
        });
        
        console.log('Flash animation complete');
      }
    }, 250); // Standardized timing: 250ms per transition
  }, 200); // Standardized delay before starting flashes
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
  
/**
 * Enhanced initShakespeareComponent method with welcome modal support
 * Replace your existing initShakespeareComponent method with this version
 */
initShakespeareComponent() {
  console.log('🎭 Initializing Shakespeare component...');
  
  // Import the ShakespeareResponse module
  import('./shakespeareresponse.js')
    .then(module => {
      console.log('✅ Shakespeare module loaded successfully');
      const ShakespeareResponse = module.default;
      
      // Create instance with the correct GitHub URL
      this.shakespeareComponent = new ShakespeareResponse({
        containerId: this.options.gameContainerId,
        imagePath: 'https://raw.githubusercontent.com/GTurner321/snakespeare/main/assets/shakespeare.png'
      });
      
      console.log('✅ Shakespeare component initialized:', this.shakespeareComponent);
      console.log('🔍 showWelcomeModal method available:', typeof this.shakespeareComponent.showWelcomeModal);
      
      // Make game controller accessible to the Shakespeare component
      window.gameController = this;
      
      // ENHANCED: Show welcome modal after all components are ready
      console.log('🎭 Setting up welcome modal trigger...');
      this.setupWelcomeModalTrigger();
    })
    .catch(error => {
      console.error('❌ Failed to load Shakespeare component:', error);
      console.error('Error details:', error.stack);
    });
}
  
/**
 * Enhanced setupWelcomeModalTrigger with comprehensive debugging
 * Replace your existing setupWelcomeModalTrigger method with this version
 */
setupWelcomeModalTrigger() {
  console.log('🎭 Setting up welcome modal trigger...');
  
  // Track readiness states
  let gridReady = false;
  let phrasesLoaded = false;
  let shakespeareReady = false;
  
  // Check if Shakespeare component already exists
  if (this.shakespeareComponent) {
    console.log('✅ Shakespeare component already exists');
    shakespeareReady = true;
  } else {
    console.log('❌ Shakespeare component not yet initialized');
  }
  
  const checkReadyState = () => {
    console.log('🔍 Checking ready state:', {
      gridReady,
      phrasesLoaded,
      shakespeareReady: !!this.shakespeareComponent,
      shakespeareComponent: this.shakespeareComponent
    });
    
    if (gridReady && phrasesLoaded && this.shakespeareComponent) {
      console.log('🎉 All components ready! Showing welcome modal...');
      
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        if (this.shakespeareComponent && this.shakespeareComponent.showWelcomeModal) {
          console.log('🎭 Calling showWelcomeModal...');
          this.shakespeareComponent.showWelcomeModal();
        } else {
          console.error('❌ Shakespeare component or showWelcomeModal method not available');
          console.log('shakespeareComponent:', this.shakespeareComponent);
        }
      }, 500);
    } else {
      console.log('⏳ Still waiting for components:', {
        needsGrid: !gridReady,
        needsPhrases: !phrasesLoaded,
        needsShakespeare: !this.shakespeareComponent
      });
    }
  };
  
  // Listen for grid initialization
  document.addEventListener('gridRendererInitialized', (e) => {
    console.log('✅ Grid renderer ready for welcome modal');
    gridReady = true;
    checkReadyState();
  });
  
  // Listen for phrases being loaded
  document.addEventListener('phrasesLoaded', (e) => {
    console.log('✅ Phrases loaded, ready for welcome modal', e.detail);
    phrasesLoaded = true;
    checkReadyState();
  });
  
  // Check if events already fired (in case we're setting up late)
  setTimeout(() => {
    if (!gridReady) {
      console.log('🔍 Checking if grid renderer already exists...');
      if (this.gridRenderer) {
        console.log('✅ Grid renderer found - marking as ready');
        gridReady = true;
        checkReadyState();
      }
    }
    
    if (!phrasesLoaded) {
      console.log('🔍 Checking if phrases already loaded...');
      if (this.phrases && this.phrases.length > 0) {
        console.log('✅ Phrases found - marking as loaded');
        phrasesLoaded = true;
        checkReadyState();
      }
    }
  }, 100);
  
  // Fallback: show welcome modal after a maximum wait time
  setTimeout(() => {
    if (this.shakespeareComponent && !gridReady) {
      console.log('⚠️ Fallback: Showing welcome modal after timeout');
      this.shakespeareComponent.showWelcomeModal();
    } else if (!this.shakespeareComponent) {
      console.error('❌ Fallback failed: Shakespeare component not available after timeout');
    }
  }, 5000); // Increased timeout to 5 seconds
  
  console.log('🎭 Welcome modal trigger setup complete');
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
  
  // FIXED: Clear sea icon decisions before loading new phrase
  if (window.islandRenderer && window.islandRenderer.clearSeaIconDecisions) {
    console.log('Clearing sea icon decisions for new phrase');
    window.islandRenderer.clearSeaIconDecisions();
  }
  
  // Parse letter list from phrase data 
  const phrase = phraseData.phrase;
  
  console.log(`Loading phrase: "${phrase}" with phrase: "${phrase}"`);
  
  // Create the phrase template with underscores using phrase
  this.phraseTemplate = this.createPhraseTemplate(phrase);

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
    this.currentPath = this.pathGenerator.generatePath(phrase);
    
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
  
  // FIXED: Refresh sea icons after island is created
  setTimeout(() => {
    if (window.islandRenderer && window.islandRenderer.applySeaIconsWithBuffer) {
      console.log('Refreshing sea icons for new phrase');
      window.islandRenderer._updateVisibleBounds();
      window.islandRenderer.applySeaIconsWithBuffer();
    }
  }, 500); // Delay to ensure grid is fully rendered
  
  // Optimize the grid view
  setTimeout(() => {
    this.gridRenderer.optimizeGridView();
    console.log("Grid view optimized to minimize empty space");
    
    // FIXED: Apply sea icons again after optimization
    if (window.islandRenderer && window.islandRenderer.applySeaIconsWithBuffer) {
      window.islandRenderer.applySeaIconsWithBuffer();
    }
  }, 800);
  
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
 * Updated loadSampleData method with event dispatch
 * Replace your existing loadSampleData method with this version
 */
async loadSampleData() {
  console.log('Loading sample data for testing...');
  
  // Sample phrase data for testing when CSV isn't available
  const samplePhrase = {
    id: 1,
    phrase: "TIME FLIES LIKE AN ARROW",
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
    usagetype: "Common",
    response: "Ah, thou dost speak of time's swift passage! 'Tis a truth as old as the hills themselves.",
    combined: "A timeless saying about the swift passage of time. This common expression reminds us that time seems to move quickly, much like an arrow shot from a bow travels swiftly to its target."
  };
  
  // Set the sample phrase as our phrases array
  this.phrases = [samplePhrase];
  
  console.log('Sample phrase prepared:', samplePhrase.phrase);
  
  // Use await here since loadPhrase is async
  await this.loadPhrase(samplePhrase);
  
  console.log('Sample data loaded successfully');
  
  // CRITICAL: Dispatch event that phrases have been loaded
  document.dispatchEvent(new CustomEvent('phrasesLoaded', { 
    detail: { 
      phraseCount: 1,
      gameController: this,
      sampleData: true
    }
  }));
  
  console.log('Sample data phrases loaded event dispatched');
}
  
/**
 * Complete loadPhraseData method for GameController
 * Enhanced with debugging, proper error handling, and event dispatching
 * Replace your existing loadPhraseData method with this complete version
 */
async loadPhraseData(csvUrl) {
  try {
    console.log('Starting phrase data loading from:', csvUrl);
    
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
    
    console.log(`CSV data loaded successfully. Size: ${csvData.length} characters`);
    
    // Parse CSV using PapaParse
    const allPhrases = this.parseCSV(csvData);
    
    // ENHANCED DEBUGGING: Check what IDs we actually have
    console.log(`Total phrases loaded: ${allPhrases.length}`);
    
    // Validate that we have phrases
    if (!allPhrases || allPhrases.length === 0) {
      throw new Error('No phrases found in CSV data');
    }
    
    // Get all unique IDs and sort them
    const allIds = allPhrases.map(phrase => parseInt(phrase.id, 10))
                           .filter(id => !isNaN(id))
                           .sort((a, b) => a - b);
    
    console.log(`ID range in CSV: ${Math.min(...allIds)} to ${Math.max(...allIds)}`);
    console.log(`Total valid numeric IDs: ${allIds.length}`);
    
    // Check specifically for IDs in our target range (Shakespeare phrases)
    const idsInRange = allIds.filter(id => id >= 3001 && id <= 3100);
    console.log(`IDs in range 3001-3100: ${idsInRange.length}`);
    console.log(`Actual IDs in range:`, idsInRange);
    
    // Check for gaps in the sequence
    if (idsInRange.length > 0) {
      const minId = Math.min(...idsInRange);
      const maxId = Math.max(...idsInRange);
      console.log(`ID range found: ${minId} to ${maxId}`);
      
      // Find missing IDs in the range
      const missingIds = [];
      for (let i = minId; i <= maxId; i++) {
        if (!idsInRange.includes(i)) {
          missingIds.push(i);
        }
      }
      
      if (missingIds.length > 0) {
        console.log(`Missing IDs in sequence: ${missingIds.slice(0, 10).join(', ')}${missingIds.length > 10 ? '...' : ''}`);
      }
    }
    
    // Filter phrases to only those with IDs between 3001-3100 (Shakespeare range)
    const shakespearePhrases = allPhrases.filter(phrase => {
      const id = parseInt(phrase.id, 10);
      return !isNaN(id) && id >= 3001 && id <= 3100;
    });
    
    console.log(`Filtered Shakespeare phrases: ${shakespearePhrases.length}`);
    
    // Show first and last few phrases to verify the range
    if (shakespearePhrases.length > 0) {
      console.log('First 5 Shakespeare phrases:');
      shakespearePhrases.slice(0, 5).forEach(phrase => {
        console.log(`  ID ${phrase.id}: "${phrase.phrase}"`);
      });
      
      if (shakespearePhrases.length > 5) {
        console.log('Last 5 Shakespeare phrases:');
        shakespearePhrases.slice(-5).forEach(phrase => {
          console.log(`  ID ${phrase.id}: "${phrase.phrase}"`);
        });
      }
    }
    
    // Determine which phrase set to use
    if (shakespearePhrases.length === 0) {
      console.warn('No phrases found in ID range 3001-3100, using all phrases');
      this.phrases = allPhrases;
    } else {
      this.phrases = shakespearePhrases;
    }
    
    // Validate phrase data structure
    if (this.phrases.length > 0) {
      const samplePhrase = this.phrases[0];
      console.log('Sample phrase structure:', Object.keys(samplePhrase));
      
      // Check for required fields
      const requiredFields = ['id', 'phrase'];
      const missingFields = requiredFields.filter(field => !samplePhrase.hasOwnProperty(field));
      if (missingFields.length > 0) {
        console.warn('Missing required fields in phrase data:', missingFields);
      }
    }
    
    // Load a random phrase
    if (this.phrases.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.phrases.length);
      const randomPhrase = this.phrases[randomIndex];
      
      console.log(`Selected random phrase ${randomIndex + 1} of ${this.phrases.length}`);
      console.log('Loading random Shakespeare phrase ID:', randomPhrase.id);
      console.log('Phrase text:', `"${randomPhrase.phrase}"`);
      
      // Load the selected phrase
      await this.loadPhrase(randomPhrase);
      
      console.log('Phrase loading completed successfully');
    } else {
      console.warn('No phrases found in CSV, falling back to sample data');
      await this.loadSampleData();
    }
    
    // CRITICAL: Dispatch event that phrases have been loaded
    document.dispatchEvent(new CustomEvent('phrasesLoaded', { 
      detail: { 
        phraseCount: this.phrases.length,
        gameController: this,
        csvUrl: csvUrl,
        shakespearePhrases: shakespearePhrases.length > 0
      }
    }));
    
    console.log('Phrases loaded event dispatched');
    
    return this.phrases;
    
  } catch (error) {
    console.error('Error loading phrase data:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      csvUrl: csvUrl
    });
    
    // Fall back to sample data on any error
    console.log('Falling back to sample data due to error');
    await this.loadSampleData();
    
    // Still dispatch the event even with sample data
    document.dispatchEvent(new CustomEvent('phrasesLoaded', { 
      detail: { 
        phraseCount: 1,
        gameController: this,
        sampleData: true,
        error: error.message
      }
    }));
    
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
 * FIXED: parseWordBoundaries to properly handle apostrophes as part of words
 * Apostrophes should be treated as punctuation WITHIN words, not word separators
 */
parseWordBoundaries() {
  console.log('Parsing word boundaries (FIXED VERSION)');
  
  if (!this.currentPhrase || !this.currentPhrase.phrase) {
    console.log('No current phrase to parse');
    return;
  }
  
  const phrase = this.currentPhrase.phrase;
  this.wordBoundaries = [];
  
  let currentWordStart = null;
  let inWord = false;
  
  // Parse through the phrase character by character
  for (let i = 0; i < phrase.length; i++) {
    const char = phrase[i];
    
    // CRITICAL FIX: Alphanumeric characters AND apostrophes are considered part of words
    // Only spaces and other punctuation (except apostrophes) end words
    const isWordChar = /[a-zA-Z0-9']/.test(char);
    
    if (isWordChar && !inWord) {
      // Start of a new word
      currentWordStart = i;
      inWord = true;
    } else if (!isWordChar && inWord) {
      // End of a word - only include if it has at least one character
      if (i > currentWordStart) {
        this.wordBoundaries.push({
          start: currentWordStart,
          end: i - 1,
          word: phrase.substring(currentWordStart, i)
        });
      }
      inWord = false;
    }
  }
  
  // Handle case where phrase ends with a word
  if (inWord) {
    this.wordBoundaries.push({
      start: currentWordStart,
      end: phrase.length - 1,
      word: phrase.substring(currentWordStart)
    });
  }
  
  console.log('Word boundaries parsed (FIXED):', this.wordBoundaries);
  
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

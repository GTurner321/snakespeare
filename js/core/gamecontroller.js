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
    // Random fill percentage is now used for the adjacent-cell filling algorithm
    // A value of 0 means no random filling at all
  };
  
  // Override default gridSize if provided with correct structure
  if (options.gridSize) {
    // Make sure we have proper objects with width/height properties
    if (options.gridSize.mobile) {
      // If it's already an object with width/height, use it
      if (typeof options.gridSize.mobile.width === 'number' && 
          typeof options.gridSize.mobile.height === 'number') {
        this.options.gridSize.mobile = options.gridSize.mobile;
      } 
      // If it's just a number, convert to object (backwards compatibility)
      else if (typeof options.gridSize.mobile === 'number') {
        console.warn('Deprecated: gridSize.mobile should be an object with width/height properties');
        this.options.gridSize.mobile = { 
          width: options.gridSize.mobile, 
          height: options.gridSize.mobile 
        };
      }
    }
    
    if (options.gridSize.desktop) {
      // If it's already an object with width/height, use it
      if (typeof options.gridSize.desktop.width === 'number' && 
          typeof options.gridSize.desktop.height === 'number') {
        this.options.gridSize.desktop = options.gridSize.desktop;
      } 
      // If it's just a number, convert to object (backwards compatibility)
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
  this.highestIslandReductionLevelUsed = 0; // Track the highest island reduction level used
    
  // Initialize components
  this.pathGenerator = new PathGenerator();
  
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
  // This ensures the grid element exists for proper positioning
  this.scrollHandler = new ArrowButtons(this.gridRenderer, {
    gameContainerId: this.options.gameContainerId
  });
  
  // Set up menu handlers
  this.setupMenuHandlers();

  const levelDisplay = document.getElementById('hint-level-display');
  if (levelDisplay) {
    levelDisplay.textContent = this.gridRenderer.hintLevel;
  }
    
  // NEW: Add event listener for revealed letters
  document.addEventListener('revealedLettersUpdated', (e) => {
    this.updatePhraseWithHints();
  });
  
  // Add window resize handler
  window.addEventListener('resize', () => {
    this.handleResize();
  });

  // Dispatch custom event for initialization complete
  document.dispatchEvent(new CustomEvent('gameInitialized', { 
    detail: { controller: this }
  }));

  // Initialize Shakespeare component
  this.initShakespeareComponent();
}
  
/**
 * Sets up the menu handlers for the hamburger menu
 * Creates 5 menu options: New Phrase, Reset Selections, and 3 hint levels
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
  
  // Step 3: Create menu items - UPDATED with island reduction levels
const menuItems = [
  { id: 'new-phrase-button', text: 'New Phrase', action: () => this.loadRandomPhrase() },
  { id: 'reset-selections-button', text: 'Reset Selections', action: () => this.resetSelections() },
  { id: 'separator-1', text: 'divider', type: 'separator' },
  { id: 'hint-level-1-button', text: 'Hint Level 1 (15%)', action: () => this.setHintLevel(1), hintLevel: 1 },
  { id: 'hint-level-2-button', text: 'Hint Level 2 (25%)', action: () => this.setHintLevel(2), hintLevel: 2 },
  { id: 'hint-level-3-button', text: 'Hint Level 3 (35%)', action: () => this.setHintLevel(3), hintLevel: 3 },
  { id: 'separator-2', text: 'divider', type: 'separator' },
  { id: 'island-level-1-button', text: 'Reduce Islands 1', action: () => this.setIslandReductionLevel(1), islandLevel: 1 },
  { id: 'island-level-2-button', text: 'Reduce Islands 2', action: () => this.setIslandReductionLevel(2), islandLevel: 2 }
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
    
    // Add special classes for hint and island reduction buttons
if (item.hintLevel) {
  button.classList.add('hint-button');
} else if (item.islandLevel !== undefined) {
  button.classList.add('hint-button'); // Use hint-button instead of island-button
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
      
      // For island reduction buttons, check if they're disabled
      if (item.islandLevel !== undefined && 
          item.islandLevel < this.highestIslandReductionLevelUsed) {
        console.log(`Island reduction level ${item.islandLevel} is disabled`);
        return; // Don't execute the action
      }
      
      // Execute the action
      item.action();
      
      // Update button styles
      if (item.hintLevel) {
        this.updateHintButtonStyles();
      } else if (item.islandLevel !== undefined) {
        this.updateIslandReductionButtonStyles();
      } else {
        // Close the menu for non-hint/non-island buttons
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
  
  // Step 7: Initialize hint level and island reduction level
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
  
  this.resetIslandReductionLevel = () => {
    if (this.gridRenderer) {
      console.log('Resetting island reduction level to 0');
      this.gridRenderer.islandReductionLevel = 0;
      this.gridRenderer.highestIslandReductionLevelUsed = 0;
      this.highestIslandReductionLevelUsed = 0;
      
      // Update island reduction button styles
      document.querySelectorAll('.island-button').forEach(btn => {
        btn.classList.remove('active-island');
      });
    }
  };
  
  // Initialize with no hints and default island reduction level
  if (this.gridRenderer) {
    this.gridRenderer.setHintLevel(0);
    this.gridRenderer.islandReductionLevel = 0;
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
  
/**
 * Handle changes to the selected cells
 * Modified to check for the correct phrase
 */
handleSelectionChange() {
  // Get selected letters
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  
  // Update phrase display with currently selected letters
  this.updatePhraseWithHints();
  
  // Update scroll area states
  if (this.scrollHandler.updateScrollAreaStates) {
    this.scrollHandler.updateScrollAreaStates();
  }
  
  // Adjust phrase display height after content change
  if (this.scrollHandler.adjustPhraseDisplayHeight) {
    setTimeout(() => {
      this.scrollHandler.adjustPhraseDisplayHeight();
    }, 50);
  }
  
  // Check if the phrase is completed
  if (!this.gridRenderer.isCompleted && this.checkPhraseCompleted()) {
    console.log('Phrase completed! Checking if it is correct...');
    
    // Check if the completed phrase is correct
    const isCorrectPhrase = this.isCorrectPhrase();
    
    // Set completed state with correctness flag
    this.gridRenderer.setCompleted(true, isCorrectPhrase);
    
    if (isCorrectPhrase) {
      console.log('Correct phrase! Turning path green.');
      // Show success message
      this.showSuccessMessage();
    } else {
      console.log('Phrase length complete but incorrect. Path will not turn green.');
      this.showIncorrectMessage();
    }
  }
}

/**
 * New method to check if the selected phrase is correct
 * Compares the selected letters against the expected phrase
 * @return {boolean} True if the phrase is correct
 */
isCorrectPhrase() {
  if (!this.currentPhrase) return false;
  
  // Get the expected phrase letters (excluding spaces and punctuation)
  const expectedLetters = this.parseExpectedLetters();
  
  // Get the selected letters
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  
  // If the counts don't match, it cannot be correct
  if (selectedLetters.length !== expectedLetters.length) {
    console.log(`Letter count mismatch: selected ${selectedLetters.length}, expected ${expectedLetters.length}`);
    return false;
  }
  
  // Check against pre-defined path
  // This is a stricter check that requires following the exact path
  const allOnCorrectPath = this.checkIfSelectionFollowsPath(selectedLetters);
  
  // For debugging
  console.log(`Phrase check - all on correct path: ${allOnCorrectPath}`);
  
  return allOnCorrectPath;
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
  
/**
 * Updated fillPhraseTemplate method to show actual selected letters in sequence
 * @param {string} template - The phrase template with underscores for letters
 * @param {string} phrase - The correct phrase
 * @param {Array} selectedLetters - Array of selected cell objects
 * @return {string} Updated template with selected letters filled in
 */
fillPhraseTemplate(template, phrase, selectedLetters) {
  // Check if we have empty input
  if (!template || !phrase || !selectedLetters) {
    return template || '';
  }
  
  // Create array from template
  const templateArray = template.split('');
  
  // Only use letters that actually have content
  const validSelectedLetters = selectedLetters.filter(cell => 
    cell.letter && cell.letter.trim() !== '');
  
  // Check if the start cell is selected
  const startCellIsSelected = this.gridRenderer && 
                             this.gridRenderer.grid[25][25] && 
                             this.gridRenderer.grid[25][25].isSelected;
  
  // Count positions that need letters (underscores)
  const letterPositions = [];
  for (let i = 0; i < templateArray.length; i++) {
    if (templateArray[i] === '_') {
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
 * Updated updatePhraseWithHints method to show actual selected letters in sequence
 */
updatePhraseWithHints() {
  if (!this.gridRenderer || !this.currentPhrase || !this.phraseTemplate) {
    return;
  }
  
  // Get the display element
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return;
  
  // Create copy of the template
  let updatedTemplate = this.phraseTemplate;
  
  // Get revealed letters from grid renderer (for hints)
  const revealedLetters = this.gridRenderer.getRevealedLetters();
  console.log('Revealed letters count for phrase display:', revealedLetters.length);
  
  // Apply revealed hint letters to template
  if (revealedLetters.length > 0) {
    updatedTemplate = this.fillPhraseTemplateWithHints(
      this.phraseTemplate,
      this.currentPhrase.letterlist,
      revealedLetters
    );
  }
  
  // Now update with user-selected letters - these will override any hint letters
  // as the user actively builds their own path
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  if (selectedLetters.length > 0) {
    updatedTemplate = this.fillPhraseTemplate(
      updatedTemplate,
      this.currentPhrase.letterlist,
      selectedLetters
    );
  }
  
  // Display the updated template
  displayElement.textContent = updatedTemplate;
  
  // Adjust phrase display height
  if (this.scrollHandler && this.scrollHandler.adjustPhraseDisplayHeight) {
    this.scrollHandler.adjustPhraseDisplayHeight();
  }
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
      console.log(`Path position ${pathPosition} maps to phrase position ${i} (letter: ${phrase[i]})`);
      pathPosition++;
    }
  }
  
  // Now map each revealed letter to its correct position in the phrase
  for (const revealedCell of revealedLetters) {
    const phrasePosition = pathIndexToCharPosition.get(revealedCell.pathIndex);
    
    if (phrasePosition !== undefined) {
      console.log(`Revealing letter at path index ${revealedCell.pathIndex}, phrase position ${phrasePosition}: ${phraseArray[phrasePosition]}`);
      templateArray[phrasePosition] = phraseArray[phrasePosition];
    } else {
      console.warn(`No phrase position found for path index ${revealedCell.pathIndex}`);
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
 * Display a success message when the correct phrase is found
 */
showSuccessMessage() {
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
    messageContainer.style.backgroundColor = 'rgba(0, 180, 0, 0.8)';
    messageContainer.style.color = 'white';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.fontWeight = 'bold';
    messageContainer.style.zIndex = '1000';
    messageContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    document.getElementById(this.options.gameContainerId).appendChild(messageContainer);
  }

  // Set success message
  messageContainer.textContent = 'Correct! You found the phrase!';
  
  // Add meaning if available
  if (this.currentPhrase.meaning) {
    const meaningEl = document.createElement('div');
    meaningEl.className = 'phrase-meaning';
    meaningEl.textContent = `Meaning: ${this.currentPhrase.meaning}`;
    meaningEl.style.marginTop = '5px';
    meaningEl.style.fontSize = '0.9em';
    messageContainer.appendChild(meaningEl);
  }
  
  // Show message
  messageContainer.style.display = 'block';
  
  // Hide after a delay
  setTimeout(() => {
    messageContainer.style.display = 'none';
  }, 5000);
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

updateIslandReductionButtonStyles() {
  // Get all island reduction buttons by ID pattern
  const islandButtons = document.querySelectorAll('[id^="island-level-"]');
  
  // Update each button
  islandButtons.forEach(button => {
    // Extract level from button ID (island-level-X-button)
    const buttonLevel = parseInt(button.id.split('-')[2], 10);
    
    // Remove any existing state classes
    button.classList.remove('active-hint', 'disabled-hint');
    
    // Current level - active
    if (buttonLevel === this.gridRenderer.islandReductionLevel) {
      button.classList.add('active-hint');
    }
    
    // Lower than highest used - disabled
    if (buttonLevel < this.highestIslandReductionLevelUsed) {
      button.classList.add('disabled-hint');
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
    
    // Force a grid re-render immediately
    this.gridRenderer.renderVisibleGrid();
    
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
  
// Modified loadPhrase method to use adjacent random letters
loadPhrase(phraseData) {
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
  
  // Track generation attempts
  let generationSuccessful = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 5; // Maximum number of generation attempts
  
  // Try generating the path up to MAX_ATTEMPTS times
  while (!generationSuccessful && attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`Path generation attempt #${attempts}`);
    
    // Generate path using path generator (will filter out non-alphanumerics)
    this.currentPath = this.pathGenerator.generatePath(letterList);
    
    // Apply path to grid renderer and check if successful
    generationSuccessful = this.gridRenderer.setPath(this.currentPath);
    
    if (!generationSuccessful) {
      console.warn(`Path generation attempt #${attempts} failed - retrying...`);
      // Wait a tiny bit before retrying to avoid tight loop
      // and allow for different random paths
      if (attempts < MAX_ATTEMPTS) {
        // Force seed randomization between attempts
        this.pathGenerator.shuffleArray([1, 2, 3, 4, 5]);
      }
    }
  }
  
  if (!generationSuccessful) {
    console.error(`Failed to generate valid path after ${MAX_ATTEMPTS} attempts. Phrase may be too long.`);
    // Optionally: Show an error message to the user or choose a different phrase
    // For now, we'll continue with the partial path
  }
  
  // NEW: Generate and apply adjacent random letters
  // Pre-generate random letter cells for all island reduction levels
  if (generationSuccessful && this.options.randomFillPercentage > 0) {
    // Pre-generate cells for all levels
    this.pathGenerator.preGenerateRandomLetterCells();
    
    // Reset the island reduction level to 0 (default)
    this.highestIslandReductionLevelUsed = 0;
    this.gridRenderer.islandReductionLevel = 0;
    this.gridRenderer.highestIslandReductionLevelUsed = 0;

    // Update the button styles
    this.updateIslandReductionButtonStyles();

    console.log('Island reduction level reset to 0 for new phrase');
    
    // Apply default level (0)
    this.gridRenderer.applyIslandReductionLetters(this.pathGenerator);
    console.log(`Applied random letters for default island reduction level 0`);
    
    // Update the button styles
    this.updateIslandReductionButtonStyles();
    
    // Apply hints after random letters are added
    setTimeout(() => {
      this.gridRenderer.revealPathLetters();
    }, 50);
  } else {
    // If no random letters or generation failed, reveal hints immediately
    if (generationSuccessful) {
      // After the path is set, explicitly regenerate hint indices
      this.gridRenderer.preGenerateHintIndices();
      console.log("Hint indices generated after path was set");
    }
  }
  
  // Center the grid on the start cell
  this.gridRenderer.centerGridOnStartCell();
  
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
  
  // Clear any additional elements
  const meaningEl = document.querySelector('.phrase-meaning');
  if (meaningEl) {
    meaningEl.remove();
  }
  
  // If generation failed after all attempts, maybe load a different phrase
  if (!generationSuccessful) {
    // Optional: Uncomment to automatically try a different phrase
    // setTimeout(() => this.loadRandomPhrase(), 500);
  }
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
 */
loadSampleData() {
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
  
  this.loadPhrase(samplePhrase);
}
  
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
      this.loadPhrase(randomPhrase);
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
 * Load a random phrase from the loaded phrases
 */
loadRandomPhrase() {
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
  this.loadPhrase(randomPhrase);
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
  // Get all hint buttons
  const hintButtons = document.querySelectorAll('.hint-button');
  
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

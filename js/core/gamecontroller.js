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
  
setupMenuHandlers() {
  // First, set up the menu toggle button functionality
  const menuToggle = document.getElementById('menu-toggle');
  const menuDropdown = document.getElementById('menu-dropdown');
  
  if (menuToggle && menuDropdown) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent document click from immediately closing
      menuToggle.classList.toggle('active');
      menuDropdown.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuToggle.classList.remove('active');
        menuDropdown.classList.remove('active');
      }
    });
  }
  
  // New phrase button
  const newPhraseButton = document.getElementById('new-phrase-button');
  if (newPhraseButton) {
    newPhraseButton.addEventListener('click', () => {
      this.loadRandomPhrase();
      menuDropdown.classList.remove('active');
      menuToggle.classList.remove('active');
    });
  }
  
  // Reset selections button
  const resetSelectionsButton = document.getElementById('reset-selections-button');
  if (resetSelectionsButton) {
    resetSelectionsButton.addEventListener('click', () => {
      this.resetSelections();
      menuDropdown.classList.remove('active');
      menuToggle.classList.remove('active');
    });
  }
  
  // Create hint level buttons with descriptive labels
  // First, ensure the menu dropdown exists
  if (!menuDropdown) {
    console.error('Menu dropdown not found. Cannot add hint level buttons.');
    return;
  }
  
  // Remove any existing hint level buttons
  const existingHintButtons = menuDropdown.querySelectorAll('[id^="hint-level-"]');
  existingHintButtons.forEach(button => button.remove());
  
  // Create hint level options with clear labels
  const hintLevels = [
    { level: 0, label: "No Hints" },
    { level: 1, label: "Reveal 1 (15%)" },
    { level: 2, label: "Reveal 2 (25%)" },
    { level: 3, label: "Reveal 3 (35%)" }
  ];
  
  // Add each hint level button to the menu
  hintLevels.forEach(hint => {
    const hintButton = document.createElement('button');
    hintButton.id = `hint-level-${hint.level}`;
    hintButton.className = 'menu-item hint-button';
    hintButton.textContent = hint.label;
    
    // Highlight the current active hint level
    if (this.gridRenderer && this.gridRenderer.hintLevel === hint.level) {
      hintButton.classList.add('active-hint');
    }
    
    hintButton.addEventListener('click', () => {
      // Set the hint level
      this.setHintLevel(hint.level);
      
      // Update active class on all hint buttons
      document.querySelectorAll('.hint-button').forEach(btn => {
        btn.classList.remove('active-hint');
      });
      hintButton.classList.add('active-hint');
      
      // Close menu
      menuDropdown.classList.remove('active');
      menuToggle.classList.remove('active');
    });
    
    menuDropdown.appendChild(hintButton);
  });
  
  console.log('Menu handlers and hint buttons set up successfully');
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
 */
handleSelectionChange() {
  // Get selected letters
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  
  // Update phrase display with currently selected letters
  // CHANGED: Use the new method instead of updatePhraseFromSelections
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
    console.log('Phrase completed!');
    this.gridRenderer.setCompleted(true);
    
    // Optional: Add a visual or audio indicator of completion
    // For example, flash the phrase display or show a congratulations message
  }
}
  
  createPhraseTemplate(phrase) {
    // Only replace alphanumeric characters with underscores
    // Keep spaces, punctuation and other special characters as is
    return phrase.replace(/[a-zA-Z0-9]/g, '_');
  }
  
  fillPhraseTemplate(template, phrase, selectedLetters) {
    // Check if we have empty input
    if (!template || !phrase || !selectedLetters) {
      return template || '';
    }
    
    // Log for debugging
    console.log('Filling phrase template:');
    console.log('- Template:', template);
    console.log('- Phrase:', phrase);
    console.log('- Selected letters:', selectedLetters.map(l => l.letter).join(''));
    
    const templateArray = template.split('');
    const phraseArray = phrase.toUpperCase().split('');
    
    // Only use letters that actually have content
    const validSelectedLetters = selectedLetters.filter(cell => 
      cell.letter && cell.letter.trim() !== '');
    
    // Log the filtered letters
    console.log('- Valid selected letters:', validSelectedLetters.map(l => l.letter).join(''));
    
    // Get the alphanumeric characters from the phrase (matching the path filtering)
    const alphanumericFromPhrase = phrase.split('')
      .filter(char => /[a-zA-Z0-9]/.test(char));
    
    console.log('- Alphanumeric chars in phrase:', alphanumericFromPhrase.join(''));
    console.log('- Selected letter count:', validSelectedLetters.length);
    
    // Create a mapping of underscore positions to selected letters
    let filledLetterIndex = 0;
    
    // Go through each character in the phrase
    for (let i = 0; i < phrase.length; i++) {
      const phraseChar = phrase.charAt(i);
      
      // If this character is alphanumeric (and thus has an underscore in the template)
      if (/[a-zA-Z0-9]/.test(phraseChar)) {
        // Check if we have a selected letter for this position
        if (filledLetterIndex < validSelectedLetters.length) {
          // Fill the underscore with the actual letter from the phrase
          templateArray[i] = phraseArray[i];
          filledLetterIndex++;
        }
      }
    }
    
    const result = templateArray.join('');
    console.log('- Result:', result);
    return result;
  }


updatePhraseWithHints() {
  if (!this.gridRenderer || !this.currentPhrase || !this.phraseTemplate) {
    return;
  }
  
  // Get the display element
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement) return;
  
  // Create copy of the template
  let updatedTemplate = this.phraseTemplate;
  
  // Get revealed letters from grid renderer
  const revealedLetters = this.gridRenderer.getRevealedLetters();
  console.log('Revealed letters count for phrase display:', revealedLetters.length);
  
  // Fill in revealed letters directly into the phrase template
  if (revealedLetters.length > 0) {
    updatedTemplate = this.fillPhraseTemplateWithHints(
      this.phraseTemplate,
      this.currentPhrase.letterlist,
      revealedLetters
    );
  }
  
  // Now update with any user-selected letters
  const selectedLetters = this.gridRenderer.getSelectedLetters();
  updatedTemplate = this.fillPhraseTemplate(
    updatedTemplate,
    this.currentPhrase.letterlist,
    selectedLetters
  );
  
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
  
  // Log inputs for debugging
  console.log('--------- fillPhraseTemplateWithHints ---------');
  console.log('Template:', template);
  console.log('Phrase:', phrase);
  console.log('Revealed letters count:', revealedLetters.length);
  
  const templateArray = template.split('');
  const phraseArray = phrase.toUpperCase().split('');
  
  // Get the alphanumeric characters from the phrase
  const alphanumericChars = phrase.split('').filter(char => /[a-zA-Z0-9]/.test(char));
  console.log('Alphanumeric characters in phrase:', alphanumericChars.join(''));
  console.log('Total alphanumeric chars:', alphanumericChars.length);
  
  // Create a mapping of path indices to phrase positions
  let alphaIndex = 0;
  const pathIndexToCharPos = new Map();
  
  for (let i = 0; i < phrase.length; i++) {
    if (/[a-zA-Z0-9]/.test(phrase[i])) {
      pathIndexToCharPos.set(alphaIndex, i);
      console.log(`Path index ${alphaIndex} maps to phrase position ${i} (char: ${phrase[i]})`);
      alphaIndex++;
    }
  }
  
  // Fill in revealed letters in the template
  for (const revealedCell of revealedLetters) {
    // Check if this is the start cell - should never be revealed
    if (revealedCell.pathIndex === 0) {
      console.warn('WARNING: Start cell (index 0) is in revealed letters! This should not happen.');
      continue; // Skip the start cell
    }
    
    // Get the phrase position for this path index
    const phrasePos = pathIndexToCharPos.get(revealedCell.pathIndex);
    
    if (phrasePos !== undefined) {
      console.log(`Revealing letter at path index ${revealedCell.pathIndex}, phrase pos ${phrasePos}: ${phraseArray[phrasePos]}`);
      // Use the letter from the phrase rather than the cell's letter to ensure consistency
      templateArray[phrasePos] = phraseArray[phrasePos];
    } else {
      console.warn(`No phrase position found for path index ${revealedCell.pathIndex}`);
    }
  }
  
  const result = templateArray.join('');
  console.log('Final template after applying hints:', result);
  console.log('----------------------------------------');
  return result;
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
  
  // Fixed checkPhraseCompleted method in GameController.js
  checkPhraseCompleted() {
    if (!this.currentPhrase) return false;
    
    // Get selected letters - including the start cell
    const selectedLetters = this.gridRenderer.getSelectedLetters();
    
    // Skip the start cell if it doesn't have a letter
    const validSelectedLetters = selectedLetters.filter(cell => cell.letter.trim() !== '');
    
    // Count non-space characters in the letterlist that would be part of the path
  // IMPORTANT: We need to skip the first letter since it corresponds to the start cell
  const letterListArray = this.currentPhrase.letterlist.split('');
  const letterCountInPath = letterListArray
    .filter(char => /[a-zA-Z0-9]/.test(char))
    .length - 1; // Subtract 1 to exclude the first letter (start cell)
    
    console.log('Letter count check:', {
      validSelectedCount: validSelectedLetters.length,
      letterCountInPath: letterCountInPath
    });
    
    // Check if we've selected exactly the right number of letters
    // IMPORTANT: Make sure we're comparing the correct counts
    const isCompleted = validSelectedLetters.length === letterCountInPath;
    
    // If newly completed, dispatch an event
    if (isCompleted && !this.gridRenderer.isCompleted) {
      console.log('Phrase completed!');
      
      // Event is dispatched by the GridRenderer when setCompleted is called
      this.gridRenderer.setCompleted(true);
    }
    
    return isCompleted;
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
  if (generationSuccessful && this.options.randomFillPercentage > 0) {
    const randomLetters = this.pathGenerator.generateAdjacentRandomLetters();
    this.gridRenderer.applyAdjacentRandomLetters(randomLetters);
    console.log(`Applied ${randomLetters.length} adjacent random letters based on path`);
    
    // NEW: Apply hints after random letters are added
    // A slight delay to ensure random letters are fully applied
    setTimeout(() => {
      this.gridRenderer.revealPathLetters();
    }, 50);
  } else {
    // If no random letters or generation failed, reveal hints immediately
    if (generationSuccessful) {
      this.gridRenderer.revealPathLetters();
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
    this.gridRenderer.setHintLevel(level);
    
    // Update phrase display with revealed letters
    this.updatePhraseWithHints();
    
    console.log(`Hint level set to ${level} (${this.gridRenderer.hintLevelPercentages[level] * 100}%)`);
  }
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
  }
}

// Export class for use in other modules
export default GameController;

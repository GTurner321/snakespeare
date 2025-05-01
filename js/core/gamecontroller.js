/**
 * Game Controller for Grid Game
 * Coordinates pathGenerator, gridRenderer, and scroll areas
 * Handles CSV data loading and game state management
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
      randomFillPercentage: options.randomFillPercentage || 0,
      // fill percentage of random cells is being passed through here
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
    this.phraseTemplate = null; // New: Store the underscores template
    
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
    
    // Add window resize handler
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Dispatch custom event for initialization complete
    document.dispatchEvent(new CustomEvent('gameInitialized', { 
      detail: { controller: this }
    }));
  }
  
  /**
   * Set up menu button handlers
   */
  setupMenuHandlers() {
    // New phrase button
    const newPhraseButton = document.getElementById('new-phrase-button');
    if (newPhraseButton) {
      newPhraseButton.addEventListener('click', () => {
        this.loadRandomPhrase();
        document.getElementById('menu-dropdown').classList.remove('active');
        document.getElementById('menu-toggle').classList.remove('active');
      });
    }
    
    // Reset selections button
    const resetSelectionsButton = document.getElementById('reset-selections-button');
    if (resetSelectionsButton) {
      resetSelectionsButton.addEventListener('click', () => {
        this.resetSelections();
        document.getElementById('menu-dropdown').classList.remove('active');
        document.getElementById('menu-toggle').classList.remove('active');
      });
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
  
  /**
   * Handle changes to the selected cells
   */
  handleSelectionChange() {
    // Get selected letters
    const selectedLetters = this.gridRenderer.getSelectedLetters();
    
    // Update phrase display with currently selected letters
    this.updatePhraseFromSelections(selectedLetters);
    
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
  }
  
  /**
   * Create a template for the phrase with underscores for letters and spaces preserved
   * @param {string} phrase - The complete phrase
   * @return {string} Template with underscores for letters and preserved spaces
   */
  createPhraseTemplate(phrase) {
    return phrase.replace(/[a-zA-Z0-9]/g, '_');
  }
  
/**
 * Fill in the phrase template with selected letters
 * @param {string} template - The underscore template
 * @param {string} phrase - The complete phrase
 * @param {Array} selectedLetters - Array of selected letter objects
 * @return {string} Updated template with selected letters filled in
 */
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
  
  // Start with no letters filled in
  let filledCount = 0;
  
  // CRITICAL FIX: Only use the actual selected letters, not the starting cell
  // The issue was the selectedLetters starts with the start cell, which might be empty
  const validSelectedLetters = selectedLetters.filter(cell => cell.letter.trim() !== '');
  
  // Log the filtered letters
  console.log('- Valid selected letters:', validSelectedLetters.map(l => l.letter).join(''));
  
  // Go through the phrase character by character
  for (let i = 0; i < phraseArray.length; i++) {
    // Skip spaces and non-letter characters in the phrase
    if (phraseArray[i] === ' ' || template[i] !== '_') continue;
    
    // Check if we have this many selected letters
    if (filledCount < validSelectedLetters.length) {
      // Replace the underscore with the character from the phrase
      templateArray[i] = phraseArray[i];
      filledCount++;
    }
  }
  
  const result = templateArray.join('');
  console.log('- Result:', result);
  return result;
}

/**
 * Update the phrase display based on selected cells
 * @param {Array} selectedLetters - Array of letter objects
 */
updatePhraseFromSelections(selectedLetters) {
  const displayElement = document.getElementById('phrase-text');
  if (!displayElement || !this.currentPhrase) return;
  
  // Debug: log the selected letters
  console.log('Updating phrase from selections:');
  console.log('- Selected letters:', selectedLetters.map(l => `${l.letter || '[empty]'}`).join(', '));
  
  // If we have a phrase and template
  if (this.phraseTemplate) {
    // Fill in the template with selected letters
    const updatedDisplay = this.fillPhraseTemplate(
      this.phraseTemplate,
      this.currentPhrase.phrase,
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
   * Load a phrase from the phrase data
   * @param {Object} phraseData - Data for the phrase to load
   */
  loadPhrase(phraseData) {
    this.currentPhrase = phraseData;
    
    // Reset any highlighting
    this.gridRenderer.options.highlightPath = false;
    
    // Parse letter list from phrase data (now with spaces)
    const letterList = phraseData.letterlist;
    
    console.log(`Loading phrase: "${phraseData.phrase}" with letterlist: "${letterList}"`);
    
    // Create the phrase template with underscores
    this.phraseTemplate = this.createPhraseTemplate(phraseData.phrase);
    
    // Generate path using path generator (will filter out spaces)
    this.currentPath = this.pathGenerator.generatePath(letterList);
    
    // Apply path to grid renderer
    this.gridRenderer.setPath(this.currentPath);
    
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
  
  /**
   * Load phrases from CSV data
   * @param {string} csvUrl - URL to the CSV file containing phrases
   * @return {Promise<Array>} Promise resolving to array of phrase objects
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
      
      // Parse CSV using PapaParse (imported via CDN in index.html)
      const phrases = this.parseCSV(csvData);
      
      console.log(`Loaded ${phrases.length} phrases from CSV`);
      
      // Store phrase data
      this.phrases = phrases;
      
      // Load a random phrase instead of the first one
      if (phrases.length > 0) {
        // Pick a random phrase index
        const randomIndex = Math.floor(Math.random() * phrases.length);
        const randomPhrase = phrases[randomIndex];
        
        // Load the random phrase
        this.loadPhrase(randomPhrase);
        console.log('Loaded random phrase:', randomPhrase.phrase);
      } else {
        console.warn('No phrases found in CSV');
        this.loadSampleData();
      }
      
      return phrases;
    } catch (error) {
      console.error('Error loading phrase data:', error);
      // Load sample data as fallback
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
      // Use PapaParse for more robust CSV parsing
      const result = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Convert numeric values automatically
        transform: (value, field) => {
          // Trim whitespace from all string values
          return typeof value === 'string' ? value.trim() : value;
        }
      });
      
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

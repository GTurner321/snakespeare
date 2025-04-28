/**
 * Game Controller for Grid Game
 * Coordinates pathGenerator, gridRenderer, and arrowButtons
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
      randomFillPercentage: options.randomFillPercentage || 0.5,
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
    
    // Initialize arrow buttons
    this.arrowButtons = new ArrowButtons(this.gridRenderer, {
      container: this.options.gameContainerId,
      buttonHeight: this.options.cellSize * 2.5,  // 2.5 squares height
      buttonDepth: this.options.cellSize * 0.75   // 0.75 square depth
    });
    
    // Add window resize handler
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Create refresh button
    this.createRefreshButton();
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
    
    // Update arrow button states in case scrolling limits have changed
    this.arrowButtons.updateButtonStates();
  }
  
  /**
   * Update the phrase display based on selected cells
   * @param {Array} selectedLetters - Array of letter objects
   */
  updatePhraseFromSelections(selectedLetters) {
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) return;
    
    // Create string from selected letters
    const selectedString = selectedLetters.map(cell => cell.letter).join('');
    
    // Display selected letters
    displayElement.textContent = selectedString || "Select letters to form a phrase";
  }
  
  /**
   * Load a phrase from the phrase data
   * @param {Object} phraseData - Data for the phrase to load
   */
  loadPhrase(phraseData) {
    this.currentPhrase = phraseData;
    
    // Reset any highlighting
    this.gridRenderer.options.highlightPath = false;
    
    // Parse letter list from phrase data
    const letterList = phraseData.letterlist;
    
    console.log(`Loading phrase: "${phraseData.phrase}" with letterlist: "${letterList}"`);
    
    // Generate path using path generator
    this.currentPath = this.pathGenerator.generatePath(letterList);
    
    // Apply path to grid renderer
    this.gridRenderer.setPath(this.currentPath);
    
    // Update arrow button states
    this.arrowButtons.updateButtonStates();
    
    // Reset phrase display
    const displayElement = document.getElementById('phrase-text');
    if (displayElement) {
      displayElement.textContent = "Select letters to form a phrase";
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
    // Just let gridRenderer handle it
    this.gridRenderer.handleResponsive();
    this.arrowButtons.updateButtonStates();
  }
  
  /**
   * Load sample data for testing
   */
  loadSampleData() {
    // Sample phrase data for testing when CSV isn't available
    const samplePhrase = {
      id: 1,
      phrase: "TIME FLIES LIKE AN ARROW",
      letterlist: "TIMEFLIESLIKEANARROW",
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
      
      // Load first phrase
      if (phrases.length > 0) {
        this.loadPhrase(phrases[0]);
        console.log('Loaded first phrase:', phrases[0].phrase);
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
   * Create refresh button at the bottom
   */
  createRefreshButton() {
    const container = document.getElementById(this.options.gameContainerId);
    if (!container) return;
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'refresh-button-container';
    
    // Create the button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'metallic-button';
    refreshButton.textContent = 'New Random Phrase';
    refreshButton.addEventListener('click', () => this.loadRandomPhrase());
    
    // Create a reset selections button
    const resetButton = document.createElement('button');
    resetButton.className = 'metallic-button reset-button';
    resetButton.textContent = 'Reset Selections';
    resetButton.addEventListener('click', () => this.resetSelections());
    
    // Add to DOM
    buttonContainer.appendChild(refreshButton);
    buttonContainer.appendChild(resetButton);
    container.appendChild(buttonContainer);
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
  }
}

// Export class for use in other modules
export default GameController;

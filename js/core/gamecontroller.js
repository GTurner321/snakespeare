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
    // Default options
    this.options = {
      gameContainerId: options.gameContainerId || 'game-container',
      gridContainerId: options.gridContainerId || 'grid-container',
      gridSize: options.gridSize || { mobile: 8, desktop: 10 },
      cellSize: options.cellSize || 50,
      ...options
    };
    
    // Game state
    this.currentPhrase = null;
    this.currentPath = null;
    this.phrases = [];
    this.discoveredLetters = [];
    
    // Initialize components
    this.pathGenerator = new PathGenerator();
    this.gridRenderer = new GridRenderer(this.options.gridContainerId, {
      gridWidth: this.getResponsiveGridSize(),
      gridHeight: this.options.gridSize.desktop,
      cellSize: this.options.cellSize,
      maxScrollDistance: 6,
      highlightPath: false // Don't show the path initially
    });
    
    this.arrowButtons = new ArrowButtons(this.gridRenderer, {
      container: this.options.gameContainerId,
      buttonSize: this.options.cellSize
    });
    
    // Add window resize handler
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }
  
  /**
   * Load a phrase from the phrase data
   * @param {Object} phraseData - Data for the phrase to load
   */
  loadPhrase(phraseData) {
    this.currentPhrase = phraseData;
    this.discoveredLetters = [];
    
    // Parse letter list from phrase data
    const letterList = phraseData.letterlist;
    
    console.log(`Loading phrase: "${phraseData.phrase}" with letterlist: "${letterList}"`);
    
    // Generate path using path generator
    this.currentPath = this.pathGenerator.generatePath(letterList);
    
    // Apply path to grid renderer
    this.gridRenderer.setPath(this.currentPath);
    
    // Update arrow button states
    this.arrowButtons.updateButtonStates();
    
    // Update the phrase display with underscores
    this.updatePhraseDisplay(phraseData.phrase, []);
  }
  
  /**
   * Handle window resize events
   */
  handleResize() {
    // Update grid size based on screen width
    const newSize = this.getResponsiveGridSize();
    if (newSize !== this.gridRenderer.options.gridWidth) {
      this.gridRenderer.options.gridWidth = newSize;
      this.gridRenderer.renderVisibleGrid();
      this.arrowButtons.updateButtonStates();
    }
  }
  
  /**
   * Get the appropriate grid size based on screen width
   * @return {number} Grid width
   */
  getResponsiveGridSize() {
    return window.innerWidth < 768 ? 
      this.options.gridSize.mobile : 
      this.options.gridSize.desktop;
  }
  
  /**
   * Update the phrase display with discovered letters
   * @param {string} phrase - The full phrase
   * @param {Array} discoveredIndices - Indices of discovered letters
   */
  updatePhraseDisplay(phrase, discoveredIndices) {
    const displayElement = document.getElementById('phrase-text');
    if (!displayElement) return;
    
    // Create a display version with underscores for undiscovered letters
    const displayArray = phrase.split('').map((char, index) => {
      // If it's a space or punctuation, show it
      if (char === ' ' || /[,.!?;:'"()[\]{}-]/.test(char)) {
        return char;
      }
      // If it's discovered, show it
      else if (discoveredIndices.includes(index)) {
        return char;
      }
      // Otherwise show underscore
      else {
        return '_';
      }
    });
    
    // Join with spaces between characters for readability
    displayElement.textContent = displayArray.join(' ');
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
   * Move to the next phrase in the list
   * @return {boolean} True if successful, false if no more phrases
   */
  nextPhrase() {
    if (!this.phrases || this.phrases.length === 0) {
      return false;
    }
    
    // Find current phrase index
    const currentIndex = this.phrases.findIndex(phrase => 
      phrase.id === this.currentPhrase.id
    );
    
    // If found and not the last phrase
    if (currentIndex !== -1 && currentIndex < this.phrases.length - 1) {
      this.loadPhrase(this.phrases[currentIndex + 1]);
      return true;
    }
    
    return false;
  }
  
  /**
   * Move to the previous phrase in the list
   * @return {boolean} True if successful, false if at the first phrase
   */
  previousPhrase() {
    if (!this.phrases || this.phrases.length === 0) {
      return false;
    }
    
    // Find current phrase index
    const currentIndex = this.phrases.findIndex(phrase => 
      phrase.id === this.currentPhrase.id
    );
    
    // If found and not the first phrase
    if (currentIndex > 0) {
      this.loadPhrase(this.phrases[currentIndex - 1]);
      return true;
    }
    
    return false;
  }
  
  /**
   * Select a specific grid cell
   * @param {number} x - X coordinate of the cell
   * @param {number} y - Y coordinate of the cell
   * @return {boolean} True if the selection was valid, false otherwise
   */
  selectCell(x, y) {
    // Implementation of player cell selection would go here
    // This would check if the selected cell is the next in the path
    // and update the game state accordingly
    return false;
  }
  
  /**
   * Check if the player has discovered the complete phrase
   * @return {boolean} True if the phrase is complete
   */
  isComplete() {
    if (!this.currentPhrase || !this.discoveredLetters) {
      return false;
    }
    
    // Count non-space, non-punctuation characters in the phrase
    const letterCount = this.currentPhrase.phrase
      .split('')
      .filter(char => char !== ' ' && !/[,.!?;:'"()[\]{}-]/.test(char))
      .length;
    
    return this.discoveredLetters.length === letterCount;
  }
  
  /**
   * Reset the current game
   */
  resetGame() {
    if (this.currentPhrase) {
      this.loadPhrase(this.currentPhrase);
    } else {
      this.loadSampleData();
    }
  }
}

// Export class for use in other modules
export default GameController;

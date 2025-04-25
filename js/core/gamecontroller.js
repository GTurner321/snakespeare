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
    
    // Parse letter list from phrase data
    const letterList = phraseData.letterlist;
    
    // Generate path using path generator
    this.currentPath = this.pathGenerator.generatePath(letterList);
    
    // Apply path to grid renderer
    this.gridRenderer.setPath(this.currentPath);
    
    // Update arrow button states
    this.arrowButtons.updateButtonStates();
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
   * Load sample data for testing
   */
  loadSampleData() {
    // Sample phrase data for testing when CSV isn't available
    const samplePhrase = {
      id: 1,
      phrase: "TIME FLIES LIKE AN ARROW",
      letterlist: "T,I,M,E, ,F,L,I,E,S, ,L,I,K,E, ,A,N, ,A,R,R,O,W",
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
}

// Export class for use in other modules
export default GameController;

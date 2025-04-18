/**
 * Game Controller for Grid Word Game
 * Manages the game state and logic
 */

class GameController {
    /**
     * Initialize the GameController
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        this.config = Object.assign({
            pathType: 'curve',
            phraseLength: 'medium',
            era: 'all',
            maxHints: 3
        }, config);
        
        // Game state
        this.phrases = [];         // All available phrases
        this.currentPhrase = null; // Current phrase object
        this.currentPath = [];     // Current path coordinates
        this.selectedIndices = []; // Indices of currently selected path
        this.hintsUsed = 0;        // Number of hints used in current game
        
        // Initialize components
        this.dataManager = null;   // Will be set when data is loaded
        this.pathGenerator = new PathGenerator();
        this.gridRenderer = new GridRenderer('grid');
        
        // Bind methods
        this.handleCellClick = this.handleCellClick.bind(this);
        this.handleTryAgain = this.handleTryAgain.bind(this);
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for the game
     */
    setupEventListeners() {
        // Try Again button
        const tryAgainButton = document.getElementById('try-again-btn');
        if (tryAgainButton) {
            tryAgainButton.addEventListener('click', this.handleTryAgain);
        }
        
        // Button listeners for the control panel
        const menuButton = document.getElementById('menu-btn');
        const hintButton = document.getElementById('hint-btn');
        const phraseButton = document.getElementById('phrase-btn');
        
        if (menuButton) {
            menuButton.addEventListener('click', () => this.openModal('main-menu-modal'));
        }
        
        if (hintButton) {
            hintButton.addEventListener('click', () => this.requestHint());
        }
        
        if (phraseButton) {
            phraseButton.addEventListener('click', () => this.showPhraseProgress());
        }
    }
    
    /**
     * Initialize the game with CSV data
     * @param {Array} phrases - Array of phrase objects from CSV
     */
    initGame(phrases) {
        this.phrases = phrases;
        this.dataManager = new DataManager(phrases);
        
        // Start with a welcome modal
        this.openModal('welcome-modal');
        
        // Set up the quickstart button
        const quickstartBtn = document.getElementById('quickstart-btn');
        if (quickstartBtn) {
            quickstartBtn.addEventListener('click', () => {
                this.closeModal('welcome-modal');
                this.startNewGame();
            });
        }
    }
    
    /**
     * Start a new game with a random phrase
     */
    startNewGame() {
        // Reset game state
        this.selectedIndices = [];
        this.hintsUsed = 0;
        
        // Get a random phrase based on current settings
        this.currentPhrase = this.dataManager.getRandomPhrase(
            this.config.phraseLength,
            this.config.era
        );
        
        if (!this.currentPhrase) {
            console.error('No phrases available that match the criteria');
            return;
        }
        
        console.log('Starting new game with phrase:', this.currentPhrase.phrase);
        
        // Generate a path for the phrase
        const letterList = this.currentPhrase.letterlist;
        this.currentPath = this.pathGenerator.generatePath(
            this.currentPhrase.phrase,
            letterList,
            this.config.pathType
        );
        
        // Render the grid with the path
        this.gridRenderer.renderGrid(this.currentPath, letterList);
        
        // Add click handlers to cells
        this.setupCellClickHandlers();
    }
    
    /**
     * Set up click handlers for grid cells
     */
    setupCellClickHandlers() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.addEventListener('click', this.handleCellClick);
        });
    }
    
    /**
     * Handle clicking on a grid cell
     * @param {Event} event - Click event
     */
    handleCellClick(event) {
        const cell = event.currentTarget;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        
        // Find if this cell is in the path
        const pathIndex = this.findPathIndex(x, y);
        
        if (pathIndex === -1) {
            // Not in the path
            return;
        }
        
        // Check if this is the correct next cell in the sequence
        const expectedIndex = this.selectedIndices.length;
        
        if (pathIndex === expectedIndex) {
            // Correct next cell
            this.selectedIndices.push(pathIndex);
            this.gridRenderer.highlightPath(this.selectedIndices);
            
            // Check if the phrase is complete
            if (this.selectedIndices.length === this.currentPath.length) {
                this.handlePhraseComplete();
            }
        } else if (pathIndex === 0 && expectedIndex > 0) {
            // Clicked on start again - reset selection
            this.selectedIndices = [0];
            this.gridRenderer.highlightPath(this.selectedIndices);
        }
    }
    
    /**
     * Find the index of a coordinate in the current path
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} - Index in the path, or -1 if not found
     */
    findPathIndex(x, y) {
        for (let i = 0; i < this.currentPath.length; i++) {
            const coord = this.currentPath[i];
            if (coord.x === x && coord.y === y) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Handle completion of the phrase
     */
    handlePhraseComplete() {
        console.log('Phrase complete!');
        this.showSuccessModal();
    }
    
    /**
     * Show the success modal with phrase information
     */
    showSuccessModal() {
        // Populate the success modal with phrase information
        const phraseDisplay = document.getElementById('phrase-display');
        const phraseInfo = document.getElementById('phrase-info');
        const detailedInfo = document.getElementById('detailed-info');
        
        if (phraseDisplay && this.currentPhrase) {
            // Create a display of the phrase with letter tiles
            phraseDisplay.innerHTML = '';
            const letters = this.currentPhrase.phrase.split('');
            
            const tilesContainer = document.createElement('div');
            tilesContainer.className = 'phrase-tiles';
            tilesContainer.style.display = 'flex';
            tilesContainer.style.flexWrap = 'wrap';
            tilesContainer.style.justifyContent = 'center';
            tilesContainer.style.gap = '5px';
            tilesContainer.style.marginBottom = '20px';
            
            letters.forEach(letter => {
                if (letter !== ' ') {
                    const tile = document.createElement('div');
                    tile.className = 'phrase-tile';
                    tile.textContent = letter;
                    tile.style.width = '40px';
                    tile.style.height = '40px';
                    tile.style.backgroundColor = '#8fce90';
                    tile.style.display = 'flex';
                    tile.style.alignItems = 'center';
                    tile.style.justifyContent = 'center';
                    tile.style.fontWeight = 'bold';
                    tile.style.borderRadius = '5px';
                    tilesContainer.appendChild(tile);
                } else {
                    // Add space between words
                    const spacer = document.createElement('div');
                    spacer.style.width = '20px';
                    tilesContainer.appendChild(spacer);
                }
            });
            
            phraseDisplay.appendChild(tilesContainer);
        }
        
        if (phraseInfo && this.currentPhrase) {
            // Display basic information about the phrase
            phraseInfo.innerHTML = `
                <h3>${this.currentPhrase.phrase}</h3>
                <p><strong>Meaning:</strong> ${this.currentPhrase.meaning}</p>
                <p><strong>Era:</strong> ${this.currentPhrase.era}</p>
                <p><strong>Source:</strong> ${this.currentPhrase.source}</p>
            `;
        }
        
        if (detailedInfo && this.currentPhrase) {
            // Display detailed information in the info modal
            detailedInfo.innerHTML = `
                <h3>${this.currentPhrase.phrase}</h3>
                <p><strong>Meaning:</strong> ${this.currentPhrase.meaning}</p>
                <p><strong>Information:</strong> ${this.currentPhrase.info}</p>
                <p><strong>Source:</strong> ${this.currentPhrase.source} (${this.currentPhrase.sourcetype})</p>
                <p><strong>Date:</strong> ${this.currentPhrase.date}</p>
                <p><strong>Era:</strong> ${this.currentPhrase.era}</p>
                <p><strong>Author:</strong> ${this.currentPhrase.author}</p>
                <p><strong>Tags:</strong> ${this.currentPhrase.phrasetags}</p>
                <p><strong>Usage:</strong> ${this.currentPhrase.usagetype}</p>
            `;
        }
        
        // Open the success modal
        this.openModal('success-modal');
        
        // Set up event listeners for the success modal buttons
        const infoBtn = document.getElementById('info-btn');
        const successMenuBtn = document.getElementById('success-menu-btn');
        const backToGridBtn = document.getElementById('back-to-grid-btn');
        
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.openModal('info-modal'));
        }
        
        if (successMenuBtn) {
            successMenuBtn.addEventListener('click', () => {
                this.closeModal('success-modal');
                this.openModal('main-menu-modal');
            });
        }
        
        if (backToGridBtn) {
            backToGridBtn.addEventListener('click', () => this.closeModal('success-modal'));
        }
    }
    
    /**
     * Show the current progress of the phrase
     */
    showPhraseProgress() {
        // Only show the success modal with partial completion
        if (this.selectedIndices.length === 0) {
            alert('No letters selected yet. Start from the green square!');
            return;
        }
        
        this.showSuccessModal();
    }
    
    /**
     * Request a hint from the game
     */
    requestHint() {
        if (this.hintsUsed >= this.config.maxHints) {
            alert('You have used all your hints for this phrase.');
            return;
        }
        
        // Show the hint modal with quiz questions
        this.openModal('hint-modal');
        
        // For now, just highlight the next square automatically
        // In a real implementation, this would show quiz questions first
        const nextIndex = this.selectedIndices.length;
        if (nextIndex < this.currentPath.length) {
            setTimeout(() => {
                this.closeModal('hint-modal');
                this.selectedIndices.push(nextIndex);
                this.gridRenderer.highlightPath(this.selectedIndices);
                this.hintsUsed++;
                
                // Check if the phrase is now complete
                if (this.selectedIndices.length === this.currentPath.length) {
                    this.handlePhraseComplete();
                }
            }, 1000);
        }
    }
    
    /**
     * Handle the try again button
     */
    handleTryAgain() {
        this.startNewGame();
    }
    
    /**
     * Open a modal by ID
     * @param {string} modalId - ID of the modal to open
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    /**
     * Close a modal by ID
     * @param {string} modalId - ID of the modal to close
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Update game settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        this.config = Object.assign(this.config, settings);
    }
}

// Export the GameController for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameController;
} else {
    // For browser usage
    window.GameController = GameController;
}

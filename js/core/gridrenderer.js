/**
 * Grid Renderer for Grid Word Game
 * Handles the visual rendering of the grid and path
 */

class GridRenderer {
    /**
     * Initialize the GridRenderer
     * @param {string} gridContainerId - ID of the container element for the grid
     * @param {Object} config - Configuration options
     */
    constructor(gridContainerId = 'grid', config = {}) {
        this.gridContainer = document.getElementById(gridContainerId);
        this.config = Object.assign({
            cellSize: 60,         // Size of each cell in pixels
            visibleWidth: 8,      // Number of cells visible horizontally (mobile)
            visibleHeight: 8,     // Number of cells visible vertically (mobile)
            desktopWidth: 10,     // Number of cells visible horizontally (desktop)
            desktopHeight: 10,    // Number of cells visible vertically (desktop)
            alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // Available letters for grid
            scrollDistance: 6,    // Maximum scroll distance from path
            mobileBreakpoint: 768 // Mobile/desktop breakpoint in pixels
        }, config);
        
        // State variables
        this.grid = [];
        this.pathCoordinates = [];
        this.selectedPathIndices = [];
        this.letterMapping = {};  // Maps coordinates to letters
        this.currentOffset = { x: 0, y: 0 };
        this.gridSize = { width: 0, height: 0 };
        
        // Initialize the view size based on screen width
        this.updateViewSize();
        
        // Bind methods
        this.handleResize = this.handleResize.bind(this);
        
        // Add event listeners
        window.addEventListener('resize', this.handleResize);
        
        // Set up navigation buttons
        this.setupNavigationButtons();
    }
    
    /**
     * Update the view size based on screen width
     */
    updateViewSize() {
        if (window.innerWidth <= this.config.mobileBreakpoint) {
            this.viewSize = {
                width: this.config.visibleWidth,
                height: this.config.visibleHeight
            };
        } else {
            this.viewSize = {
                width: this.config.desktopWidth,
                height: this.config.desktopHeight
            };
        }
        
        // Update container dimensions
        if (this.gridContainer) {
            this.gridContainer.style.width = `${this.viewSize.width * this.config.cellSize}px`;
            this.gridContainer.style.height = `${this.viewSize.height * this.config.cellSize}px`;
        }
    }
    
    /**
     * Handle window resize event
     */
    handleResize() {
        this.updateViewSize();
        this.centerGridOnPath();
        this.updateVisibleCells();
    }
    
    /**
     * Set up navigation buttons for scrolling the grid
     */
    setupNavigationButtons() {
        const navButtons = {
            'nav-up': { x: 0, y: -1 },
            'nav-down': { x: 0, y: 1 },
            'nav-left': { x: -1, y: 0 },
            'nav-right': { x: 1, y: 0 }
        };
        
        for (const [buttonId, offset] of Object.entries(navButtons)) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.scrollGrid(offset.x, offset.y);
                });
            }
        }
    }
    
    /**
     * Render the initial grid with a path
     * @param {Array} pathCoordinates - Array of coordinates for the path
     * @param {string} letterList - String of letters to place on the path
     */
    renderGrid(pathCoordinates, letterList) {
        this.pathCoordinates = pathCoordinates;
        
        // Clear previous grid
        this.gridContainer.innerHTML = '';
        this.grid = [];
        this.letterMapping = {};
        
        // Determine grid boundaries based on path
        const boundaries = this.calculateGridBoundaries(pathCoordinates);
        
        // Create a grid large enough for the path plus some buffer
        const buffer = 10; // Extra cells around the path
        this.gridSize = {
            width: boundaries.maxX - boundaries.minX + 1 + (buffer * 2),
            height: boundaries.maxY - boundaries.minY + 1 + (buffer * 2)
        };
        
        // Create a mapping between coordinates and letters for the path
        for (let i = 0; i < pathCoordinates.length; i++) {
            const coord = pathCoordinates[i];
            const letter = i < letterList.length ? letterList[i] : '';
            this.letterMapping[`${coord.x},${coord.y}`] = letter;
        }
        
        // Create the grid cells
        for (let y = boundaries.minY - buffer; y <= boundaries.maxY + buffer; y++) {
            for (let x = boundaries.minX - buffer; x <= boundaries.maxX + buffer; x++) {
                const coordKey = `${x},${y}`;
                // Check if this coordinate is part of the path
                let letter;
                if (this.letterMapping[coordKey]) {
                    letter = this.letterMapping[coordKey];
                } else {
                    // Random letter for non-path cells
                    letter = this.getRandomLetter();
                }
                
                // Create the cell element
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.dataset.coordKey = coordKey;
                cell.textContent = letter;
                
                // Position the cell in absolute coordinates
                cell.style.left = `${(x - boundaries.minX + buffer) * this.config.cellSize}px`;
                cell.style.top = `${(y - boundaries.minY + buffer) * this.config.cellSize}px`;
                
                // Mark the start cell
                if (x === 0 && y === 0) {
                    cell.classList.add('start');
                }
                
                // Add the cell to the grid
                this.gridContainer

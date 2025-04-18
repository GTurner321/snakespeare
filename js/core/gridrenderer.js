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
                this.gridContainer.appendChild(cell);
                
                // Keep track of cell in our grid model
                if (!this.grid[y]) this.grid[y] = {};
                this.grid[y][x] = { element: cell, letter: letter };
            }
        }
        
        // Center the grid on the start position initially
        this.centerGridOnPath();
        
        // Update which cells are visible
        this.updateVisibleCells();
    }
    
    /**
     * Get a random letter for the grid
     * @returns {string} - Random letter
     */
    getRandomLetter() {
        return this.config.alphabet.charAt(Math.floor(Math.random() * this.config.alphabet.length));
    }
    
    /**
     * Calculate the boundaries of the grid based on the path
     * @param {Array} pathCoordinates - Array of coordinates for the path
     * @returns {Object} - Minimum and maximum x and y coordinates
     */
    calculateGridBoundaries(pathCoordinates) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const coord of pathCoordinates) {
            minX = Math.min(minX, coord.x);
            minY = Math.min(minY, coord.y);
            maxX = Math.max(maxX, coord.x);
            maxY = Math.max(maxY, coord.y);
        }
        
        return { minX, minY, maxX, maxY };
    }
    
    /**
     * Center the grid view on the path
     */
    centerGridOnPath() {
        // Default to centering on the start position (0,0)
        let centerX = 0;
        let centerY = 0;
        
        // If there are selected path indices, center on the latest selected cell
        if (this.selectedPathIndices.length > 0) {
            const latestIndex = this.selectedPathIndices[this.selectedPathIndices.length - 1];
            const latestCoord = this.pathCoordinates[latestIndex];
            centerX = latestCoord.x;
            centerY = latestCoord.y;
        }
        
        // Calculate the offset to center the view
        this.currentOffset = {
            x: centerX - Math.floor(this.viewSize.width / 2),
            y: centerY - Math.floor(this.viewSize.height / 2)
        };
        
        // Apply the transform to the grid
        this.applyGridTransform();
    }
    
    /**
     * Apply the current transform to the grid
     */
    applyGridTransform() {
        // Calculate pixel offset based on cell size
        const pixelOffsetX = -this.currentOffset.x * this.config.cellSize;
        const pixelOffsetY = -this.currentOffset.y * this.config.cellSize;
        
        // Apply transform
        this.gridContainer.style.transform = `translate(${pixelOffsetX}px, ${pixelOffsetY}px)`;
    }
    
    /**
     * Update which cells are visible based on the current offset
     */
    updateVisibleCells() {
        // Calculate visible boundaries
        const visibleBounds = {
            minX: this.currentOffset.x,
            minY: this.currentOffset.y,
            maxX: this.currentOffset.x + this.viewSize.width,
            maxY: this.currentOffset.y + this.viewSize.height
        };
        
        // Update all cells
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            
            // Check if cell is within visible boundaries
            const isVisible = (
                x >= visibleBounds.minX && 
                x < visibleBounds.maxX && 
                y >= visibleBounds.minY && 
                y < visibleBounds.maxY
            );
            
            // Toggle visibility
            cell.style.display = isVisible ? 'flex' : 'none';
        });
    }
    
    /**
     * Scroll the grid in a specified direction
     * @param {number} dx - Horizontal scroll amount (cells)
     * @param {number} dy - Vertical scroll amount (cells)
     */
    scrollGrid(dx, dy) {
        // Update the offset
        this.currentOffset.x += dx;
        this.currentOffset.y += dy;
        
        // Apply the transform
        this.applyGridTransform();
        
        // Update visible cells
        this.updateVisibleCells();
    }
    
    /**
     * Highlight a path on the grid
     * @param {Array} indices - Array of indices in the path to highlight
     */
    highlightPath(indices) {
        // Clear previous highlights
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('selected');
            cell.classList.remove('selected-last');
        });
        
        // Save the selected indices
        this.selectedPathIndices = indices;
        
        // Highlight each cell in the selected path
        indices.forEach((index, i) => {
            const coord = this.pathCoordinates[index];
            const coordKey = `${coord.x},${coord.y}`;
            
            // Find the cell element
            const cell = this.gridContainer.querySelector(`.grid-cell[data-coord-key="${coordKey}"]`);
            if (cell) {
                cell.classList.add('selected');
                
                // Mark the last cell in the path differently
                if (i === indices.length - 1) {
                    cell.classList.add('selected-last');
                }
            }
        });
        
        // Center the grid on the last selected cell
        this.centerGridOnPath();
    }
    
    /**
     * Get the boundaries of the current path
     * @returns {Object} - Path boundaries
     */
    getPathBoundaries() {
        return this.calculateGridBoundaries(this.pathCoordinates);
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        window.removeEventListener('resize', this.handleResize);
    }
}

// Export the GridRenderer for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridRenderer;
} else {
    // For browser usage
    window.GridRenderer = GridRenderer;
}

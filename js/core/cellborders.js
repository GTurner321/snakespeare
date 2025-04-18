/**
 * Cell Borders for Grid Word Game
 * Handles the styling of cell borders to highlight the selected path
 */

class CellBorders {
    /**
     * Initialize the CellBorders
     * @param {string} gridSelector - CSS selector for the grid container
     */
    constructor(gridSelector = '#grid') {
        this.gridContainer = document.querySelector(gridSelector);
        this.pathCells = [];
        
        // Border styles
        this.borderStyles = {
            normal: '1px solid #ccc',
            selected: '2px solid #2ecc71',
            highlight: '3px solid #27ae60'
        };
    }
    
    /**
     * Update the borders of cells to highlight the path
     * @param {Array} pathCoordinates - Array of coordinate objects in the path
     * @param {Array} selectedIndices - Array of indices of selected cells in the path
     */
    updateBorders(pathCoordinates, selectedIndices) {
        // Reset all cell borders
        this.resetAllBorders();
        
        // Skip if there are no selected cells
        if (selectedIndices.length === 0) return;
        
        // Get all cells in the selected path
        this.pathCells = selectedIndices.map(index => {
            const coord = pathCoordinates[index];
            return this.getCell(coord.x, coord.y);
        }).filter(cell => cell !== null);
        
        // Style each cell in the path to show connection with next cell
        for (let i = 0; i < this.pathCells.length - 1; i++) {
            const currentCell = this.pathCells[i];
            const nextCell = this.pathCells[i + 1];
            
            this.styleConnectedCells(currentCell, nextCell);
        }
        
        // Highlight the last selected cell
        if (this.pathCells.length > 0) {
            const lastCell = this.pathCells[this.pathCells.length - 1];
            this.highlightCell(lastCell);
        }
    }
    
    /**
     * Get a cell element by coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {HTMLElement} - Cell element or null if not found
     */
    getCell(x, y) {
        return this.gridContainer.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
    }
    
    /**
     * Reset all cell borders to normal
     */
    resetAllBorders() {
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.style.borderTop = this.borderStyles.normal;
            cell.style.borderRight = this.borderStyles.normal;
            cell.style.borderBottom = this.borderStyles.normal;
            cell.style.borderLeft = this.borderStyles.normal;
            cell.classList.remove('path-cell');
        });
    }
    
    /**
     * Style two connected cells to show the path between them
     * @param {HTMLElement} cell1 - First cell
     * @param {HTMLElement} cell2 - Second cell
     */
    styleConnectedCells(cell1, cell2) {
        if (!cell1 || !cell2) return;
        
        cell1.classList.add('path-cell');
        cell2.classList.add('path-cell');
        
        // Get coordinates
        const x1 = parseInt(cell1.dataset.x);
        const y1 = parseInt(cell1.dataset.y);
        const x2 = parseInt(cell2.dataset.x);
        const y2 = parseInt(cell2.dataset.y);
        
        // Determine direction of connection
        if (x1 === x2) {
            // Vertical connection
            if (y1 < y2) {
                // Cell1 is above Cell2
                cell1.style.borderBottom = this.borderStyles.selected;
                cell2.style.borderTop = this.borderStyles.selected;
            } else {
                // Cell1 is below Cell2
                cell1.style.borderTop = this.borderStyles.selected;
                cell2.style.borderBottom = this.borderStyles.selected;
            }
        } else if (y1 === y2) {
            // Horizontal connection
            if (x1 < x2) {
                // Cell1 is to the left of Cell2
                cell1.style.borderRight = this.borderStyles.selected;
                cell2.style.borderLeft = this.borderStyles.selected;
            } else {
                // Cell1 is to the right of Cell2
                cell1.style.borderLeft = this.borderStyles.selected;
                cell2.style.borderRight = this.borderStyles.selected;
            }
        }
    }
    
    /**
     * Highlight a cell as the end of the current path
     * @param {HTMLElement} cell - Cell to highlight
     */
    highlightCell(cell) {
        if (!cell) return;
        
        // Add a special class or style to the last cell
        cell.style.borderTop = this.borderStyles.highlight;
        cell.style.borderRight = this.borderStyles.highlight;
        cell.style.borderBottom = this.borderStyles.highlight;
        cell.style.borderLeft = this.borderStyles.highlight;
    }
    
    /**
     * Apply a pulsing animation to the next cell in the path
     * @param {Array} pathCoordinates - Full path coordinates
     * @param {number} nextIndex - Index of the next cell to highlight
     */
    pulseNextCell(pathCoordinates, nextIndex) {
        if (nextIndex >= pathCoordinates.length) return;
        
        const nextCoord = pathCoordinates[nextIndex];
        const nextCell = this.getCell(nextCoord.x, nextCoord.y);
        
        if (nextCell) {
            // Add pulsing animation
            nextCell.classList.add('pulse-animation');
            
            // Remove after animation completes
            setTimeout(() => {
                nextCell.classList.remove('pulse-animation');
            }, 2000);
        }
    }
}

// Export the CellBorders for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CellBorders;
} else {
    // For browser usage
    window.CellBorders = CellBorders;
}

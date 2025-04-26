/**
 * Path Generator for Grid Game
 * Creates a snake-like path for letters in a phrase
 * Based on coordinate grid with start at (0,0)
 */

class PathGenerator {
  constructor() {
    this.visited = new Set(); // Track visited coordinates
    this.path = [];           // Store generated path coordinates
    this.directions = [       // Possible move directions (up, right, down, left)
      [0, -1], [1, 0], [0, 1], [-1, 0]
    ];
    // NEW: Maximum grid limits to ensure path stays within 51x51 bounds
    this.maxDistance = 25; // Since 51/2 = 25.5
  }
  
  /**
   * Generate a path for the given letter sequence
   * @param {Array|String} letterList - Array of letters or string to be positioned on the grid
   * @return {Array} Array of {x, y, letter} objects representing the path
   */
  generatePath(letterList) {
    // Reset state for new path generation
    this.visited = new Set();
    this.path = [];
    
    // Parse letter list to ensure it's in the right format
    const letters = this.parseLetterList(letterList);
    
    // Start at coordinate (0,0)
    let currentX = 0;
    let currentY = 0;
    
    // Add starting point with first letter
    this.addToPath(currentX, currentY, letters[0]);
    
    // Generate rest of the path for remaining letters
    for (let i = 1; i < letters.length; i++) {
      // Try to find next valid position
      const nextPos = this.findNextPosition(currentX, currentY);
      
      // If no valid position found, break out (this shouldn't happen with proper grid size)
      if (!nextPos) {
        console.error('Could not find valid next position for letter:', letters[i]);
        break;
      }
      
      // Update current position
      currentX = nextPos.x;
      currentY = nextPos.y;
      
      // Add position to path with current letter
      this.addToPath(currentX, currentY, letters[i]);
    }
    
    return this.path;
  }
  
  /**
   * Parse letter list to ensure it's an array of characters
   * @param {Array|String} letterList - Input letter list
   * @return {Array} Array of letters
   */
  parseLetterList(letterList) {
    // If it's a comma-separated string
    if (typeof letterList === 'string' && letterList.includes(',')) {
      return letterList.split(',').map(letter => letter.trim());
    }
    // If it's a single string without separators
    else if (typeof letterList === 'string') {
      return letterList.split('');
    }
    // If it's already an array
    else if (Array.isArray(letterList)) {
      return letterList;
    }
    // Default fallback - Use a placeholder for testing
    return "TESTPHRASE".split('');
  }
  
  /**
   * Add a position to the path
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} letter - Letter to place at this position
   */
  addToPath(x, y, letter) {
    const key = `${x},${y}`;
    this.visited.add(key);
    this.path.push({ x, y, letter });
  }
  
  /**
   * Find next valid position (not visited)
   * @param {number} x - Current X coordinate
   * @param {number} y - Current Y coordinate
   * @return {Object|null} Next position {x, y} or null if no valid position
   */
  findNextPosition(x, y) {
    // Shuffle directions for randomness
    const shuffledDirs = this.shuffleArray([...this.directions]);
    
    // Try each direction
    for (const [dx, dy] of shuffledDirs) {
      const newX = x + dx;
      const newY = y + dy;
      
      // NEW: Check if new position is within maximum bounds
      if (Math.abs(newX) > this.maxDistance || Math.abs(newY) > this.maxDistance) {
        continue;
      }
      
      const key = `${newX},${newY}`;
      
      // If this position hasn't been visited, return it
      if (!this.visited.has(key)) {
        return { x: newX, y: newY };
      }
    }
    
    return null; // No valid position found
  }
  
  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @return {Array} Shuffled array
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  /**
   * Convert coordinate-based path to grid-relative coordinates
   * @param {Array} path - Path with {x, y, letter} objects
   * @param {number} gridSize - Size of the grid
   * @return {Array} Path with grid-relative coordinates
   */
  convertToGridCoordinates(path, gridSize = 8) {
    const centerOffset = Math.floor(gridSize / 2);
    return path.map(point => ({
      x: point.x + centerOffset,
      y: point.y + centerOffset,
      letter: point.letter
    }));
  }
}

// Export the class for use in other modules
export default PathGenerator;

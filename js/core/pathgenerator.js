/**
 * Path Generator for Grid Word Game
 * Generates paths for phrases based on different algorithms
 */

class PathGenerator {
    constructor() {
        this.DIRECTIONS = {
            UP: { x: 0, y: -1 },
            RIGHT: { x: 1, y: 0 },
            DOWN: { x: 0, y: 1 },
            LEFT: { x: -1, y: 0 }
        };
        
        this.pathTypes = {
            curve: this.generateCurvePath.bind(this),
            bends: this.generateBendsPath.bind(this),
            wacky: this.generateWackyPath.bind(this)
        };
    }

    /**
     * Generate a path for a phrase
     * @param {string} phrase - The phrase to generate a path for
     * @param {string} letterList - The list of letters to place in the grid
     * @param {string} pathType - The type of path to generate (curve, bends, wacky)
     * @returns {Array} - Array of coordinates for the path
     */
    generatePath(phrase, letterList, pathType = 'curve') {
        const letterCount = letterList.length;
        
        // Default to curve if the path type doesn't exist
        const generator = this.pathTypes[pathType] || this.pathTypes.curve;
        
        return generator(letterCount);
    }

    /**
     * Generate a curved path according to the specifications
     * @param {number} letterCount - The number of letters in the phrase
     * @returns {Array} - Array of coordinates for the path
     */
    generateCurvePath(letterCount) {
        const path = [];
        const usedCoordinates = new Set();
        
        // Start at (0,0)
        let currentPosition = { x: 0, y: 0 };
        path.push({ ...currentPosition });
        usedCoordinates.add(`${currentPosition.x},${currentPosition.y}`);
        
        // Get a random initial direction
        let currentDirection = this.getRandomDirection();
        let lastTurnDirection = null; // Track the last direction we turned
        
        // Generate the path for each letter
        for (let i = 1; i < letterCount; i++) {
            const isNearEndOfPath = i >= letterCount - 5;
            let nextPosition;
            let validMove = false;
            let availableDirections = [];
            
            // Try to find a valid next position
            while (!validMove) {
                let directionChoice = Math.random();
                let nextDirection;
                
                if (i === 1) {
                    // First move is completely random (any direction)
                    nextDirection = currentDirection;
                } else if (isNearEndOfPath) {
                    // Last 5 squares: 60% straight, 40% opposite turn
                    if (directionChoice < 0.6) {
                        // Keep going straight
                        nextDirection = currentDirection;
                    } else {
                        // Turn in the opposite direction from last turn
                        const perpendiculars = this.getPerpendicularDirections(currentDirection);
                        nextDirection = lastTurnDirection ? 
                            (perpendiculars[0] === lastTurnDirection ? perpendiculars[1] : perpendiculars[0]) : 
                            perpendiculars[Math.floor(Math.random() * perpendiculars.length)];
                    }
                } else {
                    // Normal path generation (curves in same direction)
                    if (directionChoice < 0.7) {
                        // 70% chance to keep going in the same direction
                        nextDirection = currentDirection;
                    } else {
                        // 30% chance to turn in the same direction as before
                        const perpendiculars = this.getPerpendicularDirections(currentDirection);
                        
                        if (lastTurnDirection) {
                            // Use the same turn direction as before
                            nextDirection = lastTurnDirection;
                        } else {
                            // First turn, randomly choose a perpendicular
                            nextDirection = perpendiculars[Math.floor(Math.random() * perpendiculars.length)];
                            lastTurnDirection = nextDirection;
                        }
                    }
                }
                
                // Calculate next position
                nextPosition = {
                    x: currentPosition.x + this.DIRECTIONS[nextDirection].x,
                    y: currentPosition.y + this.DIRECTIONS[nextDirection].y
                };
                
                // Check if this position is already used
                const positionKey = `${nextPosition.x},${nextPosition.y}`;
                if (!usedCoordinates.has(positionKey)) {
                    validMove = true;
                    path.push(nextPosition);
                    usedCoordinates.add(positionKey);
                    currentPosition = nextPosition;
                    
                    // If we turned, update the currentDirection and lastTurnDirection
                    if (nextDirection !== currentDirection) {
                        lastTurnDirection = nextDirection;
                        currentDirection = nextDirection;
                    }
                } else {
                    // If we've tried all directions, pick a random one that's not used
                    availableDirections = this.getAvailableDirections(currentPosition, usedCoordinates);
                    
                    if (availableDirections.length === 0) {
                        // We're trapped - in a real implementation, we might want to 
                        // backtrack or restart path generation
                        console.error('Path generation trapped - no valid moves!');
                        // For now, we'll just choose a random position on the grid
                        let attempts = 0;
                        while (attempts < 100) {
                            const randomX = currentPosition.x + Math.floor(Math.random() * 5) - 2;
                            const randomY = currentPosition.y + Math.floor(Math.random() * 5) - 2;
                            const randomPosKey = `${randomX},${randomY}`;
                            
                            if (!usedCoordinates.has(randomPosKey)) {
                                nextPosition = { x: randomX, y: randomY };
                                path.push(nextPosition);
                                usedCoordinates.add(randomPosKey);
                                currentPosition = nextPosition;
                                validMove = true;
                                break;
                            }
                            attempts++;
                        }
                        
                        // If we still can't find a valid move, just return what we have
                        if (!validMove) {
                            console.error('Could not complete path generation');
                            return path;
                        }
                    } else {
                        // Choose a random available direction
                        const randomDir = availableDirections[Math.floor(Math.random() * availableDirections.length)];
                        nextDirection = randomDir;
                        
                        // Recalculate next position with new direction
                        nextPosition = {
                            x: currentPosition.x + this.DIRECTIONS[nextDirection].x,
                            y: currentPosition.y + this.DIRECTIONS[nextDirection].y
                        };
                        
                        // Update path
                        path.push(nextPosition);
                        usedCoordinates.add(`${nextPosition.x},${nextPosition.y}`);
                        currentPosition = nextPosition;
                        currentDirection = nextDirection;
                    }
                }
            }
        }
        
        return path;
    }
    
    /**
     * Placeholder for the bends path generator
     * @param {number} letterCount - The number of letters in the phrase
     * @returns {Array} - Array of coordinates for the path
     */
    generateBendsPath(letterCount) {
        // For now, just use the curve path generator
        // This will be implemented with a different algorithm later
        return this.generateCurvePath(letterCount);
    }
    
    /**
     * Placeholder for the wacky path generator
     * @param {number} letterCount - The number of letters in the phrase
     * @returns {Array} - Array of coordinates for the path
     */
    generateWackyPath(letterCount) {
        // For now, just use the curve path generator
        // This will be implemented with a different algorithm later
        return this.generateCurvePath(letterCount);
    }
    
    /**
     * Get a random direction (UP, RIGHT, DOWN, LEFT)
     * @returns {string} - Direction name
     */
    getRandomDirection() {
        const directions = Object.keys(this.DIRECTIONS);
        return directions[Math.floor(Math.random() * directions.length)];
    }
    
    /**
     * Get perpendicular directions to the current direction
     * @param {string} direction - Current direction
     * @returns {Array} - Array of perpendicular directions
     */
    getPerpendicularDirections(direction) {
        switch (direction) {
            case 'UP':
            case 'DOWN':
                return ['LEFT', 'RIGHT'];
            case 'LEFT':
            case 'RIGHT':
                return ['UP', 'DOWN'];
            default:
                return [];
        }
    }
    
    /**
     * Get available directions from current position
     * @param {Object} position - Current position {x, y}
     * @param {Set} usedCoordinates - Set of used coordinates
     * @returns {Array} - Array of available directions
     */
    getAvailableDirections(position, usedCoordinates) {
        const directions = Object.keys(this.DIRECTIONS);
        const available = [];
        
        for (const dir of directions) {
            const nextPos = {
                x: position.x + this.DIRECTIONS[dir].x,
                y: position.y + this.DIRECTIONS[dir].y
            };
            
            const posKey = `${nextPos.x},${nextPos.y}`;
            if (!usedCoordinates.has(posKey)) {
                available.push(dir);
            }
        }
        
        return available;
    }
}

// Export the PathGenerator for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PathGenerator;
} else {
    // For browser usage
    window.PathGenerator = PathGenerator;
}

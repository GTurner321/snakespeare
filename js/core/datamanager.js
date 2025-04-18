/**
 * Data Manager for Grid Word Game
 * Handles loading and processing CSV data
 */

class DataManager {
    /**
     * Initialize the DataManager
     * @param {Array} phrases - Optional array of phrases to initialize with
     */
    constructor(phrases = null) {
        this.phrases = phrases || [];
        this.csvPath = 'assets/phrasedata.csv';
        
        // Phrase length categories (approximate)
        this.lengthCategories = {
            short: { min: 0, max: 15 },
            medium: { min: 16, max: 25 },
            long: { min: 26, max: Infinity }
        };
    }
    
    /**
     * Load phrases from the CSV file
     * @returns {Promise} - Promise resolving to array of phrases
     */
    async loadPhrasesFromCSV() {
        try {
            const response = await fetch(this.csvPath);
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            this.phrases = this.parseCSV(csvText);
            return this.phrases;
        } catch (error) {
            console.error('Error loading phrases:', error);
            return [];
        }
    }
    
    /**
     * Parse CSV text into an array of phrase objects
     * @param {string} csvText - CSV text content
     * @returns {Array} - Array of phrase objects
     */
    parseCSV(csvText) {
        // Simple CSV parsing (in a real app, use a library like PapaParse)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        const phrases = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Handle commas within quoted fields
            let line = lines[i];
            let inQuotes = false;
            let processedLine = '';
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                    processedLine += char;
                } else if (char === ',' && inQuotes) {
                    // Replace commas in quotes with a temporary placeholder
                    processedLine += '###COMMA###';
                } else {
                    processedLine += char;
                }
            }
            
            const values = processedLine.split(',');
            
            // Restore commas
            for (let j = 0; j < values.length; j++) {
                values[j] = values[j].replace(/###COMMA###/g, ',');
                
                // Remove surrounding quotes if present
                if (values[j].startsWith('"') && values[j].endsWith('"')) {
                    values[j] = values[j].substring(1, values[j].length - 1);
                }
                
                // Trim whitespace
                values[j] = values[j].trim();
            }
            
            const phrase = {};
            for (let j = 0; j < headers.length; j++) {
                phrase[headers[j].trim()] = values[j];
            }
            
            // Convert numeric fields
            if (phrase.lettercount) phrase.lettercount = parseInt(phrase.lettercount);
            if (phrase.wordcount) phrase.wordcount = parseInt(phrase.wordcount);
            
            phrases.push(phrase);
        }
        
        return phrases;
    }
    
    /**
     * Get a random phrase based on filters
     * @param {string} lengthCategory - Length category (short, medium, long)
     * @param {string} era - Era filter (all, or specific era)
     * @returns {Object} - Random phrase object
     */
    getRandomPhrase(lengthCategory = 'medium', era = 'all') {
        // Filter phrases based on criteria
        const filteredPhrases = this.phrases.filter(phrase => {
            // Filter by length
            const length = parseInt(phrase.lettercount) || 0;
            const lengthMatch = lengthCategory === 'all' || 
                (length >= this.lengthCategories[lengthCategory].min && 
                 length <= this.lengthCategories[lengthCategory].max);
            
            // Filter by era
            const eraMatch = era === 'all' || phrase.era === era;
            
            return lengthMatch && eraMatch;
        });
        
        if (filteredPhrases.length === 0) {
            console.warn('No phrases match the criteria, returning random phrase from all phrases');
            return this.phrases[Math.floor(Math.random() * this.phrases.length)];
        }
        
        // Return a random phrase from the filtered list
        return filteredPhrases[Math.floor(Math.random() * filteredPhrases.length)];
    }
    
    /**
     * Get all phrases matching certain criteria
     * @param {Object} filters - Filter criteria
     * @returns {Array} - Array of matching phrases
     */
    getPhrasesByFilters(filters = {}) {
        return this.phrases.filter(phrase => {
            let match = true;
            
            // Apply each filter
            for (const [key, value] of Object.entries(filters)) {
                if (value !== 'all' && phrase[key] !== value) {
                    match = false;
                    break;
                }
            }
            
            return match;
        });
    }
    
    /**
     * Get all available eras from the phrases
     * @returns {Array} - Array of unique eras
     */
    getAvailableEras() {
        const eras = new Set();
        this.phrases.forEach(phrase => {
            if (phrase.era) eras.add(phrase.era);
        });
        return Array.from(eras);
    }
}

// Export the DataManager for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
} else {
    // For browser usage
    window.DataManager = DataManager;
}

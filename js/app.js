/**
 * Main application script for Grid Word Game
 * Initializes the game and connects components
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Grid Word Game...');
    
    // Initialize the data manager and load phrases
    const dataManager = new DataManager();
    
    try {
        // Load phrases from CSV
        const phrases = await dataManager.loadPhrasesFromCSV();
        console.log(`Loaded ${phrases.length} phrases from CSV`);
        
        // Initialize game controller with loaded phrases
        const gameController = new GameController();
        gameController.initGame(phrases);
        
        // Set up modal close buttons
        setupModalCloseButtons();
        
        // Set up main menu options
        setupMainMenuOptions(gameController);
        
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('grid-container').innerHTML = `
            <div style="padding: 20px; background-color: #ffdddd; border: 1px solid #ff0000; border-radius: 5px;">
                <h3>Error Loading Game</h3>
                <p>${error.message}</p>
                <p>Please check that the CSV file is in the correct location and format.</p>
            </div>
        `;
    }
});

/**
 * Set up close buttons for all modals
 */
function setupModalCloseButtons() {
    // Get all close buttons
    const closeButtons = document.querySelectorAll('.close-btn');
    
    // Add event listeners to close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Find the parent modal
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modals when clicking outside the content
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

/**
 * Set up main menu option buttons
 * @param {GameController} gameController - The game controller instance
 */
function setupMainMenuOptions(gameController) {
    // Path type options
    const pathTypeButtons = document.querySelectorAll('.option-btn.path-type');
    pathTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons in this group
            pathTypeButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Update game controller setting
            gameController.updateSettings({ pathType: button.dataset.type });
        });
    });
    
    // Length options
    const lengthButtons = document.querySelectorAll('.option-btn.length');
    lengthButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons in this group
            lengthButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Update game controller setting
            gameController.updateSettings({ phraseLength: button.dataset.length });
        });
    });
    
    // Era options
    const eraButtons = document.querySelectorAll('.option-btn.era');
    eraButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons in this group
            eraButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Update game controller setting
            gameController.updateSettings({ era: button.dataset.era });
        });
    });
    
    // Menu back button
    const menuBackButton = document.getElementById('menu-back-btn');
    if (menuBackButton) {
        menuBackButton.addEventListener('click', () => {
            // Close the main menu modal
            const modal = document.getElementById('main-menu-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Rules button
    const rulesButton = document.getElementById('menu-rules-btn');
    if (rulesButton) {
        rulesButton.addEventListener('click', () => {
            // Close main menu and open rules modal
            document.getElementById('main-menu-modal').style.display = 'none';
            document.getElementById('rules-modal').style.display = 'flex';
        });
    }
    
    // Rules menu button
    const rulesMenuButton = document.getElementById('rules-menu-btn');
    if (rulesMenuButton) {
        rulesMenuButton.addEventListener('click', () => {
            // Close rules modal and open main menu
            document.getElementById('rules-modal').style.display = 'none';
            document.getElementById('main-menu-modal').style.display = 'flex';
        });
    }
    
    // Leaderboard button
    const leaderboardButton = document.getElementById('leaderboard-btn');
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', () => {
            // Open the leaderboard modal
            document.getElementById('leaderboard-modal').style.display = 'flex';
        });
    }
    
    // Record name button
    const recordNameButton = document.getElementById('record-name-btn');
    if (recordNameButton) {
        recordNameButton.addEventListener('click', () => {
            // Open the record name modal
            document.getElementById('record-name-modal').style.display = 'flex';
        });
    }
    
    // Submit name button
    const submitNameButton = document.getElementById('submit-name-btn');
    if (submitNameButton) {
        submitNameButton.addEventListener('click', () => {
            const playerName = document.getElementById('player-name').value.trim();
            if (playerName) {
                // Save the player name for high scores
                localStorage.setItem('playerName', playerName);
                
                // Close the modal
                document.getElementById('record-name-modal').style.display = 'none';
                
                // Show confirmation
                alert(`Name saved: ${playerName}`);
            } else {
                alert('Please enter a name');
            }
        });
    }
    
    // Info close button in success modal
    const infoCloseButton = document.getElementById('info-close');
    if (infoCloseButton) {
        infoCloseButton.addEventListener('click', () => {
            // Close the info modal
            document.getElementById('info-modal').style.display = 'none';
        });
    }
    
    // Hint modal close button
    const hintCloseButton = document.getElementById('hint-close');
    if (hintCloseButton) {
        hintCloseButton.addEventListener('click', () => {
            // Close the hint modal
            document.getElementById('hint-modal').style.display = 'none';
        });
    }
}

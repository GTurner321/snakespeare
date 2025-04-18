/**
 * Modal Manager for Grid Word Game
 * Handles shared modal functionality
 */

class ModalManager {
    /**
     * Initialize the ModalManager
     */
    constructor() {
        this.modals = {};
        this.initializeModals();
        this.setupGlobalEvents();
    }
    
    /**
     * Initialize all modals in the document
     */
    initializeModals() {
        // Get all modal elements
        const modalElements = document.querySelectorAll('.modal');
        
        // Store modal references and set up close buttons
        modalElements.forEach(modal => {
            const modalId = modal.id;
            this.modals[modalId] = modal;
            
            // Find close button within this modal
            const closeBtn = modal.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal(modalId));
            }
        });
    }
    
    /**
     * Set up global events for modals
     */
    setupGlobalEvents() {
        // Close modals when clicking outside content
        window.addEventListener('click', (event) => {
            for (const [id, modal] of Object.entries(this.modals)) {
                if (event.target === modal) {
                    this.closeModal(id);
                }
            }
        });
        
        // Close modals with Escape key
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    /**
     * Open a modal by ID
     * @param {string} modalId - ID of the modal to open
     */
    openModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.warn(`Modal with ID '${modalId}' not found`);
        }
    }
    
    /**
     * Close a modal by ID
     * @param {string} modalId - ID of the modal to close
     */
    closeModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.style.display = 'none';
        } else {
            console.warn(`Modal with ID '${modalId}' not found`);
        }
    }
    
    /**
     * Close all open modals
     */
    closeAllModals() {
        for (const modalId in this.modals) {
            this.closeModal(modalId);
        }
    }
    
    /**
     * Check if a modal is currently open
     * @param {string} modalId - ID of the modal to check
     * @returns {boolean} - True if the modal is open
     */
    isModalOpen(modalId) {
        const modal = this.modals[modalId];
        return modal ? modal.style.display === 'flex' : false;
    }
    
    /**
     * Set content for a modal
     * @param {string} modalId - ID of the modal
     * @param {string} contentHtml - HTML content to set
     */
    setModalContent(modalId, contentHtml) {
        const modal = this.modals[modalId];
        if (modal) {
            const contentEl = modal.querySelector('.modal-content');
            if (contentEl) {
                contentEl.innerHTML = contentHtml;
            }
        }
    }
    
    /**
     * Create a confirmation dialog within a modal
     * @param {string} message - Message to display
     * @param {Function} onConfirm - Function to call on confirm
     * @param {Function} onCancel - Function to call on cancel
     */
    showConfirmation(message, onConfirm, onCancel) {
        // Create confirmation content
        const contentHtml = `
            <div class="confirmation-dialog">
                <p>${message}</p>
                <div class="confirmation-buttons">
                    <button id="confirm-yes" class="confirm-btn">Yes</button>
                    <button id="confirm-no" class="confirm-btn">No</button>
                </div>
            </div>
        `;
        
        // Set the content
        this.setModalContent('confirmation-modal', contentHtml);
        
        // Show the modal
        this.openModal('confirmation-modal');
        
        // Set up button listeners
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');
        
        if (yesBtn) {
            yesBtn.addEventListener('click', () => {
                this.closeModal('confirmation-modal');
                if (onConfirm) onConfirm();
            });
        }
        
        if (noBtn) {
            noBtn.addEventListener('click', () => {
                this.closeModal('confirmation-modal');
                if (onCancel) onCancel();
            });
        }
    }
}

// Export the ModalManager for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
} else {
    // For browser usage
    window.ModalManager = ModalManager;
}

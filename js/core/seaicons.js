/**
 * SeaIcons.js - Module for handling sea icons with tooltips
 * This can be saved as a separate file and imported into your project
 */

class SeaIcons {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this.initialize();
  }
  
  initialize() {
    // Set of Font Awesome nautical icons to use with their tooltips
    this.iconData = [
      { icon: 'fa-solid fa-cloud-showers-water', tooltip: "Methinks the heavens are having a weep." },
      { icon: 'fa-solid fa-map', tooltip: "X marks the spot—if ye dare to dream!" },
      { icon: 'fa-solid fa-cloud-bolt', tooltip: "By my troth, the sky throws tantrums." },
      { icon: 'fa-solid fa-person-drowning', tooltip: "He walked the plank… with questionable flair." },
      { icon: 'fa-solid fa-person-swimming', tooltip: "Another bold stroke for Neptune's ledger." },
      { icon: 'fa-solid fa-dharmachakra', tooltip: "Another ship? Or just a wheel of misfortune?" },
      { icon: 'fa-solid fa-compass', tooltip: "North by bardwest, I reckon." },
      { icon: 'fa-solid fa-water', tooltip: "Sea, sea, everywhere—but not a drop for tea." },
      { icon: 'fa-brands fa-octopus-deploy', tooltip: "The kraken sends its compliments." },
      { icon: 'fa-solid fa-skull-crossbones', tooltip: "Avast! A pirate ship on poetic business." },
      { icon: 'fa-solid fa-fish-fins', tooltip: "Enough fish here to feed the whole crew." },
      { icon: 'fa-solid fa-anchor', tooltip: "Droppeth anchor, not thy spirits." },
      { icon: 'fa-solid fa-sailboat', tooltip: "To sail, perchance to drift." },
      { icon: 'fa-solid fa-wine-bottle', tooltip: "A message! Or a mermaid's forgotten flask." },
      { icon: 'fa-solid fa-wind', tooltip: "The wind fancies itself a playwright." }
    ];

    // Chance of a sea cell having an icon (1 in 20)
    this.iconChance = 0.05;

    // Map to track which cells have icons
    this.cellsWithIcons = new Map();

    // Add CSS for nautical icons and tooltips
    this.addStyles();
    
    // Apply icons initially
    setTimeout(() => {
      this.applyIcons();
      console.log('Applied sea icons after initial delay');
      
      // Apply again after a longer delay to catch any cells created during initial rendering
      setTimeout(() => {
        this.applyIcons();
        console.log('Applied sea icons after secondary delay');
      }, 2000);
    }, 500);
    
    // Add event listener for grid rebuilds
    document.addEventListener('gridRebuilt', () => {
      setTimeout(() => this.applyIcons(), 100);
    });
    
    // Create tooltip container once
    this.createTooltipContainer();
    
    console.log('SeaIcons module initialized');
  }
  
  createTooltipContainer() {
    // Check if tooltip container already exists
    if (document.getElementById('sea-icon-tooltip')) return;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'sea-icon-tooltip';
    tooltip.className = 'sea-icon-tooltip';
    tooltip.style.display = 'none';
    
    // Add to document body
    document.body.appendChild(tooltip);
  }
  
  addStyles() {
    if (document.getElementById('sea-icons-css')) return;
    
    const style = document.createElement('style');
    style.id = 'sea-icons-css';
    style.textContent = `
      /* Icon styles */
      .sea-icon {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        color: #00008B !important; /* Dark navy blue */
        font-size: 22px !important; /* Larger icons */
        opacity: 0.7 !important;
        z-index: 3 !important;
        pointer-events: auto !important; /* Changed to auto for hover effects */
        text-shadow: 0 0 2px rgba(255, 255, 255, 0.3) !important; /* Light text shadow for contrast */
        user-select: none !important;
        background: transparent !important; /* Ensure transparent background */
        cursor: help !important; /* Show help cursor on hover */
      }
      
      /* Add subtle animation to make icons feel alive */
      @keyframes float {
        0% { transform: translate(-50%, -50%) rotate(0deg) !important; }
        50% { transform: translate(-50%, -50%) rotate(5deg) !important; }
        100% { transform: translate(-50%, -50%) rotate(0deg) !important; }
      }
      
      .sea-icon {
        animation: float 3s ease-in-out infinite !important;
      }
      
      /* Different animation timing for variety */
      .sea-icon:nth-child(odd) {
        animation-duration: 4s !important;
        animation-delay: 1s !important;
      }
      
      /* Tooltip styles */
      .sea-icon-tooltip {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        max-width: 200px;
        text-align: center;
        z-index: 1000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        font-style: italic;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .sea-icon-tooltip.visible {
        opacity: 1;
      }
      
      /* Tooltip arrow */
      .sea-icon-tooltip:after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        margin-left: -10px;
        border-width: 10px 10px 0;
        border-style: solid;
        border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  getRandomIconData() {
    const index = Math.floor(Math.random() * this.iconData.length);
    return this.iconData[index];
  }
  
  applyIcons() {
    // Get the grid element
    const gridElement = this.gridRenderer.gridElement;
    if (!gridElement) {
      console.warn('Grid element not found');
      return;
    }

    // CRITICAL: Target ONLY deep sea cells by using specific selector
    // This is a more precise approach to ensure we only get the dark blue sea cells
    const seaCells = gridElement.querySelectorAll('.grid-cell:not(.path-cell):not(.start-cell):not(.selected-cell):not(.out-of-bounds)');
    
    // Process each potential sea cell
    seaCells.forEach(cellElement => {
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      const cellKey = `${x},${y}`;
      
      // Skip if invalid coordinates
      if (isNaN(x) || isNaN(y)) return;
      
      // CRITICAL: Verify this is actually a deep sea cell using computed style
      // This is the most reliable way to check if it's a dark blue sea cell
      const cellStyle = window.getComputedStyle(cellElement);
      const backgroundColor = cellStyle.backgroundColor;
      
      // Check if it's a dark blue sea cell (match RGB values for deep sea)
      // Note: This is an approximation, adjust the RGB values to match your deep sea color
      const isDeepSeaColor = this.isDeepSeaColorValue(backgroundColor);
      
      if (!isDeepSeaColor) {
        // Remove any existing icon if this isn't a deep sea cell
        const existingIcon = cellElement.querySelector('.sea-icon');
        if (existingIcon) {
          cellElement.removeChild(existingIcon);
          this.cellsWithIcons.delete(cellKey);
        }
        return;
      }
      
      // Check if this cell already has an icon decision
      if (!this.cellsWithIcons.has(cellKey)) {
        // Make a random decision: should this cell have an icon?
        const shouldHaveIcon = Math.random() < this.iconChance;
        
        // Store the decision and icon
        if (shouldHaveIcon) {
          this.cellsWithIcons.set(cellKey, {
            hasIcon: true,
            iconData: this.getRandomIconData()
          });
        } else {
          this.cellsWithIcons.set(cellKey, { hasIcon: false });
        }
      }
      
      // Get the cell's icon status
      const cellIconInfo = this.cellsWithIcons.get(cellKey);
      
      // Check if cell should have an icon
      if (cellIconInfo && cellIconInfo.hasIcon) {
        // See if icon already exists
        let iconElement = cellElement.querySelector('.sea-icon');
        
        // If no icon exists, create one
        if (!iconElement) {
          iconElement = document.createElement('i');
          iconElement.className = `sea-icon ${cellIconInfo.iconData.icon}`;
          iconElement.setAttribute('data-tooltip', cellIconInfo.iconData.tooltip);
          
          // Set up the tooltip functionality
          this.setupTooltipEvents(iconElement);
          
          // Append the icon to the cell
          cellElement.appendChild(iconElement);
        } else {
          // Update existing icon if needed
          if (!iconElement.hasAttribute('data-tooltip')) {
            iconElement.setAttribute('data-tooltip', cellIconInfo.iconData.tooltip);
            this.setupTooltipEvents(iconElement);
          }
        }
      } else {
        // Remove any existing icon if cell shouldn't have one
        const existingIcon = cellElement.querySelector('.sea-icon');
        if (existingIcon) {
          cellElement.removeChild(existingIcon);
        }
      }
    });
  }
  
  // Helper function to check if a color value matches deep sea blue
  isDeepSeaColorValue(colorValue) {
    // Convert the color value to RGB components
    // This handles both rgb() and rgba() formats
    const rgbMatch = colorValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      
      // Check if the color is dark blue (adjust these values as needed)
      // Deep sea cells typically have a darker blue color
      return (
        r < 50 && // Low red component
        g < 50 && // Low green component
        b > 100   // Higher blue component
      );
    }
    
    // If we can't parse the color, default to false
    return false;
  }
  
  setupTooltipEvents(iconElement) {
    const tooltipContainer = document.getElementById('sea-icon-tooltip');
    if (!tooltipContainer) return;
    
    // Mouse enter - show tooltip
    iconElement.addEventListener('mouseenter', (e) => {
      const tooltip = e.target.getAttribute('data-tooltip');
      if (!tooltip) return;
      
      // Set tooltip content
      tooltipContainer.textContent = tooltip;
      tooltipContainer.classList.add('visible');
      
      // Position tooltip above the icon
      const rect = iconElement.getBoundingClientRect();
      tooltipContainer.style.left = `${rect.left + rect.width / 2}px`;
      tooltipContainer.style.top = `${rect.top - 10 - tooltipContainer.offsetHeight}px`;
      tooltipContainer.style.display = 'block';
    });
    
    // Mouse leave - hide tooltip
    iconElement.addEventListener('mouseleave', () => {
      tooltipContainer.classList.remove('visible');
      setTimeout(() => {
        if (!tooltipContainer.classList.contains('visible')) {
          tooltipContainer.style.display = 'none';
        }
      }, 300);
    });
  }
}

export default SeaIcons;

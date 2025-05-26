/**
 * SeaIcons.js - Fixed Module for handling sea icons with tooltips
 * This version properly identifies deep sea cells and ensures icons are maintained during scrolling
 */
class SeaIcons {
  constructor(gridRenderer) {
    this.gridRenderer = gridRenderer;
    // Store a reference to window.seaIcons for debugging
    window.seaIcons = this;
    
    // Wait for proper grid initialization before starting
    setTimeout(() => this.initialize(), 800);
    
    console.log('SeaIcons: Module created, waiting for grid initialization');
  }
  
  initialize() {
    console.log('SeaIcons: Initializing module...');
    
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
    
    // Create tooltip container once
    this.createTooltipContainer();
    
    // Setup event listeners for grid updates
    this.setupEventListeners();
    
    // Initial icon application with delay to ensure grid is ready
    this.applyIcons();
    console.log('SeaIcons: Applied sea icons during initialization');
    
    // Set up interval to periodically check for new deep sea cells
    this.checkInterval = setInterval(() => this.applyIcons(), 2000);
  }
  
  setupEventListeners() {
    // Listen for grid rebuilds to reapply icons
    document.addEventListener('gridRebuilt', (e) => {
      console.log('SeaIcons: Grid rebuilt event detected');
      // Apply icons with delay to ensure grid is updated
      setTimeout(() => this.applyIcons(), 100);
    });
    
    // Listen for grid created events (initial setup)
    document.addEventListener('gridCreated', (e) => {
      console.log('SeaIcons: Grid created event detected');
      setTimeout(() => this.applyIcons(), 200);
    });
    
    // Listen for grid scroll completion to refresh icons
    document.addEventListener('gridScrollComplete', (e) => {
      console.log('SeaIcons: Grid scroll completed');
      setTimeout(() => this.applyIcons(), 150);
    });
    
    console.log('SeaIcons: Event listeners set up');
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
    console.log('SeaIcons: Created tooltip container');
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
        z-index: 50 !important; /* Higher z-index to ensure visibility */
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
    console.log('SeaIcons: Added styles to document');
  }
  
  getRandomIconData() {
    const index = Math.floor(Math.random() * this.iconData.length);
    return this.iconData[index];
  }
  
  applyIcons() {
    // Get the grid element
    const gridElement = this.gridRenderer.gridElement;
    if (!gridElement) {
      console.warn('SeaIcons: Grid element not found');
      return;
    }

    console.log('SeaIcons: Starting to apply icons');

    // FIXED: Simplify the sea cell selector to get all cells that look like deep sea
    // Instead of complicated CSS selectors, we'll check the background color directly
    const allCells = gridElement.querySelectorAll('.grid-cell');
    
    let deepSeaCount = 0;
    let iconedCellCount = 0;

    // Process each cell
    allCells.forEach(cellElement => {
      const x = parseInt(cellElement.dataset.gridX, 10);
      const y = parseInt(cellElement.dataset.gridY, 10);
      
      // Skip if invalid coordinates
      if (isNaN(x) || isNaN(y)) return;
      
      const cellKey = `${x},${y}`;
      
      // FIXED: Directly check for the deep sea color
      // Get computed style
      const computedStyle = window.getComputedStyle(cellElement);
      const backgroundColor = computedStyle.backgroundColor;
      
      // Check if this is a deep sea cell by color
      const isDeepSeaCell = this.isDeepBlueSeaColor(backgroundColor) && 
                           !cellElement.classList.contains('sea-adjacent') &&
                           !cellElement.classList.contains('path-cell') &&
                           !cellElement.classList.contains('selected-cell') &&
                           !cellElement.classList.contains('start-cell');
      
      if (!isDeepSeaCell) {
        // If not a deep sea cell, remove any existing icon
        const existingIcon = cellElement.querySelector('.sea-icon');
        if (existingIcon) {
          cellElement.removeChild(existingIcon);
          this.cellsWithIcons.delete(cellKey);
        }
        return;
      }
      
      // Count deep sea cells for debugging
      deepSeaCount++;
      
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
          
          // DIRECT STYLE APPLICATION for better visibility
          iconElement.style.position = 'absolute';
          iconElement.style.top = '50%';
          iconElement.style.left = '50%';
          iconElement.style.transform = 'translate(-50%, -50%)';
          iconElement.style.color = '#00008B'; // Dark navy blue
          iconElement.style.fontSize = '22px';
          iconElement.style.zIndex = '50';
          iconElement.style.opacity = '0.7';
          iconElement.style.pointerEvents = 'auto';
          iconElement.style.textShadow = '0 0 2px rgba(255, 255, 255, 0.3)';
          iconElement.style.background = 'transparent';
          iconElement.style.cursor = 'help';
          
          // Append after any text content to ensure it's not overwritten
          cellElement.appendChild(iconElement);
          iconedCellCount++;
          
          console.log(`SeaIcons: Added icon ${cellIconInfo.iconData.icon} to cell at ${x},${y}`);
        }
      } else {
        // Remove any existing icon if cell shouldn't have one
        const existingIcon = cellElement.querySelector('.sea-icon');
        if (existingIcon) {
          cellElement.removeChild(existingIcon);
        }
      }
    });
    
    console.log(`SeaIcons: Found ${deepSeaCount} deep sea cells, added icons to ${iconedCellCount} cells`);
  }
  
  // IMPROVED: Simpler deep sea color check
  isDeepBlueSeaColor(backgroundColor) {
    // Check for the default blue sea color
    if (!backgroundColor) return false;
    
    // Convert rgb/rgba to lowercase for consistent comparison
    const colorStr = backgroundColor.toLowerCase();
    
    // Check for any of the default blue variations
    const isDefaultBlue = 
      colorStr === 'rgb(86, 165, 214)' || // var(--defaultblue)
      colorStr === 'rgb(74, 145, 187)' || // var(--defaultblue-dark)
      colorStr === 'rgb(58, 130, 173)' || // var(--defaultblue-darker)
      colorStr === '#56a5d6' ||
      colorStr === '#4a91bb';
    
    // If exact match for default blue colors
    if (isDefaultBlue) return true;
    
    // Also check RGB components for bluish colors
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      
      // Check if it's a blue color (blue component much higher than others)
      return r < 120 && g < 180 && b > 160 && b > (r + g) / 2;
    }
    
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

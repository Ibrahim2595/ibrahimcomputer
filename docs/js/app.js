/**
 * Main Application - Static Version for GitHub Pages
 * Initializes and coordinates all modules
 */

(function() {
  /**
   * Initialize the application
   */
  async function init() {
    // Initialize modules
    ContentDisplay.init();
    TreeVisualization.init('tree-container', handleNodeSelect);
    
    // Load tree data from static JSON
    try {
      const response = await fetch('./data/tree-structure.json');
      const treeData = await response.json();
      TreeVisualization.loadData(treeData);
    } catch (error) {
      console.error('Failed to load tree data:', error);
    }
    
    // Set up global interactions
    setupGlobalInteractions();
  }
  
  /**
   * Handle node selection from tree
   */
  function handleNodeSelect(slug, name) {
    loadStaticContent(slug, name);
  }
  
  /**
   * Load content from static JSON file
   */
  async function loadStaticContent(slug, name) {
    try {
      const response = await fetch('./data/content/' + slug + '.json');
      if (!response.ok) {
        throw new Error('Content not found');
      }
      const data = await response.json();
      ContentDisplay.renderContentDirect(data, name);
    } catch (error) {
      console.error('Failed to load content:', error);
      ContentDisplay.renderErrorDirect(name);
    }
  }
  
  /**
   * Set up global click handlers and keyboard navigation
   */
  function setupGlobalInteractions() {
    document.addEventListener('click', (event) => {
      const contentSection = document.getElementById('content-section');
      const treeSection = document.getElementById('tree-section');
      
      if (ContentDisplay.isVisible()) {
        const isInContent = contentSection.contains(event.target);
        const isInTree = treeSection.contains(event.target);
        
        if (!isInContent && !isInTree) {
          ContentDisplay.hide();
          TreeVisualization.clearSelection();
        }
      }
    });
    
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && ContentDisplay.isVisible()) {
        ContentDisplay.hide();
        TreeVisualization.clearSelection();
      }
    });
  }
  
  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

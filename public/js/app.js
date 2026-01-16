/**
 * Main Application
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
    
    // Load tree data
    try {
      const response = await fetch('/api/tree');
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
    ContentDisplay.loadContent(slug, name);
  }
  
  /**
   * Set up global click handlers and keyboard navigation
   */
  function setupGlobalInteractions() {
    // Click outside content to close
    document.addEventListener('click', (event) => {
      const contentSection = document.getElementById('content-section');
      const treeSection = document.getElementById('tree-section');
      
      // If click is outside both tree nodes and content, close content
      if (ContentDisplay.isVisible()) {
        const isInContent = contentSection.contains(event.target);
        const isInTree = treeSection.contains(event.target);
        
        if (!isInContent && !isInTree) {
          ContentDisplay.hide();
          TreeVisualization.clearSelection();
        }
      }
    });
    
    // Escape key to close content
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

/**
 * D3 Tree Visualization Module
 * Handles rendering and interaction of the knowledge tree
 * 
 * =============================================================================
 * CUSTOMIZATION GUIDE:
 * =============================================================================
 * 
 * All visual properties are controlled via CSS variables in tree.css
 * Margins and breakpoints are configured below.
 * 
 * BREAKPOINTS (3 fixed sizes):
 * - Desktop: > 1024px
 * - Tablet: 481px - 1024px
 * - Mobile: <= 480px
 * 
 * DEFAULT LANDING STATE:
 * Configure config.defaultLanding to control initial tree state:
 * - 'collapsed': Only root node visible (default)
 * - 'expanded': Full tree expanded, about content shown
 * - 'path': Expand to specific node and show its content
 *   Use config.defaultPath to specify the path, e.g. ['Making', 'Experiments']
 * =============================================================================
 */

const TreeVisualization = (function() {
  // Configuration
  const config = {
    duration: 400,        // Animation duration in ms
    
    // ==========================================================================
    // DEFAULT LANDING STATE
    // ==========================================================================
    // Options: 'collapsed', 'expanded', 'path'
    defaultLanding: 'expanded',
    
    // If defaultLanding is 'path', specify the path to expand to
    // Example: ['Making', 'Experiments'] will expand to show Experiments
    // The last node in the path will be selected and its content shown
    defaultPath: [],
    // ==========================================================================
    
    // BREAKPOINTS
    tabletBreakpoint: 1024,
    mobileBreakpoint: 480,
    
    // POSITION & MARGINS - DESKTOP (> 1024px)
    margin: { 
      top: 20,
      right: 150,
      bottom: 20,
      left: 120
    },
    
    // POSITION & MARGINS - TABLET (481px - 1024px)
    marginTablet: {
      top: 15,
      right: 120,
      bottom: 15,
      left: 100
    },
    
    // POSITION & MARGINS - MOBILE (<= 480px) - EXPANDED
    marginMobile: {
      top: 10,
      right: 100,
      bottom: 10,
      left: 10
    },
    
    // POSITION & MARGINS - MOBILE (<= 480px) - COLLAPSED (show root text)
    marginMobileCollapsed: {
      top: 10,
      right: 100,
      bottom: 10,
      left: 100
    }
  };
  
  // State
  let svg, g, treemap, root;
  let currentWidth, currentHeight;
  let selectedNode = null;
  let onNodeSelect = null;
  let isTreeExpanded = false;  // Track if tree has been expanded from initial state
  
  /**
   * Get current breakpoint
   */
  function getBreakpoint() {
    const width = window.innerWidth;
    if (width > config.tabletBreakpoint) return 'desktop';
    if (width > config.mobileBreakpoint) return 'tablet';
    return 'mobile';
  }
  
  /**
   * Get current margin based on screen width and tree state
   */
  function getCurrentMargin() {
    const breakpoint = getBreakpoint();
    
    if (breakpoint === 'desktop') {
      return config.margin;
    } else if (breakpoint === 'tablet') {
      return config.marginTablet;
    } else {
      // Mobile - check expansion state
      const maxVisibleDepth = getMaxVisibleDepth();
      if (maxVisibleDepth <= 1) {
        return config.marginMobileCollapsed;
      }
      return config.marginMobile;
    }
  }
  
  /**
   * Get the maximum visible depth in the current tree state
   */
  function getMaxVisibleDepth() {
    if (!root) return 0;
    let maxDepth = 0;
    
    function traverse(node, depth) {
      if (depth > maxDepth) maxDepth = depth;
      if (node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    }
    
    traverse(root, 0);
    return maxDepth;
  }
  
  /**
   * Check if tree is in initial collapsed state (only root visible)
   */
  function isCollapsed() {
    return !root.children || root.children.length === 0;
  }
  
  /**
   * Update root label visibility on mobile
   */
  function updateRootLabelVisibility() {
    const breakpoint = getBreakpoint();
    const maxVisibleDepth = getMaxVisibleDepth();
    
    g.selectAll('.node.node--root').each(function() {
      const textEl = d3.select(this).select('text');
      const bgEl = d3.select(this).select('.label-bg');
      
      if (breakpoint === 'mobile' && maxVisibleDepth > 1) {
        textEl.style('opacity', 0);
        bgEl.style('opacity', 0);
      } else {
        textEl.style('opacity', 1);
        bgEl.style('opacity', 1);
      }
    });
  }
  
  /**
   * Update collapsed state class on root node
   */
  function updateCollapsedState() {
    const collapsed = isCollapsed();
    g.selectAll('.node.node--root')
      .classed('node--collapsed', collapsed);
  }
  
  /**
   * Initialize the tree visualization
   */
  function init(containerId, onSelect) {
    onNodeSelect = onSelect;
    
    const container = document.getElementById(containerId);
    svg = d3.select(`#${containerId} svg`);
    
    // Create main group for transforms
    g = svg.append('g');
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        updateDimensions(entry.contentRect.width, entry.contentRect.height);
      }
    });
    resizeObserver.observe(container);
    
    // Initial dimensions
    const rect = container.getBoundingClientRect();
    updateDimensions(rect.width, Math.max(rect.height, 300));
  }
  
  /**
   * Update dimensions on resize
   */
  function updateDimensions(width, height) {
    currentWidth = width;
    currentHeight = height;
    
    const margin = getCurrentMargin();
    
    svg.attr('width', width).attr('height', height);
    g.attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    treemap = d3.tree().size([
      height - margin.top - margin.bottom,
      width - margin.left - margin.right
    ]);
    
    if (root) {
      update(root);
    }
  }
  
  /**
   * Load and render tree data
   */
  function loadData(data) {
    root = d3.hierarchy(data, d => d.children);
    root.x0 = currentHeight / 2;
    root.y0 = 0;
    
    // Assign unique IDs
    let i = 0;
    root.descendants().forEach(d => {
      d.id = i++;
    });
    
    // Apply default landing state
    applyDefaultLandingState();
    
    update(root);
    
    // If landing state specifies a path or expanded, select appropriate node
    applyDefaultSelection();
  }
  
  /**
   * Apply the default landing state (collapsed, expanded, or path)
   */
  function applyDefaultLandingState() {
    if (config.defaultLanding === 'collapsed') {
      // Collapse everything - only root visible
      if (root.children) {
        root.children.forEach(collapse);
        root._children = root.children;
        root.children = null;
      }
      isTreeExpanded = false;
      
    } else if (config.defaultLanding === 'expanded') {
      // Expand everything
      expandAll(root);
      isTreeExpanded = true;
      
    } else if (config.defaultLanding === 'path' && config.defaultPath.length > 0) {
      // Collapse everything first
      if (root.children) {
        root.children.forEach(collapse);
      }
      // Then expand along the specified path
      expandPath(root, config.defaultPath);
      isTreeExpanded = true;
    }
  }
  
  /**
   * Apply default selection based on landing state
   */
  function applyDefaultSelection() {
    if (config.defaultLanding === 'expanded') {
      // Select root (about) content
      if (hasContent(root)) {
        setTimeout(() => selectNode(root), config.duration + 50);
      }
    } else if (config.defaultLanding === 'path' && config.defaultPath.length > 0) {
      // Find and select the node at the end of the path
      const targetNode = findNodeByPath(root, config.defaultPath);
      if (targetNode && hasContent(targetNode)) {
        setTimeout(() => selectNode(targetNode), config.duration + 50);
      }
    }
  }
  
  /**
   * Expand all nodes recursively
   */
  function expandAll(d) {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    if (d.children) {
      d.children.forEach(expandAll);
    }
  }
  
  /**
   * Expand nodes along a specific path
   */
  function expandPath(node, pathArray, index = 0) {
    if (index >= pathArray.length) return;
    
    // Expand this node if it has hidden children
    if (node._children) {
      node.children = node._children;
      node._children = null;
    }
    
    // Find the child matching the next path segment
    if (node.children) {
      const targetName = pathArray[index];
      const child = node.children.find(c => c.data.name === targetName);
      if (child) {
        expandPath(child, pathArray, index + 1);
      }
    }
  }
  
  /**
   * Find a node by path array
   */
  function findNodeByPath(node, pathArray, index = 0) {
    if (index >= pathArray.length) return node;
    
    const children = node.children || node._children;
    if (!children) return null;
    
    const targetName = pathArray[index];
    const child = children.find(c => c.data.name === targetName);
    if (child) {
      return findNodeByPath(child, pathArray, index + 1);
    }
    return null;
  }
  
  /**
   * Collapse a node and its children
   */
  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }
  
  /**
   * Toggle node expansion
   */
  function toggle(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else if (d._children) {
      d.children = d._children;
      d._children = null;
    }
  }
  
  /**
   * Check if node is a leaf
   */
  function isLeaf(d) {
    return !d.children && !d._children;
  }
  
  /**
   * Check if node is root
   */
  function isRoot(d) {
    return !d.parent;
  }
  
  /**
   * Check if node has content (slug)
   */
  function hasContent(d) {
    return d.data.slug !== null && d.data.slug !== undefined;
  }
  
  /**
   * Get node CSS class
   */
  function getNodeClass(d) {
    const classes = ['node'];
    
    if (isRoot(d)) {
      classes.push('node--root');
      if (d.children) classes.push('expanded');
      if (isCollapsed()) classes.push('node--collapsed');
    } else if (isLeaf(d)) {
      classes.push('node--leaf');
    } else {
      classes.push('node--parent');
    }
    
    if (d._children) {
      classes.push('node--has-children');
    }
    
    if (selectedNode && isOnActivePath(d)) {
      classes.push('node--active');
    }
    
    return classes.join(' ');
  }
  
  /**
   * Check if node is on the active path
   */
  function isOnActivePath(d) {
    if (!selectedNode) return false;
    const ancestors = selectedNode.ancestors();
    return ancestors.some(a => a.id === d.id);
  }
  
  /**
   * Handle node click
   */
  function handleNodeClick(event, d) {
    event.stopPropagation();
    
    // If this is the first click on collapsed root, just expand
    if (isRoot(d) && isCollapsed()) {
      isTreeExpanded = true;
      toggle(d);
      update(d);
      return;
    }
    
    // If node has content, select it
    if (hasContent(d)) {
      selectNode(d);
    }
    
    // If node has children, toggle expansion
    if (d.children || d._children) {
      toggle(d);
      update(d);
    }
  }
  
  /**
   * Select a content node
   */
  function selectNode(d) {
    selectedNode = d;
    
    // Update all node classes
    g.selectAll('.node').attr('class', n => getNodeClass(n));
    
    // Update link classes with delay
    updateActivePath();
    
    // Callback to load content
    if (onNodeSelect && d.data.slug) {
      onNodeSelect(d.data.slug, d.data.name);
    }
  }
  
  /**
   * Update the active path highlighting
   */
  function updateActivePath() {
    if (!selectedNode) {
      g.selectAll('.link').classed('link--active', false);
      return;
    }
    
    const ancestors = selectedNode.ancestors();
    const ancestorIds = new Set(ancestors.map(a => a.id));
    
    g.selectAll('.link').classed('link--active', function(d) {
      return ancestorIds.has(d.id) && d.parent && ancestorIds.has(d.parent.id);
    });
  }
  
  /**
   * Clear selection
   */
  function clearSelection() {
    selectedNode = null;
    g.selectAll('.node').attr('class', n => getNodeClass(n));
    g.selectAll('.link').classed('link--active', false);
  }
  
  /**
   * Get CSS variable value
   */
  function getCSSVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name);
    return value ? parseFloat(value) || value.trim() : fallback;
  }
  
  /**
   * Main update function
   */
  function update(source) {
    const margin = getCurrentMargin();
    
    // Update transform
    g.transition()
      .duration(config.duration)
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Update treemap
    treemap = d3.tree().size([
      currentHeight - margin.top - margin.bottom,
      currentWidth - margin.left - margin.right
    ]);
    
    const treeData = treemap(root);
    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);
    
    // Normalize depth
    const maxDepth = d3.max(nodes, d => d.depth) || 1;
    const depthWidth = (currentWidth - margin.left - margin.right) / Math.max(maxDepth, 4);
    nodes.forEach(d => {
      d.y = d.depth * depthWidth;
    });
    
    // ===== SINGLE LINKS (rounded caps) =====
    const link = g.selectAll('.link')
      .data(links, d => d.id);
    
    const linkEnter = link.enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o = { x: source.x0, y: source.y0 };
        return diagonal(o, o);
      });
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate
      .transition()
      .duration(config.duration)
      .attr('d', d => diagonal(d, d.parent));
    
    // Update active state
    linkUpdate.classed('link--active', d => {
      if (!selectedNode) return false;
      const ancestors = selectedNode.ancestors();
      const ancestorIds = new Set(ancestors.map(a => a.id));
      return ancestorIds.has(d.id) && d.parent && ancestorIds.has(d.parent.id);
    });
    
    link.exit()
      .transition()
      .duration(config.duration)
      .attr('d', () => {
        const o = { x: source.x, y: source.y };
        return diagonal(o, o);
      })
      .remove();
    
    // ===== NODES =====
    const node = g.selectAll('.node')
      .data(nodes, d => d.id);
    
    const nodeEnter = node.enter()
      .append('g')
      .attr('class', d => getNodeClass(d))
      .attr('transform', `translate(${source.y0},${source.x0})`)
      .style('opacity', 0)
      .on('click', handleNodeClick);
    
    // Get radius based on collapsed state
    const getNodeRadius = (d) => {
      if (isRoot(d) && isCollapsed()) {
        return getCSSVar('--node-radius-collapsed', 8);
      }
      return getCSSVar('--node-radius', 5);
    };
    
    // Add circles
    nodeEnter.append('circle')
      .attr('class', 'node-shape')
      .attr('r', d => getNodeRadius(d));
    
    // Add white background rect behind text
    nodeEnter.append('rect')
      .attr('class', 'label-bg')
      .attr('fill', 'white')
      .attr('rx', 1)
      .attr('ry', 1);
    
    // Add labels
    nodeEnter.append('text')
      .attr('dy', '.35em')
      .attr('x', d => (isLeaf(d) && !isRoot(d)) ? 12 : -12)
      .attr('text-anchor', d => (isLeaf(d) && !isRoot(d)) ? 'start' : 'end')
      .text(d => d.data.name)
      .each(function(d) {
        const padding = getCSSVar('--label-bg-padding', 1);
        const bbox = this.getBBox();
        d3.select(this.parentNode).select('.label-bg')
          .attr('x', bbox.x - padding)
          .attr('y', bbox.y - padding)
          .attr('width', bbox.width + padding * 2)
          .attr('height', bbox.height + padding * 2);
      });
    
    // Update
    const nodeUpdate = nodeEnter.merge(node);
    
    nodeUpdate.transition()
      .duration(config.duration)
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('opacity', 1);
    
    nodeUpdate.attr('class', d => getNodeClass(d));
    
    // Update circle radius based on collapsed state
    nodeUpdate.select('.node-shape')
      .attr('r', d => getNodeRadius(d));
    
    // Update text position
    nodeUpdate.select('text')
      .attr('x', d => (isLeaf(d) && !isRoot(d)) ? 12 : -12)
      .attr('text-anchor', d => (isLeaf(d) && !isRoot(d)) ? 'start' : 'end');
    
    // Exit
    node.exit()
      .transition()
      .duration(config.duration)
      .attr('transform', `translate(${source.y},${source.x})`)
      .style('opacity', 0)
      .remove();
    
    // Store positions
    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
    
    // Update UI states
    updateRootLabelVisibility();
    updateCollapsedState();
  }
  
  /**
   * Generate diagonal path (curved line)
   */
  function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
  }
  
  // Public API
  return {
    init,
    loadData,
    selectNode,
    clearSelection
  };
})();

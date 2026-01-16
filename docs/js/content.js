/**
 * Content Display Module
 * Handles loading and rendering of Markdown content in table format
 */

const ContentDisplay = (function() {
  // DOM Elements
  let contentSection;
  let contentTitle;
  let contentMeta;
  let contentDescription;
  let contentImageContainer;
  let contentBody;
  let contentFooter;
  let treeSection;
  
  // State
  let currentSlug = null;
  
  /**
   * Initialize the content display
   */
  function init() {
    contentSection = document.getElementById('content-section');
    contentTitle = document.getElementById('content-title');
    contentMeta = document.getElementById('content-meta');
    contentDescription = document.getElementById('content-description');
    contentImageContainer = document.getElementById('content-image-container');
    contentBody = document.getElementById('content-body');
    contentFooter = document.getElementById('content-footer');
    treeSection = document.getElementById('tree-section');
    
    console.log('ContentDisplay initialized');
    console.log('Elements found:', {
      contentSection: !!contentSection,
      contentTitle: !!contentTitle,
      contentMeta: !!contentMeta,
      contentDescription: !!contentDescription,
      contentImageContainer: !!contentImageContainer,
      contentBody: !!contentBody,
      contentFooter: !!contentFooter,
      treeSection: !!treeSection
    });
  }
  
  /**
   * Load and display content for a given slug
   */
  async function loadContent(slug, name) {
    console.log('loadContent called with slug:', slug, 'name:', name);
    
    try {
      const url = `/api/content/${slug}`;
      console.log('Fetching:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Content not found: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Content data received:', data);
      
      renderContent(data, name);
      show();
      currentSlug = slug;
      
    } catch (error) {
      console.error('Error loading content:', error);
      renderError(name);
      show();
    }
  }
  
  /**
   * Load content from pre-loaded data (static version)
   */
  function loadContentStatic(slug, name) {
    console.log('loadContentStatic called with slug:', slug);
    
    if (window.__CONTENT_DATA__ && window.__CONTENT_DATA__[slug]) {
      const data = window.__CONTENT_DATA__[slug];
      renderContent(data, name);
      show();
      currentSlug = slug;
    } else {
      renderError(name);
      show();
    }
  }
  
  /**
   * Render content data to the DOM in table format
   */
  function renderContent(data, fallbackName) {
    console.log('renderContent called with:', data);
    
    // Title
    if (contentTitle) {
      contentTitle.textContent = data.title || fallbackName;
    }
    
    // Meta information (date, collaborators)
    if (contentMeta) {
      const metaItems = [];
      
      if (data.date) {
        metaItems.push(`<span class="content-meta-item">${formatDate(data.date)}</span>`);
      }
      
      if (data.collaborators && data.collaborators.length > 0) {
        const collabList = Array.isArray(data.collaborators) 
          ? data.collaborators.join(', ')
          : data.collaborators;
        metaItems.push(`<span class="content-meta-item">${collabList}</span>`);
      }
      
      contentMeta.innerHTML = metaItems.join('');
    }
    
    // Description (first paragraph or explicit description)
    if (contentDescription) {
      if (data.description) {
        contentDescription.textContent = data.description;
        contentDescription.style.display = 'block';
      } else {
        // Extract first paragraph from content as description
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.content || '';
        const firstP = tempDiv.querySelector('p');
        if (firstP) {
          contentDescription.textContent = firstP.textContent;
          contentDescription.style.display = 'block';
          // Remove first paragraph from main content
          firstP.remove();
          data.content = tempDiv.innerHTML;
        } else {
          contentDescription.textContent = '';
          contentDescription.style.display = 'none';
        }
      }
    }
    
    // Image - only show if image is specified
    if (contentImageContainer) {
      if (data.image && data.image !== 'null' && data.image !== '') {
        contentImageContainer.innerHTML = `<img src="${data.image}" alt="${data.title}" class="content-image">`;
        contentImageContainer.style.display = 'flex';
      } else {
        // Hide the image container completely if no image
        contentImageContainer.innerHTML = '';
        contentImageContainer.style.display = 'none';
      }
    }
    
    // Remaining body content
    if (contentBody) {
      contentBody.innerHTML = data.content || '';
    }
    
    // References and Resources in footer
    if (contentFooter) {
      let footerHtml = '';
      
      if (data.references && data.references.length > 0) {
        const refList = data.references.map(ref => `<li>${ref}</li>`).join('');
        footerHtml += `
          <div class="content-references">
            <span class="content-references-label">references</span>
            <ul class="content-references-list">${refList}</ul>
          </div>
        `;
      }
      
      if (data.resources && data.resources.length > 0) {
        const resList = data.resources.map(res => {
          // If it looks like a URL, make it a link
          if (res.startsWith('http')) {
            const domain = new URL(res).hostname.replace('www.', '');
            return `<li><a href="${res}" target="_blank">${domain}</a></li>`;
          }
          return `<li>${res}</li>`;
        }).join('');
        footerHtml += `
          <div class="content-resources">
            <span class="content-references-label">resources</span>
            <ul class="content-references-list">${resList}</ul>
          </div>
        `;
      }
      
      contentFooter.innerHTML = footerHtml;
    }
    
    console.log('Content rendered successfully');
  }
  
  /**
   * Render error state
   */
  function renderError(name) {
    console.log('renderError called for:', name);
    
    if (contentTitle) contentTitle.textContent = name || 'Not Found';
    if (contentMeta) contentMeta.innerHTML = '';
    if (contentDescription) {
      contentDescription.textContent = 'Content could not be loaded.';
      contentDescription.style.display = 'block';
    }
    if (contentImageContainer) {
      contentImageContainer.innerHTML = `
        <svg class="content-placeholder" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="100" height="80" rx="4" stroke="#888" stroke-width="2" fill="none"/>
          <path d="M10 70 L40 45 L60 60 L85 35 L110 55 L110 90 L10 90 Z" fill="#bbb"/>
          <circle cx="35" cy="35" r="10" fill="#bbb"/>
        </svg>
      `;
    }
    if (contentBody) contentBody.innerHTML = '';
    if (contentFooter) contentFooter.innerHTML = '';
  }
  
  /**
   * Format date for display
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${month} ${year}`;
    } catch {
      return dateStr;
    }
  }
  
  /**
   * Show the content section
   */
  function show() {
    console.log('show() called');
    if (contentSection) {
      contentSection.classList.add('visible');
      console.log('Added visible class to content section');
    }
    if (treeSection) {
      treeSection.classList.add('has-content');
    }
    
    // NOTE: Auto-scroll removed - user prefers no auto-scrolling
  }
  
  /**
   * Hide the content section
   */
  function hide() {
    if (contentSection) contentSection.classList.remove('visible');
    if (treeSection) treeSection.classList.remove('has-content');
    currentSlug = null;
  }
  
  /**
   * Check if content is currently visible
   */
  function isVisible() {
    return contentSection && contentSection.classList.contains('visible');
  }
  
  /**
   * Render content directly (for static version)
   */
  function renderContentDirect(data, name) {
    renderContent(data, name);
    show();
  }
  
  /**
   * Render error directly (for static version)
   */
  function renderErrorDirect(name) {
    renderError(name);
    show();
  }
  
  // Public API
  return {
    init,
    loadContent,
    loadContentStatic,
    hide,
    isVisible,
    renderContentDirect,
    renderErrorDirect
  };
})();

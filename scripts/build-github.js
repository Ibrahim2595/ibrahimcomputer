#!/usr/bin/env node

/**
 * Build Static Site for GitHub Pages
 * 
 * Run this script before deploying to GitHub Pages:
 *   npm run build-github
 * 
 * It will:
 * 1. Copy public files to /docs
 * 2. Convert markdown content to JSON
 * 3. Create the data directory structure
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const CATEGORIES_FILE = path.join(__dirname, '..', 'categories', 'tree-structure.json');
const DOCS_DIR = path.join(__dirname, '..', 'docs');

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true
});

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function build() {
  console.log('🔨 Building static site for GitHub Pages...\n');
  
  // 1. Clean and create docs directory
  console.log('📁 Cleaning docs directory...');
  await fs.rm(DOCS_DIR, { recursive: true, force: true });
  await fs.mkdir(DOCS_DIR, { recursive: true });
  
  // 2. Copy public files
  console.log('📋 Copying public files...');
  await copyDir(PUBLIC_DIR, DOCS_DIR);
  
  // 3. Create data directory
  console.log('📂 Creating data directory...');
  await fs.mkdir(path.join(DOCS_DIR, 'data', 'content'), { recursive: true });
  
  // 4. Copy tree structure
  console.log('🌳 Copying tree structure...');
  await fs.copyFile(
    CATEGORIES_FILE,
    path.join(DOCS_DIR, 'data', 'tree-structure.json')
  );
  
  // 5. Convert markdown to JSON
  console.log('📝 Converting markdown to JSON...');
  const files = await fs.readdir(CONTENT_DIR);
  const markdownFiles = files.filter(f => f.endsWith('.md'));
  
  for (const file of markdownFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    const htmlContent = marked.parse(content);
    const slug = file.replace('.md', '');
    
    const jsonData = {
      ...frontmatter,
      content: htmlContent
    };
    
    await fs.writeFile(
      path.join(DOCS_DIR, 'data', 'content', `${slug}.json`),
      JSON.stringify(jsonData, null, 2)
    );
    
    console.log(`   ✓ ${slug}.json`);
  }
  
  // 6. Update app.js for static loading
  console.log('🔧 Updating app.js for static loading...');
  const appJsPath = path.join(DOCS_DIR, 'js', 'app.js');
  const staticAppJs = `/**
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
`;
  
  await fs.writeFile(appJsPath, staticAppJs);
  
  console.log('\n✅ Build complete! Files are in /docs folder.');
  console.log('\n📤 Next steps:');
  console.log('   1. Commit and push to GitHub');
  console.log('   2. Go to repo Settings → Pages');
  console.log('   3. Set source to "Deploy from branch"');
  console.log('   4. Select branch "main" and folder "/docs"');
  console.log('   5. Save and wait for deployment');
}

build().catch(console.error);

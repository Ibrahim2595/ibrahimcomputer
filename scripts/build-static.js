#!/usr/bin/env node

/**
 * Static Site Builder
 * Generates a static version of the knowledge website
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const PATHS = {
  content: path.join(__dirname, '..', 'content'),
  public: path.join(__dirname, '..', 'public'),
  tree: path.join(__dirname, '..', 'categories', 'tree-structure.json'),
  dist: path.join(__dirname, '..', 'dist')
};

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

async function processContent() {
  const files = await fs.readdir(PATHS.content);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  
  const content = {};
  
  for (const file of mdFiles) {
    const filePath = path.join(PATHS.content, file);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(fileContent);
    
    const slug = file.replace('.md', '');
    content[slug] = {
      ...frontmatter,
      content: marked.parse(body),
      raw: body
    };
  }
  
  return content;
}

async function generateStaticIndex(treeData, contentData) {
  const indexPath = path.join(PATHS.public, 'index.html');
  let html = await fs.readFile(indexPath, 'utf-8');
  
  const dataScript = `
<script>
  window.__TREE_DATA__ = ${JSON.stringify(treeData)};
  window.__CONTENT_DATA__ = ${JSON.stringify(contentData)};
</script>
`;
  
  html = html.replace(
    '<!-- D3.js -->',
    `${dataScript}\n  <!-- D3.js -->`
  );
  
  return html;
}

async function generateStaticAppJs() {
  return `/**
 * Main Application (Static Version)
 */
(function() {
  async function init() {
    ContentDisplay.init();
    TreeVisualization.init('tree-container', handleNodeSelect);
    
    if (window.__TREE_DATA__) {
      TreeVisualization.loadData(window.__TREE_DATA__);
    }
    
    setupGlobalInteractions();
  }
  
  function handleNodeSelect(slug, name) {
    ContentDisplay.loadContentStatic(slug, name);
  }
  
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
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

async function build() {
  console.log('Building static site...\n');
  
  try {
    await fs.rm(PATHS.dist, { recursive: true });
  } catch {}
  await fs.mkdir(PATHS.dist, { recursive: true });
  
  console.log('Copying public files...');
  await copyDir(PATHS.public, PATHS.dist);
  
  console.log('Processing content...');
  const treeData = JSON.parse(await fs.readFile(PATHS.tree, 'utf-8'));
  const contentData = await processContent();
  
  console.log('Generating static index.html...');
  const staticIndex = await generateStaticIndex(treeData, contentData);
  await fs.writeFile(path.join(PATHS.dist, 'index.html'), staticIndex);
  
  console.log('Generating static app.js...');
  const staticAppJs = await generateStaticAppJs();
  await fs.writeFile(path.join(PATHS.dist, 'js', 'app.js'), staticAppJs);
  
  console.log('\n✓ Static site built successfully!');
  console.log(`  Output: ${PATHS.dist}`);
  console.log('\nTo preview: npx serve dist');
}

build().catch(console.error);

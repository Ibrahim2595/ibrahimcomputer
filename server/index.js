const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const marked = require('marked');
const matter = require('gray-matter');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const CATEGORIES_FILE = path.join(__dirname, '..', 'categories', 'tree-structure.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Middleware
app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true
});

/**
 * Get the tree structure for D3 visualization
 */
app.get('/api/tree', async (req, res) => {
  try {
    const treeData = await fs.readFile(CATEGORIES_FILE, 'utf-8');
    res.json(JSON.parse(treeData));
  } catch (error) {
    console.error('Error reading tree structure:', error);
    res.status(500).json({ error: 'Failed to load tree structure' });
  }
});

/**
 * Get content for a specific node
 */
app.get('/api/content/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const filePath = path.join(CONTENT_DIR, `${slug}.md`);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    const htmlContent = marked.parse(content);
    
    res.json({
      ...frontmatter,
      content: htmlContent,
      raw: content
    });
  } catch (error) {
    console.error('Error reading content:', error);
    res.status(404).json({ error: 'Content not found' });
  }
});

/**
 * List all content files
 */
app.get('/api/content', async (req, res) => {
  try {
    const files = await fs.readdir(CONTENT_DIR);
    const markdownFiles = files.filter(f => f.endsWith('.md'));
    
    const contents = await Promise.all(
      markdownFiles.map(async (file) => {
        const filePath = path.join(CONTENT_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data: frontmatter } = matter(fileContent);
        return {
          slug: file.replace('.md', ''),
          ...frontmatter
        };
      })
    );
    
    res.json(contents);
  } catch (error) {
    console.error('Error listing content:', error);
    res.status(500).json({ error: 'Failed to list content' });
  }
});

/**
 * Serve the main page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Knowledge website running at http://localhost:${PORT}`);
});

module.exports = app;

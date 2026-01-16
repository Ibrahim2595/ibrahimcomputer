#!/usr/bin/env node

/**
 * Content Categorization Script
 * Uses Ollama to analyze Markdown files and suggest ARTISTIC categories
 * 
 * Features:
 * - Analyzes content against existing categories
 * - Suggests poetic/artistic category names (not literal descriptions)
 * - Can add children to existing leaf nodes (convert them to branches)
 * - Allows specifying custom paths
 * - Requires user confirmation before making changes
 * 
 * Usage:
 *   node scripts/categorize.js <file.md>           - Categorize a single file
 *   node scripts/categorize.js --watch             - Watch for new files
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const readline = require('readline');

// Configuration
const CONFIG = {
  model: 'phi3',  // Small model that runs well on CPU
  ollamaUrl: 'http://localhost:11434',
  contentDir: path.join(__dirname, '..', 'content'),
  treeFile: path.join(__dirname, '..', 'categories', 'tree-structure.json')
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Load the current tree structure
 */
async function loadTree() {
  try {
    const data = await fs.readFile(CONFIG.treeFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading tree:', error.message);
    return null;
  }
}

/**
 * Save the tree structure
 */
async function saveTree(tree) {
  await fs.writeFile(CONFIG.treeFile, JSON.stringify(tree, null, 2));
}

/**
 * Extract all nodes from the tree with their paths (both branches and leaves)
 */
function extractAllNodes(node, nodes = [], pathArr = []) {
  const currentPath = node.name ? [...pathArr, node.name] : pathArr;
  
  // Add this node
  if (node.name) {
    nodes.push({
      name: node.name,
      slug: node.slug,
      path: currentPath.join(' > '),
      fullPath: currentPath,
      hasChildren: !!node.children,
      isLeaf: !node.children
    });
  }
  
  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      extractAllNodes(child, nodes, currentPath);
    }
  }
  
  return nodes;
}

/**
 * Call Ollama API for categorization
 */
async function callOllama(promptText) {
  try {
    const response = await fetch(`${CONFIG.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: promptText,
        stream: false,
        options: {
          temperature: 0.7,  // Higher temperature for more creative names
          num_predict: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Error: Ollama is not running.');
      console.error('   Start it with: ollama serve');
    } else {
      console.error('Error calling Ollama:', error.message);
    }
    return null;
  }
}

/**
 * Read and parse a Markdown file
 */
async function readMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);
  return { frontmatter, body, filePath };
}

/**
 * Build the categorization prompt - emphasizing CONSISTENT naming style
 */
function buildPrompt(content, existingNodes) {
  const nodeList = existingNodes
    .map(n => `- "${n.name}" (path: ${n.path}) [${n.hasChildren ? 'branch' : 'leaf'}]`)
    .join('\n');

  return `You are a categorization assistant for a personal knowledge website. Your job is to suggest category names that match the EXISTING naming style.

EXISTING NODES IN THE TREE:
${nodeList}

NEW CONTENT TO CATEGORIZE:
Title: ${content.frontmatter.title || 'Untitled'}
Description: ${content.frontmatter.description || 'No description'}
Content Preview:
${content.body.slice(0, 800)}

NAMING STYLE GUIDELINES (match existing categories):
- Names are SHORT: 1-2 words, rarely 3 words
- Names are SIMPLE: plain English, no jargon
- Names are GERUNDS or NOUNS: "Thinking", "Making", "Readings", "Signals", "Seeds"
- Names suggest ACTION or CATEGORY: "Input", "Experiments", "Prototypes"
- Names are LOWERCASE with first letter capitalized: "On my desk", "Now", "Next", "Past"
- NO metaphors, NO poetic language, NO abstract concepts
- NO hyphens, NO special characters

EXAMPLES OF CORRECT STYLE:
- "Readings" (not "Literary Journeys")
- "Signals" (not "Whispers from the Edge")
- "Seeds" (not "Nascent Possibilities")
- "Experiments" (not "Playing with Fire")
- "Now" (not "Current Explorations")

YOUR TASK:
1. Analyze what the content is about
2. Determine if it fits under an EXISTING node or needs a NEW one
3. If new, suggest a name that MATCHES the existing style exactly
4. You can suggest adding as a CHILD to any existing node

RESPOND IN THIS EXACT JSON FORMAT:
{
  "summary": "One sentence describing the content",
  "recommendation": "existing" or "new",
  "existingMatch": {
    "nodeName": "name of matching node or null",
    "addAs": "sibling" or "child",
    "reasoning": "why this fits"
  },
  "newCategory": {
    "name": "Simple Name",
    "parentPath": "full path like: Hi, I'm Ibrahim > Thinking > On my desk",
    "reasoning": "why this name fits the style"
  }
Only respond with valid JSON, no other text.`;
}

/**
 * Parse JSON from LLM response
 */
function parseJsonResponse(response) {
  try {
    let cleaned = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse LLM response as JSON');
    console.error('Raw response:', response);
    return null;
  }
}

/**
 * Find a node in the tree by name (recursive search)
 */
function findNodeByName(tree, name) {
  if (tree.name === name) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find a node by its full path
 */
function findNodeByPath(tree, pathStr) {
  const pathArray = pathStr.split(' > ').map(s => s.trim());
  let current = tree;
  
  // If first element matches root, start from there
  if (pathArray[0] === tree.name) {
    pathArray.shift();
  }
  
  for (const name of pathArray) {
    if (!current.children) return null;
    const child = current.children.find(c => 
      c.name.toLowerCase() === name.toLowerCase()
    );
    if (!child) return null;
    current = child;
  }
  
  return current;
}

/**
 * Add a node as child of another node
 * NOTE: Parent node can have BOTH a slug (content) AND children
 */
function addChildNode(parentNode, newNode) {
  // If parent doesn't have children array, create it
  // The parent keeps its slug - it can have both content AND children
  if (!parentNode.children) {
    parentNode.children = [];
  }
  
  // Check if node already exists
  const exists = parentNode.children.some(c => c.name === newNode.name);
  if (exists) {
    console.log(`Node "${newNode.name}" already exists`);
    return false;
  }
  
  parentNode.children.push(newNode);
  return true;
}

/**
 * Add a node as sibling (under same parent)
 */
function addSiblingNode(tree, existingNodeName, newNode) {
  function findParent(node, targetName, parent = null) {
    if (node.name === targetName) return parent;
    if (node.children) {
      for (const child of node.children) {
        const found = findParent(child, targetName, node);
        if (found) return found;
      }
    }
    return null;
  }
  
  const parent = findParent(tree, existingNodeName);
  if (!parent) {
    console.error(`Could not find parent of "${existingNodeName}"`);
    return false;
  }
  
  return addChildNode(parent, newNode);
}

/**
 * Main categorization function
 */
async function categorizeFile(filePath) {
  console.log(`\n📄 Processing: ${path.basename(filePath)}`);
  console.log('─'.repeat(50));
  
  const tree = await loadTree();
  if (!tree) {
    console.error('Could not load tree structure');
    return null;
  }

  const allNodes = extractAllNodes(tree);
  const content = await readMarkdownFile(filePath);
  console.log(`   Title: ${content.frontmatter.title || 'Untitled'}`);
  
  const promptText = buildPrompt(content, allNodes);
  console.log('\n🤖 Analyzing with Ollama (creative mode)...\n');
  
  const response = await callOllama(promptText);
  if (!response) return null;

  const result = parseJsonResponse(response);
  if (!result) {
    console.error('Could not parse AI response');
    return null;
  }

  // Display analysis
  console.log('📊 Analysis Result:');
  console.log(`   Summary: ${result.summary}`);
  console.log(`   Recommendation: ${result.recommendation.toUpperCase()}`);
  
  if (result.recommendation === 'existing' && result.existingMatch?.nodeName) {
    console.log(`\n   📁 Match: "${result.existingMatch.nodeName}"`);
    console.log(`   Add as: ${result.existingMatch.addAs}`);
    console.log(`   Reason: ${result.existingMatch.reasoning}`);
  } else if (result.recommendation === 'new' && result.newCategory?.name) {
    console.log(`\n   ✨ New category: "${result.newCategory.name}"`);
    console.log(`   Location: under "${result.newCategory.parentPath}"`);
    console.log(`   Reason: ${result.newCategory.reasoning}`);
  }
  
  // User confirmation
  console.log('\n' + '─'.repeat(50));
  const action = await promptUserAction(result, content, tree);
  
  if (action === 'confirm') {
    await applyChanges(result, content, tree);
    console.log('\n✅ Changes applied! Restart server to see updates.');
  } else if (action === 'custom') {
    await handleCustomCategory(content, tree, allNodes);
  } else {
    console.log('\n❌ Operation cancelled.');
  }
  
  return result;
}

/**
 * Prompt user for action
 */
async function promptUserAction(result, content, tree) {
  console.log('\nWhat would you like to do?');
  console.log('  [y] Accept recommendation');
  console.log('  [n] Cancel operation');
  console.log('  [c] Specify custom category/path');
  
  const answer = await prompt('\nYour choice (y/n/c): ');
  
  switch (answer.toLowerCase()) {
    case 'y':
    case 'yes':
      return 'confirm';
    case 'c':
    case 'custom':
      return 'custom';
    default:
      return 'cancel';
  }
}

/**
 * Apply the recommended changes
 */
async function applyChanges(result, content, tree) {
  const slug = path.basename(content.filePath, '.md');
  
  if (result.recommendation === 'new' && result.newCategory?.name) {
    // Use the name as-is (no formatting)
    const newNode = {
      name: result.newCategory.name,
      slug: slug,
      children: null
    };
    
    const parentPath = result.newCategory.parentPath;
    const parent = findNodeByPath(tree, parentPath);
    
    if (parent) {
      if (addChildNode(parent, newNode)) {
        await saveTree(tree);
        console.log(`   Added "${result.newCategory.name}" under "${parentPath}"`);
      }
    } else {
      console.error(`   Parent path not found: "${parentPath}"`);
      console.log('   Try using custom category option.');
    }
  } else if (result.recommendation === 'existing' && result.existingMatch?.nodeName) {
    // Use title as-is or slug as fallback
    const nodeName = content.frontmatter.title || slug;
    const newNode = {
      name: nodeName,
      slug: slug,
      children: null
    };
    
    if (result.existingMatch.addAs === 'child') {
      const parent = findNodeByName(tree, result.existingMatch.nodeName);
      if (parent && addChildNode(parent, newNode)) {
        await saveTree(tree);
        console.log(`   Added "${nodeName}" as child of "${result.existingMatch.nodeName}"`);
      }
    } else {
      if (addSiblingNode(tree, result.existingMatch.nodeName, newNode)) {
        await saveTree(tree);
        console.log(`   Added "${nodeName}" as sibling to "${result.existingMatch.nodeName}"`);
      }
    }
  }
}

/**
 * Handle custom category input
 */
async function handleCustomCategory(content, tree, allNodes) {
  console.log('\n📝 Custom Category Setup');
  console.log('─'.repeat(50));
  
  // Show all nodes as potential parents
  console.log('\nAvailable locations (can add children to ANY node):');
  allNodes.forEach((n, i) => {
    const type = n.hasChildren ? '📁' : '📄';
    console.log(`  [${i + 1}] ${type} ${n.path}`);
  });
  console.log(`  [${allNodes.length + 1}] 🏠 Root level`);
  
  const parentChoice = await prompt('\nSelect parent location (number): ');
  const parentIndex = parseInt(parentChoice) - 1;
  
  let parentNode;
  if (parentIndex === allNodes.length) {
    parentNode = tree;
  } else if (parentIndex >= 0 && parentIndex < allNodes.length) {
    parentNode = findNodeByName(tree, allNodes[parentIndex].name);
  } else {
    console.log('Invalid selection, using root level.');
    parentNode = tree;
  }
  
  const categoryName = await prompt('Enter category name: ');
  
  if (!categoryName) {
    console.log('No category name provided, cancelling.');
    return;
  }
  
  const slug = path.basename(content.filePath, '.md');
  // Use name as-is (no formatting)
  const newNode = {
    name: categoryName,
    slug: slug,
    children: null
  };
  
  if (addChildNode(parentNode, newNode)) {
    await saveTree(tree);
    console.log(`\n✅ Added "${categoryName}"`);
    console.log('   Restart server to see updates.');
  }
}

/**
 * Check if Ollama is running
 */
async function checkOllama() {
  try {
    const response = await fetch(`${CONFIG.ollamaUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      const hasModel = data.models?.some(m => m.name.startsWith(CONFIG.model));
      if (!hasModel) {
        console.log(`\n⚠️  Model '${CONFIG.model}' not found.`);
        console.log(`   Pull it with: ollama pull ${CONFIG.model}\n`);
        return false;
      }
      return true;
    }
  } catch {
    console.log('\n❌ Ollama is not running.');
    console.log('   Start it with: ollama serve\n');
    return false;
  }
  return false;
}

/**
 * Watch for new files
 */
async function watchForChanges() {
  console.log(`\n👀 Watching ${CONFIG.contentDir} for new files...`);
  console.log('   Press Ctrl+C to stop.\n');

  const { watch } = require('fs');
  
  watch(CONFIG.contentDir, async (eventType, filename) => {
    if (eventType === 'rename' && filename && filename.endsWith('.md')) {
      const filePath = path.join(CONFIG.contentDir, filename);
      try {
        await fs.access(filePath);
        await categorizeFile(filePath);
      } catch {
        // File was deleted, ignore
      }
    }
  });
  
  await new Promise(() => {});
}

/**
 * Print usage
 */
function printUsage() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       Content Categorization Script (Artistic Mode)           ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  node scripts/categorize.js <file.md>    Categorize a single file
  node scripts/categorize.js --watch      Watch for new files

Features:
  • Suggests ARTISTIC category names (not literal descriptions)
  • Can add children to ANY node (even leaves become branches)
  • Custom path specification for full control

Requirements:
  • Ollama running (ollama serve)
  • Model '${CONFIG.model}' (ollama pull ${CONFIG.model})
`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    rl.close();
    return;
  }
  
  const ollamaReady = await checkOllama();
  if (!ollamaReady) {
    rl.close();
    process.exit(1);
  }

  if (args.includes('--watch')) {
    await watchForChanges();
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    const filePath = path.resolve(args[0]);
    await categorizeFile(filePath);
    rl.close();
  } else {
    printUsage();
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  rl.close();
});

# Knowledge Website

An interactive personal knowledge website with D3 tree visualization.

## Quick Start

```bash
npm install
npm start
```

Visit `http://localhost:3000`

## Project Structure

```
knowledge-website/
├── server/index.js         # Express server
├── public/
│   ├── index.html          # Main page
│   ├── css/                # Styles
│   └── js/                 # D3 tree + content display
├── content/                # Markdown files
├── categories/
│   └── tree-structure.json # Tree hierarchy
└── scripts/
    ├── categorize.js       # AI categorization
    └── build-static.js     # Static site builder
```

## AI Categorization

The categorization script uses Ollama to analyze new content:

```bash
# Start Ollama
ollama serve
ollama pull phi3

# Categorize a file
npm run categorize -- content/new-file.md
```

The script will:
1. Analyze your content against existing categories
2. Suggest either an existing category or propose a new one
3. Ask for your confirmation before making changes
4. Allow you to specify a custom category if you prefer

## Adding Content

### Option 1: Manual

1. Create a Markdown file in `content/`:

```markdown
---
title: My Title
description: Brief description for the table view
date: 2024-01-15
collaborators: []
references: []
---

Content here...
```

2. Add to `categories/tree-structure.json`:

```json
{
  "name": "My Title",
  "slug": "my-file-name",
  "children": null
}
```

### Option 2: AI-Assisted

```bash
npm run categorize -- content/my-file.md
```

## Static Build

```bash
npm run build-static
npx serve dist
```

## Tree Structure Format

```json
{
  "name": "Display Name",
  "slug": "content-file-name-or-null",
  "children": [
    { "name": "Child", "slug": "child-slug", "children": null }
  ]
}
```

- `slug`: Filename without `.md` (null for branch nodes)
- `children`: Array of child nodes (null for leaf nodes)

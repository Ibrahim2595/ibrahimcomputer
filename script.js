// Define the tree data
const data = {
    "name": "I'm Ibrahim",
    "children": [
        { "name": "About" },
        { "name": "Interests", "children": [
            { "name": "Minerals & rocks" },
            { "name": "Bicycles" },
        ]},
        { "name": "on my desk", "children": [
            { "name": "Reflections" },
            { "name": "Projects", "children": [
                { "name": "Interactions" },
                { "name": "AIs" },
                { "name": "Drones" }
            ]}
        ]}
    ]
};

const default_circle_dim = 5;
const small_screen_circle_dim = 2;
const highlighted_var = "About";
const expanded_node = "About";
const default_opacity = 1.0; // Default opacity
const highlighted_opacity = 1.0; // Highlighted opacity

// Function to get margin based on screen size
function getMargin() {
    if (isSmallScreen()) {
        return { top: 1, right: 10, bottom: 1, left: 70 };
    } else {
        return { top: 1, right: 10, bottom: 1, left: 100 };
    }
}

function isSmallScreen() {
    return window.innerWidth <= 600;
}

// Function to get container height based on screen size
function getContainerHeight() {
    return isSmallScreen() ? 150 : 300;
}

// Set the initial container height
document.querySelector('#tree-container').style.height = getContainerHeight() + 'px';

let margin = getMargin();

// Get the container dimensions and adjust the tree layout size dynamically
function getDimensions() {
    const container = document.querySelector('#tree-container');
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom; // Adjust height dynamically
    return { width, height };
}

let { width, height } = getDimensions();

// Variables for node ID and transition duration
let i = 0,
    duration = 350;

// Create the tree layout
const tree = d3.tree().size([height, width]);

// Append SVG object to the container div
const svg = d3.select("#tree-container").append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

let root, clickedNode;

// Assigns parent, children, height, depth
root = d3.hierarchy(data, function(d) { return d.children; });
root.x0 = height / 2;
root.y0 = 0;

// Collapse all nodes except the root and "Projects" children
root.children.forEach(d => {
    if (d.data.name !== expanded_node) {
        collapse(d);
    } 
    // else {
    //     d.children.forEach(child => expand(child));
    // }
});

// Default highlighted node
clickedNode = findNode(root, highlighted_var);

// Update the tree
update(root);

function update(source) {
    margin = getMargin();
    const dimensions = getDimensions();
    width = dimensions.width;
    height = dimensions.height;

    // Update the tree layout size
    tree.size([height, width]);

    // Update the SVG viewBox and transform
    d3.select("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .select("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const treeData = tree(root);

    // Compute the new tree layout
    const nodes = treeData.descendants(),
          links = treeData.descendants().slice(1);

    if (isSmallScreen()) {
        nodes.forEach(function(d) { d.y = d.depth * 60 }); // Increase depth for larger spacing on small screens
        nodes.forEach(function(d) { d.x = d.x * 1.0; }); // Increase vertical spacing on small screens
    } else {
        nodes.forEach(function(d) { d.y = d.depth * 190 }); // Increase depth for larger spacing on large screens
        nodes.forEach(function(d) { d.x = d.x * 1.0; }); // Increase vertical spacing on large screens
    }

    // Update the nodes
    const node = svg.selectAll('g.node')
        .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new nodes at the parent's previous position
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', function(d) {
            return `translate(${source.y0},${source.x0})`;
        })
        .on('click', click);

    // Add Circle for the nodes
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6) // Initial circle size
        .style('fill', function(d) {
            return d._children ? "#555" : "#999";
        });

    // Add labels for the nodes
    nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('x', function(d) {
            if (isSmallScreen()) {
            return d.children || d._children ? -5 : 5;
            }
            else {
                return d.children || d._children ? -10 : 10;  
            }
        })
        .attr('text-anchor', function(d) {
            return d.children || d._children ? "end" : "start";
        })
        .text(function(d) { return d.data.name; })
        .style('fill', function(d) {
            return clickedNode && clickedNode === d ? 'red' : 'gray'; // Highlight clicked text
        });

    // Add background rectangle for the text
    nodeEnter.append('rect')
        .attr('x', function(d) {
            const textNode = d3.select(this.parentNode).select('text').node();
            return textNode.getBBox().x - 2;
        })
        .attr('y', function(d) {
            const textNode = d3.select(this.parentNode).select('text').node();
            return textNode.getBBox().y - 2;
        })
        .attr('width', function(d) {
            const textNode = d3.select(this.parentNode).select('text').node();
            return textNode.getBBox().width + 4;
        })
        .attr('height', function(d) {
            const textNode = d3.select(this.parentNode).select('text').node();
            return textNode.getBBox().height + 4;
        })
        .attr('fill', 'white')
        .lower();  // Ensure the rectangle is behind the text

    // Transition nodes to their new position
    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition()
        .duration(duration)
        .attr('transform', function(d) {
            return `translate(${d.y},${d.x})`;
        });

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
        .attr('r', isSmallScreen() ? small_screen_circle_dim : default_circle_dim) // Adjust circle size based on screen size
        .style('fill', function(d) {
            return (clickedNode && clickedNode.ancestors().includes(d)) || clickedNode === d ? 'red' : (d._children ? "#555" : "#999"); // Highlight clicked node and ancestors
        })
        .style('opacity', function(d) {
            return (clickedNode && clickedNode.ancestors().includes(d)) || clickedNode === d ? highlighted_opacity : default_opacity; // Change opacity for clicked node and ancestors
        })
        .attr('cursor', 'pointer');

    // Update text color
    nodeUpdate.select('text')
        .style('fill', function(d) {
            return clickedNode && clickedNode === d ? 'red' : 'gray'; // Highlight clicked text
        });

    // Remove any exiting nodes
    const nodeExit = node.exit().transition()
        .duration(duration)
        .attr('transform', function(d) {
            return `translate(${source.y},${source.x})`;
        })
        .remove();

    nodeExit.select('circle')
        .attr('r', 1e-6);

    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // Update the links
    const link = svg.selectAll('path.link')
        .data(links, function(d) { return d.id; });

    // Enter any new links at the parent's previous position
    const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', function(d) {
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
        });

    // Transition links to their new position
    const linkUpdate = linkEnter.merge(link);

    linkUpdate.transition()
        .duration(duration)
        .attr('d', function(d) { return diagonal(d, d.parent); })
        .style('stroke', function(d) {
            return clickedNode && clickedNode.ancestors().includes(d) ? 'red' : '#555'; // Highlight clicked path
        })
        .style('stroke-width', function(d) {
            return clickedNode && clickedNode.ancestors().includes(d) ? 3 : 1.5; // Highlight clicked path
        });

    // Remove any exiting links
    const linkExit = link.exit().transition()
        .duration(duration)
        .attr('d', function(d) {
            const o = { x: source.x, y: source.y };
            return diagonal(o, o);
        })
        .remove();

    // Store the old positions for transition
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {
        const path = `M ${s.y} ${s.x}
                C ${(s.y + d.y) / 2} ${s.x},
                  ${(s.y + d.y) / 2} ${d.x},
                  ${d.y} ${d.x}`;
        return path;
    }

    // Toggle children on click
    function click(event, d) {
        if (!d.children && !d._children) {
            clickedNode = d; // Set the clicked node
        } else if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }
}

// Helper function to find a node by name
function findNode(root, name) {
    if (root.data.name === name) {
        return root;
    }
    if (root.children) {
        for (let child of root.children) {
            const result = findNode(child, name);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

// Helper function to expand a node
function expand(d) {
    if (d._children) {
        d.children = d._children;
        d.children.forEach(expand);
        d._children = null;
    }
}

// Helper function to collapse a node
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

// Ensure the tree resizes correctly when the window is resized
window.addEventListener('resize', () => {
    document.querySelector('#tree-container').style.height = getContainerHeight() + 'px';
    margin = getMargin();
    const dimensions = getDimensions();
    width = dimensions.width;
    height = dimensions.height;
    d3.select("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .select("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    update(root);
});

// frontend/js/mindmap.js

/**
 * This file handles the mind map page logic
 * All shared logic (sidebar, auth, hamburger, logout) is in main.js
 */

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection: Must be logged in
  if (!token) {
    alert("Please log in to access the mind map page.");
    window.location.href = "home.html";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Date.now() / 1000;
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem("token");
      alert("Session expired. Please log in again.");
      window.location.href = "home.html";
      return;
    }

    const name = payload.name || payload.email?.split("@")[0] || "Student";
    if (usernameSpan) {
      usernameSpan.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch (err) {
    console.warn("Invalid token:", err);
    localStorage.removeItem("token");
    window.location.href = "home.html";
    return;
  }

  // Initialize mind map
  initMindMap();
});

// Initialize the mind map page
function initMindMap() {
  // Optional: Retrieve last summary
  const lastSummary = localStorage.getItem("studybloom-last-summary");

  if (lastSummary && lastSummary.trim() !== "") {
    console.log("Last summary loaded for mind map generation:", lastSummary);
    // Generate mind map from the last summary automatically
    generateMindMapFromText(lastSummary);
  } else {
    // Show a message that no summary is available
    const canvas = document.querySelector(".mindmap-canvas");
    if (canvas) {
      canvas.innerHTML = `
        <div class="no-content-message">
          <h3>No Summary Available</h3>
          <p>Go back to the summary page to generate a summary first, then click "Generate Mind Map"</p>
          <button class="auth-btn" onclick="window.location.href='summary.html'">Go to Summary Page</button>
        </div>
      `;
    }
  }
}

// Function to generate mind map from text
async function generateMindMapFromText(text) {
  // Show loading state
  const canvas = document.querySelector(".mindmap-canvas");
  if (canvas) {
    canvas.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Generating mind map...</p>
      </div>
    `;
  }

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/ai/mindmap`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text }),
    });

    const data = await response.json();

    if (data.success) {
      // Render the mind map with the generated data
      renderMindMap(data.mindMap);
    } else {
      throw new Error(data.message || "Failed to generate mind map");
    }
  } catch (error) {
    console.error("Error generating mind map:", error);

    const canvas = document.querySelector(".mindmap-canvas");
    if (canvas) {
      canvas.innerHTML = `
        <div class="error-message">
          <h3>Error Generating Mind Map</h3>
          <p>${error.message}</p>
          <button class="auth-btn" onclick="initMindMap()">Try Again</button>
        </div>
      `;
    }
  }
}

// Function to render the mind map using D3.js with beautiful styling
function renderMindMap(mindMapData) {
  const canvas = document.querySelector(".mindmap-canvas");
  if (!canvas) return;

  // Helper function to wrap text
  function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.2, // ems
          y = text.attr("y") || 0,
          dy = parseFloat(text.attr("dy")) || 0,
          // First tspan: Absolute Y + initial DY (pixels)
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "px");
          
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          // Subsequent lines: Relative positioning (no Y), shift down by lineHeight
          tspan = text.append("tspan").attr("x", 0).attr("dy", lineHeight + "em").text(word);
        }
      }
    });
  }

  // Clear the canvas
  canvas.innerHTML = "";

  // Get canvas dimensions
  const canvasWidth = canvas.clientWidth || 1200;
  const canvasHeight = canvas.clientHeight || 800;

  // Create SVG element
  const svg = d3
    .select(canvas)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .call(d3.zoom().on("zoom", (event) => {
       g.attr("transform", event.transform);
    }))
    .on("dblclick.zoom", null); // Disable double click zoom

  // Add beautiful background gradient
  const defs = svg.append("defs");

  // Create radial gradient for background
  const radialGradient = defs
    .append("radialGradient")
    .attr("id", "mindmapBackground")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "80%");

  radialGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#f8fafc"); // Light blue-gray

  radialGradient
    .append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "#f1f5f9"); // Slightly darker

  radialGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#e2e8f0"); // Even darker

  // Apply gradient to background
  svg
    .append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "url(#mindmapBackground)");

  // Create a group for zoomable content
  const g = svg.append("g").attr("class", "mindmap-content");

  // Define the root of the mind map
  const root = d3.hierarchy(mindMapData);

  // Use a tree layout with nodeSize for consistent spacing
  // nodeSize takes [height, width] for horizontal trees (x=height, y=width)
  const treeLayout = d3.tree()
    .nodeSize([80, 250]) // 80px vertical spacing, 250px horizontal spacing
    .separation((a, b) => {
      return a.parent === b.parent ? 1.2 : 1.4; // Separation factor
    });

  treeLayout(root);

  // Initial centering of the tree
  // root.x is vertical position (centered at 0 by d3.tree), root.y is horizontal (0)
  // We shift it to be vertically centered in canvas and start from left with some margin
  const initialTransform = d3.zoomIdentity.translate(150, canvasHeight / 2);
  svg.call(d3.zoom().transform, initialTransform);

  // Define a sophisticated color palette based on depth
  const colorPalette = [
    "#2563eb", // Deep blue (root)
    "#7c3aed", // Purple
    "#0891b2", // Cyan
    "#059669", // Green
    "#dc2626", // Red
    "#ea580c", // Orange
    "#ca8a04", // Yellow
    "#be123c", // Pink-red
  ];

  // Create links with beautiful curved paths
  const links = g
    .selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr(
      "d",
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)
    )
    .attr("fill", "none")
    .attr("stroke", (d) => {
      // Use consistent color based on parent depth for clearer relationships
      return colorPalette[d.source.depth % colorPalette.length];
    })
    .attr("stroke-width", (d) => {
      const baseWidth = 2.5;
      // Reduce stroke width more gradually for better visual hierarchy
      return Math.max(1, baseWidth - d.source.depth * 0.25);
    })
    .attr("stroke-opacity", 0.6)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round");

  // Define drag behavior
  const drag = d3.drag()
    .on("start", function(event, d) {
      d3.select(this).raise();
      d3.select(this).attr("cursor", "grabbing");
    })
    .on("drag", function(event, d) {
      d.y += event.dx;
      d.x += event.dy;
      d3.select(this).attr("transform", `translate(${d.y},${d.x})`);

      // Update connected links
      g.selectAll(".link")
        .filter(l => l.source === d || l.target === d)
        .attr("d", d3.linkHorizontal()
          .x(l => l.y)
          .y(l => l.x));
    })
    .on("end", function(event, d) {
      d3.select(this).attr("cursor", "pointer");
    });

  // Create nodes with enhanced styling
  const nodes = g
    .selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.y}, ${d.x})`)
    .attr("cursor", "pointer")
    .call(drag);

  // Add node circles with beautiful styling - with improved sizing for neatness
  nodes
    .append("circle")
    .attr("r", (d) => {
      if (d.depth === 0) return 30; // Root node
      if (d.depth === 1) return 24; // First level
      if (d.depth === 2) return 18; // Second level
      return 14; // Deeper levels
    })
    .attr("fill", (d) => {
      // Create subtle gradient effect using opacity
      const baseColor = colorPalette[d.depth % colorPalette.length];
      return d.depth === 0 ? baseColor : d3.color(baseColor).brighter(0.3);
    })
    .attr("stroke", (d) => {
      const baseColor = colorPalette[d.depth % colorPalette.length];
      return d3.color(baseColor).darker(0.5);
    })
    .attr("stroke-width", (d) => (d.depth === 0 ? 4 : 2)) // Reduced strokes for cleaner look
    .attr("stroke-opacity", 0.8)
    .attr("fill-opacity", 0.9);

  // Add subtle drop shadow filter
  const filter = defs
    .append("filter")
    .attr("id", "dropShadow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  filter
    .append("feDropShadow")
    .attr("dx", 2)
    .attr("dy", 2)
    .attr("stdDeviation", 3)
    .attr("flood-opacity", 0.3);

  // Apply shadow to nodes
  nodes.select("circle").attr("filter", "url(#dropShadow)");

  // Add text labels with improved readability and positioning
  nodes
    .append("text")
    .attr("dy", (d) => {
      // Position text with more space from nodes for better visual separation
      if (d.depth === 0) return -45; // Reduced space for root node to save space
      if (d.children) return -38; // Reduced space for parent nodes
      return 40; // Reduced space for leaf nodes
    })
    .attr("text-anchor", "middle")
    .attr("font-size", (d) => {
      if (d.depth === 0) return "16px"; // Reduced font for better spacing
      if (d.depth === 1) return "14px"; // Reduced for better spacing
      if (d.depth === 2) return "12px"; // Reduced for better spacing
      return "11px"; // Reduced for better spacing
    })
    .attr(
      "font-family",
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    )
    .attr("font-weight", (d) => (d.depth === 0 ? "600" : "500")) // Reduced weight for cleaner look
    .attr("fill", "#1e293b")
    .attr("stroke", "white")
    .attr("stroke-width", 2) // Reduced stroke for cleaner text
    .attr("paint-order", "stroke")
    .attr("class", "node-label")
    .text((d) => d.data.name || "")
    .call(wrap, 200)
    .append("title")
    .text((d) => d.data.name || ""); // Add tooltip for full text

  // Add background rectangle for better text readability
  nodes
    .append("rect")
    .attr("class", "node-label-bg")
    .attr("x", function (d) {
      // Create temporary text element to measure the actual text
      const textElement = d3.select(this.parentNode).select(".node-label");
      try {
        const bbox = textElement.node().getBBox();
        return bbox.x - 6; // Reduced padding for better compactness
      } catch (e) {
        // Fallback values if getBBox fails
        return -15;
      }
    })
    .attr("y", function (d) {
      // Create temporary text element to measure the actual text
      const textElement = d3.select(this.parentNode).select(".node-label");
      try {
        const bbox = textElement.node().getBBox();
        return bbox.y - 2;
      } catch (e) {
        // Fallback values if getBBox fails
        const offset = d.depth === 0 ? -49 : d.children ? -41 : 35; // Updated offsets
        return offset - 6; // Reduced padding
      }
    })
    .attr("width", function (d) {
      // Create temporary text element to measure the actual text
      const textElement = d3.select(this.parentNode).select(".node-label");
      try {
        const bbox = textElement.node().getBBox();
        return bbox.width + 12; // Reduced padding for better compactness
      } catch (e) {
        // Fallback values if getBBox fails
        return 35;
      }
    })
    .attr("height", function (d) {
      // Create temporary text element to measure the actual text
      const textElement = d3.select(this.parentNode).select(".node-label");
      try {
        const bbox = textElement.node().getBBox();
        return bbox.height + 4; // Reduced padding for better compactness
      } catch (e) {
        // Fallback values if getBBox fails
        return 18;
      }
    })
    .attr("fill", "rgba(255, 255, 255, 0.9)")
    .attr("rx", 6) // Reduced corner radius
    .attr("ry", 6)
    .attr("stroke", "#e2e8f0") // Slightly different border for better look
    .attr("stroke-width", 1)
    .lower(); // Send behind text

  // Add enhanced hover effects
  nodes
    .on("mouseover", function (event, d) {
      d3.select(this)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", (circleRadius) => {
          // Increase radius on hover for better feedback, but not too much
          if (d.depth === 0) return 34; // Root node
          if (d.depth === 1) return 28; // First level
          if (d.depth === 2) return 22; // Second level
          return 18; // Deeper levels
        })
        .attr("stroke-width", d.depth === 0 ? 5 : 3) // Moderate stroke width
        .attr("stroke-opacity", 1);

      d3.select(this)
        .select(".node-label")
        .transition()
        .duration(200)
        .attr("font-weight", "700") // Bolder on hover
        .attr("font-size", (d) => {
          // Slightly increase font size on hover
          if (d.depth === 0) return "17px";
          if (d.depth === 1) return "15px";
          if (d.depth === 2) return "13px";
          return "12px";
        });
      
      // Update rect size on hover change
      const group = d3.select(this);
      setTimeout(() => {
          group.select(".node-label-bg")
            .attr("x", function() {
                try { return group.select(".node-label").node().getBBox().x - 6; } catch(e) { return -15; }
            })
            .attr("y", function() {
                try { return group.select(".node-label").node().getBBox().y - 2; } catch(e) { return -10; }
            })
            .attr("width", function() {
                try { return group.select(".node-label").node().getBBox().width + 12; } catch(e) { return 35; }
            })
            .attr("height", function() {
                try { return group.select(".node-label").node().getBBox().height + 4; } catch(e) { return 18; }
            });
      }, 50);
    })
    .on("mouseout", function (event, d) {
      d3.select(this)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", (circleRadius) => {
          // Return to normal size
          if (d.depth === 0) return 30;
          if (d.depth === 1) return 24;
          if (d.depth === 2) return 18;
          return 14;
        })
        .attr("stroke-width", d.depth === 0 ? 4 : 2)
        .attr("stroke-opacity", 0.8);

      d3.select(this)
        .select(".node-label")
        .transition()
        .duration(200)
        .attr("font-weight", (d) => (d.depth === 0 ? "600" : "500"))
        .attr("font-size", (d) => {
          // Return to normal font size
          if (d.depth === 0) return "16px";
          if (d.depth === 1) return "14px";
          if (d.depth === 2) return "12px";
          return "11px";
        });
        
      // Update rect size on hover change
      const group = d3.select(this);
      setTimeout(() => {
          group.select(".node-label-bg")
            .attr("x", function() {
                try { return group.select(".node-label").node().getBBox().x - 6; } catch(e) { return -15; }
            })
            .attr("y", function() {
                try { return group.select(".node-label").node().getBBox().y - 2; } catch(e) { return -10; }
            })
            .attr("width", function() {
                try { return group.select(".node-label").node().getBBox().width + 12; } catch(e) { return 35; }
            })
            .attr("height", function() {
                try { return group.select(".node-label").node().getBBox().height + 4; } catch(e) { return 18; }
            });
      }, 50);
    });

  // Add click effects for interaction
  nodes.on("click", function (event, d) {
    // Highlight selected node
    nodes.select("circle").attr("stroke", null);
    d3.select(this)
      .select("circle")
      .attr("stroke", "#fbbf24")
      .attr("stroke-width", 5);
  });

  // Setup Zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    
  // Attach zoom to svg (this was done in the initial creation too, but keeping logic consistent)
  svg.call(zoom);
  
  // Set initial zoom transform
  svg.call(zoom.transform, initialTransform);


  // Add smooth animations for initial rendering with orderly appearance
  // Start with root node, then children, then grandchildren, etc.
  nodes
    .attr("opacity", 0)
    .attr("transform", (d) => {
      // Start from the root position for all nodes for cleaner animation
      return `translate(${root.y}, ${root.x})`; 
    })
    .transition()
    .duration(1000)
    .delay((d) => d.depth * 400 + (d.parent ? d.parent.children.indexOf(d) * 150 : 0)) // Increased delays for better spacing
    .attr("transform", (d) => {
      return `translate(${d.y}, ${d.x})`;
    })
    .attr("opacity", 1);

  links
    .attr("opacity", 0)
    .transition()
    .duration(1200)
    .delay((d, i) => d.source.depth * 400 + i * 100) // Animate by depth first, then by index
    .attr("opacity", 0.6);

  // Add a subtle pulsing animation for the root node
  const rootNode = nodes.filter((d) => d.depth === 0);
  rootNode
    .select("circle")
    .transition()
    .duration(2000)
    .attr("stroke-width", 5)
    .transition()
    .duration(2000)
    .attr("stroke-width", 4)
    .on("end", function repeat() {
      d3.select(this)
        .transition()
        .duration(2000)
        .attr("stroke-width", 5)
        .transition()
        .duration(2000)
        .attr("stroke-width", 4)
        .on("end", repeat);
    });


}

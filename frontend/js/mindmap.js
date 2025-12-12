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
    .attr("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

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

  // Use a beautiful, balanced tree layout
  const treeLayout = d3
    .tree()
    .size([canvasHeight - 200, canvasWidth - 400])
    .separation((a, b) => {
      return a.parent === b.parent ? 2 : 3;
    });

  treeLayout(root);

  // Center the tree horizontally
  root.x = canvasHeight / 2;

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
        .x((d) => d.y + 200) // Offset for left margin
        .y((d) => d.x)
    )
    .attr("fill", "none")
    .attr("stroke", (d) => colorPalette[d.source.depth % colorPalette.length])
    .attr("stroke-width", (d) => {
      const baseWidth = 3;
      return Math.max(1, baseWidth - d.source.depth * 0.3);
    })
    .attr("stroke-opacity", 0.7)
    .attr("stroke-linecap", "round");

  // Create nodes with enhanced styling
  const nodes = g
    .selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.y + 200}, ${d.x})`) // Offset for left margin
    .attr("cursor", "pointer");

  // Add node circles with beautiful styling
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
    .attr("stroke-width", (d) => (d.depth === 0 ? 4 : 2))
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

  // Add text labels with improved readability
  nodes
    .append("text")
    .attr("dy", (d) => (d.depth === 0 ? -40 : d.children ? -35 : 35))
    .attr("text-anchor", "middle")
    .attr("font-size", (d) => {
      if (d.depth === 0) return "16px";
      if (d.depth === 1) return "14px";
      if (d.depth === 2) return "12px";
      return "11px";
    })
    .attr(
      "font-family",
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    )
    .attr("font-weight", (d) => (d.depth === 0 ? "600" : "500"))
    .attr("fill", "#1e293b")
    .attr("stroke", "white")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .attr("class", "node-label")
    .text((d) => {
      // Better text handling - show more characters and add tooltips
      const name = d.data.name || "";
      const maxLength = d.depth === 0 ? 20 : d.depth === 1 ? 25 : 30;
      return name.length > maxLength
        ? name.substring(0, maxLength) + "..."
        : name;
    })
    .append("title")
    .text((d) => d.data.name || ""); // Add tooltip for full text

  // Add background rectangle for better text readability
  nodes
    .filter((d) => d.depth > 0) // Only for non-root nodes
    .append("rect")
    .attr("x", function (d) {
      const textElement = d3.select(this.parentNode).select(".node-label");
      const bbox = textElement.node().getBBox();
      return bbox.x - 5;
    })
    .attr("y", function (d) {
      const textElement = d3.select(this.parentNode).select(".node-label");
      const bbox = textElement.node().getBBox();
      return bbox.y - 2;
    })
    .attr("width", function (d) {
      const textElement = d3.select(this.parentNode).select(".node-label");
      const bbox = textElement.node().getBBox();
      return bbox.width + 10;
    })
    .attr("height", function (d) {
      const textElement = d3.select(this.parentNode).select(".node-label");
      const bbox = textElement.node().getBBox();
      return bbox.height + 4;
    })
    .attr("fill", "rgba(255, 255, 255, 0.9)")
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("stroke", "#e2e8f0")
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
          if (d.depth === 0) return 34;
          if (d.depth === 1) return 28;
          if (d.depth === 2) return 22;
          return 18;
        })
        .attr("stroke-width", d.depth === 0 ? 5 : 3)
        .attr("stroke-opacity", 1);

      d3.select(this)
        .select(".node-label")
        .transition()
        .duration(200)
        .attr("font-weight", "700")
        .attr("font-size", (d) => {
          if (d.depth === 0) return "17px";
          if (d.depth === 1) return "15px";
          if (d.depth === 2) return "13px";
          return "12px";
        });
    })
    .on("mouseout", function (event, d) {
      d3.select(this)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", (circleRadius) => {
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
          if (d.depth === 0) return "16px";
          if (d.depth === 1) return "14px";
          if (d.depth === 2) return "12px";
          return "11px";
        });
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

  // Add zoom and pan functionality
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Add smooth animations for initial rendering
  nodes
    .attr("opacity", 0)
    .transition()
    .duration(600)
    .delay((d, i) => i * 80)
    .attr("opacity", 1);

  links
    .attr("opacity", 0)
    .transition()
    .duration(800)
    .delay((d, i) => i * 50)
    .attr("opacity", 0.7);

  // Add a subtle pulsing animation for the root node
  const rootNode = nodes.filter((d) => d.depth === 0);
  rootNode
    .select("circle")
    .transition()
    .duration(2000)
    .attr("stroke-width", 6)
    .transition()
    .duration(2000)
    .attr("stroke-width", 4)
    .on("end", function repeat() {
      d3.select(this)
        .transition()
        .duration(2000)
        .attr("stroke-width", 6)
        .transition()
        .duration(2000)
        .attr("stroke-width", 4)
        .on("end", repeat);
    });

  // Add a reset zoom button
  const resetButton = svg
    .append("g")
    .attr("class", "reset-button")
    .attr("transform", `translate(${canvasWidth - 60}, 30)`)
    .attr("cursor", "pointer")
    .style("opacity", 0.8);

  resetButton
    .append("circle")
    .attr("r", 20)
    .attr("fill", "#2563eb")
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  resetButton
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("fill", "white")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Reset");

  resetButton.on("click", () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });

  resetButton.on("mouseover", function () {
    d3.select(this).transition().duration(200).style("opacity", 1);
  });

  resetButton.on("mouseout", function () {
    d3.select(this).transition().duration(200).style("opacity", 0.8);
  });
}

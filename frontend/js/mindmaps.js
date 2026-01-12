/**
 * This file handles the mind maps list page logic
 * All shared logic (sidebar, auth, hamburger, logout) is in main.js
 */

// Global variable to store mind maps
let mindMaps = [];
let selectedMindMapId = null;
let mindMapToDelete = null;

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection: Must be logged in
  if (!token) {
    alert("Please log in to access your mind maps.");
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

  // Initialize mind maps page
  initMindMapsPage();
});

// Initialize the mind maps page
function initMindMapsPage() {
  // Wait for content to be injected by main.js
  const contentCheck = setInterval(() => {
    const searchInput = document.getElementById("searchInput");
    const mindmapsGrid = document.getElementById("mindmapsGrid");
    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");
    const closeModalBtn = document.getElementById("closeModal");
    const viewMindmapBtn = document.getElementById("viewMindmapBtn");
    const deleteMindmapBtn = document.getElementById("deleteMindmapBtn");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const closeConfirmModalBtn = document.getElementById("closeConfirmModal");

    if (searchInput && mindmapsGrid) {
      clearInterval(contentCheck);

      // Setup search functionality
      searchInput.addEventListener("input", handleSearch);

      // Setup modal close
      if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeModal);
      }

      // Setup view mindmap button
      if (viewMindmapBtn) {
        viewMindmapBtn.addEventListener("click", handleViewMindMap);
      }

      // Setup delete mindmap button (in details modal)
      if (deleteMindmapBtn) {
        deleteMindmapBtn.addEventListener("click", handleDeleteMindMap);
      }

      // Setup cancel delete button (confirmation modal)
      if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener("click", hideConfirmModal);
      }

      // Setup confirm delete button (confirmation modal)
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", confirmDeleteMindMap);
      }

      // Setup close button for confirmation modal
      if (closeConfirmModalBtn) {
        closeConfirmModalBtn.addEventListener("click", hideConfirmModal);
      }

      // Close modal when clicking outside
      window.addEventListener("click", function (event) {
        const modal = document.getElementById("mindmapModal");
        const confirmModal = document.getElementById("confirmModal");
        if (event.target === modal) {
          closeModal();
        }
        if (event.target === confirmModal) {
          hideConfirmModal();
        }
      });

      // Load mind maps
      loadMindMaps();
    }
  }, 100);
}

// Load mind maps from backend
async function loadMindMaps() {
  const token = localStorage.getItem("token");
  if (!token) {
    showError("Please log in to view your mind maps.");
    return;
  }

  const mindmapsGrid = document.getElementById("mindmapsGrid");
  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");

  // Show loading state
  if (loadingState) loadingState.style.display = "block";
  if (emptyState) emptyState.style.display = "none";
  if (mindmapsGrid) mindmapsGrid.innerHTML = "";

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/mindmaps`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success && data.mindmaps) {
      mindMaps = data.mindmaps;

      // Hide loading state
      if (loadingState) loadingState.style.display = "none";

      if (mindMaps.length === 0) {
        // Show empty state
        if (emptyState) emptyState.style.display = "block";
      } else {
        // Render mind maps
        renderMindMaps(mindMaps);
      }
    } else {
      throw new Error(data.message || "Failed to load mind maps");
    }
  } catch (error) {
    console.error("Error loading mind maps:", error);
    showError("Error loading mind maps: " + error.message);

    // Hide loading state
    if (loadingState) loadingState.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
  }
}

// Render mind maps to the grid
function renderMindMaps(mindMapsToRender) {
  const mindmapsGrid = document.getElementById("mindmapsGrid");
  if (!mindmapsGrid) return;

  mindmapsGrid.innerHTML = "";

  mindMapsToRender.forEach((mindmap) => {
    const card = document.createElement("div");
    card.className = "mindmap-card";
    card.dataset.id = mindmap.id;

    const createdDate = new Date(mindmap.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const updatedDate = new Date(mindmap.updated_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    card.innerHTML = `
      <div class="mindmap-card-header">
        <div class="mindmap-icon">
          <i class="fas fa-project-diagram"></i>
        </div>
      </div>
      <div class="mindmap-title">${escapeHtml(mindmap.title)}</div>
      <div class="mindmap-date">
        <i class="fas fa-calendar-alt"></i> Created: ${createdDate}
      </div>
      <div class="mindmap-meta">
        <span>
          <i class="fas fa-clock"></i> Updated: ${updatedDate}
        </span>
      </div>
    `;

    // Add click event to show modal
    card.addEventListener("click", () => {
      showMindMapModal(mindmap);
    });

    mindmapsGrid.appendChild(card);
  });
}

// Show mind map details modal
function showMindMapModal(mindmap) {
  selectedMindMapId = mindmap.id;

  const modal = document.getElementById("mindmapModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMindmapTitle = document.getElementById("modalMindmapTitle");
  const modalCreatedDate = document.getElementById("modalCreatedDate");
  const modalUpdatedDate = document.getElementById("modalUpdatedDate");

  if (modal) {
    modal.style.display = "block";

    const createdDate = new Date(mindmap.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updatedDate = new Date(mindmap.updated_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (modalTitle) modalTitle.textContent = "Mind Map Details";
    if (modalMindmapTitle) modalMindmapTitle.textContent = mindmap.title;
    if (modalCreatedDate) modalCreatedDate.textContent = createdDate;
    if (modalUpdatedDate) modalUpdatedDate.textContent = updatedDate;
  }
}

// Close modal
function closeModal() {
  const modal = document.getElementById("mindmapModal");
  if (modal) {
    modal.style.display = "none";
  }
  selectedMindMapId = null;
}

// Handle view mind map button click
function handleViewMindMap() {
  if (!selectedMindMapId) {
    alert("No mind map selected.");
    return;
  }

  // Find the mind map data
  const mindmap = mindMaps.find((m) => m.id === selectedMindMapId);
  if (mindmap) {
    // Store the mind map data in localStorage
    localStorage.setItem("studybloom-selected-mindmap", JSON.stringify(mindmap));

    // Navigate to mindmap page
    window.location.href = "mindmap.html?mindmapId=" + mindmap.id;
  }

  closeModal();
}

// Handle delete mind map button click
function handleDeleteMindMap() {
  if (!selectedMindMapId) {
    alert("No mind map selected.");
    return;
  }

  showConfirmModal(selectedMindMapId);
  closeModal();
}

// Delete mind map
async function deleteMindMap(mindmapId) {
  const token = localStorage.getItem("token");
  if (!token) {
    showError("Please log in to delete mind maps.");
    return;
  }

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/mindmaps/${mindmapId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      showSuccess("Mind map deleted successfully!");
      // Reload mind maps
      loadMindMaps();
    } else {
      throw new Error(data.message || "Failed to delete mind map");
    }
  } catch (error) {
    console.error("Error deleting mind map:", error);
    showError("Error deleting mind map: " + error.message);
  }
}

// Show confirmation modal
function showConfirmModal(mindmapId) {
  mindMapToDelete = mindmapId;
  const confirmModal = document.getElementById("confirmModal");
  if (confirmModal) {
    confirmModal.style.display = "block";
  }
}

// Hide confirmation modal
function hideConfirmModal() {
  const confirmModal = document.getElementById("confirmModal");
  if (confirmModal) {
    confirmModal.style.display = "none";
  }
  mindMapToDelete = null;
}

// Confirm delete mind map
function confirmDeleteMindMap() {
  if (mindMapToDelete) {
    deleteMindMap(mindMapToDelete);
  }
  hideConfirmModal();
}

// Handle search
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim();

  const filteredMindMaps = mindMaps.filter((mindmap) => {
    return mindmap.title.toLowerCase().includes(searchTerm);
  });

  if (filteredMindMaps.length === 0) {
    const mindmapsGrid = document.getElementById("mindmapsGrid");
    const emptyState = document.getElementById("emptyState");

    if (mindmapsGrid) mindmapsGrid.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent = "No mind maps found matching your search.";
    }
  } else {
    const emptyState = document.getElementById("emptyState");
    if (emptyState) emptyState.style.display = "none";
    renderMindMaps(filteredMindMaps);
  }
}

// Show success message
function showSuccess(message) {
  const successMessage = document.getElementById("successMessage");
  const successText = document.getElementById("successText");
  if (successMessage && successText) {
    successText.textContent = message;
    successMessage.classList.add("active");

    // Hide after 3 seconds
    setTimeout(() => {
      successMessage.classList.remove("active");
    }, 3000);
  }
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  if (errorMessage && errorText) {
    errorText.textContent = message;
    errorMessage.classList.add("active");

    // Hide after 5 seconds
    setTimeout(() => {
      errorMessage.classList.remove("active");
    }, 5000);
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
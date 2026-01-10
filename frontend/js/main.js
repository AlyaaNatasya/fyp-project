// frontend/js/main.js

// Reusable utility functions
function showMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = "auth-message " + type;
}

function clearMessages() {
  const signupMessage = document.getElementById("signup-message");
  const loginMessage = document.getElementById("login-message");
  if (signupMessage) {
    signupMessage.textContent = "";
    signupMessage.className = "auth-message";
  }
  if (loginMessage) {
    loginMessage.textContent = "";
    loginMessage.className = "auth-message";
  }
}

/**
 * Loads the shared sidebar and injects page content
 */
function loadSharedLayout() {
  const placeholder = document.getElementById("sidebar-placeholder");
  if (!placeholder) return;

  fetch("../components/sidebar.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load sidebar");
      return res.text();
    })
    .then((html) => {
      placeholder.outerHTML = html;

      const pageContent = document.getElementById("page-content");
      const mainContent = document.querySelector(".main-content");

      if (pageContent && mainContent) {
        mainContent.innerHTML = pageContent.innerHTML;
      }

      // ✅ Now that content is injected, initialize the page
      initPageAfterLoad();
    })
    .catch((err) => {
      console.error("Error loading sidebar:", err);
      placeholder.innerHTML = '<p style="color: red;">Menu failed to load</p>';
    });
}

/**
 * Initializes the page after layout is loaded
 */
function initPageAfterLoad() {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection
  if (!token) {
    alert("Please log in to access this page.");
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

    // ✅ Use full name from token — no fallback to email
    if (usernameSpan && payload.name) {
      usernameSpan.textContent = payload.name; // →
    } else if (usernameSpan) {
      usernameSpan.textContent = "User"; // Fallback only if name is missing
    }

    // Highlight active nav link
    const currentPage = window.location.pathname.split("/").pop();
    const linkMap = {
      "dashboard.html": "Home",
      "calendar.html": "Calendar",
    };
    const activeText = linkMap[currentPage];

    if (activeText) {
      document.querySelectorAll(".nav-link").forEach((link) => {
        if (link.textContent.trim().includes(activeText)) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });
    }

    // ✅ Setup global UI (hamburger, logout, dropdowns)
    setupGlobalUI();

    // ✅ Load Sidebar Collections
    loadSidebarCollections();

    // ✅ Run page-specific logic only after content is ready
    if (
      currentPage === "calendar.html" &&
      typeof window.initCalendarPage === "function"
    ) {
      window.initCalendarPage(); // ✅ Call after content is ready
    }

    // ✅ Initialize Upload Note Page
    if (
      currentPage === "uploadNote.html" &&
      typeof window.initUploadNotePage === "function"
    ) {
      window.initUploadNotePage();
    }

    // ✅ Initialize Dashboard Page
    if (
      currentPage === "dashboard.html" &&
      typeof window.initDashboardPage === "function"
    ) {
      window.initDashboardPage();
    }
  } catch (err) {
    console.warn("Invalid token:", err);
    localStorage.removeItem("token");
    window.location.href = "home.html";
  }
}

/**
 * Setup global UI interactions
 */
function setupGlobalUI() {
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const logoutBtn = document.querySelector(".logout-btn");

  // Restore sidebar state from localStorage on page load
  if (sidebar) {
    const savedState = localStorage.getItem("sidebarState");
    if (savedState === "collapsed") {
      sidebar.classList.add("collapsed");
    } else if (savedState === "active") {
      sidebar.classList.add("active");
    }
    // Default state is expanded (no classes needed)
  }

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle("active");
        // Save mobile sidebar state
        if (sidebar.classList.contains("active")) {
          localStorage.setItem("sidebarState", "active");
        } else {
          localStorage.setItem("sidebarState", "inactive");
        }
      } else {
        sidebar.classList.toggle("collapsed");
        // Save desktop sidebar state
        if (sidebar.classList.contains("collapsed")) {
          localStorage.setItem("sidebarState", "collapsed");
        } else {
          localStorage.setItem("sidebarState", "expanded");
        }
      }
    });
  }

  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768 && sidebar && menuToggle) {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove("active");
        // Save mobile sidebar state as inactive
        localStorage.setItem("sidebarState", "inactive");
      }
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("sidebarState"); // Clear sidebar state on logout
      window.location.href = "home.html";
    });
  }

  // Add event listener for new folder button to create collections
  const newFolderBtn = document.querySelector(".new-folder-btn");
  if (newFolderBtn) {
    newFolderBtn.addEventListener("click", showCreateCollectionModal);
  }

  // Collection Dropdown Toggle
  const collectionToggle = document.getElementById("collection-dropdown-toggle");
  if (collectionToggle) {
    collectionToggle.addEventListener("click", function(e) {
      // If clicking the link inside, don't toggle if it's meant to navigate (but here it's a div)
      const parentLi = this.closest(".nav-item-dropdown");
      parentLi.classList.toggle("active");
    });
  }
}

/**
 * Loads collections into the sidebar dropdown
 */
async function loadSidebarCollections() {
  const submenu = document.getElementById("collection-submenu");
  if (!submenu) return;

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/collections`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch collections");

    const collections = await response.json();

    // Keep the first item ("All Collections") and remove the rest
    const allCollectionsLink = submenu.firstElementChild;
    submenu.innerHTML = "";
    if (allCollectionsLink) {
      submenu.appendChild(allCollectionsLink);
    }

    // Append collections
    collections.forEach((collection) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="../pages/collection-detail.html?collectionId=${collection.id}" class="nav-link">
          <i class="fas fa-folder"></i>
          <span>${collection.name}</span>
        </a>
      `;
      submenu.appendChild(li);
    });

  } catch (error) {
    console.error("Error loading sidebar collections:", error);
  }
}

// Function to show create collection modal
function showCreateCollectionModal() {
  // Create a modal for creating a new collection
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>Create New Collection</h3>
      <form id="createCollectionForm">
        <div class="form-group">
          <label for="collectionName">Collection Name</label>
          <input type="text" id="collectionName" placeholder="Enter collection name" required>
        </div>
        <div class="form-group">
          <label for="collectionDescription">Description (Optional)</label>
          <textarea id="collectionDescription" placeholder="Enter collection description"></textarea>
        </div>
        <button type="submit" class="btn-primary">Create Collection</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  const closeModal = modal.querySelector(".close-modal");
  closeModal.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  const form = modal.querySelector("#createCollectionForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = modal.querySelector("#collectionName").value.trim();
    const description = modal
      .querySelector("#collectionDescription")
      .value.trim();

    if (!name) {
      alert("Please enter a collection name");
      return;
    }

    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create collection");
      }

      // Close modal
      document.body.removeChild(modal);

      // Refresh Sidebar Collections
      loadSidebarCollections();

      // Dynamically reload collections if on collection page and function exists
      if (
        window.location.pathname.includes("collection.html") &&
        typeof window.loadCollection === "function"
      ) {
        window.loadCollection();
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      alert("Error creating collection: " + error.message);
    }
  });

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Prevent zoom on mobile devices for form inputs
function preventMobileZoom() {
  const inputs = document.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      if (window.innerWidth <= 768) {
        document.body.style.zoom = "1";
      }
    });
  });
}

// 🔥 ONE DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();

  if (currentPage !== "home.html") {
    loadSharedLayout(); // This will call initPageAfterLoad() after content is loaded
  }

  // Apply mobile optimizations
  preventMobileZoom();
});

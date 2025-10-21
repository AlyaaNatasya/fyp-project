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

    // ✅ Setup global UI (hamburger, logout)
    setupGlobalUI();

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
    if (currentPage === "dashboard.html" && typeof window.initDashboardPage === "function") {
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

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle("active");
      } else {
        sidebar.classList.toggle("collapsed");
      }
    });
  }

  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768 && sidebar && menuToggle) {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("token");
      window.location.href = "home.html";
    });
  }
}

// Handle Read More Button
function initReadMoreButton() {
  const readMoreBtn = document.querySelector(".read-more-btn");
  if (readMoreBtn) {
    readMoreBtn.addEventListener("click", function () {
      alert(
        "This would typically navigate to a page with more information about the app."
      );
    });
  }
}

// Prevent zoom on mobile devices for form inputs
function preventMobileZoom() {
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      if (window.innerWidth <= 768) {
        document.body.style.zoom = '1';
      }
    });
  });
}

// 🔥 ONE DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();

  if (currentPage === "home.html") {
    initReadMoreButton();
  } else {
    loadSharedLayout(); // This will call initPageAfterLoad() after content is loaded
  }
  
  // Apply mobile optimizations
  preventMobileZoom();
});

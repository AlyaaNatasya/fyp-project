// frontend/js/dashboard.js

/**
 * This file only handles dashboard-specific logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

// Define the dashboard initialization function that will be called by main.js
window.initDashboardPage = function() {
  // --- Dashboard Card Buttons ---
  document.querySelectorAll(".card-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const action = this.textContent.trim().toLowerCase();

      switch (action) {
        case "summary":
          window.location.href = "../pages/summary.html";
          break;

        case "quizzes":
          window.location.href = "../pages/quizzes.html";
          break;

        case "study timer":
          window.location.href = "../pages/timer.html";
          break;

        case "reminder":
          window.location.href = "../pages/calendar.html";
          break;

        default:
          alert("Feature coming soon!");
      }
    });
  });
};

// For backward compatibility or direct loading
document.addEventListener("DOMContentLoaded", function () {
  // Check if content has already been loaded by main.js
  if (document.querySelector(".main-content")) {
    // Content already loaded, initialize immediately
    window.initDashboardPage();
  } else {
    // Wait for main.js to load content
    // The main.js will call initDashboardPage after content injection
  }
});

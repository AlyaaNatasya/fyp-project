// frontend/js/dashboard.js

/**
 * This file only handles dashboard-specific logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

document.addEventListener("DOMContentLoaded", function () {
  // --- Dashboard Card Buttons ---
  document.querySelectorAll(".card-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const action = this.textContent.trim().toLowerCase();

      switch (action) {
        case "summary":
          alert("Redirecting to Summary Generator...");
          break;

        case "quizzes":
          alert("Redirecting to Quiz Builder...");
          break;

        case "study timer":
          alert("Starting Study Timer...");
          break;

        case "reminder":
          alert("Opening Reminder Dashboard...");
          break;

        default:
          alert("Feature coming soon!");
      }
    });
  });
});

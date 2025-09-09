// frontend/js/quizzes.js

/**
 * This file handles the quizzes page logic
 * All shared logic (sidebar, auth, hamburger, logout) is in main.js
 */

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection: Must be logged in
  if (!token) {
    alert("Please log in to access the quizzes page.");
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

  // --- Search Functionality ---
  const fileSearch = document.getElementById("file-search");
  const searchBtn = document.querySelector(".search-btn");

  searchBtn.addEventListener("click", () => {
    const query = fileSearch.value.trim();
    if (!query) {
      alert("Please enter a file name to search.");
      return;
    }
    alert(`Searching for "${query}"...`);
    // In real app, this would fetch files from backend
  });

  // --- Flashcard & Quiz Generation ---
  document.querySelectorAll(".generate-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".option-card");
      const type = card.querySelector("h3").textContent;

      if (type === "Flashcard") {
        alert("Generating flashcards...");
      } else if (type === "Quizzes") {
        alert("Generating quizzes...");
      }
    });
  });
});

// frontend/js/summary.js

/**
 * This file handles the summary page logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

document.addEventListener("DOMContentLoaded", function () {
  // ✅ Wait for .main-content to exist before running logic
  const mainContentCheck = setInterval(() => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      clearInterval(mainContentCheck);
      initSummaryPage(); // Now safe to run
    }
  }, 100);
});

function initSummaryPage() {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection: Must be logged in
  if (!token) {
    alert("Please log in to access the summary page.");
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

  // --- Simulate AI Summary Generation ---
  const actualNotes = document.getElementById("actual-notes");
  const summaryOutput = document.getElementById("summary-output");
  const saveBtn = document.querySelector(".save-btn");
  const mindmapBtn = document.querySelector(".mindmap-btn");

  // Simulate loading actual notes
  actualNotes.innerHTML = `
    Introduction to Web Development
    HTML is the foundation of web pages.
    CSS styles the appearance of web pages.
    JavaScript adds interactivity.
    Modern frameworks like React make development faster.
    Learning these skills opens many career opportunities.
  `;

  // Generate summary
  function generateSummary() {
    const fakeSummary = `
      Key Points:
      • HTML is the structure of web pages.
      • CSS controls the styling and layout.
      • JavaScript adds dynamic behavior.
      • React is a popular framework for building modern apps.
      • These skills are essential for web development careers.
    `;
    summaryOutput.innerHTML = fakeSummary;
  }

  // Generate summary on load
  generateSummary();

  // Save to Collection → Save & Go to Collection Page
  saveBtn?.addEventListener("click", () => {
    // Get the current summary text
    const summaryText = summaryOutput.innerText.trim();

    // Load existing collection from localStorage
    let collection =
      JSON.parse(localStorage.getItem("studybloom-collection")) || [];

    // Create new note object
    const newNote = {
      id: Date.now().toString(),
      title: "Web Development Summary",
      content: summaryText,
      date: new Date().toISOString(),
    };

    // Add to collection
    collection.push(newNote);

    // Save back to localStorage
    localStorage.setItem("studybloom-collection", JSON.stringify(collection));

    // Show confirmation and redirect
    alert("Summary saved to your collection!");
    window.location.href = "../pages/collection.html"; // Redirect to collection page
  });

  // Generate Mind Map
  mindmapBtn?.addEventListener("click", () => {
    alert(
      "Mind map generated! In the real app, this would create a visual diagram."
    );
  });
}

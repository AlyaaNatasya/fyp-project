// frontend/js/collection.js

/**
 * This file handles the collection page logic
 * All shared logic (sidebar, auth, hamburger, logout) is in main.js
 */

document.addEventListener("DOMContentLoaded", function () {
  // ✅ Wait for .main-content to exist before running logic
  const mainContentCheck = setInterval(() => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      clearInterval(mainContentCheck);
      initCollectionPage(); // Now safe to run
    }
  }, 100);
});

function initCollectionPage() {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection: Must be logged in
  if (!token) {
    alert("Please log in to access the collection page.");
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

  // Load and display saved notes
  loadCollection();
}

function loadCollection() {
  const notesList = document.querySelector(".notes-list");
  if (!notesList) return;

  // Get collection from localStorage
  const collection =
    JSON.parse(localStorage.getItem("studybloom-collection")) || [];

  if (collection.length === 0) {
    notesList.innerHTML = `
      <p class="empty-message">No notes saved yet. Add your first note by uploading in Summary or Quizzes.</p>
    `;
    return;
  }

  // Clear empty message
  notesList.innerHTML = "";

  // Sort by date (newest first)
  const sorted = collection.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Add each note as a card
  sorted.forEach((note) => {
    const noteCard = document.createElement("div");
    noteCard.classList.add("collection-note");
    noteCard.innerHTML = `
      <h4>${note.title}</h4>
      <small>${formatDate(new Date(note.date))}</small>
      <p>${note.content.substring(0, 150)}${
      note.content.length > 150 ? "..." : ""
    }</p>
    `;
    notesList.appendChild(noteCard);
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

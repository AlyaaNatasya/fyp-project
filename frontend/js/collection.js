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
      <div class="note-header">
        <h4>${note.title}</h4>
        <button class="delete-note-btn" title="Delete note">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <small>${formatDate(new Date(note.date))}</small>
      <p>${note.content.substring(0, 150)}${
      note.content.length > 150 ? "..." : ""
    }</p>
    `;

    // Add event listener to the delete button
    const deleteBtn = noteCard.querySelector('.delete-note-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering any parent click events
      deleteNote(note.id || note.title, noteCard);
    });

    notesList.appendChild(noteCard);
  });
}

function deleteNote(noteId, noteCard) {
  if (!confirm("Are you sure you want to delete this note?")) {
    return; // Exit if user cancels
  }

  // Get the current collection from localStorage
  let collection = JSON.parse(localStorage.getItem("studybloom-collection")) || [];

  // Filter out the note to be deleted
  // If the note has an id, use that for comparison, otherwise use title
  collection = collection.filter(note => {
    if (note.id) {
      return note.id !== noteId;
    } else {
      return note.title !== noteId;
    }
  });

  // Save the updated collection back to localStorage
  localStorage.setItem("studybloom-collection", JSON.stringify(collection));

  // Remove the note card from the DOM with animation
  noteCard.style.opacity = '0';
  noteCard.style.transform = 'translateX(-20px)';
  noteCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  setTimeout(() => {
    noteCard.remove();
    
    // Check if there are any notes left, show empty message if not
    const notesList = document.querySelector(".notes-list");
    if (notesList && collection.length === 0) {
      notesList.innerHTML = `
        <p class="empty-message">No notes saved yet. Add your first note by uploading in Summary or Quizzes.</p>
      `;
    }
  }, 300);
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

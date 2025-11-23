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

async function loadCollection() {
  const notesList = document.querySelector(".notes-list");
  if (!notesList) return;

  try {
    // Show loading state
    notesList.innerHTML =
      '<div class="loading-spinner">Loading collections...</div>';

    // Fetch collections from the backend API
    const response = await fetch("http://localhost:5001/api/collections", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.status}`);
    }

    const collections = await response.json();

    if (collections.length === 0) {
      notesList.innerHTML = `
        <p class="empty-message">No collections created yet. Add your first collection using the button above.</p>
      `;
      return;
    }

    // Clear loading state
    notesList.innerHTML = "";

    // Display ALL collections, even empty ones
    for (const collection of collections) {
      // Fetch summaries in this collection
      let summaries = [];
      try {
        const collectionResponse = await fetch(
          `http://localhost:5001/api/collections/${collection.id}/summaries`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (collectionResponse.ok) {
          summaries = await collectionResponse.json();
        }
      } catch (error) {
        console.error(
          `Failed to fetch summaries for collection ${collection.id}:`,
          error
        );
        // Continue with empty summaries array
      }

      // Create a section for each collection (even if empty)
      const collectionSection = document.createElement("div");
      collectionSection.classList.add("collection-section");

      // Properly escape collection name to prevent XSS issues
      const escapedCollectionName = collection.name
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");

      // Show empty indicator if no summaries
      const summaryCount = summaries.length;
      const emptyIndicator = "";

      collectionSection.innerHTML = `
        <div class="collection-item" data-collection-id="${collection.id}">
          <h3 class="collection-header">
            <span class="collection-title" title="${escapedCollectionName}">
              <i class="fas fa-folder folder-icon"></i>
              ${escapedCollectionName}
              ${emptyIndicator}
            </span>
            <div class="collection-actions">
              <span class="collection-count">${summaryCount}</span>
              <button class="delete-collection-btn" title="Delete collection">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </h3>
        </div>
      `;

      // Add click event to navigate to specific collection page
      const collectionHeader =
        collectionSection.querySelector(".collection-header");
      collectionHeader.addEventListener("click", function (event) {
        // Only navigate if the click wasn't on the delete button
        if (!event.target.closest(".delete-collection-btn")) {
          const collectionId =
            this.closest(".collection-item").getAttribute("data-collection-id");
          // Navigate to the specific collection page
          window.location.href = `collection-detail.html?collectionId=${collectionId}`;
        }
      });

      // Add click event for the delete button
      const deleteBtn = collectionSection.querySelector(
        ".delete-collection-btn"
      );
      if (deleteBtn) {
        deleteBtn.addEventListener("click", function (event) {
          event.stopPropagation(); // Prevent triggering the header click event
          const collectionId = collectionSection
            .querySelector(".collection-item")
            .getAttribute("data-collection-id");
          deleteCollection(collectionId, collectionSection);
        });
      }

      notesList.appendChild(collectionSection);
    }
  } catch (error) {
    console.error("Error loading collections:", error);
    notesList.innerHTML = `<p class="error-message">Error loading collections: ${error.message}</p>`;
  }
}

async function removeSummaryFromCollection(
  collectionId,
  summaryId,
  summaryCard
) {
  if (
    !confirm(
      "Are you sure you want to remove this summary from the collection?"
    )
  ) {
    return; // Exit if user cancels
  }

  try {
    // Call the API to remove the summary from the collection
    const response = await fetch(
      `http://localhost:5001/api/collections/${collectionId}/summaries/${summaryId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to remove summary from collection"
      );
    }

    // Remove the summary card from the DOM with animation
    summaryCard.style.opacity = "0";
    summaryCard.style.transform = "translateX(-20px)";
    summaryCard.style.transition = "opacity 0.3s ease, transform 0.3s ease";

    setTimeout(() => {
      summaryCard.remove();

      // Check if there are any summaries left in this collection section
      const collectionSection = summaryCard.closest(".collection-section");
      if (
        collectionSection &&
        collectionSection.querySelector(".collection-summaries-list").children
          .length === 0
      ) {
        collectionSection.remove();
      }

      // Check if there are any collections left, show empty message if not
      const notesList = document.querySelector(".notes-list");
      if (notesList && notesList.children.length === 0) {
        notesList.innerHTML = `
          <p class="empty-message">No summaries saved yet. Generate a summary and save it to your collection.</p>
        `;
      }
    }, 300);
  } catch (error) {
    console.error("Error removing summary from collection:", error);
    alert("Error removing summary from collection: " + error.message);
  }
}

async function deleteCollection(collectionId, collectionElement) {
  if (
    !confirm(
      "Are you sure you want to delete this collection? This will also delete all summaries in this collection."
    )
  ) {
    return; // Exit if user cancels
  }

  try {
    // Call the API to delete the collection
    const response = await fetch(
      `http://localhost:5001/api/collections/${collectionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete collection");
    }

    // Remove the collection element from the DOM with animation
    collectionElement.style.opacity = "0";
    collectionElement.style.transform = "translateX(-20px)";
    collectionElement.style.transition =
      "opacity 0.3s ease, transform 0.3s ease";

    setTimeout(() => {
      collectionElement.remove();

      // Check if there are any collections left, show empty message if not
      const notesList = document.querySelector(".notes-list");
      if (notesList && notesList.children.length === 0) {
        notesList.innerHTML = `
          <p class="empty-message">No collections created yet. Add your first collection using the button above.</p>
        `;
      }
    }, 300);

    alert("Collection deleted successfully!");
  } catch (error) {
    console.error("Error deleting collection:", error);
    alert("Error deleting collection: " + error.message);
  }
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Expose loadCollection globally so it can be called from main.js
window.loadCollection = loadCollection;

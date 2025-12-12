// frontend/js/collection-detail.js

/**
 * This file handles the collection detail page logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

document.addEventListener("DOMContentLoaded", function () {
  // ✅ Wait for .main-content to exist before running logic
  const mainContentCheck = setInterval(() => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      clearInterval(mainContentCheck);
      initCollectionDetailPage(); // Now safe to run
    }
  }, 100);
});

function initCollectionDetailPage() {
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

  // Extract collection ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const collectionId = urlParams.get('collectionId');

  if (!collectionId) {
    alert("No collection specified. Redirecting to collections page.");
    window.location.href = "collection.html";
    return;
  }

  // Set up back button
  const backBtn = document.querySelector(".back-to-collections-btn");
  backBtn.addEventListener("click", function() {
    window.location.href = "collection.html";
  });

  // Load and display the specific collection
  loadCollectionDetail(collectionId);
}

async function loadCollectionDetail(collectionId) {
  const summariesList = document.querySelector(".collection-summaries-list");
  const collectionNameElement = document.getElementById("collection-name");

  if (!summariesList) return;

  try {
    // Fetch collection details
    const collectionResponse = await fetch(`${CONFIG.BACKEND_URL}/api/collections/${collectionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!collectionResponse.ok) {
      throw new Error(`Failed to fetch collection: ${collectionResponse.status}`);
    }

    const collection = await collectionResponse.json();
    collectionNameElement.textContent = collection.name;

    // Show skeleton loader while fetching summaries
    renderSkeletonLoader(summariesList);

    // Fetch summaries in this collection
    const summariesResponse = await fetch(`${CONFIG.BACKEND_URL}/api/collections/${collectionId}/summaries`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!summariesResponse.ok) {
      throw new Error(`Failed to fetch summaries: ${summariesResponse.status}`);
    }

    const summaries = await summariesResponse.json();

    if (summaries.length === 0) {
      summariesList.innerHTML = `
        <p class="empty-message">No summaries in this collection yet.</p>
      `;
      return;
    }

    // Clear loading message
    summariesList.innerHTML = "";

    // Add each summary as a button-like card
    summaries.forEach((summary) => {
      const summaryCard = document.createElement("div");
      summaryCard.classList.add("summary-button");
      summaryCard.innerHTML = `
        <div class="summary-content">
          <div class="summary-header">
            <h4>${summary.original_filename}</h4>
            <button class="delete-note-btn" title="Remove from collection" data-collection-id="${collectionId}" data-summary-id="${summary.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <small>${formatDate(new Date(summary.created_at))}</small>
          <p class="summary-preview">${summary.summary_text.substring(0, 150)}${
            summary.summary_text.length > 150 ? "..." : ""
          }</p>
        </div>
        <div class="summary-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
      `;

      // Add click event to navigate to the summary page
      summaryCard.addEventListener('click', function() {
        // Navigate to the summary page with the summary ID as a parameter
        window.location.href = `summary.html?summaryId=${summary.id}`;
      });

      // Add event listener to the delete button (stop propagation to prevent navigating to summary page)
      const deleteBtn = summaryCard.querySelector('.delete-note-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the summary page navigation
        removeSummaryFromCollection(collectionId, summary.id, summaryCard);
      });

      summariesList.appendChild(summaryCard);
    });
  } catch (error) {
    console.error('Error loading collection details:', error);
    summariesList.innerHTML = `<p class="error-message">Error loading collection: ${error.message}</p>`;
  }
}

async function removeSummaryFromCollection(collectionId, summaryId, summaryCard) {
  if (!confirm("Are you sure you want to remove this summary from the collection?")) {
    return; // Exit if user cancels
  }

  try {
    // Call the API to remove the summary from the collection
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/collections/${collectionId}/summaries/${summaryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to remove summary from collection');
    }

    // Remove the summary card from the DOM with animation
    summaryCard.style.opacity = '0';
    summaryCard.style.transform = 'translateX(-20px)';
    summaryCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    setTimeout(() => {
      summaryCard.remove();

      // Check if there are any summaries left, show empty message if not
      const summariesList = document.querySelector(".collection-summaries-list");
      if (summariesList && summariesList.children.length === 0) {
        summariesList.innerHTML = `
          <p class="empty-message">No summaries in this collection anymore.</p>
        `;
      }
    }, 300);
  } catch (error) {
    console.error('Error removing summary from collection:', error);
    alert("Error removing summary from collection: " + error.message);
  }
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderSkeletonLoader(container) {
  if (!container) return;
  
  // Create 4 skeleton cards
  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-header"></div>
      <div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text"></div>
      </div>
    </div>
  `).join('');
}
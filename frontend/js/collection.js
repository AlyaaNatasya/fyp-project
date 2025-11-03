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
  
  // Add event listener for create collection button
  const createCollectionBtn = document.getElementById('createCollectionBtn');
  if (createCollectionBtn) {
    createCollectionBtn.addEventListener('click', showCreateCollectionModal);
  }
}

function showCreateCollectionModal() {
  // Create a modal for creating a new collection
  const modal = document.createElement('div');
  modal.classList.add('modal');
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
  const closeModal = modal.querySelector('.close-modal');
  closeModal.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  const form = modal.querySelector('#createCollectionForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = modal.querySelector('#collectionName').value.trim();
    const description = modal.querySelector('#collectionDescription').value.trim();
    
    if (!name) {
      alert('Please enter a collection name');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5001/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create collection');
      }
      
      // Close modal
      document.body.removeChild(modal);
      
      // Show success message and reload collections
      alert('Collection created successfully!');
      loadCollection();
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Error creating collection: ' + error.message);
    }
  });
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function loadCollection() {
  const notesList = document.querySelector(".notes-list");
  if (!notesList) return;

  try {
    // Fetch collections from the backend API
    const response = await fetch("http://localhost:5001/api/collections", {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
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

    // Clear empty message
    notesList.innerHTML = "";

    // For each collection, fetch its summaries and display them
    for (const collection of collections) {
      // Fetch summaries in this collection
      const collectionResponse = await fetch(`http://localhost:5001/api/collections/${collection.id}/summaries`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!collectionResponse.ok) {
        console.error(`Failed to fetch summaries for collection ${collection.id}:`, collectionResponse.status);
        continue;
      }

      const summaries = await collectionResponse.json();

      // Create a section for each collection
      if (summaries.length > 0) {
        const collectionSection = document.createElement("div");
        collectionSection.classList.add("collection-section");
        collectionSection.innerHTML = `
          <h3 class="collection-title">${collection.name}</h3>
          <div class="collection-summaries-list"></div>
        `;
        
        const summariesContainer = collectionSection.querySelector(".collection-summaries-list");
        
        // Add each summary as a card
        summaries.forEach((summary) => {
          const summaryCard = document.createElement("div");
          summaryCard.classList.add("collection-note");
          summaryCard.innerHTML = `
            <div class="note-header">
              <h4>${summary.original_filename}</h4>
              <button class="delete-note-btn" title="Remove from collection" data-collection-id="${collection.id}" data-summary-id="${summary.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <small>${formatDate(new Date(summary.created_at))}</small>
            <p>${summary.summary_text.substring(0, 150)}${
              summary.summary_text.length > 150 ? "..." : ""
            }</p>
          `;

          // Add event listener to the delete button
          const deleteBtn = summaryCard.querySelector('.delete-note-btn');
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering any parent click events
            removeSummaryFromCollection(collection.id, summary.id, summaryCard);
          });

          summariesContainer.appendChild(summaryCard);
        });
        
        notesList.appendChild(collectionSection);
      }
    }

    // If no collections have summaries, show empty message
    if (notesList.children.length === 0) {
      notesList.innerHTML = `
        <p class="empty-message">No summaries saved yet. Generate a summary and save it to your collection.</p>
      `;
    }
  } catch (error) {
    console.error('Error loading collections:', error);
    notesList.innerHTML = `<p class="error-message">Error loading collections: ${error.message}</p>`;
  }
}

async function removeSummaryFromCollection(collectionId, summaryId, summaryCard) {
  if (!confirm("Are you sure you want to remove this summary from the collection?")) {
    return; // Exit if user cancels
  }

  try {
    // Call the API to remove the summary from the collection
    const response = await fetch(`http://localhost:5001/api/collections/${collectionId}/summaries/${summaryId}`, {
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
      
      // Check if there are any summaries left in this collection section
      const collectionSection = summaryCard.closest('.collection-section');
      if (collectionSection && collectionSection.querySelector('.collection-summaries-list').children.length === 0) {
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

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

      // Wait for the content to be injected by main.js
    const contentCheck = setInterval(() => {
      const fileSearchInput = document.getElementById("file-search");
      if (fileSearchInput) {
          clearInterval(contentCheck);
          console.log("Quizzes page initialized (v3)");
          initQuizzesPage();
      }
    }, 100);
  });
  
  function initQuizzesPage() {
      const fileSearchInput = document.getElementById("file-search");
      const searchResultsContainer = document.getElementById("search-results");
      const selectedFileContainer = document.getElementById("selected-file-container");
      const selectedFileName = document.getElementById("selected-file-name");
      const clearSelectionBtn = document.getElementById("clear-selection");
      const flashcardCard = document.querySelector(".card[data-type='flashcard']");
      const quizCard = document.querySelector(".card[data-type='quiz']");
  
      if (!fileSearchInput || !searchResultsContainer || !selectedFileContainer) {
          console.error("Critical elements missing from DOM");
          return;
      }
  
      let allSummaries = [];
      let selectedSummaryId = null;
  
      // Initially disable cards
      if (flashcardCard) {
          flashcardCard.classList.add("disabled");
      } else {
          console.warn("Flashcard card element not found");
      }
      
      if (quizCard) {
          quizCard.classList.add("disabled");
      } else {
          console.warn("Quiz card element not found");
      }
  
      // Fetch all user summaries for search
      fetch(`${CONFIG.BACKEND_URL}/api/ai/summaries`, {
          headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
      })    .then(response => {
        if (!response.ok) {
             if (response.status === 401) {
                 alert("Session expired. Please log in again.");
                 window.location.href = "home.html";
                 return [];
             }
             throw new Error("Failed to fetch summaries");
        }
        return response.json();
    })
    .then(data => {
        if (Array.isArray(data)) {
            allSummaries = data;
        } else {
            console.error("Received unexpected data format:", data);
            allSummaries = [];
        }
    })
    .catch(error => {
        console.error("Error fetching summaries:", error);
    });

    // Search functionality
    fileSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 1) {
            searchResultsContainer.classList.add("hidden");
            return;
        }

        // Safety check
        if (!Array.isArray(allSummaries)) {
             allSummaries = [];
        }

        const matches = allSummaries.filter(summary => 
            summary && summary.original_filename && summary.original_filename.toLowerCase().includes(query)
        );

        renderSearchResults(matches);
    });

    function renderSearchResults(results) {
        searchResultsContainer.innerHTML = "";
        
        if (results.length === 0) {
            // Check if we actually have summaries loaded
            if (allSummaries.length === 0) {
                 searchResultsContainer.innerHTML = '<div class="search-result-item" style="cursor: default; color: #999;">No files available to search</div>';
            } else {
                 searchResultsContainer.innerHTML = '<div class="search-result-item" style="cursor: default; color: #999;">No matches found</div>';
            }
        } else {
            results.forEach(summary => {
                const item = document.createElement("div");
                item.classList.add("search-result-item");
                item.textContent = summary.original_filename;
                item.addEventListener("click", () => selectFile(summary));
                searchResultsContainer.appendChild(item);
            });
        }
        
        searchResultsContainer.classList.remove("hidden");
    }

    function selectFile(summary) {
        selectedSummaryId = summary.id;
        selectedFileName.textContent = summary.original_filename;
        
        fileSearchInput.value = "";
        searchResultsContainer.classList.add("hidden");
        selectedFileContainer.classList.remove("hidden");
        
        // Enable option cards
        if (flashcardCard) flashcardCard.classList.remove("disabled");
        if (quizCard) quizCard.classList.remove("disabled");
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener("click", () => {
            selectedSummaryId = null;
            selectedFileName.textContent = "None";
            selectedFileContainer.classList.add("hidden");
            
            // Disable option cards
            if (flashcardCard) flashcardCard.classList.add("disabled");
            if (quizCard) quizCard.classList.add("disabled");
        });
    }

    // Handle "Generate Flashcards" click
    if (flashcardCard) {
        flashcardCard.addEventListener("click", async () => {
            if (!selectedSummaryId || flashcardCard.classList.contains("disabled")) return;

            // Visual feedback
            const originalContent = flashcardCard.innerHTML;
            flashcardCard.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i></h3><p class="card-desc">Generating...</p>`;
            
            try {
                // 1. Fetch summary details to get the text
                const summaryResponse = await fetch(`${CONFIG.BACKEND_URL}/api/ai/summaries/${selectedSummaryId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!summaryResponse.ok) throw new Error("Failed to fetch file content");
                const summaryData = await summaryResponse.json();
                
                // 2. Generate flashcards
                const flashcardResponse = await fetch(`${CONFIG.BACKEND_URL}/api/ai/flashcards`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ text: summaryData.summary_text })
                });

                if (!flashcardResponse.ok) {
                    const errorData = await flashcardResponse.json();
                    throw new Error(errorData.message || "Failed to generate flashcards");
                }

                const flashcardData = await flashcardResponse.json();
                
                // 3. Save to localStorage and redirect
                localStorage.setItem("generatedFlashcards", JSON.stringify(flashcardData.flashcards));
                window.location.href = "flashcards.html";

            } catch (error) {
                console.error(error);
                alert("Error: " + error.message);
                flashcardCard.innerHTML = originalContent;
            }
        });
    }

    // Handle "Generate Quiz" click
    if (quizCard) {
        quizCard.addEventListener("click", async () => {
            if (!selectedSummaryId || quizCard.classList.contains("disabled")) return;

            // Visual feedback
            const originalContent = quizCard.innerHTML;
            quizCard.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i></h3><p class="card-desc">Generating...</p>`;

            try {
                // 1. Fetch summary details to get the text
                const summaryResponse = await fetch(`${CONFIG.BACKEND_URL}/api/ai/summaries/${selectedSummaryId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!summaryResponse.ok) throw new Error("Failed to fetch file content");
                const summaryData = await summaryResponse.json();
                
                // 2. Generate quiz
                const quizResponse = await fetch(`${CONFIG.BACKEND_URL}/api/ai/quiz`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ text: summaryData.summary_text })
                });

                if (!quizResponse.ok) {
                    const errorData = await quizResponse.json();
                    throw new Error(errorData.message || "Failed to generate quiz");
                }

                const quizData = await quizResponse.json();
                
                // 3. Save to localStorage and redirect
                localStorage.setItem("generatedQuiz", JSON.stringify(quizData.quiz));
                window.location.href = "quiz-display.html";

            } catch (error) {
                console.error(error);
                alert("Error: " + error.message);
                quizCard.innerHTML = originalContent;
            }
        });
    }

    // Hide search results if clicked outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-bar")) {
            searchResultsContainer.classList.add("hidden");
        }
    });
}
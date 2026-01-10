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

  // Initialize marked.js - Using default configuration for maximum robustness
  // The CSS in summary.css already targets standard tags (.summary-box h1, etc.)
  // so we don't need custom classes.
  marked.use({
    gfm: true,         // GitHub Flavored Markdown
    breaks: true,      // Enable line breaks for better AI text handling
    pedantic: false,
    sanitize: false    // We use DOMPurify later
  });

  // Variables to track state and prevent multiple simultaneous polls
  let isCurrentlyPolling = false;
  let pollIntervalId = null;
  let maxPollAttempts = 120; // Maximum number of polling attempts (120 * 5s = 10 minutes)
  let currentPollAttempt = 0;

  // Flag to ensure only one rendering happens at a time
  let isRendering = false;

  // Clean up any existing polling when the page is unloaded or before new requests
  window.addEventListener("beforeunload", function () {
    if (pollIntervalId) {
      clearTimeout(pollIntervalId);
      pollIntervalId = null;
    }
    isCurrentlyPolling = false;
    currentPollAttempt = 0;
  });

  // Function to clean up any existing polling before starting a new one
  function cleanupPolling() {
    if (pollIntervalId) {
      clearTimeout(pollIntervalId);
      pollIntervalId = null;
    }
    isCurrentlyPolling = false;
    currentPollAttempt = 0;
  }

  // --- Load Summary from database via API or simulate ---
  const actualNotes = document.getElementById("actual-notes");
  const summaryOutput = document.getElementById("summary-output");
  const saveBtn = document.querySelector(".save-btn");
  const mindmapBtn = document.querySelector(".mindmap-btn");

  // Get summary ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const summaryId =
    urlParams.get("summaryId") || localStorage.getItem("summaryId");
  const uploadedFileName = localStorage.getItem("uploadedFileName");

  // Helper function to repair common markdown formatting issues
  function formatMarkdown(text) {
    if (!text) return "";

    let formatted = text;

    // 1. Force newlines before headers that are buried in text
    // Matches: (not a newline)(optional space)(# symbols)(space)(text)
    // We run this loop until no more changes are made to catch overlapping cases
    let oldFormatted;
    do {
        oldFormatted = formatted;
        formatted = formatted.replace(/([^\n])\s+(#{1,6})\s+/g, '$1\n\n$2 ');
    } while (formatted !== oldFormatted);

    // 2. Force newlines before list items that are buried in text
    // Bullet points (* or -)
    formatted = formatted.replace(/([^\n])\s+([*-])\s+/g, '$1\n\n$2 ');
    // Numbered lists (1. 2. etc)
    formatted = formatted.replace(/([^\n])\s+(\d+\.)\s+/g, '$1\n\n$2 ');

    // 3. Fix potential issues with too many hash symbols for headers
    formatted = formatted.replace(/(#{7,})\s+(.+)$/gm, "###### $2");

    // 4. Clean up excessive newlines
    formatted = formatted.replace(/\n{3,}/g, "\n\n");

    // 5. Ensure a newline after "---" horizontal rule
    formatted = formatted.replace(/---\s*([^\n])/g, '---\n\n$1');
    formatted = formatted.replace(/---\s*$/g, '---\n\n');

    // 6. Final cleanup: trim whitespace
    formatted = formatted.trim();

    return formatted;
  }

  if (summaryId) {
    // Fetch the summary from the backend API
    fetchSummaryFromDatabase(summaryId);
  } else {
    // Check if we have a summary ID in localStorage for cases where URL params might not be available
    const storedSummaryId = localStorage.getItem("summaryId");
    if (storedSummaryId) {
      // Use the stored summary ID and clear it from localStorage to prevent reuse
      fetchSummaryFromDatabase(storedSummaryId);
      // Only clear if the URL didn't have a summaryId (to maintain the original URL param if present)
      if (!urlParams.get("summaryId")) {
        localStorage.removeItem("summaryId");
      }
    } else {
      // Simulate loading actual notes (fallback for testing)
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
          const fakeSummary = `# Introduction to Web Development

### Key Points:
*   HTML is the structure of web pages.
*   CSS controls the styling and layout.
*   JavaScript adds dynamic behavior.
*   React is a popular framework for building modern apps.
*   These skills are essential for web development careers.`;

          // Check if already rendering to prevent multiple renders
          if (isRendering) {
              console.log("Already rendering fake summary, skipping");
              return; // Exit early to prevent duplicate rendering
          }

          // Set rendering flag
          isRendering = true;

          // Debug: Log the raw fake summary text
          console.log("=== FAKE SUMMARY RENDERING DEBUG ===");
          console.log("Raw fake summary:", fakeSummary);

          // Parse and sanitize the markdown summary with error handling
          try {
              const formattedFake = formatMarkdown(fakeSummary);
              console.log("Formatted fake markdown:", formattedFake);

              const renderedHtml = marked.parse(formattedFake);
              console.log("Fake rendered HTML:", renderedHtml);

              const cleanHtml = DOMPurify.sanitize(renderedHtml);
              console.log("Fake sanitized HTML:", cleanHtml);

              summaryOutput.innerHTML = cleanHtml;
              console.log("=== FAKE SUMMARY RENDERING COMPLETE ===");
          } catch (error) {
              console.error("Error rendering fake markdown:", error);
              summaryOutput.innerHTML = `<div class="raw-content">${fakeSummary.replace(/\n/g, '<br>')}</div>`;
          } finally {
              // Reset the rendering flag
              isRendering = false;
          }
        }

        // Generate summary on load
        generateSummary();
      }
    }

    // Function to fetch summary from database with retry logic for race condition
    async function fetchSummaryFromDatabase(summaryId, retryCount = 0) {
            const maxRetries = 5;
            const baseDelay = 1000; // 1 second base delay
      
            // Prevent multiple simultaneous polling requests
            if (isCurrentlyPolling && retryCount === 0) {
              // If we're already polling but need to start a new fetch (e.g., page reload),
              // clean up the old polling first
              cleanupPolling();
            }
      
            // Set polling flag for initial call or consistent retries
            if (!isCurrentlyPolling) {
              isCurrentlyPolling = true;
            }
      
            try {
              // Add grace period for large files on first attempt to allow DB commit
              if (retryCount === 0) {
                console.log("Adding initial delay for database commit timing...");
                await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second initial delay
              }
      
              // Show loading state with retry information
              if (retryCount === 0) {
                if (
                  !summaryOutput.innerHTML ||
                  summaryOutput.innerHTML.includes("fa-spinner")
                ) {
                  summaryOutput.innerHTML =
                    '<div class="loading-container"><i class="fas fa-spinner fa-spin"></i> <span>Connecting to server...</span></div>';
                }
                if (
                  !actualNotes.innerHTML ||
                  actualNotes.innerHTML.includes("fa-spinner")
                ) {
                  const processingFileName =
                    localStorage.getItem("uploadedFileName") || "your file";
                  actualNotes.innerHTML = `<div class="loading-container"><strong>Uploaded File:</strong> ${processingFileName}<br><br><i class="fas fa-spinner fa-spin"></i> <span>Waiting for processing to start...</span></div>`;
                }
              } else {
                console.log(
                  `Retry attempt ${retryCount}/${maxRetries} for summary ${summaryId}`
                );
                // Update UI to show retry status on retries
                if (summaryOutput.innerHTML.includes("fa-spinner")) {
                  summaryOutput.innerHTML = `<div class="loading-container"><i class="fas fa-spinner fa-spin"></i> <span>Reconnecting... (Attempt ${retryCount}/${maxRetries})</span></div>`;
                }
              }
      
              const response = await fetch(
                `${CONFIG.BACKEND_URL}/api/ai/summaries/${summaryId}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );
      
              // Get JSON data even on failure
              const data = await response.json();
      
              if (!response.ok) {
                // Special handling for 404 (record not found yet) with retry
                if (response.status === 404 && retryCount < maxRetries) {
                  console.log(
                    `Record not found (404), retrying in ${
                      baseDelay * (retryCount + 1)
                    }ms...`
                  );
                  const retryDelay = baseDelay * (retryCount + 1);
      
                  if (actualNotes.innerHTML.includes("fa-spinner")) {
                    actualNotes.innerHTML += `<br><span style="font-size: 0.9em; color: #666;">Retrying in ${
                      retryDelay / 1000
                    }s...</span>`;
                  }
      
                  setTimeout(() => {
                    fetchSummaryFromDatabase(summaryId, retryCount + 1);
                  }, retryDelay);
                  return;
                }
                // Check for our 'failed' status first
                if (response.status === 500 && data.status === "failed") {
                  console.error("Summary generation failed:", data.error);
                  summaryOutput.innerHTML = `<div class="error-container"><i class="fas fa-exclamation-triangle"></i> <span style="color: red;">Error: Summary generation failed.</span></div>`;
                  actualNotes.innerHTML = `<div class="error-container"><strong>Uploaded File:</strong> ${
                    data.original_filename
                  }<br><br>
                                           <p style="color: red;">${
                                             data.error ||
                                             "An unknown error occurred during processing."
                                           }</p>
                                           <p class="retry-instruction">Please try uploading the file again.</p></div>`;
                  isCurrentlyPolling = false; // Reset polling flag
                  return; // Stop polling
                }
                // Otherwise, it's a different network/server error
                throw new Error(
                  `Failed to fetch summary: ${response.status} ${data.message || ""}`
                );
              }
      
              // --- Check Status and Decide Action ---
      
              if (data.status === "processing") {
                currentPollAttempt++;
                console.log(
                  `Summary is processing... attempt ${currentPollAttempt}/${maxPollAttempts}`
                );
      
                // Check if we've reached the maximum number of attempts
                if (currentPollAttempt >= maxPollAttempts) {
                  summaryOutput.innerHTML = `<div class="error-container"><i class="fas fa-exclamation-triangle"></i> <span style="color: red;">Timeout: Summary generation took too long.</span></div>`;
                  actualNotes.innerHTML = `<div class="error-container"><strong>Uploaded File:</strong> ${data.original_filename}<br><br>
                                           <p style="color: red;">The server is taking too long to process your request.</p>
                                           <p class="retry-instruction">Please try uploading the file again.</p></div>`;

                  // Stop polling when timed out - clear the polling interval
                  if (pollIntervalId) {
                      clearTimeout(pollIntervalId);
                      pollIntervalId = null;
                  }

                  isCurrentlyPolling = false; // Reset polling flag
                  return; // Stop polling
                }
      
                // Update UI to show processing with better feedback
                summaryOutput.innerHTML = `
                  <div class="loading-container">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>AI is generating your summary...</span>
                    <p class="processing-info">Attempt ${currentPollAttempt}/${maxPollAttempts}. This may take a minute. Please keep the page open.</p>
                  </div>`;
                actualNotes.innerHTML = `
                  <div class="loading-container">
                    <strong>Processing File:</strong> ${data.original_filename}<br><br>
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Currently processing...</span>
                    <p class="processing-info">Extracting content and generating key points</p>
                  </div>`;
      
                // Ensure PDF viewer is hidden during processing
                document.getElementById("pdf-viewer-container").style.display = "none";
                actualNotes.style.display = "block";
      
                // Poll again after 5 seconds, but clear the current polling flag first
                setTimeout(() => {
                  isCurrentlyPolling = false; // Reset the flag before the next poll
                  fetchSummaryFromDatabase(summaryId);
                }, 5000);
              } else if (data.status === "completed") {
                console.log("Summary completed!");
      
                // Check if already rendering to prevent multiple renders
                if (isRendering) {
                    console.log("Already rendering, skipping this update");
                    return; // Exit early to prevent duplicate rendering
                }

                // Set rendering flag
                isRendering = true;

                // Reset the poll attempt counter
                currentPollAttempt = 0;

                // Debug: Log the raw summary text before processing
                console.log("=== SUMMARY RENDERING DEBUG ===");
                console.log("Raw summary text from API:", data.summary_text);

                // Debug: Log the formatted markdown
                const formattedText = formatMarkdown(data.summary_text);
                console.log("Formatted markdown:", formattedText);

                try {
                    // Parse and sanitize the markdown summary with minimal processing
                    // Since the AI returns properly formatted markdown, we should keep processing simple
                    const renderedHtml = marked.parse(formattedText);
                    console.log("Rendered HTML:", renderedHtml);

                    const cleanHtml = DOMPurify.sanitize(renderedHtml);
                    console.log("Sanitized HTML:", cleanHtml);

                    summaryOutput.innerHTML = cleanHtml;
                    console.log("=== SUMMARY RENDERING COMPLETE ===");
                } catch (error) {
                    console.error("Error rendering markdown:", error);
                    console.error("Problematic content:", data.summary_text);
                    // Fallback: display raw content if markdown rendering fails
                    summaryOutput.innerHTML = `<div class="raw-content">${data.summary_text.replace(/\n/g, '<br>')}</div>`;
                } finally {
                    // Reset the rendering flag
                    isRendering = false;
                }
      
                // Display the original content preview with a download link
                actualNotes.innerHTML = `<strong>Uploaded File:</strong> ${data.original_filename}<br>
                  <a href="${CONFIG.BACKEND_URL}/api/ai/summaries/${summaryId}/file" target="_blank" style="color: #007bff; text-decoration: none; font-size: 0.9em; display: inline-block; margin-top: 5px;">
                    <i class="fas fa-download"></i> Download Original File
                  </a><br><br>`;
        // Check if the file is a PDF and display it using PDF.js
        const fileExtension = data.original_filename
          .toLowerCase()
          .split(".")
          .pop();
        if (fileExtension === "pdf") {
          // Hide the text preview and show the PDF viewer
          document.getElementById("pdf-viewer-container").style.display =
            "block";
          actualNotes.style.display = "none";

          // Load and display the PDF
          loadAndDisplayPDF(
            `${CONFIG.BACKEND_URL}/api/ai/summaries/${summaryId}/file`,
            data.original_filename
          );
        } else {
          // For non-PDF files, show the text preview
          actualNotes.innerHTML += `${data.original_content_preview}${
            data.original_content_preview.length >= 1000 ? "..." : ""
          }`;
        }

        // Update the uploaded file name in localStorage
        localStorage.setItem("uploadedFileName", data.original_filename);

        // Stop polling when completed - clear the polling interval
        if (pollIntervalId) {
            clearTimeout(pollIntervalId);
            pollIntervalId = null;
        }

        // Reset polling flag when completed
        isCurrentlyPolling = false;
      } else if (data.status === "failed") {
        console.error("Summary generation failed:", data.error);

        // Reset the poll attempt counter
        currentPollAttempt = 0;

        summaryOutput.innerHTML = `<div class="error-container"><i class="fas fa-exclamation-triangle"></i> <span style="color: red;">Error: Summary generation failed.</span></div>`;
        actualNotes.innerHTML = `<div class="error-container"><strong>Uploaded File:</strong> ${
          data.original_filename
        }<br><br>
                                 <p style="color: red;">${
                                   data.error ||
                                   "An unknown error occurred during processing."
                                 }</p>
                                 <p class="retry-instruction">Please try uploading the file again.</p></div>`;

        // Ensure PDF viewer is hidden when processing fails
        document.getElementById("pdf-viewer-container").style.display = "none";
        actualNotes.style.display = "block";

        // Stop polling when failed - clear the polling interval
        if (pollIntervalId) {
            clearTimeout(pollIntervalId);
            pollIntervalId = null;
        }

        // Reset polling flag when failed
        isCurrentlyPolling = false;
      } else {
        // Should not happen if backend is correct
        throw new Error("Invalid summary status received.");
      }
    } catch (error) {
      console.error("Error fetching summary:", error);

      // Exponential backoff retry for network/general errors
      if (retryCount < maxRetries && error.name !== "TypeError") {
        const backoffDelay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(
          `General error, retrying with exponential backoff in ${backoffDelay}ms...`,
          error.message
        );

        // Update UI to show retry information
        if (summaryOutput.innerHTML.includes("fa-spinner") || retryCount > 0) {
          summaryOutput.innerHTML = `<div class="loading-container"><i class="fas fa-spinner fa-spin"></i> <span>Connection issue, retrying... (Attempt ${
            retryCount + 1
          }/${maxRetries})</span>
                                    <br><span style="font-size: 0.9em; color: #666;">${
                                      error.message
                                    }</span></div>`;
        }
        if (actualNotes.innerHTML.includes("fa-spinner")) {
          actualNotes.innerHTML += `<br><span style="font-size: 0.9em; color: #666;">Retrying in ${(
            backoffDelay / 1000
          ).toFixed(1)}s...</span>`;
        }

        setTimeout(() => {
          fetchSummaryFromDatabase(summaryId, retryCount + 1);
        }, backoffDelay);
        return;
      }

      // Final failure after all retries
      console.error(
        `Failed to fetch summary after ${maxRetries} retries:`,
        error
      );
      summaryOutput.innerHTML = `<div class="error-container"><i class="fas fa-exclamation-triangle"></i> <span style="color: red;">Error loading summary after ${maxRetries} attempts: ${error.message}</span></div>`;
      actualNotes.innerHTML = `<div class="error-container"><p style="color: red;">Could not load original content. <a href="${CONFIG.BACKEND_URL}/api/ai/summaries/${summaryId}/file" target="_blank" style="color: #007bff;">Download Original File (if available)</a></p></div>`;

      // Stop polling on final failure - clear the polling interval
      if (pollIntervalId) {
          clearTimeout(pollIntervalId);
          pollIntervalId = null;
      }

      isCurrentlyPolling = false; // Reset polling flag on final failure
    }
  }

  // Function to load and display PDF using PDF.js in a scrollable format
  async function loadAndDisplayPDF(fileUrl, filename) {
    try {
      // Configure worker
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      // Fetch the PDF file as an array buffer with authorization header
      const response = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const arrayBuffer = await response.arrayBuffer();

      // Load the PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      // Get the container for PDF pages
      const canvasContainer = document.getElementById("pdf-canvas-container");
      canvasContainer.innerHTML = ""; // Clear any existing content

      // Render all pages in a scrollable container
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Create canvas for this page
        const canvas = document.createElement("canvas");
        canvas.className = "pdf-page-canvas";
        canvasContainer.appendChild(canvas);

        // Set up the canvas and context
        const context = canvas.getContext("2d");

        // Set scale (adjust for HiDPI screens)
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });

        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      }
    } catch (error) {
      console.error("Error displaying PDF:", error);
      // Fallback to showing error message
      document.getElementById("pdf-viewer-container").style.display = "none";
      actualNotes.style.display = "block";
      actualNotes.innerHTML += `<p style="color: red;">Error displaying PDF: ${error.message}. <a href="${fileUrl}" target="_blank" style="color: #007bff;">Download Original File</a></p>`;
    }
  }

  // Function to show collection selection modal
  async function showCollectionSelectionModal() {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if user has any collections
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/collections`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch collections: ${response.status}`);
        }

        const collections = await response.json();

        // Create modal overlay
        const modal = document.createElement("div");
        modal.innerHTML = `
          <div class="collection-modal-overlay">
            <div class="collection-modal">
              <h3>Select Collection to Save Summary</h3>
              <div class="collection-list">
                <p>Choose which collection to save your summary to:</p>
              </div>
              <div class="modal-actions">
                <button id="modal-new-collection" class="btn-tertiary">New Collection Folder</button>
                <button id="modal-confirm" class="btn-primary" disabled>Save to Collection</button>
                <button id="modal-cancel" class="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        `;

        // Add modal styles
        const style = document.createElement("style");
        style.textContent = `
          .collection-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .collection-modal {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            max-width: 450px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
          }
          .collection-modal h3 {
            margin-top: 0;
            margin-bottom: 16px;
            color: #1f2937;
            font-size: 18px;
            font-weight: 600;
          }
          .collection-list {
            margin-bottom: 20px;
          }
          .collection-list p {
            margin: 0 0 12px 0;
            color: #6b7280;
            font-size: 14px;
          }
          .collection-option {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .collection-option:hover {
            border-color: #3b82f6;
            background-color: #eff6ff;
          }
          .collection-option.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
          }
          .collection-option input[type="radio"] {
            margin-right: 12px;
          }
          .collection-name {
            font-weight: 500;
            color: #1f2937;
          }
          .collection-count {
            margin-left: auto;
            font-size: 12px;
            color: #6b7280;
            background: #f3f4f6;
            padding: 2px 8px;
            border-radius: 12px;
          }
          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          .btn-primary {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
          }
          .btn-primary:hover:not(:disabled) {
            background: #2563eb;
          }
          .btn-primary:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }
          .btn-secondary {
            background: #f9fafb;
            color: #374151;
            border: 1px solid #d1d5db;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-secondary:hover {
            background: #f3f4f6;
          }
          .btn-tertiary {
            background: white;
            color: #3b82f6;
            border: 2px solid #3b82f6;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-tertiary:hover {
            background: #eff6ff;
          }
        `;
        document.head.appendChild(style);

        // Add modal to body
        document.body.appendChild(modal);

        // Add collection options
        const collectionList = modal.querySelector(".collection-list");

        if (collections.length > 0) {
          collectionList.innerHTML += `
            ${collections
              .map(
                (collection) => `
              <div class="collection-option" data-collection-id="${
                collection.id
              }">
                <input type="radio" name="selected-collection" value="${
                  collection.id
                }">
                <div class="collection-name">${collection.name}</div>
                <div class="collection-count">${
                  collection.summaryCount || 0
                } summary</div>
              </div>
            `
              )
              .join("")}
          `;
        } else {
          collectionList.innerHTML += '<p class="no-collections-message">You don\'t have any collections yet.</p>';
        }

        // Handle collection selection
        modal.querySelectorAll(".collection-option").forEach((option) => {
          option.addEventListener("click", () => {
            modal
              .querySelectorAll(".collection-option")
              .forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            modal.querySelector("#modal-confirm").disabled = false;
          });
        });

        // Handle save
        modal
          .querySelector("#modal-confirm")
          .addEventListener("click", () => {
            const selectedRadio = modal.querySelector(
              'input[name="selected-collection"]:checked'
            );
            if (!selectedRadio) {
              alert("Please select a collection first.");
              return;
            }
            const selectedCollectionId = selectedRadio.value;
            document.body.removeChild(modal);
            style.remove();
            resolve(selectedCollectionId);
          });

        // Handle new collection creation
        modal
          .querySelector("#modal-new-collection")
          .addEventListener("click", async () => {
            // Create new collection input modal
            const newCollectionModal = document.createElement("div");
            newCollectionModal.innerHTML = `
              <div class="new-collection-modal-overlay">
                <div class="new-collection-modal">
                  <h3>Create New Collection</h3>
                  <div class="input-group">
                    <label for="collection-name">Collection Name</label>
                    <input type="text" id="collection-name" placeholder="Enter collection name" required>
                  </div>
                  <div class="input-group">
                    <label for="collection-description">Description (optional)</label>
                    <textarea id="collection-description" placeholder="Enter collection description"></textarea>
                  </div>
                  <div class="modal-actions">
                    <button id="create-collection-btn" class="btn-primary">Create Collection</button>
                    <button id="cancel-create-collection-btn" class="btn-secondary">Cancel</button>
                  </div>
                </div>
              </div>
            `;

            // Add new collection modal styles
            const newCollectionStyle = document.createElement("style");
            newCollectionStyle.textContent = `
              .new-collection-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1001;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              }
              .new-collection-modal {
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                max-width: 450px;
                width: 90%;
              }
              .new-collection-modal h3 {
                margin-top: 0;
                margin-bottom: 16px;
                color: #1f2937;
                font-size: 18px;
                font-weight: 600;
              }
              .input-group {
                margin-bottom: 16px;
              }
              .input-group label {
                display: block;
                margin-bottom: 4px;
                color: #374151;
                font-weight: 500;
              }
              .input-group input, .input-group textarea {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                font-family: inherit;
              }
              .input-group textarea {
                min-height: 80px;
                resize: vertical;
              }
              .modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 16px;
              }
            `;
            document.head.appendChild(newCollectionStyle);

            // Add new collection modal to body
            document.body.appendChild(newCollectionModal);

            // Focus on the input field
            const collectionNameInput = newCollectionModal.querySelector('#collection-name');
            collectionNameInput.focus();

            // Handle create collection
            newCollectionModal.querySelector('#create-collection-btn').addEventListener('click', async () => {
              const name = newCollectionModal.querySelector('#collection-name').value.trim();
              const description = newCollectionModal.querySelector('#collection-description').value.trim();

              if (!name) {
                alert("Please enter a collection name.");
                return;
              }

              try {
                const createResponse = await fetch(`${CONFIG.BACKEND_URL}/api/collections`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                  body: JSON.stringify({ name, description }),
                });

                if (!createResponse.ok) {
                  const errorData = await createResponse.json();
                  throw new Error(errorData.message || "Failed to create collection");
                }

                const result = await createResponse.json();
                document.body.removeChild(newCollectionModal);
                newCollectionStyle.remove();

                // Close the main collection selection modal and return the new collection ID
                document.body.removeChild(modal);
                style.remove();
                resolve(result.id);
              } catch (error) {
                console.error("Error creating collection:", error);
                alert("Error creating collection: " + error.message);
              }
            });

            // Handle cancel for new collection
            newCollectionModal.querySelector('#cancel-create-collection-btn').addEventListener('click', () => {
              document.body.removeChild(newCollectionModal);
              newCollectionStyle.remove();
            });

            // Close new collection modal when clicking overlay
            newCollectionModal
              .querySelector(".new-collection-modal-overlay")
              .addEventListener("click", (e) => {
                if (e.target === newCollectionModal.querySelector(".new-collection-modal-overlay")) {
                  document.body.removeChild(newCollectionModal);
                  newCollectionStyle.remove();
                }
              });
          });

        // Handle cancel
        modal.querySelector("#modal-cancel").addEventListener("click", () => {
          document.body.removeChild(modal);
          style.remove();
          reject("cancel");
        });

        // Close modal when clicking overlay
        modal
          .querySelector(".collection-modal-overlay")
          .addEventListener("click", (e) => {
            if (e.target === modal.querySelector(".collection-modal-overlay")) {
              document.body.removeChild(modal);
              style.remove();
              reject("cancel");
            }
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Save to Collection → Show Modal First, Then Save & Go to Collection Page
  saveBtn?.addEventListener("click", async () => {
    try {
      // Get the current summary ID from URL parameters or localStorage
      const summaryId =
        urlParams.get("summaryId") || localStorage.getItem("summaryId");

      if (!summaryId) {
        alert("No summary found to save. Please generate a summary first.");
        return;
      }

      // Show collection selection modal
      let selectedCollectionId;
      try {
        const result = await showCollectionSelectionModal();
        if (result === "create_new") {
          // Redirect to collection page for creating new collection
          window.location.href = "../pages/collection.html";
          return;
        }
        selectedCollectionId = result;
      } catch (action) {
        if (action === "create_new" || action === "cancel") {
          // User chose to create new collection or cancelled
          if (action === "create_new") {
            window.location.href = "../pages/collection.html";
          }
          return;
        }
        throw action; // Re-throw actual errors
      }

      // Save to the selected collection
      const saveResponse = await fetch(
        `${CONFIG.BACKEND_URL}/api/ai/summaries/` +
          summaryId +
          "/save-to-collection",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            summaryId: summaryId,
            collectionId: selectedCollectionId,
          }),
        }
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || "Failed to save to collection");
      }

      // Redirect to collection page
      window.location.href = "../pages/collection.html";
    } catch (error) {
      console.error("Error saving to collection:", error);
      alert("Error saving to collection: " + error.message);
    }
  });

  // Generate Mind Map → Go to Mind Map Page
  mindmapBtn?.addEventListener("click", () => {
    // Optionally save the summary first
    const summaryText = summaryOutput.innerText.trim();
    localStorage.setItem("studybloom-last-summary", summaryText);

    // Redirect to mind map page
    window.location.href = "../pages/mindmap.html";
  });
}

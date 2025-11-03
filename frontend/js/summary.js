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

  // --- Load Summary from database via API or simulate ---
  const actualNotes = document.getElementById("actual-notes");
  const summaryOutput = document.getElementById("summary-output");
  const saveBtn = document.querySelector(".save-btn");
  const mindmapBtn = document.querySelector(".mindmap-btn");

  // Get summary ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const summaryId = urlParams.get('summaryId') || localStorage.getItem("summaryId");
  const uploadedFileName = localStorage.getItem("uploadedFileName");

  if (summaryId) {
    // Fetch the summary from the backend API
    fetchSummaryFromDatabase(summaryId);
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
  }

  // Function to fetch summary from database
  async function fetchSummaryFromDatabase(summaryId) {
    try {
      // Show initial loading state only if elements are empty
      if (!summaryOutput.innerHTML || summaryOutput.innerHTML.includes('fa-spinner')) {
        summaryOutput.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading summary...';
      }
      if (!actualNotes.innerHTML || actualNotes.innerHTML.includes('fa-spinner')) {
         // Get filename from local storage for initial display
        const processingFileName = localStorage.getItem("uploadedFileName") || 'your file';
        actualNotes.innerHTML = `<strong>Uploaded File:</strong> ${processingFileName}<br><br><i class="fas fa-spinner fa-spin"></i> Processing...`;
      }

      const response = await fetch(`http://localhost:5001/api/ai/summaries/${summaryId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Get JSON data even on failure
      const data = await response.json();

      if (!response.ok) {
        // Check for our 'failed' status first
        if (response.status === 500 && data.status === 'failed') {
          console.error('Summary generation failed:', data.error);
          summaryOutput.innerHTML = `<p style="color: red;">Error: Summary generation failed.</p>`;
          actualNotes.innerHTML = `<strong>Uploaded File:</strong> ${data.original_filename}<br><br>
                                   <p style="color: red;">${data.error || 'An unknown error occurred during processing.'}</p>`;
          return; // Stop polling
        }
        // Otherwise, it's a different network/server error
        throw new Error(`Failed to fetch summary: ${response.status} ${data.message || ''}`);
      }
      
      // --- Check Status and Decide Action ---
      
      if (data.status === 'processing') {
        console.log('Summary is processing... polling again in 5 seconds.');
        
        // Update UI to show processing
        summaryOutput.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Summary is being generated, please wait...';
        actualNotes.innerHTML = `<strong>Uploaded File:</strong> ${data.original_filename}<br><br><i class="fas fa-spinner fa-spin"></i> Processing...`;
        
        // Ensure PDF viewer is hidden during processing
        document.getElementById('pdf-viewer-container').style.display = 'none';
        actualNotes.style.display = 'block';

        // Poll again after 5 seconds
        setTimeout(() => fetchSummaryFromDatabase(summaryId), 5000);

      } else if (data.status === 'completed') {
        console.log('Summary completed!');
        
        // Display the summary text
        summaryOutput.innerHTML = data.summary_text;
        
        // Display the original content preview with a download link
        actualNotes.innerHTML = `<strong>Uploaded File:</strong> ${data.original_filename}<br>
          <a href="http://localhost:5001/api/ai/summaries/${summaryId}/file" target="_blank" style="color: #007bff; text-decoration: none; font-size: 0.9em; display: inline-block; margin-top: 5px;">
            <i class="fas fa-download"></i> Download Original File
          </a><br><br>`;

        // Check if the file is a PDF and display it using PDF.js
        const fileExtension = data.original_filename.toLowerCase().split('.').pop();
        if (fileExtension === 'pdf') {
          // Hide the text preview and show the PDF viewer
          document.getElementById('pdf-viewer-container').style.display = 'block';
          actualNotes.style.display = 'none';
          
          // Load and display the PDF
          loadAndDisplayPDF(`http://localhost:5001/api/ai/summaries/${summaryId}/file`, data.original_filename);
        } else {
          // For non-PDF files, show the text preview
          actualNotes.innerHTML += `${data.original_content_preview}${data.original_content_preview.length >= 1000 ? '...' : ''}`;
        }
        
        // Update the uploaded file name in localStorage
        localStorage.setItem("uploadedFileName", data.original_filename);
        
      } else if (data.status === 'failed') {
        console.error('Summary generation failed:', data.error);
        summaryOutput.innerHTML = `<p style="color: red;">Error: Summary generation failed.</p>`;
        actualNotes.innerHTML = `<strong>Uploaded File:</strong> ${data.original_filename}<br><br>
                                 <p style="color: red;">${data.error || 'An unknown error occurred during processing.'}</p>`;
        
        // Ensure PDF viewer is hidden when processing fails
        document.getElementById('pdf-viewer-container').style.display = 'none';
        actualNotes.style.display = 'block';
        
      } else {
        // Should not happen if backend is correct
        throw new Error('Invalid summary status received.');
      }
      
    } catch (error) {
      console.error('Error fetching summary:', error);
      summaryOutput.innerHTML = `<p style="color: red;">Error loading summary: ${error.message}</p>`;
      actualNotes.innerHTML = `<p style="color: red;">Could not load original content. <a href="http://localhost:5001/api/ai/summaries/${summaryId}/file" target="_blank" style="color: #007bff;">Download Original File (if available)</a></p>`;
    }
  }

  // Function to load and display PDF using PDF.js in a scrollable format
  async function loadAndDisplayPDF(fileUrl, filename) {
    try {
      // Configure worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      // Fetch the PDF file as an array buffer with authorization header
      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const arrayBuffer = await response.arrayBuffer();
      
      // Load the PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      
      // Get the container for PDF pages
      const canvasContainer = document.getElementById('pdf-canvas-container');
      canvasContainer.innerHTML = ''; // Clear any existing content
      
      // Render all pages in a scrollable container
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        
        // Create canvas for this page
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        canvasContainer.appendChild(canvas);
        
        // Set up the canvas and context
        const context = canvas.getContext('2d');
        
        // Set scale (adjust for HiDPI screens)
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });
        
        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page into canvas context
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
      }
      
    } catch (error) {
      console.error('Error displaying PDF:', error);
      // Fallback to showing error message
      document.getElementById('pdf-viewer-container').style.display = 'none';
      actualNotes.style.display = 'block';
      actualNotes.innerHTML += `<p style="color: red;">Error displaying PDF: ${error.message}. <a href="${fileUrl}" target="_blank" style="color: #007bff;">Download Original File</a></p>`;
    }
  }

  // Save to Collection → Save & Go to Collection Page
  saveBtn?.addEventListener("click", async () => {
    try {
      // Get the current summary ID from URL parameters or localStorage
      const summaryId = urlParams.get('summaryId') || localStorage.getItem("summaryId");
      
      if (!summaryId) {
        alert("No summary found to save. Please generate a summary first.");
        return;
      }

      // Check if user has any collections, if not, ask them to create one
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
        if (confirm("You don't have any collections yet. Would you like to create one first?")) {
          // Redirect to collection page where they can create a collection
          window.location.href = "../pages/collection.html";
          return;
        } else {
          return;
        }
      }

      // For now, let's use the first collection as default
      // You can enhance this later to show a modal to select a collection
      const defaultCollection = collections[0];
      
      // Call the API to save the summary to the collection
      const saveResponse = await fetch("http://localhost:5001/api/ai/summaries/" + summaryId + "/save-to-collection", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          summaryId: summaryId,
          collectionId: defaultCollection.id
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Failed to save to collection');
      }

      // Show confirmation and redirect
      alert("Summary saved to your collection!");
      window.location.href = "../pages/collection.html"; // Redirect to collection page
    } catch (error) {
      console.error('Error saving to collection:', error);
      alert("Error saving to collection: " + error.message);
    }
  });

  // Generate Mind Map → Go to Mind Map Page
  mindmapBtn?.addEventListener("click", () => {
    // Optionally save the summary first
    const summaryText = summaryOutput.innerText.trim();
    localStorage.setItem("studybloom-last-summary", summaryText);

    // Redirect to mind map page
    alert("Generating mind map...");
    window.location.href = "../pages/mindmap.html";
  });
}

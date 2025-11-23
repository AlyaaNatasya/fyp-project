// frontend/js/uploadNote.js

/**
 * This file handles the upload notes page logic
 * All shared logic (sidebar, auth, username, logout) is in main.js
 */

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection: Must be logged in
  if (!token) {
    alert("Please log in to access this page.");
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
      usernameSpan.textContent = name;
    }
  } catch (err) {
    console.warn("Invalid token:", err);
    localStorage.removeItem("token");
    window.location.href = "home.html";
    return;
  }

  // ✅ Do NOT run upload logic here — wait for main.js to call it after template injection
});

// --- File Upload Logic (wrapped in reusable function) ---
function initUploadNotePage() {
  // Remove any existing event listeners to prevent duplicates
  const fileInput = document.getElementById("file-input");
  const chooseFileBtn = document.querySelector(".choose-file-btn");
  const generateBtn = document.querySelector(".generate-btn");
  const backendUrl = "http://localhost:5001"; // Node.js server URL

  // Safety check
  if (!fileInput || !chooseFileBtn || !generateBtn) {
    console.warn(
      "⚠️ Upload elements not found. Template may not be injected yet."
    );
    return;
  }

  console.log("✅ Upload elements found — initializing event listeners...");

  // Remove existing event listeners to prevent accumulation on page refresh
  // Store original event listeners to remove them first
  if (fileInput._chooseFileListener) {
    fileInput.removeEventListener("change", fileInput._chooseFileListener);
  }
  if (chooseFileBtn._clickListener) {
    chooseFileBtn.removeEventListener("click", chooseFileBtn._clickListener);
  }
  if (generateBtn._clickListener) {
    generateBtn.removeEventListener("click", generateBtn._clickListener);
  }

  // Define event listeners
  const chooseFileListener = (e) => {
    e.preventDefault();
    fileInput.click();
  };

  const fileChangeListener = () => {
    if (fileInput.files.length > 0) {
      const fileName = fileInput.files[0].name;
      chooseFileBtn.innerHTML = `<i class="fas fa-check"></i> ${fileName}`;
    } else {
      chooseFileBtn.innerHTML = `<i class="fas fa-upload"></i> Choose File`;
    }
  };

  const generateBtnListener = async () => {
    if (!fileInput.files.length) {
      alert("Please select a file first.");
      return;
    }

    const selectedFile = fileInput.files[0];

    // Show loading state
    const originalText = generateBtn.textContent;
    generateBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Processing...';
    generateBtn.disabled = true;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      console.log("Making request to:", `${backendUrl}/api/ai/summarize`);
      console.log("Token exists:", !!localStorage.getItem("token"));
      console.log(
        "Token:",
        localStorage.getItem("token")?.substring(0, 20) + "..."
      );

      // Create an AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 second timeout (5 minutes) to accommodate AI processing

      const response = await fetch(`${backendUrl}/api/ai/summarize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          // Don't set Content-Type when using FormData - browser sets it automatically
        },
        body: formData,
        signal: controller.signal, // Add the abort signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      console.log("Response received - Status:", response.status);
      console.log("Response headers:", [...response.headers.entries()]);

      // Check if the response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          // Attempt to get error details from response
          const errorText = await response.text();
          console.error("Error response text:", errorText);
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch (parseError) {
            // If response is not JSON, use the text directly
            console.error(
              "Could not parse error response as JSON:",
              parseError
            );
            errorMessage = errorText || errorMessage;
          }
        } catch (readError) {
          console.error("Could not read error response:", readError);
        }
        throw new Error(errorMessage);
      }

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      console.log("Response content type:", contentType);
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        console.error(
          "Response is not JSON. Content-Type:",
          contentType,
          "Response text:",
          responseText
        );
        throw new Error(
          "Response is not in JSON format: " + responseText.substring(0, 200)
        );
      }

      // Get the JSON response, even for errors
      const data = await response.json();
      console.log("Response received:", data);

      if (!response.ok) {
        // Handle errors from the *initial* request (e.g., 400, 500)
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      // --- SUCCESS (Expect 202 Accepted) ---
      if (response.status === 202 && data.summaryId) {
        console.log("File accepted for processing. ID:", data.summaryId);

        // Store filename to display on summary page while loading
        localStorage.setItem(
          "uploadedFileName",
          data.fileName || "Unknown File"
        );

        // Redirect to summary page, which will now handle polling
        window.location.href = `../pages/summary.html?summaryId=${data.summaryId}`;
      } else {
        // Handle unexpected success response
        console.error("Invalid response format:", data);
        throw new Error(
          "Invalid response format from server: missing summaryId"
        );
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      if (error.name === "AbortError") {
        alert("Request timeout: The server did not accept the file in time.");
      } else if (error.name === "TypeError" && error.message.includes("fetch")) {
        alert(`Network error: ${error.message}. Please check if the backend server is running.`);
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      // Restore button state
      generateBtn.textContent = originalText;
      generateBtn.disabled = false;
    }
  };

  // Attach event listeners
  chooseFileBtn.addEventListener("click", chooseFileListener);
  fileInput.addEventListener("change", fileChangeListener);
  generateBtn.addEventListener("click", generateBtnListener);

  // Store references to the event listeners so we can remove them later if needed
  fileInput._chooseFileListener = fileChangeListener;
  chooseFileBtn._clickListener = chooseFileListener;
  generateBtn._clickListener = generateBtnListener;
}

// ✅ Expose for main.js to call after template is injected
window.initUploadNotePage = initUploadNotePage;

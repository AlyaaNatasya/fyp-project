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
  const fileInput = document.getElementById("file-input");
  const chooseFileBtn = document.querySelector(".choose-file-btn");
  const generateBtn = document.querySelector(".generate-btn");

  // Safety check
  if (!fileInput || !chooseFileBtn || !generateBtn) {
    console.warn(
      "⚠️ Upload elements not found. Template may not be injected yet."
    );
    return;
  }

  console.log("✅ Upload elements found — initializing event listeners...");

  chooseFileBtn.addEventListener("click", () => {
    e.preventDefault();
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      const fileName = fileInput.files[0].name;
      chooseFileBtn.innerHTML = `<i class="fas fa-check"></i> ${fileName}`;
    } else {
      chooseFileBtn.innerHTML = `<i class="fas fa-upload"></i> Choose File`;
    }
  });

  generateBtn.addEventListener("click", () => {
    if (!fileInput.files.length) {
      alert("Please select a file first.");
      return;
    }

    const selectedFile = fileInput.files[0];

    // 👇 Store file info in localStorage (temporary, for demo)
    const reader = new FileReader();
    reader.onload = function (e) {
      // Store file name and simulated summary
      const fakeSummary = `
      Key Points from ${selectedFile.name}:
      • This is a simulated AI-generated summary.
      • In the real app, this would use your AI model to extract main ideas.
      • It would highlight definitions, key terms, and concepts.
      • The summary would be concise and study-friendly.
    `;

      // Save to localStorage so summary.html can read it
      localStorage.setItem("uploadedFileName", selectedFile.name);
      localStorage.setItem("generatedSummary", fakeSummary);

      // ✅ Redirect to summary page
      window.location.href = "../pages/summary.html";
    };

    reader.readAsText(selectedFile); // 👈 Use readAsText for easier display (unless binary needed)
  });
}

// ✅ Expose for main.js to call after template is injected
window.initUploadNotePage = initUploadNotePage;

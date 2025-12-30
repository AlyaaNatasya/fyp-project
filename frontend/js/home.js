// frontend/js/home.js

document.addEventListener("DOMContentLoaded", function () {
  const signupTab = document.getElementById("signup-tab");
  const loginTab = document.getElementById("login-tab");
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const signupMessage = document.getElementById("signup-message");
  const loginMessage = document.getElementById("login-message");

  // About Us Modal functionality
  const aboutUsBtn = document.getElementById("about-us-btn");
  const aboutUsModal = document.getElementById("aboutUsModal");
  const closeAboutModal = document.getElementById("closeAboutModal");

  // Tab switching
  signupTab?.addEventListener("click", function () {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
    clearMessages();
  });

  loginTab?.addEventListener("click", function () {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
    clearMessages();
  });

  // Toggle password visibility
  document.querySelectorAll(".toggle-password").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const input = this.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        this.classList.remove("fa-eye");
        this.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        this.classList.remove("fa-eye-slash");
        this.classList.add("fa-eye");
      }
    });
  });

  // Handle signup
  signupForm?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById(
      "signup-confirm-password"
    ).value;

    if (password !== confirmPassword) {
      showMessage(signupMessage, "Passwords do not match!", "error");
      return;
    }
    if (password.length < 8) {
      showMessage(
        signupMessage,
        "Password must be at least 8 characters!",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(
          signupMessage,
          "Account created! Redirecting...",
          "success"
        );
        localStorage.setItem("token", data.token); // ✅ Save token
        setTimeout(() => (window.location.href = "dashboard.html"), 1000);
      } else {
        const errorMessage = data.message || "Signup failed";
        const errorDetails = data.errors
          ? data.errors.map((e) => e.msg).join(", ")
          : "";
        showMessage(signupMessage, `${errorMessage} ${errorDetails}`, "error"); // Fixed this line
      }
    } catch (err) {
      console.error("Network error:", err);
      showMessage(signupMessage, "Could not connect to server.", "error");
    }
  });

  // Handle login
  loginForm?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      showMessage(loginMessage, "Please fill all fields!", "error");
      return;
    }

    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (response.ok) {
        showMessage(
          loginMessage,
          "Login successful! Redirecting...",
          "success"
        );
        localStorage.setItem("token", data.token); // ✅ Save token
        setTimeout(() => (window.location.href = "dashboard.html"), 1000);
      } else {
        showMessage(
          loginMessage,
          data.message || "Invalid credentials",
          "error"
        );
      }
    } catch (err) {
      console.error("Network error:", err);
      showMessage(loginMessage, "Could not connect to server.", "error");
    }
  });

  // Utility functions
  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = "auth-message " + type;
  }

  function clearMessages() {
    if (signupMessage) signupMessage.textContent = "";
    if (loginMessage) loginMessage.textContent = "";
    if (signupMessage) signupMessage.className = "auth-message";
    if (loginMessage) loginMessage.className = "auth-message";
  }

  // About Us button functionality
  aboutUsBtn?.addEventListener("click", function (e) {
    e.preventDefault();
    aboutUsModal.style.display = "flex";
  });

  // Close About Us modal
  closeAboutModal?.addEventListener("click", function () {
    aboutUsModal.style.display = "none";
  });

  // Close modal when clicking outside the content
  window.addEventListener("click", function (e) {
    if (e.target === aboutUsModal) {
      aboutUsModal.style.display = "none";
    }
  });

  // Read More button functionality - Modal approach
  const readMoreBtn = document.querySelector(".read-more-btn");

  // Create modal for Read More content
  function createReadMoreModal() {
    const modal = document.createElement("div");
    modal.id = "readMoreModal";
    modal.className = "modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-content read-more-modal-content">
        <span class="close-modal" id="closeReadMoreModal">&times;</span>
        <h3>How NotePetal Enhances Your Learning</h3>

        <div class="feature-grid">
          <div class="feature-card">
            <i class="fas fa-file-contract"></i>
            <h4>Smart Summarization</h4>
            <p>Upload your notes and get concise, AI-generated summaries that capture all the key points, saving you hours of reading time.</p>
          </div>

          <div class="feature-card">
            <i class="fas fa-project-diagram"></i>
            <h4>Visual Mind Maps</h4>
            <p>Transform complex concepts into intuitive mind maps that help you visualize relationships between ideas and improve retention.</p>
          </div>

          <div class="feature-card">
            <i class="fas fa-graduation-cap"></i>
            <h4>Adaptive Quizzes</h4>
            <p>Create personalized quizzes from your notes that adapt to your learning pace and focus on areas where you need improvement.</p>
          </div>

          <div class="feature-card">
            <i class="fas fa-clipboard-list"></i>
            <h4>Flashcards</h4>
            <p>Generate interactive flashcards automatically from your notes to reinforce key concepts and improve memorization.</p>
          </div>

          <div class="feature-card">
            <i class="fas fa-calendar-alt"></i>
            <h4>Time Management</h4>
            <p>Integrated study timers and scheduling tools to help you manage your study time effectively and avoid procrastination.</p>
          </div>

          <div class="feature-card">
            <i class="fas fa-folder-open"></i>
            <h4>Organized Collections</h4>
            <p>Organize your notes into collections for different subjects or topics, making it easy to find and review what you need.</p>
          </div>
        </div>

        <div class="cta-section">
          <p>Let's get started to improve your note-taking and study habits with AI-powered tools.</p>
          <button class="auth-btn cta-btn" id="get-started-modal-btn">Get Started</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  // Initialize modal when DOM is loaded
  const readMoreModal = createReadMoreModal();

  // Event listeners for Read More functionality
  readMoreBtn?.addEventListener("click", function (e) {
    e.preventDefault();
    readMoreModal.style.display = "flex";
  });

  // Close modal when close button is clicked
  document
    .getElementById("closeReadMoreModal")
    ?.addEventListener("click", function () {
      readMoreModal.style.display = "none";
    });

  // Close modal when clicking outside the content
  readMoreModal?.addEventListener("click", function (e) {
    if (e.target === readMoreModal) {
      readMoreModal.style.display = "none";
    }
  });

  // Handle "Get Started" button in modal
  document.addEventListener("click", function (e) {
    if (e.target.id === "get-started-modal-btn") {
      // Switch to signup tab and show the form
      if (signupTab && signupForm) {
        signupTab.classList.add("active");
        loginTab.classList.remove("active");
        signupForm.classList.add("active");
        loginForm.classList.remove("active");
        clearMessages();

        // Close the modal
        readMoreModal.style.display = "none";

        // Scroll to auth section
        document.querySelector(".auth-container").scrollIntoView({
          behavior: "smooth",
        });
      }
    }
  });
});

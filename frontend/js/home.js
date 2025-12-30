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

  // Forgot Password functionality
  const forgotPasswordLink = document.querySelector(".forgot-password");

  function createForgotPasswordModal() {
    const modal = document.createElement("div");
    modal.id = "forgotPasswordModal";
    modal.className = "modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal" id="closeForgotPasswordModal">&times;</span>
        <h3>Reset Password</h3>

        <!-- Step 1: Enter Email -->
        <div id="forgotStep1" class="forgot-step">
          <p>Enter your email address to receive a One-Time Password (OTP).</p>
          <form id="forgotEmailForm">
            <div class="form-group">
              <label for="forgot-email">Email Address</label>
              <input type="email" id="forgot-email" name="email" required />
            </div>
            <button type="submit" class="auth-btn">Send OTP</button>
            <div class="auth-message" id="forgot-email-message"></div>
          </form>
        </div>

        <!-- Step 2: Enter OTP -->
        <div id="forgotStep2" class="forgot-step" style="display: none;">
          <p>Enter the 6-digit OTP sent to your email.</p>
          <form id="forgotOTPForm">
            <div class="form-group">
              <label for="forgot-otp">OTP</label>
              <input type="text" id="forgot-otp" name="otp" maxlength="6" required pattern="\\d{6}" />
            </div>
            <button type="submit" class="auth-btn">Verify OTP</button>
            <button type="button" class="auth-btn secondary" id="resendOTP">Resend OTP</button>
            <div class="auth-message" id="forgot-otp-message"></div>
          </form>
        </div>

        <!-- Step 3: Enter New Password -->
        <div id="forgotStep3" class="forgot-step" style="display: none;">
          <p>Enter your new password.</p>
          <form id="forgotResetForm">
            <div class="form-group">
              <label for="forgot-new-password">New Password</label>
              <div class="password-input">
                <input type="password" id="forgot-new-password" name="newPassword" required />
                <i class="fas fa-eye toggle-password"></i>
              </div>
            </div>
            <div class="form-group">
              <label for="forgot-confirm-password">Confirm New Password</label>
              <div class="password-input">
                <input type="password" id="forgot-confirm-password" name="confirmPassword" required />
                <i class="fas fa-eye toggle-password"></i>
              </div>
            </div>
            <button type="submit" class="auth-btn">Reset Password</button>
            <div class="auth-message" id="forgot-reset-message"></div>
          </form>
        </div>

        <!-- Success Message -->
        <div id="forgotSuccess" class="forgot-step" style="display: none; text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 64px; color: #4CAF50; margin-bottom: 20px;"></i>
          <h4>Password Reset Successful!</h4>
          <p>You can now login with your new password.</p>
          <button class="auth-btn" id="closeSuccessBtn">Back to Login</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  const forgotPasswordModal = createForgotPasswordModal();

  let forgotEmail = "";

  // Open forgot password modal
  forgotPasswordLink?.addEventListener("click", function (e) {
    e.preventDefault();
    forgotPasswordModal.style.display = "flex";
    // Reset to step 1
    document.getElementById("forgotStep1").style.display = "block";
    document.getElementById("forgotStep2").style.display = "none";
    document.getElementById("forgotStep3").style.display = "none";
    document.getElementById("forgotSuccess").style.display = "none";
    forgotEmail = "";
    clearForgotMessages();
  });

  // Close modal
  document.getElementById("closeForgotPasswordModal")?.addEventListener("click", function () {
    forgotPasswordModal.style.display = "none";
  });

  // Close modal when clicking outside
  forgotPasswordModal?.addEventListener("click", function (e) {
    if (e.target === forgotPasswordModal) {
      forgotPasswordModal.style.display = "none";
    }
  });

  // Step 1: Send OTP
  document.getElementById("forgotEmailForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value;
    forgotEmail = email;

    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showForgotMessage("forgot-email-message", data.message, "success");
        // Move to step 2 after 1 second
        setTimeout(() => {
          document.getElementById("forgotStep1").style.display = "none";
          document.getElementById("forgotStep2").style.display = "block";
        }, 1000);
      } else {
        showForgotMessage("forgot-email-message", data.message, "error");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      showForgotMessage("forgot-email-message", "Could not connect to server.", "error");
    }
  });

  // Step 2: Verify OTP
  document.getElementById("forgotOTPForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const otp = document.getElementById("forgot-otp").value;

    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        showForgotMessage("forgot-otp-message", data.message, "success");
        // Move to step 3 after 1 second
        setTimeout(() => {
          document.getElementById("forgotStep2").style.display = "none";
          document.getElementById("forgotStep3").style.display = "block";
        }, 1000);
      } else {
        showForgotMessage("forgot-otp-message", data.message, "error");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      showForgotMessage("forgot-otp-message", "Could not connect to server.", "error");
    }
  });

  // Resend OTP
  document.getElementById("resendOTP")?.addEventListener("click", async function () {
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        showForgotMessage("forgot-otp-message", "New OTP sent successfully!", "success");
      } else {
        showForgotMessage("forgot-otp-message", data.message, "error");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      showForgotMessage("forgot-otp-message", "Could not connect to server.", "error");
    }
  });

  // Step 3: Reset Password
  document.getElementById("forgotResetForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const newPassword = document.getElementById("forgot-new-password").value;
    const confirmPassword = document.getElementById("forgot-confirm-password").value;
    const otp = document.getElementById("forgot-otp").value;

    if (newPassword !== confirmPassword) {
      showForgotMessage("forgot-reset-message", "Passwords do not match!", "error");
      return;
    }

    if (newPassword.length < 8) {
      showForgotMessage("forgot-reset-message", "Password must be at least 8 characters!", "error");
      return;
    }

    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success screen
        document.getElementById("forgotStep3").style.display = "none";
        document.getElementById("forgotSuccess").style.display = "block";
      } else {
        showForgotMessage("forgot-reset-message", data.message, "error");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      showForgotMessage("forgot-reset-message", "Could not connect to server.", "error");
    }
  });

  // Close success screen
  document.getElementById("closeSuccessBtn")?.addEventListener("click", function () {
    forgotPasswordModal.style.display = "none";
  });

  // Utility functions for forgot password
  function showForgotMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = "auth-message " + type;
    }
  }

  function clearForgotMessages() {
    const messageElements = [
      "forgot-email-message",
      "forgot-otp-message",
      "forgot-reset-message"
    ];
    messageElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = "";
        element.className = "auth-message";
      }
    });
  }

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

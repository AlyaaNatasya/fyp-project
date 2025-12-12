// frontend/js/home.js

document.addEventListener("DOMContentLoaded", function () {
  const signupTab = document.getElementById("signup-tab");
  const loginTab = document.getElementById("login-tab");
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const signupMessage = document.getElementById("signup-message");
  const loginMessage = document.getElementById("login-message");

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
});

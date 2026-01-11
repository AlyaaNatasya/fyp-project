// frontend/js/profile.js

/**
 * This file handles profile-specific logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

// Define the profile initialization function that will be called by main.js
window.initProfilePage = function() {
  console.log("Initializing profile page...");
  loadUserProfile();
  setupEventListeners();
  applyUserTheme();
};

// Load user profile data
function loadUserProfile() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No authentication token found");
    return;
  }

  fetch(`${CONFIG.BACKEND_URL}/api/users/profile`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      populateProfileForm(data.user);
    } else {
      console.error("Failed to load profile:", data.message);
      showError("Error loading profile: " + data.message);
    }
  })
  .catch(error => {
    console.error("Error fetching profile:", error);
    showError("Error loading profile. Please try again.");
  });
}

// Populate the profile form with user data
function populateProfileForm(user) {
  // Update profile header
  document.getElementById("profileName").textContent = user.name;
  document.getElementById("profileEmail").textContent = user.email;

  // Update current email display
  document.getElementById("currentEmailDisplay").textContent = user.email;

  // Update theme color
  const themeColor = user.theme_color || '#c1946e';
  const themeColorInput = document.getElementById("themeColor");
  const themeColorValueSpan = document.querySelectorAll(".color-value")[0];
  if (themeColorInput) {
    themeColorInput.value = themeColor;
  }
  if (themeColorValueSpan) {
    themeColorValueSpan.textContent = themeColor;
  }

  // Update background color
  const backgroundColor = user.background_color || '#fee3c3';
  const backgroundColorInput = document.getElementById("backgroundColor");
  const backgroundColorValueSpan = document.querySelectorAll(".color-value")[1];
  if (backgroundColorInput) {
    backgroundColorInput.value = backgroundColor;
  }
  if (backgroundColorValueSpan) {
    backgroundColorValueSpan.textContent = backgroundColor;
  }

  // Update account information
  if (user.created_at) {
    const createdDate = new Date(user.created_at);
    document.getElementById("memberSince").textContent = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Store theme colors for application
  localStorage.setItem("userThemeColor", themeColor);
  localStorage.setItem("userBackgroundColor", backgroundColor);
}

// Setup event listeners
function setupEventListeners() {
  // Theme color picker
  const themeColorInput = document.getElementById("themeColor");
  const themeColorValueSpan = document.querySelectorAll(".color-value")[0];
  if (themeColorInput && themeColorValueSpan) {
    themeColorInput.addEventListener("input", function() {
      themeColorValueSpan.textContent = this.value;
    });
  }

  // Background color picker
  const backgroundColorInput = document.getElementById("backgroundColor");
  const backgroundColorValueSpan = document.querySelectorAll(".color-value")[1];
  if (backgroundColorInput && backgroundColorValueSpan) {
    backgroundColorInput.addEventListener("input", function() {
      backgroundColorValueSpan.textContent = this.value;
    });
  }

  // Save theme button
  const saveThemeBtn = document.getElementById("saveThemeBtn");
  if (saveThemeBtn) {
    saveThemeBtn.addEventListener("click", handleSaveTheme);
  }

  // Send email OTP button
  const sendEmailOTPBtn = document.getElementById("sendEmailOTPBtn");
  if (sendEmailOTPBtn) {
    sendEmailOTPBtn.addEventListener("click", handleSendEmailOTP);
  }

  // Verify email OTP button
  const verifyEmailOTPBtn = document.getElementById("verifyEmailOTPBtn");
  if (verifyEmailOTPBtn) {
    verifyEmailOTPBtn.addEventListener("click", handleVerifyEmailOTP);
  }

  // Cancel email update button
  const cancelEmailUpdateBtn = document.getElementById("cancelEmailUpdateBtn");
  if (cancelEmailUpdateBtn) {
    cancelEmailUpdateBtn.addEventListener("click", handleCancelEmailUpdate);
  }

  // Update password button
  const updatePasswordBtn = document.getElementById("updatePasswordBtn");
  if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener("click", handleUpdatePassword);
  }
}

// Handle save theme
function handleSaveTheme() {
  const token = localStorage.getItem("token");
  if (!token) {
    showError("Please log in to update your theme");
    return;
  }

  const themeColor = document.getElementById("themeColor").value;
  const backgroundColor = document.getElementById("backgroundColor").value;

  showLoading("Saving theme...");

  fetch(`${CONFIG.BACKEND_URL}/api/users/profile`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ theme_color: themeColor, background_color: backgroundColor })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update local storage
      localStorage.setItem("userThemeColor", themeColor);
      localStorage.setItem("userBackgroundColor", backgroundColor);

      // Apply theme immediately
      applyThemeColor(themeColor);
      applyBackgroundColor(backgroundColor);

      showSuccess("Theme saved successfully!");
    } else {
      console.error("Failed to save theme:", data.message);
      showError("Error saving theme: " + (data.message || "Unknown error"));
    }
  })
  .catch(error => {
    console.error("Error saving theme:", error);
    showError("Error saving theme. Please try again.");
  })
  .finally(() => {
    hideLoading();
  });
}

// Handle send email OTP
function handleSendEmailOTP() {
  const token = localStorage.getItem("token");
  if (!token) {
    showError("Please log in to update your email");
    return;
  }

  const currentEmail = document.getElementById("currentEmail").value.trim();
  const newEmail = document.getElementById("newEmail").value.trim();

  if (!currentEmail || !newEmail) {
    showError("Please fill in both current and new email fields");
    return;
  }

  if (currentEmail === newEmail) {
    showError("New email must be different from current email");
    return;
  }

  showLoading("Sending OTP...");

  fetch(`${CONFIG.BACKEND_URL}/api/users/email/send-otp`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      current_email: currentEmail,
      new_email: newEmail
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      // Show OTP verification section
      document.getElementById("emailOTPSection").style.display = "block";
      showSuccess("OTP sent to your current email!");
    } else {
      console.error("Failed to send OTP:", data.message);
      showError("Error sending OTP: " + (data.message || "Unknown error"));
    }
  })
  .catch(error => {
    console.error("Error sending OTP:", error);
    showError("Error sending OTP. Please try again.");
  })
  .finally(() => {
    hideLoading();
  });
}

// Handle verify email OTP
function handleVerifyEmailOTP() {
  const token = localStorage.getItem("token");
  if (!token) {
    showError("Please log in to update your email");
    return;
  }

  const currentEmail = document.getElementById("currentEmail").value.trim();
  const newEmail = document.getElementById("newEmail").value.trim();
  const otp = document.getElementById("emailOTP").value.trim();

  if (!currentEmail || !newEmail || !otp) {
    showError("Please fill in all fields");
    return;
  }

  if (otp.length !== 6) {
    showError("OTP must be 6 digits");
    return;
  }

  showLoading("Verifying OTP...");

  fetch(`${CONFIG.BACKEND_URL}/api/users/email`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      current_email: currentEmail,
      new_email: newEmail,
      otp: otp
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      showSuccess("Email updated successfully!");

      // Clear form and hide OTP section
      document.getElementById("currentEmail").value = "";
      document.getElementById("newEmail").value = "";
      document.getElementById("emailOTP").value = "";
      document.getElementById("emailOTPSection").style.display = "none";

      // Reload profile after 2 seconds
      setTimeout(() => {
        loadUserProfile();
      }, 2000);
    } else {
      console.error("Failed to verify OTP:", data.message);
      showError("Error verifying OTP: " + (data.message || "Unknown error"));
    }
  })
  .catch(error => {
    console.error("Error verifying OTP:", error);
    showError("Error verifying OTP. Please try again.");
  })
  .finally(() => {
    hideLoading();
  });
}

// Handle cancel email update
function handleCancelEmailUpdate() {
  document.getElementById("currentEmail").value = "";
  document.getElementById("newEmail").value = "";
  document.getElementById("emailOTP").value = "";
  document.getElementById("emailOTPSection").style.display = "none";
}

// Handle update password
function handleUpdatePassword() {
  const token = localStorage.getItem("token");
  if (!token) {
    showError("Please log in to update your password");
    return;
  }

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showError("Please fill in all password fields");
    return;
  }

  if (newPassword !== confirmPassword) {
    showError("New passwords do not match");
    return;
  }

  if (newPassword.length < 8) {
    showError("New password must be at least 8 characters");
    return;
  }

  showLoading("Updating password...");

  fetch(`${CONFIG.BACKEND_URL}/api/users/password`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      showSuccess("Password updated successfully!");

      // Clear form
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    } else {
      console.error("Failed to update password:", data.message);
      showError("Error updating password: " + (data.message || "Unknown error"));
    }
  })
  .catch(error => {
    console.error("Error updating password:", error);
    showError("Error updating password. Please try again.");
  })
  .finally(() => {
    hideLoading();
  });
}

// Apply user theme color
function applyUserTheme() {
  const themeColor = localStorage.getItem("userThemeColor");
  if (themeColor) {
    applyThemeColor(themeColor);
  }

  const backgroundColor = localStorage.getItem("userBackgroundColor");
  if (backgroundColor) {
    applyBackgroundColor(backgroundColor);
  }
}

// Apply theme color to CSS variables
function applyThemeColor(color) {
  // Update CSS variables
  document.documentElement.style.setProperty('--primary-color', color);

  // Calculate lighter and darker shades
  const lighterColor = adjustColor(color, 20);
  const darkerColor = adjustColor(color, -20);

  document.documentElement.style.setProperty('--primary-light', lighterColor);
  document.documentElement.style.setProperty('--primary-dark', darkerColor);
}

// Apply background color to CSS variables
function applyBackgroundColor(color) {
  // Update CSS variables
  document.documentElement.style.setProperty('--primary-bg', color);
}

// Helper function to adjust color brightness
function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

// Show loading overlay
function showLoading(text = "Processing...") {
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingText = document.getElementById("loadingText");
  if (loadingOverlay) {
    loadingText.textContent = text;
    loadingOverlay.classList.add("active");
  }
}

// Hide loading overlay
function hideLoading() {
  const loadingOverlay = document.getElementById("loadingOverlay");
  if (loadingOverlay) {
    loadingOverlay.classList.remove("active");
  }
}

// Show success message
function showSuccess(message) {
  const successMessage = document.getElementById("successMessage");
  const successText = document.getElementById("successText");
  if (successMessage && successText) {
    successText.textContent = message;
    successMessage.classList.add("active");

    // Hide after 3 seconds
    setTimeout(() => {
      successMessage.classList.remove("active");
    }, 3000);
  }
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  if (errorMessage && errorText) {
    errorText.textContent = message;
    errorMessage.classList.add("active");

    // Hide after 5 seconds
    setTimeout(() => {
      errorMessage.classList.remove("active");
    }, 5000);
  }
}

// For backward compatibility or direct loading
document.addEventListener("DOMContentLoaded", function () {
  // Check if content has already been loaded by main.js
  if (document.querySelector(".main-content")) {
    // Content already loaded, initialize immediately
    window.initProfilePage();
  } else {
    // Wait for main.js to load content
    // The main.js will call initProfilePage after content injection
  }
});
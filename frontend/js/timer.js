// frontend/js/timer.js

/**
 * This file handles the timer page logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

// Wait for the page content to be injected before running
document.addEventListener("DOMContentLoaded", function () {
  // ✅ Wait for .main-content to exist
  const checkContent = setInterval(() => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      clearInterval(checkContent);
      initTimerPage(); // Now safe to run
    }
  }, 100); // Check every 100ms
});

function initTimerPage() {
  const token = localStorage.getItem("token");
  const usernameSpan = document.getElementById("username");

  // 🔒 Protection: Must be logged in
  if (!token) {
    alert("Please log in to access the timer page.");
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

  // --- DOM Elements ---
  const modeSelection = document.getElementById("mode-selection");
  const timerScreen = document.getElementById("timer-screen");
  const timerMode = document.getElementById("timer-mode");
  const minutesDisplay = document.getElementById("minutes");
  const secondsDisplay = document.getElementById("seconds");
  const startPauseBtn = document.getElementById("start-pause-btn");
  const resetBtn = document.getElementById("reset-btn");
  const backBtn = document.getElementById("back-btn");

  let timer;
  let totalSeconds = 0;
  let isRunning = false;

  // --- Timer Mode Selection ---
  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => {
      const mode = card.getAttribute("data-mode");
      const title = card.querySelector("h3").textContent;

      // Show timer screen
      modeSelection.style.display = "none";
      timerScreen.style.display = "block";

      // Set mode title
      timerMode.textContent = `${title} Mode`;

      // Set duration based on mode
      if (mode === "speed") {
        totalSeconds = 5 * 60; // 5 minutes
      } else if (mode === "pomodoro") {
        totalSeconds = 25 * 60; // 25 minutes
      } else if (mode === "focus") {
        totalSeconds = 50 * 60; // 50 minutes
      }

      updateTimerDisplay();
      resetTimer();
    });
  });

  // --- Timer Controls ---
  startPauseBtn?.addEventListener("click", () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  resetBtn?.addEventListener("click", resetTimer);

  backBtn?.addEventListener("click", () => {
    timerScreen.style.display = "none";
    modeSelection.style.display = "block";
    resetTimer();
  });

  // --- Timer Functions ---
  function updateTimerDisplay() {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    minutesDisplay.textContent = mins;
    secondsDisplay.textContent = secs;
  }

  function startTimer() {
    if (totalSeconds <= 0) return;

    startPauseBtn.textContent = "Pause";
    startPauseBtn.classList.remove("start");
    startPauseBtn.classList.add("pause");

    timer = setInterval(() => {
      if (totalSeconds > 0) {
        totalSeconds--;
        updateTimerDisplay();
      } else {
        pauseTimer();
        alert("Time's up! Great job!");
      }
    }, 1000);

    isRunning = true;
  }

  function pauseTimer() {
    clearInterval(timer);
    startPauseBtn.textContent = "Start";
    startPauseBtn.classList.remove("pause");
    startPauseBtn.classList.add("start");
    isRunning = false;
  }

  function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    startPauseBtn.textContent = "Start";
    startPauseBtn.classList.remove("pause");
    startPauseBtn.classList.add("start");
    updateTimerDisplay();
  }
}

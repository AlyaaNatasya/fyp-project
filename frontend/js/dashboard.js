// frontend/js/dashboard.js

/**
 * This file only handles dashboard-specific logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

// Define the dashboard initialization function that will be called by main.js
window.initDashboardPage = function() {
  // Show upcoming reminders on dashboard
  showUpcomingReminders();
  
  // --- Dashboard Card Buttons ---
  document.querySelectorAll(".card-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const action = this.textContent.trim().toLowerCase();

      switch (action) {
        case "summary":
          window.location.href = "../pages/uploadNote.html";
          break;

        case "quizzes":
          window.location.href = "../pages/quizzes.html";
          break;

        case "study timer":
          window.location.href = "../pages/timer.html";
          break;

        case "reminder":
          window.location.href = "../pages/calendar.html";
          break;

        default:
          alert("Feature coming soon!");
      }
    });
  });
};

// Function to show upcoming reminders (due tomorrow)
function showUpcomingReminders() {
  const notificationSection = document.getElementById("upcoming-reminders");
  if (!notificationSection) return;

  // Get reminders from localStorage
  let reminders = JSON.parse(localStorage.getItem("studybloom-reminders")) || [];
  
  // Filter reminders that are due tomorrow (1 day before due date)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Format tomorrow to YYYY-MM-DD to compare with reminder dates
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  const upcomingReminders = reminders.filter(reminder => {
    const reminderDate = new Date(reminder.date);
    const reminderDateString = reminderDate.toISOString().split('T')[0];
    return reminderDateString === tomorrowString;
  });
  
  // Format the date as a readable string
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = tomorrow.toLocaleDateString('en-US', options);
  
  if (upcomingReminders.length > 0) {
    notificationSection.innerHTML = `
      <h3><i class="fas fa-bell"></i> Reminders due tomorrow (${formattedDate})</h3>
    `;
    
    upcomingReminders.forEach(reminder => {
      const reminderElement = document.createElement("div");
      reminderElement.className = "reminder-item";
      
      const categoryLabel = reminder.category ? 
        `<span class="category-badge" style="background-color: #e2e2e2; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">${reminder.category}</span>` 
        : "";
      
      reminderElement.innerHTML = `
        <div class="reminder-info">
          <strong>${reminder.title}</strong>
          ${categoryLabel}
        </div>
        <div class="date">${new Date(reminder.date).toLocaleDateString()}</div>
      `;
      notificationSection.appendChild(reminderElement);
    });
  } else {
    notificationSection.innerHTML = `
      <h3><i class="fas fa-bell"></i> Upcoming Reminders</h3>
      <div class="no-reminders">No reminders due tomorrow</div>
    `;
  }
}

// For backward compatibility or direct loading
document.addEventListener("DOMContentLoaded", function () {
  // Check if content has already been loaded by main.js
  if (document.querySelector(".main-content")) {
    // Content already loaded, initialize immediately
    window.initDashboardPage();
  } else {
    // Wait for main.js to load content
    // The main.js will call initDashboardPage after content injection
  }
});

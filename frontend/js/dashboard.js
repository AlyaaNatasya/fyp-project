// frontend/js/dashboard.js

/**
 * This file only handles dashboard-specific logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

// Define the dashboard initialization function that will be called by main.js
window.initDashboardPage = function() {
  // Show upcoming reminders on dashboard
  showUpcomingReminders();
  
  // --- Dashboard Cards Click Handler ---
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", function () {
      const href = this.dataset.href; // Get the URL from data-href attribute
      if (href) {
        window.location.href = href;
      } else {
        alert("Feature coming soon!"); // Fallback if data-href is missing
      }
    });
  });
};

// Function to format date as day/month/year
function formatReminderDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Function to show upcoming reminders (due tomorrow)
function showUpcomingReminders() {
  const notificationSection = document.getElementById("upcoming-reminders");
  if (!notificationSection) return;

  // Get reminders from the API
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No authentication token found");
    return;
  }

  fetch(`${CONFIG.BACKEND_URL}/api/reminders`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const reminders = data.reminders || [];
      
      // Filter reminders that are due tomorrow (1 day before due date)
      // Create date strings for comparison to avoid timezone issues
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Format dates consistently: YYYY-MM-DD
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const tomorrowString = formatDate(tomorrow);
      
      const upcomingReminders = reminders.filter(reminder => {
        // Parse the reminder date and format it consistently
        const reminderDate = new Date(reminder.date);
        const reminderDateString = formatDate(reminderDate);
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
            <div class="date">${formatReminderDate(reminder.date)}</div>
          `;
          notificationSection.appendChild(reminderElement);
        });
      } else {
        notificationSection.innerHTML = `
          <h3><i class="fas fa-bell"></i> Upcoming Reminders</h3>
          <div class="no-reminders">No reminders due tomorrow</div>
        `;
      }
    } else {
      console.error("Failed to load reminders:", data.message);
      notificationSection.innerHTML = `
        <h3><i class="fas fa-bell"></i> Upcoming Reminders</h3>
        <div class="no-reminders">Error loading reminders</div>
      `;
    }
  })
  .catch(error => {
    console.error("Error fetching reminders:", error);
    notificationSection.innerHTML = `
      <h3><i class="fas fa-bell"></i> Upcoming Reminders</h3>
      <div class="no-reminders">Error loading reminders</div>
    `;
  });
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

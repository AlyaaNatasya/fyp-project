// frontend/js/calendar.js

/**
 * This file only handles calendar-specific logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

// ✅ Global variables for reminders and date handling
let reminders = [];

// ✅ Define editReminder globally so it can be called from anywhere
function editReminder(reminder) {
  const reminderModal = document.getElementById("reminder-modal");
  const reminderForm = document.getElementById("reminder-form");
  const reminderDateInput = document.getElementById("reminder-date");

  // Reset form
  reminderForm.reset();

  // Set editing mode
  window.editingReminder = reminder;

  // Fill form fields
  document.getElementById("reminder-title").value = reminder.title;
  document.getElementById("reminder-description").value = reminder.description;

  const categorySelect = document.getElementById("reminder-category");
  const customInput = document.getElementById("custom-category");

  if (["exam", "quiz", "activity"].includes(reminder.category)) {
    categorySelect.value = reminder.category;
    customInput.style.display = "none";
    customInput.disabled = true;
  } else {
    categorySelect.value = "custom";
    customInput.style.display = "block";
    customInput.disabled = false;
    customInput.value = reminder.category;
  }

  // Set date - extract only the date part to avoid timezone issues
  // Handle various possible date formats that might come from the backend
  let datePart = reminder.date;
  
  // If date contains time part, extract just the date part
  if (typeof reminder.date === 'string' && reminder.date.includes(' ')) {
    datePart = reminder.date.split(' ')[0];
  } else if (typeof reminder.date === 'string' && reminder.date.includes('T')) {
    // Handle ISO format (YYYY-MM-DDTHH:MM:SS)
    datePart = reminder.date.split('T')[0];
  }
  
  // Validate that we have a proper YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    reminderDateInput.value = datePart;
  } else {
    console.error('Invalid date format received:', reminder.date);
    // Fallback: try to create a valid date string
    const dateObj = new Date(reminder.date);
    if (!isNaN(dateObj.getTime())) {
      // Format as YYYY-MM-DD
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      reminderDateInput.value = `${year}-${month}-${day}`;
    }
  }

  // Show modal
  reminderModal.classList.add("active");
}

function setupReminderModal() {
  const reminderModal = document.getElementById("reminder-modal");
  const closeModal = reminderModal.querySelector(".close");
  const reminderForm = document.getElementById("reminder-form");
  const reminderDateInput = document.getElementById("reminder-date");

  // Close modal
  closeModal?.addEventListener("click", () => {
    reminderModal.classList.remove("active");
  });

  window.addEventListener("click", (e) => {
    if (e.target === reminderModal) {
      reminderModal.classList.remove("active");
    }
  });

  // Toggle custom category
  window.toggleCustomCategory = function (select) {
    const customInput = document.getElementById("custom-category");
    if (select.value === "custom") {
      customInput.style.display = "block";
      customInput.disabled = false;
      customInput.focus();
    } else {
      customInput.style.display = "none";
      customInput.disabled = true;
      customInput.value = "";
    }
  };

  // Add event listener to category select
  const categorySelect = document.getElementById("reminder-category");
  if (categorySelect) {
    categorySelect.addEventListener("change", function() {
      window.toggleCustomCategory(this);
    });
  }

  // Save reminder
  reminderForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("reminder-title").value.trim();
    const description = document
      .getElementById("reminder-description")
      .value.trim();
    const categorySelect = document.getElementById("reminder-category");
    const category =
      categorySelect.value === "custom"
        ? document.getElementById("custom-category").value.trim()
        : categorySelect.value;
    const dateStr = reminderDateInput.value; // Get date from input

    if (!title || !dateStr) {
      alert("Title and date are required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found");
      return;
    }

    // Send the date string as-is since we want to preserve the local date
    const dateForBackend = dateStr + ' 00:00:00';

    const reminderData = {
      title,
      description,
      category,
      date: dateForBackend, // Send as ISO string to backend
    };

    let apiUrl = `${CONFIG.BACKEND_URL}/api/reminders`;
    let method = "POST";

    if (window.editingReminder) {
      // Update existing reminder
      apiUrl = `${CONFIG.BACKEND_URL}/api/reminders/${window.editingReminder.id}`;
      method = "PUT";
    }

    fetch(apiUrl, {
      method: method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reminderData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log(method === "POST" ? "Reminder created" : "Reminder updated", "successfully");
        loadReminders(); // Reload reminders after save
        reminderModal.classList.remove("active");
        // Clear globals
        window.editingReminder = null;
      } else {
        console.error("Failed to save reminder:", data.message);
        alert(data.message || "Failed to save reminder");
      }
    })
    .catch(error => {
      console.error("Error saving reminder:", error);
      alert("Error saving reminder");
    });
  });

  // Initialize openReminderModal
  window.openReminderModal = function (date) {
    if (!date) return;

    const reminderModal = document.getElementById("reminder-modal");
    const reminderForm = document.getElementById("reminder-form");
    const reminderDateInput = document.getElementById("reminder-date");
    const customInput = document.getElementById("custom-category");

    reminderForm.reset();
    window.editingReminder = null;

    // Reset custom category input to hidden and disabled
    customInput.style.display = "none";
    customInput.disabled = true;
    customInput.value = "";

    // Format date for input without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    reminderDateInput.value = dateString;

    reminderModal.classList.add("active");
  };
}

// --- Utility: Format Date ---
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Utility: Format Date String ---
function formatDateFromString(dateString) {
  // Parse date string and format it manually to avoid timezone issues
  // Handle various possible date formats that might come from the backend
  let datePart = dateString;
  
  // Extract only the date part in case there's any time component
  if (typeof dateString === 'string' && dateString.includes(' ')) {
    datePart = dateString.split(' ')[0];
  } else if (typeof dateString === 'string' && dateString.includes('T')) {
    // Handle ISO format (YYYY-MM-DDTHH:MM:SS)
    datePart = dateString.split('T')[0];
  }
  
  // Validate that we have a proper YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    console.error('Invalid date format for display:', dateString);
    return 'Invalid Date';
  }
  
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);
  
  // Define month and weekday names for manual formatting
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Create date object using local timezone to preserve the calendar date
  // Use 12 noon to avoid potential DST boundary issues
  const tempDate = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`);
  const weekdayIndex = tempDate.getDay();
  
  return `${weekdays[weekdayIndex]}, ${months[month - 1]} ${day}, ${year}`;
}

// Function to remove expired reminders (reminders with dates before current date)
function removeExpiredReminders() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No authentication token found");
    return;
  }

  // Get current date in YYYY-MM-DD format (without time component)
  const today = new Date();
  const currentDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return fetch(`${CONFIG.BACKEND_URL}/api/reminders`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const expiredReminders = [];

      // Find reminders with dates before current date
      data.reminders.forEach(reminder => {
        // Extract just the date part from the reminder date string
        const reminderDateStr = reminder.date.split(' ')[0];

        // Compare dates as strings in YYYY-MM-DD format
        if (reminderDateStr < currentDateStr) {
          expiredReminders.push(reminder.id);
        }
      });

      // Delete all expired reminders
      if (expiredReminders.length > 0) {
        console.log(`Found ${expiredReminders.length} expired reminders to remove`);

        // Create promises for all delete operations
        const deletePromises = expiredReminders.map(id => {
          return fetch(`${CONFIG.BACKEND_URL}/api/reminders/${id}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }).then(response => response.json())
          .then(result => {
            if (result.success) {
              console.log(`Deleted expired reminder ID: ${id}`);
            } else {
              console.error(`Failed to delete expired reminder ID: ${id}`, result.message);
            }
          })
          .catch(error => {
            console.error(`Error deleting expired reminder ID: ${id}`, error);
          });
        });

        // Wait for all delete operations to complete
        return Promise.all(deletePromises);
      } else {
        console.log("No expired reminders found");
        return Promise.resolve();
      }
    } else {
      console.error("Failed to fetch reminders for expiration check:", data.message);
      return Promise.reject(new Error(data.message || "Failed to fetch reminders"));
    }
  })
  .catch(error => {
    console.error("Error checking for expired reminders:", error);
    return Promise.reject(error);
  });
}

// --- Reminder Logic ---
function loadReminders() {
  // First, remove expired reminders
  removeExpiredReminders()
    .then(() => {
      // Then fetch and load remaining reminders
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
          reminders = data.reminders || [];
          const reminderList = document.getElementById("reminder-list");
          if (!reminderList) return;

          reminderList.innerHTML = "";

          // Sort reminders by date string (YYYY-MM-DD format sorts correctly alphabetically)
          const sorted = reminders
            .map((r) => {
              // Extract only the date part (YYYY-MM-DD) in case there's time info
              const datePart = r.date.split(' ')[0];
              // Create date object for display purposes only
              const [yearStr, monthStr, dayStr] = datePart.split('-');
              const year = parseInt(yearStr);
              const month = parseInt(monthStr) - 1; // Month is 0-indexed
              const day = parseInt(dayStr);
              const dateObj = new Date(year, month, day, 12, 0, 0); // Use noon to avoid DST issues
              return { ...r, dateObj, dateStr: datePart };
            })
            .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

          sorted.forEach((reminder) => {
            const card = document.createElement("div");
            card.classList.add("reminder-card");
            card.dataset.id = reminder.id;

            const categoryLabel = reminder.category
              ? `<span class="category">${reminder.category}</span>`
              : "";

            card.innerHTML = `
              <i class="fas fa-bell"></i>
              <div class="reminder-info">
                <strong>${reminder.title}</strong>
                <small>${formatDateFromString(reminder.date)}</small>
                ${categoryLabel}
              </div>
              <div class="reminder-actions">
                <button class="btn-icon edit-btn" title="Edit Reminder">
                  <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="btn-icon delete-btn" title="Delete Reminder">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            `;

            // Edit reminder
            card.querySelector(".edit-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              editReminder(reminder);
            });

            // Delete reminder
            card.querySelector(".delete-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              deleteReminder(reminder.id);
            });

            card.addEventListener("dblclick", () => editReminder(reminder));
            reminderList.appendChild(card);
          });
        } else {
          console.error("Failed to load reminders:", data.message);
        }
      })
      .catch(error => {
        console.error("Error fetching reminders:", error);
      });
    })
    .catch(error => {
      console.error("Error during reminder expiration cleanup:", error);

      // Even if expiration cleanup fails, still load reminders
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
          reminders = data.reminders || [];
          const reminderList = document.getElementById("reminder-list");
          if (!reminderList) return;

          reminderList.innerHTML = "";

          // Sort reminders by date string (YYYY-MM-DD format sorts correctly alphabetically)
          const sorted = reminders
            .map((r) => {
              // Extract only the date part (YYYY-MM-DD) in case there's time info
              const datePart = r.date.split(' ')[0];
              // Create date object for display purposes only
              const [yearStr, monthStr, dayStr] = datePart.split('-');
              const year = parseInt(yearStr);
              const month = parseInt(monthStr) - 1; // Month is 0-indexed
              const day = parseInt(dayStr);
              const dateObj = new Date(year, month, day, 12, 0, 0); // Use noon to avoid DST issues
              return { ...r, dateObj, dateStr: datePart };
            })
            .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

          sorted.forEach((reminder) => {
            const card = document.createElement("div");
            card.classList.add("reminder-card");
            card.dataset.id = reminder.id;

            const categoryLabel = reminder.category
              ? `<span class="category">${reminder.category}</span>`
              : "";

            card.innerHTML = `
              <i class="fas fa-bell"></i>
              <div class="reminder-info">
                <strong>${reminder.title}</strong>
                <small>${formatDateFromString(reminder.date)}</small>
                ${categoryLabel}
              </div>
              <div class="reminder-actions">
                <button class="btn-icon edit-btn" title="Edit Reminder">
                  <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="btn-icon delete-btn" title="Delete Reminder">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            `;

            // Edit reminder
            card.querySelector(".edit-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              editReminder(reminder);
            });

            // Delete reminder
            card.querySelector(".delete-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              deleteReminder(reminder.id);
            });

            card.addEventListener("dblclick", () => editReminder(reminder));
            reminderList.appendChild(card);
          });
        } else {
          console.error("Failed to load reminders:", data.message);
        }
      })
      .catch(error => {
        console.error("Error fetching reminders:", error);
      });
    });
}

// Delete a reminder
function deleteReminder(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No authentication token found");
    return;
  }

  if (confirm("Are you sure you want to delete this reminder?")) {
    fetch(`${CONFIG.BACKEND_URL}/api/reminders/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log("Reminder deleted successfully");
        loadReminders(); // Reload reminders after deletion
      } else {
        console.error("Failed to delete reminder:", data.message);
        alert(data.message || "Failed to delete reminder");
      }
    })
    .catch(error => {
      console.error("Error deleting reminder:", error);
      alert("Error deleting reminder");
    });
  }
}

// --- Calendar Logic ---
function initCalendarPage() {
  console.log("Calendar page initialized");

  // --- Generate Calendar ---
  const calendarDiv = document.getElementById("calendar");
  if (calendarDiv) {
    let currentDate = new Date();

    function generateCalendar(date) {
      const month = date.getMonth();
      const year = date.getFullYear();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(year, month, 1).getDay();

      const calendarDiv = document.getElementById("calendar");
      calendarDiv.innerHTML = "";

      // Month and year header
      const monthYear = document.getElementById("month-year");
      if (monthYear) {
        monthYear.textContent = date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      }

      // Day headers
      const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      daysOfWeek.forEach((day) => {
        const header = document.createElement("div");
        header.textContent = day;
        header.classList.add("day-header");
        calendarDiv.appendChild(header);
      });

      // Blank cells before the 1st
      for (let i = 0; i < firstDayOfMonth; i++) {
        const blank = document.createElement("div");
        blank.classList.add("blank-cell");
        calendarDiv.appendChild(blank);
      }

      // Add days
      for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement("div");
        dayCell.textContent = day;
        dayCell.classList.add("day");

        const today = new Date();
        if (
          day === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()
        ) {
          dayCell.classList.add("today");
        }

        // Single-click opens modal
        dayCell.addEventListener("click", function () {
          const selectedDate = new Date(year, month, day);
          openReminderModal(selectedDate);
        });

        calendarDiv.appendChild(dayCell);
      }
    }

    generateCalendar(currentDate);

    document.getElementById("prev-month")?.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      generateCalendar(currentDate);
    });

    document.getElementById("next-month")?.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      generateCalendar(currentDate);
    });
  }

  // --- Reminder List ---
  const reminderList = document.getElementById("reminder-list");
  if (reminderList) {
    loadReminders();
  }

  // --- Modal Setup ---
  setupReminderModal();
}

// ✅ This will be called by main.js after content is injected
window.initCalendarPage = initCalendarPage;

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
  } else {
    categorySelect.value = "custom";
    customInput.style.display = "block";
    customInput.value = reminder.category;
  }

  // Set date
  const selectedDate = new Date(reminder.date);
  const dateString = selectedDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  reminderDateInput.value = dateString;

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
    customInput.style.display = select.value === "custom" ? "block" : "none";
  };

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

    // Create date object ensuring it's in the correct date (not affected by timezone)
    // The date input always returns in YYYY-MM-DD format
    const dateParts = dateStr.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);
    
    // Create date object at the start of the day UTC to avoid timezone shifting
    const date = new Date(Date.UTC(year, month, day));

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found");
      return;
    }

    const reminderData = {
      title,
      description,
      category,
      date: date.toISOString(),
    };

    let apiUrl = "http://localhost:5000/api/reminders";
    let method = "POST";

    if (window.editingReminder) {
      // Update existing reminder
      apiUrl = `http://localhost:5000/api/reminders/${window.editingReminder.id}`;
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

    reminderForm.reset();
    window.editingReminder = null;

    // Format date for input
    const dateString = date.toISOString().split("T")[0];
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

// --- Reminder Logic ---
function loadReminders() {
  // Fetch reminders from the API
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No authentication token found");
    return;
  }

  fetch("http://localhost:5000/api/reminders", {
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

      const sorted = reminders
        .map((r) => ({ ...r, date: new Date(r.date) }))
        .sort((a, b) => a.date - b.date);

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
            <small>${formatDate(new Date(reminder.date))}</small>
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
}

// Delete a reminder
function deleteReminder(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No authentication token found");
    return;
  }

  if (confirm("Are you sure you want to delete this reminder?")) {
    fetch(`http://localhost:5000/api/reminders/${id}`, {
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

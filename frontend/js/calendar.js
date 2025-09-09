// frontend/js/calendar.js

/**
 * This file only handles calendar-specific logic
 * All shared logic (auth, sidebar, username, logout) is in main.js
 */

// ✅ Global variables for reminders and date handling
let reminders = JSON.parse(localStorage.getItem("studybloom-reminders")) || [];

// ✅ Define editReminder globally so it can be called from anywhere
function editReminder(reminder) {
  const reminderModal = document.getElementById("reminder-modal");
  const reminderForm = document.getElementById("reminder-form");
  const selectedDateDisplay = document.getElementById("selected-date");

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
  window.selectedDateForModal = selectedDate;
  selectedDateDisplay.textContent = formatDate(selectedDate);

  // Show modal
  reminderModal.classList.add("active");
}

function setupReminderModal() {
  const reminderModal = document.getElementById("reminder-modal");
  const closeModal = reminderModal.querySelector(".close");
  const reminderForm = document.getElementById("reminder-form");
  const selectedDateDisplay = document.getElementById("selected-date");

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

    const date = window.selectedDateForModal;

    if (!title || !date) {
      alert("Title and date are required.");
      return;
    }

    const reminder = {
      id: window.editingReminder
        ? window.editingReminder.id
        : Date.now().toString(),
      title,
      description,
      category,
      date: date.toISOString(),
    };

    if (window.editingReminder) {
      reminders = reminders.map((r) => (r.id === reminder.id ? reminder : r));
    } else {
      reminders.push(reminder);
    }

    localStorage.setItem("studybloom-reminders", JSON.stringify(reminders));
    loadReminders();
    reminderModal.classList.remove("active");

    // Clear globals
    window.editingReminder = null;
    window.selectedDateForModal = null;
  });

  // Initialize openReminderModal
  window.openReminderModal = function (date) {
    if (!date) return;

    const reminderModal = document.getElementById("reminder-modal");
    const reminderForm = document.getElementById("reminder-form");
    const selectedDateDisplay = document.getElementById("selected-date");

    reminderForm.reset();
    window.selectedDateForModal = date;
    window.editingReminder = null;
    selectedDateDisplay.textContent = formatDate(date);
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
      if (confirm(`Are you sure you want to delete "${reminder.title}"?`)) {
        reminders = reminders.filter((r) => r.id !== reminder.id);
        localStorage.setItem("studybloom-reminders", JSON.stringify(reminders));
        loadReminders();
      }
    });

    card.addEventListener("dblclick", () => editReminder(reminder));
    reminderList.appendChild(card);
  });
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

// backend/controllers/reminderController.js
const pool = require('../config/db');

// Get all reminders for the authenticated user
const getReminders = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from JWT token by middleware

    const [reminders] = await pool.execute(
      'SELECT id, title, description, category, DATE_FORMAT(date, \'%Y-%m-%d\') as date FROM reminders WHERE user_id = ? ORDER BY date ASC',
      [userId]
    );

    res.json({
      success: true,
      reminders: reminders
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders'
    });
  }
};

// Create a new reminder
const createReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, category, date } = req.body;

    // Validate required fields
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Title and date are required'
      });
    }

    // Store the date as provided, ensuring it's in the correct format
    let processedDate = date;
    if (date && typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(date)) {
        // If it's in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format, use as is
        processedDate = date.includes(' ') ? date : date + ' 00:00:00';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Expected YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'
        });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO reminders (user_id, title, description, category, date) VALUES (?, ?, ?, ?, ?)',
      [userId, title, description || '', category || '', processedDate]
    );

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      reminderId: result.insertId
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reminder'
    });
  }
};

// Update an existing reminder
const updateReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, category, date } = req.body;

    // Check if reminder belongs to user
    const [existing] = await pool.execute(
      'SELECT id FROM reminders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found or does not belong to user'
      });
    }

    // Process date ensuring it's in the correct format
    let processedDate = date;
    if (date && typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(date)) {
        // If it's in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format, use as is
        processedDate = date.includes(' ') ? date : date + ' 00:00:00';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Expected YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'
        });
      }
    }

    // Update the reminder
    const [result] = await pool.execute(
      'UPDATE reminders SET title = ?, description = ?, category = ?, date = ? WHERE id = ? AND user_id = ?',
      [title, description || '', category || '', processedDate, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      message: 'Reminder updated successfully'
    });
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reminder'
    });
  }
};

// Delete a reminder
const deleteReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM reminders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found or does not belong to user'
      });
    }

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reminder'
    });
  }
};

module.exports = {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder
};
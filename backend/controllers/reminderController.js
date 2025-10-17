// backend/controllers/reminderController.js
const pool = require('../config/db');

// Get all reminders for the authenticated user
const getReminders = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from JWT token by middleware

    const [reminders] = await pool.execute(
      'SELECT id, title, description, category, date FROM reminders WHERE user_id = ? ORDER BY date ASC',
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

    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO reminders (user_id, title, description, category, date) VALUES (?, ?, ?, ?, ?)',
      [userId, title, description || '', category || '', date]
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

    // Update the reminder
    const [result] = await pool.execute(
      'UPDATE reminders SET title = ?, description = ?, category = ?, date = ? WHERE id = ? AND user_id = ?',
      [title, description || '', category || '', date, id, userId]
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
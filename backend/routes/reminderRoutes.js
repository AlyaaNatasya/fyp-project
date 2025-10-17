// backend/routes/reminderRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder
} = require('../controllers/reminderController');

// All routes are protected - require authentication
router.get('/', authenticateToken, getReminders);
router.post('/', authenticateToken, createReminder);
router.put('/:id', authenticateToken, updateReminder);
router.delete('/:id', authenticateToken, deleteReminder);

module.exports = router;
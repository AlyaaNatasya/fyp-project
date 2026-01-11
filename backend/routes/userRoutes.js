const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getUserProfile,
  updateUserProfile,
  sendEmailUpdateOTP,
  updateEmail,
  updatePassword,
  validateProfileUpdate,
  validateEmailUpdate,
  validatePasswordUpdate
} = require('../controllers/userController');

// @route   GET /api/users/profile
// @desc    Get current user's profile
router.get('/profile', authenticateToken, getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update current user's profile (name and theme color)
router.put('/profile', authenticateToken, validateProfileUpdate, updateUserProfile);

// @route   POST /api/users/email/send-otp
// @desc    Send OTP for email update verification
router.post('/email/send-otp', authenticateToken, validateEmailUpdate, sendEmailUpdateOTP);

// @route   PUT /api/users/email
// @desc    Update email with OTP verification
router.put('/email', authenticateToken, updateEmail);

// @route   PUT /api/users/password
// @desc    Update password
router.put('/password', authenticateToken, validatePasswordUpdate, updatePassword);

module.exports = router;
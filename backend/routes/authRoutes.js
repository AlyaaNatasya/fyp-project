// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} = require('../controllers/authController');

// @route   POST /api/auth/signup
// @desc    Register a new user
router.post('/signup', validateSignup, signup);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', validateLogin, login);

// @route   POST /api/auth/forgot-password
// @desc    Send OTP to user's email for password reset
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for password reset
router.post('/verify-otp', verifyOTP);

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;
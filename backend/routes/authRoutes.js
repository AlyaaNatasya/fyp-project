// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login, validateSignup, validateLogin } = require('../controllers/authController');

// @route   POST /api/auth/signup
// @desc    Register a new user
router.post('/signup', validateSignup, signup);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', validateLogin, login);

module.exports = router;
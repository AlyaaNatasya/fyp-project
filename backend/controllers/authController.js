// backend/controllers/authController.js

const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const e = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Validation middleware
const validateSignup = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("A valid email is required"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain a number"),
];

const validateLogin = [
  body("email").isEmail().withMessage("A valid email is required"),

  body("password").notEmpty().withMessage("Password is required"),
];

// SIGNUP
const signup = async (req, res) => {
  console.log("Signup request body:", req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { name, email, password } = req.body;
  console.log("Received signup data:", { name, email });

  try {
    // Check if user already exists
    const [existing] = await pool.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [email]
    );
    console.log("Existing user check:", existing);
    if (existing.length > 0) {
      return res.status(409).json({
        message: "User with this email already exists.",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("Password hashed successfully");

    // Insert new user
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );
    console.log("User inserted, result:", result);

    const userId = result.insertId;
    console.log("New user ID:", userId);

    // Generate JWT token
    let token;
    try {
      console.log("Generating JWT with:", { userId, email, name });
      console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

      token = jwt.sign(
        {
          id: userId,
          email: email,
          name: name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      console.log("JWT generated successfully");
    } catch (jwtError) {
      console.error("JWT generation error:", jwtError);
      throw new Error(`JWT Error: ${jwtError.message}`);
    }
    console.log("JWT token generated");

    // Respond with success
    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: userId,
        name,
        email,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      message: "Server error during signup",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  try {
    // Find user by email
    const [rows] = await pool.execute(
      "SELECT id, name, email, password FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name, // ✅ Include name in token
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Send success response
    res.json({
      message: "Logged in successfully!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      message: "Server error during login",
    });
  }
};

// FORGOT PASSWORD - Generate and send OTP
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const [users] = await pool.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "No account found with this email address."
      });
    }

    const user = users[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store OTP in database
    await pool.execute(
      "INSERT INTO password_resets (user_id, email, otp, expires_at) VALUES (?, ?, ?, ?)",
      [user.id, email, otp, expiresAt]
    );

    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - NotePetal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Password Reset Request</h2>
          <p>Hi,</p>
          <p>We received a request to reset your password for your NotePetal account.</p>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 15 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The NotePetal Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: "OTP sent to your email address successfully."
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      message: "Server error. Please try again later."
    });
  }
};

// VERIFY OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Check if OTP exists and is valid
    const [resetRecords] = await pool.execute(
      "SELECT * FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp]
    );

    if (resetRecords.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired OTP."
      });
    }

    res.json({
      message: "OTP verified successfully."
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({
      message: "Server error. Please try again later."
    });
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Validate password
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long."
      });
    }

    // Check if OTP exists and is valid
    const [resetRecords] = await pool.execute(
      "SELECT * FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp]
    );

    if (resetRecords.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired OTP."
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await pool.execute(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );

    // Delete used OTP
    await pool.execute(
      "DELETE FROM password_resets WHERE email = ? AND otp = ?",
      [email, otp]
    );

    res.json({
      message: "Password reset successfully. You can now login with your new password."
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      message: "Server error. Please try again later."
    });
  }
};

// Validation middleware for password reset
const validateForgotPassword = [
  body("email").isEmail().withMessage("A valid email is required"),
];

const validateResetPassword = [
  body("email").isEmail().withMessage("A valid email is required"),
  body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

module.exports = {
  signup,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
};

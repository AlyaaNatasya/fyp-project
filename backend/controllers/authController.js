// backend/controllers/authController.js

const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const e = require("express");
require("dotenv").config();

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

module.exports = {
  signup,
  login,
  validateSignup,
  validateLogin,
};

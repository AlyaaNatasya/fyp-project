const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Validation middleware for profile update
const validateProfileUpdate = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("theme_color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Invalid color format. Use hex color (e.g., #c1946e)"),

  body("background_color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Invalid color format. Use hex color (e.g., #fee3c3)"),
];

// Validation middleware for email update
const validateEmailUpdate = [
  body("current_email")
    .isEmail()
    .normalizeEmail()
    .withMessage("A valid current email is required"),

  body("new_email")
    .isEmail()
    .normalizeEmail()
    .withMessage("A valid new email is required"),
];

// Validation middleware for password update
const validatePasswordUpdate = [
  body("current_password")
    .notEmpty()
    .withMessage("Current password is required"),

  body("new_password")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[a-z]/)
    .withMessage("New password must contain a lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("New password must contain an uppercase letter")
    .matches(/[0-9]/)
    .withMessage("New password must contain a number"),
];

// GET user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT 
        id,
        name,
        email,
        theme_color,
        background_color,
        created_at
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: users[0],
    });
  } catch (err) {
    console.error("Get user profile error:", err);
    res.status(500).json({
      message: "Server error while fetching user profile",
    });
  }
};

// PUT update user profile (name, theme color, and background color)
const updateUserProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const userId = req.user.id;
    const { name, theme_color, background_color } = req.body;

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }

    if (theme_color !== undefined) {
      updateFields.push("theme_color = ?");
      updateValues.push(theme_color);
    }

    if (background_color !== undefined) {
      updateFields.push("background_color = ?");
      updateValues.push(background_color);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        message: "No fields to update",
      });
    }

    updateValues.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(", ")} 
      WHERE id = ?
    `;

    await pool.execute(updateQuery, updateValues);

    // Fetch updated user profile
    const [updatedUsers] = await pool.execute(
      `SELECT 
        id,
        name,
        email,
        theme_color,
        background_color,
        created_at
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUsers[0],
    });
  } catch (err) {
    console.error("Update user profile error:", err);
    res.status(500).json({
      message: "Server error while updating user profile",
    });
  }
};

// POST send OTP for email update
const sendEmailUpdateOTP = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const userId = req.user.id;
    const { current_email, new_email } = req.body;

    // Verify current email matches user's email
    const [users] = await pool.execute(
      "SELECT id, email FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = users[0];

    if (user.email !== current_email) {
      return res.status(400).json({
        message: "Current email does not match your account email",
      });
    }

    // Check if new email is already taken
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [new_email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "New email is already taken by another user",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store OTP in database
    await pool.execute(
      "INSERT INTO email_updates (user_id, current_email, new_email, otp, expires_at) VALUES (?, ?, ?, ?, ?)",
      [user.id, current_email, new_email, otp, expiresAt]
    );

    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: current_email,
      subject: 'Email Update Verification - StudyBloom',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c1946e;">Email Update Request</h2>
          <p>Hi,</p>
          <p>We received a request to update your email address from <strong>${current_email}</strong> to <strong>${new_email}</strong>.</p>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 15 minutes.</p>
          <p>If you didn't request this email update, please ignore this email.</p>
          <p>Best regards,<br>The StudyBloom Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: "OTP sent to your current email address successfully.",
    });
  } catch (err) {
    console.error("Send email update OTP error:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

// PUT update email with OTP verification
const updateEmail = async (req, res) => {
  const { current_email, new_email, otp } = req.body;

  try {
    const userId = req.user.id;

    // Check if OTP exists and is valid
    const [updateRecords] = await pool.execute(
      "SELECT * FROM email_updates WHERE user_id = ? AND current_email = ? AND new_email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [userId, current_email, new_email, otp]
    );

    if (updateRecords.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired OTP.",
      });
    }

    // Update user email
    await pool.execute(
      "UPDATE users SET email = ? WHERE id = ?",
      [new_email, userId]
    );

    // Delete used OTP
    await pool.execute(
      "DELETE FROM email_updates WHERE user_id = ? AND current_email = ? AND new_email = ? AND otp = ?",
      [userId, current_email, new_email, otp]
    );

    res.json({
      message: "Email updated successfully. Please log in again with your new email.",
    });
  } catch (err) {
    console.error("Update email error:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

// PUT update password
const updatePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Get user with current password
    const [users] = await pool.execute(
      "SELECT id, password FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update user password
    await pool.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );

    res.json({
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  sendEmailUpdateOTP,
  updateEmail,
  updatePassword,
  validateProfileUpdate,
  validateEmailUpdate,
  validatePasswordUpdate,
};
// backend/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Middleware to authenticate JWT token
 * Adds `req.user` if token is valid
 * Sends 401 or 403 if invalid
 */
const authenticateToken = (req, res, next) => {
  // Get token from Authorization header: "Bearer <token>"
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1]; // Remove 'Bearer' prefix

  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user data to request object
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({
        message: "Token expired. Please log in again.",
      });
    }
    return res.status(403).json({
      message: "Invalid token.",
    });
  }
};

module.exports = { authenticateToken };

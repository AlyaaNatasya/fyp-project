// backend/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: "http://127.0.0.1:5500", //frontend url
    credentials: true,
  })
);
app.use(morgan("dev")); // Logging
app.use(express.json({ limit: "10mb" })); // Parse JSON

// Routes
app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => {
  res.send(`
    <h1>StudyBloom Backend</h1>
    <p>✅ Server is running!</p>
    <p>Use <code>/api/auth/signup</code> and <code>/api/auth/login</code></p>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

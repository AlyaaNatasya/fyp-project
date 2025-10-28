// backend/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration that allows multiple origins including different localhost ports
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow requests from localhost on various ports during development
    if (
      origin === "http://localhost:5500" ||
      origin === "http://127.0.0.1:5500" ||
      origin === "http://localhost:3000" ||
      origin === "http://localhost:3001" ||
      origin === "http://localhost:8080" ||
      origin === "http://localhost:8000" ||
      origin === "http://127.0.0.1:3000" ||
      origin.startsWith("http://localhost:")
    ) {
      return callback(null, true);
    }

    // For production, you would check against your production frontend URL
    if (
      process.env.NODE_ENV === "production" &&
      origin === process.env.FRONTEND_URL
    ) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// Security headers - with a specific configuration for Cross-Origin-Resource-Policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions)); // Enable CORS with options
app.use(morgan("dev")); // Logging
app.use(express.json({ limit: "10mb" })); // Parse JSON

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/ai", aiRoutes);

// Test route
app.get("/", (req, res) => {
  res.send(`
    <h1>StudyBloom Backend</h1>
    <p>✅ Server is running!</p>
    <p>Available endpoints:</p>
    <ul>
      <li><code>/api/auth/signup</code> - Register new user</li>
      <li><code>/api/auth/login</code> - Authenticate user</li>
      <li><code>/api/reminders</code> - Manage reminders</li>
      <li><code>/api/ai/summarize</code> - Generate summary from file</li>
    </ul>
  `);
});

// Start server with increased timeout (5 minutes) to handle long AI processing
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Set timeout to 5 minutes (300000 ms) to handle long AI processing
server.timeout = 300000;

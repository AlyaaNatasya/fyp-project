// backend/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path"); // Added this line
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const aiRoutes = require("./routes/aiRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const userRoutes = require("./routes/userRoutes");
const mindmapRoutes = require("./routes/mindmapRoutes");
const { startReminderScheduler } = require("./schedulers/reminderScheduler");

const app = express();
const PORT = process.env.PORT || 5001;

// Simple CORS configuration as both backend and frontend are served from the same origin
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (
      origin === `http://127.0.0.1:${PORT}` ||
      origin === `http://localhost:${PORT}`
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
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Security headers - with a specific configuration for Cross-Origin-Resource-Policy and Content Security Policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://d3js.org",
          "https://cdn.jsdelivr.net",
        ],
        workerSrc: ["'self'", "blob:"], // Allow web workers from same origin and blob URLs for PDF.js
        connectSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ], // Allow connections to CDNs for source maps
        imgSrc: ["'self'", "data:", "blob:", "https://cdnjs.cloudflare.com"], // Allow images from same origin, data URLs, blob URLs, and cdnjs
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ], // Allow inline styles, cdnjs, and Google Fonts
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
        ], // Allow fonts from same origin, cdnjs, and Google Fonts
      },
    },
  }),
);
app.use(cors(corsOptions)); // Enable CORS with options
app.use(morgan("dev")); // Logging
app.use(express.json({ limit: "10mb" })); // Parse JSON

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/users", userRoutes);
app.use("/api", mindmapRoutes);

// Serve static files from the 'frontend' directory
// This should come after API routes but before any catch-all routes
app.use(express.static(path.join(__dirname, "../frontend")));

// Test route - Keep for direct access to check server status
app.get("/api", (req, res) => {
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

// Increase server timeout values to handle long-running AI processing
app.set("trust proxy", true); // Trust proxy if behind nginx/load balancer

// Start server with increased timeout (5 minutes) to handle long AI processing
// Use 127.0.0.1 for production (behind Nginx), 0.0.0.0 for direct access
const HOST = process.env.HOST || "127.0.0.1";
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log("Open your frontend at http://${HOST}:${PORT}/pages/home.html");

  // Start the reminder scheduler
  startReminderScheduler();
});

// Set timeout values to handle long-running requests
server.setTimeout(300000); // 5 minutes for request processing
server.keepAliveTimeout = 310000; // Slightly longer than request timeout
server.headersTimeout = 320000; // Slightly longer than keep-alive timeout

// Handle server errors gracefully
server.on("error", (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof PORT === "string" ? "Pipe " + PORT : "Port " + PORT;

  // Handle specific listen errors
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

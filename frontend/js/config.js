// frontend/js/config.js
// Centralized configuration for frontend

const CONFIG = {
  // Backend API URL - Use relative path for production, or absolute URL for development
  // In production, frontend and backend are served from the same domain
  BACKEND_URL: window.location.origin || "http://127.0.0.1:5001",

  // Alternative: Uncomment this for local development
  // BACKEND_URL: "http://127.0.0.1:5001",
  
  // Timeout settings (in milliseconds)
  REQUEST_TIMEOUT: 300000, // 5 minutes for AI processing
  POLLING_INTERVAL: 2000,  // 2 seconds for checking summary status
  
  // Supported file types for upload
  SUPPORTED_FILE_TYPES: ['.pdf', '.docx', '.txt'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
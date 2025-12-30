// frontend/js/config.js
// Centralized configuration for frontend

const CONFIG = {
  // Backend API URL - Using IP address for consistent resolution
  BACKEND_URL: "http://127.0.0.1:5000",

  // Alternative: You can use this if you prefer localhost
  // BACKEND_URL: "http://localhost:5000",
  
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
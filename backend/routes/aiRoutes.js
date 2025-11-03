// backend/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload, generateSummaryFromUpload, getSummaryById, getUserSummaries, getOriginalFile, saveSummaryToCollection } = require('../controllers/aiController');

// Route to generate summary from uploaded file
// POST /api/ai/summarize
router.post('/summarize', authenticateToken, upload.single('file'), generateSummaryFromUpload);

// Route to get summary by ID
// GET /api/ai/summaries/:id
router.get('/summaries/:id', authenticateToken, getSummaryById);

// Route to get all summaries for a user
// GET /api/ai/summaries
router.get('/summaries', authenticateToken, getUserSummaries);

// Route to get original uploaded file by summary ID
// GET /api/ai/summaries/:id/file
router.get('/summaries/:id/file', authenticateToken, getOriginalFile);

// Route to save a summary to a collection
// POST /api/ai/summaries/:id/save-to-collection
router.post('/summaries/:id/save-to-collection', authenticateToken, saveSummaryToCollection);

module.exports = router;
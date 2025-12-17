// backend/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload, generateSummaryFromUpload, getSummaryById, getUserSummaries, getOriginalFile, saveSummaryToCollection, generateMindMapFromText, generateFlashcardsFromText, generateQuizFromText } = require('../controllers/aiController');

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

// Route to generate mind map from text
// POST /api/ai/mindmap
router.post('/mindmap', authenticateToken, generateMindMapFromText);

// Route to generate flashcards from text
// POST /api/ai/flashcards
router.post('/flashcards', authenticateToken, generateFlashcardsFromText);

// Route to generate quiz from text
// POST /api/ai/quiz
router.post('/quiz', authenticateToken, generateQuizFromText);

module.exports = router;
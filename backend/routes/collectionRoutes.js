// backend/routes/collectionRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
  createCollection,
  getUserCollections,
  getCollectionById,
  addSummaryToCollection,
  removeSummaryFromCollection,
  getCollectionSummaries,
  deleteCollection
} = require('../controllers/collectionController');

// Route to create a new collection
// POST /api/collections
router.post('/', authenticateToken, createCollection);

// Route to get all collections for the logged-in user
// GET /api/collections
router.get('/', authenticateToken, getUserCollections);

// Route to get a specific collection by ID
// GET /api/collections/:id
router.get('/:id', authenticateToken, getCollectionById);

// Route to get all summaries in a specific collection
// GET /api/collections/:id/summaries
router.get('/:id/summaries', authenticateToken, getCollectionSummaries);

// Route to add a summary to a collection
// POST /api/collections/add-summary
router.post('/add-summary', authenticateToken, addSummaryToCollection);

// Route to remove a summary from a collection
// DELETE /api/collections/:collectionId/summaries/:summaryId
router.delete('/:collectionId/summaries/:summaryId', authenticateToken, removeSummaryFromCollection);

// Route to delete a collection
// DELETE /api/collections/:id
router.delete('/:id', authenticateToken, deleteCollection);

module.exports = router;
const express = require("express");
const router = express.Router();
const mindmapController = require("../controllers/mindmapController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Save mind map
router.post(
  "/mindmaps",
  authenticateToken,
  mindmapController.validateSaveMindMap,
  mindmapController.saveMindMap
);

// Get all mind maps for logged-in user
router.get("/mindmaps", authenticateToken, mindmapController.getUserMindMaps);

// Get mind map by ID
router.get("/mindmaps/:id", authenticateToken, mindmapController.getMindMapById);

// Update mind map
router.put(
  "/mindmaps/:id",
  authenticateToken,
  mindmapController.validateSaveMindMap,
  mindmapController.updateMindMap
);

// Delete mind map
router.delete("/mindmaps/:id", authenticateToken, mindmapController.deleteMindMap);

module.exports = router;
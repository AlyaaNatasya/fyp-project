const pool = require("../config/db");
const { body, validationResult } = require("express-validator");

// Validation middleware for saving mind map
const validateSaveMindMap = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Title must be between 2 and 255 characters"),

  body("mindmap_data")
    .notEmpty()
    .withMessage("Mind map data is required"),
];

// Save mind map to database
const saveMindMap = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const userId = req.user.id;
    const { title, mindmap_data, summary_id } = req.body;

    // Insert mind map into database
    const [result] = await pool.execute(
      "INSERT INTO mindmaps (user_id, summary_id, title, mindmap_data) VALUES (?, ?, ?, ?)",
      [userId, summary_id || null, title, JSON.stringify(mindmap_data)]
    );

    const mindmapId = result.insertId;

    res.status(201).json({
      success: true,
      message: "Mind map saved successfully",
      mindmap_id: mindmapId,
    });
  } catch (err) {
    console.error("Save mind map error:", err);
    res.status(500).json({
      message: "Server error while saving mind map",
    });
  }
};

// Get all mind maps for the logged-in user
const getUserMindMaps = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT id, title, summary_id, created_at, updated_at 
       FROM mindmaps 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      mindmaps: rows,
    });
  } catch (err) {
    console.error("Get user mind maps error:", err);
    res.status(500).json({
      message: "Server error while fetching mind maps",
    });
  }
};

// Get mind map by ID
const getMindMapById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT id, title, summary_id, mindmap_data, created_at, updated_at 
       FROM mindmaps 
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Mind map not found",
      });
    }

    const mindmap = rows[0];

    let parsedData;
    if (typeof mindmap.mindmap_data === 'string') {
      try {
        parsedData = JSON.parse(mindmap.mindmap_data);
      } catch (e) {
        console.error("Error parsing mindmap JSON:", e);
        parsedData = {}; // Fallback
      }
    } else {
      parsedData = mindmap.mindmap_data;
    }

    res.status(200).json({
      success: true,
      mindmap: {
        id: mindmap.id,
        title: mindmap.title,
        summary_id: mindmap.summary_id,
        mindmap_data: parsedData,
        created_at: mindmap.created_at,
        updated_at: mindmap.updated_at,
      },
    });
  } catch (err) {
    console.error("Get mind map by ID error:", err);
    res.status(500).json({
      message: "Server error while fetching mind map",
    });
  }
};

// Delete mind map
const deleteMindMap = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(
      "DELETE FROM mindmaps WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Mind map not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Mind map deleted successfully",
    });
  } catch (err) {
    console.error("Delete mind map error:", err);
    res.status(500).json({
      message: "Server error while deleting mind map",
    });
  }
};

// Update mind map
const updateMindMap = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, mindmap_data } = req.body;

    // Check if mind map exists and belongs to user
    const [existingMindMaps] = await pool.execute(
      "SELECT id FROM mindmaps WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existingMindMaps.length === 0) {
      return res.status(404).json({
        message: "Mind map not found",
      });
    }

    // Update mind map
    await pool.execute(
      "UPDATE mindmaps SET title = ?, mindmap_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [title, JSON.stringify(mindmap_data), id, userId]
    );

    res.status(200).json({
      success: true,
      message: "Mind map updated successfully",
    });
  } catch (err) {
    console.error("Update mind map error:", err);
    res.status(500).json({
      message: "Server error while updating mind map",
    });
  }
};

module.exports = {
  saveMindMap,
  getUserMindMaps,
  getMindMapById,
  deleteMindMap,
  updateMindMap,
  validateSaveMindMap,
};
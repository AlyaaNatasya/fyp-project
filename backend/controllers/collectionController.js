// backend/controllers/collectionController.js
const pool = require("../config/db");

// Create a new collection
const createCollection = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({
        message: "Collection name is required",
      });
    }

    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      "INSERT INTO collections (user_id, name, description) VALUES (?, ?, ?)",
      [userId, name, description || null]
    );
    
    connection.release();

    res.status(201).json({
      id: result.insertId,
      message: "Collection created successfully",
    });
  } catch (error) {
    console.error("Error creating collection:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Get all collections for a user
const getUserCollections = async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await pool.getConnection();
    
    const [rows] = await connection.execute(
      "SELECT id, name, description, created_at FROM collections WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    
    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching user collections:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Get a specific collection with its items
const getCollectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    
    // First, check if the collection belongs to the user
    const [collectionRows] = await connection.execute(
      "SELECT id, name, description, created_at FROM collections WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (collectionRows.length === 0) {
      connection.release();
      return res.status(404).json({
        message: "Collection not found",
      });
    }

    const collection = collectionRows[0];

    // Get the summaries in this collection
    const [itemRows] = await connection.execute(
      `SELECT ci.id as item_id, s.id as summary_id, s.original_filename, s.summary_text, s.created_at
       FROM collection_items ci
       JOIN summaries s ON ci.summary_id = s.id
       WHERE ci.collection_id = ?`,
      [id]
    );

    connection.release();

    res.status(200).json({
      ...collection,
      items: itemRows,
    });
  } catch (error) {
    console.error("Error fetching collection:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Add a summary to a collection
const addSummaryToCollection = async (req, res) => {
  try {
    const { collectionId, summaryId } = req.body;
    const userId = req.user.id;

    if (!collectionId || !summaryId) {
      return res.status(400).json({
        message: "Collection ID and Summary ID are required",
      });
    }

    const connection = await pool.getConnection();
    
    // Verify that both the collection and summary belong to the user
    const [collectionCheck] = await connection.execute(
      "SELECT id FROM collections WHERE id = ? AND user_id = ?",
      [collectionId, userId]
    );

    if (collectionCheck.length === 0) {
      connection.release();
      return res.status(404).json({
        message: "Collection not found or does not belong to user",
      });
    }

    const [summaryCheck] = await connection.execute(
      "SELECT id FROM summaries WHERE id = ? AND user_id = ?",
      [summaryId, userId]
    );

    if (summaryCheck.length === 0) {
      connection.release();
      return res.status(404).json({
        message: "Summary not found or does not belong to user",
      });
    }

    // Add the summary to the collection
    await connection.execute(
      "INSERT IGNORE INTO collection_items (collection_id, summary_id) VALUES (?, ?)",
      [collectionId, summaryId]
    );
    
    connection.release();

    res.status(200).json({
      message: "Summary added to collection successfully",
    });
  } catch (error) {
    console.error("Error adding summary to collection:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Remove a summary from a collection
const removeSummaryFromCollection = async (req, res) => {
  try {
    const { collectionId, summaryId } = req.params;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    
    // Verify that both the collection and summary belong to the user
    const [collectionCheck] = await connection.execute(
      "SELECT id FROM collections WHERE id = ? AND user_id = ?",
      [collectionId, userId]
    );

    if (collectionCheck.length === 0) {
      connection.release();
      return res.status(404).json({
        message: "Collection not found or does not belong to user",
      });
    }

    // Remove the summary from the collection
    const [result] = await connection.execute(
      "DELETE FROM collection_items WHERE collection_id = ? AND summary_id = ?",
      [collectionId, summaryId]
    );
    
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Summary not found in collection",
      });
    }

    res.status(200).json({
      message: "Summary removed from collection successfully",
    });
  } catch (error) {
    console.error("Error removing summary from collection:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Get all summaries in a specific collection
const getCollectionSummaries = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    
    // Verify that the collection belongs to the user
    const [collectionCheck] = await connection.execute(
      "SELECT id FROM collections WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (collectionCheck.length === 0) {
      connection.release();
      return res.status(404).json({
        message: "Collection not found or does not belong to user",
      });
    }

    // Get the summaries in this collection
    const [rows] = await connection.execute(
      `SELECT s.id, s.original_filename, s.summary_text, s.created_at
       FROM collection_items ci
       JOIN summaries s ON ci.summary_id = s.id
       WHERE ci.collection_id = ?
       ORDER BY ci.created_at DESC`,
      [id]
    );

    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching collection summaries:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Delete a collection
const deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    
    // Delete the collection items first (due to foreign key constraints)
    await connection.execute(
      "DELETE FROM collection_items WHERE collection_id = ?",
      [id]
    );

    // Then delete the collection
    const [result] = await connection.execute(
      "DELETE FROM collections WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Collection not found or does not belong to user",
      });
    }

    res.status(200).json({
      message: "Collection deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting collection:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createCollection,
  getUserCollections,
  getCollectionById,
  addSummaryToCollection,
  removeSummaryFromCollection,
  getCollectionSummaries,
  deleteCollection,
};
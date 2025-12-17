// backend/controllers/aiController.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const pool = require("../config/db");

const { generateSummary, generateMindMap, generateFlashcards, generateQuiz } = require("../services/aiService");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create a separate directory for preserved files that will be available for download
const preservedFilesDir = path.join(__dirname, "../preserved_files");
if (!fs.existsSync(preservedFilesDir)) {
  fs.mkdirSync(preservedFilesDir, { recursive: true });
}

// Configure multer to store files on disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename to avoid conflicts
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter to only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|docx|txt/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Error: Invalid file type. Only PDF, DOCX, and TXT files are allowed!"
      )
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Extract text from PDF file
async function extractTextFromPDF(filePath) {
  try {
    // Read the file from disk as a buffer
    const fileBuffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Error parsing PDF: ${error.message}`);
  }
}

// Extract text from DOCX file
async function extractTextFromDOCX(filePath) {
  try {
    // Read the file from disk as a buffer
    const fileBuffer = await fs.promises.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    throw new Error(`Error parsing DOCX: ${error.message}`);
  }
}

// Extract text from TXT file
async function extractTextFromTXT(filePath) {
  try {
    // Read the file from disk as a buffer
    const fileBuffer = await fs.promises.readFile(filePath);
    return fileBuffer.toString("utf8");
  } catch (error) {
    throw new Error(`Error reading TXT file: ${error.message}`);
  }
}

// Generate summary from uploaded file
const generateSummaryFromUpload = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded. Please upload a PDF, DOCX, or TXT file.",
      });
    }

    // 1. Create 'processing' record in DB
    const userId = req.user.id;
    const connection = await pool.getConnection();
    // Initially store the temporary file path, will be updated after processing if we preserve the file
    const [result] = await connection.execute(
      "INSERT INTO summaries (user_id, original_filename, status, file_path) VALUES (?, ?, ?, ?)",
      [userId, req.file.originalname, "processing", req.file.path]
    );
    const summaryId = result.insertId;
    connection.release(); // Release connection

    // 2. Respond IMMEDIATELY to the client with 202 Accepted
    // Log before sending response for debugging
    console.log(
      `Sending response for summary ${summaryId}, processing to continue in background.`
    );

    // Store the file path and name locally to avoid req context issues in async processing
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    res.status(202).json({
      message: "File accepted for processing.",
      summaryId: summaryId,
      fileName: fileName,
    });

    // Use a longer timeout to ensure HTTP response is fully flushed before background processing
    // This prevents interference between the response and background AI processing
    setTimeout(async () => {
      let processingConnection;
      try {
        processingConnection = await pool.getConnection();

        // 3a. Extract Text (Same as your original code)
        const fileExtension = path.extname(fileName).toLowerCase();
        let extractedText = "";
        switch (fileExtension) {
          case ".pdf":
            extractedText = await extractTextFromPDF(filePath);
            break;
          case ".docx":
            extractedText = await extractTextFromDOCX(filePath);
            break;
          case ".txt":
            extractedText = await extractTextFromTXT(filePath);
            break;
          default:
            throw new Error(`Unsupported file type: ${fileExtension}`);
        }

        // 3b. Validate and Truncate Text (Same as your original code)
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error(
            "The uploaded file is empty or could not be processed."
          );
        }
        // ... (Your text truncation logic) ...
        const maxLength = 8000; // Increased from 2000 to 8000 to allow more of the document to be processed
        if (extractedText.length > maxLength) {
          let truncatedText = extractedText.substring(0, maxLength);
          const sentenceEndings = [
            truncatedText.lastIndexOf("."),
            truncatedText.lastIndexOf("!"),
            truncatedText.lastIndexOf("?"),
          ];
          const lastEnding = Math.max(...sentenceEndings);
          if (lastEnding > maxLength * 0.7) {
            truncatedText = truncatedText.substring(0, lastEnding + 1);
          }
          extractedText = truncatedText;
        }

        // 3c. Call AI Service
        let summary = await generateSummary(extractedText);

        // 3d. Sanitize Summary (Same as your original code)
        if (typeof summary !== "string") summary = String(summary);
        summary = summary.replace(/\u0000/g, "");
        summary = summary.replace(/[\u0001-\u001F\u007F-\u009F]/g, "");

        // 3e. Move the original file to preserved directory and update the record in DB with 'completed'
        const contentPreview = extractedText.substring(0, 1000);

        // Move the uploaded file to the preserved directory
        const originalFileName = path.basename(filePath);
        const preservedFilePath = path.join(
          preservedFilesDir,
          originalFileName
        );

        // Check if the file still exists before moving it
        if (fs.existsSync(filePath)) {
          // Since we're using multer's disk storage, the file is already on disk
          // We can move it to the preserved directory for long-term storage
          fs.renameSync(filePath, preservedFilePath);

          // Update the record in the database with the new path
          await processingConnection.execute(
            "UPDATE summaries SET summary_text = ?, original_content_preview = ?, file_path = ?, status = ? WHERE id = ?",
            [summary, contentPreview, preservedFilePath, "completed", summaryId]
          );
          console.log(`Summary ${summaryId} completed and saved.`);
        } else {
          // File was already moved or deleted, update DB without moving file
          // The file path in DB remains the original path since we can't move what doesn't exist
          await processingConnection.execute(
            "UPDATE summaries SET summary_text = ?, original_content_preview = ?, status = ? WHERE id = ?",
            [summary, contentPreview, "completed", summaryId]
          );
          console.log(
            `Summary ${summaryId} completed (file already processed or moved).`
          );
        }
      } catch (processingError) {
        console.error(
          `Error processing summary ${summaryId}:`,
          processingError.message
        );
        // 3f. Update the record in DB with 'failed'
        if (processingConnection) {
          await processingConnection.execute(
            "UPDATE summaries SET status = ?, summary_text = ? WHERE id = ?",
            ["failed", processingError.message, summaryId]
          );
        }

        // Clean up the temporary uploaded file if processing failed
        try {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete the uploaded file
            console.log(`Cleaned up failed upload file: ${filePath}`);
          }
        } catch (cleanupError) {
          console.error(
            "Error cleaning up failed upload file:",
            cleanupError.message
          );
        }
      } finally {
        if (processingConnection) {
          processingConnection.release();
        }
      }
    }, 500); // 500ms delay to ensure response is properly flushed and prevent HTTP interference

    console.log(
      `Summary ${summaryId} record created with status 'processing'.`
    );
  } catch (error) {
    console.error("Full error object:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    console.error("Error in generateSummaryFromUpload:", error);

    // Only send error response if the response hasn't been sent yet
    // (i.e., if we failed during the initial checks before creating the processing record)
    if (!res.headersSent) {
      if (
        error.message &&
        error.message.includes("AI server is not responding")
      ) {
        console.log("Sending 503 error to client");
        res.status(503).json({
          message: error.message,
        });
      } else {
        console.log("Sending 500 error to client");
        res.status(500).json({
          message:
            error.message || "Internal server error during summary initiation",
        });
      }
    }
  }
};

// Get summary by ID
const getSummaryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const connection = await pool.getConnection();

    // Get the summary AND status
    const [rows] = await connection.execute(
      "SELECT id, original_filename, original_content_preview, summary_text, created_at, status FROM summaries WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Summary not found",
      });
    }

    const summary = rows[0];

    // --- Return response based on status ---
    if (summary.status === "processing") {
      // 200 OK, but still processing
      res.status(200).json({
        id: summary.id,
        status: "processing",
        original_filename: summary.original_filename, // Send filename so UI can display it
        message: "Summary is still being generated.",
      });
    } else if (summary.status === "failed") {
      // 500 Server Error, processing failed
      res.status(500).json({
        id: summary.id,
        status: "failed",
        original_filename: summary.original_filename,
        message: "Failed to generate summary.",
        error: summary.summary_text, // We stored the error message in summary_text
      });
    } else {
      // 200 OK, 'completed'
      res.status(200).json({
        id: summary.id,
        status: "completed",
        original_filename: summary.original_filename,
        original_content_preview: summary.original_content_preview,
        summary_text: summary.summary_text,
        created_at: summary.created_at,
      });
    }
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Get all summaries for the logged-in user
const getUserSummaries = async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      "SELECT id, original_filename, created_at FROM summaries WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching user summaries:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Get original uploaded file by summary ID
const getOriginalFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const connection = await pool.getConnection();

    // Get the summary record to retrieve file path
    const [rows] = await connection.execute(
      "SELECT file_path, original_filename FROM summaries WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    connection.release();

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Summary not found or file not accessible" });
    }

    const summary = rows[0];

    if (!summary.file_path) {
      return res.status(404).json({ message: "Original file path not found" });
    }

    // Check if file exists
    if (!fs.existsSync(summary.file_path)) {
      return res
        .status(404)
        .json({ message: "Original file not found on disk" });
    }

    // Read and send the file
    const fileBuffer = fs.readFileSync(summary.file_path);

    // Set appropriate content type based on file extension
    const fileExtension = path.extname(summary.original_filename).toLowerCase();
    let contentType = "application/octet-stream"; // Default

    switch (fileExtension) {
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".docx":
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case ".txt":
        contentType = "text/plain";
        break;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${summary.original_filename}"`
    );
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error fetching original file:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Save a summary to a collection
const saveSummaryToCollection = async (req, res) => {
  try {
    const { summaryId, collectionId } = req.body;
    const userId = req.user.id;

    if (!summaryId || !collectionId) {
      return res.status(400).json({
        message: "Summary ID and Collection ID are required",
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
      message: "Summary saved to collection successfully",
    });
  } catch (error) {
    console.error("Error saving summary to collection:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Generate mind map from summary text
const generateMindMapFromText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text content is required",
      });
    }

    // Limit text length to prevent API issues
    const maxLength = 8000;
    let processedText = text;
    if (processedText.length > maxLength) {
      let truncatedText = processedText.substring(0, maxLength);
      const sentenceEndings = [
        truncatedText.lastIndexOf("."),
        truncatedText.lastIndexOf("!"),
        truncatedText.lastIndexOf("?"),
      ];
      const lastEnding = Math.max(...sentenceEndings);
      if (lastEnding > maxLength * 0.7) {
        truncatedText = truncatedText.substring(0, lastEnding + 1);
      }
      processedText = truncatedText;
    }

    // Generate the mind map using the AI service
    const mindMap = await generateMindMap(processedText);

    res.status(200).json({
      success: true,
      mindMap: mindMap,
    });
  } catch (error) {
    console.error("Error generating mind map:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate mind map",
    });
  }
};

// Generate flashcards from summary text
const generateFlashcardsFromText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text content is required",
      });
    }

    // Limit text length to prevent API issues
    const maxLength = 8000;
    let processedText = text;
    if (processedText.length > maxLength) {
      let truncatedText = processedText.substring(0, maxLength);
      const sentenceEndings = [
        truncatedText.lastIndexOf("."),
        truncatedText.lastIndexOf("!"),
        truncatedText.lastIndexOf("?"),
      ];
      const lastEnding = Math.max(...sentenceEndings);
      if (lastEnding > maxLength * 0.7) {
        truncatedText = truncatedText.substring(0, lastEnding + 1);
      }
      processedText = truncatedText;
    }

    // Generate the flashcards using the AI service
    const flashcardsData = await generateFlashcards(processedText);

    res.status(200).json({
      success: true,
      flashcards: flashcardsData.flashcards,
    });
  } catch (error) {
    console.error("Error generating flashcards:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate flashcards",
    });
  }
};

// Generate quiz from summary text
const generateQuizFromText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text content is required",
      });
    }

    // Limit text length to prevent API issues
    const maxLength = 8000;
    let processedText = text;
    if (processedText.length > maxLength) {
      let truncatedText = processedText.substring(0, maxLength);
      const sentenceEndings = [
        truncatedText.lastIndexOf("."),
        truncatedText.lastIndexOf("!"),
        truncatedText.lastIndexOf("?"),
      ];
      const lastEnding = Math.max(...sentenceEndings);
      if (lastEnding > maxLength * 0.7) {
        truncatedText = truncatedText.substring(0, lastEnding + 1);
      }
      processedText = truncatedText;
    }

    // Generate the quiz using the AI service
    const quizData = await generateQuiz(processedText);

    res.status(200).json({
      success: true,
      quiz: quizData.quiz,
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate quiz",
    });
  }
};

module.exports = {
  generateSummaryFromUpload,
  getSummaryById,
  getUserSummaries,
  getOriginalFile,
  saveSummaryToCollection,
  generateMindMapFromText,
  generateFlashcardsFromText,
  generateQuizFromText,
  upload,
};

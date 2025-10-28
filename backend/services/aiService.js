// backend/services/aiService.js
const axios = require('axios');

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5000';

/**
 * Send text to the AI server for summarization
 * @param {string} text - The text to summarize
 * @returns {Promise<string>} - The generated summary
 */
async function generateSummary(text) {
  try {
    console.log('Sending request to AI server:', `${AI_SERVER_URL}/summarize`);
    console.log('Text length being sent:', text.length);
    
    // Clean the text to remove problematic characters before sending
    // let cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
    
    // Additional sanitization to remove any problematic Unicode characters
    // cleanText = cleanText.replace(/[\u{0080}-\u{FFFF}]/gu, (match) => {
    //   if (match.charCodeAt(0) < 0x10000) return ' ';
    //   return match; // For valid Unicode characters that don't cause issues
    // });
    
    // Final check to ensure text is not empty after cleaning
    // if (!cleanText.trim()) {
    //   throw new Error('The processed text is empty after sanitization. Please try a different file.');
    // }
    
    // Clean the text to remove problematic characters before sending
    let cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
    
    // Additional sanitization to remove any problematic Unicode characters
    cleanText = cleanText.replace(/[\u{0080}-\u{FFFF}]/gu, (match) => {
      if (match.charCodeAt(0) < 0x10000) return ' ';
      return match; // For valid Unicode characters that don't cause issues
    });
    
    // Final check to ensure text is not empty after cleaning
    if (!cleanText.trim()) {
      throw new Error('The processed text is empty after sanitization. Please try a different file.');
    }
    
    const response = await axios.post(`${AI_SERVER_URL}/summarize`, {
      text: cleanText,
      instruction: "Generate a concise and informative summary of the academic content. Focus on key concepts, main points, and important details. Structure the summary with bullet points or clear paragraphs." // Add specific instruction
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000, // Increased timeout to 300 seconds (5 minutes) for AI processing
      // Add connection timeout as well
      httpAgent: require('http').Agent({ timeout: 300000 }),
      httpsAgent: require('https').Agent({ timeout: 300000 })
    });

    console.log('Received response from AI server:', response.status);
    
    // Ensure the summary is a string and properly formatted
    let summary = response.data.summary;
    if (typeof summary !== 'string') {
      summary = String(summary || '');
    }
    
    // Clean up the summary text to remove problematic characters
    summary = summary.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
    
    return summary;
  } catch (error) {
    console.error('Error communicating with AI server:', error.message);
    
    if (error.response) {
      // Server responded with error status
      console.error('AI server error response:', error.response.data);
      
      // Handle specific error from the AI model
      if (error.response.data.error && error.response.data.error.includes('index out of range')) {
        throw new Error('The provided text contains formatting that the AI model cannot process. Please try a different file or simpler text format.');
      }
      
      throw new Error(`AI server error: ${error.response.status} - ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from AI server:', error.request);
      throw new Error('AI server is not responding. Please make sure the Python AI server is running on port 5000.');
    } else {
      // Something else happened
      console.error('General error:', error.message);
      throw new Error(`AI service error: ${error.message}`);
    }
  }
}

module.exports = {
  generateSummary
};
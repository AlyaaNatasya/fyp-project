// backend/services/aiService.js
const axios = require('axios');

/**
 * Send text to the DeepSeek API for summarization
 * @param {string} text - The text to summarize
 * @returns {Promise<string>} - The generated summary
 */
async function generateSummary(text) {
  try {
    console.log('Sending request to DeepSeek API');
    console.log('Text length being sent:', text.length);
    
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

    // Get DeepSeek API key from environment variables
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DeepSeek API key is not configured. Please set DEEPSEEK_API_KEY in your environment variables.');
    }

    // Prepare the prompt for summarization
    const prompt = `Generate a concise and informative summary of the following academic content. Focus on key concepts, main points, and important details. Structure the summary with bullet points or clear paragraphs if appropriate:\n\n${cleanText}`;

    // Call the DeepSeek API
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",  // Using the chat model; you can also use "deepseek-coder" for code-related content
      messages: [
        {
          role: "system",
          content: "You are an excellent academic content summarizer. Create clear, concise, and informative summaries that capture the key concepts, main points, and important details from the provided text. Structure your response logically with bullet points or paragraphs as appropriate."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent summaries
      max_tokens: 1000, // Adjust based on desired summary length
      stream: false // Set to false to get complete response
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000, // 60 second timeout for API call
    });

    console.log('Received response from DeepSeek API:', response.status);
    
    // Extract the summary from the API response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      let summary = response.data.choices[0].message.content;
      
      // Ensure the summary is a string and properly formatted
      if (typeof summary !== 'string') {
        summary = String(summary || '');
      }
      
      // Clean up the summary text to remove problematic characters
      summary = summary.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
      
      return summary;
    } else {
      throw new Error('Invalid response format from DeepSeek API');
    }
  } catch (error) {
    console.error('Error communicating with DeepSeek API:', error.message);
    
    if (error.response) {
      // Server responded with error status
      console.error('DeepSeek API error response:', error.response.data);
      
      // Handle specific errors
      if (error.response.status === 401) {
        throw new Error('Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY configuration.');
      } else if (error.response.status === 429) {
        throw new Error('Rate limit exceeded for DeepSeek API. Please try again later.');
      } else if (error.response.status === 400) {
        throw new Error(`Bad request to DeepSeek API: ${error.response.data.error?.message || error.response.statusText}`);
      } else if (error.response.status === 500) {
        throw new Error('DeepSeek API server error. Please try again later.');
      } else {
        throw new Error(`DeepSeek API error: ${error.response.status} - ${error.response.data.error?.message || error.response.statusText}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from DeepSeek API:', error.request);
      throw new Error('DeepSeek API is not responding. Please check your network connection.');
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
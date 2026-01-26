// backend/services/aiService.js
const axios = require('axios');

/**
 * Helper function to retry a promise-returning function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Initial delay in ms (default: 2000)
 */
async function retryRequest(fn, retries = 3, delay = 2000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !isRetryableError(error)) {
      throw error;
    }
    console.log(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
}

/**
 * Check if the error is retryable (e.g., network errors, 5xx server errors)
 * @param {Error} error - The error object
 * @returns {boolean}
 */
function isRetryableError(error) {
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
  if (error.response && error.response.status >= 500) return true;
  return false;
}

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
    const prompt = `Generate a comprehensive and informative summary of the following academic content. Include all key concepts, main points, and important details from the entire document. Structure the summary with clear headings, bullet points, and paragraphs as appropriate. Use markdown formatting to make the summary well-organized and easy to read:\n\n${cleanText}`;

    // Call the DeepSeek API with retry logic
    const response = await retryRequest(() => axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",  // Using the chat model; you can also use "deepseek-coder" for code-related content
      messages: [
        {
          role: "system",
          content: "You are an excellent academic content summarizer. Create comprehensive, clear, and informative summaries that capture all key concepts, main points, and important details from the provided text. Structure your response with proper markdown formatting including headings, subheadings, bullet points, and paragraphs to make it well-organized and easy to read. Ensure the summary represents the entire document content, not just the beginning."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent summaries
      max_tokens: 2000, // Increased from 1000 to 2000 to allow for more comprehensive summaries
      stream: false // Set to false to get complete response
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000, // 300 second (5 min) timeout for API call
    }));

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

/**
 * Send text to the DeepSeek API for mind map generation
 * @param {string} text - The text to convert to a mind map
 * @returns {Promise<Object>} - The generated mind map structure
 */
async function generateMindMap(text) {
  try {
    console.log('Sending request to DeepSeek API for mind map generation');
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

    // Prepare the prompt for mind map generation
    const prompt = `Analyze the following academic content and convert it into a hierarchical mind map structure in JSON format. The mind map should have a central topic and multiple levels of branches. Each node should have an 'id', 'name', and 'children' array. The structure should represent the key concepts and their relationships in a hierarchical way:\n\n${cleanText}\n\nPlease return ONLY a valid JSON object in the following format:\n{\n  "name": "Central Topic",\n  "children": [\n    {\n      "name": "Main Branch 1",\n      "children": [\n        {\n          "name": "Sub-branch 1",\n          "children": []\n        }\n      ]\n    }\n  ]\n}`;

    // Call the DeepSeek API with retry logic
    const response = await retryRequest(() => axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",  // Using the chat model
      messages: [
        {
          role: "system",
          content: "You are an excellent academic content analyzer. Create a well-structured mind map in JSON format that represents the key concepts and their hierarchical relationships from the provided text. The JSON must be valid and have 'name' and 'children' properties for each node. Return ONLY the JSON object with no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent structure
      max_tokens: 2000, // Increased for more detailed structure
      stream: false // Set to false to get complete response
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000, // 300 second (5 min) timeout for API call
    }));

    console.log('Received response from DeepSeek API for mind map:', response.status);

    // Extract the mind map from the API response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      let content = response.data.choices[0].message.content;

      // Extract JSON from the response if it's wrapped in markdown code blocks
      let mindMapText = content.trim();
      // Remove markdown code blocks if present (start)
      mindMapText = mindMapText.replace(/^```(?:json)?\s*/i, "");
      // Remove markdown code blocks if present (end)
      mindMapText = mindMapText.replace(/\s*```$/, "");

      try {
        // Parse the JSON response
        let mindMap = JSON.parse(mindMapText);

        // Ensure the mind map has the correct structure
        if (!mindMap.name) {
          mindMap = {
            name: "Mind Map",
            children: mindMap
          };
        }

        console.log('Successfully parsed mind map JSON');
        return mindMap;
      } catch (parseError) {
        console.error('Error parsing mind map JSON:', parseError.message);
        console.log('Received content:', content);

        // If JSON parsing fails, return a basic structure
        return {
          name: "Mind Map",
          children: [
            {
              name: "Unable to parse mind map structure",
              children: [
                { name: "Text was too complex", children: [] },
                { name: "Please try again", children: [] }
              ]
            }
          ]
        };
      }
    } else {
      throw new Error('Invalid response format from DeepSeek API');
    }
  } catch (error) {
    console.error('Error communicating with DeepSeek API for mind map:', error.message);

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

/**
 * Send text to the DeepSeek API for flashcard generation
 * @param {string} text - The text to generate flashcards from
 * @returns {Promise<Object>} - The generated flashcards structure
 */
async function generateFlashcards(text) {
  try {
    console.log('Sending request to DeepSeek API for flashcard generation');
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

    // Prepare the prompt for flashcard generation
    const prompt = `Analyze the following academic content and generate a set of flashcards. Each flashcard should have a 'front' (the question or concept) and a 'back' (the answer or definition). Return ONLY a valid JSON object with the following structure:\n{\n  "flashcards": [\n    {\n      "front": "Question 1",\n      "back": "Answer 1"\n    },\n    {\n      "front": "Question 2",\n      "back": "Answer 2"\n    }\n  ]\n}\n\nText to analyze:\n\n${cleanText}`;

    // Call the DeepSeek API with retry logic
    const response = await retryRequest(() => axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an excellent academic content analyzer. Create a set of high-quality flashcards in JSON format from the provided text. The JSON must be valid and have a 'flashcards' property which is an array of objects with 'front' and 'back' properties. Return ONLY the JSON object with no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000,
    }));

    console.log('Received response from DeepSeek API for flashcards:', response.status);

    // Extract the flashcards from the API response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      let content = response.data.choices[0].message.content;

      // Extract JSON from the response if it's wrapped in markdown code blocks
      let jsonText = content.trim();
      // Remove markdown code blocks if present (start)
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, "");
      // Remove markdown code blocks if present (end)
      jsonText = jsonText.replace(/\s*```$/, "");

      try {
        // Parse the JSON response
        let flashcardsData = JSON.parse(jsonText);

        // Ensure the structure is correct
        if (!flashcardsData.flashcards || !Array.isArray(flashcardsData.flashcards)) {
           // specific recovery if the model returns just an array
           if (Array.isArray(flashcardsData)) {
               flashcardsData = { flashcards: flashcardsData };
           } else {
               throw new Error("Invalid flashcard structure");
           }
        }

        console.log('Successfully parsed flashcards JSON');
        return flashcardsData;
      } catch (parseError) {
        console.error('Error parsing flashcards JSON:', parseError.message);
        console.log('Received content:', content);

        // If JSON parsing fails, return a basic error structure
        return {
          flashcards: [
            { front: "Error parsing flashcards", back: "Please try again." }
          ]
        };
      }
    } else {
      throw new Error('Invalid response format from DeepSeek API');
    }
  } catch (error) {
    console.error('Error communicating with DeepSeek API for flashcards:', error.message);
    if (error.response) {
        throw new Error(`DeepSeek API error: ${error.response.status}`);
    }
    throw error;
  }
}

/**
 * Send text to the DeepSeek API for quiz generation
 * @param {string} text - The text to generate quiz from
 * @returns {Promise<Object>} - The generated quiz structure
 */
async function generateQuiz(text) {
  try {
    console.log('Sending request to DeepSeek API for quiz generation');
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

    // Prepare the prompt for quiz generation
    const prompt = `Analyze the following academic content and generate a multiple-choice quiz. 
    Each question should have 4 options and clearly indicate the correct answer. 
    Return ONLY a valid JSON object with the following structure:
    {
      "quiz": [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option B" // Must match one of the options exactly
        },
        ...
      ]
    }
    
    Text to analyze:
    ${cleanText}`;

    // Call the DeepSeek API with retry logic
    const response = await retryRequest(() => axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an excellent academic content analyzer. Create a high-quality multiple-choice quiz in JSON format from the provided text. The JSON must be valid and follow the specified structure exactly. Return ONLY the JSON object with no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000,
    }));

    console.log('Received response from DeepSeek API for quiz:', response.status);

    // Extract the quiz from the API response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      let content = response.data.choices[0].message.content;

      // Extract JSON from the response if it's wrapped in markdown code blocks
      let jsonText = content.trim();
      // Remove markdown code blocks if present (start)
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, "");
      // Remove markdown code blocks if present (end)
      jsonText = jsonText.replace(/\s*```$/, "");

      try {
        // Parse the JSON response
        let quizData = JSON.parse(jsonText);

        // Ensure the structure is correct
        if (!quizData.quiz || !Array.isArray(quizData.quiz)) {
           if (Array.isArray(quizData)) {
               quizData = { quiz: quizData };
           } else {
               throw new Error("Invalid quiz structure");
           }
        }

        console.log('Successfully parsed quiz JSON');
        return quizData;
      } catch (parseError) {
        console.error('Error parsing quiz JSON:', parseError.message);
        console.log('Received content:', content);

        return {
          quiz: [
            { 
              question: "Error parsing quiz data", 
              options: ["Error", "Please", "Try", "Again"],
              correctAnswer: "Again"
            }
          ]
        };
      }
    } else {
      throw new Error('Invalid response format from DeepSeek API');
    }
  } catch (error) {
    console.error('Error communicating with DeepSeek API for quiz:', error.message);
    if (error.response) {
        throw new Error(`DeepSeek API error: ${error.response.status}`);
    }
    throw error;
  }
}

module.exports = {
  generateSummary,
  generateMindMap,
  generateFlashcards,
  generateQuiz
};
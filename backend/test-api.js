// Simple script to test DeepSeek API connection
const axios = require('axios');
require('dotenv').config();

async function testApiKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.log('❌ DEEPSEEK_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ API Key is present in environment variables');
  console.log('Testing API connection...');
  
  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, test message!"
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ API Connection successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data.choices[0].message.content);
  } catch (error) {
    console.log('❌ API Connection failed!');
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    } else {
      console.log('Error message:', error.message);
    }
  }
}

testApiKey();
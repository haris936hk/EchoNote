// backend/src/config/groq.js
// Groq API configuration for Mistral-7B LLM summarization

const axios = require('axios');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Groq API configuration
const GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY,
  baseUrl: 'https://api.groq.com/openai/v1',
  model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
  maxTokens: 2000,
  temperature: 0.3, // Lower = more focused, higher = more creative
  timeout: 30000 // 30 seconds
};

// Verify configuration
if (!GROQ_CONFIG.apiKey) {
  logger.warn('⚠️ GROQ_API_KEY not set in environment variables');
}

/**
 * Create Groq API client
 */
const groqClient = axios.create({
  baseURL: GROQ_CONFIG.baseUrl,
  timeout: GROQ_CONFIG.timeout,
  headers: {
    'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Generate meeting summary from transcript
 * @param {string} transcript - Meeting transcript text
 * @param {Object} metadata - Additional context (title, category, etc.)
 * @returns {Object} Structured summary
 */
const generateMeetingSummary = async (transcript, metadata = {}) => {
  try {
    const startTime = Date.now();

    // Build system prompt for meeting summarization
    const systemPrompt = `You are an expert meeting assistant that creates structured, actionable summaries.

You will receive:
1. A meeting transcript
2. Pre-extracted NLP features to guide your analysis

TASK
Create a comprehensive summary in JSON format using BOTH the transcript and NLP features:

{
  "executiveSummary": "2-3 sentences capturing main purpose and outcomes",
  "keyDecisions": "Important decisions made, or 'No major decisions recorded'",
  "actionItems": [
    {
      "task": "What needs to be done",
      "assignee": "Person responsible or null",
      "deadline": "When due or null",
      "priority": "high/medium/low"
    }
  ],
  "nextSteps": "What happens next after this meeting",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive/neutral/negative/mixed"
}

GUIDELINES
- Use identified entities to ensure accuracy in assignees
- Match action items with extracted action patterns
- Align topics with pre-identified themes
- Use sentiment analysis to determine overall meeting tone
- Be concise but comprehensive
- Extract ONLY information from the transcript
- If assignee/deadline not mentioned, use null
- If no action items, return empty array []

Return ONLY the JSON object, no additional text.`;

    // Build NLP features section
    const nlpFeaturesSection = metadata.entities || metadata.keyPhrases || metadata.sentiment
      ? `
NLP FEATURES (Pre-extracted):
${metadata.entities && metadata.entities.length > 0 ? `- Entities: ${metadata.entities.map(e => `${e.text} (${e.label})`).join(', ')}` : '- Entities: None detected'}
${metadata.keyPhrases && metadata.keyPhrases.length > 0 ? `- Key Phrases: ${metadata.keyPhrases.join(', ')}` : '- Key Phrases: None detected'}
${metadata.sentiment ? `- Sentiment: ${metadata.sentiment.label || 'neutral'} (score: ${metadata.sentiment.score || 0})` : '- Sentiment: Not analyzed'}
${metadata.topics && metadata.topics.length > 0 ? `- Topics: ${metadata.topics.join(', ')}` : ''}
`
      : '';

    // Build user prompt with transcript and NLP context
    const userPrompt = `Meeting Title: ${metadata.title || 'Untitled Meeting'}
Category: ${metadata.category || 'General'}
Duration: ${metadata.duration ? Math.round(metadata.duration / 60) + ' minutes' : 'Unknown'}
${nlpFeaturesSection}
Transcript:
${transcript}

Please analyze this meeting transcript using the NLP features above to guide your analysis. Provide a comprehensive summary in the JSON format specified.`;

    logger.info('🤖 Generating summary with Groq API...');

    const response = await groqClient.post('/chat/completions', {
      model: GROQ_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: GROQ_CONFIG.temperature,
      max_tokens: GROQ_CONFIG.maxTokens,
      response_format: { type: 'json_object' }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Summary generated in ${duration}s`);

    // Parse the response
    const summaryText = response.data.choices[0].message.content;
    const summary = JSON.parse(summaryText);

    // Log usage stats
    if (response.data.usage) {
      logger.info(`📊 Token usage: ${response.data.usage.total_tokens} (prompt: ${response.data.usage.prompt_tokens}, completion: ${response.data.usage.completion_tokens})`);
    }

    return {
      success: true,
      summary,
      metadata: {
        model: response.data.model,
        duration: parseFloat(duration),
        tokensUsed: response.data.usage?.total_tokens || 0
      }
    };

  } catch (error) {
    logger.error(`❌ Groq API error: ${error.message}`);
    
    // Handle specific error cases
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
      logger.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    
    throw new Error(`Summary generation failed: ${error.message}`);
  }
};

/**
 * Extract action items from transcript (fallback method)
 * @param {string} transcript - Meeting transcript
 * @returns {Array} Action items
 */
const extractActionItems = async (transcript) => {
  try {
    const systemPrompt = `You are an AI assistant specialized in extracting action items from meeting transcripts. 
Identify tasks, assignments, and commitments. Return only a JSON array of action items.

Format:
[
  {
    "task": "Clear description of what needs to be done",
    "assignee": "Person responsible (or null)",
    "deadline": "When it's due (or null)",
    "priority": "high/medium/low"
  }
]`;

    const response = await groqClient.post('/chat/completions', {
      model: GROQ_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Extract action items from this transcript:\n\n${transcript}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.data.choices[0].message.content);
    return result.actionItems || result || [];

  } catch (error) {
    logger.error(`Error extracting action items: ${error.message}`);
    return [];
  }
};

/**
 * Generate a concise summary (for previews)
 * @param {string} transcript - Meeting transcript
 * @param {number} maxLength - Maximum length in words
 * @returns {string} Brief summary
 */
const generateBriefSummary = async (transcript, maxLength = 50) => {
  try {
    const response = await groqClient.post('/chat/completions', {
      model: GROQ_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are a concise meeting summarizer. Create a brief, one-paragraph summary in ${maxLength} words or less.`
        },
        {
          role: 'user',
          content: `Summarize this meeting transcript:\n\n${transcript}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    return response.data.choices[0].message.content.trim();

  } catch (error) {
    logger.error(`Error generating brief summary: ${error.message}`);
    return 'Summary generation failed.';
  }
};

/**
 * Analyze meeting sentiment
 * @param {string} transcript - Meeting transcript
 * @returns {Object} Sentiment analysis
 */
const analyzeSentiment = async (transcript) => {
  try {
    const response = await groqClient.post('/chat/completions', {
      model: GROQ_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `Analyze the overall sentiment and tone of this meeting. Return JSON format:
{
  "sentiment": "positive/neutral/negative/mixed",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.data.choices[0].message.content);

  } catch (error) {
    logger.error(`Error analyzing sentiment: ${error.message}`);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      reasoning: 'Analysis failed'
    };
  }
};

/**
 * Check if Groq API is available
 * @returns {boolean} True if API is accessible
 */
const checkGroqHealth = async () => {
  try {
    const response = await groqClient.post('/chat/completions', {
      model: GROQ_CONFIG.model,
      messages: [
        {
          role: 'user',
          content: 'Say "OK" if you can hear me.'
        }
      ],
      max_tokens: 10
    });

    return {
      status: 'healthy',
      model: response.data.model,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error(`Groq health check failed: ${error.message}`);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
};

/**
 * Estimate tokens in text (approximate)
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
const estimateTokens = (text) => {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
};

/**
 * Truncate transcript if too long
 * @param {string} transcript - Original transcript
 * @param {number} maxTokens - Maximum tokens allowed
 * @returns {string} Truncated transcript
 */
const truncateTranscript = (transcript, maxTokens = 20000) => {
  const estimatedTokens = estimateTokens(transcript);
  
  if (estimatedTokens <= maxTokens) {
    return transcript;
  }
  
  // Calculate how much to keep (leave room for system prompt)
  const keepRatio = (maxTokens - 1000) / estimatedTokens;
  const keepChars = Math.floor(transcript.length * keepRatio);
  
  logger.warn(`⚠️ Transcript truncated from ${estimatedTokens} to ~${maxTokens} tokens`);
  
  return transcript.substring(0, keepChars) + '\n\n[Transcript truncated due to length]';
};

/**
 * Batch process multiple transcripts
 * @param {Array} transcripts - Array of {id, transcript, metadata}
 * @returns {Array} Array of results
 */
const batchGenerateSummaries = async (transcripts) => {
  const results = [];
  
  for (const item of transcripts) {
    try {
      const result = await generateMeetingSummary(item.transcript, item.metadata);
      results.push({
        id: item.id,
        success: true,
        ...result
      });
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error.message
      });
    }
    
    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};

module.exports = {
  GROQ_CONFIG,
  groqClient,
  generateMeetingSummary,
  extractActionItems,
  generateBriefSummary,
  analyzeSentiment,
  checkGroqHealth,
  estimateTokens,
  truncateTranscript,
  batchGenerateSummaries
};
/**
 * Custom Model Inference Service
 *
 * Calls the fine-tuned EchoNote model API (exposed via NGROK)
 * Replaces Groq API for meeting summarization with custom-trained model
 *
 * Pipeline Integration:
 * Whisper → SpaCy NLP → [THIS SERVICE] → Formatted Summary
 */

const axios = require('axios');
const logger = require('../utils/logger');

class CustomModelService {
  constructor() {
    // NGROK URL from the inference notebook (update this after starting the notebook)
    this.apiUrl = process.env.CUSTOM_MODEL_API_URL || 'https://your-domain.ngrok-free.app';
    this.apiKey = process.env.CUSTOM_MODEL_API_KEY || 'echonote-secret-api-key-2025';

    // Timeout configuration (matches notebook's 60s timeout)
    this.timeout = parseInt(process.env.CUSTOM_MODEL_TIMEOUT) || 70000; // 70s to account for network

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Generate meeting summary using custom fine-tuned model
   *
   * @param {string} transcript - Meeting transcript from Whisper
   * @param {object} nlpFeatures - NLP features from SpaCy (optional but recommended)
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async generateSummary(transcript, nlpFeatures = null) {
    try {
      logger.info('[CustomModel] Starting summary generation', {
        transcriptLength: transcript.length,
        hasNlpFeatures: !!nlpFeatures
      });

      // Enhance transcript with NLP features if available
      const enhancedTranscript = this._enhanceTranscriptWithNLP(transcript, nlpFeatures);

      // Call custom model API with retry logic
      const summary = await this._callAPIWithRetry(enhancedTranscript);

      // Validate and format response
      const formattedSummary = this._validateAndFormatSummary(summary);

      logger.info('[CustomModel] Summary generation successful', {
        hasActionItems: formattedSummary.actionItems?.length > 0,
        sentiment: formattedSummary.sentiment
      });

      return {
        success: true,
        data: formattedSummary
      };

    } catch (error) {
      logger.error('[CustomModel] Summary generation failed', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for custom model API
   *
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.apiUrl}/health`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 5000
      });

      return {
        success: true,
        data: {
          status: response.data.status,
          model: response.data.model,
          uptime: response.data.uptime_seconds
        }
      };

    } catch (error) {
      logger.error('[CustomModel] Health check failed', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * PRIVATE: Enhance transcript with NLP features for better model accuracy
   *
   * The custom model expects NLP features to guide summarization.
   * This formats them EXACTLY as they appeared in training data.
   *
   * Training format from echonote_generator notebook:
   * ```
   * MEETING TRANSCRIPT:
   * [transcript]
   *
   * NLP ANALYSIS:
   * Entities: Name (PERSON), Org (ORG), Date (DATE)
   * Key Phrases: phrase1, phrase2
   * Topics: topic1, topic2
   * Sentiment: Positive (polarity: 0.174)
   * ```
   */
  _enhanceTranscriptWithNLP(transcript, nlpFeatures) {
    if (!nlpFeatures) {
      return transcript;
    }

    // TEMPORARY TESTING: Log received NLP features
    console.log('🔍 NLP Features received:', JSON.stringify(nlpFeatures, null, 2));

    // FIXED: Match training format exactly (no dashes, specific field order)
    let enhancedPrompt = `${transcript}\n\nNLP ANALYSIS:\n`;

    // Entities - FIXED: Already formatted as "Name (LABEL)" strings by summarization.service.js
    if (nlpFeatures.entities?.length > 0) {
      enhancedPrompt += `Entities: ${nlpFeatures.entities.join(', ')}\n`;
    } else {
      enhancedPrompt += `Entities: None\n`;
    }

    // Key Phrases - OK as-is (array of strings)
    if (nlpFeatures.keyPhrases?.length > 0) {
      enhancedPrompt += `Key Phrases: ${nlpFeatures.keyPhrases.join(', ')}\n`;
    } else {
      enhancedPrompt += `Key Phrases: None\n`;
    }

    // Topics - OK as-is (array of strings)
    if (nlpFeatures.topics?.length > 0) {
      enhancedPrompt += `Topics: ${nlpFeatures.topics.join(', ')}\n`;
    } else {
      enhancedPrompt += `Topics: None\n`;
    }

    // Sentiment - FIXED: Format with polarity score to match training
    if (nlpFeatures.sentiment) {
      const sentimentLabel = typeof nlpFeatures.sentiment === 'string'
        ? nlpFeatures.sentiment
        : nlpFeatures.sentiment.label || nlpFeatures.sentiment;

      // Capitalize first letter to match training format
      const capitalizedSentiment = sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1);

      // Add polarity if available (format: "Positive (polarity: 0.174)")
      const polarity = nlpFeatures.sentimentPolarity || nlpFeatures.sentiment?.score || '';
      const sentimentText = polarity !== ''
        ? `${capitalizedSentiment} (polarity: ${polarity})`
        : capitalizedSentiment;

      enhancedPrompt += `Sentiment: ${sentimentText}`;
    } else {
      enhancedPrompt += `Sentiment: Neutral`;
    }

    // REMOVED: "Detected Actions" field - NOT in training data!
    // The training notebooks never included this field, so we don't add it

    // TEMPORARY TESTING: Log enhanced prompt format
    console.log('📝 Enhanced transcript format:', enhancedPrompt.split('\n\n').pop().substring(0, 500));

    return enhancedPrompt;
  }

  /**
   * PRIVATE: Call custom model API with exponential backoff retry
   */
  async _callAPIWithRetry(transcript, attempt = 1) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/predict`,
        { transcript },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          timeout: this.timeout
        }
      );

      // Extract summary from response
      return response.data.summary;

    } catch (error) {
      logger.warn(`[CustomModel] API call failed (attempt ${attempt}/${this.maxRetries})`, {
        error: error.message,
        status: error.response?.status
      });

      // Retry logic
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.info(`[CustomModel] Retrying in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this._callAPIWithRetry(transcript, attempt + 1);
      }

      // Max retries exceeded
      throw new Error(`Custom model API failed after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * PRIVATE: Validate and format summary to match EchoNote schema
   *
   * Ensures output matches the expected format from echonote_dataset.json
   */
  _validateAndFormatSummary(summary) {
    // Validate required fields
    const requiredFields = ['executiveSummary', 'keyDecisions', 'actionItems', 'nextSteps', 'keyTopics', 'sentiment'];
    const missingFields = requiredFields.filter(field => !(field in summary));

    if (missingFields.length > 0) {
      logger.warn('[CustomModel] Summary missing fields, applying defaults', {
        missingFields
      });
    }

    // Format with defaults for missing fields
    const formatted = {
      executiveSummary: summary.executiveSummary || 'No summary available.',
      keyDecisions: Array.isArray(summary.keyDecisions)
        ? summary.keyDecisions
        : (summary.keyDecisions ? [summary.keyDecisions] : []),
      actionItems: Array.isArray(summary.actionItems)
        ? summary.actionItems.map(item => ({
            task: item.task || 'Unspecified task',
            assignee: item.assignee || null,
            deadline: item.deadline || null,
            priority: item.priority || 'medium'
          }))
        : [],
      nextSteps: Array.isArray(summary.nextSteps)
        ? summary.nextSteps
        : (summary.nextSteps ? [summary.nextSteps] : []),
      keyTopics: Array.isArray(summary.keyTopics)
        ? summary.keyTopics
        : [],
      // FIXED: Remove "mixed" - model only trained on positive, neutral, negative
      sentiment: ['positive', 'neutral', 'negative'].includes(summary.sentiment)
        ? summary.sentiment
        : 'neutral'
    };

    // Validate executive summary length (should be substantial)
    if (formatted.executiveSummary.length < 150) {
      logger.warn('[CustomModel] Executive summary too short', {
        length: formatted.executiveSummary.length
      });
    }

    return formatted;
  }

  /**
   * Update API URL dynamically (useful when NGROK URL changes)
   */
  updateApiUrl(newUrl) {
    this.apiUrl = newUrl;
    logger.info('[CustomModel] API URL updated', { newUrl });
  }
}

// Export singleton instance
module.exports = new CustomModelService();

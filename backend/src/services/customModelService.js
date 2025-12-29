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
   * Batch processing for multiple meetings
   *
   * @param {Array<{transcript: string, nlpFeatures?: object}>} meetings
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async generateBatchSummaries(meetings) {
    try {
      logger.info('[CustomModel] Starting batch summary generation', {
        count: meetings.length
      });

      // Prepare enhanced transcripts
      const enhancedTranscripts = meetings.map(m =>
        this._enhanceTranscriptWithNLP(m.transcript, m.nlpFeatures)
      );

      // Call batch API endpoint
      const response = await axios.post(
        `${this.apiUrl}/batch-predict`,
        { transcripts: enhancedTranscripts },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          timeout: this.timeout * meetings.length // Scale timeout with batch size
        }
      );

      const results = response.data.results.map(result => {
        if (result.status === 'success') {
          return {
            success: true,
            data: this._validateAndFormatSummary(result.summary)
          };
        } else {
          return {
            success: false,
            error: result.error
          };
        }
      });

      logger.info('[CustomModel] Batch processing complete', {
        total: response.data.total,
        successful: response.data.successful,
        failed: response.data.failed
      });

      return {
        success: true,
        data: results
      };

    } catch (error) {
      logger.error('[CustomModel] Batch generation failed', {
        error: error.message
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
   * This formats them into a structured prompt addition.
   */
  _enhanceTranscriptWithNLP(transcript, nlpFeatures) {
    if (!nlpFeatures) {
      return transcript;
    }

    // Format NLP features as structured metadata
    let enhancedPrompt = `${transcript}\n\n--- NLP ANALYSIS ---\n`;

    if (nlpFeatures.entities?.length > 0) {
      enhancedPrompt += `\nKey Entities: ${nlpFeatures.entities.join(', ')}`;
    }

    if (nlpFeatures.keyPhrases?.length > 0) {
      enhancedPrompt += `\nKey Phrases: ${nlpFeatures.keyPhrases.join(', ')}`;
    }

    if (nlpFeatures.actionItems?.length > 0) {
      enhancedPrompt += `\nDetected Actions: ${nlpFeatures.actionItems.join(', ')}`;
    }

    if (nlpFeatures.sentiment) {
      enhancedPrompt += `\nOverall Sentiment: ${nlpFeatures.sentiment}`;
    }

    if (nlpFeatures.topics?.length > 0) {
      enhancedPrompt += `\nMain Topics: ${nlpFeatures.topics.join(', ')}`;
    }

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
      sentiment: ['positive', 'neutral', 'negative', 'mixed'].includes(summary.sentiment)
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

/**
 * Summarization Service - Unified Interface
 *
 * Provides abstraction layer for meeting summarization.
 * Supports multiple backends:
 * - Groq API (Mistral-7B) - Fast, cloud-based
 * - Custom Model API (Fine-tuned Qwen2.5-7B) - Higher accuracy for EchoNote data
 *
 * Configure via SUMMARIZATION_PROVIDER env variable
 */

const logger = require('../utils/logger');
const customModelService = require('./customModelService');
const groqService = require('./groqService'); // Your existing Groq service

class SummarizationService {
  constructor() {
    // Determine which provider to use
    this.provider = process.env.SUMMARIZATION_PROVIDER || 'groq'; // 'groq' or 'custom'
    this.fallbackEnabled = process.env.ENABLE_SUMMARIZATION_FALLBACK === 'true';

    logger.info('[Summarization] Service initialized', {
      provider: this.provider,
      fallbackEnabled: this.fallbackEnabled
    });
  }

  /**
   * Generate meeting summary using configured provider
   *
   * @param {string} transcript - Meeting transcript from Whisper
   * @param {object} nlpFeatures - NLP features from SpaCy
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async generateSummary(transcript, nlpFeatures = null) {
    try {
      logger.info('[Summarization] Generating summary', {
        provider: this.provider,
        transcriptLength: transcript.length
      });

      let result;

      // Call primary provider
      if (this.provider === 'custom') {
        result = await customModelService.generateSummary(transcript, nlpFeatures);
      } else if (this.provider === 'groq') {
        result = await groqService.generateSummary(transcript, nlpFeatures);
      } else {
        throw new Error(`Unknown summarization provider: ${this.provider}`);
      }

      // If primary fails and fallback is enabled, try alternative
      if (!result.success && this.fallbackEnabled) {
        logger.warn('[Summarization] Primary provider failed, attempting fallback', {
          primaryProvider: this.provider,
          error: result.error
        });

        const fallbackProvider = this.provider === 'custom' ? 'groq' : 'custom';

        if (fallbackProvider === 'groq') {
          result = await groqService.generateSummary(transcript, nlpFeatures);
        } else {
          result = await customModelService.generateSummary(transcript, nlpFeatures);
        }

        if (result.success) {
          logger.info('[Summarization] Fallback provider succeeded', {
            fallbackProvider
          });
        }
      }

      return result;

    } catch (error) {
      logger.error('[Summarization] Service error', {
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
   * Batch summarization for multiple meetings
   */
  async generateBatchSummaries(meetings) {
    try {
      if (this.provider === 'custom') {
        return await customModelService.generateBatchSummaries(meetings);
      } else {
        // Groq doesn't have native batch support, process sequentially
        const results = [];
        for (const meeting of meetings) {
          const result = await groqService.generateSummary(
            meeting.transcript,
            meeting.nlpFeatures
          );
          results.push(result);
        }

        return {
          success: true,
          data: results
        };
      }
    } catch (error) {
      logger.error('[Summarization] Batch processing error', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for current provider
   */
  async healthCheck() {
    try {
      if (this.provider === 'custom') {
        return await customModelService.healthCheck();
      } else {
        // Groq doesn't have a health endpoint, just return configured status
        return {
          success: true,
          data: {
            provider: 'groq',
            status: 'configured'
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Switch provider at runtime (useful for A/B testing)
   */
  switchProvider(newProvider) {
    if (!['groq', 'custom'].includes(newProvider)) {
      throw new Error(`Invalid provider: ${newProvider}. Must be 'groq' or 'custom'`);
    }

    const oldProvider = this.provider;
    this.provider = newProvider;

    logger.info('[Summarization] Provider switched', {
      from: oldProvider,
      to: newProvider
    });
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      provider: this.provider,
      fallbackEnabled: this.fallbackEnabled,
      customModelUrl: process.env.CUSTOM_MODEL_API_URL,
      groqConfigured: !!process.env.GROQ_API_KEY
    };
  }
}

// Export singleton instance
module.exports = new SummarizationService();

/**
 * Groq API Service
 *
 * Uses Groq's cloud inference API with Mistral-7B-Instruct
 * for meeting summarization (original MVP approach)
 *
 * Expected processing time: ~5s
 */

const axios = require('axios');
const logger = require('../utils/logger');

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = process.env.GROQ_MODEL || 'mixtral-8x7b-32768'; // or 'llama2-70b-4096'
    this.maxTokens = 1000;
    this.temperature = 0.3;
    this.timeout = 30000; // 30s timeout

    if (!this.apiKey) {
      logger.warn('[Groq] API key not configured. Set GROQ_API_KEY environment variable.');
    }
  }

  /**
   * Generate meeting summary using Groq API
   *
   * @param {string} transcript - Meeting transcript
   * @param {object} nlpFeatures - NLP features from SpaCy
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async generateSummary(transcript, nlpFeatures = null) {
    try {
      if (!this.apiKey) {
        throw new Error('Groq API key not configured');
      }

      logger.info('[Groq] Starting summary generation', {
        transcriptLength: transcript.length,
        model: this.model
      });

      // Build system prompt
      const systemPrompt = this._buildSystemPrompt();

      // Build user prompt with NLP features
      const userPrompt = this._buildUserPrompt(transcript, nlpFeatures);

      // Call Groq API
      const startTime = Date.now();
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          response_format: { type: 'json_object' } // Force JSON output
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const inferenceTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Extract and parse JSON response
      const rawContent = response.data.choices[0].message.content;
      const summary = JSON.parse(rawContent);

      logger.info('[Groq] Summary generation successful', {
        inferenceTime: `${inferenceTime}s`,
        hasActionItems: summary.actionItems?.length > 0,
        sentiment: summary.sentiment
      });

      // Validate and format
      const formattedSummary = this._validateAndFormatSummary(summary);

      return {
        success: true,
        data: formattedSummary
      };

    } catch (error) {
      logger.error('[Groq] Summary generation failed', {
        error: error.message,
        response: error.response?.data
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * PRIVATE: Build system prompt
   */
  _buildSystemPrompt() {
    return `You are an AI assistant specialized in analyzing meeting transcripts.

Your task is to:
1. Read the meeting transcript carefully
2. Analyze the NLP features provided (if available)
3. Generate a structured JSON summary

Output Format (strict JSON):
{
  "executiveSummary": string (60-100 words),
  "keyDecisions": string[],
  "actionItems": [
    {"task": string, "assignee": string | null, "deadline": string | null, "priority": "high" | "medium" | "low"}
  ],
  "nextSteps": string[],
  "keyTopics": string[],
  "sentiment": "positive" | "neutral" | "negative" | "mixed"
}

Important:
- Output ONLY valid JSON, nothing else
- executiveSummary must be at least 150 characters
- If no decisions/actions found, return empty arrays []
- If assignee/deadline not mentioned, use null
- sentiment must match the tone of the meeting
- Use NLP features to ensure accuracy in assignees and topics`;
  }

  /**
   * PRIVATE: Build user prompt with NLP features
   */
  _buildUserPrompt(transcript, nlpFeatures) {
    let prompt = `Meeting Transcript:\n${transcript}`;

    // Add NLP features if available
    if (nlpFeatures) {
      prompt += '\n\n--- NLP Analysis ---';

      if (nlpFeatures.entities?.length > 0) {
        prompt += `\nKey Entities: ${nlpFeatures.entities.join(', ')}`;
      }

      if (nlpFeatures.keyPhrases?.length > 0) {
        prompt += `\nKey Phrases: ${nlpFeatures.keyPhrases.join(', ')}`;
      }

      if (nlpFeatures.actionItems?.length > 0) {
        prompt += `\nDetected Actions: ${nlpFeatures.actionItems.join(', ')}`;
      }

      if (nlpFeatures.sentiment) {
        prompt += `\nOverall Sentiment: ${nlpFeatures.sentiment}`;
      }

      if (nlpFeatures.topics?.length > 0) {
        prompt += `\nMain Topics: ${nlpFeatures.topics.join(', ')}`;
      }
    }

    prompt += '\n\nGenerate a structured JSON summary following the exact format specified.';

    return prompt;
  }

  /**
   * PRIVATE: Validate and format summary
   */
  _validateAndFormatSummary(summary) {
    const formatted = {
      executiveSummary: summary.executiveSummary || 'No summary available.',
      keyDecisions: Array.isArray(summary.keyDecisions)
        ? summary.keyDecisions
        : [],
      actionItems: Array.isArray(summary.actionItems)
        ? summary.actionItems.map(item => ({
            task: item.task || 'Unspecified task',
            assignee: item.assignee || null,
            deadline: item.deadline || null,
            priority: ['high', 'medium', 'low'].includes(item.priority)
              ? item.priority
              : 'medium'
          }))
        : [],
      nextSteps: Array.isArray(summary.nextSteps)
        ? summary.nextSteps
        : [],
      keyTopics: Array.isArray(summary.keyTopics)
        ? summary.keyTopics
        : [],
      sentiment: ['positive', 'neutral', 'negative', 'mixed'].includes(summary.sentiment)
        ? summary.sentiment
        : 'neutral'
    };

    return formatted;
  }
}

// Export singleton instance
module.exports = new GroqService();

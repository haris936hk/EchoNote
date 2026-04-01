/**
 * Groq Inference Service
 *
 * Replaces the NGROK-hosted Qwen2.5-7B custom model with the
 * Groq-hosted `openai/gpt-oss-120b` model via the OpenAI-compatible API.
 *
 * Pipeline Integration:
 *   Whisper → SpaCy NLP → [THIS SERVICE] → Formatted Summary
 *
 * Drop-in replacement for customModelService.js:
 *   - Same public method: generateSummary(transcript, nlpFeatures)
 *   - Same return shape: { success, data: { executiveSummary, keyDecisions,
 *                          actionItems, nextSteps, keyTopics, sentiment } }
 */

const axios = require('axios');
const logger = require('../utils/logger');

// ─── Constants ───────────────────────────────────────────────────────────────

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_TIMEOUT_MS = 30_000; // 30 s — Groq is typically <5 s
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000;

// ─── System Prompt ────────────────────────────────────────────────────────────

/**
 * Instructs the model to act as an expert meeting analyst and return a
 * strict JSON object that maps 1-to-1 with EchoNote's database schema.
 *
 * Using a detailed system prompt in place of fine-tuning on the 7B model
 * gives superior, more consistent results with a 120B instruction model.
 */
const SYSTEM_PROMPT = `You are an expert meeting analyst. Your task is to produce a structured, actionable summary of a meeting transcript.

You MUST respond with a single valid JSON object — no markdown, no explanation, no extra text — conforming EXACTLY to this schema:

{
  "executiveSummary": "<string: 2–5 sentence paragraph summarising the meeting's purpose, main discussion points and outcomes>",
  "keyDecisions": ["<string>", ...],
  "actionItems": [
    {
      "task": "<string: clear, specific task description>",
      "assignee": "<string | null: person responsible, or null if unknown>",
      "deadline": "<string | null: date or relative time, or null if not mentioned>",
      "priority": "<'high' | 'medium' | 'low'>"
    }
  ],
  "nextSteps": ["<string>", ...],
  "keyTopics": ["<string>", ...],
  "sentiment": "<'positive' | 'neutral' | 'negative'>"
}

Rules:
- executiveSummary must be at least 150 characters.
- keyDecisions: list every consequential decision reached; use [] if none.
- actionItems: every concrete task with an owner or deadline mentioned; use [] if none.
  * IMPORTANT: The transcript may contain speaker labels (e.g. [SPEAKER_00]: or [John]:). Use these labels to determine the exact 'assignee' for each action item. Pay close attention to who commits to doing what.
- nextSteps: high-level follow-up items or milestones discussed; use [] if none.
- keyTopics: 3–8 single-phrase topics that capture the meeting's subject matter.
- sentiment: overall tone of the meeting.
- All string values must be in English regardless of transcript language.
- Do NOT invent information not present in the transcript.`;

// ─── Class ────────────────────────────────────────────────────────────────────

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = process.env.GROQ_MODEL || DEFAULT_MODEL;
    this.timeout = parseInt(process.env.GROQ_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

    if (!this.apiKey) {
      logger.warn(
        '[GroqService] GROQ_API_KEY is not set. Summarization will fail until it is configured.'
      );
    }

    logger.info('[GroqService] Initialized', { model: this.model });
  }

  // ─── Public API (drop-in replacement for customModelService) ────────────────

  /**
   * Generate a structured meeting summary.
   *
   * @param {string} transcript        - Raw or NLP-enriched meeting transcript.
   * @param {object|null} nlpFeatures  - SpaCy NLP output (entities, keyPhrases,
   *                                     topics, sentiment, sentimentPolarity).
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async generateSummary(transcript, nlpFeatures = null) {
    try {
      logger.info('[GroqService] Starting summary generation', {
        transcriptLength: transcript?.length ?? 0,
        hasNlpFeatures: !!nlpFeatures,
        model: this.model,
      });

      // Combine transcript + NLP context into a single user message
      const userMessage = this._buildUserMessage(transcript, nlpFeatures);

      // Call Groq with retry logic
      const rawJson = await this._callGroqWithRetry(userMessage);

      // Parse + validate the JSON response
      const formattedSummary = this._parseAndValidate(rawJson);

      logger.info('[GroqService] Summary generation successful', {
        hasActionItems: formattedSummary.actionItems?.length > 0,
        actionItemCount: formattedSummary.actionItems?.length ?? 0,
        sentiment: formattedSummary.sentiment,
      });

      return { success: true, data: formattedSummary };
    } catch (error) {
      logger.error('[GroqService] Summary generation failed', {
        error: error.message,
        stack: error.stack,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Health check — verifies the Groq API is reachable and the key is valid.
   *
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${GROQ_BASE_URL}/models`, {
        headers: this._authHeaders(),
        timeout: 5_000,
      });

      const models = response.data?.data ?? [];
      const modelAvailable = models.some((m) => m.id === this.model);

      return {
        success: true,
        data: {
          status: 'connected',
          model: this.model,
          modelAvailable,
          totalModels: models.length,
        },
      };
    } catch (error) {
      logger.error('[GroqService] Health check failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build the user message that contains the transcript + optional NLP context.
   * Mirrors the exact NLP-enhancement format used by customModelService so the
   * model receives the same structured context.
   */
  _buildUserMessage(transcript, nlpFeatures) {
    if (!nlpFeatures) {
      return `MEETING TRANSCRIPT:\n${transcript}`;
    }

    // Log received features during development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[GroqService] NLP features received', {
        entities: nlpFeatures.entities?.length ?? 0,
        keyPhrases: nlpFeatures.keyPhrases?.length ?? 0,
        topics: nlpFeatures.topics?.length ?? 0,
        sentiment: nlpFeatures.sentiment,
      });
    }

    let message = `MEETING TRANSCRIPT:\n${transcript}\n\nNLP ANALYSIS:\n`;

    // Entities — already formatted as "Name (LABEL)" strings by summarization.service.js
    if (nlpFeatures.entities?.length > 0) {
      message += `Entities: ${nlpFeatures.entities.join(', ')}\n`;
    } else {
      message += `Entities: None\n`;
    }

    // Key phrases
    if (nlpFeatures.keyPhrases?.length > 0) {
      message += `Key Phrases: ${nlpFeatures.keyPhrases.join(', ')}\n`;
    } else {
      message += `Key Phrases: None\n`;
    }

    // Topics
    if (nlpFeatures.topics?.length > 0) {
      message += `Topics: ${nlpFeatures.topics.join(', ')}\n`;
    } else {
      message += `Topics: None\n`;
    }

    // Sentiment + optional polarity score
    if (nlpFeatures.sentiment) {
      const label =
        typeof nlpFeatures.sentiment === 'string'
          ? nlpFeatures.sentiment
          : (nlpFeatures.sentiment.label ?? String(nlpFeatures.sentiment));

      const capitalised = label.charAt(0).toUpperCase() + label.slice(1);
      const polarity = nlpFeatures.sentimentPolarity ?? nlpFeatures.sentiment?.score ?? '';
      const sentimentText =
        polarity !== '' ? `${capitalised} (polarity: ${polarity})` : capitalised;

      message += `Sentiment: ${sentimentText}`;
    } else {
      message += `Sentiment: Neutral`;
    }

    return message;
  }

  /**
   * POST to Groq's chat completions endpoint with exponential-backoff retry.
   *
   * @param {string} userMessage - The assembled user message.
   * @param {number} attempt     - Current attempt number (1-indexed).
   * @returns {Promise<string>}  - Raw JSON string from the model.
   */
  async _callGroqWithRetry(userMessage, attempt = 1) {
    try {
      const response = await axios.post(
        `${GROQ_BASE_URL}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Low temperature for consistent, factual output
          max_tokens: 4096,
        },
        {
          headers: {
            ...this._authHeaders(),
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Groq API returned an empty response body');
      }

      // Log token usage for monitoring
      const usage = response.data?.usage;
      if (usage) {
        logger.info('[GroqService] Token usage', {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        });
      }

      return content;
    } catch (error) {
      const status = error.response?.status;
      const isRetryable =
        !status || // network error / timeout
        status === 429 || // rate limit
        status === 500 || // server error
        status === 502 ||
        status === 503;

      logger.warn(`[GroqService] API call failed (attempt ${attempt}/${MAX_RETRIES})`, {
        error: error.message,
        status,
        retrying: isRetryable && attempt < MAX_RETRIES,
      });

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1 s, 2 s, 4 s
        logger.info(`[GroqService] Retrying in ${delay}ms...`);
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._callGroqWithRetry(userMessage, attempt + 1);
      }

      // Surface a clean, user-friendly error for auth failures
      if (status === 401) {
        throw new Error('Invalid Groq API key. Please set a valid GROQ_API_KEY in your .env file.');
      }
      if (status === 429) {
        throw new Error('Groq API rate limit exceeded. Please try again in a moment.');
      }

      throw new Error(`Groq API failed after ${MAX_RETRIES} attempts: ${error.message}`);
    }
  }

  /**
   * Parse the model's JSON string and validate / normalise against EchoNote schema.
   *
   * @param {string} rawJson - JSON string from the model.
   * @returns {object}       - Validated summary object.
   */
  _parseAndValidate(rawJson) {
    let parsed;
    try {
      parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    } catch {
      throw new Error(`Failed to parse model JSON response: ${rawJson?.slice(0, 200)}`);
    }

    const requiredFields = [
      'executiveSummary',
      'keyDecisions',
      'actionItems',
      'nextSteps',
      'keyTopics',
      'sentiment',
    ];

    const missingFields = requiredFields.filter((f) => !(f in parsed));
    if (missingFields.length > 0) {
      logger.warn('[GroqService] Response missing fields — applying defaults', { missingFields });
    }

    // Normalise action items
    const rawActions = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];
    const actionItems = rawActions
      .filter((item) => item && item.task && String(item.task).trim().length > 0)
      .map((item) => ({
        task: String(item.task).trim(),
        assignee: item.assignee ?? null,
        deadline: item.deadline ?? null,
        priority: this._normalisePriority(item.priority),
      }));

    // Normalise sentiment
    const validSentiments = ['positive', 'neutral', 'negative'];
    const rawSentiment = String(parsed.sentiment ?? '').toLowerCase();
    const sentiment = validSentiments.includes(rawSentiment) ? rawSentiment : 'neutral';

    const formatted = {
      executiveSummary: parsed.executiveSummary || 'No summary available.',
      keyDecisions: Array.isArray(parsed.keyDecisions)
        ? parsed.keyDecisions
        : parsed.keyDecisions
          ? [String(parsed.keyDecisions)]
          : [],
      actionItems,
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps
        : parsed.nextSteps
          ? [String(parsed.nextSteps)]
          : [],
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      sentiment,
    };

    // Warn if executive summary is suspiciously short
    if (formatted.executiveSummary.length < 150) {
      logger.warn('[GroqService] Executive summary is shorter than expected', {
        length: formatted.executiveSummary.length,
      });
    }

    return formatted;
  }

  /** Return Bearer auth headers for Groq requests. */
  _authHeaders() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  /** Normalise a priority string to 'high' | 'medium' | 'low'. */
  _normalisePriority(priority) {
    const valid = ['high', 'medium', 'low'];
    const lower = String(priority ?? '').toLowerCase();
    return valid.includes(lower) ? lower : 'medium';
  }
}

// Export singleton instance
module.exports = new GroqService();

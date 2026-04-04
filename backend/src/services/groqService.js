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
const SYSTEM_PROMPT = `You are an expert linguist and data extraction engine specializing in structural meeting analysis. Your task is to accurately distill a meeting transcript into actionable documentation.

You MUST respond with ONLY a single valid JSON object. Do NOT include markdown code blocks, preamble, explanations, or post-script commentary. Your response must be directly parseable by JSON.parse().

Follow this EXACT JSON schema for your output:
{
  "_reasoning_scratchpad": "<string: Your internal CoT (Chain of Thought). Step 1: Analyze SVO triplets and map them to transcript dialogue. Step 2: Extract explicit decisions and next steps. Step 3: Synthesize abstract conceptual topics. Think step-by-step here before formatting the rest.>",
  "executiveSummary": "<string: 2–5 sentence paragraph summarizing the meeting's purpose, main discussion points, and key outcomes>",
  "keyDecisions": ["<string: concise statement of decision>", ...],
  "actionItems": [
    {
      "task": "<string: clear, specific task description taking action>",
      "assignee": "<string | null: exact person responsible, or null if unknown>",
      "deadline": "<string | null: exact date/time, or null if not mentioned>",
      "priority": "<'high' | 'medium' | 'low'>"
    }
  ],
  "nextSteps": ["<string: high-level follow-up issue or risk>", ...],
  "keyTopics": ["<string: single-phrase topic>", ...],
  "sentiment": "<'positive' | 'neutral' | 'negative'>"
}

CRITICAL RULES & CONSTRAINTS:
1. REASONING FIRST: You MUST implement the "_reasoning_scratchpad" as the very first key in your JSON. Use this space to map the strict <nlp_metadata> facts to the transcript.
2. JSON ONLY: Output absolutely nothing except the JSON object.
3. NO HALLUCINATIONS: Use ONLY information from the <transcript>. Do not add outside assumptions.
4. METADATA AS ANCHORS: Use the <nlp_metadata> as verified anchor points to ensure you do not miss critical entities, or action bindings. However, you must comprehensively analyze the actual <transcript> to extract any implicit actions or decisions that the metadata may have missed.
5. EXECUTIVE SUMMARY: Must be at least 150 characters and provide objective, professional context.
6. ACTION ITEMS: Focus strictly on concrete tasks tied to explicit commitments, not hypothetical discussions.
   * Use the SVO Triplets in <nlp_metadata> as a starting point. Provide any additional action items you logically deduce from the <transcript>.
   * If an assignee or deadline is not explicitly mentioned, you MUST set them to \`null\`. Do not guess.
   * Use speaker labels (e.g. [SPEAKER_00]: or [John]:) to determine the exact assignee.
7. KEY DECISIONS & NEXT STEPS: Document unresolved issues in the \`nextSteps\` array, and explicit decisions in the \`keyDecisions\` array based purely on your reading of the <transcript>. Use empty arrays \`[]\` if none are discussed.
8. KEY TOPICS: Synthesize 3–8 high-level conceptual themes that capture the meeting's core subject matter (e.g., "Battery Life Engineering", "Q3 Marketing Strategy", "Supply Chain Architecture"). Do NOT extract simple statistical noun chunks (e.g., "device", "a lot", "the previous generation"). Topics must be abstract, conceptual categories of discussion, not literal objects mentioned.

Output your valid JSON now:`;

const FOLLOWUP_SYSTEM_PROMPT = `You are a professional communications assistant inside EchoNote. Your task is to draft a high-fidelity follow-up email based on meeting insights.
 
You MUST respond with ONLY a single valid JSON object. Do NOT include markdown code blocks.
 
Follow this EXACT JSON schema:
{
  "subject": "<string: a professional, concise email subject line starting with [EchoNote]>",
  "body": "<string: the full email body, formatted with newlines (\\n)>"
}
 
TONE CONSTRAINTS:
- FORMAL: Professional, structured, uses "Dear all", "Best regards", and objective language.
- CASUAL: Friendly, energetic, uses "Hey everyone", "Cheers/Thanks", and accessible language.
 
CONTENT STRUCTURE:
1. Opening: Brief appreciation for the time and a 1-sentence summary of the meeting's goal.
2. Decisions: A bulleted list of what was decided.
3. Action Items: A clear list of tasks, assignees, and deadlines. Format as: "• [Task] - [Assignee] (by [Deadline])".
4. Closing: Mention next steps and encourage follow-up.
 
Output your valid JSON now:`;

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
   * Generate a professional follow-up email draft.
   *
   * @param {object} meetingData - { title, summary, attendees }.
   * @param {string} tone        - 'formal' | 'casual'.
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async generateFollowUpEmail(meetingData, tone = 'formal') {
    try {
      logger.info('[GroqService] Starting follow-up email generation', {
        meetingId: meetingData.id,
        tone,
      });

      const userMessage = `
Meeting Title: ${meetingData.title}
Tone Requested: ${tone.toUpperCase()}

EXECUTIVE SUMMARY:
${meetingData.summary?.executiveSummary || ''}

KEY DECISIONS:
${(meetingData.summary?.keyDecisions || []).join('\n')}

ACTION ITEMS:
${(meetingData.summary?.actionItems || [])
  .map((a) => `- ${a.task} (Assignee: ${a.assignee || 'Unassigned'}, Due: ${a.deadline || 'TBD'})`)
  .join('\n')}

NEXT STEPS:
${(meetingData.summary?.nextSteps || []).join('\n')}

ATTENDEES:
${JSON.stringify(meetingData.attendees || [])}
`;

      const rawJson = await this._callGroqWithRetry(userMessage, 1, FOLLOWUP_SYSTEM_PROMPT);
      const parsed = JSON.parse(rawJson);

      return {
        success: true,
        data: {
          subject: parsed.subject || `Follow-up: ${meetingData.title}`,
          body: parsed.body || 'Failed to generate email body.',
        },
      };
    } catch (error) {
      logger.error('[GroqService] Follow-up generation failed', { error: error.message });
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
    const transcriptBlock = `<transcript>\n${transcript}\n</transcript>`;

    if (!nlpFeatures) {
      return transcriptBlock;
    }

    // Log received features during development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[GroqService] NLP features received', {
        entities: nlpFeatures.entities?.length ?? 0,
        keyPhrases: nlpFeatures.keyPhrases?.length ?? 0,
        svoTriplets: nlpFeatures.svoTriplets?.length ?? 0,
        questions: nlpFeatures.questions?.length ?? 0,
        topics: nlpFeatures.topics?.length ?? 0,
        sentiment: nlpFeatures.sentiment,
      });
    }

    let message = `${transcriptBlock}\n\n<nlp_metadata>\n`;

    // Entities — already formatted as "Name (LABEL)" strings by summarization.service.js
    if (nlpFeatures.entities?.length > 0) {
      message += `Entities: ${nlpFeatures.entities.join(', ')}\n`;
    } else {
      message += `Entities: None\n`;
    }

    // SVO Triplets
    if (nlpFeatures.svoTriplets?.length > 0) {
      const svoStrs = nlpFeatures.svoTriplets.map(
        (t) => `[${t.subject} -> ${t.verb} -> ${t.object}]`
      );
      message += `SVO Triplets: ${svoStrs.join(', ')}\n`;
    } else {
      message += `SVO Triplets: None\n`;
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

    message += `\n</nlp_metadata>`;
    return message;
  }

  /**
   * POST to Groq's chat completions endpoint with exponential-backoff retry.
   *
   * @param {string} userMessage   - The assembled user message.
   * @param {number} attempt       - Current attempt number (1-indexed).
   * @param {string} systemPrompt  - The system prompt to use.
   * @returns {Promise<string>}    - Raw JSON string from the model.
   */
  async _callGroqWithRetry(userMessage, attempt = 1, systemPrompt = SYSTEM_PROMPT) {
    try {
      const response = await axios.post(
        `${GROQ_BASE_URL}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
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

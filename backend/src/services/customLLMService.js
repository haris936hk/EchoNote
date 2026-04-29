const { Groq } = require('groq-sdk');
const logger = require('../utils/logger');

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_TIMEOUT_MS = 30_000;

const SUMMARY_JSON_SCHEMA = {
  name: 'meeting_summary',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      executiveSummary: { type: 'string' },
      keyDecisions: { type: 'array', items: { type: 'string' } },
      actionItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            assignee: { type: ['string', 'null'] },
            deadline: { type: ['string', 'null'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            sourceQuote: { type: ['string', 'null'] },
          },
          required: ['task', 'assignee', 'deadline', 'priority', 'confidence', 'sourceQuote'],
          additionalProperties: false,
        },
      },
      nextSteps: { type: 'array', items: { type: 'string' } },
      keyTopics: { type: 'array', items: { type: 'string' } },
      sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    },
    required: [
      'executiveSummary',
      'keyDecisions',
      'actionItems',
      'nextSteps',
      'keyTopics',
      'sentiment',
    ],
    additionalProperties: false,
  },
};

const VERIFICATION_JSON_SCHEMA = {
  name: 'verification_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      verified: { type: 'boolean' },
      corrections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            issue: { type: 'string' },
            reasoning: { type: 'string' },
            correction: { type: 'string' },
          },
          required: ['field', 'issue', 'reasoning', 'correction'],
          additionalProperties: false,
        },
      },
    },
    required: ['verified', 'corrections'],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `You are an expert linguist and data extraction engine specializing in structural meeting analysis. Your task is to accurately distill a meeting transcript into actionable documentation.

You MUST respond with ONLY a single valid JSON object matching the provided schema.

CRITICAL RULES & CONSTRAINTS:
1. NO HALLUCINATIONS: Use ONLY information from the <transcript>. Do not add outside assumptions.
2. METADATA AS ANCHORS: Use <nlp_metadata> (SpaCy NLP), <asr_metadata> (ASR engine intelligence), <action_signals> (pre-detected commitment patterns), <questions> (unresolved questions), and <speaker_map> (speaker-entity associations) as verified anchor points. Cross-reference your analysis against these signals.
3. EXECUTIVE SUMMARY: Must be at least 150 characters and provide objective, professional context. Summarize the meeting's purpose, main discussion points, and key outcomes in 2-5 sentences.
4. ACTION ITEMS — PRECISION IS CRITICAL:
   * Extract ONLY concrete tasks tied to explicit commitments. See the examples below.
   * CROSS-REFERENCE with <action_signals>: these are pre-detected commitment phrases from the transcript. Use them as primary evidence. If an action signal exists, it is VERY LIKELY a real action item.
   * If an assignee or deadline is not explicitly mentioned, you MUST set them to null. Do not guess.
   * Use <speaker_map> to help attribute entities to the correct speakers.
   * Use speaker labels (e.g. [SPEAKER_00]: or [John]:) to determine the exact assignee.
   * For "confidence": use "high" for explicitly stated commitments, "medium" for implied tasks, "low" for speculative items.
   * For "sourceQuote": include the approximate source quote (under 100 characters) from the transcript that justifies this extraction. Set to null if no direct quote exists.
5. KEY DECISIONS & NEXT STEPS: Document unresolved issues in nextSteps, and explicit decisions in keyDecisions. Use <questions> to identify unresolved issues for nextSteps. Use empty arrays [] if none are discussed.
6. KEY TOPICS: Synthesize 3-8 high-level conceptual themes (e.g., "Battery Life Engineering", "Q3 Marketing Strategy"). If <asr_metadata> provides detected topics, use them as a baseline and expand. Do NOT extract simple noun chunks.
7. SENTIMENT: Analyze the overall tone based on the FULL transcript context.

EXTRACTION EXAMPLES (follow these patterns for action items):

✅ EXTRACT as action item:
"[SPEAKER_01]: I'll send the updated spec to the team by Thursday."
→ {"task": "Send updated spec to team", "assignee": "SPEAKER_01", "deadline": "Thursday", "priority": "high", "confidence": "high", "sourceQuote": "I'll send the updated spec to the team by Thursday"}

✅ EXTRACT with medium confidence:
"[SPEAKER_00]: Someone needs to update the documentation before we ship."
→ {"task": "Update documentation before shipping", "assignee": null, "deadline": null, "priority": "medium", "confidence": "medium", "sourceQuote": "Someone needs to update the documentation before we ship"}

❌ DO NOT EXTRACT as action item:
"[SPEAKER_02]: We should probably think about redesigning the onboarding flow at some point."
→ This is a suggestion, not a commitment. Do not include.

❌ DO NOT EXTRACT as action item:
"[SPEAKER_00]: Has anyone looked into the pricing changes?"
→ This is a question, not an action item. Only extract if someone explicitly commits to investigating.

Output your valid JSON now:`;

const CATEGORY_SUPPLEMENTS = {
  STANDUP: `\nADDITIONAL CONTEXT: This is a daily standup meeting. Focus on:
- Blockers and impediments (mark as high priority action items)
- Status updates per team member
- Items requiring escalation
- Keep action items specific to today's commitments only.`,

  SALES: `\nADDITIONAL CONTEXT: This is a sales/client meeting. Focus on:
- Client requirements and pain points
- Commitments made to the client (these are HIGH priority)
- Follow-up deadlines and next meeting scheduling
- Pricing or commercial terms discussed
- Any competitive intelligence mentioned.`,

  RETROSPECTIVE: `\nADDITIONAL CONTEXT: This is a retrospective/post-mortem. Focus on:
- What went well (capture in keyDecisions as positive patterns)
- What needs improvement (concrete action items for fixes)
- Root causes of issues discussed
- Process improvements agreed upon.`,

  INTERVIEW: `\nADDITIONAL CONTEXT: This is an interview. Focus on:
- Candidate qualifications and experience mentioned
- Technical assessment outcomes or impressions
- Cultural fit observations
- Hiring decision or next steps in the process.`,

  PLANNING: `\nADDITIONAL CONTEXT: This is a planning meeting. Focus on:
- Scope decisions and priority rankings
- Resource allocation and ownership assignments
- Timeline commitments and milestone deadlines
- Dependencies identified between teams or workstreams.`,

  ONE_ON_ONE: `\nADDITIONAL CONTEXT: This is a 1:1 meeting. Focus on:
- Career development goals discussed
- Feedback given in either direction
- Follow-up commitments from both parties
- Blockers or concerns raised.`,
};

const VERIFICATION_SYSTEM_PROMPT = `You are a critical fact-checker for AI-generated meeting summaries. Your job is to verify the accuracy of the <summary> against the <transcript>.

Check EACH of the following:

FOR EACH ACTION ITEM:
1. Was this task EXPLICITLY committed to in the transcript (not just discussed or suggested)?
2. Is the assignee correct based on speaker labels?
3. Is the deadline accurate, or was it fabricated?
4. Is the sourceQuote actually present (approximately) in the transcript?

FOR THE EXECUTIVE SUMMARY:
1. Does every claim have support in the transcript?
2. Is anything important omitted?

FOR KEY DECISIONS:
1. Were these actually decided, or just discussed?

Return a JSON object with "verified" (boolean) and "corrections" (array of issues found). If everything is accurate, return {"verified": true, "corrections": []}.

CRITICAL JSON RULES FOR CORRECTIONS:
1. "reasoning": Use this field FIRST to step-by-step explain your logical deduction about why the original value is incorrect and what the correct value should be based on the transcript.
2. "correction": This field MUST NOT contain any sentences. It MUST be exclusively the EXACT primitive replacement value (e.g., 'null', 'Marcus', 'Friday').`;

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

class CustomLLMService {
  constructor() {
    this.apiKey = process.env.CUSTOM_LLM_API_KEY || '';
    this.model = DEFAULT_MODEL;
    this.timeout = parseInt(process.env.CUSTOM_LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

    this.client = new Groq({
      apiKey: this.apiKey,
      timeout: this.timeout,
    });

    if (!this.apiKey) {
      logger.warn(
        '[CustomLLMService] CUSTOM_LLM_API_KEY is not set. Summarization will fail until it is configured.'
      );
    }

    logger.info('[CustomLLMService] Initialized', { model: this.model });
  }

  async generateSummary(transcript, nlpFeatures = null, options = {}) {
    try {
      const { category = null, enableVerification = true } = options;

      logger.info('[CustomLLMService] Starting summary generation', {
        transcriptLength: transcript?.length ?? 0,
        hasNlpFeatures: !!nlpFeatures,
        category,
        model: this.model,
      });

      const systemPrompt = this._buildSystemPrompt(category);

      const userMessage = this._buildUserMessage(transcript, nlpFeatures);

      const maxTokens = this._calculateMaxTokens(userMessage);

      const rawJson = await this._callWithRetry(
        userMessage,
        1,
        systemPrompt,
        SUMMARY_JSON_SCHEMA,
        maxTokens
      );

      let formattedSummary = this._parseAndValidate(rawJson);

      if (enableVerification && transcript.length > 200) {
        formattedSummary = await this._verifyAndCorrect(formattedSummary, transcript);
      }

      logger.info('[CustomLLMService] Summary generation successful', {
        hasActionItems: formattedSummary.actionItems?.length > 0,
        actionItemCount: formattedSummary.actionItems?.length ?? 0,
        sentiment: formattedSummary.sentiment,
        verified: enableVerification,
      });

      return { success: true, data: formattedSummary };
    } catch (error) {
      logger.error('[CustomLLMService] Summary generation failed', {
        error: error.message,
        stack: error.stack,
      });

      return { success: false, error: error.message };
    }
  }

  async generateFollowUpEmail(meetingData, tone = 'formal') {
    try {
      logger.info('[CustomLLMService] Starting follow-up email generation', {
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

      const rawJson = await this._callWithRetry(userMessage, 1, FOLLOWUP_SYSTEM_PROMPT);
      const parsed = JSON.parse(rawJson);

      return {
        success: true,
        data: {
          subject: parsed.subject || `Follow-up: ${meetingData.title}`,
          body: parsed.body || 'Failed to generate email body.',
        },
      };
    } catch (error) {
      logger.error('[CustomLLMService] Follow-up generation failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.models.list();

      const models = response.data ?? [];
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
      logger.error('[CustomLLMService] Health check failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  _buildSystemPrompt(category) {
    let prompt = SYSTEM_PROMPT;
    if (category && CATEGORY_SUPPLEMENTS[category]) {
      prompt += CATEGORY_SUPPLEMENTS[category];
    }
    return prompt;
  }

  _buildUserMessage(transcript, nlpFeatures) {
    const transcriptBlock = `<transcript>\n${transcript}\n</transcript>`;

    if (!nlpFeatures) {
      return transcriptBlock;
    }

    if (process.env.NODE_ENV === 'development') {
      logger.debug('[CustomLLMService] NLP features received', {
        entities: nlpFeatures.entities?.length ?? 0,
        svoTriplets: nlpFeatures.svoTriplets?.length ?? 0,
        actionSignals: nlpFeatures.actionSignals?.length ?? 0,
        questions: nlpFeatures.questions?.length ?? 0,
        speakerEntityMap: Object.keys(nlpFeatures.speakerEntityMap || {}).length,
        deepgramEntities: nlpFeatures.deepgramEntities?.length ?? 0,
        deepgramTopics: nlpFeatures.deepgramTopics?.length ?? 0,
        deepgramIntents: nlpFeatures.deepgramIntents?.length ?? 0,
        lowConfidenceWords: nlpFeatures.lowConfidenceWords?.length ?? 0,
      });
    }

    let message = `${transcriptBlock}\n\n<nlp_metadata>\n`;

    if (nlpFeatures.entities?.length > 0) {
      message += `Entities: ${nlpFeatures.entities.join(', ')}\n`;
    } else {
      message += `Entities: None\n`;
    }

    if (nlpFeatures.svoTriplets?.length > 0) {
      const svoStrs = nlpFeatures.svoTriplets.map(
        (t) => `[${t.subject} -> ${t.verb} -> ${t.object}]`
      );
      message += `SVO Triplets: ${svoStrs.join(', ')}\n`;
    } else {
      message += `SVO Triplets: None\n`;
    }

    if (nlpFeatures.nlpMetadata?.sentenceCount) {
      const meta = nlpFeatures.nlpMetadata;
      message += `Stats: ${meta.sentenceCount} sentences, ${meta.wordCount} words\n`;
    }

    message += `</nlp_metadata>`;

    if (nlpFeatures.actionSignals?.length > 0) {
      message += `\n\n<action_signals>\n`;
      for (const signal of nlpFeatures.actionSignals) {
        const speaker = signal.speaker ? ` (${signal.speaker})` : '';
        message += `- "${signal.text}"${speaker}\n`;
      }
      message += `</action_signals>`;
    }

    if (nlpFeatures.questions?.length > 0) {
      message += `\n\n<questions>\n`;
      for (const q of nlpFeatures.questions) {
        message += `- ${q.text}\n`;
      }
      message += `</questions>`;
    }

    if (nlpFeatures.speakerEntityMap && Object.keys(nlpFeatures.speakerEntityMap).length > 0) {
      message += `\n\n<speaker_map>\n`;
      for (const [speaker, entities] of Object.entries(nlpFeatures.speakerEntityMap)) {
        message += `${speaker}: ${entities.join(', ')}\n`;
      }
      message += `</speaker_map>`;
    }

    if (
      nlpFeatures.deepgramEntities?.length > 0 ||
      nlpFeatures.deepgramTopics?.length > 0 ||
      nlpFeatures.deepgramIntents?.length > 0
    ) {
      message += `\n\n<asr_metadata>\n`;

      if (nlpFeatures.deepgramEntities?.length > 0) {
        const entityStrs = nlpFeatures.deepgramEntities.map((e) => `${e.text} (${e.label})`);
        message += `ASR Entities (high confidence): ${entityStrs.join(', ')}\n`;
      }

      if (nlpFeatures.deepgramTopics?.length > 0) {
        const topicStrs = nlpFeatures.deepgramTopics.map((t) => t.topic);
        message += `ASR Topics: ${topicStrs.join(', ')}\n`;
      }

      if (nlpFeatures.deepgramIntents?.length > 0) {
        const intentStrs = nlpFeatures.deepgramIntents.map(
          (i) => `${i.intent} (${(i.confidence * 100).toFixed(0)}%)`
        );
        message += `ASR Intents: ${intentStrs.join(', ')}\n`;
      }

      message += `</asr_metadata>`;
    }

    if (nlpFeatures.lowConfidenceWords?.length > 0) {
      message += `\n\n<transcript_quality>\n`;

      const lcWords = nlpFeatures.lowConfidenceWords
        .map((w) => `"${w.word}" (${(w.confidence * 100).toFixed(0)}%)`)
        .slice(0, 100);

      message += `Low-confidence words (treat cautiously): ${lcWords.join(', ')}\n`;
      message += `</transcript_quality>`;
    }

    return message;
  }

  _calculateMaxTokens(userMessage) {
    const inputTokenEstimate = Math.ceil(userMessage.length / 4);
    return Math.min(4096, Math.max(1024, Math.ceil(inputTokenEstimate * 0.5)));
  }

  async _callWithRetry(
    userMessage,
    attempt = 1,
    systemPrompt = SYSTEM_PROMPT,
    jsonSchema = null,
    maxTokens = 4096
  ) {
    try {

      const finalSystemPrompt = jsonSchema
        ? `${systemPrompt}\n\nStrict JSON Format required:\n${JSON.stringify(jsonSchema, null, 2)}`
        : systemPrompt;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: maxTokens,
        stream: false,
      });

      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('LLM API returned an empty response body');
      }

      const usage = response.usage;
      if (usage) {
        logger.info('[CustomLLMService] Token usage', {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        });
      }

      return content;
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid API key. Please set a valid CUSTOM_LLM_API_KEY in your .env file.');
      }
      if (error.status === 429) {
        throw new Error('LLM API rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(`LLM API request failed: ${error.message}`);
    }
  }

  async _verifyAndCorrect(summary, transcript) {
    try {
      logger.info('[CustomLLMService] Starting verification pass');
      const startTime = Date.now();

      const userMessage = `<transcript>\n${transcript}\n</transcript>\n\n<summary>\n${JSON.stringify(summary, null, 2)}\n</summary>`;

      const rawJson = await this._callWithRetry(
        userMessage,
        1,
        VERIFICATION_SYSTEM_PROMPT,
        VERIFICATION_JSON_SCHEMA,
        1024
      );

      const verification = JSON.parse(rawJson);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (verification.verified) {
        logger.info(`[CustomLLMService] Verification passed in ${duration}s — no corrections needed`);
        return summary;
      }

      logger.info(
        `[CustomLLMService] Verification found ${verification.corrections.length} issues in ${duration}s`
      );

      const corrected = { ...summary };

      for (const correction of verification.corrections) {
        const { field, issue, correction: fix } = correction;
        logger.warn(`[CustomLLMService] Correction: ${field} — ${issue}`);

        if (field.startsWith('actionItems[') && issue.toLowerCase().includes('not committed')) {
          const match = field.match(/actionItems\[(\d+)\]/);
          if (match) {
            const idx = parseInt(match[1]);
            if (corrected.actionItems[idx]) {
              logger.info(
                `[CustomLLMService] Removing hallucinated action item: "${corrected.actionItems[idx].task}"`
              );
              corrected.actionItems[idx] = null;
            }
          }
        }

        if (field.includes('.assignee') && fix) {
          const match = field.match(/actionItems\[(\d+)\]/);
          if (match) {
            const idx = parseInt(match[1]);
            if (corrected.actionItems[idx]) {
              corrected.actionItems[idx].assignee = fix === 'null' ? null : fix;
            }
          }
        }

        if (field.includes('.deadline') && fix) {
          const match = field.match(/actionItems\[(\d+)\]/);
          if (match) {
            const idx = parseInt(match[1]);
            if (corrected.actionItems[idx]) {
              corrected.actionItems[idx].deadline = fix === 'null' ? null : fix;
            }
          }
        }

        if (field === 'executiveSummary' && fix) {
          corrected.executiveSummary = fix;
        }
      }

      corrected.actionItems = corrected.actionItems.filter((item) => item !== null);

      return corrected;
    } catch (error) {

      logger.warn(
        `[CustomLLMService] Verification pass failed, using original summary: ${error.message}`
      );
      return summary;
    }
  }

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
      logger.warn('[CustomLLMService] Response missing fields — applying defaults', { missingFields });
    }

    const rawActions = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];
    const actionItems = rawActions
      .filter((item) => item && item.task && String(item.task).trim().length > 0)
      .map((item) => ({
        task: String(item.task).trim(),
        assignee: item.assignee ?? null,
        deadline: item.deadline ?? null,
        priority: this._normalisePriority(item.priority),
        confidence: this._normaliseConfidence(item.confidence),
        sourceQuote: item.sourceQuote ?? null,
      }));

    const validSentiments = ['positive', 'neutral', 'negative'];
    const rawSentiment = String(parsed.sentiment ?? '').toLowerCase();
    const sentiment = validSentiments.includes(rawSentiment) ? rawSentiment : 'neutral';

    const topicsRaw = Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [];
    const topicsSeen = new Set();
    const keyTopics = topicsRaw.filter((t) => {
      const lower = String(t).toLowerCase().trim();
      if (topicsSeen.has(lower)) return false;
      topicsSeen.add(lower);
      return true;
    });

    const decisionsRaw = Array.isArray(parsed.keyDecisions)
      ? parsed.keyDecisions
      : parsed.keyDecisions
        ? [String(parsed.keyDecisions)]
        : [];
    const decisionsSeen = new Set();
    const keyDecisions = decisionsRaw.filter((d) => {
      const lower = String(d).toLowerCase().trim();
      if (decisionsSeen.has(lower)) return false;
      decisionsSeen.add(lower);
      return true;
    });

    const formatted = {
      executiveSummary: parsed.executiveSummary || 'No summary available.',
      keyDecisions,
      actionItems,
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps
        : parsed.nextSteps
          ? [String(parsed.nextSteps)]
          : [],
      keyTopics,
      sentiment,
    };

    if (formatted.executiveSummary.length < 150) {
      logger.warn('[CustomLLMService] Executive summary is shorter than expected', {
        length: formatted.executiveSummary.length,
      });
    }

    return formatted;
  }

  _normalisePriority(raw) {
    const valid = ['high', 'medium', 'low'];
    const normalised = String(raw ?? '')
      .toLowerCase()
      .trim();
    return valid.includes(normalised) ? normalised : 'medium';
  }

  _normaliseConfidence(raw) {
    const valid = ['high', 'medium', 'low'];
    const normalised = String(raw ?? '')
      .toLowerCase()
      .trim();
    return valid.includes(normalised) ? normalised : 'medium';
  }
}

module.exports = new CustomLLMService();

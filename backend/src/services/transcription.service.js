// backend/src/services/transcription.service.js
// Transcription service using Deepgram SDK

const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { DeepgramClient } = require('@deepgram/sdk');


const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});


const initialize = async () => {
  try {
    logger.info(`🎬 Initializing transcription service (Deepgram)...`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to initialize transcription service: ${error.message}`);
    return false;
  }
};

/**
 * Helper: Count words in text
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
const countWords = (text) => {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

/**
 * Helper: Check transcript completeness
 * @param {string} text - Transcript text
 * @returns {string} Completeness status
 */
const checkCompleteness = (text) => {
  if (!text) return 'empty';
  const wordCount = countWords(text);
  if (wordCount < 10) return 'very_short';
  if (wordCount < 50) return 'short';
  if (wordCount < 200) return 'medium';
  return 'complete';
};

/**
 * Compute weighted average confidence from Deepgram per-word data
 * @param {Array} words - Deepgram words array [{word, confidence, start, end}, ...]
 * @returns {number} Weighted average confidence (0-1)
 */
const computeWordConfidence = (words) => {
  if (!words || words.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const w of words) {
    
    const duration = (w.end || 0) - (w.start || 0);
    const weight = Math.max(duration, 0.01); 
    weightedSum += (w.confidence || 0) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

/**
 * Extract unique entities from Deepgram detect_entities response
 * @param {Object} result - Deepgram result object
 * @returns {Array} Deduplicated entities [{text, label, confidence}, ...]
 */
const extractDeepgramEntities = (result) => {
  const entityResults = result.results?.entities?.segments || [];
  const entityMap = new Map();

  for (const segment of entityResults) {
    if (!segment.detected_entities) continue;
    for (const entity of segment.detected_entities) {
      const key = `${entity.value}::${entity.entity_type}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          text: entity.value,
          label: entity.entity_type,
          confidence: entity.confidence || 1.0,
        });
      }
    }
  }

  return Array.from(entityMap.values());
};

/**
 * Extract topics from Deepgram topics response
 * @param {Object} result - Deepgram result object
 * @returns {Array} Topics [{topic, confidence}, ...]
 */
const extractDeepgramTopics = (result) => {
  const topicSegments = result.results?.topics?.segments || [];
  const topicMap = new Map();

  for (const segment of topicSegments) {
    if (!segment.topics) continue;
    for (const topicGroup of segment.topics) {
      const topic = topicGroup.topic;
      if (topic && !topicMap.has(topic)) {
        topicMap.set(topic, {
          topic,
          confidence: topicGroup.confidence || 1.0,
        });
      }
    }
  }

  return Array.from(topicMap.values());
};

/**
 * Extract intents from Deepgram intents response
 * @param {Object} result - Deepgram result object
 * @returns {Array} Intents [{intent, confidence}, ...]
 */
const extractDeepgramIntents = (result) => {
  const intentSegments = result.results?.intents?.segments || [];
  const intentMap = new Map();

  for (const segment of intentSegments) {
    if (!segment.intents) continue;
    for (const intentGroup of segment.intents) {
      const intent = intentGroup.intent;
      if (intent && !intentMap.has(intent)) {
        intentMap.set(intent, {
          intent,
          confidence: intentGroup.confidence || 1.0,
        });
      }
    }
  }

  return Array.from(intentMap.values());
};

/**
 * Extract individual low confidence words for downstream LLM awareness
 * @param {Array} words - Deepgram words array
 * @returns {Array} Low confidence words
 */
const extractLowConfidenceWords = (words) => {
  if (!words || words.length === 0) return [];
  return words
    .filter((w) => w.confidence < 0.7 && w.word && w.word.length > 2)
    .map((w) => ({
      word: w.word,
      confidence: w.confidence,
      start: w.start,
    }));
};

/**
 * Transcribe audio using Deepgram API
 * @param {string} audioPath - Path to audio file
 * @param {Object} options - Transcription options
 * @returns {Object} Transcription result
 */
const transcribeAudio = async (audioPath, options = {}) => {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      throw new Error('Deepgram API key not configured in .env');
    }

    const deepgram = new DeepgramClient({ apiKey });
    const startTime = Date.now();

    logger.info(`🚀 Sending to Deepgram: ${path.basename(audioPath)}`);

    const deepgramOptions = {
      model: options.model || 'nova-3',
      smart_format: true,
      diarize: true,
      utterances: true,
      punctuate: true,
      paragraphs: true,
      language: options.language || 'en',
      
      detect_entities: true,
      topics: true,
      intents: true,
      
      filler_words: false,
      
      keyterm: [
        'EchoNote',
        'Supabase',
        'Prisma',
        'Deepgram',
        'LLM',
        'standup',
        'retrospective',
        'backlog',
        'blocker',
        'escalation',
        'dependency',
        ...(options.keywords || options.keyterm || []),
      ],
    };

    let response = null;
    let attempt = 1;
    const maxRetries = 3;

    while (attempt <= maxRetries) {
      try {
       
        const audioStream = fs.createReadStream(audioPath);
        response = await deepgram.listen.v1.media.transcribeFile(audioStream, deepgramOptions);

        
        if (response.error) {
          throw new Error(response.error.message || 'Deepgram API error');
        }

        break; 
      } catch (error) {
        const status = error.response?.status || error.status;
        const isRetryable = !status || status === 429 || status >= 500;

        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        const delayMs = 1000 * Math.pow(2, attempt - 1);
        logger.warn(
          `Deepgram API call failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${delayMs}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
      }
    }

    const result = response;

    if (!result) {
      throw new Error('Deepgram API returned an empty result');
    }

    const alternative = result.results?.channels?.[0]?.alternatives?.[0];
    const paragraphsTranscript = result.results?.paragraphs?.transcript;
    const rawTranscript = alternative?.transcript || '';


    const transcript = paragraphsTranscript || rawTranscript;
    const utterances = result.results?.utterances || [];

    
    const words = alternative?.words || [];
    const wordConfidence = computeWordConfidence(words);

    
    const deepgramEntities = extractDeepgramEntities(result);
    const deepgramTopics = extractDeepgramTopics(result);
    const deepgramIntents = extractDeepgramIntents(result);
    const lowConfidenceWords = extractLowConfidenceWords(words);

   
    const segments = utterances.map((u) => ({
      start: u.start,
      end: u.end,
      text: u.transcript.trim(),
      speaker:
        u.speaker !== undefined ? `SPEAKER_${u.speaker.toString().padStart(2, '0')}` : 'SPEAKER_00',
      confidence: u.confidence,
    }));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Deepgram transcription completed in ${duration}s`);
    logger.info(
      `📊 Confidence: ${(wordConfidence * 100).toFixed(1)}%, Entities: ${deepgramEntities.length}, Topics: ${deepgramTopics.length}`
    );

    return {
      success: true,
      text: transcript,
      segments: segments,
      language: result.metadata?.language || 'en',
      wordCount: countWords(transcript),
      confidence: wordConfidence || alternative?.confidence || 0,
      processingTime: parseFloat(duration),
      model: result.metadata?.model_info?.name || 'nova-3',
      method: 'deepgram',
      
      deepgramEntities,
      deepgramTopics,
      deepgramIntents,
      lowConfidenceWords,
    };
  } catch (error) {
    logger.error(`❌ Deepgram transcription failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get transcription quality metrics
 * @param {string} audioPath - Path to audio file
 * @param {string} transcriptText - Transcribed text
 * @returns {Object} Quality metrics
 */
const getTranscriptionQuality = async (audioPath, transcriptText) => {
  try {
    logger.info(`📊 Analyzing transcription quality`);

    const wordCount = countWords(transcriptText);

    const quality = {
      wordCount,
      characterCount: transcriptText.length,
      completeness: checkCompleteness(transcriptText),
    };

    logger.info(`✅ Quality analysis complete`);
    return quality;
  } catch (error) {
    logger.error(`❌ Quality analysis failed: ${error.message}`);
    return null;
  }
};

/**
 * Format transcript with paragraphs
 * @param {Array<Object>} segments - Transcript segments with timestamps
 * @returns {string} Formatted transcript
 */
const formatTranscriptWithParagraphs = (segments) => {
  if (!segments || segments.length === 0) return '';

  let formatted = '';
  let currentParagraph = '';
  const paragraphDuration = 30; 

  segments.forEach((segment, index) => {
    currentParagraph += segment.text + ' ';

    const isLongPause = index < segments.length - 1 && segments[index + 1].start - segment.end > 2;
    const isParagraphLong =
      segment.end - segments.find((s) => currentParagraph.includes(s.text))?.start >
      paragraphDuration;
    const isLastSegment = index === segments.length - 1;

    if (isParagraphLong || isLongPause || isLastSegment) {
      formatted += currentParagraph.trim() + '\n\n';
      currentParagraph = '';
    }
  });

  return formatted.trim();
};

/**
 * Extract speaker diarization
 * @param {string} audioPath - Path to audio file
 * @returns {Object} Speaker segments
 */

const extractSpeakers = async (audioPath) => {
  logger.warn('⚠️ Speaker diarization is handled natively by Deepgram');

  return {
    success: false,
    speakers: [],
    message: 'Speaker diarization depends on transcription results natively.',
  };
};

module.exports = {
  transcribeAudio,
  getTranscriptionQuality,
  formatTranscriptWithParagraphs,
  extractSpeakers,
  countWords,
  initialize,
};

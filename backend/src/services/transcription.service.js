// backend/src/services/transcription.service.js
// Transcription service using Deepgram SDK

const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { DeepgramClient } = require('@deepgram/sdk');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

/**
 * Initialize the transcription service
 */
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
 * Helper: Estimate transcription accuracy
 * Based on heuristics (words per second, average word length)
 * @param {number} wps - Words per second
 * @param {number} awl - Average word length
 * @returns {number} Estimated accuracy percentage
 */
const estimateAccuracy = (wps, awl) => {
  let accuracy = 90; // Base accuracy

  // Adjust for speech rate
  if (wps < 1.5 || wps > 4) accuracy -= 5;
  if (wps < 1 || wps > 5) accuracy -= 10;

  // Adjust for word length
  if (awl < 3 || awl > 8) accuracy -= 5;
  if (awl < 2 || awl > 10) accuracy -= 10;

  return Math.max(50, Math.min(95, accuracy));
};

/**
 * Helper: Calculate confidence score
 * @param {string} text - Transcript text
 * @returns {number} Confidence score (0-1)
 */
const calculateConfidence = (text) => {
  if (!text) return 0;

  const wordCount = countWords(text);
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = uniqueWords.size / wordCount;

  let confidence = 0.8;

  if (wordCount < 10) confidence -= 0.2;
  if (wordCount < 5) confidence -= 0.3;

  if (repetitionRatio < 0.4) confidence -= 0.2;
  if (repetitionRatio < 0.2) confidence -= 0.3;

  return Math.max(0, Math.min(1, confidence));
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

    const audioStream = fs.createReadStream(audioPath);

    const response = await deepgram.listen.v1.media.transcribeFile(audioStream, {
      model: options.model || 'nova-2',
      smart_format: true,
      diarize: true,
      utterances: true,
      punctuate: true,
      paragraphs: true,
      language: options.language || 'en',
    });

    const result = response;

    if (!result) {
      throw new Error('Deepgram API returned an empty result');
    }

    const alternative = result.results?.channels?.[0]?.alternatives?.[0];
    const paragraphsTranscript = result.results?.paragraphs?.transcript;
    const rawTranscript = alternative?.transcript || '';

    // Prefer the paragraph-formatted transcript if it contains speaker labels
    const transcript = paragraphsTranscript || rawTranscript;
    const utterances = result.results?.utterances || [];

    // Map Deepgram utterances to our internal segments format
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

    return {
      success: true,
      text: transcript,
      segments: segments,
      language: result.metadata?.language || 'en',
      wordCount: countWords(transcript),
      confidence: alternative?.confidence || 1.0,
      processingTime: parseFloat(duration),
      model: result.metadata?.model_info?.name || 'nova-2',
      method: 'deepgram',
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
    const characterCount = transcriptText.length;
    const averageWordLength = characterCount / wordCount;

    const audioMetadata = require('./audio.service').getAudioMetadata;
    const metadata = await audioMetadata(audioPath);
    const wordsPerSecond = wordCount / metadata.duration;

    const quality = {
      wordCount,
      characterCount,
      averageWordLength: averageWordLength.toFixed(2),
      wordsPerSecond: wordsPerSecond.toFixed(2),
      estimatedAccuracy: estimateAccuracy(wordsPerSecond, averageWordLength),
      confidence: calculateConfidence(transcriptText),
      completeness: checkCompleteness(transcriptText),
    };

    logger.info(`✅ Quality analysis complete: ${quality.estimatedAccuracy}% estimated accuracy`);
    return quality;
  } catch (error) {
    logger.error(`❌ Quality analysis failed: ${error.message}`);
    return null;
  }
};

/**
 * Clean and format transcript text
 * @param {string} text - Raw transcript text
 * @returns {string} Cleaned text
 */
const cleanTranscript = (text) => {
  if (!text) return '';

  let cleaned = text;
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/(^\w|\.\s+\w)/g, (letter) => letter.toUpperCase());

  const fillers = [' um ', ' uh ', ' like ', ' you know '];
  fillers.forEach((filler) => {
    const regex = new RegExp(filler, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
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
  const paragraphDuration = 30; // Seconds per paragraph

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
// eslint-disable-next-line no-unused-vars
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
  cleanTranscript,
  formatTranscriptWithParagraphs,
  extractSpeakers,
  countWords,
  initialize,
};

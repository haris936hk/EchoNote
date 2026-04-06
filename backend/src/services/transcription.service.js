// backend/src/services/transcription.service.js
// Transcription service using Whisper ASR

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const axios = require('axios');
const { DeepgramClient } = require('@deepgram/sdk');

// Persistent transcription server state
let transcriptionServerProcess = null;
const SERVER_URL = process.env.TRANSCRIPTION_SERVER_URL || 'http://127.0.0.1:8765';
const SERVER_PORT = parseInt(process.env.TRANSCRIPTION_SERVER_PORT || '8765');

/**
 * Health check for the transcription microservice
 */
const checkHealth = async () => {
  try {
    const response = await axios.get(`${SERVER_URL}/health`, { timeout: 2000 });
    return response.status === 200 && response.data.status === 'ready';
  } catch (error) {
    return false;
  }
};

/**
 * Start the long-lived Python transcription server if not already running
 */
const ensureServer = async () => {
  // 1. Check if already healthy
  const isHealthy = await checkHealth();
  if (isHealthy) return true;

  if (transcriptionServerProcess) {
    logger.warn('⚠️ Transcription server process exists but is unresponsive. Attempting restart.');
    transcriptionServerProcess.kill();
    transcriptionServerProcess = null;
  }

  logger.info('🚀 Spawning FastAPI Transcription Server...');

  const serverPath = path.join(__dirname, '../python_scripts/transcription_server.py');
  const pythonPath = process.env.PYTHON_PATH || 'python3';

  // Ensure FFmpeg is in the PATH for the Python process
  let envPath = process.env.PATH || '';
  if (process.env.FFMPEG_PATH) {
    const ffmpegDir = path.dirname(process.env.FFMPEG_PATH);
    const separator = process.platform === 'win32' ? ';' : ':';
    if (!envPath.includes(ffmpegDir)) {
      envPath = `${ffmpegDir}${separator}${envPath}`;
    }
  }

  // Spawn as a persistent child process
  transcriptionServerProcess = spawn(pythonPath, [serverPath], {
    env: {
      ...process.env,
      TRANSCRIPTION_SERVER_PORT: SERVER_PORT.toString(),
      PYTHONPATH: path.join(__dirname, '../python_scripts'),
      PATH: envPath,
    },
    stdio: 'inherit', // Pipe logs to our stdout/stderr
  });

  transcriptionServerProcess.on('error', (err) => {
    logger.error(`❌ Failed to start transcription server: ${err.message}`);
    transcriptionServerProcess = null;
  });

  transcriptionServerProcess.on('close', (code) => {
    logger.warn(`⚠️ Transcription server exited with code ${code}`);
    transcriptionServerProcess = null;
  });

  // 2. Poll for readiness (max 60s for first-time model load)
  logger.info('⏳ Waiting for models to load (this can take up to 60s)...');
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (await checkHealth()) {
      logger.info('✅ Transcription server is ready!');
      return true;
    }
    if (i % 5 === 0) logger.info(`... still loading (${i * 2}s)`);
  }

  throw new Error('Transcription server failed to become ready within timeout');
};

// Cleanup on exit
process.on('exit', () => {
  if (transcriptionServerProcess) transcriptionServerProcess.kill();
});

/**
 * Initialize the transcription service (pre-warms the server)
 */
const initialize = async () => {
  const provider = process.env.TRANSCRIPTION_PROVIDER || 'local';

  try {
    logger.info(`🎬 Initializing transcription service (Provider: ${provider})...`);

    if (provider === 'deepgram') {
      logger.info('🚀 Deepgram selected. Local server will start in background as fallback.');
      // Start in background, don't await
      ensureServer().catch((err) =>
        logger.warn(`⚠️ Fallback transcription server failed to start: ${err.message}`)
      );
      return true;
    }

    await ensureServer();
    return true;
  } catch (error) {
    logger.error(`❌ Failed to initialize transcription service: ${error.message}`);
    return false;
  }
};

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

// Configuration
const TRANSCRIPTION_CONFIG = {
  pythonPath: process.env.PYTHON_PATH || 'python3',
  scriptsDir: path.join(__dirname, '../python_scripts'),
  whisperModel: process.env.WHISPER_MODEL_SIZE || 'base.en',
  whisperModelPath: process.env.WHISPER_MODEL_PATH || null,
  language: 'en',
  task: 'transcribe',
  temperature: 0.0,
  beamSize: 5,
  patience: 1.0,
  compressionRatioThreshold: 2.4,
  logprobThreshold: -1.0,
  noSpeechThreshold: 0.6,
};

/**
 * Transcribe audio using Deepgram API
 * @param {string} audioPath - Path to audio file
 * @param {Object} options - Transcription options
 * @returns {Object} Transcription result
 */
const transcribeWithDeepgram = async (audioPath, options = {}) => {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      throw new Error('Deepgram API key not configured in .env');
    }

    const deepgram = new DeepgramClient(apiKey);
    const startTime = Date.now();

    logger.info(`🚀 Sending to Deepgram: ${path.basename(audioPath)}`);

    const audioBuffer = fs.readFileSync(audioPath);

    const response = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
      model: options.model || 'nova-2',
      smart_format: true,
      diarize: true,
      utterances: true,
      punctuate: true,
      paragraphs: true,
      language: options.language || 'en',
    });

    // In SDK v5+, the result is directly available on the response object
    const result = response.result;

    if (!result || response.error) {
      logger.error(`❌ Deepgram Response Error: ${JSON.stringify(response)}`);
      throw new Error(
        `Deepgram API error: ${response.error?.message || 'Unknown transcription error'}`
      );
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
 * Transcribe audio using Whisper model
 * @param {string} audioPath - Path to audio file (WAV, 16kHz mono)
 * @param {Object} options - Transcription options
 * @returns {Object} Transcription result
 */
const transcribeAudio = async (audioPath, options = {}) => {
  const provider = process.env.TRANSCRIPTION_PROVIDER || 'local';

  // Try Deepgram if selected
  if (provider === 'deepgram') {
    try {
      return await transcribeWithDeepgram(audioPath, options);
    } catch (error) {
      logger.warn(`⚠️ Deepgram failed, falling back to local processing: ${error.message}`);
      // Continue to local transcription
    }
  }

  try {
    logger.info(`🎙️ Starting local transcription: ${path.basename(audioPath)}`);
    const startTime = Date.now();

    // Merge options with defaults
    const transcriptionOptions = {
      model: options.model || TRANSCRIPTION_CONFIG.whisperModel,
      language: options.language || TRANSCRIPTION_CONFIG.language,
      task: options.task || TRANSCRIPTION_CONFIG.task,
      temperature: options.temperature ?? TRANSCRIPTION_CONFIG.temperature,
      beamSize: options.beamSize || TRANSCRIPTION_CONFIG.beamSize,
    };

    // Ensure microservice is up
    await ensureServer();

    // Call external transcription API
    const response = await axios.post(
      `${SERVER_URL}/transcribe`,
      {
        audio_path: audioPath,
      },
      { timeout: 600000 }
    );

    const result = response.data;

    // Check if the Python script itself reported a failure
    if (!result.success) {
      throw new Error(result.error || 'Transcription script returned an unsuccessful result');
    }

    if (!result.text) {
      throw new Error('Transcription script returned no text output');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Transcription completed in ${duration}s`);

    return {
      success: true,
      text: result.text,
      segments: result.segments || [], // Now includes speaker fields
      language: result.language,
      wordCount: countWords(result.text),
      confidence: result.confidence || 0,
      processingTime: parseFloat(duration),
      model: transcriptionOptions.model,
    };
  } catch (error) {
    logger.error(`❌ Transcription failed: ${error.message}`);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

/**
 * Transcribe with timestamp information
 * Returns detailed segment information with timestamps
 * @param {string} audioPath - Path to audio file
 * @returns {Object} Transcription with timestamps
 */
const transcribeWithTimestamps = async (audioPath) => {
  try {
    logger.info(`🎙️ Starting transcription with timestamps: ${path.basename(audioPath)}`);
    const startTime = Date.now();

    await ensureServer();

    const response = await axios.post(
      `${SERVER_URL}/transcribe`,
      {
        audio_path: audioPath,
        mode: 'timestamps',
      },
      { timeout: 0 }
    );

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error || 'Transcription script returned an unsuccessful result');
    }

    if (!result.text) {
      throw new Error('Transcription script returned no text output');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Transcription with timestamps completed in ${duration}s`);

    return {
      success: true,
      text: result.text,
      segments: result.segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        speaker: seg.speaker,
      })),
      language: result.language,
      processingTime: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Transcription with timestamps failed: ${error.message}`);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

/**
 * Batch transcribe multiple audio files
 * @param {Array<string>} audioPaths - Array of audio file paths
 * @returns {Array<Object>} Array of transcription results
 */
const batchTranscribe = async (audioPaths) => {
  logger.info(`📚 Starting batch transcription: ${audioPaths.length} files`);
  const results = [];

  for (let i = 0; i < audioPaths.length; i++) {
    try {
      logger.info(`Processing ${i + 1}/${audioPaths.length}: ${path.basename(audioPaths[i])}`);

      const result = await transcribeAudio(audioPaths[i]);
      results.push({
        path: audioPaths[i],
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to transcribe ${audioPaths[i]}: ${error.message}`);
      results.push({
        path: audioPaths[i],
        success: false,
        error: error.message,
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  logger.info(`✅ Batch transcription complete: ${successful}/${audioPaths.length} successful`);

  return results;
};

/**
 * Transcribe with contextual biasing
 * Improves accuracy for specific terms (names, technical terms)
 * @param {string} audioPath - Path to audio file
 * @param {Array<string>} contextTerms - Terms to bias towards
 * @returns {Object} Transcription result
 */
const transcribeWithContext = async (audioPath, contextTerms = []) => {
  try {
    logger.info(`🎙️ Transcribing with context: ${contextTerms.length} terms`);
    const startTime = Date.now();

    await ensureServer();

    const response = await axios.post(
      `${SERVER_URL}/transcribe`,
      {
        audio_path: audioPath,
        mode: 'context',
        context_terms: contextTerms,
      },
      { timeout: 0 }
    );

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error || 'Transcription script returned an unsuccessful result');
    }

    if (!result.text) {
      throw new Error('Transcription script returned no text output');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Context-aware transcription completed in ${duration}s`);

    return {
      success: true,
      text: result.text,
      segments: result.segments || [],
      language: result.language,
      wordCount: countWords(result.text),
      processingTime: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Context-aware transcription failed: ${error.message}`);
    throw new Error(`Context-aware transcription failed: ${error.message}`);
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

    // Calculate basic metrics
    const wordCount = countWords(transcriptText);
    const characterCount = transcriptText.length;
    const averageWordLength = characterCount / wordCount;

    // Estimate words per second
    const audioMetadata = require('./audio.service').getAudioMetadata;
    const metadata = await audioMetadata(audioPath);
    const wordsPerSecond = wordCount / metadata.duration;

    // Quality indicators
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

  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  // Capitalize first letter of sentences
  cleaned = cleaned.replace(/(^\w|\.\s+\w)/g, (letter) => letter.toUpperCase());

  // Remove filler words (optional - be careful not to remove legitimate words)
  const fillers = [' um ', ' uh ', ' like ', ' you know '];
  fillers.forEach((filler) => {
    const regex = new RegExp(filler, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  });

  // Clean up spaces again after filler removal
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

/**
 * Format transcript with paragraphs
 * Adds paragraph breaks for better readability
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

    // Start new paragraph if:
    // 1. Current paragraph is > 30 seconds
    // 2. Long pause detected
    // 3. Last segment
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
 * Extract speaker diarization (future feature)
 * Currently returns placeholder - requires additional model
 * @param {string} audioPath - Path to audio file
 * @returns {Object} Speaker segments
 */
// eslint-disable-next-line no-unused-vars
const extractSpeakers = async (audioPath) => {
  // Future implementation with pyannote.audio or similar
  logger.warn('⚠️ Speaker diarization not yet implemented');

  return {
    success: false,
    speakers: [],
    message: 'Speaker diarization requires additional models',
  };
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
  // Normal speech: 2-3 words per second
  // Normal word length: 4-6 characters

  let accuracy = 90; // Base accuracy

  // Adjust for speech rate
  if (wps < 1.5 || wps > 4) accuracy -= 5;
  if (wps < 1 || wps > 5) accuracy -= 10;

  // Adjust for word length (very short or long words indicate issues)
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

  // Indicators of low confidence:
  // - Very short text
  // - Excessive repetition
  // - Too many short words

  const wordCount = countWords(text);
  const words = text.toLowerCase().split(/\s+/);

  // Check for repetition
  const uniqueWords = new Set(words);
  const repetitionRatio = uniqueWords.size / wordCount;

  // Base confidence
  let confidence = 0.8;

  // Adjust for length
  if (wordCount < 10) confidence -= 0.2;
  if (wordCount < 5) confidence -= 0.3;

  // Adjust for repetition
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
 * Test Whisper installation
 * @returns {Object} Test result
 */
const testWhisperInstallation = async () => {
  try {
    logger.info('🧪 Testing Whisper installation via microservice...');

    await ensureServer();

    const response = await axios.get(`${SERVER_URL}/test`);
    const result = response.data;

    logger.info('✅ Whisper microservice responded correctly');

    return {
      success: true,
      whisperVersion: result.version,
      python_version: result.python_version,
      device: result.device,
    };
  } catch (error) {
    logger.error(`❌ Whisper microservice test failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  transcribeAudio,
  transcribeWithTimestamps,
  batchTranscribe,
  transcribeWithContext,
  getTranscriptionQuality,
  cleanTranscript,
  formatTranscriptWithParagraphs,
  extractSpeakers,
  countWords,
  testWhisperInstallation,
  initialize,
  TRANSCRIPTION_CONFIG,
};

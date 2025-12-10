// backend/src/services/nlp.service.js
// NLP processing service using SpaCy

const { PythonShell } = require('python-shell');
const path = require('path');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configuration
const NLP_CONFIG = {
  pythonPath: process.env.PYTHON_PATH || 'python3',
  scriptsDir: path.join(__dirname, '../python_scripts'),
  spacyModel: 'en_core_web_lg',
  enableAllComponents: true
};

/**
 * Process text with SpaCy NLP pipeline
 * Extracts entities, key phrases, and linguistic features
 * @param {string} text - Text to process
 * @returns {Object} NLP analysis results
 */
const processText = async (text) => {
  try {
    logger.info(`🧠 Starting NLP processing: ${text.length} characters`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, NLP_CONFIG.spacyModel]
    };

    // Run SpaCy NLP processor
    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ NLP processing completed in ${duration}s`);

    return {
      success: true,
      entities: result.entities || [],
      keyPhrases: result.key_phrases || [],
      actions: result.actions || [],
      sentiment: result.sentiment || { polarity: 0, subjectivity: 0 },
      topics: result.topics || [],
      statistics: result.statistics || {},
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ NLP processing failed: ${error.message}`);
    throw new Error(`NLP processing failed: ${error.message}`);
  }
};

/**
 * Extract named entities from text
 * Identifies people, organizations, locations, dates, etc.
 * @param {string} text - Text to analyze
 * @returns {Object} Named entities
 */
const extractEntities = async (text) => {
  try {
    logger.info(`👤 Extracting entities from text`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'entities']
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Entity extraction completed in ${duration}s`);

    // Group entities by type
    const entitiesByType = {};
    result.entities.forEach(entity => {
      if (!entitiesByType[entity.label]) {
        entitiesByType[entity.label] = [];
      }
      entitiesByType[entity.label].push({
        text: entity.text,
        start: entity.start,
        end: entity.end
      });
    });

    return {
      success: true,
      entities: result.entities,
      entitiesByType,
      counts: {
        total: result.entities.length,
        byType: Object.keys(entitiesByType).reduce((acc, type) => {
          acc[type] = entitiesByType[type].length;
          return acc;
        }, {})
      },
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ Entity extraction failed: ${error.message}`);
    throw new Error(`Entity extraction failed: ${error.message}`);
  }
};

/**
 * Extract key phrases and important concepts
 * @param {string} text - Text to analyze
 * @param {number} topN - Number of key phrases to return
 * @returns {Object} Key phrases
 */
const extractKeyPhrases = async (text, topN = 10) => {
  try {
    logger.info(`🔑 Extracting key phrases from text`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'keyphrases', topN.toString()]
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Key phrase extraction completed in ${duration}s`);

    return {
      success: true,
      keyPhrases: result.key_phrases.map(kp => ({
        phrase: kp.phrase,
        score: kp.score,
        frequency: kp.frequency
      })),
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ Key phrase extraction failed: ${error.message}`);
    throw new Error(`Key phrase extraction failed: ${error.message}`);
  }
};

/**
 * Extract action items and tasks from text
 * Identifies verbs, imperatives, and task-related language
 * @param {string} text - Text to analyze
 * @returns {Object} Action items
 */
const extractActions = async (text) => {
  try {
    logger.info(`✅ Extracting action items from text`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'actions']
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Action extraction completed in ${duration}s`);

    return {
      success: true,
      actions: result.actions.map(action => ({
        text: action.text,
        verb: action.verb,
        object: action.object,
        context: action.context,
        confidence: action.confidence
      })),
      count: result.actions.length,
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ Action extraction failed: ${error.message}`);
    throw new Error(`Action extraction failed: ${error.message}`);
  }
};

/**
 * Analyze sentiment of text
 * @param {string} text - Text to analyze
 * @returns {Object} Sentiment analysis
 */
const analyzeSentiment = async (text) => {
  try {
    logger.info(`😊 Analyzing sentiment`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'sentiment']
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Sentiment analysis completed in ${duration}s`);

    // Classify sentiment
    let classification = 'neutral';
    if (result.polarity > 0.1) classification = 'positive';
    if (result.polarity < -0.1) classification = 'negative';

    return {
      success: true,
      polarity: result.polarity,        // -1 (negative) to 1 (positive)
      subjectivity: result.subjectivity, // 0 (objective) to 1 (subjective)
      classification,
      confidence: Math.abs(result.polarity),
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ Sentiment analysis failed: ${error.message}`);
    throw new Error(`Sentiment analysis failed: ${error.message}`);
  }
};

/**
 * Extract topics from text using keyword extraction
 * @param {string} text - Text to analyze
 * @param {number} topN - Number of topics to return
 * @returns {Object} Topics
 */
const extractTopics = async (text, topN = 5) => {
  try {
    logger.info(`📚 Extracting topics from text`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'topics', topN.toString()]
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Topic extraction completed in ${duration}s`);

    return {
      success: true,
      topics: result.topics.map(topic => ({
        term: topic.term,
        score: topic.score,
        category: topic.category || 'general'
      })),
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ Topic extraction failed: ${error.message}`);
    throw new Error(`Topic extraction failed: ${error.message}`);
  }
};

/**
 * Get text statistics and readability metrics
 * @param {string} text - Text to analyze
 * @returns {Object} Statistics
 */
const getTextStatistics = (text) => {
  if (!text) {
    return {
      characterCount: 0,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      averageWordLength: 0,
      averageSentenceLength: 0
    };
  }

  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  const totalCharacters = words.reduce((sum, word) => sum + word.length, 0);
  const averageWordLength = words.length > 0 ? totalCharacters / words.length : 0;
  const averageSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;

  return {
    characterCount: text.length,
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    averageWordLength: parseFloat(averageWordLength.toFixed(2)),
    averageSentenceLength: parseFloat(averageSentenceLength.toFixed(2))
  };
};

/**
 * Extract dates and time references from text
 * @param {string} text - Text to analyze
 * @returns {Object} Temporal references
 */
const extractDates = async (text) => {
  try {
    logger.info(`📅 Extracting dates from text`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'dates']
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Date extraction completed in ${duration}s`);

    return {
      success: true,
      dates: result.dates.map(date => ({
        text: date.text,
        normalized: date.normalized,
        type: date.type // 'DATE', 'TIME', 'DURATION'
      })),
      count: result.dates.length,
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ Date extraction failed: ${error.message}`);
    throw new Error(`Date extraction failed: ${error.message}`);
  }
};

/**
 * Complete NLP pipeline for meeting transcripts
 * Runs all NLP analyses in sequence
 * Returns data in dataset format
 * @param {string} text - Transcript text
 * @returns {Object} Complete NLP analysis in dataset format
 */
const processMeetingTranscript = async (text) => {
  try {
    logger.info(`🚀 Starting complete NLP pipeline`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'full']
    };

    // Run SpaCy NLP processor with updated format
    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Complete NLP pipeline finished in ${totalTime}s`);

    // Return in dataset format
    return {
      success: result.success || true,
      entities: result.entities || [],        // [{text, label}]
      keyPhrases: result.keyPhrases || [],    // ["phrase1", "phrase2"]
      actionPatterns: result.actionPatterns || [], // [{action, object}]
      sentiment: result.sentiment || {label: 'neutral', score: 0}, // {label, score}
      topics: result.topics || [],            // ["topic1", "topic2"]
      processingTime: parseFloat(totalTime)
    };

  } catch (error) {
    logger.error(`❌ NLP pipeline failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      entities: [],
      keyPhrases: [],
      actionPatterns: [],
      sentiment: {label: 'neutral', score: 0},
      topics: [],
      processingTime: 0
    };
  }
};

/**
 * Clean and preprocess text for NLP
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
const preprocessText = (text) => {
  if (!text) return '';

  let cleaned = text;

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove special characters but keep punctuation
  cleaned = cleaned.replace(/[^\w\s.,!?;:\-'"]/g, '');

  // Normalize quotes
  cleaned = cleaned.replace(/['']/g, "'");
  cleaned = cleaned.replace(/[""]/g, '"');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
};

/**
 * Batch process multiple texts
 * @param {Array<string>} texts - Array of texts to process
 * @returns {Array<Object>} Array of NLP results
 */
const batchProcessTexts = async (texts) => {
  logger.info(`📚 Batch processing ${texts.length} texts`);
  const results = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      logger.info(`Processing ${i + 1}/${texts.length}`);
      const result = await processText(texts[i]);
      results.push({
        index: i,
        success: true,
        ...result
      });
    } catch (error) {
      logger.error(`Failed to process text ${i}: ${error.message}`);
      results.push({
        index: i,
        success: false,
        error: error.message
      });
    }
  }

  const successful = results.filter(r => r.success).length;
  logger.info(`✅ Batch processing complete: ${successful}/${texts.length} successful`);

  return results;
};

/**
 * Test SpaCy installation
 * @returns {Object} Test result
 */
const testSpacyInstallation = async () => {
  try {
    logger.info('🧪 Testing SpaCy installation...');

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: ['test']
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions);
    const result = results[0];

    logger.info('✅ SpaCy installation test passed');

    return {
      success: true,
      spacyVersion: result.spacy_version,
      model: result.model,
      modelVersion: result.model_version,
      pythonVersion: result.python_version,
      components: result.components
    };

  } catch (error) {
    logger.error(`❌ SpaCy installation test failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  processText,
  extractEntities,
  extractKeyPhrases,
  extractActions,
  analyzeSentiment,
  extractTopics,
  extractDates,
  getTextStatistics,
  processMeetingTranscript,
  preprocessText,
  batchProcessTexts,
  testSpacyInstallation,
  NLP_CONFIG
};
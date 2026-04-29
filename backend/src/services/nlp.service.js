const { PythonShell } = require('python-shell');
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

const NLP_CONFIG = {
  pythonPath: process.env.PYTHON_PATH || 'python3',
  scriptsDir: path.join(__dirname, '../python_scripts'),
  spacyModel: 'en_core_web_lg',
  enableAllComponents: true,
};

const processMeetingTranscript = async (text) => {
  try {
    logger.info(`🚀 Starting complete NLP pipeline`);
    const startTime = Date.now();

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: [text, 'full'],
    };

    const results = await PythonShell.run('nlp_processor.py', pythonOptions).catch((err) => {
      logger.error(`❌ NLP script failed: ${err.message}`);
      if (err.message.includes('JSON')) {
        return [
          {
            success: false,
            error: 'Internal error: Python NLP processor returned malformed output.',
          },
        ];
      }
      throw err;
    });
    const result = results[0];

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Complete NLP pipeline finished in ${totalTime}s`);

    return {
      success: result.success || true,
      entities: result.entities || [],
      svoTriplets: result.svoTriplets || [],
      actionSignals: result.actionSignals || [],
      questions: result.questions || [],
      speakerEntityMap: result.speakerEntityMap || {},
      nlpMetadata: result.metadata || {},
      processingTime: parseFloat(totalTime),
    };
  } catch (error) {
    logger.error(`❌ NLP pipeline failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      entities: [],
      svoTriplets: [],
      actionSignals: [],
      questions: [],
      speakerEntityMap: {},
      nlpMetadata: {},
      processingTime: 0,
    };
  }
};

const testSpacyInstallation = async () => {
  try {
    logger.info('🧪 Testing SpaCy installation...');

    const pythonOptions = {
      mode: 'json',
      pythonPath: NLP_CONFIG.pythonPath,
      scriptPath: NLP_CONFIG.scriptsDir,
      args: ['test'],
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
      components: result.components,
    };
  } catch (error) {
    logger.error(`❌ SpaCy installation test failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  processMeetingTranscript,
  testSpacyInstallation,
  NLP_CONFIG,
};

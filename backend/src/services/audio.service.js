// backend/src/services/audio.service.js
// Audio processing service - handles audio optimization and analysis

const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
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
const AUDIO_CONFIG = {
  pythonPath: process.env.PYTHON_PATH || 'python3',
  scriptsDir: path.join(__dirname, '../python_scripts'),
  maxDuration: parseInt(process.env.MAX_AUDIO_DURATION) || 180, // 3 minutes
  targetSampleRate: 16000, // 16kHz for Whisper
  targetChannels: 1, // Mono
  targetFormat: 'wav',
  useFfmpegFallback: process.env.USE_FFMPEG_FALLBACK === 'true'
};

/**
 * Process audio file using Python script
 * Applies noise reduction, normalization, and optimization
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path for processed audio file
 * @returns {Object} Processing result with metadata
 */
const processAudioWithPython = async (inputPath, outputPath) => {
  try {
    logger.info(`🎵 Processing audio with Python: ${path.basename(inputPath)}`);
    const startTime = Date.now();

    // Python script options
    const options = {
      mode: 'json',
      pythonPath: AUDIO_CONFIG.pythonPath,
      scriptPath: AUDIO_CONFIG.scriptsDir,
      args: [
        inputPath,
        outputPath,
        AUDIO_CONFIG.targetSampleRate.toString(),
        AUDIO_CONFIG.targetChannels.toString()
      ]
    };

    // Run Python audio processor
    const results = await PythonShell.run('audio_processor.py', options);
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Python audio processing completed in ${duration}s`);

    return {
      success: true,
      outputPath: result.output_path,
      duration: result.duration,
      sampleRate: result.sample_rate,
      channels: result.channels,
      fileSize: result.file_size,
      processingTime: parseFloat(duration),
      method: 'python'
    };

  } catch (error) {
    logger.error(`❌ Python audio processing failed: ${error.message}`);
    
    // Try FFmpeg fallback if enabled
    if (AUDIO_CONFIG.useFfmpegFallback) {
      logger.warn('⚠️ Attempting FFmpeg fallback...');
      return await processAudioWithFFmpeg(inputPath, outputPath);
    }
    
    throw new Error(`Audio processing failed: ${error.message}`);
  }
};

/**
 * Process audio file using FFmpeg (fallback method)
 * Faster but lower quality than Python processing
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path for processed audio file
 * @returns {Object} Processing result with metadata
 */
const processAudioWithFFmpeg = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    logger.info(`🎵 Processing audio with FFmpeg: ${path.basename(inputPath)}`);
    const startTime = Date.now();

    ffmpeg(inputPath)
      .audioFrequency(AUDIO_CONFIG.targetSampleRate)
      .audioChannels(AUDIO_CONFIG.targetChannels)
      .audioCodec('pcm_s16le')
      .format('wav')
      .audioBitrate('256k')
      .audioFilters([
        'highpass=f=85',      // Remove frequencies below 85Hz
        'lowpass=f=8000',     // Remove frequencies above 8kHz
        'loudnorm'            // Normalize audio levels
      ])
      .on('start', (commandLine) => {
        logger.debug(`FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        logger.debug(`Processing: ${progress.percent?.toFixed(1)}%`);
      })
      .on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`✅ FFmpeg audio processing completed in ${duration}s`);

        // Get output file stats
        const stats = fs.statSync(outputPath);

        // Get audio metadata
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          if (err) {
            logger.warn('Could not get audio metadata:', err.message);
            return resolve({
              success: true,
              outputPath,
              duration: null,
              sampleRate: AUDIO_CONFIG.targetSampleRate,
              channels: AUDIO_CONFIG.targetChannels,
              fileSize: stats.size,
              processingTime: parseFloat(duration),
              method: 'ffmpeg'
            });
          }

          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

          resolve({
            success: true,
            outputPath,
            duration: parseFloat(metadata.format.duration),
            sampleRate: audioStream?.sample_rate || AUDIO_CONFIG.targetSampleRate,
            channels: audioStream?.channels || AUDIO_CONFIG.targetChannels,
            fileSize: stats.size,
            processingTime: parseFloat(duration),
            method: 'ffmpeg'
          });
        });
      })
      .on('error', (err) => {
        logger.error(`❌ FFmpeg processing failed: ${err.message}`);
        reject(new Error(`FFmpeg processing failed: ${err.message}`));
      })
      .save(outputPath);
  });
};

/**
 * Validate audio file
 * Checks duration, format, and basic quality
 * @param {string} filePath - Path to audio file
 * @returns {Object} Validation result with metadata
 */
const validateAudio = (filePath) => {
  return new Promise((resolve, reject) => {
    logger.info(`🔍 Validating audio: ${path.basename(filePath)}`);

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.error(`❌ Audio validation failed: ${err.message}`);
        return reject(new Error(`Invalid audio file: ${err.message}`));
      }

      // Check if file has audio stream
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!audioStream) {
        return reject(new Error('No audio stream found in file'));
      }

      const duration = parseFloat(metadata.format.duration);
      const fileSize = parseInt(metadata.format.size);
      const sampleRate = audioStream.sample_rate;
      const channels = audioStream.channels;
      const codec = audioStream.codec_name;

      // Validate duration (max 3 minutes)
      if (duration > AUDIO_CONFIG.maxDuration) {
        return reject(new Error(
          `Audio duration (${Math.round(duration)}s) exceeds maximum allowed (${AUDIO_CONFIG.maxDuration}s)`
        ));
      }

      // Validate minimum duration (at least 1 second)
      if (duration < 1) {
        return reject(new Error('Audio duration too short (minimum 1 second)'));
      }

      logger.info(`✅ Audio validation passed: ${duration.toFixed(1)}s, ${codec}, ${sampleRate}Hz`);

      resolve({
        valid: true,
        duration,
        fileSize,
        sampleRate,
        channels,
        codec,
        bitrate: audioStream.bit_rate,
        format: metadata.format.format_name
      });
    });
  });
};

/**
 * Extract audio metadata without validation
 * @param {string} filePath - Path to audio file
 * @returns {Object} Audio metadata
 */
const getAudioMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to read audio metadata: ${err.message}`));
      }

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      resolve({
        duration: parseFloat(metadata.format.duration),
        fileSize: parseInt(metadata.format.size),
        sampleRate: audioStream?.sample_rate,
        channels: audioStream?.channels,
        codec: audioStream?.codec_name,
        bitrate: audioStream?.bit_rate,
        format: metadata.format.format_name
      });
    });
  });
};

/**
 * Convert audio to WAV format for Whisper
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path for WAV output
 * @returns {Object} Conversion result
 */
const convertToWav = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    logger.info(`🔄 Converting to WAV: ${path.basename(inputPath)}`);

    ffmpeg(inputPath)
      .audioFrequency(AUDIO_CONFIG.targetSampleRate)
      .audioChannels(AUDIO_CONFIG.targetChannels)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => {
        logger.info(`✅ Conversion complete: ${path.basename(outputPath)}`);
        resolve({ success: true, outputPath });
      })
      .on('error', (err) => {
        logger.error(`❌ Conversion failed: ${err.message}`);
        reject(new Error(`WAV conversion failed: ${err.message}`));
      })
      .save(outputPath);
  });
};

/**
 * Extract audio segment (for testing or preview)
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path for output segment
 * @param {number} startTime - Start time in seconds
 * @param {number} duration - Duration in seconds
 * @returns {Object} Extraction result
 */
const extractSegment = (inputPath, outputPath, startTime, duration) => {
  return new Promise((resolve, reject) => {
    logger.info(`✂️ Extracting segment: ${startTime}s to ${startTime + duration}s`);

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .audioFrequency(AUDIO_CONFIG.targetSampleRate)
      .audioChannels(AUDIO_CONFIG.targetChannels)
      .format('wav')
      .on('end', () => {
        logger.info(`✅ Segment extracted: ${path.basename(outputPath)}`);
        resolve({ success: true, outputPath });
      })
      .on('error', (err) => {
        logger.error(`❌ Segment extraction failed: ${err.message}`);
        reject(new Error(`Segment extraction failed: ${err.message}`));
      })
      .save(outputPath);
  });
};

/**
 * Analyze audio quality
 * @param {string} filePath - Path to audio file
 * @returns {Object} Quality analysis
 */
const analyzeQuality = async (filePath) => {
  try {
    logger.info(`📊 Analyzing audio quality: ${path.basename(filePath)}`);

    const options = {
      mode: 'json',
      pythonPath: AUDIO_CONFIG.pythonPath,
      scriptPath: AUDIO_CONFIG.scriptsDir,
      args: [filePath]
    };

    // Run Python quality analyzer
    const results = await PythonShell.run('analyze_quality.py', options);
    const analysis = results[0];

    logger.info(`✅ Quality analysis complete`);

    return {
      success: true,
      snr: analysis.snr, // Signal-to-noise ratio
      quality: analysis.quality, // 'good', 'fair', 'poor'
      recommendations: analysis.recommendations
    };

  } catch (error) {
    logger.warn(`⚠️ Quality analysis failed: ${error.message}`);
    return {
      success: false,
      quality: 'unknown',
      error: error.message
    };
  }
};

/**
 * Generate waveform data for visualization
 * @param {string} filePath - Path to audio file
 * @param {number} points - Number of data points
 * @returns {Array} Waveform data
 */
const generateWaveform = async (filePath, points = 100) => {
  try {
    logger.info(`📈 Generating waveform: ${path.basename(filePath)}`);

    const options = {
      mode: 'json',
      pythonPath: AUDIO_CONFIG.pythonPath,
      scriptPath: AUDIO_CONFIG.scriptsDir,
      args: [filePath, points.toString()]
    };

    // Run Python waveform generator
    const results = await PythonShell.run('generate_waveform.py', options);
    const waveform = results[0];

    logger.info(`✅ Waveform generated: ${waveform.points.length} points`);

    return {
      success: true,
      points: waveform.points,
      duration: waveform.duration
    };

  } catch (error) {
    logger.error(`❌ Waveform generation failed: ${error.message}`);
    throw new Error(`Waveform generation failed: ${error.message}`);
  }
};

/**
 * Main audio processing pipeline
 * Validates, processes, and optimizes audio for transcription
 * @param {string} inputPath - Path to uploaded audio file
 * @param {string} outputDir - Directory for processed output
 * @returns {Object} Complete processing result
 */
const processAudioPipeline = async (inputPath, outputDir) => {
  try {
    logger.info(`🚀 Starting audio processing pipeline`);
    const startTime = Date.now();

    // Step 1: Validate audio
    logger.info('📋 Step 1/3: Validating audio...');
    const validation = await validateAudio(inputPath);

    // Step 2: Process audio
    logger.info('🔧 Step 2/3: Processing audio...');
    const outputFilename = `processed_${Date.now()}.wav`;
    const outputPath = path.join(outputDir, outputFilename);
    
    const processing = await processAudioWithPython(inputPath, outputPath);

    // Step 3: Verify output
    logger.info('✔️ Step 3/3: Verifying output...');
    const outputMetadata = await getAudioMetadata(outputPath);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Audio processing pipeline completed in ${totalTime}s`);

    return {
      success: true,
      input: {
        path: inputPath,
        duration: validation.duration,
        fileSize: validation.fileSize,
        sampleRate: validation.sampleRate,
        channels: validation.channels
      },
      output: {
        path: outputPath,
        duration: outputMetadata.duration,
        fileSize: outputMetadata.fileSize,
        sampleRate: outputMetadata.sampleRate,
        channels: outputMetadata.channels
      },
      processing: {
        method: processing.method,
        time: processing.processingTime,
        totalTime: parseFloat(totalTime)
      }
    };

  } catch (error) {
    logger.error(`❌ Audio processing pipeline failed: ${error.message}`);
    throw error;
  }
};

/**
 * Clean up temporary audio files
 * @param {Array<string>} filePaths - Array of file paths to delete
 * @returns {Object} Cleanup result
 */
const cleanupAudioFiles = (filePaths) => {
  let deleted = 0;
  let failed = 0;

  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted++;
        logger.info(`🗑️ Deleted: ${path.basename(filePath)}`);
      }
    } catch (error) {
      failed++;
      logger.error(`❌ Failed to delete ${filePath}: ${error.message}`);
    }
  });

  return { deleted, failed, total: filePaths.length };
};

module.exports = {
  processAudioWithPython,
  processAudioWithFFmpeg,
  validateAudio,
  getAudioMetadata,
  convertToWav,
  extractSegment,
  analyzeQuality,
  generateWaveform,
  processAudioPipeline,
  cleanupAudioFiles,
  AUDIO_CONFIG
};
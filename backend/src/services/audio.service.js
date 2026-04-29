const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

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

const AUDIO_CONFIG = {
  pythonPath: process.env.PYTHON_PATH || 'python3',
  scriptsDir: path.join(__dirname, '../python_scripts'),
  maxDuration: parseInt(process.env.MAX_AUDIO_DURATION) || 180,
  targetSampleRate: 48000,
  targetChannels: 1,
  targetFormat: 'wav',
  useFfmpegFallback: process.env.USE_FFMPEG_FALLBACK === 'true',
};

const processAudioWithPython = async (inputPath, outputPath) => {
  try {
    logger.info(`🎵 Processing audio with Python: ${path.basename(inputPath)}`);
    const startTime = Date.now();

    const options = {
      mode: 'json',
      pythonPath: AUDIO_CONFIG.pythonPath,
      scriptPath: AUDIO_CONFIG.scriptsDir,
      args: [inputPath, outputPath],
    };

    const results = await PythonShell.run('audio_processor.py', options).catch((err) => {
      logger.error(`❌ Audio processing script failed: ${err.message}`);
      if (err.message.includes('JSON')) {
        throw new Error('Internal error: Python audio processor returned malformed output.');
      }
      throw err;
    });
    const result = results[0];

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Python audio processing completed in ${duration}s`);

    const fileSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

    return {
      success: true,
      outputPath: result.output_path,
      duration: result.duration,
      sampleRate: result.sample_rate,
      channels: result.channels,
      fileSize: fileSize,
      processingTime: parseFloat(duration),
      method: 'python',
    };
  } catch (error) {
    logger.error(`❌ Python audio processing failed: ${error.message}`);
    throw new Error(`Audio processing failed: ${error.message}`);
  }
};

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
      .audioFilters(['highpass=f=85', 'lowpass=f=8000', 'loudnorm'])
      .on('start', (commandLine) => {
        logger.debug(`FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        logger.debug(`Processing: ${progress.percent?.toFixed(1)}%`);
      })
      .on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`✅ FFmpeg audio processing completed in ${duration}s`);

        const stats = fs.statSync(outputPath);

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
              method: 'ffmpeg',
            });
          }

          const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

          resolve({
            success: true,
            outputPath,
            duration: parseFloat(metadata.format.duration),
            sampleRate: audioStream?.sample_rate || AUDIO_CONFIG.targetSampleRate,
            channels: audioStream?.channels || AUDIO_CONFIG.targetChannels,
            fileSize: stats.size,
            processingTime: parseFloat(duration),
            method: 'ffmpeg',
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

const validateAudio = (filePath) => {
  return new Promise((resolve, reject) => {
    logger.info(`🔍 Validating audio: ${path.basename(filePath)}`);

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.error(`❌ Audio validation failed: ${err.message}`);
        return reject(new Error(`Invalid audio file: ${err.message}`));
      }

      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
      if (!audioStream) {
        return reject(new Error('No audio stream found in file'));
      }

      const duration = parseFloat(metadata.format.duration);
      const fileSize = parseInt(metadata.format.size);
      const sampleRate = audioStream.sample_rate;
      const channels = audioStream.channels;
      const codec = audioStream.codec_name;

      if (duration > AUDIO_CONFIG.maxDuration) {
        return reject(
          new Error(
            `Audio duration (${Math.round(duration)}s) exceeds maximum allowed (${AUDIO_CONFIG.maxDuration}s)`
          )
        );
      }

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
        format: metadata.format.format_name,
      });
    });
  });
};

const getAudioMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to read audio metadata: ${err.message}`));
      }

      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

      resolve({
        duration: parseFloat(metadata.format.duration),
        fileSize: parseInt(metadata.format.size),
        sampleRate: audioStream?.sample_rate,
        channels: audioStream?.channels,
        codec: audioStream?.codec_name,
        bitrate: audioStream?.bit_rate,
        format: metadata.format.format_name,
      });
    });
  });
};

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

const analyzeQuality = async (filePath) => {
  try {
    logger.info(`📊 Analyzing audio quality: ${path.basename(filePath)}`);

    const options = {
      mode: 'json',
      pythonPath: AUDIO_CONFIG.pythonPath,
      scriptPath: AUDIO_CONFIG.scriptsDir,
      args: [filePath],
    };

    const results = await PythonShell.run('analyze_quality.py', options);
    const analysis = results[0];

    logger.info(`✅ Quality analysis complete`);

    return {
      success: true,
      snr: analysis.snr,
      quality: analysis.quality,
      recommendations: analysis.recommendations,
    };
  } catch (error) {
    logger.warn(`⚠️ Quality analysis failed: ${error.message}`);
    return {
      success: false,
      quality: 'unknown',
      error: error.message,
    };
  }
};

const generateWaveform = async (filePath, points = 100) => {
  try {
    logger.info(`📈 Generating waveform: ${path.basename(filePath)}`);

    const options = {
      mode: 'json',
      pythonPath: AUDIO_CONFIG.pythonPath,
      scriptPath: AUDIO_CONFIG.scriptsDir,
      args: [filePath, points.toString()],
    };

    const results = await PythonShell.run('generate_waveform.py', options);
    const waveform = results[0];

    logger.info(`✅ Waveform generated: ${waveform.points.length} points`);

    return {
      success: true,
      points: waveform.points,
      duration: waveform.duration,
    };
  } catch (error) {
    logger.error(`❌ Waveform generation failed: ${error.message}`);
    throw new Error(`Waveform generation failed: ${error.message}`);
  }
};

const processAudioPipeline = async (inputPath, outputDir) => {
  try {
    logger.info(`🚀 Starting Python-only audio processing pipeline`);
    const startTime = Date.now();

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const inputStats = fs.statSync(inputPath);
    logger.info(
      `📁 Input file: ${path.basename(inputPath)} (${(inputStats.size / 1024).toFixed(1)} KB)`
    );

    logger.info(
      '🐍 Processing audio with Python (includes validation, noise reduction, optimization)...'
    );
    const outputFilename = `processed_${Date.now()}.wav`;
    const outputPath = path.join(outputDir, outputFilename);

    const processing = await processAudioWithPython(inputPath, outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputFileSize = outputStats.size;

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Audio processing completed in ${totalTime}s`);

    return {
      success: true,
      input: {
        path: inputPath,
        fileSize: inputStats.size,
      },
      output: {
        path: outputPath,
        duration: processing.duration,
        fileSize: outputFileSize,
        sampleRate: processing.sampleRate,
        channels: processing.channels,
      },
      processing: {
        method: processing.method,
        time: processing.processingTime,
        totalTime: parseFloat(totalTime),
      },
    };
  } catch (error) {
    logger.error(`❌ Audio processing pipeline failed: ${error.message}`);
    throw error;
  }
};

const cleanupAudioFiles = (filePaths) => {
  let deleted = 0;
  let failed = 0;

  filePaths.forEach((filePath) => {
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

const processAudioFile = async (inputPath) => {
  try {
    const outputDir = path.join(process.cwd(), 'storage', 'processed');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await processAudioPipeline(inputPath, outputDir);

    return {
      success: true,
      outputPath: result.output.path,
      duration: result.output.duration,
      sampleRate: result.output.sampleRate,
      channels: result.output.channels,
      fileSize: result.output.fileSize,
      processingTime: result.processing.totalTime,
      method: result.processing.method,
    };
  } catch (error) {
    logger.error(`❌ processAudioFile failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  processAudioFile,
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
  AUDIO_CONFIG,
};

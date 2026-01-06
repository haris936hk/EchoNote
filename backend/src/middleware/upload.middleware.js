// backend/src/middleware/upload.middleware.js
// File upload middleware using multer and express-fileupload

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const winston = require('winston');
const ffmpeg = require('fluent-ffmpeg');
const { AppError } = require('./error.middleware');

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

// Upload configuration - Using unified storage directory
const STORAGE_BASE = path.join(process.cwd(), 'storage');
const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB (updated from 10MB)
  uploadDir: path.join(STORAGE_BASE, 'temp'),  // Unified: use storage/temp
  rawDir: path.join(STORAGE_BASE, 'temp'),      // Raw uploads go to temp
  processedDir: path.join(STORAGE_BASE, 'processed'),
  allowedFormats: (process.env.ALLOWED_AUDIO_FORMATS || 'audio/mpeg,audio/wav,audio/mp3,audio/webm,audio/ogg,audio/m4a,audio/x-m4a,audio/mp4').split(','),
  maxDuration: parseInt(process.env.MAX_AUDIO_DURATION) || 600 // 10 minutes in seconds (updated from 180)
};

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    STORAGE_BASE,
    UPLOAD_CONFIG.uploadDir,
    UPLOAD_CONFIG.processedDir,
    path.join(STORAGE_BASE, 'audio')  // Also ensure audio dir exists
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`📁 Created directory: ${dir}`);
    }
  });
};

// Initialize directories
ensureUploadDirs();

/**
 * Generate unique filename
 */
const generateFilename = (originalName, userId) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  return `${userId}_${timestamp}_${randomString}${ext}`;
};

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_CONFIG.rawDir);
  },
  filename: (req, file, cb) => {
    const userId = req.userId || 'anonymous';
    const filename = generateFilename(file.originalname, userId);
    cb(null, filename);
  }
});

/**
 * File filter for audio files
 */
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!UPLOAD_CONFIG.allowedFormats.includes(file.mimetype)) {
    logger.warn(`❌ Invalid file type: ${file.mimetype}`);
    return cb(
      new AppError(
        `Invalid file format. Allowed formats: ${UPLOAD_CONFIG.allowedFormats.join(', ')}`,
        400,
        'INVALID_FILE_FORMAT'
      ),
      false
    );
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mpeg'];

  if (!allowedExtensions.includes(ext)) {
    logger.warn(`❌ Invalid file extension: ${ext}`);
    return cb(
      new AppError(
        `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
        400,
        'INVALID_FILE_EXTENSION'
      ),
      false
    );
  }

  cb(null, true);
};

/**
 * Multer upload configuration
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
    files: 1 // Only allow 1 file at a time
  },
  fileFilter: fileFilter
});

/**
 * Single audio file upload middleware
 */
const uploadAudio = upload.single('audio');

/**
 * Validate audio file after upload
 */
const validateAudioFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(
        new AppError('No audio file provided', 400, 'NO_FILE_PROVIDED')
      );
    }

    const file = req.file;

    // Log upload info
    logger.info(`📤 File uploaded: ${file.filename} (${file.size} bytes)`);

    // Validate file size again (double check)
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      // Delete the file
      fs.unlinkSync(file.path);

      return next(
        new AppError(
          `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
          400,
          'FILE_TOO_LARGE'
        )
      );
    }

    // Validate file exists and is readable
    if (!fs.existsSync(file.path)) {
      return next(
        new AppError('Uploaded file not found', 500, 'FILE_NOT_FOUND')
      );
    }

    // Check if file is empty
    if (file.size === 0) {
      fs.unlinkSync(file.path);
      return next(
        new AppError('Uploaded file is empty', 400, 'EMPTY_FILE')
      );
    }

    // Attach file info to request
    req.uploadedFile = {
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    };

    logger.info(`✅ File validation passed: ${file.filename}`);
    next();

  } catch (error) {
    logger.error(`Error validating file: ${error.message}`);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    next(new AppError('File validation failed', 500, 'VALIDATION_ERROR'));
  }
};

/**
 * Validate audio duration (FR.45: 3-minute limit)
 * Must be called after validateAudioFile or validateExpressFileUpload
 */
const validateAudioDuration = async (req, res, next) => {
  try {
    if (!req.uploadedFile || !req.uploadedFile.path) {
      return next(
        new AppError('No uploaded file found for duration validation', 500, 'NO_FILE_FOR_VALIDATION')
      );
    }

    const filePath = req.uploadedFile.path;
    const maxDuration = UPLOAD_CONFIG.maxDuration; // 600 seconds (10 minutes)

    logger.info(`🎵 Checking audio duration for: ${req.uploadedFile.filename}`);

    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error(`❌ FFprobe error: ${err.message}`);
          // Clean up invalid file
          cleanupUploadedFile(filePath);
          return resolve(
            next(
              new AppError(
                'Invalid audio file. Could not read audio metadata.',
                400,
                'INVALID_AUDIO_FILE'
              )
            )
          );
        }

        const duration = metadata.format.duration;

        if (!duration || duration <= 0) {
          logger.warn(`❌ Invalid duration: ${duration}`);
          cleanupUploadedFile(filePath);
          return resolve(
            next(
              new AppError(
                'Invalid audio file. Duration could not be determined.',
                400,
                'INVALID_DURATION'
              )
            )
          );
        }

        // Check if duration exceeds maximum (3 minutes)
        if (duration > maxDuration) {
          const durationMinutes = Math.floor(duration / 60);
          const durationSeconds = Math.floor(duration % 60);
          const maxMinutes = Math.floor(maxDuration / 60);

          logger.warn(
            `❌ Audio too long: ${durationMinutes}m ${durationSeconds}s (max: ${maxMinutes}m)`
          );

          // Clean up file
          cleanupUploadedFile(filePath);

          return resolve(
            next(
              new AppError(
                `Audio duration (${durationMinutes}m ${durationSeconds}s) exceeds the maximum limit of ${maxMinutes} minutes. Please upload a shorter recording.`,
                400,
                'DURATION_LIMIT_EXCEEDED'
              )
            )
          );
        }

        // Add duration to uploaded file info
        req.uploadedFile.duration = duration;
        req.uploadedFile.durationFormatted = `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`;

        logger.info(
          `✅ Duration validated: ${req.uploadedFile.durationFormatted} (${duration}s)`
        );

        resolve(next());
      });
    });

  } catch (error) {
    logger.error(`Error validating audio duration: ${error.message}`);

    // Clean up file if it exists
    if (req.uploadedFile && req.uploadedFile.path) {
      cleanupUploadedFile(req.uploadedFile.path);
    }

    next(new AppError('Audio duration validation failed', 500, 'DURATION_VALIDATION_ERROR'));
  }
};

/**
 * Express-fileupload alternative (simpler approach)
 * Use this if you prefer express-fileupload over multer
 */
const expressFileUploadConfig = {
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize
  },
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded',
  useTempFiles: true,
  tempFileDir: UPLOAD_CONFIG.rawDir,
  uploadTimeout: 60000, // 60 seconds
  debug: process.env.NODE_ENV === 'development',
  parseNested: true
};

/**
 * Validate express-fileupload file
 */
const validateExpressFileUpload = async (req, res, next) => {
  try {
    if (!req.files || !req.files.audio) {
      return next(
        new AppError('No audio file provided', 400, 'NO_FILE_PROVIDED')
      );
    }

    const audioFile = req.files.audio;

    // Validate MIME type
    if (!UPLOAD_CONFIG.allowedFormats.includes(audioFile.mimetype)) {
      return next(
        new AppError(
          `Invalid file format. Allowed: ${UPLOAD_CONFIG.allowedFormats.join(', ')}`,
          400,
          'INVALID_FILE_FORMAT'
        )
      );
    }

    // Validate size
    if (audioFile.size > UPLOAD_CONFIG.maxFileSize) {
      return next(
        new AppError(
          `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
          400,
          'FILE_TOO_LARGE'
        )
      );
    }

    // Validate extension
    const ext = path.extname(audioFile.name).toLowerCase();
    const allowedExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mpeg'];

    if (!allowedExtensions.includes(ext)) {
      return next(
        new AppError(
          `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
          400,
          'INVALID_FILE_EXTENSION'
        )
      );
    }

    // Generate unique filename
    const userId = req.userId || 'anonymous';
    const uniqueFilename = generateFilename(audioFile.name, userId);
    const finalPath = path.join(UPLOAD_CONFIG.rawDir, uniqueFilename);

    // Move file to raw directory with unique name
    await audioFile.mv(finalPath);

    // Attach file info to request
    req.uploadedFile = {
      filename: uniqueFilename,
      originalName: audioFile.name,
      path: finalPath,
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      uploadedAt: new Date()
    };

    logger.info(`✅ File uploaded and validated: ${uniqueFilename} (${audioFile.size} bytes)`);
    next();

  } catch (error) {
    logger.error(`Error in file upload: ${error.message}`);
    next(new AppError('File upload failed', 500, 'UPLOAD_ERROR'));
  }
};

/**
 * Clean up uploaded file (call on error or after processing)
 */
const cleanupUploadedFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`🗑️ Cleaned up file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error cleaning up file ${filePath}: ${error.message}`);
    return false;
  }
};

/**
 * Clean up old files in upload directories
 * Call this periodically (e.g., with cron job)
 */
const cleanupOldFiles = async (maxAgeHours = 24) => {
  try {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    let cleanedCount = 0;

    const dirs = [UPLOAD_CONFIG.rawDir, UPLOAD_CONFIG.processedDir];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
          logger.info(`🗑️ Deleted old file: ${file} (age: ${Math.round(fileAge / 3600000)}h)`);
        }
      }
    }

    logger.info(`🧹 Cleanup complete: ${cleanedCount} files deleted`);
    return cleanedCount;

  } catch (error) {
    logger.error(`Error during cleanup: ${error.message}`);
    throw error;
  }
};

/**
 * Get upload directory statistics
 */
const getUploadStats = () => {
  try {
    const stats = {
      raw: { count: 0, totalSize: 0 },
      processed: { count: 0, totalSize: 0 }
    };

    // Count raw files
    if (fs.existsSync(UPLOAD_CONFIG.rawDir)) {
      const rawFiles = fs.readdirSync(UPLOAD_CONFIG.rawDir);
      stats.raw.count = rawFiles.length;
      stats.raw.totalSize = rawFiles.reduce((total, file) => {
        const filePath = path.join(UPLOAD_CONFIG.rawDir, file);
        return total + fs.statSync(filePath).size;
      }, 0);
    }

    // Count processed files
    if (fs.existsSync(UPLOAD_CONFIG.processedDir)) {
      const processedFiles = fs.readdirSync(UPLOAD_CONFIG.processedDir);
      stats.processed.count = processedFiles.length;
      stats.processed.totalSize = processedFiles.reduce((total, file) => {
        const filePath = path.join(UPLOAD_CONFIG.processedDir, file);
        return total + fs.statSync(filePath).size;
      }, 0);
    }

    // Add human-readable sizes
    stats.raw.totalSizeMB = Math.round(stats.raw.totalSize / (1024 * 1024));
    stats.processed.totalSizeMB = Math.round(stats.processed.totalSize / (1024 * 1024));
    stats.totalSizeMB = stats.raw.totalSizeMB + stats.processed.totalSizeMB;

    return stats;

  } catch (error) {
    logger.error(`Error getting upload stats: ${error.message}`);
    return null;
  }
};

/**
 * Multer error handler
 * Use this after upload middleware to catch multer-specific errors
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error(`Multer error: ${err.message}`);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError(
          `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
          400,
          'FILE_TOO_LARGE'
        )
      );
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(
        new AppError('Only one file can be uploaded at a time', 400, 'TOO_MANY_FILES')
      );
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new AppError('Unexpected field name. Use "audio" as field name', 400, 'UNEXPECTED_FIELD')
      );
    }

    return next(
      new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR')
    );
  }

  next(err);
};

/**
 * Check if file is audio (by magic number / file signature)
 * More reliable than checking extension or MIME type
 */
const isAudioFile = (filePath) => {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // Check magic numbers for common audio formats
    const hex = buffer.toString('hex');

    // MP3
    if (hex.startsWith('494433') || hex.startsWith('fffb') || hex.startsWith('fff3')) {
      return 'audio/mpeg';
    }

    // WAV
    if (hex.startsWith('52494646') && hex.includes('57415645')) {
      return 'audio/wav';
    }

    // OGG
    if (hex.startsWith('4f676753')) {
      return 'audio/ogg';
    }

    // M4A / MP4
    if (hex.includes('6674797069736f6d') || hex.includes('667479704d344120')) {
      return 'audio/mp4';
    }

    // WebM
    if (hex.startsWith('1a45dfa3')) {
      return 'audio/webm';
    }

    return null;

  } catch (error) {
    logger.error(`Error checking file type: ${error.message}`);
    return null;
  }
};

module.exports = {
  UPLOAD_CONFIG,
  uploadAudio,
  validateAudioFile,
  validateAudioDuration,
  expressFileUploadConfig,
  validateExpressFileUpload,
  cleanupUploadedFile,
  cleanupOldFiles,
  getUploadStats,
  handleMulterError,
  isAudioFile,
  ensureUploadDirs,
  generateFilename
};
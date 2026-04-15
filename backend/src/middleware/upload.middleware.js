

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const winston = require('winston');
const ffmpeg = require('fluent-ffmpeg');


if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

const { AppError } = require('./error.middleware');


const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});


const STORAGE_BASE = path.join(process.cwd(), 'storage');
const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, 
  uploadDir: path.join(STORAGE_BASE, 'temp'), 
  rawDir: path.join(STORAGE_BASE, 'temp'), 
  processedDir: path.join(STORAGE_BASE, 'processed'),
  allowedFormats: (
    process.env.ALLOWED_AUDIO_FORMATS ||
    'audio/mpeg,audio/wav,audio/mp3,audio/webm,audio/ogg,audio/m4a,audio/x-m4a,audio/mp4'
  ).split(','),
  maxDuration: parseInt(process.env.MAX_AUDIO_DURATION) || 600, 
};


const ensureUploadDirs = () => {
  const dirs = [
    STORAGE_BASE,
    UPLOAD_CONFIG.uploadDir,
    UPLOAD_CONFIG.processedDir,
    path.join(STORAGE_BASE, 'audio'), 
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`📁 Created directory: ${dir}`);
    }
  });
};


ensureUploadDirs();


const generateFilename = (originalName, userId) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  return `${userId}_${timestamp}_${randomString}${ext}`;
};


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_CONFIG.rawDir);
  },
  filename: (req, file, cb) => {
    const userId = req.userId || 'anonymous';
    const filename = generateFilename(file.originalname, userId);
    cb(null, filename);
  },
});


const fileFilter = (req, file, cb) => {
  
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


const upload = multer({
  storage: storage,
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
    files: 1, 
  },
  fileFilter: fileFilter,
});


const uploadAudio = upload.single('audio');


const validateAudioFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No audio file provided', 400, 'NO_FILE_PROVIDED'));
    }

    const file = req.file;

    
    logger.info(`📤 File uploaded: ${file.filename} (${file.size} bytes)`);

    
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      
      fs.unlinkSync(file.path);

      return next(
        new AppError(
          `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
          400,
          'FILE_TOO_LARGE'
        )
      );
    }

    
    if (!fs.existsSync(file.path)) {
      return next(new AppError('Uploaded file not found', 500, 'FILE_NOT_FOUND'));
    }

    
    if (file.size === 0) {
      fs.unlinkSync(file.path);
      return next(new AppError('Uploaded file is empty', 400, 'EMPTY_FILE'));
    }

    
    req.uploadedFile = {
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
    };

    logger.info(`✅ File validation passed: ${file.filename}`);
    next();
  } catch (error) {
    logger.error(`Error validating file: ${error.message}`);

    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    next(new AppError('File validation failed', 500, 'VALIDATION_ERROR'));
  }
};


const validateAudioDuration = async (req, res, next) => {
  try {
    if (!req.uploadedFile || !req.uploadedFile.path) {
      return next(
        new AppError(
          'No uploaded file found for duration validation',
          500,
          'NO_FILE_FOR_VALIDATION'
        )
      );
    }

    const filePath = req.uploadedFile.path;
    const maxDuration = UPLOAD_CONFIG.maxDuration; 

    logger.info(`🎵 Checking audio duration for: ${req.uploadedFile.filename}`);

    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error(`❌ FFprobe error: ${err.message}`);
          
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

        
        if (duration > maxDuration) {
          const durationMinutes = Math.floor(duration / 60);
          const durationSeconds = Math.floor(duration % 60);
          const maxMinutes = Math.floor(maxDuration / 60);

          logger.warn(
            `❌ Audio too long: ${durationMinutes}m ${durationSeconds}s (max: ${maxMinutes}m)`
          );

          
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

       
        req.uploadedFile.duration = duration;
        req.uploadedFile.durationFormatted = `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`;

        logger.info(`✅ Duration validated: ${req.uploadedFile.durationFormatted} (${duration}s)`);

        resolve(next());
      });
    });
  } catch (error) {
    logger.error(`Error validating audio duration: ${error.message}`);

    
    if (req.uploadedFile && req.uploadedFile.path) {
      cleanupUploadedFile(req.uploadedFile.path);
    }

    next(new AppError('Audio duration validation failed', 500, 'DURATION_VALIDATION_ERROR'));
  }
};


const expressFileUploadConfig = {
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
  },
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded',
  useTempFiles: true,
  tempFileDir: UPLOAD_CONFIG.rawDir,
  uploadTimeout: 60000, 
  debug: process.env.NODE_ENV === 'development',
  parseNested: true,
};


const validateExpressFileUpload = async (req, res, next) => {
  try {
    if (!req.files || !req.files.audio) {
      return next(new AppError('No audio file provided', 400, 'NO_FILE_PROVIDED'));
    }

    const audioFile = req.files.audio;

    
    if (!UPLOAD_CONFIG.allowedFormats.includes(audioFile.mimetype)) {
      return next(
        new AppError(
          `Invalid file format. Allowed: ${UPLOAD_CONFIG.allowedFormats.join(', ')}`,
          400,
          'INVALID_FILE_FORMAT'
        )
      );
    }

    
    if (audioFile.size > UPLOAD_CONFIG.maxFileSize) {
      return next(
        new AppError(
          `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
          400,
          'FILE_TOO_LARGE'
        )
      );
    }

    
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

    
    const userId = req.userId || 'anonymous';
    const uniqueFilename = generateFilename(audioFile.name, userId);
    const finalPath = path.join(UPLOAD_CONFIG.rawDir, uniqueFilename);

    
    await audioFile.mv(finalPath);

    
    req.uploadedFile = {
      filename: uniqueFilename,
      originalName: audioFile.name,
      path: finalPath,
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      uploadedAt: new Date(),
    };

    logger.info(`✅ File uploaded and validated: ${uniqueFilename} (${audioFile.size} bytes)`);
    next();
  } catch (error) {
    logger.error(`Error in file upload: ${error.message}`);
    next(new AppError('File upload failed', 500, 'UPLOAD_ERROR'));
  }
};


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


const cleanupOldFiles = async (maxAgeHours = 24) => {
  try {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000; 
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


const getUploadStats = () => {
  try {
    const stats = {
      raw: { count: 0, totalSize: 0 },
      processed: { count: 0, totalSize: 0 },
    };

    
    if (fs.existsSync(UPLOAD_CONFIG.rawDir)) {
      const rawFiles = fs.readdirSync(UPLOAD_CONFIG.rawDir);
      stats.raw.count = rawFiles.length;
      stats.raw.totalSize = rawFiles.reduce((total, file) => {
        const filePath = path.join(UPLOAD_CONFIG.rawDir, file);
        return total + fs.statSync(filePath).size;
      }, 0);
    }

    
    if (fs.existsSync(UPLOAD_CONFIG.processedDir)) {
      const processedFiles = fs.readdirSync(UPLOAD_CONFIG.processedDir);
      stats.processed.count = processedFiles.length;
      stats.processed.totalSize = processedFiles.reduce((total, file) => {
        const filePath = path.join(UPLOAD_CONFIG.processedDir, file);
        return total + fs.statSync(filePath).size;
      }, 0);
    }

    
    stats.raw.totalSizeMB = Math.round(stats.raw.totalSize / (1024 * 1024));
    stats.processed.totalSizeMB = Math.round(stats.processed.totalSize / (1024 * 1024));
    stats.totalSizeMB = stats.raw.totalSizeMB + stats.processed.totalSizeMB;

    return stats;
  } catch (error) {
    logger.error(`Error getting upload stats: ${error.message}`);
    return null;
  }
};


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
      return next(new AppError('Only one file can be uploaded at a time', 400, 'TOO_MANY_FILES'));
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new AppError('Unexpected field name. Use "audio" as field name', 400, 'UNEXPECTED_FIELD')
      );
    }

    return next(new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
  }

  next(err);
};


const isAudioFile = (filePath) => {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    
    const hex = buffer.toString('hex');

    
    if (hex.startsWith('494433') || hex.startsWith('fffb') || hex.startsWith('fff3')) {
      return 'audio/mpeg';
    }

    
    if (hex.startsWith('52494646') && hex.includes('57415645')) {
      return 'audio/wav';
    }

   
    if (hex.startsWith('4f676753')) {
      return 'audio/ogg';
    }

   
    if (hex.includes('6674797069736f6d') || hex.includes('667479704d344120')) {
      return 'audio/mp4';
    }

    
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
  generateFilename,
};

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

// Storage directories
const STORAGE_BASE = path.join(process.cwd(), 'storage');
const AUDIO_DIR = path.join(STORAGE_BASE, 'audio');
const TEMP_DIR = path.join(STORAGE_BASE, 'temp');
const PROCESSED_DIR = path.join(STORAGE_BASE, 'processed');

/**
 * Initialize storage directories
 */
async function initializeStorage() {
  try {
    await fs.mkdir(STORAGE_BASE, { recursive: true });
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(PROCESSED_DIR, { recursive: true });
    
    console.log('✅ Storage directories initialized');
    
    return {
      success: true,
      paths: {
        base: STORAGE_BASE,
        audio: AUDIO_DIR,
        temp: TEMP_DIR,
        processed: PROCESSED_DIR
      }
    };
  } catch (error) {
    console.error('❌ Storage initialization error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Store uploaded audio file temporarily
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} File info with temp path
 */
async function storeTempAudioFile(file) {
  try {
    const fileId = generateFileId();
    const extension = path.extname(file.originalname);
    const filename = `${fileId}${extension}`;
    const tempPath = path.join(TEMP_DIR, filename);

    // Move uploaded file to temp directory
    await fs.rename(file.path, tempPath);

    console.log(`✅ Temp audio stored: ${filename}`);

    return {
      success: true,
      data: {
        fileId,
        filename,
        tempPath,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }
    };
  } catch (error) {
    console.error('❌ Store temp audio error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Store processed audio file permanently
 * @param {string} processedPath - Path to processed audio file
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} Permanent storage info
 */
async function storeProcessedAudio(processedPath, meetingId) {
  try {
    const extension = path.extname(processedPath);
    const filename = `${meetingId}${extension}`;
    const permanentPath = path.join(AUDIO_DIR, filename);

    // Copy processed file to permanent storage
    await fs.copyFile(processedPath, permanentPath);

    // Get file stats
    const stats = await fs.stat(permanentPath);

    console.log(`✅ Processed audio stored: ${filename} (${formatFileSize(stats.size)})`);

    return {
      success: true,
      data: {
        path: permanentPath,
        filename,
        size: stats.size,
        url: `/storage/audio/${filename}` // Relative URL for serving
      }
    };
  } catch (error) {
    console.error('❌ Store processed audio error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get audio file by meeting ID
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} File path and info
 */
async function getAudioFile(meetingId) {
  try {
    // Find audio file with any extension
    const files = await fs.readdir(AUDIO_DIR);
    const audioFile = files.find(file => file.startsWith(meetingId));

    if (!audioFile) {
      return {
        success: false,
        error: 'Audio file not found'
      };
    }

    const filePath = path.join(AUDIO_DIR, audioFile);
    const stats = await fs.stat(filePath);

    return {
      success: true,
      data: {
        path: filePath,
        filename: audioFile,
        size: stats.size,
        mimetype: getMimeType(audioFile)
      }
    };
  } catch (error) {
    console.error('❌ Get audio file error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete audio file
 * @param {string} filePath - Full path to file
 * @returns {Promise<Object>} Delete result
 */
async function deleteAudioFile(filePath) {
  try {
    // Check if file exists
    if (!fsSync.existsSync(filePath)) {
      return {
        success: false,
        error: 'File not found'
      };
    }

    await fs.unlink(filePath);
    console.log(`✅ Audio file deleted: ${filePath}`);

    return {
      success: true,
      message: 'File deleted successfully'
    };
  } catch (error) {
    console.error('❌ Delete audio file error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete temporary file
 * @param {string} tempPath - Path to temp file
 * @returns {Promise<Object>} Delete result
 */
async function deleteTempFile(tempPath) {
  try {
    if (!fsSync.existsSync(tempPath)) {
      return { success: true }; // Already deleted
    }

    await fs.unlink(tempPath);
    console.log(`🗑️ Temp file deleted: ${path.basename(tempPath)}`);

    return {
      success: true,
      message: 'Temp file deleted'
    };
  } catch (error) {
    console.error('❌ Delete temp file error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up old temporary files (older than 1 hour)
 * @returns {Promise<Object>} Cleanup result
 */
async function cleanupOldTempFiles() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);

      if (stats.mtimeMs < oneHourAgo) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} old temp files`);
    }

    return {
      success: true,
      deletedCount
    };
  } catch (error) {
    console.error('❌ Cleanup temp files error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up old processed files in processed directory
 * @returns {Promise<Object>} Cleanup result
 */
async function cleanupProcessedFiles() {
  try {
    const files = await fs.readdir(PROCESSED_DIR);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(PROCESSED_DIR, file);
      await fs.unlink(filePath);
      deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} processed files`);
    }

    return {
      success: true,
      deletedCount
    };
  } catch (error) {
    console.error('❌ Cleanup processed files error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get storage statistics
 * @returns {Promise<Object>} Storage stats
 */
async function getStorageStats() {
  try {
    const [audioFiles, tempFiles, processedFiles] = await Promise.all([
      fs.readdir(AUDIO_DIR),
      fs.readdir(TEMP_DIR),
      fs.readdir(PROCESSED_DIR)
    ]);

    // Calculate total sizes
    let audioSize = 0;
    let tempSize = 0;
    let processedSize = 0;

    for (const file of audioFiles) {
      const stats = await fs.stat(path.join(AUDIO_DIR, file));
      audioSize += stats.size;
    }

    for (const file of tempFiles) {
      const stats = await fs.stat(path.join(TEMP_DIR, file));
      tempSize += stats.size;
    }

    for (const file of processedFiles) {
      const stats = await fs.stat(path.join(PROCESSED_DIR, file));
      processedSize += stats.size;
    }

    return {
      success: true,
      data: {
        audio: {
          count: audioFiles.length,
          size: audioSize,
          sizeFormatted: formatFileSize(audioSize)
        },
        temp: {
          count: tempFiles.length,
          size: tempSize,
          sizeFormatted: formatFileSize(tempSize)
        },
        processed: {
          count: processedFiles.length,
          size: processedSize,
          sizeFormatted: formatFileSize(processedSize)
        },
        total: {
          count: audioFiles.length + tempFiles.length + processedFiles.length,
          size: audioSize + tempSize + processedSize,
          sizeFormatted: formatFileSize(audioSize + tempSize + processedSize)
        }
      }
    };
  } catch (error) {
    console.error('❌ Get storage stats error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file exists
 */
function fileExists(filePath) {
  return fsSync.existsSync(filePath);
}

/**
 * Get file size
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} File size info
 */
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      data: {
        bytes: stats.size,
        formatted: formatFileSize(stats.size)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate audio file
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
function validateAudioFile(file) {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (3 min at high quality)
  const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
  const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4'];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`
    };
  }

  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  return {
    valid: true
  };
}

/**
 * Create a download stream for audio file
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} Stream and file info
 */
async function createAudioDownloadStream(meetingId) {
  try {
    const fileResult = await getAudioFile(meetingId);
    
    if (!fileResult.success) {
      throw new Error(fileResult.error);
    }

    const stream = fsSync.createReadStream(fileResult.data.path);

    return {
      success: true,
      data: {
        stream,
        filename: fileResult.data.filename,
        mimetype: fileResult.data.mimetype,
        size: fileResult.data.size
      }
    };
  } catch (error) {
    console.error('❌ Create download stream error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique file ID
 */
function generateFileId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.mp4': 'audio/mp4'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Get storage directory paths
 */
function getStoragePaths() {
  return {
    base: STORAGE_BASE,
    audio: AUDIO_DIR,
    temp: TEMP_DIR,
    processed: PROCESSED_DIR
  };
}

module.exports = {
  initializeStorage,
  storeTempAudioFile,
  storeProcessedAudio,
  getAudioFile,
  deleteAudioFile,
  deleteTempFile,
  cleanupOldTempFiles,
  cleanupProcessedFiles,
  getStorageStats,
  fileExists,
  getFileSize,
  validateAudioFile,
  createAudioDownloadStream,
  getStoragePaths
};
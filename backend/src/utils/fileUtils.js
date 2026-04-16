


/**
 * Sanitize a title for use in filenames
 * Removes special characters and truncates to max length
 * @param {string} title - The title to sanitize
 * @param {number} maxLength - Maximum length of the sanitized title (default: 50)
 * @returns {string}
 */
const sanitizeTitle = (title, maxLength = 50) => {
  if (!title) return 'meeting';

  
  let sanitized = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') 
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_') 
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, ''); 

 
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
   
    if (sanitized.endsWith('_')) {
      sanitized = sanitized.slice(0, -1);
    }
  }

  return sanitized || 'meeting';
};

/**
 * Format a date for use in filenames
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
const formatDateForFilename = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
};

/**
 * Generate a download filename with meeting title and timestamp
 * @param {string} title - Meeting title
 * @param {Date|string} createdAt - Meeting creation date
 * @param {string} fileType - Type of file (audio, transcript, summary)
 * @param {string} extension - File extension (mp3, txt, json)
 * @returns {string} Formatted filename
 */
const generateDownloadFilename = (title, createdAt, fileType, extension) => {
  const sanitizedTitle = sanitizeTitle(title);
  const dateStr = formatDateForFilename(createdAt);
  return `${sanitizedTitle}_${dateStr}_${fileType}.${extension}`;
};

/**
 * Ensure a directory exists, create if it doesn't
 * @param {string} dirPath - Path to the directory
 * @returns {boolean}
 */
const ensureDirectoryExists = (dirPath) => {
  const fs = require('fs');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
};

module.exports = {
  sanitizeTitle,
  formatDateForFilename,
  generateDownloadFilename,
  ensureDirectoryExists,
};

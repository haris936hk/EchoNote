
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

const formatDateForFilename = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {

    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
};

const generateDownloadFilename = (title, createdAt, fileType, extension) => {
  const sanitizedTitle = sanitizeTitle(title);
  const dateStr = formatDateForFilename(createdAt);
  return `${sanitizedTitle}_${dateStr}_${fileType}.${extension}`;
};

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

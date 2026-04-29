const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG_PATH =
  process.env.FFMPEG_PATH ||
  'C:\\Users\\HK\\Desktop\\ffmpeg-master-latest-win64-gpl-shared\\bin\\ffmpeg.exe';

const convertWavToMp3 = (inputPath, outputPath) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(inputPath)) {
      return resolve({
        success: false,
        error: `Input file not found: ${inputPath}`,
      });
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const args = ['-i', inputPath, '-b:a', '128k', '-ac', '1', '-ar', '44100', '-y', outputPath];

    const ffmpeg = spawn(FFMPEG_PATH, args);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        resolve({
          success: true,
          outputPath,
          size: stats.size,
        });
      } else {
        resolve({
          success: false,
          error: `FFmpeg conversion failed with code ${code}: ${stderr.slice(-500)}`,
        });
      }
    });

    ffmpeg.on('error', (err) => {
      resolve({
        success: false,
        error: `FFmpeg process error: ${err.message}`,
      });
    });
  });
};

const cleanupTempMp3 = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to cleanup temp file ${filePath}:`, error.message);
    return false;
  }
};

const checkFfmpegAvailable = () => {
  return new Promise((resolve) => {
    const ffmpeg = spawn(FFMPEG_PATH, ['-version']);

    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });

    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
};

module.exports = {
  convertWavToMp3,
  cleanupTempMp3,
  checkFfmpegAvailable,
  FFMPEG_PATH,
};

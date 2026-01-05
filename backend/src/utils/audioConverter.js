// backend/src/utils/audioConverter.js
// Utility for converting audio files using FFmpeg

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// FFmpeg path - can be configured via environment variable
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\Users\\HK\\Desktop\\ffmpeg-master-latest-win64-gpl-shared\\bin\\ffmpeg.exe';

/**
 * Convert WAV audio file to MP3 format
 * @param {string} inputPath - Path to the input WAV file
 * @param {string} outputPath - Path for the output MP3 file
 * @returns {Promise<{success: boolean, outputPath?: string, size?: number, error?: string}>}
 */
const convertWavToMp3 = (inputPath, outputPath) => {
    return new Promise((resolve) => {
        // Check if input file exists
        if (!fs.existsSync(inputPath)) {
            return resolve({
                success: false,
                error: `Input file not found: ${inputPath}`
            });
        }

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // FFmpeg arguments for WAV to MP3 conversion
        // -i: input file
        // -b:a 128k: 128kbps audio bitrate
        // -ac 1: mono channel
        // -ar 44100: 44.1kHz sample rate
        // -y: overwrite output file if exists
        const args = [
            '-i', inputPath,
            '-b:a', '128k',
            '-ac', '1',
            '-ar', '44100',
            '-y',
            outputPath
        ];

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
                    size: stats.size
                });
            } else {
                resolve({
                    success: false,
                    error: `FFmpeg conversion failed with code ${code}: ${stderr.slice(-500)}`
                });
            }
        });

        ffmpeg.on('error', (err) => {
            resolve({
                success: false,
                error: `FFmpeg process error: ${err.message}`
            });
        });
    });
};

/**
 * Cleanup temporary MP3 file after download
 * @param {string} filePath - Path to the temporary file to delete
 * @returns {Promise<boolean>}
 */
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

/**
 * Check if FFmpeg is available
 * @returns {Promise<boolean>}
 */
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
    FFMPEG_PATH
};

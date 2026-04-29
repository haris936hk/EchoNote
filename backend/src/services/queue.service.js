const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const meetingService = require('./meeting.service');

class QueueService {
  constructor() {
    this.queue = [];
    this.processing = null;
    this.workerInterval = null;
    this.retryTimeouts = new Map();
  }

  async addToQueue(meetingId, userId, audioFile) {
    try {
      this.queue.push({
        meetingId,
        userId,
        audioFile,
        addedAt: new Date(),
      });

      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'PENDING',
          queuedAt: new Date(),
        },
      });

      logger.info(`Meeting ${meetingId} added to queue. Queue length: ${this.queue.length}`);

      return { success: true, queuePosition: this.queue.length };
    } catch (error) {
      logger.error(`Failed to add meeting ${meetingId} to queue:`, error);
      return { success: false, error: error.message };
    }
  }

  async processNext() {
    if (this.processing) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    this.processing = job.meetingId;

    logger.info(`Processing meeting ${job.meetingId} (${this.queue.length} remaining in queue)`);

    try {
      await prisma.meeting.update({
        where: { id: job.meetingId },
        data: {
          status: 'PROCESSING_AUDIO',
          processingStartedAt: new Date(),
        },
      });

      await meetingService.uploadAndProcessAudio(job.meetingId, job.userId, job.audioFile, {
        keepTempOnError: true,
      });

      logger.info(`Meeting ${job.meetingId} processed successfully`);
    } catch (error) {
      logger.error(`Meeting ${job.meetingId} processing failed:`, error);

      const meeting = await prisma.meeting.findUnique({
        where: { id: job.meetingId },
        select: { retryCount: true },
      });

      const retryCount = meeting?.retryCount || 0;

      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 60000;
        logger.info(
          `Scheduling retry for meeting ${job.meetingId} in ${retryDelay / 1000}s (attempt ${retryCount + 1}/3)`
        );

        await prisma.meeting.update({
          where: { id: job.meetingId },
          data: {
            status: 'PENDING',
            retryCount: retryCount + 1,
            lastRetryAt: new Date(),
          },
        });

        const timeout = setTimeout(() => {
          logger.info(`Retrying meeting ${job.meetingId} (attempt ${retryCount + 1}/3)`);
          this.queue.push(job);
          this.retryTimeouts.delete(job.meetingId);
        }, retryDelay);

        this.retryTimeouts.set(job.meetingId, timeout);
      } else {
        logger.error(`Meeting ${job.meetingId} failed after 3 attempts`);
        await prisma.meeting.update({
          where: { id: job.meetingId },
          data: {
            status: 'FAILED',
            processingError: error.message,
          },
        });

        if (job.audioFile && job.audioFile.path) {
          try {
            const fs = require('fs').promises;
            await fs.unlink(job.audioFile.path);
            logger.info(`🗑️ Cleaned up temp file after max retries: ${job.audioFile.path}`);
          } catch (cleanupError) {
            // ignore
          }
        }
      }
    } finally {
      this.processing = null;
    }
  }

  startWorker() {
    if (this.workerInterval) {
      logger.warn('Worker already running');
      return;
    }

    logger.info('Starting queue worker (checks every 5s)');

    this.workerInterval = setInterval(() => {
      this.processNext();
    }, 5000);

    this.processNext();
  }

  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      logger.info('Queue worker stopped');
    }

    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      retryingCount: this.retryTimeouts.size,
    };
  }

  async cancelMeeting(meetingId) {
    const index = this.queue.findIndex((job) => job.meetingId === meetingId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      logger.info(`Meeting ${meetingId} removed from queue`);
      return { success: true };
    }

    const timeout = this.retryTimeouts.get(meetingId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(meetingId);
      logger.info(`Retry timeout cleared for meeting ${meetingId}`);
      return { success: true };
    }

    return { success: false, error: 'Meeting not in queue' };
  }
}

const queueService = new QueueService();

module.exports = queueService;

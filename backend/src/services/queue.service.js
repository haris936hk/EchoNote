const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const meetingService = require('./meeting.service');

class QueueService {
  constructor() {
    this.queue = [];           // Array of { meetingId, userId, audioFile, addedAt }
    this.processing = null;    // Currently processing meeting ID
    this.workerInterval = null;
    this.retryTimeouts = new Map(); // meetingId -> timeout handle
  }

  /**
   * Add meeting to queue
   */
  async addToQueue(meetingId, userId, audioFile) {
    try {
      // Add to queue array
      this.queue.push({
        meetingId,
        userId,
        audioFile,
        addedAt: new Date()
      });

      // Update meeting status to PENDING
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'PENDING',
          queuedAt: new Date()
        }
      });

      logger.info(`Meeting ${meetingId} added to queue. Queue length: ${this.queue.length}`);

      return { success: true, queuePosition: this.queue.length };
    } catch (error) {
      logger.error(`Failed to add meeting ${meetingId} to queue:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process next meeting in queue
   */
  async processNext() {
    // Skip if already processing
    if (this.processing) {
      return;
    }

    // Skip if queue is empty
    if (this.queue.length === 0) {
      return;
    }

    // Get next meeting from queue (FIFO)
    const job = this.queue.shift();
    this.processing = job.meetingId;

    logger.info(`Processing meeting ${job.meetingId} (${this.queue.length} remaining in queue)`);

    try {
      // Update status to PROCESSING_AUDIO
      await prisma.meeting.update({
        where: { id: job.meetingId },
        data: {
          status: 'PROCESSING_AUDIO',
          processingStartedAt: new Date()
        }
      });

      // Call existing processing pipeline
      await meetingService.uploadAndProcessAudio(job.meetingId, job.userId, job.audioFile);

      logger.info(`Meeting ${job.meetingId} processed successfully`);

      // Mark as completed (already done in uploadAndProcessAudio)

    } catch (error) {
      logger.error(`Meeting ${job.meetingId} processing failed:`, error);

      // Get current retry count
      const meeting = await prisma.meeting.findUnique({
        where: { id: job.meetingId },
        select: { retryCount: true }
      });

      const retryCount = meeting?.retryCount || 0;

      if (retryCount < 3) {
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, retryCount) * 60000; // 1min, 2min, 4min
        logger.info(`Scheduling retry for meeting ${job.meetingId} in ${retryDelay/1000}s (attempt ${retryCount + 1}/3)`);

        // Update retry count and status
        await prisma.meeting.update({
          where: { id: job.meetingId },
          data: {
            status: 'PENDING',
            retryCount: retryCount + 1,
            lastRetryAt: new Date()
          }
        });

        // Schedule retry
        const timeout = setTimeout(() => {
          logger.info(`Retrying meeting ${job.meetingId} (attempt ${retryCount + 1}/3)`);
          this.queue.push(job); // Re-add to queue
          this.retryTimeouts.delete(job.meetingId);
        }, retryDelay);

        this.retryTimeouts.set(job.meetingId, timeout);

      } else {
        // Max retries exceeded - mark as FAILED
        logger.error(`Meeting ${job.meetingId} failed after 3 attempts`);
        await prisma.meeting.update({
          where: { id: job.meetingId },
          data: {
            status: 'FAILED',
            processingError: error.message
          }
        });
      }
    } finally {
      // Clear processing flag
      this.processing = null;
    }
  }

  /**
   * Start worker interval
   */
  startWorker() {
    if (this.workerInterval) {
      logger.warn('Worker already running');
      return;
    }

    logger.info('Starting queue worker (checks every 5s)');

    // Check queue every 5 seconds
    this.workerInterval = setInterval(() => {
      this.processNext();
    }, 5000);

    // Process immediately on start
    this.processNext();
  }

  /**
   * Stop worker interval
   */
  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      logger.info('Queue worker stopped');
    }

    // Clear all retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      retryingCount: this.retryTimeouts.size
    };
  }

  /**
   * Cancel a queued meeting
   */
  async cancelMeeting(meetingId) {
    // Remove from queue
    const index = this.queue.findIndex(job => job.meetingId === meetingId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      logger.info(`Meeting ${meetingId} removed from queue`);
      return { success: true };
    }

    // Clear retry timeout
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

// Singleton instance
const queueService = new QueueService();

module.exports = queueService;

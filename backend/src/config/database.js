// backend/src/config/database.js
// Database configuration and Prisma client initialization

const { PrismaClient } = require('@prisma/client');
const winston = require('winston');

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

// Prisma Client options
const prismaOptions = {
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'minimal',
};

// Initialize Prisma Client
const prisma = new PrismaClient(prismaOptions);

// Log Prisma queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

// Log Prisma errors
prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
});

// Log Prisma info
prisma.$on('info', (e) => {
  logger.info(`Prisma Info: ${e.message}`);
});

// Log Prisma warnings
prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

/**
 * Connect to database
 */
const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection verified');
    
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

/**
 * Disconnect from database
 */
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('🔌 Database disconnected');
  } catch (error) {
    logger.error('❌ Error disconnecting database:', error.message);
    throw error;
  }
};

/**
 * Check database health
 */
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    logger.error('Database health check failed:', error.message);
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date() 
    };
  }
};

/**
 * Clean up old processing logs (optional maintenance)
 */
const cleanupOldLogs = async (daysToKeep = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await prisma.processingLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    
    logger.info(`🧹 Cleaned up ${result.count} old processing logs`);
    return result.count;
  } catch (error) {
    logger.error('Error cleaning up logs:', error.message);
    throw error;
  }
};

/**
 * Clean up audio files that should be deleted
 */
const cleanupExpiredAudio = async () => {
  try {
    const now = new Date();
    
    // Find meetings where audio should be deleted
    const expiredMeetings = await prisma.meeting.findMany({
      where: {
        shouldDeleteAudioAt: {
          lte: now
        },
        audioDeletedAt: null,
        audioUrl: {
          not: null
        }
      },
      select: {
        id: true,
        audioUrl: true,
        title: true
      }
    });
    
    if (expiredMeetings.length === 0) {
      logger.info('No expired audio files to clean up');
      return 0;
    }
    
    logger.info(`Found ${expiredMeetings.length} meetings with expired audio`);
    
    // Update meetings to mark audio as deleted
    // Note: Actual file deletion from Supabase happens in storage.service.js
    const updatePromises = expiredMeetings.map(meeting =>
      prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          audioUrl: null,
          audioDeletedAt: now
        }
      })
    );
    
    await Promise.all(updatePromises);
    
    logger.info(`✅ Marked ${expiredMeetings.length} audio files for deletion`);
    return expiredMeetings;
    
  } catch (error) {
    logger.error('Error cleaning up expired audio:', error.message);
    throw error;
  }
};

/**
 * Get database statistics
 */
const getDatabaseStats = async () => {
  try {
    const [
      totalUsers,
      totalMeetings,
      completedMeetings,
      failedMeetings,
      processingMeetings,
      totalStorageSize
    ] = await Promise.all([
      prisma.user.count(),
      prisma.meeting.count(),
      prisma.meeting.count({ where: { status: 'COMPLETED' } }),
      prisma.meeting.count({ where: { status: 'FAILED' } }),
      prisma.meeting.count({ 
        where: { 
          status: { 
            in: ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING'] 
          } 
        } 
      }),
      prisma.meeting.aggregate({
        _sum: {
          audioSize: true
        }
      })
    ]);
    
    return {
      users: {
        total: totalUsers
      },
      meetings: {
        total: totalMeetings,
        completed: completedMeetings,
        failed: failedMeetings,
        processing: processingMeetings
      },
      storage: {
        totalBytes: totalStorageSize._sum.audioSize || 0,
        totalMB: Math.round((totalStorageSize._sum.audioSize || 0) / (1024 * 1024))
      }
    };
  } catch (error) {
    logger.error('Error getting database stats:', error.message);
    throw error;
  }
};

/**
 * Transaction helper with retry logic
 */
const executeTransaction = async (callback, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        return await callback(tx);
      });
      return result;
    } catch (error) {
      lastError = error;
      logger.warn(`Transaction attempt ${attempt} failed: ${error.message}`);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }
  
  logger.error(`Transaction failed after ${maxRetries} attempts`);
  throw lastError;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  cleanupOldLogs,
  cleanupExpiredAudio,
  getDatabaseStats,
  executeTransaction
};
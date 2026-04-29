const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const ffmpeg = require('fluent-ffmpeg');

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

const { prisma } = require('./config/database');

const storageService = require('./services/storage.service');
const queueService = require('./services/queue.service');
const transcriptionService = require('./services/transcription.service');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const meetingRoutes = require('./routes/meeting.routes');
const storageRoutes = require('./routes/storage.routes');
const calendarRoutes = require('./routes/calendar.routes');
const taskRoutes = require('./routes/task.routes');
const notificationRoutes = require('./routes/notification.routes');
const publicRoutes = require('./routes/public.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const liveblocksRoutes = require('./routes/liveblocks.routes');
const jiraRoutes = require('./routes/jira.routes');

const { errorHandler } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');

const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/api/', apiLimiter);

app.use('/storage', express.static(path.join(__dirname, 'storage')));

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const storageStats = await storageService.getStorageStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected',
        storage: storageStats.success ? 'operational' : 'degraded',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/liveblocks', liveblocksRoutes);
app.use('/api/jira', jiraRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'EchoNote API',
    version: '1.0.0',
    documentation: `${FRONTEND_URL}/docs`,
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      meetings: '/api/meetings',
      storage: '/api/storage',
      health: '/health',
    },
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

app.use(errorHandler);

cron.schedule('0 * * * *', async () => {
  console.log('🧹 Running scheduled storage cleanup...');

  try {
    await storageService.cleanupOldTempFiles();
    await storageService.cleanupProcessedFiles();

    const stats = await storageService.getStorageStats();
    if (stats.success) {
      console.log(
        `📊 Storage: ${stats.data.total.sizeFormatted} (${stats.data.total.count} files)`
      );
    }
  } catch (error) {
    console.error('❌ Storage cleanup error:', error.message);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection healthy');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
});

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('✅ HTTP server closed');

    try {
      queueService.stopWorker();
      console.log('✅ Queue worker stopped');

      await prisma.$disconnect();
      console.log('✅ Database connection closed');

      console.log('👋 Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

async function initializeServer() {
  try {
    console.log('\n🚀 Starting EchoNote Backend Server...\n');

    console.log('📊 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected');

    console.log('📁 Initializing storage...');
    const storageResult = await storageService.initializeStorage();
    if (storageResult.success) {
      console.log('✅ Storage initialized');
    } else {
      throw new Error(`Storage initialization failed: ${storageResult.error}`);
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_REFRESH_TOKEN) {
      console.log('📧 Checking email service (Gmail OAuth2)...');
      console.log('✅ Email service configured');
    } else {
      console.log(
        '⚠️  Email service not fully configured (GMAIL_USER or GMAIL_REFRESH_TOKEN missing)'
      );
    }

    console.log('🐍 Checking Python dependencies...');
    const { execSync } = require('child_process');
    const pythonCmd = process.env.PYTHON_PATH || 'python3';
    try {
      execSync(`${pythonCmd} --version`, { stdio: 'ignore' });
      console.log(`✅ Python available (${pythonCmd})`);
    } catch (error) {
      console.log(`⚠️  Python not found (tried: ${pythonCmd}). Audio processing may fail.`);
    }

    console.log('🎵 Checking FFmpeg/FFprobe dependencies...');
    try {
      const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
      const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

      execSync(`${ffmpegPath} -version`, { stdio: 'ignore' });
      console.log(`✅ FFmpeg available (${ffmpegPath})`);

      execSync(`${ffprobePath} -version`, { stdio: 'ignore' });
      console.log(`✅ FFprobe available (${ffprobePath})`);
    } catch (error) {
      console.log(
        '❌ FFmpeg/FFprobe not found. Audio duration validation and processing will fail.'
      );
      console.log(
        '👉 Please install FFmpeg and add it to PATH, or set FFMPEG_PATH and FFPROBE_PATH in .env'
      );
    }

    console.log('🤖 Initializing transcription service...');
    try {
      const result = await transcriptionService.initialize();
      if (result) {
        console.log('✅ Transcription service ready');
      } else {
        console.log('⚠️  Transcription service initialization failed. It will try again on use.');
      }
    } catch (err) {
      console.log('⚠️  Transcription service initialization error:', err.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All services initialized successfully');
    console.log('='.repeat(60) + '\n');

    return true;
  } catch (error) {
    console.error('\n❌ Server initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

let server;

initializeServer().then((initialized) => {
  if (!initialized) {
    console.error('❌ Failed to initialize server. Exiting...');
    process.exit(1);
  }

  server = app.listen(PORT, () => {
    console.log('🎉 EchoNote Backend Server Running\n');
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`🔗 API Endpoint: http://localhost:${PORT}/api`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`🖥️  Frontend URL: ${FRONTEND_URL}`);
    console.log('\n' + '='.repeat(60));
    console.log('📝 Available Endpoints:');
    console.log('   POST   /api/auth/google');
    console.log('   POST   /api/auth/refresh');
    console.log('   POST   /api/auth/logout');
    console.log('   GET    /api/users/profile');
    console.log('   PATCH  /api/users/profile');
    console.log('   DELETE /api/users/account');
    console.log('   POST   /api/meetings');
    console.log('   GET    /api/meetings');
    console.log('   GET    /api/meetings/:id');
    console.log('   PATCH  /api/meetings/:id');
    console.log('   DELETE /api/meetings/:id');
    console.log('   GET    /api/meetings/:id/download');
    console.log('   GET    /api/storage/stats');
    console.log('='.repeat(60) + '\n');
    console.log('🎯 Server ready to accept requests!\n');

    queueService.startWorker();
    console.log('⚙️  Meeting processing queue worker started\n');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });
});

module.exports = app;

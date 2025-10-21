const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import configuration
const { prisma } = require('./config/database');

// Import services
const storageService = require('./services/storage.service');
const emailService = require('./services/email.service');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const meetingRoutes = require('./routes/meeting.routes');
const storageRoutes = require('./routes/storage.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { rateLimit } = require('./middleware/auth.middleware');

// Initialize Express app
const app = express();

// Environment variables with defaults
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting (global)
app.use('/api/', rateLimit());

// Serve static files from storage directory
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get storage stats
    const storageStats = await storageService.getStorageStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected',
        storage: storageStats.success ? 'operational' : 'degraded'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ============================================
// API ROUTES
// ============================================

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/storage', storageRoutes);

// API root endpoint
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
      health: '/health'
    }
  });
});

// ============================================
// 404 HANDLER
// ============================================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

app.use(errorHandler);

// ============================================
// CRON JOBS
// ============================================

// Clean up old temporary files every hour
cron.schedule('0 * * * *', async () => {
  console.log('🧹 Running scheduled storage cleanup...');
  
  try {
    await storageService.cleanupOldTempFiles();
    await storageService.cleanupProcessedFiles();
    
    const stats = await storageService.getStorageStats();
    if (stats.success) {
      console.log(`📊 Storage: ${stats.data.total.sizeFormatted} (${stats.data.total.count} files)`);
    }
  } catch (error) {
    console.error('❌ Storage cleanup error:', error.message);
  }
});

// Database health check every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection healthy');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Close server
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      // Disconnect from database
      await prisma.$disconnect();
      console.log('✅ Database connection closed');
      
      console.log('👋 Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ============================================
// SERVER INITIALIZATION
// ============================================

async function initializeServer() {
  try {
    console.log('\n🚀 Starting EchoNote Backend Server...\n');
    
    // Step 1: Test database connection
    console.log('📊 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Step 2: Initialize storage directories
    console.log('📁 Initializing storage...');
    const storageResult = await storageService.initializeStorage();
    if (storageResult.success) {
      console.log('✅ Storage initialized');
    } else {
      throw new Error(`Storage initialization failed: ${storageResult.error}`);
    }
    
    // Step 3: Test email service (optional, won't fail if not configured)
    if (process.env.RESEND_API_KEY) {
      console.log('📧 Testing email service...');
      console.log('✅ Email service configured');
    } else {
      console.log('⚠️  Email service not configured (RESEND_API_KEY missing)');
    }
    
    // Step 4: Verify Python dependencies
    console.log('🐍 Checking Python dependencies...');
    const { execSync } = require('child_process');
    const pythonCmd = process.env.PYTHON_PATH || 'python3';
    try {
      execSync(`${pythonCmd} --version`, { stdio: 'ignore' });
      console.log(`✅ Python available (${pythonCmd})`);
    } catch (error) {
      console.log(`⚠️  Python not found (tried: ${pythonCmd}). Audio processing may fail.`);
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

// ============================================
// START SERVER
// ============================================

let server;

initializeServer().then((initialized) => {
  if (!initialized) {
    console.error('❌ Failed to initialize server. Exiting...');
    process.exit(1);
  }
  
  // Start HTTP server
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
  });
  
  // Handle server errors
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

// Export app for testing
module.exports = app;
// trigger reload


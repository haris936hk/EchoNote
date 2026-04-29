
const express = require('express');
const router = express.Router();
const storageService = require('../services/storage.service');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/stats', authenticate, async (req, res) => {
  try {
    const result = await storageService.getStorageStats();

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Get storage stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get storage statistics',
    });
  }
});

router.post('/cleanup', authenticate, async (req, res) => {
  try {
    console.log('🧹 Manual storage cleanup triggered');

    await storageService.cleanupOldTempFiles();
    await storageService.cleanupProcessedFiles();

    const stats = await storageService.getStorageStats();

    return res.status(200).json({
      success: true,
      message: 'Storage cleanup completed',
      data: stats.success ? stats.data : undefined,
    });
  } catch (error) {
    console.error('Storage cleanup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Storage cleanup failed',
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    const result = await storageService.getStorageStats();

    return res.status(200).json({
      success: true,
      status: result.success ? 'healthy' : 'degraded',
      service: 'storage',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      service: 'storage',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;

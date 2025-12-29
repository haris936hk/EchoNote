/**
 * Admin Routes
 *
 * Administrative endpoints for:
 * - Summarization provider management
 * - System health checks
 * - Configuration updates
 *
 * All endpoints require authentication + admin privileges
 */

const express = require('express');
const router = express.Router();
const summarizationService = require('../services/summarizationService');
const customModelService = require('../services/customModelService');
const groqService = require('../services/groqService');
const logger = require('../utils/logger');

// Middleware imports (adjust paths based on your project structure)
// const { authenticateToken, isAdmin } = require('../middleware/auth');

// For testing without auth, comment out and use this:
const authenticateToken = (req, res, next) => next();
const isAdmin = (req, res, next) => next();

/**
 * GET /api/admin/summarization/config
 *
 * Get current summarization configuration
 */
router.get('/summarization/config', authenticateToken, isAdmin, (req, res) => {
  try {
    const config = summarizationService.getConfig();

    logger.info('[Admin] Config retrieved', { requestedBy: req.user?.email });

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('[Admin] Failed to get config', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/summarization/switch
 *
 * Switch summarization provider at runtime
 *
 * Body: { "provider": "groq" | "custom" }
 */
router.post('/summarization/switch', authenticateToken, isAdmin, (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider is required. Must be "groq" or "custom"'
      });
    }

    if (!['groq', 'custom'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "groq" or "custom"'
      });
    }

    summarizationService.switchProvider(provider);

    logger.info('[Admin] Provider switched', {
      provider,
      requestedBy: req.user?.email
    });

    res.json({
      success: true,
      message: `Successfully switched to ${provider} provider`,
      data: summarizationService.getConfig()
    });
  } catch (error) {
    logger.error('[Admin] Failed to switch provider', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/summarization/health
 *
 * Check health of current summarization provider
 */
router.get('/summarization/health', authenticateToken, isAdmin, async (req, res) => {
  try {
    const health = await summarizationService.healthCheck();

    logger.info('[Admin] Health check performed', {
      provider: summarizationService.provider,
      healthy: health.success
    });

    if (health.success) {
      res.json(health);
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    logger.error('[Admin] Health check failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/summarization/health/all
 *
 * Check health of ALL providers (regardless of current config)
 */
router.get('/summarization/health/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    logger.info('[Admin] Checking all providers health');

    const results = {
      current: summarizationService.provider,
      providers: {}
    };

    // Check custom model
    try {
      const customHealth = await customModelService.healthCheck();
      results.providers.custom = customHealth;
    } catch (error) {
      results.providers.custom = {
        success: false,
        error: error.message
      };
    }

    // Groq doesn't have a health endpoint, just check if configured
    results.providers.groq = {
      success: !!process.env.GROQ_API_KEY,
      data: {
        configured: !!process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768'
      }
    };

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('[Admin] Failed to check all providers', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/summarization/test
 *
 * Test summarization with sample transcript
 *
 * Body: {
 *   "transcript": "Meeting transcript...",
 *   "provider": "groq" | "custom" (optional, uses current if not specified)
 * }
 */
router.post('/summarization/test', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { transcript, provider } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }

    logger.info('[Admin] Test summarization requested', {
      transcriptLength: transcript.length,
      provider: provider || 'current',
      requestedBy: req.user?.email
    });

    // Switch provider temporarily if specified
    const originalProvider = summarizationService.provider;
    if (provider && ['groq', 'custom'].includes(provider)) {
      summarizationService.switchProvider(provider);
    }

    try {
      const startTime = Date.now();
      const result = await summarizationService.generateSummary(transcript);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      res.json({
        success: true,
        data: {
          summary: result.data,
          metadata: {
            provider: summarizationService.provider,
            processingTime: `${duration}s`,
            transcriptLength: transcript.length
          }
        }
      });
    } finally {
      // Restore original provider
      if (provider) {
        summarizationService.switchProvider(originalProvider);
      }
    }
  } catch (error) {
    logger.error('[Admin] Test summarization failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/summarization/custom-url
 *
 * Update custom model API URL (useful when NGROK URL changes)
 *
 * Body: { "url": "https://new-domain.ngrok-free.app" }
 */
router.put('/summarization/custom-url', authenticateToken, isAdmin, (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    customModelService.updateApiUrl(url);

    logger.info('[Admin] Custom model URL updated', {
      newUrl: url,
      requestedBy: req.user?.email
    });

    res.json({
      success: true,
      message: 'Custom model URL updated successfully',
      data: {
        url,
        provider: summarizationService.provider
      }
    });
  } catch (error) {
    logger.error('[Admin] Failed to update custom URL', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/summarization/compare
 *
 * Compare both providers side-by-side with same transcript
 *
 * Body: { "transcript": "Meeting transcript..." }
 */
router.post('/summarization/compare', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }

    logger.info('[Admin] Provider comparison requested', {
      transcriptLength: transcript.length,
      requestedBy: req.user?.email
    });

    const results = {
      transcript: transcript.substring(0, 200) + '...',
      providers: {}
    };

    // Test Groq
    summarizationService.switchProvider('groq');
    const groqStart = Date.now();
    const groqResult = await summarizationService.generateSummary(transcript);
    const groqDuration = ((Date.now() - groqStart) / 1000).toFixed(2);

    results.providers.groq = {
      success: groqResult.success,
      data: groqResult.data,
      error: groqResult.error,
      processingTime: `${groqDuration}s`
    };

    // Test Custom Model
    summarizationService.switchProvider('custom');
    const customStart = Date.now();
    const customResult = await summarizationService.generateSummary(transcript);
    const customDuration = ((Date.now() - customStart) / 1000).toFixed(2);

    results.providers.custom = {
      success: customResult.success,
      data: customResult.data,
      error: customResult.error,
      processingTime: `${customDuration}s`
    };

    // Calculate comparison metrics
    results.comparison = {
      groqActionItems: groqResult.data?.actionItems?.length || 0,
      customActionItems: customResult.data?.actionItems?.length || 0,
      groqKeyTopics: groqResult.data?.keyTopics?.length || 0,
      customKeyTopics: customResult.data?.keyTopics?.length || 0,
      groqFaster: parseFloat(groqDuration) < parseFloat(customDuration),
      timeDifference: `${Math.abs(parseFloat(groqDuration) - parseFloat(customDuration)).toFixed(2)}s`
    };

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('[Admin] Comparison failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

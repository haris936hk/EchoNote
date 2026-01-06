// backend/src/controllers/user.controller.js
// User controller - handles HTTP requests for user management

const { prisma } = require('../config/database');
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

/**
 * Get current user profile
 * GET /api/users/me
 */
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        googleId: true,
        autoDeleteDays: true,
        emailNotifications: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { meetings: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        meetingsCount: user._count.meetings
      }
    });

  } catch (error) {
    logger.error(`Error getting user profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
      details: error.message
    });
  }
};

/**
 * Update user profile
 * PATCH /api/users/me
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, autoDeleteDays, emailNotifications } = req.body;

    // Build update object
    const updateData = {};

    if (name !== undefined) {
      if (name.trim().length < 2 || name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Name must be between 2 and 100 characters'
        });
      }
      updateData.name = name.trim();
    }

    if (autoDeleteDays !== undefined) {
      const days = parseInt(autoDeleteDays);
      if (isNaN(days) || days < 1 || days > 365) {
        return res.status(400).json({
          success: false,
          error: 'Auto-delete days must be between 1 and 365'
        });
      }
      updateData.autoDeleteDays = days;
    }

    if (emailNotifications !== undefined) {
      if (typeof emailNotifications !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Email notifications must be true or false'
        });
      }
      updateData.emailNotifications = emailNotifications;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        autoDeleteDays: true,
        emailNotifications: true,
        updatedAt: true
      }
    });

    logger.info(`✅ User profile updated: ${userId}`);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message
    });
  }
};

/**
 * Get user settings
 * GET /api/users/settings
 */
const getUserSettings = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        autoDeleteDays: true,
        emailNotifications: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error(`Error getting user settings: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings',
      details: error.message
    });
  }
};

/**
 * Update user settings
 * PATCH /api/users/settings
 */
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const { autoDeleteDays, emailNotifications } = req.body;

    const updateData = {};

    // Handle autoDeleteDays - can be a number (1-365) or null (never delete)
    if (autoDeleteDays !== undefined) {
      if (autoDeleteDays === null) {
        // User is disabling auto-delete (never delete)
        updateData.autoDeleteDays = null;

        // Clear shouldDeleteAudioAt for all existing meetings
        await prisma.meeting.updateMany({
          where: {
            userId: userId,
            audioDeletedAt: null,
            audioUrl: { not: null }
          },
          data: {
            shouldDeleteAudioAt: null
          }
        });

        logger.info(`⚙️ Auto-delete disabled for user: ${userId}`);
      } else {
        // User is setting a retention period
        const days = parseInt(autoDeleteDays);
        if (isNaN(days) || days < 1 || days > 365) {
          return res.status(400).json({
            success: false,
            error: 'Auto-delete days must be between 1 and 365, or null to disable'
          });
        }
        updateData.autoDeleteDays = days;

        // Update shouldDeleteAudioAt for all existing meetings
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);

        await prisma.meeting.updateMany({
          where: {
            userId: userId,
            audioDeletedAt: null,
            audioUrl: { not: null }
          },
          data: {
            shouldDeleteAudioAt: newDate
          }
        });

        logger.info(`⚙️ Auto-delete set to ${days} days for user: ${userId}`);
      }
    }

    if (emailNotifications !== undefined) {
      if (typeof emailNotifications !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Email notifications must be true or false'
        });
      }
      updateData.emailNotifications = emailNotifications;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid settings to update'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        autoDeleteDays: true,
        emailNotifications: true
      }
    });

    logger.info(`⚙️ User settings updated: ${userId}`);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    logger.error(`Error updating user settings: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message
    });
  }
};

/**
 * Get user statistics
 * GET /api/users/stats
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.userId;

    // Get meeting counts by status and category
    const [
      totalMeetings,
      completedMeetings,
      processingMeetings,
      failedMeetings,
      categoryStats,
      totalDuration,
      totalWords,
      storageUsed,
      recentActivity
    ] = await Promise.all([
      // Total meetings
      prisma.meeting.count({
        where: { userId }
      }),

      // Completed meetings
      prisma.meeting.count({
        where: { userId, status: 'COMPLETED' }
      }),

      // Processing meetings
      prisma.meeting.count({
        where: {
          userId,
          status: {
            in: ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING']
          }
        }
      }),

      // Failed meetings
      prisma.meeting.count({
        where: { userId, status: 'FAILED' }
      }),

      // Meetings by category
      prisma.meeting.groupBy({
        by: ['category'],
        where: { userId },
        _count: true
      }),

      // Total duration
      prisma.meeting.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { audioDuration: true }
      }),

      // Total words
      prisma.meeting.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { transcriptWordCount: true }
      }),

      // Storage used
      prisma.meeting.aggregate({
        where: { userId, audioUrl: { not: null } },
        _sum: { audioSize: true }
      }),

      // Recent meetings (last 7 days)
      prisma.meeting.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Format category stats
    const byCategory = {};
    categoryStats.forEach(stat => {
      byCategory[stat.category] = stat._count;
    });

    // Calculate averages
    const avgDuration = completedMeetings > 0
      ? Math.round((totalDuration._sum.audioDuration || 0) / completedMeetings)
      : 0;

    const avgWords = completedMeetings > 0
      ? Math.round((totalWords._sum.transcriptWordCount || 0) / completedMeetings)
      : 0;

    const stats = {
      overview: {
        totalMeetings,
        completedMeetings,
        processingMeetings,
        failedMeetings,
        recentMeetings: recentActivity
      },
      byCategory,
      metrics: {
        totalDuration: totalDuration._sum.audioDuration || 0,
        totalWords: totalWords._sum.transcriptWordCount || 0,
        averageDuration: avgDuration,
        averageWords: avgWords,
        storageUsedBytes: storageUsed._sum.audioSize || 0,
        storageUsedMB: Math.round((storageUsed._sum.audioSize || 0) / (1024 * 1024))
      }
    };

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`Error getting user stats: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
};

/**
 * Get user activity log
 * GET /api/users/activity?limit=50
 */
const getUserActivity = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }

    const activities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true
      }
    });

    return res.status(200).json({
      success: true,
      data: activities,
      count: activities.length
    });

  } catch (error) {
    logger.error(`Error getting user activity: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve activity',
      details: error.message
    });
  }
};

/**
 * Delete user account (with all data)
 * DELETE /api/users/me
 */
const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: 'Account deletion requires confirmation',
        required: 'Send { "confirmation": "DELETE_MY_ACCOUNT" }'
      });
    }

    // Get all meetings with audio URLs (for cleanup)
    const meetings = await prisma.meeting.findMany({
      where: { userId, audioUrl: { not: null } },
      select: { id: true, audioUrl: true }
    });

    logger.warn(`⚠️ Deleting user account: ${userId} with ${meetings.length} meetings`);

    // Delete user (cascade will delete meetings, activities, etc.)
    await prisma.user.delete({
      where: { id: userId }
    });

    logger.info(`🗑️ User account deleted: ${userId}`);

    // TODO: Delete audio files from Supabase storage
    // This should be done in a background job or queue
    // For now, just return the list of files to delete
    const audioFilesToDelete = meetings
      .filter(m => m.audioUrl)
      .map(m => m.audioUrl);

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      metadata: {
        meetingsDeleted: meetings.length,
        audioFilesToCleanup: audioFilesToDelete.length
      }
    });

  } catch (error) {
    logger.error(`Error deleting user account: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      details: error.message
    });
  }
};

/**
 * Export user data (GDPR compliance)
 * GET /api/users/export
 */
const exportUserData = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all user data
    const [user, meetings, activities] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId }
      }),

      prisma.meeting.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              // Add related counts if needed
            }
          }
        }
      }),

      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        settings: {
          autoDeleteDays: user.autoDeleteDays,
          emailNotifications: user.emailNotifications
        }
      },
      meetings: meetings.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        status: m.status,
        createdAt: m.createdAt,
        audioDuration: m.audioDuration,
        transcriptText: m.transcriptText,
        transcriptWordCount: m.transcriptWordCount,
        summaryExecutive: m.summaryExecutive,
        summaryKeyDecisions: m.summaryKeyDecisions,
        summaryActionItems: m.summaryActionItems,
        summaryNextSteps: m.summaryNextSteps
      })),
      activities: activities,
      statistics: {
        totalMeetings: meetings.length,
        completedMeetings: meetings.filter(m => m.status === 'COMPLETED').length,
        totalWords: meetings.reduce((sum, m) => sum + (m.transcriptWordCount || 0), 0),
        totalDuration: meetings.reduce((sum, m) => sum + (m.audioDuration || 0), 0)
      }
    };

    // Set filename
    const filename = `echonote_data_export_${user.email}_${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(JSON.stringify(exportData, null, 2));

  } catch (error) {
    logger.error(`Error exporting user data: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to export data',
      details: error.message
    });
  }
};

/**
 * Update last login timestamp
 * POST /api/users/login-timestamp
 */
const updateLastLogin = async (req, res) => {
  try {
    const userId = req.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });

    return res.status(200).json({
      success: true,
      message: 'Last login updated'
    });

  } catch (error) {
    logger.error(`Error updating last login: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update last login'
    });
  }
};

/**
 * Log user activity
 * POST /api/users/activity
 */
const logUserActivity = async (req, res) => {
  try {
    const userId = req.userId;
    const { action, metadata } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    const validActions = ['login', 'logout', 'record', 'view_meeting', 'download', 'delete', 'update'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        validActions
      });
    }

    await prisma.userActivity.create({
      data: {
        userId,
        action,
        metadata: metadata || {}
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Activity logged'
    });

  } catch (error) {
    logger.error(`Error logging activity: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to log activity'
    });
  }
};

module.exports = {
  getCurrentUser,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
  getUserStats,
  getUserActivity,
  deleteUserAccount,
  exportUserData,
  updateLastLogin,
  logUserActivity
};
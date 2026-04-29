const { prisma } = require('../config/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

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
        pushNotifications: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { meetings: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        meetingsCount: user._count.meetings,
      },
    });
  } catch (error) {
    logger.error(`Error getting user profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
      details: error.message,
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, autoDeleteDays, emailNotifications } = req.body;

    const updateData = {};

    if (name !== undefined) {
      if (name.trim().length < 2 || name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Name must be between 2 and 100 characters',
        });
      }
      updateData.name = name.trim();
    }

    if (autoDeleteDays !== undefined) {
      const days = parseInt(autoDeleteDays);
      if (isNaN(days) || days < 1 || days > 365) {
        return res.status(400).json({
          success: false,
          error: 'Auto-delete days must be between 1 and 365',
        });
      }
      updateData.autoDeleteDays = days;
    }

    if (emailNotifications !== undefined) {
      if (typeof emailNotifications !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Email notifications must be true or false',
        });
      }
      updateData.emailNotifications = emailNotifications;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
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
        pushNotifications: true,
        updatedAt: true,
      },
    });

    logger.info(`✅ User profile updated: ${userId}`);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message,
    });
  }
};

const getUserSettings = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        autoDeleteDays: true,
        emailNotifications: true,
        pushNotifications: true,
        slackWebhookUrl: true,
        jiraDomain: true,
        jiraEmail: true,
        jiraProjectKey: true,
        jiraAutoSync: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error(`Error getting user settings: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings',
      details: error.message,
    });
  }
};

const updateUserSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      autoDeleteDays,
      emailNotifications,
      slackWebhookUrl,
      jiraDomain,
      jiraEmail,
      jiraApiToken,
      jiraProjectKey,
      jiraAutoSync,
    } = req.body;

    const updateData = {};

    if (autoDeleteDays !== undefined) {
      if (autoDeleteDays === null) {
        updateData.autoDeleteDays = null;

        await prisma.meeting.updateMany({
          where: {
            userId: userId,
            audioDeletedAt: null,
            audioUrl: { not: null },
          },
          data: {
            shouldDeleteAudioAt: null,
          },
        });

        logger.info(`⚙️ Auto-delete disabled for user: ${userId}`);
      } else {
        const days = parseInt(autoDeleteDays);
        if (isNaN(days) || days < 1 || days > 365) {
          return res.status(400).json({
            success: false,
            error: 'Auto-delete days must be between 1 and 365, or null to disable',
          });
        }
        updateData.autoDeleteDays = days;

        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);

        await prisma.meeting.updateMany({
          where: {
            userId: userId,
            audioDeletedAt: null,
            audioUrl: { not: null },
          },
          data: {
            shouldDeleteAudioAt: newDate,
          },
        });

        logger.info(`⚙️ Auto-delete set to ${days} days for user: ${userId}`);
      }
    }

    if (emailNotifications !== undefined) {
      if (typeof emailNotifications !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Email notifications must be true or false',
        });
      }
      updateData.emailNotifications = emailNotifications;
    }

    if (req.body.pushNotifications !== undefined) {
      if (typeof req.body.pushNotifications !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Push notifications must be true or false',
        });
      }
      updateData.pushNotifications = req.body.pushNotifications;
    }

    if (slackWebhookUrl !== undefined) {
      if (slackWebhookUrl === '') {
        updateData.slackWebhookUrl = null;
      } else if (typeof slackWebhookUrl === 'string') {
        if (!slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
          return res.status(400).json({
            success: false,
            error: 'Slack Webhook URL must start with https://hooks.slack.com/',
          });
        }
        updateData.slackWebhookUrl = slackWebhookUrl;
      }
    }

    if (jiraDomain !== undefined) updateData.jiraDomain = jiraDomain;
    if (jiraEmail !== undefined) updateData.jiraEmail = jiraEmail;
    if (jiraApiToken !== undefined) updateData.jiraApiToken = jiraApiToken;
    if (jiraProjectKey !== undefined) updateData.jiraProjectKey = jiraProjectKey;
    if (jiraAutoSync !== undefined) updateData.jiraAutoSync = !!jiraAutoSync;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid settings to update',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        autoDeleteDays: true,
        emailNotifications: true,
        pushNotifications: true,
        slackWebhookUrl: true,
        jiraDomain: true,
        jiraEmail: true,
        jiraProjectKey: true,
        jiraAutoSync: true,
      },
    });

    logger.info(`⚙️ User settings updated: ${userId}`);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error(`Error updating user settings: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message,
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.userId;

    const [
      totalMeetings,
      completedMeetings,
      processingMeetings,
      failedMeetings,
      categoryStats,
      totalDuration,
      totalWords,
      storageUsed,
      recentActivity,
    ] = await Promise.all([
      prisma.meeting.count({
        where: { userId },
      }),

      prisma.meeting.count({
        where: { userId, status: 'COMPLETED' },
      }),

      prisma.meeting.count({
        where: {
          userId,
          status: {
            in: ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING'],
          },
        },
      }),

      prisma.meeting.count({
        where: { userId, status: 'FAILED' },
      }),

      prisma.meeting.groupBy({
        by: ['category'],
        where: { userId },
        _count: true,
      }),

      prisma.meeting.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { audioDuration: true },
      }),

      prisma.meeting.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { transcriptWordCount: true },
      }),

      prisma.meeting.aggregate({
        where: { userId, audioUrl: { not: null } },
        _sum: { audioSize: true },
      }),

      prisma.meeting.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const byCategory = {};
    categoryStats.forEach((stat) => {
      byCategory[stat.category] = stat._count;
    });

    const avgDuration =
      completedMeetings > 0
        ? Math.round((totalDuration._sum.audioDuration || 0) / completedMeetings)
        : 0;

    const avgWords =
      completedMeetings > 0
        ? Math.round((totalWords._sum.transcriptWordCount || 0) / completedMeetings)
        : 0;

    const stats = {
      overview: {
        totalMeetings,
        completedMeetings,
        processingMeetings,
        failedMeetings,
        recentMeetings: recentActivity,
      },
      byCategory,
      metrics: {
        totalDuration: totalDuration._sum.audioDuration || 0,
        totalWords: totalWords._sum.transcriptWordCount || 0,
        averageDuration: avgDuration,
        averageWords: avgWords,
        storageUsedBytes: storageUsed._sum.audioSize || 0,
        storageUsedMB: Math.round((storageUsed._sum.audioSize || 0) / (1024 * 1024)),
      },
    };

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error(`Error getting user stats: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message,
    });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100',
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
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    logger.error(`Error getting user activity: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve activity',
      details: error.message,
    });
  }
};

const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: 'Account deletion requires confirmation',
        required: 'Send { "confirmation": "DELETE_MY_ACCOUNT" }',
      });
    }

    const meetings = await prisma.meeting.findMany({
      where: { userId, audioUrl: { not: null } },
      select: { id: true, audioUrl: true },
    });

    logger.warn(`⚠️ Deleting user account: ${userId} with ${meetings.length} meetings`);

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info(`🗑️ User account deleted: ${userId}`);

    const audioFilesToDelete = meetings.filter((m) => m.audioUrl).map((m) => m.audioUrl);

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      metadata: {
        meetingsDeleted: meetings.length,
        audioFilesToCleanup: audioFilesToDelete.length,
      },
    });
  } catch (error) {
    logger.error(`Error deleting user account: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      details: error.message,
    });
  }
};

const exportUserData = async (req, res) => {
  try {
    const userId = req.userId;

    const [user, meetings, activities] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
      }),

      prisma.meeting.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          status: true,
          createdAt: true,
          audioDuration: true,
          transcriptText: true,
          transcriptWordCount: true,
          summaryExecutive: true,
          summaryKeyDecisions: true,
          summaryActionItems: true,
          summaryNextSteps: true,
        },
      }),

      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
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
          emailNotifications: user.emailNotifications,
          pushNotifications: user.pushNotifications,
        },
      },
      meetings: meetings.map((m) => ({
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
        summaryNextSteps: m.summaryNextSteps,
      })),
      activities: activities,
      statistics: {
        totalMeetings: meetings.length,
        completedMeetings: meetings.filter((m) => m.status === 'COMPLETED').length,
        totalWords: meetings.reduce((sum, m) => sum + (m.transcriptWordCount || 0), 0),
        totalDuration: meetings.reduce((sum, m) => sum + (m.audioDuration || 0), 0),
      },
    };

    const filename = `echonote_data_export_${user.email}_${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    logger.error(`Error exporting user data: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to export data',
      details: error.message,
    });
  }
};

const updateLastLogin = async (req, res) => {
  try {
    const userId = req.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Last login updated',
    });
  } catch (error) {
    logger.error(`Error updating last login: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update last login',
    });
  }
};

const logUserActivity = async (req, res) => {
  try {
    const userId = req.userId;
    const { action, metadata } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
      });
    }

    const validActions = [
      'login',
      'logout',
      'record',
      'view_meeting',
      'download',
      'delete',
      'update',
    ];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        validActions,
      });
    }

    await prisma.userActivity.create({
      data: {
        userId,
        action,
        metadata: metadata || {},
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Activity logged',
    });
  } catch (error) {
    logger.error(`Error logging activity: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to log activity',
    });
  }
};

const testSlackWebhook = async (req, res) => {
  try {
    const userId = req.userId;
    let targetWebhookUrl = req.body?.slackWebhookUrl;

    if (!targetWebhookUrl) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { slackWebhookUrl: true },
      });
      targetWebhookUrl = user?.slackWebhookUrl;
    }

    if (!targetWebhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'No Slack Webhook configured',
      });
    }

    const mockMeeting = {
      title: 'EchoNote Slack Integration Test',
      category: 'OTHER',
      audioDuration: 305,
      transcriptConfidence: 95,
      nlpSentiment: 'positive',
      nlpSentimentScore: 0.85,
      summaryExecutive:
        'This is a test notification from EchoNote to verify your Slack Block Kit integration is correctly formatted and successfully routing messages.',
      summaryKeyDecisions: ['Approved new webhook configuration', 'Validated Block Kit layout'],
      summaryActionItems: [
        { priority: 'high', task: 'Review new Slack notification format', assignee: 'Team' },
        { priority: 'medium', task: 'Deploy Slack integration to production', assignee: null },
        { priority: 'low', task: 'Check Winston logs for payload delivery', assignee: null },
      ],
      user: { name: 'EchoNote User' },
    };

    const slackService = require('../services/slack.service');
    await slackService.sendMeetingCompletedNotification(targetWebhookUrl, mockMeeting);

    return res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
    });
  } catch (error) {
    logger.error(`Error sending test Slack notification: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      details: error.message,
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
  logUserActivity,
  testSlackWebhook,
};

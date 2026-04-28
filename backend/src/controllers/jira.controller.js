const jiraService = require('../services/jira.service');
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

/**
 * Test Jira connection with provided credentials
 */
const testConnection = async (req, res) => {
  try {
    const { jiraDomain, jiraEmail, jiraApiToken } = req.body;

    if (!jiraDomain || !jiraEmail || !jiraApiToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing Jira credentials'
      });
    }

    const result = await jiraService.testConnection({ jiraDomain, jiraEmail, jiraApiToken });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Successfully connected to Jira as ${result.user}`
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Failed to connect to Jira',
        details: result.error
      });
    }
  } catch (error) {
    logger.error(`Jira test connection error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during connection test'
    });
  }
};

/**
 * Manually sync an action item to Jira
 */
const syncActionItem = async (req, res) => {
  try {
    const { actionItemId } = req.params;
    const userId = req.userId;

    // Get user with Jira settings
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.jiraDomain || !user.jiraApiToken) {
      return res.status(400).json({
        success: false,
        error: 'Jira is not configured for your account'
      });
    }

    // Get action item
    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      include: { meeting: true }
    });

    if (!actionItem) {
      return res.status(404).json({
        success: false,
        error: 'Action item not found'
      });
    }

    if (actionItem.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to sync this item'
      });
    }

    if (actionItem.jiraIssueKey) {
      return res.status(400).json({
        success: false,
        error: 'Action item is already synced to Jira',
        key: actionItem.jiraIssueKey
      });
    }

    const result = await jiraService.createIssue(user, actionItem);

    return res.status(200).json({
      success: true,
      message: 'Action item synced to Jira successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Jira manual sync error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync action item to Jira',
      details: error.message
    });
  }
};

module.exports = {
  testConnection,
  syncActionItem
};

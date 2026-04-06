// backend/src/services/slack.service.js
const axios = require('axios');
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
 * Send meeting completed notification to a Slack webhook
 * @param {string} webhookUrl - Slack incoming webhook URL
 * @param {Object} meetingData - Meeting data to populate the template
 */
async function sendMeetingCompletedNotification(webhookUrl, meetingData) {
  try {
    // Format duration
    const durationSeconds = meetingData.audioDuration || 0;
    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.floor(durationSeconds % 60);
    const formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Priority to emoji
    const getPriorityEmoji = (priority) => {
      switch ((priority || '').toLowerCase()) {
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '⚪';
        default: return '⚪';
      }
    };

    // Build Blocks Data
    const blocks = [];

    // Header
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `:bookmark: ${meetingData.title || 'Meeting Summary'}`,
        emoji: true,
      },
    });

    // Context: Category & Duration
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Category:* ${meetingData.category || 'OTHER'}   |   *Duration:* ${formattedDuration}`,
        },
      ],
    });

    blocks.push({ type: 'divider' });

    // Executive Summary
    const executiveSummary = meetingData.summaryExecutive || meetingData.executiveSummary;
    if (executiveSummary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI Summary*\n${executiveSummary}`,
        },
      });
      blocks.push({ type: 'divider' });
    }

    // Action Items
    const actionItems = meetingData.summaryActionItems || meetingData.actionItems || [];
    if (actionItems.length > 0) {
      const actionsText = actionItems
        .map((item) => {
          const emoji = getPriorityEmoji(item.priority);
          const assignee = item.assignee ? ` (@${item.assignee})` : '';
          return `${emoji} ${item.task}${assignee}`;
        })
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Action Items*\n${actionsText}`,
        },
      });
    }

    // Key Decisions
    const keyDecisionsRaw = meetingData.summaryKeyDecisions || meetingData.keyDecisions;
    const keyDecisions = typeof keyDecisionsRaw === 'string' && keyDecisionsRaw.startsWith('[') ? JSON.parse(keyDecisionsRaw) : keyDecisionsRaw;
    if (Array.isArray(keyDecisions) && keyDecisions.length > 0) {
      const decisionsText = keyDecisions.map((decision) => `• ${decision}`).join('\n');
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Key Decisions*\n${decisionsText}`,
        },
      });
    }

    // Context: NLP Stats
    const sentiment = meetingData.nlpSentiment || meetingData.sentiment || 'N/A';
    const confidence = meetingData.transcriptConfidence ? `${meetingData.transcriptConfidence}%` : 'N/A';
    const topicsRaw = meetingData.nlpTopics || meetingData.topicKeywords;
    const topics = Array.isArray(topicsRaw) ? topicsRaw.join(', ') : 'N/A';
    
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Sentiment:* ${sentiment}  |  *Confidence:* ${confidence}\n*Topics:* ${topics}`,
        },
      ],
    });

    // Footer
    const timestampMs = Math.floor(Date.now() / 1000);
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Sent by EchoNote  <!date^${timestampMs}^{date_num} {time_secs}|Fallback timestamp>`,
        },
      ],
    });

    const payload = {
      blocks,
    };

    logger.info(`Sending Slack notification for meeting: ${meetingData.title}`);
    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    logger.info(`Successfully sent Slack notification for meeting: ${meetingData.title}`);

  } catch (error) {
    const errorMsg = error.response
      ? `Slack API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      : `Failed to send to Slack webhook: ${error.message}`;
    
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
}

module.exports = {
  sendMeetingCompletedNotification,
};



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


const getPublicMeetingByToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Share token is required'
      });
    }

    const meeting = await prisma.meeting.findUnique({
      where: {
        shareToken: token
      },
     
      select: {
        title: true,
        category: true,
        createdAt: true,
        audioDuration: true,
        summaryExecutive: true,
        summaryKeyDecisions: true,
        summaryActionItems: true,
        speakerMap: true,
        sharedAt: true,
        shareEnabled: true
      }
    });

    if (!meeting || !meeting.shareEnabled) {
      return res.status(404).json({
        success: false,
        error: 'This link is invalid or has been revoked',
      });
    }

    
    const keyDecisions = meeting.summaryKeyDecisions ? (typeof meeting.summaryKeyDecisions === 'string' ? JSON.parse(meeting.summaryKeyDecisions || '[]') : meeting.summaryKeyDecisions) : [];
    const actionItems = meeting.summaryActionItems ? (typeof meeting.summaryActionItems === 'string' ? JSON.parse(meeting.summaryActionItems || '[]') : meeting.summaryActionItems) : [];
    const speakerMap = meeting.speakerMap ? (typeof meeting.speakerMap === 'string' ? JSON.parse(meeting.speakerMap || '{}') : meeting.speakerMap) : {};

   
    const speakers = Object.values(speakerMap);

    const publicMeeting = {
      title: meeting.title,
      category: meeting.category,
      createdAt: meeting.createdAt,
      duration: meeting.audioDuration,
      summary: {
        executiveSummary: meeting.summaryExecutive || '',
        keyDecisions: Array.isArray(keyDecisions) ? keyDecisions : (keyDecisions ? [keyDecisions] : []),
        actionItems: Array.isArray(actionItems) ? actionItems : []
      },
      speakers: speakers,
      sharedAt: meeting.sharedAt
    };

    return res.status(200).json({
      success: true,
      data: publicMeeting
    });

  } catch (error) {
    logger.error(`Error retrieving public meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve meeting summary',
      details: error.message
    });
  }
};

module.exports = {
  getPublicMeetingByToken
};

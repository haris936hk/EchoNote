

const groqService = require('./groqService');
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
 * Generate comprehensive meeting summary
 * Uses Groq-hosted openai/gpt-oss-120b with strict schema enforcement
 * @param {string} transcript - Meeting transcript
 * @param {Object} metadata - Meeting metadata (title, category, duration)
 * @param {Object} nlpData - NLP analysis results (optional)
 * @returns {Object} Structured summary
 */
const generateSummary = async (transcript, metadata = {}, nlpData = null) => {
  try {
    logger.info(`📝 Generating summary for: ${metadata.title || 'Untitled Meeting'}`);
    const startTime = Date.now();

    
    const nlpFeatures = nlpData || {
      entities: (metadata.entities || []).map((e) =>
        typeof e === 'string' ? e : `${e.text} (${e.label})`
      ),
      svoTriplets: metadata.svoTriplets || [],
    };

    
    if (metadata.actionSignals?.length > 0) {
      nlpFeatures.actionSignals = metadata.actionSignals;
    }
    if (metadata.questions?.length > 0) {
      nlpFeatures.questions = metadata.questions;
    }
    if (metadata.speakerEntityMap && Object.keys(metadata.speakerEntityMap).length > 0) {
      nlpFeatures.speakerEntityMap = metadata.speakerEntityMap;
    }
    if (metadata.nlpMetadata && Object.keys(metadata.nlpMetadata).length > 0) {
      nlpFeatures.nlpMetadata = metadata.nlpMetadata;
    }

    
    if (metadata.deepgramEntities?.length > 0) {
      nlpFeatures.deepgramEntities = metadata.deepgramEntities;
    }
    if (metadata.deepgramTopics?.length > 0) {
      nlpFeatures.deepgramTopics = metadata.deepgramTopics;
    }
    if (metadata.deepgramIntents?.length > 0) {
      nlpFeatures.deepgramIntents = metadata.deepgramIntents;
    }
    if (metadata.lowConfidenceWords?.length > 0) {
      nlpFeatures.lowConfidenceWords = metadata.lowConfidenceWords;
    }

    
    const result = await groqService.generateSummary(transcript, nlpFeatures, {
      category: metadata.category || null,
    });

    if (!result.success) {
      throw new Error(result.error || 'Summary generation failed');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Summary generated in ${duration}s`);

    
    const summary = {
      executiveSummary: result.data.executiveSummary || '',
      keyDecisions: Array.isArray(result.data.keyDecisions) ? result.data.keyDecisions : [],
      actionItems: Array.isArray(result.data.actionItems)
        ? validateActionItems(result.data.actionItems)
        : [],
      nextSteps: Array.isArray(result.data.nextSteps) ? result.data.nextSteps : [],
      keyTopics: Array.isArray(result.data.keyTopics) ? result.data.keyTopics : [],
      sentiment: result.data.sentiment || 'neutral',
      metadata: {
        model: `${process.env.GROQ_MODEL || 'openai/gpt-oss-120b'} (Groq)`,
        duration: parseFloat(duration),
        totalProcessingTime: parseFloat(duration),
      },
    };

    return {
      success: true,
      ...summary,
    };
  } catch (error) {
    logger.error(`❌ Summary generation failed: ${error.message}`);

   
    let userMessage = error.message;
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('EHOSTUNREACH')
    ) {
      userMessage =
        'Groq API is currently unreachable. Please check your internet connection and GROQ_API_KEY.';
    }

    throw new Error(userMessage);
  }
};

/**
 * Generate executive summary only (brief overview)
 * @param {string} transcript - Meeting transcript
 * @param {Object} metadata - Meeting metadata
 * @returns {Object} Executive summary
 */

const generateExecutiveSummary = async (transcript, metadata = {}) => {
  try {
    logger.info(`📋 Generating executive summary`);
    const startTime = Date.now();

    const result = await groqService.generateSummary(transcript, null);

    if (!result.success) {
      throw new Error(result.error || 'Executive summary generation failed');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      success: true,
      executiveSummary: result.data.executiveSummary,
      sentiment: result.data.sentiment,
      processingTime: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Executive summary generation failed: ${error.message}`);

    
    let userMessage = error.message;
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    ) {
      userMessage =
        'AI summarization service is currently unavailable. Please ensure the model API is running and try again.';
    }

    throw new Error(userMessage);
  }
};

/**
 * Extract action items only
 * Uses full summary generation then extracts action items
 * @param {string} transcript - Meeting transcript
 * @returns {Object} Action items
 */
const extractActions = async (transcript) => {
  try {
    logger.info(`✅ Extracting action items`);
    const startTime = Date.now();

   
    const result = await groqService.generateSummary(transcript, null);

    if (!result.success) {
      throw new Error(result.error || 'Action item extraction failed');
    }

    const actionItems = result.data.actionItems || [];
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Action items extracted in ${duration}s`);

    return {
      success: true,
      actionItems: validateActionItems(actionItems),
      count: actionItems.length,
      processingTime: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Action item extraction failed: ${error.message}`);

    
    let userMessage = error.message;
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    ) {
      userMessage =
        'AI summarization service is currently unavailable. Please ensure the model API is running and try again.';
    }

    throw new Error(userMessage);
  }
};

/**
 * Enhance summary with NLP insights
 * Combines AI summary with NLP extracted data
 * @param {Object} summary - AI-generated summary
 * @param {Object} nlpData - NLP analysis results
 * @returns {Object} Enhanced summary
 */
const enhanceSummaryWithNLP = (summary, nlpData) => {
  if (!nlpData) return summary;

  const enhanced = { ...summary };

 
  if (nlpData.entities) {
    enhanced.metadata = enhanced.metadata || {};
    enhanced.metadata.entitiesDetected = nlpData.entities.length;
    enhanced.metadata.peopleCount = nlpData.entities.filter((e) => e.label === 'PERSON').length;
    enhanced.metadata.organizationsCount = nlpData.entities.filter((e) => e.label === 'ORG').length;
  }

  return enhanced;
};

/**
 * Regenerate summary with different parameters
 * @param {string} transcript - Meeting transcript
 * @param {Object} metadata - Meeting metadata
 * @param {Object} options - Regeneration options
 * @returns {Object} New summary
 */
const regenerateSummary = async (transcript, metadata, options = {}) => {
  try {
    logger.info(`🔄 Regenerating summary with new parameters`);

    
    const enhancedMetadata = {
      ...metadata,
      focusArea: options.focusArea || null, 
      detailLevel: options.detailLevel || 'standard', 
      tone: options.tone || 'professional', 
    };

    return await generateSummary(transcript, enhancedMetadata);
  } catch (error) {
    logger.error(`❌ Summary regeneration failed: ${error.message}`);
    throw error;
  }
};

/**
 * Compare two summaries (useful for A/B testing)
 * @param {Object} summary1 - First summary
 * @param {Object} summary2 - Second summary
 * @returns {Object} Comparison results
 */
const compareSummaries = (summary1, summary2) => {
  return {
    lengthDiff: {
      executiveSummary: summary1.executiveSummary.length - summary2.executiveSummary.length,
      keyDecisions: summary1.keyDecisions.length - summary2.keyDecisions.length,
    },
    actionItemsCount: {
      summary1: summary1.actionItems.length,
      summary2: summary2.actionItems.length,
      diff: summary1.actionItems.length - summary2.actionItems.length,
    },
    topicsCount: {
      summary1: summary1.keyTopics.length,
      summary2: summary2.keyTopics.length,
      diff: summary1.keyTopics.length - summary2.keyTopics.length,
    },
    sentiment: {
      summary1: summary1.sentiment,
      summary2: summary2.sentiment,
      match: summary1.sentiment === summary2.sentiment,
    },
  };
};

/**
 * Validate and normalize action items
 * @param {Array} actionItems - Raw action items
 * @returns {Array} Validated action items
 */
const validateActionItems = (actionItems) => {
  if (!Array.isArray(actionItems)) return [];

  return actionItems
    .filter((item) => item && item.task && item.task.trim().length > 0)
    .map((item) => ({
      task: item.task.trim(),
      assignee: item.assignee || null,
      deadline: item.deadline || null,
      priority: validatePriority(item.priority),
      confidence: validateConfidence(item.confidence),
      sourceQuote: item.sourceQuote || null,
    }));
};

/**
 * Validate confidence level
 * @param {string} confidence - Confidence value
 * @returns {string} Valid confidence
 */
const validateConfidence = (confidence) => {
  const validLevels = ['high', 'medium', 'low'];
  if (
    confidence &&
    typeof confidence === 'string' &&
    validLevels.includes(confidence.toLowerCase())
  ) {
    return confidence.toLowerCase();
  }
  return 'medium'; 
};

/**
 * Validate priority level
 * @param {string} priority - Priority value
 * @returns {string} Valid priority
 */
const validatePriority = (priority) => {
  const validPriorities = ['high', 'medium', 'low'];
  if (
    priority &&
    typeof priority === 'string' &&
    validPriorities.includes(priority.toLowerCase())
  ) {
    return priority.toLowerCase();
  }
  return 'medium'; 
};

/**
 * Format summary for email notification
 * @param {Object} summary - Summary object
 * @param {Object} meeting - Meeting object
 * @returns {string} Formatted text
 */
const formatSummaryForEmail = (summary, meeting) => {
  let formatted = `Meeting Summary: ${meeting.title}\n`;
  formatted += `Category: ${meeting.category}\n`;
  formatted += `Duration: ${Math.round(meeting.audioDuration / 60)} minutes\n\n`;

  formatted += `=== EXECUTIVE SUMMARY ===\n${summary.executiveSummary}\n\n`;

  formatted += `=== KEY DECISIONS ===\n${summary.keyDecisions}\n\n`;

  if (summary.actionItems && summary.actionItems.length > 0) {
    formatted += `=== ACTION ITEMS ===\n`;
    summary.actionItems.forEach((item, index) => {
      formatted += `${index + 1}. ${item.task}`;
      if (item.assignee) formatted += ` (${item.assignee})`;
      if (item.deadline) formatted += ` - Due: ${item.deadline}`;
      formatted += `\n`;
    });
    formatted += `\n`;
  }

  formatted += `=== NEXT STEPS ===\n${summary.nextSteps}\n`;

  return formatted;
};

/**
 * Get summary quality score
 * @param {Object} summary - Summary object
 * @returns {Object} Quality metrics
 */
const getSummaryQuality = (summary) => {
  const scores = {
    completeness: 0,
    actionability: 0,
    clarity: 0,
    overall: 0,
  };

  
  let completeSections = 0;
  if (summary.executiveSummary && summary.executiveSummary.length > 50) completeSections++;
  if (summary.keyDecisions && summary.keyDecisions.length > 20) completeSections++;
  if (summary.actionItems && summary.actionItems.length > 0) completeSections++;
  if (summary.nextSteps && summary.nextSteps.length > 20) completeSections++;
  scores.completeness = (completeSections / 4) * 100;


  if (summary.actionItems && summary.actionItems.length > 0) {
    const detailedActions = summary.actionItems.filter((a) => a.assignee || a.deadline).length;
    scores.actionability = Math.min((detailedActions / summary.actionItems.length) * 100, 100);
  }

  
  const totalLength =
    (summary.executiveSummary?.length || 0) +
    (summary.keyDecisions?.length || 0) +
    (summary.nextSteps?.length || 0);

  if (totalLength > 200 && totalLength < 2000) {
    scores.clarity = 100;
  } else if (totalLength < 100) {
    scores.clarity = 50;
  } else {
    scores.clarity = 75;
  }

 
  scores.overall = Math.round((scores.completeness + scores.actionability + scores.clarity) / 3);

  return scores;
};

module.exports = {
  generateSummary,
  generateExecutiveSummary,
  extractActions,
  enhanceSummaryWithNLP,
  regenerateSummary,
  compareSummaries,
  validateActionItems,
  formatSummaryForEmail,
  getSummaryQuality,
};

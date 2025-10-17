// backend/src/services/summarization.service.js
// AI summarization service using Groq/Mistral-7B

const { generateMeetingSummary, extractActionItems } = require('../config/groq');
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
 * Generate comprehensive meeting summary
 * Uses Mistral-7B via Groq API
 * @param {string} transcript - Meeting transcript
 * @param {Object} metadata - Meeting metadata (title, category, duration)
 * @param {Object} nlpData - NLP analysis results (optional)
 * @returns {Object} Structured summary
 */
const generateSummary = async (transcript, metadata = {}, nlpData = null) => {
  try {
    logger.info(`📝 Generating summary for: ${metadata.title || 'Untitled Meeting'}`);
    const startTime = Date.now();

    // Enhance metadata with NLP data if available
    const enhancedMetadata = {
      ...metadata,
      entities: nlpData?.entities || [],
      keyPhrases: nlpData?.keyPhrases || [],
      sentiment: nlpData?.sentiment || null
    };

    // Generate summary using Groq
    const result = await generateMeetingSummary(transcript, enhancedMetadata);

    if (!result.success) {
      throw new Error('Summary generation failed');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Summary generated in ${duration}s`);

    // Validate and structure the response
    const summary = {
      executiveSummary: result.summary.executiveSummary || '',
      keyDecisions: result.summary.keyDecisions || 'No major decisions recorded',
      actionItems: validateActionItems(result.summary.actionItems || []),
      nextSteps: result.summary.nextSteps || '',
      keyTopics: result.summary.keyTopics || [],
      sentiment: result.summary.sentiment || 'neutral',
      metadata: {
        model: result.metadata.model,
        tokensUsed: result.metadata.tokensUsed,
        duration: result.metadata.duration,
        totalProcessingTime: parseFloat(duration)
      }
    };

    return {
      success: true,
      ...summary
    };

  } catch (error) {
    logger.error(`❌ Summary generation failed: ${error.message}`);
    throw new Error(`Summary generation failed: ${error.message}`);
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
    
    const result = await generateMeetingSummary(transcript, metadata);
    
    return {
      success: true,
      executiveSummary: result.summary.executiveSummary,
      sentiment: result.summary.sentiment,
      processingTime: result.metadata.duration
    };

  } catch (error) {
    logger.error(`❌ Executive summary generation failed: ${error.message}`);
    throw new Error(`Executive summary generation failed: ${error.message}`);
  }
};

/**
 * Extract action items only
 * Faster than full summary generation
 * @param {string} transcript - Meeting transcript
 * @returns {Object} Action items
 */
const extractActions = async (transcript) => {
  try {
    logger.info(`✅ Extracting action items`);
    const startTime = Date.now();

    const actionItems = await extractActionItems(transcript);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Action items extracted in ${duration}s`);

    return {
      success: true,
      actionItems: validateActionItems(actionItems),
      count: actionItems.length,
      processingTime: parseFloat(duration)
    };

  } catch (error) {
    logger.error(`❌ Action item extraction failed: ${error.message}`);
    throw new Error(`Action item extraction failed: ${error.message}`);
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

  // Add detected action items from NLP if AI missed them
  if (nlpData.actions && nlpData.actions.length > 0) {
    const nlpActions = nlpData.actions
      .filter(action => action.confidence > 0.7)
      .map(action => ({
        task: action.text,
        assignee: extractAssignee(action.context),
        deadline: extractDeadline(action.context),
        priority: 'medium',
        source: 'nlp'
      }));

    // Merge with AI-detected actions, avoiding duplicates
    enhanced.actionItems = mergeActionItems(
      summary.actionItems || [],
      nlpActions
    );
  }

  // Add key phrases if not in topics
  if (nlpData.keyPhrases && nlpData.keyPhrases.length > 0) {
    const existingTopics = new Set(
      (enhanced.keyTopics || []).map(t => t.toLowerCase())
    );
    
    nlpData.keyPhrases
      .slice(0, 5)
      .forEach(kp => {
        const phrase = kp.phrase.toLowerCase();
        if (!existingTopics.has(phrase)) {
          enhanced.keyTopics = enhanced.keyTopics || [];
          enhanced.keyTopics.push(kp.phrase);
        }
      });
  }

  // Enhance sentiment if available
  if (nlpData.sentiment) {
    enhanced.sentimentScore = nlpData.sentiment.polarity;
    enhanced.sentimentConfidence = nlpData.sentiment.confidence;
  }

  // Add entity metadata
  if (nlpData.entities) {
    enhanced.metadata = enhanced.metadata || {};
    enhanced.metadata.entitiesDetected = nlpData.entities.length;
    enhanced.metadata.peopleCount = nlpData.entities.filter(e => e.label === 'PERSON').length;
    enhanced.metadata.organizationsCount = nlpData.entities.filter(e => e.label === 'ORG').length;
  }

  return enhanced;
};

/**
 * Generate summary for multiple meetings (batch)
 * @param {Array} meetings - Array of {transcript, metadata}
 * @returns {Array} Array of summaries
 */
const batchGenerateSummaries = async (meetings) => {
  logger.info(`📚 Batch summarizing ${meetings.length} meetings`);
  const results = [];

  for (let i = 0; i < meetings.length; i++) {
    try {
      logger.info(`Summarizing ${i + 1}/${meetings.length}: ${meetings[i].metadata.title}`);
      
      const summary = await generateSummary(
        meetings[i].transcript,
        meetings[i].metadata,
        meetings[i].nlpData
      );

      results.push({
        meetingId: meetings[i].id,
        success: true,
        ...summary
      });

      // Rate limiting: wait 1 second between requests
      if (i < meetings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      logger.error(`Failed to summarize meeting ${i}: ${error.message}`);
      results.push({
        meetingId: meetings[i].id,
        success: false,
        error: error.message
      });
    }
  }

  const successful = results.filter(r => r.success).length;
  logger.info(`✅ Batch summarization complete: ${successful}/${meetings.length} successful`);

  return results;
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

    // Modify metadata based on options
    const enhancedMetadata = {
      ...metadata,
      focusArea: options.focusArea || null, // 'decisions', 'actions', 'overview'
      detailLevel: options.detailLevel || 'standard', // 'brief', 'standard', 'detailed'
      tone: options.tone || 'professional' // 'professional', 'casual', 'technical'
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
      keyDecisions: summary1.keyDecisions.length - summary2.keyDecisions.length
    },
    actionItemsCount: {
      summary1: summary1.actionItems.length,
      summary2: summary2.actionItems.length,
      diff: summary1.actionItems.length - summary2.actionItems.length
    },
    topicsCount: {
      summary1: summary1.keyTopics.length,
      summary2: summary2.keyTopics.length,
      diff: summary1.keyTopics.length - summary2.keyTopics.length
    },
    sentiment: {
      summary1: summary1.sentiment,
      summary2: summary2.sentiment,
      match: summary1.sentiment === summary2.sentiment
    }
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
    .filter(item => item && item.task && item.task.trim().length > 0)
    .map(item => ({
      task: item.task.trim(),
      assignee: item.assignee || null,
      deadline: item.deadline || null,
      priority: validatePriority(item.priority)
    }));
};

/**
 * Validate priority level
 * @param {string} priority - Priority value
 * @returns {string} Valid priority
 */
const validatePriority = (priority) => {
  const validPriorities = ['high', 'medium', 'low'];
  if (priority && validPriorities.includes(priority.toLowerCase())) {
    return priority.toLowerCase();
  }
  return 'medium'; // Default
};

/**
 * Extract assignee from context text
 * @param {string} context - Context text
 * @returns {string|null} Assignee name
 */
const extractAssignee = (context) => {
  if (!context) return null;

  // Look for patterns like "John will", "assigned to Sarah", "Mike should"
  const patterns = [
    /(\w+)\s+will/i,
    /assigned to (\w+)/i,
    /(\w+)\s+should/i,
    /(\w+)\s+needs to/i
  ];

  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) return match[1];
  }

  return null;
};

/**
 * Extract deadline from context text
 * @param {string} context - Context text
 * @returns {string|null} Deadline
 */
const extractDeadline = (context) => {
  if (!context) return null;

  // Look for date patterns
  const datePatterns = [
    /by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /by (tomorrow|today|next week|this week)/i,
    /by (\d{1,2}\/\d{1,2})/,
    /deadline:?\s*(\w+)/i
  ];

  for (const pattern of datePatterns) {
    const match = context.match(pattern);
    if (match) return match[1];
  }

  return null;
};

/**
 * Merge action items from multiple sources, removing duplicates
 * @param {Array} aiActions - AI-detected actions
 * @param {Array} nlpActions - NLP-detected actions
 * @returns {Array} Merged action items
 */
const mergeActionItems = (aiActions, nlpActions) => {
  const merged = [...aiActions];
  const existingTasks = new Set(
    aiActions.map(a => a.task.toLowerCase().trim())
  );

  nlpActions.forEach(action => {
    const task = action.task.toLowerCase().trim();
    // Check for similarity (not just exact match)
    const isDuplicate = Array.from(existingTasks).some(existingTask => {
      return calculateSimilarity(task, existingTask) > 0.7;
    });

    if (!isDuplicate) {
      merged.push(action);
      existingTasks.add(task);
    }
  });

  return merged;
};

/**
 * Calculate similarity between two strings (Jaccard similarity)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
const calculateSimilarity = (str1, str2) => {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
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
    overall: 0
  };

  // Completeness (all sections present and non-empty)
  let completeSections = 0;
  if (summary.executiveSummary && summary.executiveSummary.length > 50) completeSections++;
  if (summary.keyDecisions && summary.keyDecisions.length > 20) completeSections++;
  if (summary.actionItems && summary.actionItems.length > 0) completeSections++;
  if (summary.nextSteps && summary.nextSteps.length > 20) completeSections++;
  scores.completeness = (completeSections / 4) * 100;

  // Actionability (presence of action items with details)
  if (summary.actionItems && summary.actionItems.length > 0) {
    const detailedActions = summary.actionItems.filter(a => 
      a.assignee || a.deadline
    ).length;
    scores.actionability = Math.min(
      (detailedActions / summary.actionItems.length) * 100,
      100
    );
  }

  // Clarity (reasonable length, not too short or too long)
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

  // Overall score
  scores.overall = Math.round(
    (scores.completeness + scores.actionability + scores.clarity) / 3
  );

  return scores;
};

module.exports = {
  generateSummary,
  generateExecutiveSummary,
  extractActions,
  enhanceSummaryWithNLP,
  batchGenerateSummaries,
  regenerateSummary,
  compareSummaries,
  validateActionItems,
  mergeActionItems,
  formatSummaryForEmail,
  getSummaryQuality
};
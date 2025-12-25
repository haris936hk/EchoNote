import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Chip
} from '@heroui/react';
import {
  FiFileText,
  FiCheckSquare,
  FiList,
  FiArrowRight,
  FiCopy,
  FiCheck,
  FiUser,
  FiCalendar,
  FiTag
} from 'react-icons/fi';
import { useState } from 'react';

// Color palette for topic chips
const TOPIC_COLORS = [
  { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400' },
  { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400' },
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400' },
  { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-400' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400' },
  { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-400' },
];

const SummaryViewer = ({ summary, title = 'Meeting Summary' }) => {
  const [copiedSection, setCopiedSection] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  if (!summary) {
    return (
      <Card className="border border-divider rounded-2xl">
        <CardBody className="text-center py-16">
          <div className="w-16 h-16 bg-default-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiFileText size={32} className="text-default-300" />
          </div>
          <p className="text-default-500 text-lg">No summary available</p>
          <p className="text-default-400 text-sm mt-1">The summary will appear here once processing is complete</p>
        </CardBody>
      </Card>
    );
  }

  // Handle structured summary object from backend (matching OUTPUT_SCHEMA)
  const summaryData = typeof summary === 'object' ? {
    executive: summary.executiveSummary || '',
    decisions: Array.isArray(summary.keyDecisions) ? summary.keyDecisions : [],
    actions: Array.isArray(summary.actionItems) ? summary.actionItems : [],
    nextSteps: Array.isArray(summary.nextSteps) ? summary.nextSteps : [],
    keyTopics: Array.isArray(summary.keyTopics) ? summary.keyTopics : [],
    sentiment: summary.sentiment || 'neutral'
  } : {
    executive: '',
    decisions: [],
    actions: [],
    nextSteps: [],
    keyTopics: [],
    sentiment: 'neutral'
  };

  const copyToClipboard = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyEntireSection = (sectionName, content) => {
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      if (content.length > 0 && typeof content[0] === 'object' && content[0].task) {
        text = content.map((item, i) => {
          let line = `${i + 1}. ${item.task}`;
          if (item.assignee) line += ` (Assignee: ${item.assignee})`;
          if (item.deadline) line += ` (Deadline: ${item.deadline})`;
          if (item.priority) line += ` [${item.priority.toUpperCase()}]`;
          return line;
        }).join('\n');
      } else {
        text = content.map((item, i) => `${i + 1}. ${item}`).join('\n');
      }
    }
    copyToClipboard(text, sectionName);
  };

  const toggleActionItem = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getSentimentConfig = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Positive Tone' };
      case 'negative':
        return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', label: 'Negative Tone' };
      case 'mixed':
        return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Mixed Tone' };
      default:
        return { bg: 'bg-default/20', border: 'border-default/30', text: 'text-default-500', label: 'Neutral Tone' };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400' };
      case 'medium':
        return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400' };
      case 'low':
        return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' };
      default:
        return { bg: 'bg-default/20', border: 'border-default/30', text: 'text-default-500' };
    }
  };

  const sentimentConfig = getSentimentConfig(summaryData.sentiment);

  const CopyButton = ({ section, content, className = '' }) => (
    <Button
      size="sm"
      isIconOnly
      variant="light"
      className={`opacity-60 hover:opacity-100 transition-opacity ${className}`}
      onPress={() => copyEntireSection(section, content)}
    >
      {copiedSection === section ? (
        <FiCheck size={16} className="text-success" />
      ) : (
        <FiCopy size={16} />
      )}
    </Button>
  );

  const SectionHeader = ({ icon: Icon, title, iconColor, section, content }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${iconColor}/10`}>
          <Icon className={iconColor} size={18} />
        </div>
        {title}
      </h3>
      <CopyButton section={section} content={content} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2.5">
            <FiFileText className="text-primary" size={22} />
            {title}
          </h2>
          <Chip
            size="sm"
            variant="flat"
            classNames={{
              base: `${sentimentConfig.bg} ${sentimentConfig.border} border px-2.5`,
              content: `${sentimentConfig.text} text-xs font-medium`
            }}
          >
            {sentimentConfig.label}
          </Chip>
        </div>
        <Button
          size="sm"
          variant="flat"
          className="rounded-xl"
          startContent={copiedSection === 'all' ? <FiCheck size={14} className="text-success" /> : <FiCopy size={14} />}
          onPress={() => copyToClipboard(JSON.stringify(summary, null, 2), 'all')}
        >
          {copiedSection === 'all' ? 'Copied!' : 'Copy All'}
        </Button>
      </div>

      {/* Executive Summary */}
      {summaryData.executive && (
        <Card className="border border-divider/50 rounded-2xl bg-content1/50 backdrop-blur-sm">
          <CardBody className="p-5">
            <SectionHeader
              icon={FiFileText}
              title="Executive Summary"
              iconColor="text-primary"
              section="executive"
              content={summaryData.executive}
            />
            <p className="text-default-600 leading-relaxed">
              {summaryData.executive}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Key Topics */}
      {summaryData.keyTopics.length > 0 && (
        <Card className="border border-divider/50 rounded-2xl bg-content1/50 backdrop-blur-sm">
          <CardBody className="p-5">
            <SectionHeader
              icon={FiTag}
              title="Key Topics"
              iconColor="text-secondary"
              section="keyTopics"
              content={summaryData.keyTopics}
            />
            <div className="flex flex-wrap gap-2.5">
              {summaryData.keyTopics.map((topic, index) => {
                const colorConfig = TOPIC_COLORS[index % TOPIC_COLORS.length];
                return (
                  <Chip
                    key={index}
                    variant="flat"
                    classNames={{
                      base: `${colorConfig.bg} ${colorConfig.border} border px-3 py-1`,
                      content: `${colorConfig.text} text-sm font-medium capitalize`
                    }}
                  >
                    {topic}
                  </Chip>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Key Decisions */}
      {summaryData.decisions.length > 0 && (
        <Card className="border border-divider/50 rounded-2xl bg-content1/50 backdrop-blur-sm">
          <CardBody className="p-5">
            <SectionHeader
              icon={FiCheckSquare}
              title="Key Decisions"
              iconColor="text-success"
              section="decisions"
              content={summaryData.decisions}
            />
            <div className="space-y-2">
              {summaryData.decisions.map((decision, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-success/5 border border-success/10 rounded-xl"
                >
                  <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-success text-xs font-semibold">{index + 1}</span>
                  </div>
                  <p className="text-default-600 leading-relaxed">{decision}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Action Items */}
      {summaryData.actions.length > 0 && (
        <Card className="border border-divider/50 rounded-2xl bg-content1/50 backdrop-blur-sm">
          <CardBody className="p-5">
            <SectionHeader
              icon={FiCheckSquare}
              title="Action Items"
              iconColor="text-warning"
              section="actions"
              content={summaryData.actions}
            />
            <div className="space-y-3">
              {summaryData.actions.map((action, index) => {
                const isChecked = checkedItems[index];
                const priorityConfig = getPriorityConfig(action.priority);

                return (
                  <div
                    key={index}
                    className={`
                      group relative rounded-xl p-4 
                      border border-divider/50 
                      bg-gradient-to-r from-default-50/50 to-transparent
                      hover:border-primary/30 hover:shadow-sm
                      transition-all duration-200
                      ${isChecked ? 'opacity-60' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        onClick={() => toggleActionItem(index)}
                        className={`
                          w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 cursor-pointer
                          flex items-center justify-center
                          transition-all duration-200
                          ${isChecked
                            ? 'bg-success border-success'
                            : 'border-default-300 hover:border-success/50'
                          }
                        `}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <p className={`text-default-700 font-medium leading-relaxed ${isChecked ? 'line-through' : ''}`}>
                          {action.task}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {action.assignee && (
                            <div className="flex items-center gap-1.5 text-xs text-default-500 bg-default-100 px-2.5 py-1 rounded-lg">
                              <FiUser size={12} />
                              <span>{action.assignee}</span>
                            </div>
                          )}
                          {action.deadline && (
                            <div className="flex items-center gap-1.5 text-xs text-default-500 bg-default-100 px-2.5 py-1 rounded-lg">
                              <FiCalendar size={12} />
                              <span>{action.deadline}</span>
                            </div>
                          )}
                          {action.priority && (
                            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase ${priorityConfig.bg} px-2.5 py-1 rounded-lg`}>
                              <span className={priorityConfig.text}>{action.priority}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Next Steps */}
      {summaryData.nextSteps.length > 0 && (
        <Card className="border border-divider/50 rounded-2xl bg-content1/50 backdrop-blur-sm">
          <CardBody className="p-5">
            <SectionHeader
              icon={FiArrowRight}
              title="Next Steps"
              iconColor="text-emerald-500"
              section="nextSteps"
              content={summaryData.nextSteps}
            />
            <div className="space-y-2">
              {summaryData.nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-default-50 border border-default-100 rounded-xl"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiArrowRight size={12} className="text-emerald-500" />
                  </div>
                  <p className="text-default-600 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default SummaryViewer;
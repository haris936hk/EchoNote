import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Divider,
  Accordion,
  AccordionItem,
  Chip
} from '@heroui/react';
import { 
  FiFileText, 
  FiCheckCircle, 
  FiList, 
  FiCalendar,
  FiCopy,
  FiCheck
} from 'react-icons/fi';
import { useState } from 'react';

const SummaryViewer = ({ summary, title = 'Meeting Summary' }) => {
  const [copiedSection, setCopiedSection] = useState(null);

  if (!summary) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <FiFileText size={48} className="mx-auto text-default-300 mb-4" />
          <p className="text-default-500">No summary available</p>
        </CardBody>
      </Card>
    );
  }

  // Handle structured summary object from backend (echonote_dataset.json format)
  const summaryData = typeof summary === 'object' ? {
    executive: summary.executiveSummary || '',
    decisions: summary.keyDecisions || '',
    actions: Array.isArray(summary.actionItems) ? summary.actionItems : [],
    nextSteps: summary.nextSteps || '',
    keyTopics: Array.isArray(summary.keyTopics) ? summary.keyTopics : [],
    sentiment: summary.sentiment || 'neutral'
  } : {
    executive: '',
    decisions: '',
    actions: [],
    nextSteps: '',
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
      // Handle action items (objects with task, assignee, deadline, priority)
      if (content.length > 0 && typeof content[0] === 'object' && content[0].task) {
        text = content.map((item, i) => {
          let line = `${i + 1}. ${item.task}`;
          if (item.assignee) line += ` (Assignee: ${item.assignee})`;
          if (item.deadline) line += ` (Deadline: ${item.deadline})`;
          if (item.priority) line += ` [${item.priority.toUpperCase()}]`;
          return line;
        }).join('\n');
      } else {
        // Handle simple string arrays (topics, etc.)
        text = content.map((item, i) => `${i + 1}. ${item}`).join('\n');
      }
    }
    copyToClipboard(text, sectionName);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FiFileText className="text-primary" />
            {title}
          </h2>
          {summaryData.sentiment && (
            <Chip
              size="sm"
              variant="flat"
              color={
                summaryData.sentiment === 'positive' ? 'success' :
                summaryData.sentiment === 'negative' ? 'danger' :
                summaryData.sentiment === 'mixed' ? 'warning' : 'default'
              }
            >
              {summaryData.sentiment.charAt(0).toUpperCase() + summaryData.sentiment.slice(1)} Tone
            </Chip>
          )}
        </div>
        <Button
          size="sm"
          variant="flat"
          startContent={copiedSection === 'all' ? <FiCheck size={16} /> : <FiCopy size={16} />}
          onPress={() => copyToClipboard(JSON.stringify(summary, null, 2), 'all')}
        >
          {copiedSection === 'all' ? 'Copied!' : 'Copy All'}
        </Button>
      </CardHeader>

      <Divider />

      <CardBody className="p-6 space-y-6">
        {/* Executive Summary */}
        {summaryData.executive && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FiFileText className="text-primary" size={20} />
                Executive Summary
              </h3>
              <Button
                size="sm"
                isIconOnly
                variant="light"
                onPress={() => copyEntireSection('executive', summaryData.executive)}
              >
                {copiedSection === 'executive' ? <FiCheck size={16} /> : <FiCopy size={16} />}
              </Button>
            </div>
            <div className="bg-primary/5 border-l-4 border-primary rounded-lg p-4">
              <p className="text-default-700 leading-relaxed">
                {summaryData.executive}
              </p>
            </div>
          </div>
        )}

        {/* Key Topics */}
        {summaryData.keyTopics.length > 0 && (
          <>
            <Divider />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiList className="text-secondary" size={20} />
                  Key Topics
                </h3>
                <Button
                  size="sm"
                  isIconOnly
                  variant="light"
                  onPress={() => copyEntireSection('keyTopics', summaryData.keyTopics)}
                >
                  {copiedSection === 'keyTopics' ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {summaryData.keyTopics.map((topic, index) => (
                  <Chip
                    key={index}
                    color="secondary"
                    variant="flat"
                    className="capitalize"
                  >
                    {topic}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Key Decisions */}
        {summaryData.decisions && summaryData.decisions !== 'No major decisions recorded' && (
          <>
            <Divider />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiCheckCircle className="text-success" size={20} />
                  Key Decisions
                </h3>
                <Button
                  size="sm"
                  isIconOnly
                  variant="light"
                  onPress={() => copyEntireSection('decisions', summaryData.decisions)}
                >
                  {copiedSection === 'decisions' ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </Button>
              </div>
              <div className="bg-success/10 border-l-4 border-success rounded-lg p-4">
                <p className="text-default-700 leading-relaxed">
                  {summaryData.decisions}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Action Items */}
        {summaryData.actions.length > 0 && (
          <>
            <Divider />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiList className="text-warning" size={20} />
                  Action Items
                </h3>
                <Button
                  size="sm"
                  isIconOnly
                  variant="light"
                  onPress={() => copyEntireSection('actions', summaryData.actions)}
                >
                  {copiedSection === 'actions' ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </Button>
              </div>
              <div className="space-y-3">
                {summaryData.actions.map((action, index) => (
                  <div
                    key={index}
                    className="bg-warning/10 border-l-4 border-warning rounded-lg p-4 hover:bg-warning/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded border-2 border-warning flex-shrink-0 mt-0.5 cursor-pointer hover:bg-warning/20" />
                      <div className="flex-1 space-y-2">
                        <p className="text-default-700 font-medium">{action.task}</p>
                        <div className="flex flex-wrap gap-2">
                          {action.assignee && (
                            <Chip size="sm" variant="flat" color="primary">
                              👤 {action.assignee}
                            </Chip>
                          )}
                          {action.deadline && (
                            <Chip size="sm" variant="flat" color="secondary">
                              📅 {action.deadline}
                            </Chip>
                          )}
                          {action.priority && (
                            <Chip
                              size="sm"
                              variant="flat"
                              color={
                                action.priority === 'high' ? 'danger' :
                                action.priority === 'medium' ? 'warning' : 'success'
                              }
                            >
                              {action.priority.toUpperCase()}
                            </Chip>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Next Steps */}
        {summaryData.nextSteps && (
          <>
            <Divider />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiCalendar className="text-primary" size={20} />
                  Next Steps
                </h3>
                <Button
                  size="sm"
                  isIconOnly
                  variant="light"
                  onPress={() => copyEntireSection('nextSteps', summaryData.nextSteps)}
                >
                  {copiedSection === 'nextSteps' ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </Button>
              </div>
              <div className="bg-default-100 rounded-lg p-4">
                <p className="text-default-700 leading-relaxed">
                  {summaryData.nextSteps}
                </p>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

// Compact version with accordion
export const CompactSummaryViewer = ({ summary }) => {
  const parseSummary = (summaryText) => {
    // Same parsing logic as above
    const sections = {
      executive: '',
      decisions: [],
      actions: [],
      nextSteps: ''
    };
    // ... parsing code
    return sections;
  };

  const summaryData = parseSummary(summary);

  return (
    <Accordion variant="splitted">
      {summaryData.executive && (
        <AccordionItem
          key="executive"
          title="Executive Summary"
          startContent={<FiFileText className="text-primary" />}
        >
          <p className="text-sm text-default-700 leading-relaxed">
            {summaryData.executive}
          </p>
        </AccordionItem>
      )}

      {summaryData.decisions.length > 0 && (
        <AccordionItem
          key="decisions"
          title={`Key Decisions (${summaryData.decisions.length})`}
          startContent={<FiCheckCircle className="text-success" />}
        >
          <ul className="space-y-2">
            {summaryData.decisions.map((decision, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-success">•</span>
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        </AccordionItem>
      )}

      {summaryData.actions.length > 0 && (
        <AccordionItem
          key="actions"
          title={`Action Items (${summaryData.actions.length})`}
          startContent={<FiList className="text-warning" />}
        >
          <ul className="space-y-2">
            {summaryData.actions.map((action, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-warning">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </AccordionItem>
      )}

      {summaryData.nextSteps && (
        <AccordionItem
          key="nextSteps"
          title="Next Steps"
          startContent={<FiCalendar className="text-primary" />}
        >
          <p className="text-sm text-default-700 leading-relaxed">
            {summaryData.nextSteps}
          </p>
        </AccordionItem>
      )}
    </Accordion>
  );
};

export default SummaryViewer;
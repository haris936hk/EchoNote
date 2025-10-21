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

  const parseSummary = (summaryText) => {
    const sections = {
      executive: '',
      decisions: [],
      actions: [],
      nextSteps: '',
      keyPoints: []
    };

    const lines = summaryText.split('\n');
    let currentSection = '';

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) return;

      if (trimmedLine.toLowerCase().includes('executive summary')) {
        currentSection = 'executive';
      } else if (trimmedLine.toLowerCase().includes('key decisions')) {
        currentSection = 'decisions';
      } else if (trimmedLine.toLowerCase().includes('action items')) {
        currentSection = 'actions';
      } else if (trimmedLine.toLowerCase().includes('next steps')) {
        currentSection = 'nextSteps';
      } else if (trimmedLine.toLowerCase().includes('key points')) {
        currentSection = 'keyPoints';
      } else {
        if (currentSection === 'executive') {
          sections.executive += trimmedLine + ' ';
        } else if (currentSection === 'decisions' && (trimmedLine.startsWith('-') || trimmedLine.startsWith('•'))) {
          sections.decisions.push(trimmedLine.substring(1).trim());
        } else if (currentSection === 'actions' && (trimmedLine.startsWith('-') || trimmedLine.startsWith('•'))) {
          sections.actions.push(trimmedLine.substring(1).trim());
        } else if (currentSection === 'keyPoints' && (trimmedLine.startsWith('-') || trimmedLine.startsWith('•'))) {
          sections.keyPoints.push(trimmedLine.substring(1).trim());
        } else if (currentSection === 'nextSteps') {
          sections.nextSteps += trimmedLine + ' ';
        }
      }
    });

    return sections;
  };

  const summaryData = parseSummary(summary);

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
      text = content.map((item, i) => `${i + 1}. ${item}`).join('\n');
    }
    copyToClipboard(text, sectionName);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FiFileText className="text-primary" />
          {title}
        </h2>
        <Button
          size="sm"
          variant="flat"
          startContent={copiedSection === 'all' ? <FiCheck size={16} /> : <FiCopy size={16} />}
          onPress={() => copyToClipboard(summary, 'all')}
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

        {/* Key Points */}
        {summaryData.keyPoints.length > 0 && (
          <>
            <Divider />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiList className="text-secondary" size={20} />
                  Key Points
                </h3>
                <Button
                  size="sm"
                  isIconOnly
                  variant="light"
                  onPress={() => copyEntireSection('keyPoints', summaryData.keyPoints)}
                >
                  {copiedSection === 'keyPoints' ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </Button>
              </div>
              <ul className="space-y-2">
                {summaryData.keyPoints.map((point, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors"
                  >
                    <Chip size="sm" color="secondary" variant="flat" className="mt-0.5">
                      {index + 1}
                    </Chip>
                    <span className="text-default-700 flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Key Decisions */}
        {summaryData.decisions.length > 0 && (
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
              <ul className="space-y-2">
                {summaryData.decisions.map((decision, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-success/10 rounded-lg"
                  >
                    <FiCheckCircle className="text-success mt-0.5 flex-shrink-0" size={18} />
                    <span className="text-default-700">{decision}</span>
                  </li>
                ))}
              </ul>
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
              <ul className="space-y-2">
                {summaryData.actions.map((action, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg group hover:bg-warning/20 transition-colors"
                  >
                    <div className="w-5 h-5 rounded border-2 border-warning flex-shrink-0 mt-0.5 cursor-pointer hover:bg-warning/20" />
                    <span className="text-default-700 flex-1">{action}</span>
                  </li>
                ))}
              </ul>
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
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Divider,
  Chip,
  Tabs,
  Tab
} from '@heroui/react';
import { 
  FiDownload, 
  FiClock, 
  FiCalendar,
  FiFileText,
  FiList,
  FiCheckCircle
} from 'react-icons/fi';
import { CategoryBadge } from './CategoryFilter';
import { useState } from 'react';

const MeetingDetail = ({ meeting }) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!meeting) {
    return (
      <Card>
        <CardBody>
          <p className="text-center text-default-500">Meeting not found</p>
        </CardBody>
      </Card>
    );
  }

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleDownload = (type) => {
    // Handle download logic
    switch(type) {
      case 'audio':
        if (meeting.audioUrl) {
          window.open(meeting.audioUrl, '_blank');
        }
        break;
      case 'transcript':
        if (meeting.transcript) {
          const blob = new Blob([meeting.transcript], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${meeting.title}-transcript.txt`;
          a.click();
        }
        break;
      case 'summary':
        if (meeting.summary) {
          const blob = new Blob([meeting.summary], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${meeting.title}-summary.txt`;
          a.click();
        }
        break;
    }
  };

  const parseSummary = (summaryText) => {
    if (!summaryText) return null;

    const sections = {
      executive: '',
      decisions: [],
      actions: [],
      nextSteps: ''
    };

    // Simple parsing logic - adjust based on your LLM output format
    const lines = summaryText.split('\n');
    let currentSection = '';

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('executive summary')) {
        currentSection = 'executive';
      } else if (trimmedLine.toLowerCase().includes('key decisions')) {
        currentSection = 'decisions';
      } else if (trimmedLine.toLowerCase().includes('action items')) {
        currentSection = 'actions';
      } else if (trimmedLine.toLowerCase().includes('next steps')) {
        currentSection = 'nextSteps';
      } else if (trimmedLine) {
        if (currentSection === 'executive') {
          sections.executive += trimmedLine + ' ';
        } else if (currentSection === 'decisions' && trimmedLine.startsWith('-')) {
          sections.decisions.push(trimmedLine.substring(1).trim());
        } else if (currentSection === 'actions' && trimmedLine.startsWith('-')) {
          sections.actions.push(trimmedLine.substring(1).trim());
        } else if (currentSection === 'nextSteps') {
          sections.nextSteps += trimmedLine + ' ';
        }
      }
    });

    return sections;
  };

  const summaryData = parseSummary(meeting.summary);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-col items-start gap-3 p-6">
          <div className="flex items-start justify-between w-full">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{meeting.title}</h1>
              {meeting.description && (
                <p className="text-default-500 mt-2">{meeting.description}</p>
              )}
            </div>
            
            {/* Download Buttons */}
            <div className="flex gap-2">
              {meeting.audioUrl && (
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<FiDownload size={16} />}
                  onPress={() => handleDownload('audio')}
                >
                  Audio
                </Button>
              )}
              {meeting.transcript && (
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<FiDownload size={16} />}
                  onPress={() => handleDownload('transcript')}
                >
                  Transcript
                </Button>
              )}
              {meeting.summary && (
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<FiDownload size={16} />}
                  onPress={() => handleDownload('summary')}
                >
                  Summary
                </Button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <CategoryBadge category={meeting.category} />
            
            <Chip
              variant="flat"
              size="sm"
              startContent={<FiCalendar size={12} />}
            >
              {formatDate(meeting.createdAt)}
            </Chip>

            {meeting.duration && (
              <Chip
                variant="flat"
                size="sm"
                startContent={<FiClock size={12} />}
              >
                {formatDuration(meeting.duration)}
              </Chip>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <Card>
        <CardBody className="p-0">
          <Tabs
            aria-label="Meeting content"
            selectedKey={activeTab}
            onSelectionChange={setActiveTab}
            classNames={{
              base: "w-full",
              tabList: "w-full relative rounded-none p-0 border-b border-divider gap-0",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-6 h-14 data-[selected=true]:text-primary",
              tabContent: "group-data-[selected=true]:text-primary w-full",
              panel: "w-full p-0"
            }}
          >
            {/* Summary Tab */}
            <Tab
              key="summary"
              title={
                <div className="flex items-center gap-2">
                  <FiFileText size={16} />
                  <span>Summary</span>
                </div>
              }
            >
              <div className="p-6 space-y-6">
                {summaryData ? (
                  <>
                    {/* Executive Summary */}
                    {summaryData.executive && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FiFileText className="text-primary" />
                          Executive Summary
                        </h3>
                        <p className="text-default-700 leading-relaxed">
                          {summaryData.executive}
                        </p>
                      </div>
                    )}

                    <Divider />

                    {/* Key Decisions */}
                    {summaryData.decisions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FiCheckCircle className="text-success" />
                          Key Decisions
                        </h3>
                        <ul className="space-y-2">
                          {summaryData.decisions.map((decision, index) => (
                            <li 
                              key={index}
                              className="flex items-start gap-3 p-3 bg-success/10 rounded-lg"
                            >
                              <FiCheckCircle className="text-success mt-0.5 flex-shrink-0" size={16} />
                              <span className="text-default-700">{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Divider />

                    {/* Action Items */}
                    {summaryData.actions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FiList className="text-warning" />
                          Action Items
                        </h3>
                        <ul className="space-y-2">
                          {summaryData.actions.map((action, index) => (
                            <li 
                              key={index}
                              className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg"
                            >
                              <div className="w-5 h-5 rounded border-2 border-warning flex-shrink-0 mt-0.5" />
                              <span className="text-default-700">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Steps */}
                    {summaryData.nextSteps && (
                      <>
                        <Divider />
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <FiCalendar className="text-primary" />
                            Next Steps
                          </h3>
                          <p className="text-default-700 leading-relaxed">
                            {summaryData.nextSteps}
                          </p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center text-default-500 py-8">
                    <p>No summary available</p>
                  </div>
                )}
              </div>
            </Tab>

            {/* Transcript Tab */}
            <Tab
              key="transcript"
              title={
                <div className="flex items-center gap-2">
                  <FiFileText size={16} />
                  <span>Transcript</span>
                </div>
              }
            >
              <div className="p-6">
                {meeting.transcript ? (
                  <div className="bg-default-100 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-default-700 leading-relaxed">
                      {meeting.transcript}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-default-500 py-8">
                    <p>No transcript available</p>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
};

export default MeetingDetail;
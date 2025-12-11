import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react';
import {
  FiArrowLeft,
  FiDownload,
  FiMoreVertical,
  FiTrash2,
  FiEdit,
  FiCalendar,
  FiClock,
  FiFileText,
  FiList,
  FiAlertCircle
} from 'react-icons/fi';
import { useMeeting } from '../contexts/MeetingContext';
import SummaryViewer from '../components/meeting/SummaryViewer';
import TranscriptViewer from '../components/meeting/TranscriptViewer';
import { CategoryBadge } from '../components/meeting/CategoryFilter';
import { PageLoader } from '../components/common/Loader';

const MeetingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentMeeting, fetchMeeting, deleteMeeting, loading } = useMeeting();
  const [activeTab, setActiveTab] = useState('summary');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMeeting(id);
    }
  }, [id, fetchMeeting]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this meeting? This action cannot be undone.'
    );

    if (confirmed) {
      setDeleting(true);
      const result = await deleteMeeting(id);
      setDeleting(false);

      if (result.success) {
        navigate('/dashboard');
      } else {
        window.alert('Failed to delete meeting. Please try again.');
      }
    }
  };

  const handleEdit = () => {
    // Navigate to edit page or open edit modal
    console.log('Edit meeting:', id);
  };

  const handleDownloadAudio = () => {
    if (currentMeeting?.audioUrl) {
      window.open(currentMeeting.audioUrl, '_blank');
    }
  };

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

  if (loading && !currentMeeting) {
    return <PageLoader label="Loading meeting details..." />;
  }

  if (!currentMeeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md rounded-3xl border border-divider shadow-xl">
          <CardBody className="text-center py-12">
            <p className="text-xl font-semibold mb-2">Meeting Not Found</p>
            <p className="text-default-500 mb-6">
              The meeting you're looking for doesn't exist or has been deleted.
            </p>
            <div className="relative group inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-300 rounded-3xl"></div>
              <Button color="primary" onPress={handleBack} className="relative rounded-3xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300">
                Back to Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Back Button */}
        <Button
          variant="light"
          startContent={<FiArrowLeft size={18} />}
          onPress={handleBack}
          className="rounded-3xl hover:bg-default-100 hover:shadow-md transition-all duration-300"
        >
          Back to Dashboard
        </Button>

        {/* Header Card */}
        <Card className="rounded-3xl border border-divider hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex-col items-start gap-4 p-6">
            {/* Title and Actions Row */}
            <div className="flex items-start justify-between w-full gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {currentMeeting.title}
                </h1>
                {currentMeeting.description && (
                  <p className="text-default-600">{currentMeeting.description}</p>
                )}
              </div>

              {/* Actions Dropdown */}
              <div className="flex gap-2">
                {currentMeeting.audioUrl && (
                  <Button
                    variant="flat"
                    startContent={<FiDownload size={18} />}
                    onPress={handleDownloadAudio}
                    className="rounded-2xl hover:bg-primary/10 hover:border-primary/20 transition-all duration-300"
                  >
                    Audio
                  </Button>
                )}

                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly variant="flat" isDisabled={deleting} className="rounded-2xl hover:bg-default-100 transition-all duration-300">
                      <FiMoreVertical size={18} />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem
                      key="edit"
                      startContent={<FiEdit size={16} />}
                      onPress={handleEdit}
                      isDisabled={deleting}
                    >
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      color="danger"
                      className="text-danger"
                      startContent={<FiTrash2 size={16} />}
                      onPress={handleDelete}
                      isDisabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3">
              <CategoryBadge category={currentMeeting.category} />

              <Chip
                variant="flat"
                size="sm"
                startContent={<FiCalendar size={12} />}
              >
                {formatDate(currentMeeting.createdAt)}
              </Chip>

              {currentMeeting.duration && (
                <Chip
                  variant="flat"
                  size="sm"
                  startContent={<FiClock size={12} />}
                >
                  {formatDuration(currentMeeting.duration)}
                </Chip>
              )}

              <Chip
                color={
                  currentMeeting.status === 'COMPLETED'
                    ? 'success'
                    : currentMeeting.status === 'PROCESSING'
                    ? 'warning'
                    : 'danger'
                }
                variant="flat"
                size="sm"
              >
                {currentMeeting.status}
              </Chip>
            </div>
          </CardHeader>
        </Card>

        {/* Processing State */}
        {currentMeeting.status === 'PROCESSING' && (
          <Card className="border-warning/20 bg-warning/5 rounded-3xl hover:border-warning/40 transition-all duration-300">
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                <div>
                  <p className="font-semibold text-warning">Processing</p>
                  <p className="text-sm text-warning/80">
                    Your meeting is being transcribed and summarized. This usually takes a few minutes.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Failed State */}
        {currentMeeting.status === 'FAILED' && (
          <Card className="border-danger/20 bg-danger/5 rounded-3xl hover:border-danger/40 transition-all duration-300">
            <CardBody>
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-danger mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-danger">Processing Failed</p>
                  <p className="text-sm text-danger/80 mb-3">
                    There was an error processing this meeting. Please try uploading the audio again.
                  </p>
                  <Button size="sm" color="danger" variant="flat" className="rounded-2xl hover:bg-danger/10 transition-all duration-300">
                    Retry Processing
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Content Tabs - Only show if completed */}
        {currentMeeting.status === 'COMPLETED' && (
          <Card className="rounded-3xl border border-divider">
            <CardBody className="p-0">
              <Tabs
                aria-label="Meeting content"
                selectedKey={activeTab}
                onSelectionChange={setActiveTab}
                classNames={{
                  tabList: 'w-full relative rounded-none p-0 border-b border-divider',
                  cursor: 'w-full bg-primary',
                  tab: 'max-w-fit px-6 h-12',
                  tabContent: 'group-data-[selected=true]:text-primary'
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
                  <div className="p-6">
                    <SummaryViewer
                      summary={currentMeeting.summary}
                      title="AI-Generated Summary"
                    />
                  </div>
                </Tab>

                {/* Transcript Tab */}
                <Tab
                  key="transcript"
                  title={
                    <div className="flex items-center gap-2">
                      <FiList size={16} />
                      <span>Transcript</span>
                    </div>
                  }
                >
                  <div className="p-6">
                    <TranscriptViewer
                      transcript={currentMeeting.transcript}
                      title="Full Transcript"
                      meetingTitle={currentMeeting.title}
                    />
                  </div>
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        )}

        {/* Audio Player - If available */}
        {currentMeeting.audioUrl && currentMeeting.status === 'COMPLETED' && (
          <Card className="rounded-3xl border border-divider hover:border-primary/20 transition-all duration-300">
            <CardHeader>
              <h3 className="text-lg font-semibold">Audio Recording</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <audio
                src={currentMeeting.audioUrl}
                controls
                className="w-full"
                preload="metadata"
              >
                Your browser does not support the audio element.
              </audio>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MeetingDetailPage;
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { LuArrowLeft as ArrowLeft, LuDownload as Download, LuMoreVertical as MoreVertical, LuTrash2 as Trash2, LuPenLine as Edit3, LuCalendar as Calendar, LuClock as Clock, LuAlertCircle as AlertCircle, LuMic as Mic, LuCheckCircle as CheckCircle } from 'react-icons/lu';
import { useMeeting } from '../contexts/MeetingContext';
import SummaryViewer from '../components/meeting/SummaryViewer';
import TranscriptViewer from '../components/meeting/TranscriptViewer';
import { CategoryBadge } from '../components/meeting/CategoryFilter';
import { PageLoader } from '../components/common/Loader';
import EditMeetingModal from '../components/meeting/EditMeetingModal';
import SpeakerRenameModal from '../components/meeting/SpeakerRenameModal';

const PIPELINE_STEPS = [
  { key: 'UPLOADING', label: 'Upload' },
  { key: 'PROCESSING_AUDIO', label: 'Audio Processing' },
  { key: 'TRANSCRIBING', label: 'Transcribing' },
  { key: 'PROCESSING_NLP', label: 'NLP' },
  { key: 'SUMMARIZING', label: 'Summarizing' },
];

const MeetingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentMeeting, fetchMeeting, deleteMeeting, updateMeeting, loading } = useMeeting();
  const [deleting, setDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState({ id: '', name: '' });

  const handleRenameSpeaker = (speakerId, currentName) => {
    setSelectedSpeaker({ id: speakerId, name: currentName });
    setIsSpeakerModalOpen(true);
  };

  const handleSaveSpeaker = async (speakerId, newName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/meetings/${id}/speakers`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ speakerId, newName }),
      });

      if (!response.ok) throw new Error('Failed to update speaker');
      
      const result = await response.json();
      if (result.success) {
        // Optimistic UI update or refresh meeting data
        fetchMeeting(id);
      }
    } catch (error) {
      window.alert('Failed to rename speaker.');
    }
  };

  useEffect(() => {
    if (id) fetchMeeting(id);
  }, [id, fetchMeeting]);

  // Poll for processing status
  useEffect(() => {
    if (!currentMeeting || !id) return;
    const processingStates = [
      'UPLOADING',
      'PROCESSING_AUDIO',
      'TRANSCRIBING',
      'PROCESSING_NLP',
      'SUMMARIZING',
    ];
    if (!processingStates.includes(currentMeeting.status)) return;
    const pollInterval = setInterval(() => fetchMeeting(id), 5000);
    return () => clearInterval(pollInterval);
  }, [currentMeeting, id, fetchMeeting]);

  const handleBack = () => navigate('/dashboard');

  const handleDelete = async () => {
    if (
      window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')
    ) {
      setDeleting(true);
      const result = await deleteMeeting(id);
      setDeleting(false);
      if (result.success) navigate('/dashboard');
      else window.alert('Failed to delete meeting.');
    }
  };

  const handleEdit = () => setIsEditModalOpen(true);

  const handleSaveEdit = async (updates) => {
    const result = await updateMeeting(id, updates);
    if (result.success) fetchMeeting(id);
  };

  const handleDownloadAudio = async () => {
    if (!currentMeeting?.audioUrl) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/meetings/${id}/download/audio`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to download audio');
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${currentMeeting.title}_audio.mp3`;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.alert('Failed to download audio file.');
    }
  };

  const handleDownloadAll = async () => {
    if (!id || currentMeeting?.status !== 'COMPLETED') return;
    try {
      setDownloadingAll(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/meetings/${id}/download/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to download files');
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${currentMeeting.title}_complete.zip`;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.alert('Failed to download files.');
    } finally {
      setDownloadingAll(false);
    }
  };

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins === 0 ? `${secs}s` : `${mins}m ${secs}s`;
  };

  const getStatusInfo = (status) => {
    const map = {
      COMPLETED: {
        label: 'Completed',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        dot: 'bg-emerald-400',
      },
      FAILED: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
    };
    return (
      map[status] || {
        label: 'Processing',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        dot: 'bg-amber-400',
      }
    );
  };

  // Pipeline step progress
  const getCurrentStepIndex = () => {
    if (!currentMeeting) return -1;
    return PIPELINE_STEPS.findIndex((s) => s.key === currentMeeting.status);
  };

  if (loading && !currentMeeting) return <PageLoader label="Loading meeting details..." />;

  if (!currentMeeting) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-xl font-semibold text-white">Meeting Not Found</p>
        <p className="mb-6 text-slate-400">This meeting doesn't exist or has been deleted.</p>
        <button
          onClick={handleBack}
          className="btn-cta rounded-[10px] px-6 py-2.5 text-sm font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isProcessing = [
    'UPLOADING',
    'PROCESSING_AUDIO',
    'TRANSCRIBING',
    'PROCESSING_NLP',
    'SUMMARIZING',
  ].includes(currentMeeting.status);
  const isFailed = currentMeeting.status === 'FAILED';
  const isCompleted = currentMeeting.status === 'COMPLETED';
  const statusInfo = getStatusInfo(currentMeeting.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      {/* ── Back Link ── */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            {currentMeeting.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
            >
              <span
                className={`size-1.5 rounded-full ${statusInfo.dot} ${isProcessing ? 'animate-pulse' : ''}`}
              ></span>
              {statusInfo.label}
            </span>
            <CategoryBadge category={currentMeeting.category} />
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Calendar size={12} />
              {formatDate(currentMeeting.createdAt)}
            </span>
            {currentMeeting.duration && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                <Clock size={12} />
                {formatDuration(currentMeeting.duration)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {currentMeeting.audioUrl && (
            <button
              onClick={handleDownloadAudio}
              className="btn-ghost inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium"
            >
              <Download size={14} />
              Download Audio
            </button>
          )}
          <Dropdown>
            <DropdownTrigger>
              <button className="border-echo-border hover:bg-echo-surface-hover flex size-9 items-center justify-center rounded-[10px] border text-slate-400 transition-all hover:text-white">
                <MoreVertical size={16} />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Meeting actions"
              className="bg-echo-elevated border-echo-border border"
            >
              <DropdownItem key="edit" startContent={<Edit3 size={14} />} onPress={handleEdit}>
                Edit Meeting
              </DropdownItem>
              <DropdownItem
                key="download-all"
                startContent={<Download size={14} />}
                onPress={handleDownloadAll}
                isDisabled={!isCompleted || downloadingAll}
              >
                {downloadingAll ? 'Downloading...' : 'Download All (ZIP)'}
              </DropdownItem>
              <DropdownItem
                key="delete"
                startContent={<Trash2 size={14} />}
                className="text-red-400"
                onPress={handleDelete}
                isDisabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Meeting'}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* ── Processing State ── */}
      {isProcessing && (
        <div className="bg-echo-surface border-echo-border rounded-[16px] border p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="ai-dot"></div>
            <p className="text-sm font-medium text-white">Your meeting is being processed…</p>
          </div>

          {/* Pipeline Steps */}
          <div className="mb-4 flex items-center gap-2">
            {PIPELINE_STEPS.map((step, index) => {
              const currentIdx = getCurrentStepIndex();
              const isComplete = index < currentIdx;
              const isActive = index === currentIdx;
              const _isPending = index > currentIdx;

              return (
                <div key={step.key} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isComplete
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isActive
                            ? 'bg-accent-primary/20 text-accent-primary animate-ai-glow'
                            : 'bg-echo-surface-hover text-slate-600'
                      }`}
                    >
                      {isComplete ? <CheckCircle size={14} /> : index + 1}
                    </div>
                    <span
                      className={`text-center text-[10px] font-medium ${
                        isComplete
                          ? 'text-emerald-400'
                          : isActive
                            ? 'text-accent-primary'
                            : 'text-slate-600'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={`-mt-5 h-px flex-1 ${isComplete ? 'bg-emerald-500/30' : 'bg-echo-border'}`}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-slate-500">Estimated ~45 seconds remaining</p>
        </div>
      )}

      {/* ── Failed State ── */}
      {isFailed && (
        <div className="flex items-center gap-3 rounded-[16px] border border-red-500/10 bg-red-500/5 px-5 py-4">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">Processing Failed</p>
            <p className="mt-0.5 text-xs text-red-400/70">
              {currentMeeting.error ||
                'An error occurred during processing. Please try uploading again.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Completed State — Split View ── */}
      {isCompleted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left Column — Transcript (60%) */}
          <div className="space-y-4 lg:col-span-3">
            {/* Audio Player */}
            {currentMeeting.audioUrl && (
              <div className="bg-echo-surface border-echo-border rounded-[16px] border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Mic size={14} className="text-accent-primary" />
                  <span className="text-xs font-medium text-slate-400">Audio Recording</span>
                </div>
                <audio controls src={currentMeeting.audioUrl} className="w-full" />
              </div>
            )}

            {/* Transcript */}
            <div className="bg-echo-surface border-echo-border rounded-[16px] border p-6">
              <TranscriptViewer
                transcript={currentMeeting.transcript}
                transcriptSegments={currentMeeting.transcriptSegments}
                speakerMap={currentMeeting.speakerMap}
                nlpData={currentMeeting.nlpAnalysis}
                onRenameSpeaker={handleRenameSpeaker}
              />
            </div>
          </div>

          {/* Right Column — AI Insights (40%, sticky) */}
          <div className="lg:col-span-2">
            <div className="space-y-4 lg:sticky lg:top-[88px]">
              <SummaryViewer summary={currentMeeting.summary} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditMeetingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        meeting={currentMeeting}
        onSave={handleSaveEdit}
      />

      {/* Speaker Rename Modal */}
      <SpeakerRenameModal
        isOpen={isSpeakerModalOpen}
        onClose={() => setIsSpeakerModalOpen(false)}
        speakerId={selectedSpeaker.id}
        currentName={selectedSpeaker.name}
        onSave={handleSaveSpeaker}
      />
    </div>
  );
};

export default MeetingDetailPage;

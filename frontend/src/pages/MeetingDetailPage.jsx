import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import {
  LuArrowLeft as ArrowLeft,
  LuDownload as Download,
  LuMoreVertical as MoreVertical,
  LuTrash2 as Trash2,
  LuPenLine as Edit3,
  LuCalendar as Calendar,
  LuClock as Clock,
  LuAlertCircle as AlertCircle,
  LuMic as Mic,
  LuCheckCircle as CheckCircle,
  LuRefreshCw as RefreshCw,
  LuExternalLink as ExternalLink,
  LuFileText as FileText,
  LuShare2 as Share2,
  LuSlack as Slack,
  LuLock as Lock,
} from 'react-icons/lu';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';
import { shareMeetingToSlack } from '../services/meeting.service';
import { showToast } from '../components/common/Toast';
import SummaryViewer from '../components/meeting/SummaryViewer';
import TranscriptViewer from '../components/meeting/TranscriptViewer';
import ProcessingLogAccordion from '../components/meeting/ProcessingLogAccordion';
import { CategoryBadge } from '../components/meeting/CategoryFilter';
import { PageLoader } from '../components/common/Loader';
import EditMeetingModal from '../components/meeting/EditMeetingModal';
import SpeakerRenameModal from '../components/meeting/SpeakerRenameModal';
import ShareMeetingModal from '../components/meeting/ShareMeetingModal';
import MeetingSummaryEditor from '../components/meeting/MeetingSummaryEditor';

const PIPELINE_STEPS = [
  { key: 'UPLOADING', label: 'Upload' },
  { key: 'PROCESSING_AUDIO', label: 'Audio Processing' },
  { key: 'TRANSCRIBING', label: 'Transcribing' },
  { key: 'PROCESSING_NLP', label: 'NLP' },
  { key: 'SUMMARIZING', label: 'Summarizing' },
];

const PROCESSING_STATUSES = [
  'UPLOADING',
  'PROCESSING_AUDIO',
  'TRANSCRIBING',
  'PROCESSING_NLP',
  'SUMMARIZING',
];

const MeetingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentMeeting, fetchMeeting, deleteMeeting, updateMeeting, loading } = useMeeting();
  const audioRef = useRef(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState({ id: '', name: '' });
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSendingToSlack, setIsSendingToSlack] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

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
        fetchMeeting(id);
      }
    } catch {
      window.alert('Failed to rename speaker.');
    }
  };

  useEffect(() => {
    if (id) fetchMeeting(id);
  }, [id, fetchMeeting]);

  useEffect(() => {
    if (!currentMeeting || !id) return undefined;
    if (!PROCESSING_STATUSES.includes(currentMeeting.status)) return undefined;
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

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/meetings/${id}/reprocess`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        fetchMeeting(id);
      } else {
        window.alert(data.error || 'Failed to reprocess meeting.');
      }
    } catch {
      window.alert('Network error. Please try again.');
    } finally {
      setIsRetrying(false);
    }
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
    } catch {
      window.alert('Failed to download audio file.');
    }
  };

  const handleSendToSlack = async () => {
    setIsSendingToSlack(true);
    try {
      const result = await shareMeetingToSlack(id);
      if (result.success) {
        showToast('✅ Sent to Slack!', 'success');
      } else {
        showToast(result.error || 'Failed to send to Slack', 'error');
      }
    } catch (err) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSendingToSlack(false);
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
    } catch {
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
          className="btn-cta rounded-btn px-6 py-2.5 text-sm font-bold"
          type="button"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isProcessing = PROCESSING_STATUSES.includes(currentMeeting.status);
  const isFailed = currentMeeting.status === 'FAILED';
  const isCompleted = currentMeeting.status === 'COMPLETED';
  const statusInfo = getStatusInfo(currentMeeting.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      {/* ── Workspace Read-only Banner ── */}
      {currentMeeting.workspaceMeeting && (
        <div className="flex flex-col gap-4 rounded-card border border-accent-primary/20 bg-accent-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary shadow-[0_0_20px_rgba(129,140,248,0.1)]">
              <Lock size={24} />
            </div>
            <div>
              <p className="text-base font-bold text-white">Project Workspace Active</p>
              <p className="text-sm text-slate-400">
                This meeting is managed by{' '}
                <span className="font-semibold text-accent-primary">
                  {currentMeeting.workspaceMeeting.workspace?.name || 'a workspace'}
                </span>
                . Personal editing is locked.
              </p>
            </div>
          </div>
          <Button
            as={Link}
            to={`/workspaces/${currentMeeting.workspaceMeeting.workspaceId}/meeting/${id}`}
            size="md"
            className="rounded-xl bg-accent-primary font-bold text-white shadow-lg shadow-accent-primary/20"
            endContent={<ExternalLink size={18} />}
          >
            Collaborate
          </Button>
        </div>
      )}

      {/* ── Back Link ── */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        type="button"
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
          {/* A1 — Meeting description */}
          {currentMeeting.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              {currentMeeting.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
            >
              <span
                className={`size-1.5 rounded-full ${statusInfo.dot} ${isProcessing ? 'animate-pulse' : ''}`}
              />
              {statusInfo.label}
            </span>
            <CategoryBadge category={currentMeeting.category} />
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Calendar size={12} />
              {formatDate(currentMeeting.createdAt)}
            </span>

            {/* A2 — Word count chip */}
            {currentMeeting.transcriptWordCount > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                <FileText size={12} className="opacity-60" />
                {currentMeeting.transcriptWordCount.toLocaleString()} words
              </span>
            )}

            {/* F4 — Attendee avatar cluster */}
            {(() => {
              const attendees = (() => {
                try {
                  if (!currentMeeting.attendees) return [];
                  return typeof currentMeeting.attendees === 'string'
                    ? JSON.parse(currentMeeting.attendees)
                    : currentMeeting.attendees;
                } catch {
                  return [];
                }
              })();
              if (!attendees.length) return null;
              const visible = attendees.slice(0, 4);
              const overflow = attendees.length - visible.length;
              return (
                <span className="inline-flex items-center -space-x-1.5">
                  {visible.map((a, i) => (
                    <span
                      key={`${a.email || a.id || i}`}
                      title={a.name || a.email || 'Attendee'}
                      className="inline-flex size-5 items-center justify-center rounded-full border border-echo-border bg-echo-surface text-[9px] font-bold text-accent-secondary"
                    >
                      {(a.name || a.email || '?').charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {overflow > 0 && (
                    <span className="inline-flex h-5 items-center rounded-full border border-echo-border bg-accent-primary/10 px-1.5 font-mono text-[9px] text-accent-primary">
                      +{overflow}
                    </span>
                  )}
                </span>
              );
            })()}

            {currentMeeting.audioDuration && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                <Clock size={12} />
                {formatDuration(currentMeeting.audioDuration)}
              </span>
            )}

            {/* F7 — Google Calendar source link */}
            {currentMeeting.googleEventId && (
              <a
                href={`https://calendar.google.com/calendar/r/eventedit/${currentMeeting.googleEventId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-accent-primary"
                title="Open source calendar event"
              >
                <ExternalLink size={11} />
                Calendar Event
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isCompleted && (
            <>
              <button
                onClick={handleShare}
                className={`btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium transition-colors ${currentMeeting.shareToken && currentMeeting.shareEnabled ? 'text-[#22C55E] bg-[#22C55E]/10' : ''}`}
                type="button"
              >
                <Share2 size={14} />
                {currentMeeting.shareToken && currentMeeting.shareEnabled ? 'Shared' : 'Share'}
              </button>
              <button
                onClick={handleSendToSlack}
                disabled={isSendingToSlack}
                className="btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                type="button"
              >
                <Slack size={14} className={isSendingToSlack ? 'animate-pulse' : ''} />
                {isSendingToSlack ? 'Sending...' : 'Send to Slack'}
              </button>
            </>
          )}
          {currentMeeting.audioUrl && (
            <button
              onClick={handleDownloadAudio}
              className="btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium"
              type="button"
            >
              <Download size={14} />
              Download Audio
            </button>
          )}
          <Dropdown>
            <DropdownTrigger>
              <button
                className="flex size-9 items-center justify-center rounded-btn border border-echo-border text-slate-400 transition-all hover:bg-echo-surface-hover hover:text-white"
                type="button"
                aria-label="More actions"
              >
                <MoreVertical size={16} />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Meeting actions"
              className="min-w-[200px]"
              itemClasses={{
                base: 'rounded-full px-4 py-2.5 transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white',
                selected: 'bg-accent-primary/20 text-accent-primary font-bold',
              }}
              classNames={{
                base: 'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] p-2',
              }}
            >
              <DropdownItem
                key="edit"
                startContent={<Edit3 size={14} />}
                onPress={handleEdit}
                isDisabled={!!currentMeeting.workspaceMeeting}
              >
                Edit Meeting {currentMeeting.workspaceMeeting ? '(Managed by Workspace)' : ''}
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
                className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
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
        <div className="rounded-card border border-echo-border bg-echo-surface p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="ai-dot" />
            <p className="text-sm font-medium text-white">Your meeting is being processed…</p>
          </div>

          {/* Pipeline Steps */}
          <div className="mb-4 flex items-center gap-2">
            {PIPELINE_STEPS.map((step, index) => {
              const currentIdx = getCurrentStepIndex();
              const isComplete = index < currentIdx;
              const isActive = index === currentIdx;

              return (
                <div key={step.key} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isComplete
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isActive
                            ? 'animate-ai-glow bg-accent-primary/20 text-accent-primary'
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
                    />
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
        <div className="flex items-start gap-3 rounded-card border border-red-500/10 bg-red-500/5 px-5 py-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Processing Failed</p>
            <p className="mt-0.5 text-xs text-red-400/70">
              {currentMeeting.processingError || 'An error occurred during processing.'}
            </p>
          </div>
          {/* F1 — Retry button */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="btn-cta inline-flex shrink-0 items-center gap-2 rounded-btn px-4 py-2 text-xs font-bold disabled:opacity-50"
            type="button"
          >
            {isRetrying ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <RefreshCw size={13} />
            )}
            {isRetrying ? 'Retrying...' : 'Retry Processing'}
          </button>
        </div>
      )}

      {}
      {isCompleted && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {}
            <div className="space-y-4 lg:col-span-3">
              {}
              {currentMeeting.audioUrl && (
                <div className="rounded-card border border-echo-border bg-echo-surface p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Mic size={14} className="text-accent-primary" />
                    <span className="text-xs font-medium text-slate-400">Audio Recording</span>
                  </div>
                  <audio ref={audioRef} controls src={currentMeeting.audioUrl} className="w-full" />
                </div>
              )}

              {}
              <div className="rounded-card border border-echo-border bg-echo-surface p-6">
                <TranscriptViewer
                  transcript={currentMeeting.transcript}
                  transcriptSegments={currentMeeting.transcriptSegments}
                  speakerMap={currentMeeting.speakerMap}
                  nlpData={currentMeeting.nlpAnalysis}
                  onRenameSpeaker={handleRenameSpeaker}
                  onSeek={handleSeek}
                />
              </div>
            </div>

            {}
            <div className="lg:col-span-2">
              <div className="space-y-4 lg:sticky lg:top-[88px]">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-[16px] bg-[#0c1324] border border-white/[0.06] p-4 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-accent-primary/10 text-accent-primary">
                          <Edit3 size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Live Editor</h4>
                          <p className="text-[11px] text-slate-500 font-medium">Changes are saved automatically</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="rounded-full bg-white/5 hover:bg-white/10 font-bold text-[11px] px-6 text-white border border-white/10"
                        onPress={() => setIsEditing(false)}
                      >
                        CLOSE EDITOR
                      </Button>
                    </div>
                    <MeetingSummaryEditor
                      meetingId={currentMeeting.id}
                      initialData={currentMeeting}
                      canEdit={true}
                    />
                  </div>
                ) : (
                  <SummaryViewer
                    summary={currentMeeting.summary}
                    meetingId={currentMeeting.id}
                    meetingTitle={currentMeeting.title}
                    canEdit={!currentMeeting.workspaceMeeting && currentMeeting.userId === user?.id}
                    onEdit={() => setIsEditing(true)}
                  />
                )}
              </div>
            </div>
          </div>

          {}
          <ProcessingLogAccordion
            meetingId={id}
            processingDuration={currentMeeting.processingDuration}
            processingStartedAt={currentMeeting.processingStartedAt}
            processingCompletedAt={currentMeeting.processingCompletedAt}
          />
        </>
      )}

      {}
      <EditMeetingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        meeting={currentMeeting}
        onSave={handleSaveEdit}
      />

      {}
      <SpeakerRenameModal
        isOpen={isSpeakerModalOpen}
        onClose={() => setIsSpeakerModalOpen(false)}
        speakerId={selectedSpeaker.id}
        currentName={selectedSpeaker.name}
        onSave={handleSaveSpeaker}
      />

      {}
      <ShareMeetingModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        meeting={currentMeeting}
        onShareUpdate={() => fetchMeeting(id)}
      />
    </div>
  );
};

export default MeetingDetailPage;

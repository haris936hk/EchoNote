import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Chip } from '@heroui/react';
import PropTypes from 'prop-types';
import {
  LuClock as Clock,
  LuMoreVertical as MoreVertical,
  LuEye as Eye,
  LuTrash2 as Trash2,
  LuDownload as Download,
  LuPenLine as Edit3,
  LuCalendar as Calendar,
  LuLayout,
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { CategoryBadge } from './CategoryFilter';
import { categoryColors, statusColors } from '../../styles/theme';

const ActionsDropdown = ({ isCompleted, handleView, handleEdit, handleDelete, audioUrl }) => (
  <Dropdown placement="bottom-end">
    <DropdownTrigger>
      <button
        className="flex size-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-all hover:bg-echo-surface-hover hover:text-white group-hover:opacity-100"
        aria-label="Meeting actions"
      >
        <MoreVertical size={14} />
      </button>
    </DropdownTrigger>
    <DropdownMenu
      aria-label="Meeting actions"
      className="border border-echo-border bg-echo-elevated"
    >
      {isCompleted && (
        <DropdownItem key="view" startContent={<Eye size={14} />} onPress={handleView}>
          View Details
        </DropdownItem>
      )}
      <DropdownItem key="edit" startContent={<Edit3 size={14} />} onPress={handleEdit}>
        Edit
      </DropdownItem>
      {isCompleted && audioUrl && (
        <DropdownItem
          key="download"
          startContent={<Download size={14} />}
          onPress={() => window.open(audioUrl, '_blank')}
        >
          Download Audio
        </DropdownItem>
      )}
      <DropdownItem
        key="delete"
        className="text-red-400"
        startContent={<Trash2 size={14} />}
        onPress={handleDelete}
      >
        Delete
      </DropdownItem>
    </DropdownMenu>
  </Dropdown>
);

ActionsDropdown.propTypes = {
  isCompleted: PropTypes.bool.isRequired,
  handleView: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  audioUrl: PropTypes.string,
};

const MeetingCard = ({ meeting, onDelete, onEdit }) => {
  const navigate = useNavigate();

  const handleView = () => navigate(`/meeting/${meeting.id}`);
  const handleDelete = () => onDelete?.(meeting.id);
  const handleEdit = () => onEdit?.(meeting);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (isCompleted) {
        handleView();
      }
    }
  };

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));

  const formatTime = (dateString) =>
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateString));

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processingStatuses = [
    'UPLOADING',
    'PROCESSING_AUDIO',
    'TRANSCRIBING',
    'PROCESSING_NLP',
    'SUMMARIZING',
  ];
  const isCompleted = meeting.status === 'COMPLETED';
  const isProcessing = processingStatuses.includes(meeting.status);
  const isFailed = meeting.status === 'FAILED';

  const catColors = categoryColors[meeting.category] || categoryColors.OTHER;
  const statColors = statusColors[meeting.status] || statusColors.COMPLETED;

  const topics = meeting.summary?.keyTopics?.slice(0, 3) || [];

  return (
    <div
      role="button"
      tabIndex={isCompleted ? 0 : -1}
      onKeyDown={handleKeyDown}
      className={`card-hover group relative overflow-hidden rounded-card border border-echo-border bg-echo-surface ${
        isCompleted ? 'cursor-pointer' : ''
      }`}
      onClick={isCompleted ? handleView : undefined}
    >
      {/* Colored left border accent */}
      <div
        className={`absolute inset-y-0 left-0 w-[3px] ${catColors.border.replace('border-l-', 'bg-')}`}
      ></div>

      <div className="space-y-3 p-5 pl-6">
        {/* Top row: Category chip + Status dot + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CategoryBadge category={meeting.category} />
            {meeting.workspaceMeeting && (
              <Chip
                size="sm"
                variant="flat"
                startContent={<LuLayout size={10} />}
                className="h-5 border border-accent-primary/20 bg-accent-primary/10 text-[9px] text-accent-primary"
              >
                {meeting.workspaceMeeting.workspace?.name || 'Workspace'}
              </Chip>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${statColors.text}`}
            >
              <span
                className={`size-1.5 rounded-full ${statColors.dot} ${isProcessing ? 'animate-pulse' : ''}`}
              ></span>
              {statColors.label}
            </span>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <ActionsDropdown
              isCompleted={isCompleted}
              handleView={handleView}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              audioUrl={meeting.audioUrl}
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="truncate-2 text-sm font-semibold leading-snug text-white transition-colors group-hover:text-accent-primary">
          {meeting.title}
        </h3>

        {/* Description */}
        {meeting.description && (
          <p className="truncate-2 text-xs leading-relaxed text-slate-500">{meeting.description}</p>
        )}

        {/* Date & Duration */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar size={10} className="opacity-60" />
            {formatDate(meeting.createdAt)}
          </span>
          <span className="text-slate-700">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={10} className="opacity-60" />
            {formatTime(meeting.createdAt)}
          </span>
          {meeting.duration && (
            <>
              <span className="text-slate-700">·</span>
              <span>{formatDuration(meeting.duration)}</span>
            </>
          )}
        </div>

        {/* Topic chips */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2">
            <div className="ai-dot"></div>
            <span className="text-[11px] font-medium text-amber-400/80">
              Processing your meeting...
            </span>
          </div>
        )}

        {/* Failed indicator */}
        {isFailed && (
          <div className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2">
            <span className="text-[11px] text-red-400/80">
              Processing failed. Try uploading again.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

MeetingCard.propTypes = {
  meeting: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    duration: PropTypes.number,
    audioUrl: PropTypes.string,
    summary: PropTypes.shape({
      keyTopics: PropTypes.arrayOf(PropTypes.string),
    }),
  }).isRequired,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
};

export default MeetingCard;

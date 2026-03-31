import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { LuClock as Clock, LuMoreVertical as MoreVertical, LuEye as Eye, LuTrash2 as Trash2, LuDownload as Download, LuPenLine as Edit3, LuCalendar as Calendar } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { CategoryBadge } from './CategoryFilter';
import { categoryColors, statusColors } from '../../styles/theme';

const MeetingCard = ({ meeting, onDelete, onEdit, viewMode = 'grid' }) => {
  const navigate = useNavigate();

  const handleView = () => navigate(`/meeting/${meeting.id}`);
  const handleDelete = () => onDelete?.(meeting.id);
  const handleEdit = () => onEdit?.(meeting);

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

  // Get category color for left border
  const catColors = categoryColors[meeting.category] || categoryColors.OTHER;
  const statColors = statusColors[meeting.status] || statusColors.COMPLETED;

  // Get topic chips from summary
  const topics = meeting.summary?.keyTopics?.slice(0, 3) || [];

  const ActionsDropdown = () => (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button
          className="hover:bg-echo-surface-hover flex size-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-all hover:text-white group-hover:opacity-100"
          aria-label="Meeting actions"
        >
          <MoreVertical size={14} />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Meeting actions"
        className="bg-echo-elevated border-echo-border border"
      >
        {isCompleted && (
          <DropdownItem key="view" startContent={<Eye size={14} />} onPress={handleView}>
            View Details
          </DropdownItem>
        )}
        <DropdownItem key="edit" startContent={<Edit3 size={14} />} onPress={handleEdit}>
          Edit
        </DropdownItem>
        {isCompleted && meeting.audioUrl && (
          <DropdownItem
            key="download"
            startContent={<Download size={14} />}
            onPress={() => window.open(meeting.audioUrl, '_blank')}
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

  return (
    <div
      className={`bg-echo-surface border-echo-border card-hover group relative overflow-hidden rounded-[16px] border ${
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
            <CategoryBadge category={meeting.category} size="sm" />
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${statColors.text}`}
            >
              <span
                className={`size-1.5 rounded-full ${statColors.dot} ${isProcessing ? 'animate-pulse' : ''}`}
              ></span>
              {statColors.label}
            </span>
          </div>
          <ActionsDropdown />
        </div>

        {/* Title */}
        <h3 className="truncate-2 group-hover:text-accent-primary text-sm font-semibold leading-snug text-white transition-colors">
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
            {topics.map((topic, i) => (
              <span
                key={i}
                className="bg-accent-primary/10 text-accent-primary rounded-full px-2 py-0.5 text-[10px] font-medium"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 rounded-[8px] border border-amber-500/10 bg-amber-500/5 px-3 py-2">
            <div className="ai-dot"></div>
            <span className="text-[11px] font-medium text-amber-400/80">
              Processing your meeting...
            </span>
          </div>
        )}

        {/* Failed indicator */}
        {isFailed && (
          <div className="rounded-[8px] border border-red-500/10 bg-red-500/5 px-3 py-2">
            <span className="text-[11px] text-red-400/80">
              Processing failed. Try uploading again.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingCard;

import {
  Card,
  CardBody,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react';
import {
  FiClock,
  FiMoreVertical,
  FiEye,
  FiTrash2,
  FiDownload,
  FiEdit,
  FiCalendar,
  FiPlay,
  FiArrowRight
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { CategoryBadge } from './CategoryFilter';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    color: 'warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    textColor: 'text-warning'
  },
  PROCESSING: {
    label: 'Processing',
    color: 'primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    textColor: 'text-primary'
  },
  COMPLETED: {
    label: 'Completed',
    color: 'success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
    textColor: 'text-success'
  },
  FAILED: {
    label: 'Failed',
    color: 'danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger/20',
    textColor: 'text-danger'
  },
};

const MeetingCard = ({ meeting, onDelete, onEdit, viewMode = 'grid' }) => {
  const navigate = useNavigate();
  const isListView = viewMode === 'list';

  const handleView = () => {
    navigate(`/meeting/${meeting.id}`);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(meeting.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(meeting);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusConfig = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.PENDING;
  const isCompleted = meeting.status === 'COMPLETED';
  const isProcessing = meeting.status === 'PROCESSING';
  const isFailed = meeting.status === 'FAILED';

  return (
    <Card
      className={`
        group relative overflow-hidden
        bg-content1/50 backdrop-blur-sm
        border border-divider/50
        hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
        transition-all duration-300 ease-out
        rounded-2xl
        ${isCompleted ? 'cursor-pointer' : ''}
        ${isListView ? 'w-full' : ''}
      `}
      isPressable={isCompleted}
      onPress={isCompleted ? handleView : undefined}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-secondary/0 group-hover:from-primary/5 group-hover:to-secondary/5 transition-all duration-500 pointer-events-none" />

      <CardBody className={`relative ${isListView ? 'p-4 flex flex-row items-center gap-4' : 'p-5 gap-4'}`}>
        {isListView ? (
          /* ============ LIST VIEW LAYOUT ============ */
          <>
            {/* Left: Badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <CategoryBadge category={meeting.category} size="sm" />
              <Chip
                size="sm"
                variant="flat"
                classNames={{
                  base: `${statusConfig.bgColor} ${statusConfig.borderColor} border px-2.5`,
                  content: `${statusConfig.textColor} text-xs font-medium`
                }}
              >
                {statusConfig.label}
              </Chip>
              {meeting.duration && (
                <div className="flex items-center gap-1 text-xs text-default-400">
                  <FiPlay size={10} className="opacity-60" />
                  <span>{formatDuration(meeting.duration)}</span>
                </div>
              )}
            </div>

            {/* Center: Title */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground leading-snug truncate group-hover:text-primary transition-colors duration-200">
                {meeting.title}
              </h3>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 text-xs text-default-400 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <FiCalendar size={12} className="opacity-60" />
                <span>{formatDate(meeting.createdAt)}</span>
              </div>
              <span className="opacity-30">•</span>
              <div className="flex items-center gap-1.5">
                <FiClock size={12} className="opacity-60" />
                <span>{formatTime(meeting.createdAt)}</span>
              </div>
            </div>

            {/* Right: Button + Menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isCompleted && (
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="h-8 px-4 font-medium rounded-xl group/btn hover:bg-primary hover:text-white transition-all duration-200"
                  endContent={
                    <FiArrowRight
                      size={14}
                      className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200"
                    />
                  }
                  onPress={handleView}
                >
                  View Summary
                </Button>
              )}
              <Dropdown
                placement="bottom-end"
                classNames={{
                  content: "bg-content1/95 backdrop-blur-xl border border-divider/50 shadow-xl shadow-black/20 rounded-xl min-w-[180px] p-1.5"
                }}
              >
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="min-w-unit-7 w-7 h-7"
                    aria-label="Meeting actions"
                  >
                    <FiMoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Meeting actions"
                  itemClasses={{
                    base: "rounded-lg px-3 py-2.5 gap-3 data-[hover=true]:bg-default-100 transition-colors",
                    title: "font-medium text-sm",
                  }}
                >
                  {isCompleted && (
                    <DropdownItem
                      key="view"
                      startContent={<FiEye size={16} className="text-primary" />}
                      onPress={handleView}
                    >
                      View Details
                    </DropdownItem>
                  )}
                  <DropdownItem
                    key="edit"
                    startContent={<FiEdit size={16} className="text-default-500" />}
                    onPress={handleEdit}
                  >
                    Edit
                  </DropdownItem>
                  {isCompleted && meeting.audioUrl && (
                    <DropdownItem
                      key="download"
                      startContent={<FiDownload size={16} className="text-secondary" />}
                      onPress={() => window.open(meeting.audioUrl, '_blank')}
                    >
                      Download Audio
                    </DropdownItem>
                  )}
                  <DropdownItem
                    key="delete"
                    color="danger"
                    className="text-danger"
                    startContent={<FiTrash2 size={16} />}
                    onPress={handleDelete}
                  >
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </>
        ) : (
          /* ============ GRID VIEW LAYOUT ============ */
          <>
            {/* Top Row: Category, Status, Duration, Actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={meeting.category} size="sm" />
                <Chip
                  size="sm"
                  variant="flat"
                  classNames={{
                    base: `${statusConfig.bgColor} ${statusConfig.borderColor} border px-2.5`,
                    content: `${statusConfig.textColor} text-xs font-medium`
                  }}
                >
                  {statusConfig.label}
                </Chip>
                {meeting.duration && (
                  <div className="flex items-center gap-1 text-xs text-default-400">
                    <FiPlay size={10} className="opacity-60" />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>
                )}
              </div>

              <Dropdown
                placement="bottom-end"
                classNames={{
                  content: "bg-content1/95 backdrop-blur-xl border border-divider/50 shadow-xl shadow-black/20 rounded-xl min-w-[180px] p-1.5"
                }}
              >
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 min-w-unit-7 w-7 h-7"
                    aria-label="Meeting actions"
                  >
                    <FiMoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Meeting actions"
                  itemClasses={{
                    base: "rounded-lg px-3 py-2.5 gap-3 data-[hover=true]:bg-default-100 transition-colors",
                    title: "font-medium text-sm",
                  }}
                >
                  {isCompleted && (
                    <DropdownItem
                      key="view"
                      startContent={<FiEye size={16} className="text-primary" />}
                      onPress={handleView}
                    >
                      View Details
                    </DropdownItem>
                  )}
                  <DropdownItem
                    key="edit"
                    startContent={<FiEdit size={16} className="text-default-500" />}
                    onPress={handleEdit}
                  >
                    Edit
                  </DropdownItem>
                  {isCompleted && meeting.audioUrl && (
                    <DropdownItem
                      key="download"
                      startContent={<FiDownload size={16} className="text-secondary" />}
                      onPress={() => window.open(meeting.audioUrl, '_blank')}
                    >
                      Download Audio
                    </DropdownItem>
                  )}
                  <DropdownItem
                    key="delete"
                    color="danger"
                    className="text-danger"
                    startContent={<FiTrash2 size={16} />}
                    onPress={handleDelete}
                  >
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors duration-200">
                {meeting.title}
              </h3>
              {meeting.description && (
                <p className="text-sm text-default-400 line-clamp-2 leading-relaxed">
                  {meeting.description}
                </p>
              )}
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-3 text-xs text-default-400">
              <div className="flex items-center gap-1.5">
                <FiCalendar size={12} className="opacity-60" />
                <span>{formatDate(meeting.createdAt)}</span>
              </div>
              <span className="opacity-30">•</span>
              <div className="flex items-center gap-1.5">
                <FiClock size={12} className="opacity-60" />
                <span>{formatTime(meeting.createdAt)}</span>
              </div>
            </div>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-primary/5 border border-primary/10 rounded-xl">
                <div className="relative flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <div className="absolute w-4 h-4 bg-primary/20 rounded-full animate-ping" />
                </div>
                <span className="text-xs text-primary/80 font-medium">
                  Processing your meeting...
                </span>
              </div>
            )}

            {/* Failed indicator */}
            {isFailed && (
              <div className="px-3 py-2.5 bg-danger/5 border border-danger/10 rounded-xl">
                <span className="text-xs text-danger/80">
                  Processing failed. Please try uploading again.
                </span>
              </div>
            )}

            {/* View Summary Button */}
            {isCompleted && (
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="w-full h-9 font-medium rounded-xl group/btn hover:bg-primary hover:text-white transition-all duration-200"
                  endContent={
                    <FiArrowRight
                      size={14}
                      className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200"
                    />
                  }
                  onPress={handleView}
                >
                  View Summary
                </Button>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default MeetingCard;
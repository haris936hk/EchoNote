import { 
  Card, 
  CardBody, 
  CardFooter,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@nextui-org/react';
import { 
  FiClock, 
  FiMoreVertical, 
  FiEye, 
  FiTrash2,
  FiDownload,
  FiEdit 
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { CategoryBadge } from './CategoryFilter';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'warning', variant: 'flat' },
  PROCESSING: { label: 'Processing', color: 'primary', variant: 'flat' },
  COMPLETED: { label: 'Completed', color: 'success', variant: 'flat' },
  FAILED: { label: 'Failed', color: 'danger', variant: 'flat' },
};

const MeetingCard = ({ meeting, onDelete, onEdit }) => {
  const navigate = useNavigate();

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusConfig = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.PENDING;

  return (
    <Card 
      className="w-full hover:shadow-md transition-shadow"
      isPressable={meeting.status === 'COMPLETED'}
      onPress={meeting.status === 'COMPLETED' ? handleView : undefined}
    >
      <CardBody className="gap-3">
        {/* Header: Title and Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {meeting.title}
            </h3>
            {meeting.description && (
              <p className="text-sm text-default-500 line-clamp-2 mt-1">
                {meeting.description}
              </p>
            )}
          </div>

          {/* Actions Dropdown */}
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                aria-label="Meeting actions"
              >
                <FiMoreVertical size={18} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Meeting actions">
              {meeting.status === 'COMPLETED' && (
                <DropdownItem
                  key="view"
                  startContent={<FiEye size={16} />}
                  onPress={handleView}
                >
                  View Details
                </DropdownItem>
              )}
              
              <DropdownItem
                key="edit"
                startContent={<FiEdit size={16} />}
                onPress={handleEdit}
              >
                Edit
              </DropdownItem>

              {meeting.status === 'COMPLETED' && meeting.audioUrl && (
                <DropdownItem
                  key="download"
                  startContent={<FiDownload size={16} />}
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

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={meeting.category} size="sm" />
          
          <Chip
            color={statusConfig.color}
            variant={statusConfig.variant}
            size="sm"
          >
            {statusConfig.label}
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

        {/* Date */}
        <div className="flex items-center text-xs text-default-400">
          <FiClock size={12} className="mr-1" />
          {formatDate(meeting.createdAt)}
        </div>

        {/* Processing indicator */}
        {meeting.status === 'PROCESSING' && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs text-primary">
              Processing your meeting...
            </span>
          </div>
        )}

        {/* Failed indicator */}
        {meeting.status === 'FAILED' && (
          <div className="p-2 bg-danger/10 rounded-lg">
            <span className="text-xs text-danger">
              Processing failed. Please try uploading again.
            </span>
          </div>
        )}
      </CardBody>

      {/* Footer: Quick Actions (only for completed meetings) */}
      {meeting.status === 'COMPLETED' && (
        <CardFooter className="border-t border-divider">
          <Button
            size="sm"
            color="primary"
            variant="flat"
            onPress={handleView}
            fullWidth
          >
            View Summary
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MeetingCard;
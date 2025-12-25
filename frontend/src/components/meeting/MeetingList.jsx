import { useState } from 'react';
import { Button, Pagination } from '@heroui/react';
import { FiGrid, FiList } from 'react-icons/fi';
import MeetingCard from './MeetingCard';
import { SkeletonLoader } from '../common/Loader';

const MeetingList = ({
  meetings = [],
  loading = false,
  onDelete,
  onEdit,
  itemsPerPage = 12
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Calculate pagination
  const totalPages = Math.ceil(meetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMeetings = meetings.slice(startIndex, endIndex);

  // Reset to page 1 when meetings change
  useState(() => {
    setCurrentPage(1);
  }, [meetings.length]);

  if (loading) {
    return (
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-4'
      }>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 bg-default-100 rounded-full flex items-center justify-center mb-6">
          <FiList size={40} className="text-default-300" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No meetings found</h3>
        <p className="text-default-500 text-center max-w-md">
          Start by recording your first meeting or adjust your filters to see more results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-default-500">
          Showing {startIndex + 1}-{Math.min(endIndex, meetings.length)} of {meetings.length} meeting(s)
        </p>

        <div className="flex gap-1 border border-divider rounded-lg p-1">
          <Button
            size="sm"
            isIconOnly
            variant={viewMode === 'grid' ? 'solid' : 'light'}
            color={viewMode === 'grid' ? 'primary' : 'default'}
            onPress={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <FiGrid size={16} />
          </Button>
          <Button
            size="sm"
            isIconOnly
            variant={viewMode === 'list' ? 'solid' : 'light'}
            color={viewMode === 'list' ? 'primary' : 'default'}
            onPress={() => setViewMode('list')}
            aria-label="List view"
          >
            <FiList size={16} />
          </Button>
        </div>
      </div>

      {/* Meeting Cards */}
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
          : 'space-y-4'
      }>
        {currentMeetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={setCurrentPage}
            showControls
            color="primary"
            size="lg"
          />
        </div>
      )}
    </div>
  );
};

// Compact version without view toggle
export const CompactMeetingList = ({ meetings, loading, onDelete }) => {
  if (loading) {
    return <SkeletonLoader count={3} />;
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-default-500">No meetings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default MeetingList;
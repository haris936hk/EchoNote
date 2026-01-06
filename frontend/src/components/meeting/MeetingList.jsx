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

        <div className="flex gap-1 bg-content2/50 backdrop-blur-sm border border-divider/50 rounded-xl p-1 shadow-sm">
          <Button
            size="sm"
            isIconOnly
            variant="light"
            className={`
              rounded-lg transition-all duration-200
              ${viewMode === 'grid'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'text-default-500 hover:text-foreground hover:bg-default-100'
              }
            `}
            onPress={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <FiGrid size={16} />
          </Button>
          <Button
            size="sm"
            isIconOnly
            variant="light"
            className={`
              rounded-lg transition-all duration-200
              ${viewMode === 'list'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'text-default-500 hover:text-foreground hover:bg-default-100'
              }
            `}
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
          : 'flex flex-col gap-4'
      }>
        {currentMeetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onDelete={onDelete}
            onEdit={onEdit}
            viewMode={viewMode}
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
            radius="full"
            classNames={{
              wrapper: "gap-2 bg-content1/50 backdrop-blur-sm border-2 border-divider/50 rounded-full p-2 shadow-lg",
              item: "rounded-full min-w-10 h-10 bg-transparent border-0 hover:bg-primary/10 transition-all duration-300",
              cursor: "rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/50 font-semibold",
              prev: "rounded-full bg-transparent hover:bg-primary/10 transition-all duration-300",
              next: "rounded-full bg-transparent hover:bg-primary/10 transition-all duration-300"
            }}
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
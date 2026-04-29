import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Pagination } from '@heroui/react';
import { LuLayoutGrid as LayoutGrid, LuList as List } from 'react-icons/lu';
import MeetingCard from './MeetingCard';
import { SkeletonLoader } from '../common/Loader';

const MeetingList = ({ meetings = [], loading = false, onDelete, onEdit, itemsPerPage = 12 }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');

  const totalPages = Math.ceil(meetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMeetings = meetings.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [meetings.length]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-echo-surface">
          <List size={32} className="text-slate-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">No meetings found</h3>
        <p className="max-w-sm text-center text-sm text-slate-400">
          Record your first meeting or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-slate-500">
          {startIndex + 1}–{Math.min(endIndex, meetings.length)} of {meetings.length}
        </p>
        <div className="flex gap-1 rounded-btn border border-echo-border bg-echo-surface p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex size-8 items-center justify-center rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-accent-primary text-white'
                : 'text-slate-500 hover:text-white'
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex size-8 items-center justify-center rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-accent-primary text-white'
                : 'text-slate-500 hover:text-white'
            }`}
            aria-label="List view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col gap-3'
        }
      >
        {currentMeetings.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </div>

      {}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={setCurrentPage}
            showControls
            color="primary"
            size="md"
            radius="full"
            classNames={{
              wrapper: 'gap-1 bg-echo-surface border border-echo-border rounded-full p-1.5',
              item: 'rounded-full min-w-8 h-8 bg-transparent text-slate-400 hover:bg-echo-surface-hover',
              cursor:
                'rounded-full bg-accent-primary text-white shadow-lg shadow-accent-primary/30 font-semibold',
              prev: 'rounded-full text-slate-400 hover:bg-echo-surface-hover',
              next: 'rounded-full text-slate-400 hover:bg-echo-surface-hover',
            }}
          />
        </div>
      )}
    </div>
  );
};

MeetingList.propTypes = {
  meetings: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  itemsPerPage: PropTypes.number,
};

export default MeetingList;

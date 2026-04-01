import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import {
  LuPlus as Plus,
  LuDownload as Download,
  LuTrash2 as Trash2,
  LuArrowUp as ArrowUp,
} from 'react-icons/lu';
import { useMeeting } from '../contexts/MeetingContext';
import MeetingList from '../components/meeting/MeetingList';
import CategoryFilter from '../components/meeting/CategoryFilter';
import SearchBar from '../components/meeting/SearchBar';
import { PageLoader } from '../components/common/Loader';
import useDebounce from '../hooks/useDebounce';
import EditMeetingModal from '../components/meeting/EditMeetingModal';
import { showToast } from '../components/common/Toast';

const MeetingsPage = () => {
  const navigate = useNavigate();
  const { meetings, fetchMeetings, deleteMeeting, updateMeeting, loading } = useMeeting();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Filter meetings
  useEffect(() => {
    let result = meetings;
    if (statusFilter !== 'ALL') {
      const processingStatuses = [
        'UPLOADING',
        'PROCESSING_AUDIO',
        'TRANSCRIBING',
        'PROCESSING_NLP',
        'SUMMARIZING',
      ];
      if (statusFilter === 'PROCESSING') {
        result = result.filter((m) => processingStatuses.includes(m.status));
      } else {
        result = result.filter((m) => m.status === statusFilter);
      }
    }
    if (selectedCategory !== 'ALL') {
      result = result.filter((m) => m.category === selectedCategory);
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter((m) => {
        if (m.title.toLowerCase().includes(query)) return true;
        if (m.description?.toLowerCase().includes(query)) return true;
        if (typeof m.transcript === 'string' && m.transcript.toLowerCase().includes(query))
          return true;
        if (m.summary && typeof m.summary === 'object') {
          const summaryText = [
            m.summary.executiveSummary,
            m.summary.keyDecisions,
            m.summary.nextSteps,
            ...(m.summary.keyTopics || []),
            ...(m.summary.actionItems || []).map((item) => item.task),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (summaryText.includes(query)) return true;
        }
        return false;
      });
    }
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredMeetings(result);
  }, [meetings, statusFilter, selectedCategory, debouncedSearch]);

  // Status counts
  const processingStatuses = [
    'UPLOADING',
    'PROCESSING_AUDIO',
    'TRANSCRIBING',
    'PROCESSING_NLP',
    'SUMMARIZING',
  ];
  const statusCounts = {
    ALL: meetings.length,
    PROCESSING: meetings.filter((m) => processingStatuses.includes(m.status)).length,
    COMPLETED: meetings.filter((m) => m.status === 'COMPLETED').length,
    FAILED: meetings.filter((m) => m.status === 'FAILED').length,
  };

  const categoryCounts = meetings.reduce((acc, meeting) => {
    acc[meeting.category] = (acc[meeting.category] || 0) + 1;
    return acc;
  }, {});

  const handleDelete = async (id) => {
    if (
      window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')
    ) {
      await deleteMeeting(id);
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updates) => {
    const result = await updateMeeting(editingMeeting.id, updates);
    if (result.success) fetchMeetings();
  };

  const handleBulkDelete = async () => {
    if (selectedMeetings.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedMeetings.length} meeting(s)?`)) {
      for (const id of selectedMeetings) await deleteMeeting(id);
      setSelectedMeetings([]);
    }
  };

  const handleExportAll = async () => {
    const completedCount = meetings.filter((m) => m.status === 'COMPLETED').length;
    if (completedCount === 0) {
      showToast('No completed meetings to export', 'error');
      return;
    }
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/meetings/export`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to export meetings');
      }
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `EchoNote_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${completedCount} meeting(s) successfully!`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to export meetings', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
  };

  const hasActiveFilters = statusFilter !== 'ALL' || selectedCategory !== 'ALL' || searchQuery;

  if (loading && meetings.length === 0) {
    return <PageLoader label="Loading your meetings..." />;
  }

  const statusTabs = [
    { key: 'ALL', label: 'All', count: statusCounts.ALL },
    { key: 'COMPLETED', label: 'Completed', count: statusCounts.COMPLETED },
    { key: 'PROCESSING', label: 'Processing', count: statusCounts.PROCESSING },
    { key: 'FAILED', label: 'Failed', count: statusCounts.FAILED },
  ];

  return (
    <div className="space-y-6 py-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Meetings</h1>
          <span className="font-mono text-sm text-slate-500">({meetings.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium"
          >
            {isExporting ? <Spinner size="sm" /> : <Download size={14} />}
            {isExporting ? 'Exporting...' : 'Export All'}
          </button>
          <button
            onClick={() => navigate('/record')}
            className="btn-cta inline-flex items-center gap-2 rounded-btn px-5 py-2 text-sm font-bold transition-all hover:brightness-110"
          >
            <Plus size={16} />
            New Recording
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="space-y-4">
        {/* Search */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search meetings..." />

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-btn px-4 py-2 text-sm font-medium transition-all ${
                statusFilter === tab.key
                  ? 'bg-accent-primary text-white'
                  : 'text-slate-400 hover:bg-echo-surface-hover hover:text-white'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 font-mono text-xs ${
                  statusFilter === tab.key ? 'text-white/70' : 'text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}

          {/* Category filter + clear */}
          <div className="ml-auto flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-accent-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          showCount={true}
          counts={categoryCounts}
        />
      </div>

      {/* ── Meeting Cards ── */}
      <MeetingList
        meetings={filteredMeetings}
        loading={loading}
        onDelete={handleDelete}
        onEdit={handleEdit}
        itemsPerPage={12}
      />

      {/* ── Bulk Actions Bar ── */}
      {selectedMeetings.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-echo-border bg-echo-surface px-6 py-3 shadow-2xl backdrop-blur-xl">
          <span className="text-sm font-medium text-white">{selectedMeetings.length} selected</span>
          <button
            onClick={() => setSelectedMeetings([])}
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 rounded-btn bg-red-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
        </div>
      )}

      {/* Scroll to Top */}
      {showScrollTop && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            isIconOnly
            className="size-12 rounded-full bg-accent-primary text-white shadow-lg shadow-accent-primary/30 transition-all hover:shadow-xl hover:shadow-accent-primary/40"
            onPress={scrollToTop}
          >
            <ArrowUp size={20} />
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      <EditMeetingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMeeting(null);
        }}
        meeting={editingMeeting}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default MeetingsPage;

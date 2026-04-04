import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import {
  LuMic as Mic,
  LuClock as Clock,
  LuCheckCircle as CheckCircle,
  LuAlertCircle as AlertCircle,
  LuTrendingUp as TrendingUp,
  LuPlus as Plus,
  LuArrowUp as ArrowUp,
  LuSettings as Settings,
  LuList as List,
  LuCalendar as CalendarIcon,
} from 'react-icons/lu';
import { useMeeting } from '../contexts/MeetingContext';
import { useAuth } from '../contexts/AuthContext';

import MeetingList from '../components/meeting/MeetingList';
import CategoryFilter from '../components/meeting/CategoryFilter';
import SearchBar from '../components/meeting/SearchBar';
import { PageLoader } from '../components/common/Loader';
import EditMeetingModal from '../components/meeting/EditMeetingModal';
import useDebounce from '../hooks/useDebounce';
import { showToast } from '../components/common/Toast';
import CalendarSidebar from '../components/dashboard/CalendarSidebar';

const PROCESSING_STATUSES = [
  'UPLOADING',
  'PROCESSING_AUDIO',
  'TRANSCRIBING',
  'PROCESSING_NLP',
  'SUMMARIZING',
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { meetings, fetchMeetings, deleteMeeting, updateMeeting, loading } = useMeeting();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Auto-refresh: Poll only while there are processing meetings
  const processingIdsRef = useRef(new Set());

  // Detect when meetings complete and show toast
  useEffect(() => {
    const currentlyProcessing = meetings.filter((m) => PROCESSING_STATUSES.includes(m.status));
    const currentIds = new Set(currentlyProcessing.map((m) => m.id));
    const prevIds = processingIdsRef.current;

    if (prevIds.size > 0) {
      const completedIds = [...prevIds].filter((id) => !currentIds.has(id));
      completedIds.forEach((id) => {
        const meeting = meetings.find((m) => m.id === id);
        if (meeting) {
          if (meeting.status === 'COMPLETED') {
            showToast(`"${meeting.title}" is ready!`, 'success', 6000);
          } else if (meeting.status === 'FAILED') {
            showToast(`"${meeting.title}" failed to process`, 'error', 8000);
          }
        }
      });
    }

    processingIdsRef.current = currentIds;
  }, [meetings]);

  // Polling effect
  useEffect(() => {
    const hasProcessingMeetings = meetings.some((m) => PROCESSING_STATUSES.includes(m.status));

    if (hasProcessingMeetings) {
      const interval = setInterval(() => {
        fetchMeetings();
      }, 20000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [meetings, fetchMeetings]);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter meetings
  useEffect(() => {
    let result = meetings;
    if (selectedCategory !== 'ALL') {
      result = result.filter((m) => m.category === selectedCategory);
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (m) => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query)
      );
    }
    setFilteredMeetings(result);
  }, [meetings, selectedCategory, debouncedSearch]);

  // Statistics
  const stats = {
    total: meetings.length,
    completed: meetings.filter((m) => m.status === 'COMPLETED').length,
    processing: meetings.filter((m) => PROCESSING_STATUSES.includes(m.status)).length,
    failed: meetings.filter((m) => m.status === 'FAILED').length,
    totalDuration: meetings.reduce((sum, m) => sum + (m.duration || 0), 0),
  };

  const categoryCounts = meetings.reduce((acc, meeting) => {
    acc[meeting.category] = (acc[meeting.category] || 0) + 1;
    return acc;
  }, {});

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this meeting? This action cannot be undone.'
    );
    if (confirmed) {
      await deleteMeeting(id);
    }
  };

  const handleEdit = (meeting) => {
    setSelectedMeeting(meeting);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updates) => {
    if (!selectedMeeting) return;
    const result = await updateMeeting(selectedMeeting.id, updates);
    if (result.success) {
      setIsEditModalOpen(false);
      setSelectedMeeting(null);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedMeeting(null);
  };

  const handleNewRecording = () => {
    navigate('/record');
  };

  if (loading && meetings.length === 0) {
    return <PageLoader label="Loading your meetings..." />;
  }

  // Format duration
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  };

  return (
    <div className="space-y-6 py-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="btn-secondary inline-flex items-center justify-center rounded-btn p-2.5 text-slate-400 transition-all hover:bg-echo-surface hover:text-white lg:hidden"
            type="button"
            aria-label="Toggle calendar sidebar"
          >
            <CalendarIcon size={20} />
          </button>
          <button
            onClick={handleNewRecording}
            className="btn-cta inline-flex w-fit items-center gap-2 rounded-btn px-5 py-2.5 text-sm font-bold transition-all hover:brightness-110"
            type="button"
          >
            <Mic size={16} />
            <span className="hidden sm:inline">New Recording</span>
          </button>
        </div>
      </div>

      {/* ── Empty State ── */}
      {meetings.length === 0 && !loading && (
        <div className="rounded-card border border-echo-border bg-echo-surface p-16 text-center">
          <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-accent-primary/10">
            <Mic size={40} className="text-accent-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-white">No meetings yet</h2>
          <p className="mx-auto mb-8 max-w-md text-slate-400">
            Record your first meeting and let AI handle the rest.
          </p>
          <button
            onClick={handleNewRecording}
            className="btn-cta inline-flex items-center gap-2 rounded-btn px-6 py-3 text-sm font-bold transition-all hover:brightness-110"
            type="button"
          >
            <Plus size={16} />
            Record Your First Meeting
          </button>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span>10 min recordings</span>
            <span className="text-slate-700">·</span>
            <span>AI summaries</span>
            <span className="text-slate-700">·</span>
            <span>Email alerts</span>
          </div>
        </div>
      )}

      {/* ── Stats Strip ── */}
      {meetings.length > 0 && (
        <div className="rounded-card border border-echo-border bg-echo-surface p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent-primary/10">
                <Mic size={18} className="text-accent-primary" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Meetings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-amber-400">{stats.processing}</p>
                <p className="text-xs text-slate-500">Processing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-emerald-400">{stats.completed}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent-secondary/10">
                <TrendingUp size={18} className="text-accent-secondary" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-white">
                  {formatDuration(stats.totalDuration)}
                </p>
                <p className="text-xs text-slate-500">Total Duration</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Processing Alert ── */}
      {stats.processing > 0 && (
        <div className="flex items-center gap-3 rounded-btn border border-accent-primary/10 bg-accent-primary/5 px-4 py-3">
          <div className="ai-dot" />
          <p className="text-sm text-slate-300">
            {stats.processing} meeting{stats.processing !== 1 ? 's are' : ' is'} being processed…
          </p>
        </div>
      )}

      {/* ── Failed Alert ── */}
      {stats.failed > 0 && (
        <div className="flex items-center gap-3 rounded-btn border border-red-500/10 bg-red-500/5 px-4 py-3">
          <AlertCircle size={16} className="shrink-0 text-red-400" />
          <p className="text-sm text-red-400">
            {stats.failed} meeting{stats.failed !== 1 ? 's' : ''} failed to process
          </p>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Column — Meetings */}
        <div className="flex-1 space-y-5">
          {/* Search & Filters */}
          <div className="space-y-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search across all your meetings..."
            />
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              showCount
              counts={categoryCounts}
            />
          </div>

          {meetings.length > 0 && (
            <MeetingList
              meetings={filteredMeetings}
              loading={loading}
              onDelete={handleDelete}
              onEdit={handleEdit}
              itemsPerPage={12}
            />
          )}
        </div>

        {/* Right Column — Sidebar */}
        <div
          className={`${showMobileSidebar ? 'flex' : 'hidden'} w-full shrink-0 flex-col space-y-6 lg:flex lg:w-[320px]`}
        >
          <div className="rounded-card border border-echo-border bg-echo-surface p-5">
            <CalendarSidebar />
          </div>
          <div className="rounded-card border border-echo-border bg-echo-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Quick Actions</h3>
            <div className="space-y-1">
              <button
                onClick={handleNewRecording}
                className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm text-slate-400 transition-all hover:bg-echo-surface-hover hover:text-white"
                type="button"
              >
                <Plus size={16} className="text-accent-primary" />
                New Recording
              </button>
              <button
                onClick={() => navigate('/meetings')}
                className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm text-slate-400 transition-all hover:bg-echo-surface-hover hover:text-white"
                type="button"
              >
                <List size={16} className="text-accent-primary" />
                View All Meetings
              </button>
              <button
                onClick={() => navigate('/tasks')}
                className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm text-slate-400 transition-all hover:bg-echo-surface-hover hover:text-white"
                type="button"
              >
                <CheckCircle size={16} className="text-accent-primary" />
                View Action Items
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm text-slate-400 transition-all hover:bg-echo-surface-hover hover:text-white"
                type="button"
              >
                <Settings size={16} className="text-accent-primary" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        meeting={selectedMeeting}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default DashboardPage;

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Tabs,
  Tab
} from '@heroui/react';
import {
  FiPlus,
  FiFilter,
  FiDownload,
  FiTrash2,
  FiArrowUp
} from 'react-icons/fi';
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
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Auto-refresh: Poll only while there are processing meetings
  const processingIdsRef = useRef(new Set());

  // Detect when meetings complete and show toast
  useEffect(() => {
    const processingStatuses = ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING'];
    const currentlyProcessing = meetings.filter(m => processingStatuses.includes(m.status));
    const currentIds = new Set(currentlyProcessing.map(m => m.id));
    const prevIds = processingIdsRef.current;

    // Check if any previously processing meetings have completed
    if (prevIds.size > 0) {
      const completedIds = [...prevIds].filter(id => !currentIds.has(id));
      completedIds.forEach(id => {
        const meeting = meetings.find(m => m.id === id);
        if (meeting) {
          if (meeting.status === 'COMPLETED') {
            showToast(`✅ "${meeting.title}" is ready!`, 'success', 6000);
          } else if (meeting.status === 'FAILED') {
            showToast(`❌ "${meeting.title}" failed to process`, 'error', 8000);
          }
        }
      });
    }

    // Update tracking ref
    processingIdsRef.current = currentIds;
  }, [meetings]);

  // Polling effect - separate from detection
  useEffect(() => {
    const processingStatuses = ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING'];
    const hasProcessingMeetings = meetings.some(m => processingStatuses.includes(m.status));

    if (hasProcessingMeetings) {
      const interval = setInterval(() => {
        fetchMeetings();
      }, 20000); // Poll every 20 seconds

      return () => clearInterval(interval);
    }
  }, [meetings, fetchMeetings]);

  // Handle scroll to show/hide header and scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowHeader(true);
        setShowScrollTop(false);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false);
        setShowScrollTop(true);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
        setShowScrollTop(currentScrollY > 300);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter meetings based on all filters
  useEffect(() => {
    let result = meetings;

    // Filter by status
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PROCESSING') {
        // PROCESSING tab shows all in-progress statuses
        const processingStatuses = ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING'];
        result = result.filter(m => processingStatuses.includes(m.status));
      } else {
        result = result.filter(m => m.status === statusFilter);
      }
    }

    // Filter by category
    if (selectedCategory !== 'ALL') {
      result = result.filter(m => m.category === selectedCategory);
    }

    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(m => {
        // Search in title and description
        if (m.title.toLowerCase().includes(query)) return true;
        if (m.description?.toLowerCase().includes(query)) return true;

        // Search in transcript (if it's a string)
        if (typeof m.transcript === 'string' && m.transcript.toLowerCase().includes(query)) return true;

        // Search in summary (if it's an object with string fields)
        if (m.summary && typeof m.summary === 'object') {
          const summaryText = [
            m.summary.executiveSummary,
            m.summary.keyDecisions,
            m.summary.nextSteps,
            ...(m.summary.keyTopics || []),
            ...(m.summary.actionItems || []).map(item => item.task)
          ].filter(Boolean).join(' ').toLowerCase();

          if (summaryText.includes(query)) return true;
        }

        return false;
      });
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredMeetings(result);
  }, [meetings, statusFilter, selectedCategory, debouncedSearch]);

  // Calculate counts for status tabs
  // Backend statuses: UPLOADING, PROCESSING_AUDIO, TRANSCRIBING, PROCESSING_NLP, SUMMARIZING, COMPLETED, FAILED
  const processingStatuses = ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING'];
  const statusCounts = {
    ALL: meetings.length,
    COMPLETED: meetings.filter(m => m.status === 'COMPLETED').length,
    PROCESSING: meetings.filter(m => processingStatuses.includes(m.status)).length,
    FAILED: meetings.filter(m => m.status === 'FAILED').length
  };

  // Category counts
  const categoryCounts = meetings.reduce((acc, meeting) => {
    acc[meeting.category] = (acc[meeting.category] || 0) + 1;
    return acc;
  }, {});

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this meeting? This action cannot be undone.'
    );

    if (confirmed) {
      const result = await deleteMeeting(id);
      if (result.success) {
        // Could add toast notification here
      }
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updates) => {
    const result = await updateMeeting(editingMeeting.id, updates);
    if (result.success) {
      // Refresh meetings list
      fetchMeetings();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMeetings.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedMeetings.length} meeting(s)? This action cannot be undone.`
    );

    if (confirmed) {
      for (const id of selectedMeetings) {
        await deleteMeeting(id);
      }
      setSelectedMeetings([]);
    }
  };

  const handleNewRecording = () => {
    navigate('/record');
  };

  const handleExportAll = () => {
    // Export all meetings as CSV or JSON
    console.log('Export all meetings');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
  };

  if (loading && meetings.length === 0) {
    return <PageLoader label="Loading your meetings..." />;
  }

  return (
    <div className="space-y-6 -mx-4 -my-6">
      {/* Page Header - Slides down when navbar slides up */}
      <div
        className={`fixed top-0 left-0 right-0 z-[45] px-4 pt-2 pb-0 transition-all duration-500 ease-in-out ${!showHeader
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        style={{
          willChange: 'transform, opacity'
        }}
      >
        {/* Centered wrapper */}
        <div className="max-w-6xl mx-auto flex justify-center">
          {/* Rounded container with subtle border */}
          <nav className="inline-flex items-center gap-6 px-6 py-2.5 rounded-full border border-divider/50 bg-content1/90 backdrop-blur-md backdrop-saturate-150 shadow-lg">
            {/* Meetings Title with count */}
            <div className="flex items-center gap-2 text-default-foreground">
              <FiFilter size={20} />
              <span className="font-semibold text-sm">
                My Meetings ({filteredMeetings.length}/{meetings.length})
              </span>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-divider"></div>

            {/* Export Button */}
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 text-sm font-medium text-default-500 hover:text-primary transition-colors"
            >
              <FiDownload size={16} />
              Export
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-divider"></div>

            {/* New Recording Button */}
            <button
              onClick={handleNewRecording}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              <FiPlus size={16} />
              New Recording
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-4 space-y-6">

        {/* Status Tabs */}
        <Card className="rounded-3xl border-2 border-default-200 dark:border-divider">
          <CardBody className="p-0">
            <Tabs
              aria-label="Status filter"
              selectedKey={statusFilter}
              onSelectionChange={setStatusFilter}
              variant="underlined"
              classNames={{
                tabList: 'w-full relative rounded-none p-0 px-4',
                cursor: 'w-full bg-primary',
                tab: 'h-12 hover:opacity-80 transition-opacity duration-200',
                tabContent: 'group-data-[selected=true]:text-primary'
              }}
            >
              <Tab
                key="ALL"
                title={
                  <div className="flex items-center gap-2">
                    <span>All</span>
                    <span className="text-sm font-medium text-default-500">
                      {statusCounts.ALL}
                    </span>
                  </div>
                }
              />
              <Tab
                key="COMPLETED"
                title={
                  <div className="flex items-center gap-2">
                    <span>Completed</span>
                    <span className="text-sm font-medium text-success">
                      {statusCounts.COMPLETED}
                    </span>
                  </div>
                }
              />
              <Tab
                key="PROCESSING"
                title={
                  <div className="flex items-center gap-2">
                    <span>Processing</span>
                    <span className="text-sm font-medium text-warning">
                      {statusCounts.PROCESSING}
                    </span>
                  </div>
                }
              />
              <Tab
                key="FAILED"
                title={
                  <div className="flex items-center gap-2">
                    <span>Failed</span>
                    <span className="text-sm font-medium text-danger">
                      {statusCounts.FAILED}
                    </span>
                  </div>
                }
              />
            </Tabs>
          </CardBody>
        </Card>

        {/* Search and Filters */}
        <Card className="rounded-3xl border-2 border-default-200 dark:border-divider hover:border-primary/30 transition-all duration-300">
          <CardBody className="gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by title, description, or content..."
                />
              </div>

              {(searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="flat"
                  onPress={handleClearFilters}
                  startContent={<FiFilter size={16} />}
                  className="rounded-2xl hover:bg-primary/10 hover:border-primary/20 transition-all duration-300 h-10 md:h-auto md:min-h-[40px]"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              showCount={true}
              counts={categoryCounts}
            />
          </CardBody>
        </Card>

        {/* Bulk Actions */}
        {selectedMeetings.length > 0 && (
          <Card className="border-primary/20 bg-primary/5 rounded-3xl hover:border-primary/30 transition-all duration-300">
            <CardBody>
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {selectedMeetings.length} meeting(s) selected
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setSelectedMeetings([])}
                    className="rounded-2xl hover:bg-default-100 transition-all duration-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    startContent={<FiTrash2 size={16} />}
                    onPress={handleBulkDelete}
                    className="rounded-2xl hover:bg-danger/10 transition-all duration-300"
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Meetings List */}
        {filteredMeetings.length > 0 ? (
          <MeetingList
            meetings={filteredMeetings}
            loading={loading}
            onDelete={handleDelete}
            onEdit={handleEdit}
            itemsPerPage={12}
          />
        ) : (
          <Card className="border-divider/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-xl rounded-3xl border-2 border-primary/20 hover:border-primary/30 transition-all duration-500">
            <CardBody className="text-center py-20">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative w-28 h-28 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/30 backdrop-blur-sm border border-primary/20 hover:scale-110 transition-all duration-300">
                  <FiFilter size={48} className="text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                No meetings found
              </h3>
              <p className="text-default-700 dark:text-default-600 mb-8 max-w-md mx-auto text-lg">
                {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters to see more results'
                  : 'Start by recording your first meeting to see it here'}
              </p>
              {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL' ? (
                <div className="flex justify-center">
                  <Button
                    variant="flat"
                    onPress={handleClearFilters}
                    size="lg"
                    className="font-semibold rounded-3xl hover:bg-primary/10 transition-all duration-300"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="relative inline-block group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500"></div>
                  <Button
                    color="primary"
                    onPress={handleNewRecording}
                    size="lg"
                    startContent={<FiPlus size={20} />}
                    className="relative font-semibold px-8 shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/60 transition-all duration-300 hover:scale-105 rounded-3xl"
                  >
                    Record Your First Meeting
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          isIconOnly
          color="primary"
          variant="shadow"
          className={`fixed bottom-8 right-8 z-50 w-14 h-14 shadow-2xl shadow-primary/50 hover:shadow-3xl hover:shadow-primary/60 transition-all duration-300 ${showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
          radius="full"
          onPress={scrollToTop}
        >
          <FiArrowUp size={24} />
        </Button>
      )}

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        meeting={editingMeeting}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default MeetingsPage;
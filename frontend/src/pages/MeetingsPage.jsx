import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Tabs,
  Tab,
  Chip
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

const MeetingsPage = () => {
  const navigate = useNavigate();
  const { meetings, fetchMeetings, deleteMeeting, loading } = useMeeting();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

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
      result = result.filter(m => m.status === statusFilter);
    }

    // Filter by category
    if (selectedCategory !== 'ALL') {
      result = result.filter(m => m.category === selectedCategory);
    }

    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.transcript?.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredMeetings(result);
  }, [meetings, statusFilter, selectedCategory, debouncedSearch]);

  // Calculate counts for status tabs
  const statusCounts = {
    ALL: meetings.length,
    COMPLETED: meetings.filter(m => m.status === 'COMPLETED').length,
    PROCESSING: meetings.filter(m => m.status === 'PROCESSING').length,
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
      {/* Page Header - Fades on scroll */}
      <div
        className={`sticky top-[80px] md:top-[96px] z-40 px-4 py-4 ${
          showHeader
            ? 'translate-y-0 opacity-100'
            : '-translate-y-1 opacity-0 pointer-events-none'
        }`}
        style={{
          willChange: 'transform, opacity',
          transition: 'opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        <div className="relative max-w-7xl mx-auto">
          {/* Glowing effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-3xl blur-xl opacity-50"></div>

          {/* Header content */}
          <div className="relative bg-gradient-to-r from-background/95 via-background/98 to-background/95 backdrop-blur-xl backdrop-saturate-150 border border-primary/20 shadow-2xl shadow-primary/25 rounded-3xl px-6 md:px-8 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  My Meetings
                </h1>
                <p className="text-default-500 mt-1">
                  {filteredMeetings.length} of {meetings.length} meeting(s)
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="flat"
                  startContent={<FiDownload size={18} />}
                  onPress={handleExportAll}
                  className="transition-all duration-300 hover:scale-105"
                  radius="lg"
                >
                  Export
                </Button>

                <Button
                  color="primary"
                  startContent={<FiPlus size={18} />}
                  onPress={handleNewRecording}
                  className="font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
                  radius="full"
                >
                  New Recording
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-4 space-y-6">

        {/* Status Tabs */}
        <Card>
          <CardBody className="p-0">
            <Tabs
              aria-label="Status filter"
              selectedKey={statusFilter}
              onSelectionChange={setStatusFilter}
              variant="underlined"
              classNames={{
                tabList: 'w-full relative rounded-none p-0 px-4',
                cursor: 'w-full bg-primary',
                tab: 'h-12',
                tabContent: 'group-data-[selected=true]:text-primary'
              }}
            >
              <Tab
                key="ALL"
                title={
                  <div className="flex items-center gap-2">
                    <span>All</span>
                    <Chip size="sm" variant="flat">
                      {statusCounts.ALL}
                    </Chip>
                  </div>
                }
              />
              <Tab
                key="COMPLETED"
                title={
                  <div className="flex items-center gap-2">
                    <span>Completed</span>
                    <Chip size="sm" variant="flat" color="success">
                      {statusCounts.COMPLETED}
                    </Chip>
                  </div>
                }
              />
              <Tab
                key="PROCESSING"
                title={
                  <div className="flex items-center gap-2">
                    <span>Processing</span>
                    <Chip size="sm" variant="flat" color="warning">
                      {statusCounts.PROCESSING}
                    </Chip>
                  </div>
                }
              />
              <Tab
                key="FAILED"
                title={
                  <div className="flex items-center gap-2">
                    <span>Failed</span>
                    <Chip size="sm" variant="flat" color="danger">
                      {statusCounts.FAILED}
                    </Chip>
                  </div>
                }
              />
            </Tabs>
          </CardBody>
        </Card>

        {/* Search and Filters */}
        <Card>
          <CardBody className="gap-4">
            <div className="flex flex-col md:flex-row gap-4">
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
          <Card className="border-primary/20 bg-primary/5">
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
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    startContent={<FiTrash2 size={16} />}
                    onPress={handleBulkDelete}
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
            itemsPerPage={12}
          />
        ) : (
          <Card className="border-divider/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-xl">
            <CardBody className="text-center py-20">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative w-28 h-28 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/25 backdrop-blur-sm border border-primary/20">
                  <FiFilter size={48} className="text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                No meetings found
              </h3>
              <p className="text-default-600 mb-8 max-w-md mx-auto text-lg">
                {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters to see more results'
                  : 'Start by recording your first meeting to see it here'}
              </p>
              {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL' ? (
                <Button
                  variant="flat"
                  onPress={handleClearFilters}
                  size="lg"
                  className="font-semibold transition-all duration-300 hover:scale-105"
                  radius="full"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  color="primary"
                  onPress={handleNewRecording}
                  size="lg"
                  startContent={<FiPlus size={20} />}
                  className="font-semibold px-8 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
                  radius="full"
                >
                  Record Your First Meeting
                </Button>
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
          className={`fixed bottom-8 right-8 z-50 w-14 h-14 shadow-2xl shadow-primary/50 hover:shadow-3xl hover:shadow-primary/60 transition-all duration-300 ${
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
          radius="full"
          onPress={scrollToTop}
        >
          <FiArrowUp size={24} />
        </Button>
      )}
    </div>
  );
};

export default MeetingsPage;
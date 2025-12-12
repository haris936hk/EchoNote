import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Chip
} from '@heroui/react';
import {
  FiMic,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiPlus,
  FiArrowUp,
  FiGrid
} from 'react-icons/fi';
import { useMeeting } from '../contexts/MeetingContext';
import { useScrollContext } from '../components/layout/MainLayout';
import MeetingList from '../components/meeting/MeetingList';
import CategoryFilter from '../components/meeting/CategoryFilter';
import SearchBar from '../components/meeting/SearchBar';
import { PageLoader } from '../components/common/Loader';
import useDebounce from '../hooks/useDebounce';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { meetings, fetchMeetings, deleteMeeting, loading } = useMeeting();
  const { showNavbar } = useScrollContext();

  // Debug: Log showNavbar changes
  useEffect(() => {
    console.log('Dashboard - showNavbar:', showNavbar);
  }, [showNavbar]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Handle scroll for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowScrollTop(currentScrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter meetings based on search and category
  useEffect(() => {
    let result = meetings;

    // Filter by category
    if (selectedCategory !== 'ALL') {
      result = result.filter(m => m.category === selectedCategory);
    }

    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }

    setFilteredMeetings(result);
  }, [meetings, selectedCategory, debouncedSearch]);

  // Calculate statistics
  const stats = {
    total: meetings.length,
    completed: meetings.filter(m => m.status === 'COMPLETED').length,
    processing: meetings.filter(m => m.status === 'PROCESSING').length,
    failed: meetings.filter(m => m.status === 'FAILED').length,
    totalDuration: meetings.reduce((sum, m) => sum + (m.duration || 0), 0)
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

  const handleNewRecording = () => {
    navigate('/record');
  };

  if (loading && meetings.length === 0) {
    return <PageLoader label="Loading your meetings..." />;
  }

  return (
    <div className="-mx-4">
      {/* Page Header - Slides down when navbar slides up */}
      <div
        className={`fixed top-0 left-0 right-0 z-[45] px-4 pt-2 pb-0 transition-all duration-500 ease-in-out ${
          !showNavbar
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
          <nav className="inline-flex items-center gap-6 px-6 py-2.5 rounded-full border border-gray-700/30 bg-gray-900/30 backdrop-blur-md backdrop-saturate-150">
            {/* Dashboard Title */}
            <div className="flex items-center gap-2 text-default-foreground">
              <FiGrid size={20} />
              <span className="font-semibold text-sm">Dashboard</span>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-700/30"></div>

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
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Empty State */}
        {meetings.length === 0 && !loading && (
          <Card className="border-divider/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-xl rounded-3xl border-2 border-primary/20 hover:border-primary/30 transition-all duration-500">
            <CardBody className="text-center py-20">
              <div className="mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary/30 border border-primary/20 hover:scale-110 transition-all duration-300">
                  <FiMic size={56} className="text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                No meetings yet
              </h3>
              <p className="text-default-600 mb-8 max-w-md mx-auto text-lg">
                Start by recording your first meeting. Your AI-powered transcription and summary will be ready in minutes.
              </p>
              <div className="relative inline-block group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500"></div>
                <Button
                  color="primary"
                  size="md"
                  startContent={<FiPlus size={18} />}
                  onPress={handleNewRecording}
                  className="relative font-semibold px-5 shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/60 transition-all duration-300 hover:scale-105 rounded-3xl"
                >
                  Record Your First Meeting
                </Button>
              </div>

              {/* Feature hints */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="p-4 rounded-3xl bg-background/50 backdrop-blur-sm border border-divider/20 text-center hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group">
                  <div className="p-3 bg-primary/10 rounded-2xl w-fit mb-3 mx-auto group-hover:bg-primary/20 transition-colors duration-300 shadow-lg">
                    <FiMic className="text-primary group-hover:scale-110 transition-transform duration-300" size={24} />
                  </div>
                  <p className="text-sm font-semibold mb-1">Quick Recording</p>
                  <p className="text-xs text-default-500">Up to 3 minutes</p>
                </div>
                <div className="p-4 rounded-3xl bg-background/50 backdrop-blur-sm border border-divider/20 text-center hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/20 transition-all duration-300 group">
                  <div className="p-3 bg-secondary/10 rounded-2xl w-fit mb-3 mx-auto group-hover:bg-secondary/20 transition-colors duration-300 shadow-lg">
                    <FiCheckCircle className="text-secondary group-hover:scale-110 transition-transform duration-300" size={24} />
                  </div>
                  <p className="text-sm font-semibold mb-1">AI Transcription</p>
                  <p className="text-xs text-default-500">90%+ accuracy</p>
                </div>
                <div className="p-4 rounded-3xl bg-background/50 backdrop-blur-sm border border-divider/20 text-center hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group">
                  <div className="p-3 bg-primary/10 rounded-2xl w-fit mb-3 mx-auto group-hover:bg-primary/20 transition-colors duration-300 shadow-lg">
                    <FiTrendingUp className="text-primary group-hover:scale-110 transition-transform duration-300" size={24} />
                  </div>
                  <p className="text-sm font-semibold mb-1">Smart Summaries</p>
                  <p className="text-xs text-default-500">Key insights extracted</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Statistics Cards - Only show when there are meetings */}
        {meetings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border border-divider hover:border-primary/40 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 group">
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Total Meetings</p>
                  <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{stats.total}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors duration-300 shadow-lg">
                  <FiMic className="text-primary group-hover:scale-110 transition-transform duration-300" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="rounded-3xl border border-divider hover:border-success/40 hover:shadow-xl hover:shadow-success/20 transition-all duration-300 group">
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Completed</p>
                  <p className="text-3xl font-bold text-success mt-1 group-hover:scale-105 transition-transform duration-300">
                    {stats.completed}
                  </p>
                </div>
                <div className="p-3 bg-success/10 rounded-2xl group-hover:bg-success/20 transition-colors duration-300 shadow-lg">
                  <FiCheckCircle className="text-success group-hover:scale-110 transition-transform duration-300" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="rounded-3xl border border-divider hover:border-warning/40 hover:shadow-xl hover:shadow-warning/20 transition-all duration-300 group">
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Processing</p>
                  <p className="text-3xl font-bold text-warning mt-1 group-hover:scale-105 transition-transform duration-300">
                    {stats.processing}
                  </p>
                </div>
                <div className="p-3 bg-warning/10 rounded-2xl group-hover:bg-warning/20 transition-colors duration-300 shadow-lg">
                  <FiClock className="text-warning group-hover:scale-110 transition-transform duration-300" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="rounded-3xl border border-divider hover:border-secondary/40 hover:shadow-xl hover:shadow-secondary/20 transition-all duration-300 group">
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Total Time</p>
                  <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {Math.floor(stats.totalDuration / 60)}m
                  </p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-2xl group-hover:bg-secondary/20 transition-colors duration-300 shadow-lg">
                  <FiTrendingUp className="text-secondary group-hover:scale-110 transition-transform duration-300" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        )}

        {/* Failed Meetings Alert */}
        {meetings.length > 0 && stats.failed > 0 && (
          <Card className="border-danger/20 bg-danger/5 rounded-3xl hover:border-danger/40 transition-all duration-300 mt-4">
            <CardBody>
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-danger mt-0.5 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-danger">
                    {stats.failed} meeting{stats.failed !== 1 ? 's' : ''} failed to process
                  </p>
                  <p className="text-sm text-danger/80 mt-1">
                    Please try uploading these recordings again or contact support if the issue persists.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Main Content Grid */}
        {meetings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4">
          {/* Meetings List - Left Column (3/4) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <Card className="rounded-3xl border border-divider hover:border-primary/20 transition-all duration-300">
              <CardBody className="gap-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by title or description..."
                />

                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  showCount={true}
                  counts={categoryCounts}
                />
              </CardBody>
            </Card>

            {/* Meetings List */}
            <MeetingList
              meetings={filteredMeetings}
              loading={loading}
              onDelete={handleDelete}
              itemsPerPage={12}
            />
          </div>

          {/* Sidebar - Right Column (1/4) */}
          <div className="space-y-6">
            {/* Category Breakdown */}
            <Card className="rounded-3xl border border-divider">
              <CardHeader>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Categories</h3>
              </CardHeader>
              <Divider />
              <CardBody className="gap-3 max-h-80 overflow-y-auto">
                {Object.entries(categoryCounts).length > 0 ? (
                  <>
                    <div
                      className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                        selectedCategory === 'ALL'
                          ? 'bg-primary/10 border border-primary/20 shadow-lg shadow-primary/20'
                          : 'hover:bg-default-100 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedCategory('ALL')}
                    >
                      <span className="text-sm font-medium">All Categories</span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={selectedCategory === 'ALL' ? 'primary' : 'default'}
                        className="rounded-xl"
                      >
                        {stats.total}
                      </Chip>
                    </div>
                    {Object.entries(categoryCounts).map(([category, count]) => (
                      <div
                        key={category}
                        className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                          selectedCategory === category
                            ? 'bg-primary/10 border border-primary/20 shadow-lg shadow-primary/20'
                            : 'hover:bg-default-100 hover:shadow-md'
                        }`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <span className="text-sm font-medium">{category}</span>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={selectedCategory === category ? 'primary' : 'default'}
                          className="rounded-xl"
                        >
                          {count}
                        </Chip>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-center text-default-500 text-sm py-4">
                    No meetings yet
                  </p>
                )}
              </CardBody>
            </Card>

            {/* Quick Actions */}
            <Card className="rounded-3xl border border-divider">
              <CardHeader>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quick Actions</h3>
              </CardHeader>
              <Divider />
              <CardBody className="gap-2">
                <Button
                  variant="flat"
                  onPress={handleNewRecording}
                  startContent={<FiPlus size={16} />}
                  fullWidth
                  className="justify-start rounded-2xl hover:bg-primary/10 hover:border-primary/20 transition-all duration-300"
                >
                  New Recording
                </Button>

                <Button
                  variant="flat"
                  onPress={() => setSelectedCategory('ALL')}
                  fullWidth
                  className="justify-start rounded-2xl hover:bg-primary/10 hover:border-primary/20 transition-all duration-300"
                >
                  View All Meetings
                </Button>

                <Button
                  variant="flat"
                  onPress={() => navigate('/settings')}
                  fullWidth
                  className="justify-start rounded-2xl hover:bg-primary/10 hover:border-primary/20 transition-all duration-300"
                >
                  Settings
                </Button>
              </CardBody>
            </Card>

            {/* Tips Card */}
            <Card className="bg-primary/5 border border-primary/20 rounded-3xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <CardBody className="gap-3">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <FiMic className="text-primary" size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Pro Tip</p>
                    <p className="text-xs text-primary/80 mt-1">
                      Keep your meetings under 3 minutes for best results. Use clear audio and minimize background noise.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <div className="fixed bottom-8 right-8 z-50">
          {/* Glowing effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-secondary/40 to-primary/40 rounded-full blur-2xl animate-pulse"></div>

          {/* Button */}
          <Button
            isIconOnly
            color="primary"
            variant="shadow"
            className={`relative w-14 h-14 shadow-2xl shadow-primary/50 hover:shadow-3xl hover:shadow-primary/60 transition-all duration-300 ${
              showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
            radius="full"
            onPress={scrollToTop}
          >
            <FiArrowUp size={24} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
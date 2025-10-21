import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Chip
} from '@nextui-org/react';
import {
  FiMic,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiPlus
} from 'react-icons/fi';
import { useMeeting } from '../contexts/MeetingContext';
import MeetingList from '../components/meeting/MeetingList';
import CategoryFilter from '../components/meeting/CategoryFilter';
import SearchBar from '../components/meeting/SearchBar';
import { PageLoader } from '../components/common/Loader';
import useDebounce from '../hooks/useDebounce';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { meetings, fetchMeetings, deleteMeeting, loading } = useMeeting();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filteredMeetings, setFilteredMeetings] = useState([]);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-default-500 mt-1">
              Manage and review your meeting recordings
            </p>
          </div>

          <Button
            color="primary"
            size="lg"
            startContent={<FiPlus size={20} />}
            onPress={handleNewRecording}
            className="w-full md:w-auto"
          >
            New Recording
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Total Meetings</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FiMic className="text-primary" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Completed</p>
                  <p className="text-3xl font-bold text-success mt-1">
                    {stats.completed}
                  </p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg">
                  <FiCheckCircle className="text-success" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Processing</p>
                  <p className="text-3xl font-bold text-warning mt-1">
                    {stats.processing}
                  </p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <FiClock className="text-warning" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-default-500">Total Time</p>
                  <p className="text-3xl font-bold mt-1">
                    {Math.floor(stats.totalDuration / 60)}m
                  </p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <FiTrendingUp className="text-secondary" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Failed Meetings Alert */}
        {stats.failed > 0 && (
          <Card className="border-danger/20 bg-danger/5">
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Meetings List - Left Column (3/4) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <Card>
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
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Categories</h3>
              </CardHeader>
              <Divider />
              <CardBody className="gap-3">
                {Object.entries(categoryCounts).length > 0 ? (
                  Object.entries(categoryCounts).map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-2 hover:bg-default-100 rounded-lg cursor-pointer transition-colors"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <span className="text-sm font-medium">{category}</span>
                      <Chip size="sm" variant="flat" color="primary">
                        {count}
                      </Chip>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-default-500 text-sm py-4">
                    No meetings yet
                  </p>
                )}
              </CardBody>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </CardHeader>
              <Divider />
              <CardBody className="gap-2">
                <Button
                  variant="flat"
                  onPress={handleNewRecording}
                  startContent={<FiPlus size={16} />}
                  fullWidth
                  className="justify-start"
                >
                  New Recording
                </Button>

                <Button
                  variant="flat"
                  onPress={() => setSelectedCategory('ALL')}
                  fullWidth
                  className="justify-start"
                >
                  View All Meetings
                </Button>

                <Button
                  variant="flat"
                  onPress={() => navigate('/settings')}
                  fullWidth
                  className="justify-start"
                >
                  Settings
                </Button>
              </CardBody>
            </Card>

            {/* Tips Card */}
            <Card className="bg-primary/5 border border-primary/20">
              <CardBody className="gap-3">
                <div className="flex items-start gap-2">
                  <FiMic className="text-primary mt-0.5 flex-shrink-0" size={18} />
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

        {/* Empty State */}
        {meetings.length === 0 && !loading && (
          <Card>
            <CardBody className="text-center py-16">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiMic size={48} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No meetings yet</h3>
              <p className="text-default-500 mb-6 max-w-md mx-auto">
                Start by recording your first meeting. Your AI-powered transcription and summary will be ready in minutes.
              </p>
              <Button
                color="primary"
                size="lg"
                startContent={<FiPlus size={20} />}
                onPress={handleNewRecording}
              >
                Record Your First Meeting
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
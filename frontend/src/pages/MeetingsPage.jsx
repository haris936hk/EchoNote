import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Tabs,
  Tab,
  Chip
} from '@nextui-org/react';
import {
  FiPlus,
  FiFilter,
  FiDownload,
  FiTrash2
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

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Meetings</h1>
            <p className="text-default-500 mt-1">
              {filteredMeetings.length} of {meetings.length} meeting(s)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="flat"
              startContent={<FiDownload size={18} />}
              onPress={handleExportAll}
            >
              Export
            </Button>

            <Button
              color="primary"
              startContent={<FiPlus size={18} />}
              onPress={handleNewRecording}
            >
              New Recording
            </Button>
          </div>
        </div>

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
          <Card>
            <CardBody className="text-center py-16">
              <div className="w-20 h-20 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiFilter size={32} className="text-default-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No meetings found</h3>
              <p className="text-default-500 mb-6">
                {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters to see more results'
                  : 'Start by recording your first meeting'}
              </p>
              {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL' ? (
                <Button variant="flat" onPress={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button color="primary" onPress={handleNewRecording}>
                  Record Meeting
                </Button>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MeetingsPage;
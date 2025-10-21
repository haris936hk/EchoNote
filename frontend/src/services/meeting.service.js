import { meetingsAPI } from './api';

// ============================================
// MEETING CRUD OPERATIONS
// ============================================

/**
 * Fetch all meetings for current user
 */
export const getAllMeetings = async () => {
  try {
    const result = await meetingsAPI.getAllMeetings();

    if (result.success) {
      // Transform and sort meetings
      const meetings = result.data.meetings || [];
      const sortedMeetings = sortMeetingsByDate(meetings, 'desc');

      return {
        success: true,
        data: sortedMeetings
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to fetch meetings'
    };
  } catch (error) {
    console.error('Get meetings error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Fetch single meeting by ID
 */
export const getMeetingById = async (id) => {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Meeting ID is required'
      };
    }

    const result = await meetingsAPI.getMeetingById(id);

    if (result.success) {
      return {
        success: true,
        data: result.data.meeting
      };
    }

    return {
      success: false,
      error: result.error || 'Meeting not found'
    };
  } catch (error) {
    console.error('Get meeting error:', error);
    return {
      success: false,
      error: 'Failed to fetch meeting details'
    };
  }
};

/**
 * Upload new meeting with audio file
 */
export const uploadMeeting = async (meetingData) => {
  try {
    // Validate required fields
    const validation = validateMeetingData(meetingData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Validate audio file
    const audioValidation = validateAudioFile(meetingData.audioFile);
    if (!audioValidation.valid) {
      return {
        success: false,
        error: audioValidation.error
      };
    }

    const result = await meetingsAPI.uploadMeeting({
      title: meetingData.title.trim(),
      description: meetingData.description?.trim() || '',
      category: meetingData.category,
      audioFile: meetingData.audioFile
    });

    if (result.success) {
      return {
        success: true,
        data: result.data.meeting
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to upload meeting'
    };
  } catch (error) {
    console.error('Upload meeting error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during upload'
    };
  }
};

/**
 * Update meeting details
 */
export const updateMeeting = async (id, updates) => {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Meeting ID is required'
      };
    }

    // Sanitize updates
    const sanitizedUpdates = {};
    if (updates.title) sanitizedUpdates.title = updates.title.trim();
    if (updates.description !== undefined) {
      sanitizedUpdates.description = updates.description.trim();
    }
    if (updates.category) sanitizedUpdates.category = updates.category;

    const result = await meetingsAPI.updateMeeting(id, sanitizedUpdates);

    if (result.success) {
      return {
        success: true,
        data: result.data.meeting
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to update meeting'
    };
  } catch (error) {
    console.error('Update meeting error:', error);
    return {
      success: false,
      error: 'Failed to update meeting'
    };
  }
};

/**
 * Delete meeting
 */
export const deleteMeeting = async (id) => {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Meeting ID is required'
      };
    }

    const result = await meetingsAPI.deleteMeeting(id);

    if (result.success) {
      return {
        success: true,
        data: { id }
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to delete meeting'
    };
  } catch (error) {
    console.error('Delete meeting error:', error);
    return {
      success: false,
      error: 'Failed to delete meeting'
    };
  }
};

/**
 * Delete multiple meetings
 */
export const deleteMeetings = async (ids) => {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'Meeting IDs are required'
      };
    }

    const results = await Promise.allSettled(
      ids.map(id => meetingsAPI.deleteMeeting(id))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

    return {
      success: failed.length === 0,
      data: {
        deleted: successful.length,
        failed: failed.length,
        ids: ids
      },
      error: failed.length > 0 ? `${failed.length} meeting(s) failed to delete` : null
    };
  } catch (error) {
    console.error('Delete meetings error:', error);
    return {
      success: false,
      error: 'Failed to delete meetings'
    };
  }
};

// ============================================
// SEARCH & FILTER
// ============================================

/**
 * Search meetings by query
 */
export const searchMeetings = async (query) => {
  try {
    if (!query || query.trim() === '') {
      return {
        success: true,
        data: []
      };
    }

    const result = await meetingsAPI.searchMeetings(query.trim());

    if (result.success) {
      return {
        success: true,
        data: result.data.meetings || []
      };
    }

    return {
      success: false,
      error: result.error || 'Search failed'
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      success: false,
      error: 'Search failed'
    };
  }
};

/**
 * Filter meetings by criteria
 */
export const filterMeetings = (meetings, filters) => {
  let filtered = [...meetings];

  // Filter by status
  if (filters.status && filters.status !== 'ALL') {
    filtered = filtered.filter(m => m.status === filters.status);
  }

  // Filter by category
  if (filters.category && filters.category !== 'ALL') {
    filtered = filtered.filter(m => m.category === filters.category);
  }

  // Filter by date range
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filtered = filtered.filter(m => new Date(m.createdAt) >= fromDate);
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(m => new Date(m.createdAt) <= toDate);
  }

  // Filter by search query (client-side)
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.transcript?.toLowerCase().includes(query) ||
      m.summary?.toLowerCase().includes(query)
    );
  }

  return filtered;
};

// ============================================
// SORTING & GROUPING
// ============================================

/**
 * Sort meetings by field
 */
export const sortMeetings = (meetings, field, order = 'desc') => {
  const sorted = [...meetings];

  sorted.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    // Handle date fields
    if (field === 'createdAt' || field === 'updatedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle string fields
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return sorted;
};

/**
 * Sort meetings by date
 */
export const sortMeetingsByDate = (meetings, order = 'desc') => {
  return sortMeetings(meetings, 'createdAt', order);
};

/**
 * Group meetings by field
 */
export const groupMeetingsBy = (meetings, field) => {
  return meetings.reduce((groups, meeting) => {
    const key = meeting[field];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(meeting);
    return groups;
  }, {});
};

/**
 * Group meetings by category
 */
export const groupMeetingsByCategory = (meetings) => {
  return groupMeetingsBy(meetings, 'category');
};

/**
 * Group meetings by status
 */
export const groupMeetingsByStatus = (meetings) => {
  return groupMeetingsBy(meetings, 'status');
};

/**
 * Group meetings by date (day)
 */
export const groupMeetingsByDate = (meetings) => {
  return meetings.reduce((groups, meeting) => {
    const date = new Date(meeting.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(meeting);
    return groups;
  }, {});
};

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * Calculate meeting statistics
 */
export const calculateMeetingStats = (meetings) => {
  const stats = {
    total: meetings.length,
    completed: 0,
    processing: 0,
    failed: 0,
    totalDuration: 0,
    averageDuration: 0,
    byCategory: {},
    byStatus: {},
    recentCount: 0 // Last 7 days
  };

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  meetings.forEach(meeting => {
    // Count by status
    stats.byStatus[meeting.status] = (stats.byStatus[meeting.status] || 0) + 1;

    if (meeting.status === 'COMPLETED') stats.completed++;
    if (meeting.status === 'PROCESSING') stats.processing++;
    if (meeting.status === 'FAILED') stats.failed++;

    // Count by category
    stats.byCategory[meeting.category] = (stats.byCategory[meeting.category] || 0) + 1;

    // Calculate duration
    if (meeting.duration) {
      stats.totalDuration += meeting.duration;
    }

    // Count recent meetings
    if (new Date(meeting.createdAt) >= weekAgo) {
      stats.recentCount++;
    }
  });

  // Calculate average duration
  if (meetings.length > 0) {
    stats.averageDuration = Math.round(stats.totalDuration / meetings.length);
  }

  return stats;
};

/**
 * Get recent meetings
 */
export const getRecentMeetings = (meetings, limit = 5) => {
  return sortMeetingsByDate(meetings, 'desc').slice(0, limit);
};

/**
 * Get meetings by status
 */
export const getMeetingsByStatus = (meetings, status) => {
  return meetings.filter(m => m.status === status);
};

/**
 * Get meetings by category
 */
export const getMeetingsByCategory = (meetings, category) => {
  if (category === 'ALL') return meetings;
  return meetings.filter(m => m.category === category);
};

// ============================================
// VALIDATION
// ============================================

/**
 * Validate meeting data before upload
 */
export const validateMeetingData = (data) => {
  if (!data.title || data.title.trim() === '') {
    return { valid: false, error: 'Meeting title is required' };
  }

  if (data.title.length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters long' };
  }

  if (data.title.length > 100) {
    return { valid: false, error: 'Title must be less than 100 characters' };
  }

  if (!data.category) {
    return { valid: false, error: 'Category is required' };
  }

  const validCategories = ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'];
  if (!validCategories.includes(data.category)) {
    return { valid: false, error: 'Invalid category' };
  }

  if (!data.audioFile) {
    return { valid: false, error: 'Audio file is required' };
  }

  return { valid: true };
};

/**
 * Validate audio file
 */
export const validateAudioFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No audio file provided' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Audio file is too large (max 10MB)' };
  }

  // Check file type
  const validTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid audio file type' };
  }

  return { valid: true };
};

// ============================================
// FORMATTING & UTILITIES
// ============================================

/**
 * Format meeting duration
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Format meeting date
 */
export const formatMeetingDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Get status color
 */
export const getStatusColor = (status) => {
  const colors = {
    COMPLETED: 'success',
    PROCESSING: 'warning',
    FAILED: 'danger'
  };
  return colors[status] || 'default';
};

/**
 * Get category label
 */
export const getCategoryLabel = (category) => {
  const labels = {
    SALES: 'Sales',
    PLANNING: 'Planning',
    STANDUP: 'Standup',
    ONE_ON_ONE: 'One-on-One',
    OTHER: 'Other'
  };
  return labels[category] || category;
};

/**
 * Export meetings as JSON
 */
export const exportMeetingsAsJSON = (meetings) => {
  const dataStr = JSON.stringify(meetings, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `meetings-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export meetings as CSV
 */
export const exportMeetingsAsCSV = (meetings) => {
  const headers = ['ID', 'Title', 'Category', 'Status', 'Duration', 'Created At'];
  const rows = meetings.map(m => [
    m.id,
    m.title,
    m.category,
    m.status,
    m.duration || 0,
    new Date(m.createdAt).toISOString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const dataBlob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `meetings-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const meetingService = {
  // CRUD operations
  getAllMeetings,
  getMeetingById,
  uploadMeeting,
  updateMeeting,
  deleteMeeting,
  deleteMeetings,

  // Search & filter
  searchMeetings,
  filterMeetings,

  // Sorting & grouping
  sortMeetings,
  sortMeetingsByDate,
  groupMeetingsBy,
  groupMeetingsByCategory,
  groupMeetingsByStatus,
  groupMeetingsByDate,

  // Statistics
  calculateMeetingStats,
  getRecentMeetings,
  getMeetingsByStatus,
  getMeetingsByCategory,

  // Validation
  validateMeetingData,
  validateAudioFile,

  // Utilities
  formatDuration,
  formatMeetingDate,
  getStatusColor,
  getCategoryLabel,
  exportMeetingsAsJSON,
  exportMeetingsAsCSV
};

export default meetingService;
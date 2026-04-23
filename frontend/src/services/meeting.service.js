import { meetingsAPI } from './api';


export const getAllMeetings = async () => {
  try {
    const result = await meetingsAPI.getAllMeetings();

    if (result.success) {
      const meetings = result.data.meetings || [];
      const sortedMeetings = sortMeetingsByDate(meetings, 'desc');

      return {
        success: true,
        data: sortedMeetings,
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to fetch meetings',
    };
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
};


export const getMeetingById = async (id) => {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Meeting ID is required',
      };
    }

    const result = await meetingsAPI.getMeetingById(id);

    if (result.success) {
      return {
        success: true,
        data: result.data.meeting,
      };
    }

    return {
      success: false,
      error: result.error || 'Meeting not found',
    };
  } catch {
    return {
      success: false,
      error: 'Failed to fetch meeting details',
    };
  }
};


export const uploadMeeting = async (meetingData) => {
  try {
    const validation = validateMeetingData(meetingData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    const audioValidation = validateAudioFile(meetingData.audioFile);
    if (!audioValidation.valid) {
      return {
        success: false,
        error: audioValidation.error,
      };
    }

    const result = await meetingsAPI.uploadMeeting({
      title: meetingData.title.trim(),
      description: meetingData.description?.trim() || '',
      category: meetingData.category,
      audioFile: meetingData.audioFile,
    });

    if (result.success) {
      return {
        success: true,
        data: result.data.meeting,
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to upload meeting',
    };
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred during upload',
    };
  }
};


export const updateMeeting = async (id, updates) => {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Meeting ID is required',
      };
    }

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
        data: result.data.meeting,
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to update meeting',
    };
  } catch {
    return {
      success: false,
      error: 'Failed to update meeting',
    };
  }
};


export const deleteMeeting = async (id) => {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Meeting ID is required',
      };
    }

    const result = await meetingsAPI.deleteMeeting(id);

    if (result.success) {
      return {
        success: true,
        data: { id },
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to delete meeting',
    };
  } catch {
    return {
      success: false,
      error: 'Failed to delete meeting',
    };
  }
};


export const deleteMeetings = async (ids) => {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'Meeting IDs are required',
      };
    }

    const results = await Promise.allSettled(ids.map((id) => meetingsAPI.deleteMeeting(id)));

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter((r) => r.status === 'rejected' || !r.value.success);

    return {
      success: failed.length === 0,
      data: {
        deleted: successful.length,
        failed: failed.length,
        ids: ids,
      },
      error: failed.length > 0 ? `${failed.length} meeting(s) failed to delete` : null,
    };
  } catch {
    return {
      success: false,
      error: 'Failed to delete meetings',
    };
  }
};


export const searchMeetings = async (query) => {
  try {
    if (!query || query.trim() === '') {
      return {
        success: true,
        data: [],
      };
    }

    const result = await meetingsAPI.searchMeetings(query.trim());

    if (result.success) {
      return {
        success: true,
        data: result.data.meetings || [],
      };
    }

    return {
      success: false,
      error: result.error || 'Search failed',
    };
  } catch {
    return {
      success: false,
      error: 'Search failed',
    };
  }
};


export const filterMeetings = (meetings, filters) => {
  let filtered = [...meetings];

  if (filters.status && filters.status !== 'ALL') {
    filtered = filtered.filter((m) => m.status === filters.status);
  }

  if (filters.category && filters.category !== 'ALL') {
    filtered = filtered.filter((m) => m.category === filters.category);
  }

  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filtered = filtered.filter((m) => new Date(m.createdAt) >= fromDate);
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999); 
    filtered = filtered.filter((m) => new Date(m.createdAt) <= toDate);
  }

  if (filters.query) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.transcript?.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query)
    );
  }

  return filtered;
};


export const sortMeetings = (meetings, field, order = 'desc') => {
  const sorted = [...meetings];

  sorted.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    if (field === 'createdAt' || field === 'updatedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

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


export const sortMeetingsByDate = (meetings, order = 'desc') => {
  return sortMeetings(meetings, 'createdAt', order);
};


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


export const groupMeetingsByCategory = (meetings) => {
  return groupMeetingsBy(meetings, 'category');
};


export const groupMeetingsByStatus = (meetings) => {
  return groupMeetingsBy(meetings, 'status');
};


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
    recentCount: 0, 
  };

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  meetings.forEach((meeting) => {
    stats.byStatus[meeting.status] = (stats.byStatus[meeting.status] || 0) + 1;

    if (meeting.status === 'COMPLETED') stats.completed++;
    if (meeting.status === 'PROCESSING') stats.processing++;
    if (meeting.status === 'FAILED') stats.failed++;

    stats.byCategory[meeting.category] = (stats.byCategory[meeting.category] || 0) + 1;

    if (meeting.duration) {
      stats.totalDuration += meeting.duration;
    }

    if (new Date(meeting.createdAt) >= weekAgo) {
      stats.recentCount++;
    }
  });

  if (meetings.length > 0) {
    stats.averageDuration = Math.round(stats.totalDuration / meetings.length);
  }

  return stats;
};


export const getRecentMeetings = (meetings, limit = 5) => {
  return sortMeetingsByDate(meetings, 'desc').slice(0, limit);
};


export const getMeetingsByStatus = (meetings, status) => {
  return meetings.filter((m) => m.status === status);
};


export const getMeetingsByCategory = (meetings, category) => {
  if (category === 'ALL') return meetings;
  return meetings.filter((m) => m.category === category);
};


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


export const validateAudioFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No audio file provided' };
  }

  const maxSize = 10 * 1024 * 1024; 
  if (file.size > maxSize) {
    return { valid: false, error: 'Audio file is too large (max 10MB)' };
  }

  
  const validTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid audio file type' };
  }

  return { valid: true };
};


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


export const getStatusColor = (status) => {
  const colors = {
    COMPLETED: 'success',
    PROCESSING: 'warning',
    FAILED: 'danger',
  };
  return colors[status] || 'default';
};


export const getCategoryLabel = (category) => {
  const labels = {
    SALES: 'Sales',
    PLANNING: 'Planning',
    STANDUP: 'Standup',
    ONE_ON_ONE: 'One-on-One',
    OTHER: 'Other',
  };
  return labels[category] || category;
};


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


export const exportMeetingsAsCSV = (meetings) => {
  const headers = ['ID', 'Title', 'Category', 'Status', 'Duration', 'Created At'];
  const rows = meetings.map((m) => [
    m.id,
    m.title,
    m.category,
    m.status,
    m.duration || 0,
    new Date(m.createdAt).toISOString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
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


export const getDecisions = async () => {
  try {
    const result = await meetingsAPI.getDecisions();

    if (result.success) {
      return {
        success: true,
        data: result.data || [],
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to fetch decisions',
    };
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
};


export const generateFollowUp = async (id, tone = 'formal') => {
  try {
    if (!id) return { success: false, error: 'Meeting ID is required' };
    const result = await meetingsAPI.generateFollowUp(id, tone);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error || 'Failed to generate follow-up' };
  } catch (error) {
    console.error('Generate follow-up error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};


export const shareMeetingToSlack = async (id) => {
  try {
    if (!id) return { success: false, error: 'Meeting ID is required' };
    const result = await meetingsAPI.shareToSlack(id);
    return result;
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' };
  }
};

const meetingService = {
  getAllMeetings,
  getMeetingById,
  uploadMeeting,
  updateMeeting,
  deleteMeeting,
  deleteMeetings,

  searchMeetings,
  filterMeetings,

  sortMeetings,
  sortMeetingsByDate,
  groupMeetingsBy,
  groupMeetingsByCategory,
  groupMeetingsByStatus,
  groupMeetingsByDate,

  calculateMeetingStats,
  getRecentMeetings,
  getMeetingsByStatus,
  getMeetingsByCategory,

  validateMeetingData,
  validateAudioFile,

  formatDuration,
  formatMeetingDate,
  getStatusColor,
  getCategoryLabel,
  exportMeetingsAsJSON,
  exportMeetingsAsCSV,
  getDecisions,
  generateFollowUp,
  shareMeetingToSlack,
};

export default meetingService;

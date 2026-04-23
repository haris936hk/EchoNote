import { useContext } from 'react';
import { MeetingContext } from '../contexts/MeetingContext';

/**
 * Custom hook to access meeting context
 * Provides meeting data, recording state, and meeting management methods
 *
 * @throws {Error} 
 * @returns {Object} 
 */
const useMeetings = () => {
  const context = useContext(MeetingContext);

  if (!context) {
    throw new Error(
      'useMeetings must be used within a MeetingProvider. ' +
        'Wrap your component tree with <MeetingProvider> to use this hook.'
    );
  }

  return context;
};

export default useMeetings;


export const useMeetingsByStatus = (status) => {
  const { meetings } = useMeetings();

  const filteredMeetings = meetings.filter((meeting) => meeting.status === status);

  return {
    meetings: filteredMeetings,
    count: filteredMeetings.length,
  };
};


export const useMeetingsByCategory = (category) => {
  const { meetings } = useMeetings();

  if (category === 'ALL') {
    return {
      meetings,
      count: meetings.length,
    };
  }

  const filteredMeetings = meetings.filter((meeting) => meeting.category === category);

  return {
    meetings: filteredMeetings,
    count: filteredMeetings.length,
  };
};


export const useMeetingStats = () => {
  const { meetings } = useMeetings();

  const stats = {
    total: meetings.length,
    completed: meetings.filter((m) => m.status === 'COMPLETED').length,
    processing: meetings.filter((m) => m.status === 'PROCESSING').length,
    failed: meetings.filter((m) => m.status === 'FAILED').length,
    byCategory: {},
    totalDuration: 0,
  };

  meetings.forEach((meeting) => {
    stats.byCategory[meeting.category] = (stats.byCategory[meeting.category] || 0) + 1;
    if (meeting.duration) {
      stats.totalDuration += meeting.duration;
    }
  });

  return stats;
};


export const useSearchMeetings = (searchQuery) => {
  const { meetings } = useMeetings();

  if (!searchQuery || searchQuery.trim() === '') {
    return meetings;
  }

  const query = searchQuery.toLowerCase();

  return meetings.filter(
    (meeting) =>
      meeting.title.toLowerCase().includes(query) ||
      meeting.description?.toLowerCase().includes(query) ||
      meeting.transcript?.toLowerCase().includes(query) ||
      meeting.summary?.toLowerCase().includes(query)
  );
};


export const useRecentMeetings = (limit = 5) => {
  const { meetings } = useMeetings();

  return meetings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
};


export const useCanRecord = () => {
  const { isRecording, recordingSeconds } = useMeetings();

  const MAX_RECORDING_TIME = 600; 

  return {
    canRecord: !isRecording,
    isRecording,
    timeRemaining: MAX_RECORDING_TIME - recordingSeconds,
    isNearLimit: recordingSeconds >= MAX_RECORDING_TIME * 0.9, 
  };
};

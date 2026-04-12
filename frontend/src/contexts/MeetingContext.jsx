import { createContext, useContext, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import RecordRTC from 'recordrtc';
import api from '../services/api';

const MeetingContext = createContext(null);

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within MeetingProvider');
  }
  return context;
};

export const MeetingProvider = ({ children }) => {
  const [meetings, setMeetings] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const fetchingRef = useRef(false); 

  const stopRecordingInternal = useCallback(() => {
    return new Promise((resolve) => {
      if (!recorderRef.current) {
        resolve({ success: false, error: 'No active recording' });
        return;
      }

      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current.getBlob();

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        recorderRef.current = null;

        resolve({ success: true, blob });
      });
    });
  }, []);

  const fetchMeetings = useCallback(async (filters = {}) => {
    if (fetchingRef.current) {
      return { success: false, error: 'Fetch already in progress' };
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const { data } = await api.get(`/meetings?${params}`);
      setMeetings(data.data);
      return { success: true, data: data.data };
    } catch (err) {
      console.error('Fetch meetings failed:', err);
      return { success: false, error: err.response?.data?.error || 'Failed to fetch meetings' };
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  const fetchMeeting = useCallback(async (id) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/meetings/${id}`);
      setCurrentMeeting(data.data);
      return { success: true, data: data.data };
    } catch (err) {
      console.error('Fetch meeting failed:', err);
      return { success: false, error: err.response?.data?.error || 'Failed to fetch meeting' };
    } finally {
      setLoading(false);
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 600) {
            stopRecordingInternal();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      return { success: true };
    } catch (err) {
      console.error('Start recording failed:', err);
      return {
        success: false,
        error: 'Failed to start recording. Please check microphone permissions.',
      };
    }
  };

  const uploadMeeting = useCallback(async (meetingData) => {
    try {
      setLoading(true);

      const { audioFile, title, description, category, googleEventId, attendees } = meetingData;

      if (!audioFile) {
        throw new Error('No audio file provided');
      }

      const formData = new FormData();
      formData.append('audio', audioFile, 'meeting.wav');
      formData.append('title', title);
      formData.append('category', category);
      if (description) {
        formData.append('description', description);
      }
      if (googleEventId) {
        formData.append('googleEventId', googleEventId);
      }
      if (attendees) {
        formData.append('attendees', JSON.stringify(attendees));
      }

      const { data } = await api.post('/meetings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMeetings((prev) => [data.data, ...prev]);

      return { success: true, data: data.data };
    } catch (err) {
      console.error('❌ Upload meeting failed:', err);
      return { success: false, error: err.response?.data?.error || 'Failed to upload meeting' };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMeeting = useCallback(
    async (id, updates) => {
      try {
        setLoading(true);
        const { data } = await api.patch(`/meetings/${id}`, updates);

        setMeetings((prev) => prev.map((meeting) => (meeting.id === id ? data.data : meeting)));

        if (currentMeeting?.id === id) {
          setCurrentMeeting(data.data);
        }

        return { success: true, data: data.data };
      } catch (err) {
        console.error('Update meeting failed:', err);
        return { success: false, error: err.response?.data?.error || 'Failed to update meeting' };
      } finally {
        setLoading(false);
      }
    },
    [currentMeeting]
  );

  const deleteMeeting = useCallback(
    async (id) => {
      try {
        setLoading(true);
        await api.delete(`/meetings/${id}`);

        setMeetings((prev) => prev.filter((meeting) => meeting.id !== id));

        if (currentMeeting?.id === id) {
          setCurrentMeeting(null);
        }

        return { success: true };
      } catch (err) {
        console.error('Delete meeting failed:', err);
        return { success: false, error: err.response?.data?.error || 'Failed to delete meeting' };
      } finally {
        setLoading(false);
      }
    },
    [currentMeeting]
  );

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const value = {
    meetings,
    currentMeeting,
    isRecording,
    recordingTime: formatTime(recordingTime),
    recordingSeconds: recordingTime,
    loading,
    fetchMeetings,
    fetchMeeting,
    startRecording,
    stopRecording: stopRecordingInternal,
    uploadMeeting,
    updateMeeting,
    deleteMeeting,
    setCurrentMeeting,
  };

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
};

MeetingProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MeetingContext;

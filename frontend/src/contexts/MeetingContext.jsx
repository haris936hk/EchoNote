import { createContext, useContext, useState, useRef } from 'react';
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

  // Fetch all meetings
  const fetchMeetings = async (filters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const { data } = await api.get(`/meetings?${params}`);
      setMeetings(data.data);
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Fetch meetings failed:', error);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch meetings' };
    } finally {
      setLoading(false);
    }
  };

  // Fetch single meeting
  const fetchMeeting = async (id) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/meetings/${id}`);
      setCurrentMeeting(data.data);
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Fetch meeting failed:', error);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch meeting' };
    } finally {
      setLoading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 180) { // 3 minutes = 180 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('Start recording failed:', error);
      return { success: false, error: 'Failed to start recording. Please check microphone permissions.' };
    }
  };

  // Stop recording
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (!recorderRef.current) {
        resolve({ success: false, error: 'No active recording' });
        return;
      }

      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current.getBlob();
        
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Stop stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        recorderRef.current = null;

        resolve({ success: true, blob });
      });
    });
  };

  // Upload meeting
  const uploadMeeting = async (audioBlob, meetingData) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'meeting.webm');
      formData.append('title', meetingData.title);
      formData.append('category', meetingData.category);
      if (meetingData.description) {
        formData.append('description', meetingData.description);
      }

      const { data } = await api.post('/meetings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add to meetings list
      setMeetings((prev) => [data.data, ...prev]);

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Upload meeting failed:', error);
      return { success: false, error: error.response?.data?.error || 'Failed to upload meeting' };
    } finally {
      setLoading(false);
    }
  };

  // Update meeting
  const updateMeeting = async (id, updates) => {
    try {
      setLoading(true);
      const { data } = await api.put(`/meetings/${id}`, updates);
      
      // Update in list
      setMeetings((prev) =>
        prev.map((meeting) => (meeting.id === id ? data.data : meeting))
      );
      
      // Update current if viewing
      if (currentMeeting?.id === id) {
        setCurrentMeeting(data.data);
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Update meeting failed:', error);
      return { success: false, error: error.response?.data?.error || 'Failed to update meeting' };
    } finally {
      setLoading(false);
    }
  };

  // Delete meeting
  const deleteMeeting = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/meetings/${id}`);
      
      // Remove from list
      setMeetings((prev) => prev.filter((meeting) => meeting.id !== id));
      
      // Clear current if viewing
      if (currentMeeting?.id === id) {
        setCurrentMeeting(null);
      }

      return { success: true };
    } catch (error) {
      console.error('Delete meeting failed:', error);
      return { success: false, error: error.response?.data?.error || 'Failed to delete meeting' };
    } finally {
      setLoading(false);
    }
  };

  // Format recording time
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
    stopRecording,
    uploadMeeting,
    updateMeeting,
    deleteMeeting,
    setCurrentMeeting,
  };

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
};
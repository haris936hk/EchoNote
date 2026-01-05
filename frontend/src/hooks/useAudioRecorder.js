import { useState, useRef, useCallback, useEffect } from 'react';
import RecordRTC from 'recordrtc';

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const MAX_RECORDING_TIME = 180; // 3 minutes in seconds

  // Check browser compatibility
  const checkCompatibility = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        error: 'Audio recording is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.'
      };
    }
    return { supported: true };
  }, []);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);

      // Check compatibility
      const compat = checkCompatibility();
      if (!compat.supported) {
        setError(compat.error);
        return { success: false, error: compat.error };
      }

      // Request microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Create recorder
      const recorder = new RecordRTC(mediaStream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        timeSlice: 1000,
        ondataavailable: (blob) => {
          // Optional: handle data chunks
        }
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          
          // Auto-stop at 3 minutes
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          
          return newTime;
        });
      }, 1000);

      return { success: true };
    } catch (err) {
      console.error('Start recording error:', err);

      let errorMessage = 'Failed to start recording. ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Microphone is already in use by another application.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkCompatibility]);

  // Stop recording
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!recorderRef.current || !isRecording) {
        resolve({ success: false, error: 'No active recording' });
        return;
      }

      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current.getBlob();
        setAudioBlob(blob);

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Stop stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          setStream(null);
        }

        setIsRecording(false);
        setIsPaused(false);
        recorderRef.current = null;

        resolve({ success: true, blob, duration: recordingTime });
      });
    });
  }, [isRecording, recordingTime]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!recorderRef.current || !isRecording || isPaused) return;

    recorderRef.current.pauseRecording();
    setIsPaused(true);

    // Pause timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return { success: true };
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!recorderRef.current || !isRecording || !isPaused) return;

    recorderRef.current.resumeRecording();
    setIsPaused(false);

    // Resume timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        const newTime = prev + 1;
        if (newTime >= MAX_RECORDING_TIME) {
          stopRecording();
          return MAX_RECORDING_TIME;
        }
        return newTime;
      });
    }, 1000);

    return { success: true };
  }, [isRecording, isPaused, stopRecording]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (!isRecording) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop and destroy recorder
    if (recorderRef.current) {
      try {
        recorderRef.current.stopRecording(() => {
          recorderRef.current.destroy();
          recorderRef.current = null;
        });
      } catch (err) {
        console.error('Cancel recording error:', err);
      }
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);

    return { success: true };
  }, [isRecording]);

  // Reset hook state
  const reset = useCallback(() => {
    setRecordingTime(0);
    setAudioBlob(null);
    setError(null);
    setIsPaused(false);
  }, []);

  // Get recording stats
  const getStats = useCallback(() => {
    return {
      duration: recordingTime,
      durationFormatted: formatTime(recordingTime),
      maxDuration: MAX_RECORDING_TIME,
      maxDurationFormatted: formatTime(MAX_RECORDING_TIME),
      remainingTime: MAX_RECORDING_TIME - recordingTime,
      remainingTimeFormatted: formatTime(MAX_RECORDING_TIME - recordingTime),
      progress: (recordingTime / MAX_RECORDING_TIME) * 100,
      blobSize: audioBlob ? audioBlob.size : 0,
      blobSizeKB: audioBlob ? (audioBlob.size / 1024).toFixed(2) : 0
    };
  }, [recordingTime, audioBlob, formatTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (recorderRef.current) {
        try {
          recorderRef.current.destroy();
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    };
  }, []);

  return {
    // State
    isRecording,
    recordingTime,
    recordingTimeFormatted: formatTime(recordingTime),
    audioBlob,
    error,
    isPaused,
    stream,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    reset,

    // Utilities
    getStats,
    checkCompatibility,
    formatTime
  };
};

export default useAudioRecorder;
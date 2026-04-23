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
  const recordingTimeRef = useRef(0);

  const MAX_RECORDING_TIME = 600; 

  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  const checkCompatibility = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        error:
          'Audio recording is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.',
      };
    }
    return { supported: true };
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!recorderRef.current || !isRecording) {
        resolve({ success: false, error: 'No active recording' });
        return;
      }

      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current.getBlob();
        setAudioBlob(blob);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setStream(null);
        }

        setIsRecording(false);
        setIsPaused(false);
        recorderRef.current = null;

        resolve({ success: true, blob, duration: recordingTimeRef.current });
      });
    });
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);

      const compat = checkCompatibility();
      if (!compat.supported) {
        setError(compat.error);
        return { success: false, error: compat.error };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      const recorder = new RecordRTC(mediaStream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        timeSlice: 1000,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

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
    } catch {
      return { success: false, error: 'Failed to start recording' };
    }
  }, [checkCompatibility, stopRecording]);

  const pauseRecording = useCallback(() => {
    if (!recorderRef.current || !isRecording || isPaused) return;

    recorderRef.current.pauseRecording();
    setIsPaused(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return { success: true };
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (!recorderRef.current || !isRecording || !isPaused) return;

    recorderRef.current.resumeRecording();
    setIsPaused(false);

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

  const cancelRecording = useCallback(() => {
    if (!isRecording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recorderRef.current) {
      try {
        recorderRef.current.stopRecording(() => {
          if (recorderRef.current) {
            recorderRef.current.destroy();
            recorderRef.current = null;
          }
        });
      } catch (err) {
        console.error('Cancel recording error:', err);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);

    return { success: true };
  }, [isRecording]);

  const reset = useCallback(() => {
    setRecordingTime(0);
    setAudioBlob(null);
    setError(null);
    setIsPaused(false);
  }, []);

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
      blobSizeKB: audioBlob ? (audioBlob.size / 1024).toFixed(2) : 0,
    };
  }, [recordingTime, audioBlob, formatTime]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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
    isRecording,
    recordingTime,
    recordingTimeFormatted: formatTime(recordingTime),
    audioBlob,
    error,
    isPaused,
    stream,

    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    reset,

    getStats,
    checkCompatibility,
    formatTime,
  };
};

export default useAudioRecorder;

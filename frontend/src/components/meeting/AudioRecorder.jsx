import { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, Button, Progress, Chip } from '@heroui/react';
import { FiMic, FiSquare, FiAlertCircle } from 'react-icons/fi';
import { useMeeting } from '../../contexts/MeetingContext';

const AudioRecorder = ({ onRecordingComplete }) => {
  const { isRecording, recordingTime, recordingSeconds, startRecording, stopRecording } =
    useMeeting();

  const [error, setError] = useState(null);

  const MAX_RECORDING_TIME = 600;

  const handleStartRecording = async () => {
    setError(null);
    const result = await startRecording();

    if (!result.success) {
      setError(result.error);
    }
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();

    if (result.success && onRecordingComplete) {
      onRecordingComplete(result.blob);
    } else if (!result.success) {
      setError(result.error);
    }
  };

  const getProgressColor = () => {
    const percentage = (recordingSeconds / MAX_RECORDING_TIME) * 100;
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'primary';
  };

  const getRemainingTime = () => {
    const remaining = MAX_RECORDING_TIME - recordingSeconds;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} remaining`;
  };

  return (
    <Card className="w-full">
      <CardBody className="gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Record Meeting</h3>
          {isRecording && (
            <Chip
              color="danger"
              variant="flat"
              startContent={<span className="size-2 animate-pulse rounded-full bg-danger" />}
            >
              Recording
            </Chip>
          )}
        </div>

        {/* Recording Visualization */}
        <div className="flex flex-col items-center justify-center gap-6 py-8">
          {/* Microphone Icon with Animation */}
          <div className={`relative ${isRecording ? 'animate-pulse' : ''}`}>
            <div
              className={`
                flex size-32 items-center justify-center rounded-full
                ${
                  isRecording
                    ? 'border-4 border-danger bg-danger/10'
                    : 'border-4 border-primary bg-primary/10'
                }
                transition-all duration-300
              `}
            >
              <FiMic size={48} className={isRecording ? 'text-danger' : 'text-primary'} />
            </div>

            {/* Pulse rings when recording */}
            {isRecording && (
              <>
                <div className="absolute inset-0 animate-ping rounded-full bg-danger/20" />
                <div className="absolute inset-0 animate-ping rounded-full bg-danger/10 delay-75" />
              </>
            )}
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="font-mono text-4xl font-bold">{recordingTime}</p>
            {isRecording && <p className="mt-2 text-sm text-default-500">{getRemainingTime()}</p>}
          </div>

          {/* Progress Bar */}
          {isRecording && (
            <div className="w-full max-w-md">
              <Progress
                value={(recordingSeconds / MAX_RECORDING_TIME) * 100}
                color={getProgressColor()}
                className="w-full"
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!isRecording ? (
            <Button
              size="lg"
              color="primary"
              variant="solid"
              startContent={<FiMic size={20} />}
              onPress={handleStartRecording}
              className="min-w-[200px] font-semibold"
            >
              Start Recording
            </Button>
          ) : (
            <Button
              size="lg"
              color="danger"
              variant="solid"
              startContent={<FiSquare size={20} />}
              onPress={handleStopRecording}
              className="min-w-[200px] font-semibold"
            >
              Stop Recording
            </Button>
          )}
        </div>

        {/* Info/Error Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/10 p-4">
            <FiAlertCircle className="mt-0.5 shrink-0 text-danger" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-danger">Recording Error</p>
              <p className="mt-1 text-xs text-danger/80">{error}</p>
            </div>
          </div>
        )}

        {!isRecording && !error && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/10 p-4">
            <FiAlertCircle className="mt-0.5 shrink-0 text-primary" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">Recording Tips</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-primary/80">
                <li>Maximum recording time is 10 minutes</li>
                <li>Ensure your microphone is connected and permissions are granted</li>
                <li>Speak clearly and minimize background noise</li>
                <li>Recording will automatically stop at 10 minutes</li>
              </ul>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

AudioRecorder.propTypes = {
  onRecordingComplete: PropTypes.func,
};

export default AudioRecorder;

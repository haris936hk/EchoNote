import { useState } from 'react';
import { Card, CardBody, Button, Progress, Chip } from '@heroui/react';
import { FiMic, FiSquare, FiAlertCircle } from 'react-icons/fi';
import { useMeeting } from '../../contexts/MeetingContext';

const AudioRecorder = ({ onRecordingComplete }) => {
  const { isRecording, recordingTime, recordingSeconds, startRecording, stopRecording } =
    useMeeting();

  const [error, setError] = useState(null);

  const MAX_RECORDING_TIME = 600; // 10 minutes in seconds

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
              startContent={<span className="bg-danger size-2 animate-pulse rounded-full" />}
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
                    ? 'bg-danger/10 border-danger border-4'
                    : 'bg-primary/10 border-primary border-4'
                }
                transition-all duration-300
              `}
            >
              <FiMic size={48} className={isRecording ? 'text-danger' : 'text-primary'} />
            </div>

            {/* Pulse rings when recording */}
            {isRecording && (
              <>
                <div className="bg-danger/20 absolute inset-0 animate-ping rounded-full" />
                <div className="bg-danger/10 absolute inset-0 animate-ping rounded-full delay-75" />
              </>
            )}
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="font-mono text-4xl font-bold">{recordingTime}</p>
            {isRecording && <p className="text-default-500 mt-2 text-sm">{getRemainingTime()}</p>}
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
          <div className="bg-danger/10 border-danger/20 flex items-start gap-3 rounded-lg border p-4">
            <FiAlertCircle className="text-danger mt-0.5 shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-danger text-sm font-medium">Recording Error</p>
              <p className="text-danger/80 mt-1 text-xs">{error}</p>
            </div>
          </div>
        )}

        {!isRecording && !error && (
          <div className="bg-primary/10 border-primary/20 flex items-start gap-3 rounded-lg border p-4">
            <FiAlertCircle className="text-primary mt-0.5 shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-primary text-sm font-medium">Recording Tips</p>
              <ul className="text-primary/80 mt-2 list-inside list-disc space-y-1 text-xs">
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

export default AudioRecorder;

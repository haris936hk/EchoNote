import { useState } from 'react';
import { 
  Card, 
  CardBody, 
  Button, 
  Progress,
  Chip
} from '@nextui-org/react';
import { FiMic, FiSquare, FiAlertCircle } from 'react-icons/fi';
import { useMeeting } from '../../contexts/MeetingContext';

const AudioRecorder = ({ onRecordingComplete }) => {
  const { 
    isRecording, 
    recordingTime, 
    recordingSeconds,
    startRecording, 
    stopRecording 
  } = useMeeting();
  
  const [error, setError] = useState(null);

  const MAX_RECORDING_TIME = 180; // 3 minutes in seconds

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
              startContent={
                <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
              }
            >
              Recording
            </Chip>
          )}
        </div>

        {/* Recording Visualization */}
        <div className="flex flex-col items-center justify-center py-8 gap-6">
          {/* Microphone Icon with Animation */}
          <div className={`relative ${isRecording ? 'animate-pulse' : ''}`}>
            <div 
              className={`
                w-32 h-32 rounded-full flex items-center justify-center
                ${isRecording 
                  ? 'bg-danger/10 border-4 border-danger' 
                  : 'bg-primary/10 border-4 border-primary'
                }
                transition-all duration-300
              `}
            >
              <FiMic 
                size={48} 
                className={isRecording ? 'text-danger' : 'text-primary'} 
              />
            </div>
            
            {/* Pulse rings when recording */}
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-danger/20 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-danger/10 animate-ping delay-75" />
              </>
            )}
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="text-4xl font-bold font-mono">
              {recordingTime}
            </p>
            {isRecording && (
              <p className="text-sm text-default-500 mt-2">
                {getRemainingTime()}
              </p>
            )}
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
        <div className="flex gap-3 justify-center">
          {!isRecording ? (
            <Button
              size="lg"
              color="primary"
              variant="solid"
              startContent={<FiMic size={20} />}
              onPress={handleStartRecording}
              className="font-semibold min-w-[200px]"
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
              className="font-semibold min-w-[200px]"
            >
              Stop Recording
            </Button>
          )}
        </div>

        {/* Info/Error Messages */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-lg">
            <FiAlertCircle className="text-danger mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm text-danger font-medium">Recording Error</p>
              <p className="text-xs text-danger/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!isRecording && !error && (
          <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <FiAlertCircle className="text-primary mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm text-primary font-medium">Recording Tips</p>
              <ul className="text-xs text-primary/80 mt-2 space-y-1 list-disc list-inside">
                <li>Maximum recording time is 3 minutes</li>
                <li>Ensure your microphone is connected and permissions are granted</li>
                <li>Speak clearly and minimize background noise</li>
                <li>Recording will automatically stop at 3 minutes</li>
              </ul>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default AudioRecorder;
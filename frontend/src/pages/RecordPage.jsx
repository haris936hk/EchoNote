import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Progress,
  Chip,
  Divider
} from '@nextui-org/react';
import {
  FiMic,
  FiSquare,
  FiUpload,
  FiArrowLeft,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import { useMeeting } from '../contexts/MeetingContext';
import useAudioRecorder from '../hooks/useAudioRecorder';

const CATEGORIES = [
  { value: 'SALES', label: 'Sales' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'STANDUP', label: 'Standup' },
  { value: 'ONE_ON_ONE', label: 'One-on-One' },
  { value: 'OTHER', label: 'Other' }
];

const RecordPage = () => {
  const navigate = useNavigate();
  const { uploadMeeting, loading: uploadLoading } = useMeeting();

  const {
    isRecording,
    recordingTime,
    recordingTimeFormatted,
    audioBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    reset: resetRecorder
  } = useAudioRecorder();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER'
  });

  const [formErrors, setFormErrors] = useState({});
  const [uploadError, setUploadError] = useState(null);
  const [step, setStep] = useState('record'); // record, details, uploading, success

  const MAX_RECORDING_TIME = 180; // 3 minutes
  const progress = (recordingTime / MAX_RECORDING_TIME) * 100;

  const handleStartRecording = async () => {
    const result = await startRecording();
    if (!result.success) {
      // Error already set by hook
    }
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result.success) {
      setStep('details');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!audioBlob) {
      setUploadError('No audio recorded. Please record audio first.');
      return;
    }

    setStep('uploading');
    setUploadError(null);

    try {
      const result = await uploadMeeting({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        audioFile: audioBlob
      });

      if (result.success) {
        setStep('success');
        // Redirect to meeting detail after 2 seconds
        setTimeout(() => {
          navigate(`/meeting/${result.data.id}`);
        }, 2000);
      } else {
        setUploadError(result.error || 'Failed to upload meeting');
        setStep('details');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('An unexpected error occurred. Please try again.');
      setStep('details');
    }
  };

  const handleReset = () => {
    resetRecorder();
    setFormData({ title: '', description: '', category: 'OTHER' });
    setFormErrors({});
    setUploadError(null);
    setStep('record');
  };

  const handleBack = () => {
    if (step === 'details' && audioBlob) {
      const confirmed = window.confirm(
        'Going back will discard your recording. Are you sure?'
      );
      if (confirmed) {
        handleReset();
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back Button */}
        <Button
          variant="light"
          startContent={<FiArrowLeft size={18} />}
          onPress={handleBack}
          className="mb-6"
        >
          Back
        </Button>

        {/* Main Card */}
        <Card>
          <CardHeader className="flex-col items-start gap-2 px-6 py-4">
            <h1 className="text-2xl font-bold">
              {step === 'record' && 'Record Meeting'}
              {step === 'details' && 'Meeting Details'}
              {step === 'uploading' && 'Uploading...'}
              {step === 'success' && 'Success!'}
            </h1>
            <p className="text-sm text-default-500">
              {step === 'record' && 'Record up to 3 minutes of audio'}
              {step === 'details' && 'Add details about your meeting'}
              {step === 'uploading' && 'Processing your recording...'}
              {step === 'success' && 'Your meeting is being processed'}
            </p>
          </CardHeader>

          <Divider />

          <CardBody className="gap-6 p-6">
            {/* Step 1: Recording */}
            {step === 'record' && (
              <>
                {/* Timer Display */}
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 bg-primary/10 rounded-full mb-6">
                    <FiMic
                      size={64}
                      className={isRecording ? 'text-danger animate-pulse' : 'text-primary'}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-5xl font-mono font-bold">
                      {recordingTimeFormatted}
                    </p>
                    <p className="text-sm text-default-500">
                      {isRecording
                        ? `${Math.floor((MAX_RECORDING_TIME - recordingTime) / 60)}:${String((MAX_RECORDING_TIME - recordingTime) % 60).padStart(2, '0')} remaining`
                        : 'Ready to record'}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {isRecording && (
                  <Progress
                    value={progress}
                    color={progress > 90 ? 'danger' : 'primary'}
                    className="mb-4"
                  />
                )}

                {/* Recording Error */}
                {recordingError && (
                  <Card className="border-danger/20 bg-danger/5">
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <FiAlertCircle className="text-danger mt-0.5 flex-shrink-0" size={20} />
                        <p className="text-sm text-danger">{recordingError}</p>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Recording Controls */}
                <div className="flex flex-col items-center gap-4">
                  {!isRecording && !audioBlob && (
                    <Button
                      color="primary"
                      size="lg"
                      startContent={<FiMic size={24} />}
                      onPress={handleStartRecording}
                      className="min-w-[200px]"
                    >
                      Start Recording
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      color="danger"
                      size="lg"
                      startContent={<FiSquare size={24} />}
                      onPress={handleStopRecording}
                      className="min-w-[200px]"
                    >
                      Stop Recording
                    </Button>
                  )}

                  {audioBlob && !isRecording && (
                    <>
                      <div className="w-full space-y-4">
                        <Card className="border-success/20 bg-success/5">
                          <CardBody>
                            <div className="flex items-center gap-3">
                              <FiCheck className="text-success" size={20} />
                              <div className="flex-1">
                                <p className="font-semibold text-success">
                                  Recording Complete
                                </p>
                                <p className="text-xs text-success/80">
                                  Duration: {recordingTimeFormatted} | Size: {(audioBlob.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                          </CardBody>
                        </Card>

                        {/* Audio Playback */}
                        <audio
                          src={URL.createObjectURL(audioBlob)}
                          controls
                          className="w-full"
                        />
                      </div>

                      <div className="flex gap-3 w-full">
                        <Button
                          variant="flat"
                          onPress={handleReset}
                          fullWidth
                        >
                          Re-record
                        </Button>
                        <Button
                          color="primary"
                          onPress={() => setStep('details')}
                          fullWidth
                        >
                          Continue
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Tips */}
                <Card className="bg-primary/5 border border-primary/20">
                  <CardBody className="gap-2">
                    <p className="text-sm font-semibold text-primary">
                      Tips for better results:
                    </p>
                    <ul className="text-xs text-primary/80 space-y-1 ml-4">
                      <li>• Speak clearly and minimize background noise</li>
                      <li>• Keep the meeting under 3 minutes</li>
                      <li>• Use a good quality microphone if available</li>
                      <li>• Avoid overlapping speech</li>
                    </ul>
                  </CardBody>
                </Card>
              </>
            )}

            {/* Step 2: Details Form */}
            {step === 'details' && (
              <>
                <div className="space-y-4">
                  {/* Title */}
                  <Input
                    label="Meeting Title"
                    placeholder="e.g., Q1 Planning Session"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    isRequired
                    isInvalid={!!formErrors.title}
                    errorMessage={formErrors.title}
                    size="lg"
                  />

                  {/* Description */}
                  <Textarea
                    label="Description (Optional)"
                    placeholder="Add any additional context or notes..."
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    minRows={3}
                  />

                  {/* Category */}
                  <Select
                    label="Category"
                    placeholder="Select a category"
                    selectedKeys={[formData.category]}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    isRequired
                    isInvalid={!!formErrors.category}
                    errorMessage={formErrors.category}
                  >
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Upload Error */}
                {uploadError && (
                  <Card className="border-danger/20 bg-danger/5">
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <FiAlertCircle className="text-danger mt-0.5 flex-shrink-0" size={20} />
                        <p className="text-sm text-danger">{uploadError}</p>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="flat"
                    onPress={() => setStep('record')}
                    fullWidth
                  >
                    Back
                  </Button>
                  <Button
                    color="primary"
                    startContent={<FiUpload size={18} />}
                    onPress={handleSubmit}
                    isLoading={uploadLoading}
                    fullWidth
                  >
                    Upload Meeting
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Uploading */}
            {step === 'uploading' && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6">
                  <FiUpload size={48} className="text-primary animate-bounce" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Uploading your meeting...
                </h3>
                <p className="text-default-500 mb-6">
                  This may take a few moments
                </p>
                <Progress isIndeterminate color="primary" className="max-w-md mx-auto" />
              </div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-success/10 rounded-full mb-6">
                  <FiCheck size={48} className="text-success" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Meeting Uploaded Successfully!
                </h3>
                <p className="text-default-500 mb-6">
                  Your meeting is now being processed. You'll receive an email when it's ready.
                </p>
                <Chip color="success" variant="flat">
                  Redirecting to meeting details...
                </Chip>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default RecordPage;
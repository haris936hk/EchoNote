import { useState, useEffect } from 'react';
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
} from '@heroui/react';
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
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const MAX_RECORDING_TIME = 180; // 3 minutes
  const progress = (recordingTime / MAX_RECORDING_TIME) * 100;

  // Handle scroll to show/hide header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
      {/* Sticky Header with Smooth Fade */}
      <div
        className={`sticky top-[65px] z-40 bg-gradient-to-r from-background/95 via-background/98 to-background/95 backdrop-blur-xl backdrop-saturate-150 border-b border-divider/20 shadow-lg px-4 py-5 ${
          showHeader
            ? 'translate-y-0 opacity-100'
            : '-translate-y-1 opacity-0 pointer-events-none'
        }`}
        style={{
          willChange: 'transform, opacity',
          transition: 'opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        <div className="container mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {step === 'record' && 'Record Meeting'}
              {step === 'details' && 'Meeting Details'}
              {step === 'uploading' && 'Uploading...'}
              {step === 'success' && 'Success!'}
            </h1>
            <p className="text-sm text-default-500 mt-1">
              {step === 'record' && 'Record up to 3 minutes of audio'}
              {step === 'details' && 'Add details about your meeting'}
              {step === 'uploading' && 'Processing your recording...'}
              {step === 'success' && 'Your meeting is being processed'}
            </p>
          </div>
          <Button
            variant="light"
            startContent={<FiArrowLeft size={18} />}
            onPress={handleBack}
            radius="full"
            className="shadow-md hover:shadow-lg transition-all duration-300"
          >
            Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl pt-4">
        {/* Main Card */}
        <Card className="border-divider/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-xl">
          <Divider />

          <CardBody className="gap-6 p-6">
            {/* Step 1: Recording */}
            {step === 'record' && (
              <>
                {/* Timer Display */}
                <div className="text-center py-8">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className={`relative w-32 h-32 ${isRecording ? 'bg-gradient-to-br from-danger/20 to-danger/30' : 'bg-gradient-to-br from-primary/20 to-secondary/20'} rounded-3xl flex items-center justify-center mx-auto shadow-2xl ${isRecording ? 'shadow-danger/25' : 'shadow-primary/25'} backdrop-blur-sm border ${isRecording ? 'border-danger/20' : 'border-primary/20'}`}>
                      <FiMic
                        size={64}
                        className={isRecording ? 'text-danger animate-pulse' : 'text-primary'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-5xl font-mono font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
                      radius="full"
                      className="min-w-[200px] font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
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
                      radius="full"
                      className="min-w-[200px] font-semibold shadow-lg shadow-danger/30 hover:shadow-xl hover:shadow-danger/40 hover:scale-105 transition-all duration-300"
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
                          radius="full"
                          className="font-semibold hover:scale-105 transition-all duration-300"
                        >
                          Re-record
                        </Button>
                        <Button
                          color="primary"
                          onPress={() => setStep('details')}
                          fullWidth
                          radius="full"
                          className="font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
                        >
                          Continue
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Tips */}
                <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 shadow-lg">
                  <CardBody className="gap-2">
                    <p className="text-sm font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      💡 Tips for better results:
                    </p>
                    <ul className="text-xs text-default-600 space-y-1 ml-4">
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
                    radius="full"
                    className="font-semibold hover:scale-105 transition-all duration-300"
                  >
                    Back
                  </Button>
                  <Button
                    color="primary"
                    startContent={<FiUpload size={18} />}
                    onPress={handleSubmit}
                    isLoading={uploadLoading}
                    fullWidth
                    radius="full"
                    className="font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
                  >
                    Upload Meeting
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Uploading */}
            {step === 'uploading' && (
              <div className="text-center py-12">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/25 backdrop-blur-sm border border-primary/20">
                    <FiUpload size={48} className="text-primary animate-bounce" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-success/20 to-success/30 rounded-full blur-3xl animate-pulse"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-br from-success/20 to-success/30 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-success/25 backdrop-blur-sm border border-success/20">
                    <FiCheck size={48} className="text-success" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-success to-success/80 bg-clip-text text-transparent">
                  Meeting Uploaded Successfully!
                </h3>
                <p className="text-default-500 mb-6">
                  Your meeting is now being processed. You'll receive an email when it's ready.
                </p>
                <Chip color="success" variant="flat" radius="full" className="shadow-md">
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
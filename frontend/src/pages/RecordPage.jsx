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
  FiAlertCircle,
  FiArrowUp
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
    category: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [uploadError, setUploadError] = useState(null);
  const [step, setStep] = useState('record'); // record, details, uploading, success
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const MAX_RECORDING_TIME = 180; // 3 minutes
  const progress = (recordingTime / MAX_RECORDING_TIME) * 100;

  // Handle scroll to show/hide header and scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowHeader(true);
        setShowScrollTop(false);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false);
        setShowScrollTop(true);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
        setShowScrollTop(currentScrollY > 300);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    // Prevent unnecessary updates if value hasn't changed
    setFormData(prev => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
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
    setFormData({ title: '', description: '', category: '' });
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
      {/* Page Header - Slides down when navbar slides up */}
      <div
        className={`fixed top-0 left-0 right-0 z-[45] px-4 pt-2 pb-0 transition-all duration-500 ease-in-out ${
          !showHeader
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          willChange: 'transform, opacity'
        }}
      >
        {/* Centered wrapper */}
        <div className="max-w-6xl mx-auto flex justify-center">
          {/* Rounded container with subtle border */}
          <nav className="inline-flex items-center gap-6 px-6 py-2.5 rounded-full border border-gray-700/30 bg-gray-900/30 backdrop-blur-md backdrop-saturate-150">
            {/* Title with icon (changes based on step) */}
            <div className="flex items-center gap-2 text-default-foreground">
              {step === 'record' && <FiMic size={20} />}
              {step === 'details' && <FiUpload size={20} />}
              {step === 'uploading' && <FiUpload size={20} className="animate-bounce" />}
              {step === 'success' && <FiCheck size={20} />}
              <span className="font-semibold text-sm">
                {step === 'record' && 'Record Meeting'}
                {step === 'details' && 'Meeting Details'}
                {step === 'uploading' && 'Uploading...'}
                {step === 'success' && 'Success!'}
              </span>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-700/30"></div>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-medium text-default-500 hover:text-primary transition-colors"
            >
              <FiArrowLeft size={16} />
              Back
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl pt-4">
        {/* Main Card */}
        <Card className="border-divider/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-xl rounded-3xl border-2 border-primary/20 hover:border-primary/30 transition-all duration-500">
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
                  <Card className="border-danger/20 bg-danger/5 rounded-3xl hover:border-danger/40 transition-all duration-300">
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
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500"></div>
                      <Button
                        color="primary"
                        size="lg"
                        startContent={<FiMic size={24} />}
                        onPress={handleStartRecording}
                        className="relative min-w-[200px] font-semibold shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/60 hover:scale-105 transition-all duration-300 rounded-3xl"
                      >
                        Start Recording
                      </Button>
                    </div>
                  )}

                  {isRecording && (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-danger to-danger opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500"></div>
                      <Button
                        color="danger"
                        size="lg"
                        startContent={<FiSquare size={24} />}
                        onPress={handleStopRecording}
                        className="relative min-w-[200px] font-semibold shadow-xl shadow-danger/40 hover:shadow-2xl hover:shadow-danger/60 hover:scale-105 transition-all duration-300 rounded-3xl"
                      >
                        Stop Recording
                      </Button>
                    </div>
                  )}

                  {audioBlob && !isRecording && (
                    <>
                      <div className="w-full space-y-4">
                        <Card className="border-success/20 bg-success/5 rounded-3xl hover:border-success/40 transition-all duration-300">
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
                          className="font-semibold rounded-3xl hover:bg-default-100 hover:scale-105 transition-all duration-300"
                        >
                          Re-record
                        </Button>
                        <div className="relative group flex-1">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-300 rounded-3xl"></div>
                          <Button
                            color="primary"
                            onPress={() => setStep('details')}
                            fullWidth
                            className="relative font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300 rounded-3xl"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Tips */}
                <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 shadow-lg rounded-3xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
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
                <div className="space-y-6">
                  {/* Title */}
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-2">
                      Meeting Title <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="e.g., Q1 Planning Session"
                      value={formData.title}
                      onValueChange={(value) => handleFormChange('title', value)}
                      isRequired
                      isInvalid={!!formErrors.title}
                      errorMessage={formErrors.title}
                      size="sm"
                      classNames={{
                        input: "rounded-lg text-sm h-9 px-3",
                        inputWrapper: "rounded-lg hover:border-primary/30 focus-within:border-primary transition-all duration-300 h-9"
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-2">
                      Description (Optional)
                    </label>
                    <Textarea
                      placeholder="Add any additional context or notes..."
                      value={formData.description}
                      onValueChange={(value) => handleFormChange('description', value)}
                      minRows={3}
                      maxRows={6}
                      size="sm"
                      classNames={{
                        input: "rounded-lg text-sm resize-none px-3 pt-0 pb-3",
                        inputWrapper: "rounded-lg hover:border-primary/30 focus-within:border-primary transition-all duration-300"
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-2">
                      Category <span className="text-danger">*</span>
                    </label>
                    <Select
                      placeholder="Select a category"
                      selectedKeys={formData.category ? new Set([formData.category]) : new Set()}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0];
                        if (selected) handleFormChange('category', selected);
                      }}
                      isRequired
                      isInvalid={!!formErrors.category}
                      errorMessage={formErrors.category}
                      size="sm"
                      classNames={{
                        trigger: "rounded-lg hover:border-primary/30 focus-within:border-primary transition-all duration-300 h-9 pl-3 pr-8",
                        value: "text-sm text-left",
                        selectorIcon: "right-2"
                      }}
                    >
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Upload Error */}
                {uploadError && (
                  <Card className="border-danger/20 bg-danger/5 rounded-3xl hover:border-danger/40 transition-all duration-300">
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
                    variant="bordered"
                    onPress={() => setStep('record')}
                    fullWidth
                    startContent={<FiArrowLeft size={18} />}
                    className="font-semibold rounded-3xl border-default-300 hover:bg-default-100 hover:border-default-400 hover:scale-105 transition-all duration-300"
                  >
                    Back
                  </Button>
                  <div className="relative group flex-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-300 rounded-3xl"></div>
                    <Button
                      color="primary"
                      startContent={<FiUpload size={18} />}
                      onPress={handleSubmit}
                      isLoading={uploadLoading}
                      fullWidth
                      className="relative font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300 rounded-3xl whitespace-nowrap"
                    >
                      Upload Meeting
                    </Button>
                  </div>
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

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          isIconOnly
          color="primary"
          variant="shadow"
          className={`fixed bottom-8 right-8 z-50 w-14 h-14 shadow-2xl shadow-primary/50 hover:shadow-3xl hover:shadow-primary/60 transition-all duration-300 ${
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
          radius="full"
          onPress={scrollToTop}
        >
          <FiArrowUp size={24} />
        </Button>
      )}
    </div>
  );
};

export default RecordPage;
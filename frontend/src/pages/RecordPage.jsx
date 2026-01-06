import { useState, useEffect, useRef } from 'react';
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
  FiArrowUp,
  FiPause,
  FiPlay
} from 'react-icons/fi';
import { useMeeting } from '../contexts/MeetingContext';
import useAudioRecorder from '../hooks/useAudioRecorder';
import AudioVisualizer from '../components/AudioVisualizer';
import { validateAudioFileDuration } from '../utils/validators';
import { SUPPORTED_AUDIO_TYPES } from '../utils/constants';

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
    stream,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
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

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileValidating, setFileValidating] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_RECORDING_TIME = 600; // 10 minutes (updated from 180)
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

  const handlePauseRecording = () => {
    pauseRecording();
  };

  const handleResumeRecording = () => {
    resumeRecording();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setFileValidating(true);

    try {
      console.log('📁 File selected:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      // Validate file type
      if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
        setUploadError('Invalid file type. Supported formats: MP3, WAV, M4A, WEBM, OGG');
        setFileValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setUploadError(`File size (${fileSizeMB}MB) exceeds 50MB limit`);
        setFileValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (file.size === 0) {
        setUploadError('File is empty');
        setFileValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate duration
      const durationValidation = await validateAudioFileDuration(file);

      if (!durationValidation.isValid) {
        setUploadError(durationValidation.error);
        setFileValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      console.log('✅ File validation passed. Duration:', `${Math.floor(durationValidation.duration / 60)}m ${Math.floor(durationValidation.duration % 60)}s`);

      // Store uploaded file with duration info
      setUploadedFile({
        file,
        duration: durationValidation.duration,
        durationFormatted: `${Math.floor(durationValidation.duration / 60)}:${String(Math.floor(durationValidation.duration % 60)).padStart(2, '0')}`
      });
      setFileValidating(false);

    } catch (error) {
      console.error('❌ File validation error:', error);
      setUploadError('Failed to validate file. Please try again.');
      setFileValidating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    console.log('🔵 Upload button clicked');
    console.log('📋 Form data:', formData);
    console.log('🎤 Audio blob:', audioBlob);
    console.log('📁 Uploaded file:', uploadedFile);

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    // Use uploaded file if available, otherwise use recorded audio blob
    const audioSource = uploadedFile?.file || audioBlob;

    if (!audioSource) {
      console.log('❌ No audio source found');
      setUploadError('No audio available. Please record or upload audio first.');
      return;
    }

    console.log('✅ Starting upload process...');
    setStep('uploading');
    setUploadError(null);

    try {
      const result = await uploadMeeting({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        audioFile: audioSource
      });

      console.log('📬 Upload result:', result);

      if (result.success) {
        console.log('✅ Upload successful!');
        setStep('success');
        // Redirect to meeting detail after 2 seconds
        setTimeout(() => {
          navigate(`/meeting/${result.data.id}`);
        }, 2000);
      } else {
        console.log('❌ Upload failed:', result.error);
        setUploadError(result.error || 'Failed to upload meeting');
        setStep('details');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadError('An unexpected error occurred. Please try again.');
      setStep('details');
    }
  };

  const handleReset = () => {
    resetRecorder();
    setFormData({ title: '', description: '', category: '' });
    setFormErrors({});
    setUploadError(null);
    setUploadedFile(null);
    setFileValidating(false);
    setStep('record');

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBack = () => {
    if (step === 'details' && (audioBlob || uploadedFile)) {
      const confirmed = window.confirm(
        'Going back will discard your audio. Are you sure?'
      );
      if (confirmed) {
        handleReset();
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="h-screen bg-background flex items-center justify-center overflow-hidden">
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
          <nav className="inline-flex items-center gap-6 px-6 py-2.5 rounded-full border border-divider/50 bg-content1/90 backdrop-blur-md backdrop-saturate-150 shadow-lg">
            {/* Title with icon (changes based on step) */}
            <div className="flex items-center gap-2 text-default-foreground">
              {step === 'record' && (isPaused ? <FiPause size={20} className="text-warning" /> : <FiMic size={20} />)}
              {step === 'details' && <FiUpload size={20} />}
              {step === 'uploading' && <FiUpload size={20} className="animate-bounce" />}
              {step === 'success' && <FiCheck size={20} />}
              <span className="font-semibold text-sm">
                {step === 'record' && (isPaused ? 'Recording Paused' : 'Record Meeting')}
                {step === 'details' && 'Meeting Details'}
                {step === 'uploading' && 'Uploading...'}
                {step === 'success' && 'Success!'}
              </span>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-divider"></div>

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
      <div className="container mx-auto px-4 max-w-3xl w-full">
        {/* Main Card */}
        <Card className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-xl rounded-3xl border-2 border-default-200 dark:border-primary/20 hover:border-primary/30 transition-all duration-500 max-h-[90vh] overflow-hidden">
          <CardBody className="gap-4 p-6 overflow-hidden">
            {/* Step 1: Recording */}
            {step === 'record' && (
              <>
                {/* Timer Display */}
                <div className="text-center py-4">
                  <div className="relative mb-4">
                    <div className={`absolute inset-0 bg-gradient-to-r ${isRecording && !isPaused ? 'from-danger/20 to-danger/30' : 'from-primary/20 to-secondary/20'} rounded-full blur-3xl ${isRecording && !isPaused ? 'animate-pulse' : ''}`}></div>
                    <div className={`relative w-24 h-24 ${isRecording && !isPaused ? 'bg-gradient-to-br from-danger/20 to-danger/30' : isPaused ? 'bg-gradient-to-br from-warning/20 to-warning/30' : 'bg-gradient-to-br from-primary/20 to-secondary/20'} rounded-3xl flex items-center justify-center mx-auto shadow-2xl ${isRecording && !isPaused ? 'shadow-danger/25' : isPaused ? 'shadow-warning/25' : 'shadow-primary/25'} backdrop-blur-sm border ${isRecording && !isPaused ? 'border-danger/20' : isPaused ? 'border-warning/20' : 'border-primary/20'}`}>
                      <FiMic
                        size={48}
                        className={isRecording && !isPaused ? 'text-danger animate-pulse' : isPaused ? 'text-warning' : 'text-primary'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-5xl font-mono font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {recordingTimeFormatted}
                    </p>
                    <p className="text-sm text-default-500">
                      {isRecording && isPaused
                        ? 'Recording paused'
                        : isRecording
                        ? `${Math.floor((MAX_RECORDING_TIME - recordingTime) / 60)}:${String((MAX_RECORDING_TIME - recordingTime) % 60).padStart(2, '0')} remaining`
                        : 'Ready to record'}
                    </p>
                  </div>
                </div>

                {/* Audio Visualizer - Show when recording and not paused */}
                {isRecording && !isPaused && (
                  <div className="mb-2">
                    <AudioVisualizer stream={stream} isActive={isRecording} />
                  </div>
                )}

                {/* Progress Bar */}
                {isRecording && (
                  <Progress
                    value={progress}
                    color={progress > 90 ? 'danger' : 'primary'}
                    className="mb-2"
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
                  {!isRecording && !audioBlob && !uploadedFile && (
                    <>
                      {/* START RECORDING BUTTON */}
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
                        <Button
                          color="primary"
                          size="lg"
                          startContent={<FiMic size={24} />}
                          onPress={handleStartRecording}
                          isDisabled={fileValidating}
                          className="relative min-w-[240px] font-semibold shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15 hover:scale-105 transition-all duration-300 rounded-3xl"
                        >
                          Start Recording
                        </Button>
                      </div>

                      {/* DIVIDER */}
                      <div className="flex items-center gap-3 w-full max-w-xs">
                        <Divider className="flex-1" />
                        <span className="text-sm text-default-400 font-medium">OR</span>
                        <Divider className="flex-1" />
                      </div>

                      {/* UPLOAD FILE BUTTON */}
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
                        <Button
                          color="secondary"
                          size="lg"
                          startContent={<FiUpload size={24} />}
                          onPress={handleUploadClick}
                          isLoading={fileValidating}
                          isDisabled={fileValidating}
                          className="relative min-w-[240px] font-semibold shadow-md shadow-secondary/10 hover:shadow-lg hover:shadow-secondary/15 hover:scale-105 transition-all duration-300 rounded-3xl"
                        >
                          {fileValidating ? 'Validating...' : 'Upload Audio File'}
                        </Button>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp3,.wav,.m4a,.webm,.ogg,audio/mpeg,audio/wav,audio/mp3,audio/m4a,audio/x-m4a,audio/mp4,audio/webm,audio/ogg"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </>
                  )}

                  {isRecording && (
                    <div className="flex gap-3">
                      {/* Pause/Resume Button */}
                      {!isPaused ? (
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-warning to-warning opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
                          <Button
                            color="warning"
                            size="lg"
                            startContent={<FiPause size={24} />}
                            onPress={handlePauseRecording}
                            className="relative min-w-[180px] font-semibold shadow-md shadow-warning/10 hover:shadow-lg hover:shadow-warning/15 hover:scale-105 transition-all duration-300 rounded-3xl"
                          >
                            Pause
                          </Button>
                        </div>
                      ) : (
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-success to-success opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
                          <Button
                            color="success"
                            size="lg"
                            startContent={<FiPlay size={24} />}
                            onPress={handleResumeRecording}
                            className="relative min-w-[180px] font-semibold shadow-md shadow-success/10 hover:shadow-lg hover:shadow-success/15 hover:scale-105 transition-all duration-300 rounded-3xl"
                          >
                            Resume
                          </Button>
                        </div>
                      )}

                      {/* Stop Button */}
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-danger to-danger opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
                        <Button
                          color="danger"
                          size="lg"
                          startContent={<FiSquare size={24} />}
                          onPress={handleStopRecording}
                          className="relative min-w-[180px] font-semibold shadow-md shadow-danger/10 hover:shadow-lg hover:shadow-danger/15 hover:scale-105 transition-all duration-300 rounded-3xl"
                        >
                          Stop
                        </Button>
                      </div>
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

                      <div className="flex justify-between items-center w-full">
                        <Button
                          variant="bordered"
                          onPress={handleReset}
                          className="font-semibold rounded-3xl border-default-300 hover:bg-default-100 hover:border-default-400 hover:scale-105 transition-all duration-300"
                        >
                          Re-record
                        </Button>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 blur-lg transition-opacity duration-300 rounded-3xl"></div>
                          <Button
                            color="primary"
                            onPress={() => setStep('details')}
                            className="relative font-semibold shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15 hover:scale-105 transition-all duration-300 rounded-3xl"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Uploaded File Preview */}
                  {uploadedFile && !isRecording && (
                    <>
                      <div className="w-full space-y-4">
                        <Card className="border-success/20 bg-success/5 rounded-3xl hover:border-success/40 transition-all duration-300">
                          <CardBody>
                            <div className="flex items-center gap-3">
                              <FiCheck className="text-success" size={20} />
                              <div className="flex-1">
                                <p className="font-semibold text-success">
                                  File Uploaded Successfully
                                </p>
                                <p className="text-xs text-success/80">
                                  {uploadedFile.file.name} | Duration: {uploadedFile.durationFormatted} | Size: {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                          </CardBody>
                        </Card>

                        {/* Audio Playback */}
                        <audio
                          src={URL.createObjectURL(uploadedFile.file)}
                          controls
                          className="w-full"
                        />
                      </div>

                      <div className="flex justify-between items-center w-full">
                        <Button
                          variant="bordered"
                          onPress={handleReset}
                          className="font-semibold rounded-3xl border-default-300 hover:bg-default-100 hover:border-default-400 hover:scale-105 transition-all duration-300"
                        >
                          Choose Different File
                        </Button>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 blur-lg transition-opacity duration-300 rounded-3xl"></div>
                          <Button
                            color="primary"
                            onPress={() => setStep('details')}
                            className="relative font-semibold shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15 hover:scale-105 transition-all duration-300 rounded-3xl"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Tips - Only show when not recording and no audio recorded */}
                {!isRecording && !audioBlob && !uploadedFile && (
                  <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 shadow-lg rounded-3xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
                    <CardBody className="gap-2">
                      <p className="text-sm font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        💡 Tips for better results:
                      </p>
                      <ul className="text-xs text-default-600 space-y-1 ml-4">
                        <li>• <strong>Live Recording or File Upload:</strong> Up to 10 minutes, 50MB max</li>
                        <li>• <strong>Supported formats:</strong> MP3, WAV, M4A, WEBM, OGG</li>
                        <li>• Use a good quality microphone for recordings</li>
                        <li>• Avoid overlapping speech for better transcription</li>
                      </ul>
                    </CardBody>
                  </Card>
                )}
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
                        selectorIcon: "right-2",
                        popoverContent: "rounded-xl",
                        listbox: "rounded-xl"
                      }}
                    >
                      {CATEGORIES.map((category) => (
                        <SelectItem
                          key={category.value}
                          value={category.value}
                          classNames={{
                            base: "hover:bg-primary/10 hover:scale-[1.01] transition-all duration-200 cursor-pointer rounded-lg data-[hover=true]:bg-primary/10 pl-4",
                            title: "text-sm"
                          }}
                        >
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
                <div className="flex justify-between items-center">
                  <Button
                    variant="bordered"
                    onPress={() => setStep('record')}
                    startContent={<FiArrowLeft size={18} />}
                    className="font-semibold rounded-3xl border-default-300 hover:bg-default-100 hover:border-default-400 hover:scale-105 transition-all duration-300"
                  >
                    Back
                  </Button>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 blur-lg transition-opacity duration-300 rounded-3xl"></div>
                    <Button
                      color="primary"
                      startContent={<FiUpload size={18} />}
                      onPress={handleSubmit}
                      isLoading={uploadLoading}
                      className="relative font-semibold shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15 hover:scale-105 transition-all duration-300 rounded-3xl whitespace-nowrap"
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
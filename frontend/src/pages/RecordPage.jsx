import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Progress, Select, SelectItem } from '@heroui/react';
import {
  LuMic as Mic,
  LuSquare as Square,
  LuUpload as Upload,
  LuArrowLeft as ArrowLeft,
  LuCheck as Check,
  LuAlertCircle as AlertCircle,
  LuPause as Pause,
  LuPlay as Play,
  LuCheckCircle as CheckCircle,
} from 'react-icons/lu';
import { useMeeting } from '../contexts/MeetingContext';
import useAudioRecorder from '../hooks/useAudioRecorder';
import AudioVisualizer from '../components/AudioVisualizer';
import { validateAudioFileDuration } from '../utils/validators';
import { SUPPORTED_AUDIO_TYPES } from '../utils/constants';
import api from '../services/api';

const CATEGORIES = [
  { value: 'SALES', label: 'Sales' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'STANDUP', label: 'Standup' },
  { value: 'ONE_ON_ONE', label: 'One-on-One' },
  { value: 'OTHER', label: 'Other' },
];

const RecordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const calendarState = location.state || null;
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
    reset: resetRecorder,
  } = useAudioRecorder();

  const [formData, setFormData] = useState({
    title: calendarState?.title || '',
    description: '',
    category: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [uploadError, setUploadError] = useState(null);
  const [step, setStep] = useState('record');

  // Processing state
  const [processingMeetingId, setProcessingMeetingId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileValidating, setFileValidating] = useState(false);
  const fileInputRef = useRef(null);

  const PIPELINE_STEPS = [
    { key: 'UPLOADING', label: 'Upload' },
    { key: 'PROCESSING_AUDIO', label: 'Audio Optimization' },
    { key: 'TRANSCRIBING', label: 'Transcribing' },
    { key: 'PROCESSING_NLP', label: 'NLP Analysis' },
    { key: 'SUMMARIZING', label: 'Generating Summary' },
  ];

  const MAX_RECORDING_TIME = 600;
  const progress = (recordingTime / MAX_RECORDING_TIME) * 100;
  const remainingTime = MAX_RECORDING_TIME - recordingTime;
  const remainingFormatted = `${Math.floor(remainingTime / 60)}:${String(Math.floor(remainingTime % 60)).padStart(2, '0')}`;

  // Auto-stop at limit
  useEffect(() => {
    if (recordingTime >= MAX_RECORDING_TIME && isRecording) {
      stopRecording().then((result) => {
        if (result.success) setStep('details');
      });
    }
  }, [recordingTime, isRecording, stopRecording]);

  // Move to details when we have uploaded file
  useEffect(() => {
    if (uploadedFile && step === 'record') {
      setStep('details');
    }
  }, [uploadedFile, step]);

  // Polling for processing status
  useEffect(() => {
    if (step !== 'processing' || !processingMeetingId) return;

    let pollInterval;
    const checkStatus = async () => {
      try {
        const { data } = await api.get(`/meetings/${processingMeetingId}/status`);
        if (data.success) {
          setProcessingStatus(data.data);

          if (data.data.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setStep('success');
            setTimeout(() => navigate(`/meeting/${processingMeetingId}`), 2000);
          } else if (data.data.status === 'FAILED') {
            clearInterval(pollInterval);
            setUploadError(data.data.error || 'Processing failed. Please try again.');
            setStep('details');
          }
        }
      } catch (err) {
        console.error('Failed to get processing status', err);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds
    pollInterval = setInterval(checkStatus, 3000);

    return () => clearInterval(pollInterval);
  }, [step, processingMeetingId, navigate]);

  const handleStartRecording = async () => {
    const result = await startRecording();
    if (!result.success) {
      /* error set by hook */
    }
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result.success) setStep('details');
  };

  const handlePauseRecording = () => pauseRecording();
  const handleResumeRecording = () => resumeRecording();

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setFileValidating(true);

    try {
      if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
        setUploadError('Invalid file type. Supported formats: MP3, WAV, M4A, WEBM, OGG');
        setFileValidating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 50MB limit`
        );
        setFileValidating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (file.size === 0) {
        setUploadError('File is empty');
        setFileValidating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const durationValidation = await validateAudioFileDuration(file);
      if (!durationValidation.isValid) {
        setUploadError(durationValidation.error);
        setFileValidating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setUploadedFile({
        file,
        duration: durationValidation.duration,
        durationFormatted: `${Math.floor(durationValidation.duration / 60)}:${String(Math.floor(durationValidation.duration % 60)).padStart(2, '0')}`,
      });
      setFileValidating(false);
    } catch {
      setUploadError('Failed to validate file. Please try again.');
      setFileValidating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    else if (formData.title.length < 3) errors.title = 'Title must be at least 3 characters';
    if (!formData.category) errors.category = 'Category is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const audioSource = uploadedFile?.file || audioBlob;
    if (!audioSource) {
      setUploadError('No audio available. Please record or upload audio first.');
      return;
    }

    setStep('uploading');
    setUploadError(null);

    try {
      const result = await uploadMeeting({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        audioFile: audioSource,
        googleEventId: calendarState?.googleEventId || null,
        attendees: calendarState?.attendees || null,
      });

      if (result.success) {
        setProcessingMeetingId(result.data.id);
        setProcessingStatus({
          status: result.data.status || 'UPLOADING',
          progress: 10,
          estimatedTimeRemaining: -1,
          currentStage: 'Uploading audio file...',
        });
        setStep('processing');
      } else {
        setUploadError(result.error || 'Failed to upload meeting');
        setStep('details');
      }
    } catch {
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
    setProcessingMeetingId(null);
    setProcessingStatus(null);
    setStep('record');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBack = () => {
    if (step === 'details' && (audioBlob || uploadedFile)) {
      const confirmed = window.confirm('Going back will discard your audio. Are you sure?');
      if (confirmed) handleReset();
    } else {
      navigate('/dashboard');
    }
  };

  // ── Determine halo state ──
  const isWarningZone = recordingTime > MAX_RECORDING_TIME * 0.8; // last 20%

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#020617' }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.webm,.ogg"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        {/* ════════════════════════════════════════════
            STEP 1: RECORD / IDLE / ACTIVE / PAUSED
            ════════════════════════════════════════════ */}
        {step === 'record' && (
          <div className="flex flex-col items-center space-y-8 text-center">
            {/* Recording Halo */}
            <div
              className={`recording-halo ${isRecording && !isPaused ? 'active' : ''} ${isPaused ? 'paused' : ''}`}
              style={
                isRecording && !isPaused && isWarningZone
                  ? {
                      backgroundImage:
                        'linear-gradient(#020617, #020617) padding-box, linear-gradient(135deg, #FBBF24, #F87171) border-box',
                    }
                  : undefined
              }
            >
              <Mic
                size={isRecording ? 40 : 32}
                className={`transition-all ${
                  isRecording && !isPaused
                    ? isWarningZone
                      ? 'text-amber-400'
                      : 'text-accent-primary'
                    : isPaused
                      ? 'text-amber-400'
                      : 'text-accent-primary'
                }`}
              />
            </div>

            {/* Status label */}
            <p className="text-sm text-slate-500">
              {!isRecording && !audioBlob && 'Ready to record'}
              {isRecording && !isPaused && 'Recording...'}
              {isPaused && 'Recording paused'}
            </p>

            {/* Timer */}
            <div className="space-y-2">
              <p className="font-mono text-5xl font-bold tracking-tight text-white">
                {recordingTimeFormatted || '00:00'}
              </p>
              {isRecording && (
                <p className="font-mono text-sm text-slate-500">{remainingFormatted} remaining</p>
              )}
            </div>

            {/* Audio Visualizer */}
            {isRecording && stream && (
              <div className="w-full max-w-md">
                <AudioVisualizer stream={stream} isRecording={isRecording && !isPaused} />
              </div>
            )}

            {/* Progress bar (only when recording) */}
            {isRecording && (
              <div className="w-full max-w-md">
                <Progress
                  value={progress}
                  size="sm"
                  classNames={{
                    track: 'bg-echo-surface',
                    indicator: isWarningZone
                      ? 'bg-gradient-to-r from-amber-400 to-red-400'
                      : 'bg-gradient-to-r from-accent-primary to-accent-secondary',
                  }}
                />
                <div className="mt-1 flex justify-between font-mono text-xs text-slate-600">
                  <span>0:00</span>
                  <span>10:00 LIMIT</span>
                </div>
              </div>
            )}

            {/* Error */}
            {(recordingError || uploadError) && (
              <div className="flex items-center gap-2 rounded-btn border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                <AlertCircle size={16} />
                <span>{recordingError || uploadError}</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <>
                  <button
                    onClick={handleStartRecording}
                    className="btn-cta inline-flex items-center gap-2 rounded-btn px-6 py-3 text-sm font-bold transition-all hover:brightness-110"
                    type="button"
                  >
                    <Mic size={16} />
                    Start Recording
                  </button>
                  <button
                    onClick={handleUploadClick}
                    disabled={fileValidating}
                    className="btn-ghost inline-flex items-center gap-2 rounded-btn px-6 py-3 text-sm font-medium"
                    type="button"
                  >
                    <Upload size={16} />
                    {fileValidating ? 'Validating...' : 'Upload File'}
                  </button>
                </>
              ) : isPaused ? (
                <>
                  <button
                    onClick={handleResumeRecording}
                    className="inline-flex items-center gap-2 rounded-btn bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-600"
                    type="button"
                  >
                    <Play size={16} />
                    Resume
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-2 rounded-btn bg-red-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-red-600"
                    type="button"
                  >
                    <Square size={16} />
                    Stop
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handlePauseRecording}
                    className="inline-flex items-center gap-2 rounded-btn bg-amber-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600"
                    type="button"
                  >
                    <Pause size={16} />
                    Pause
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-2 rounded-btn bg-red-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-red-600"
                    type="button"
                  >
                    <Square size={16} />
                    Stop
                  </button>
                </>
              )}
            </div>

            {/* Tips */}
            {!isRecording && (
              <p className="max-w-sm text-xs text-slate-600">
                Up to 10 minutes · MP3, WAV, M4A, WEBM, OGG · 50MB max
              </p>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 2: MEETING DETAILS FORM
            ════════════════════════════════════════════ */}
        {step === 'details' && (
          <div className="mx-auto max-w-lg space-y-6">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-white">Meeting Details</h2>
              <p className="text-sm text-slate-400">
                Add context to help the AI generate better summaries.
              </p>
            </div>

            {/* Audio preview */}
            {(audioBlob || uploadedFile) && (
              <div className="rounded-card border border-echo-border bg-echo-surface p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Check size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {uploadedFile ? uploadedFile.file.name : 'Recorded Audio'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {uploadedFile
                        ? `${uploadedFile.durationFormatted} · ${(uploadedFile.file.size / 1024 / 1024).toFixed(1)}MB`
                        : recordingTimeFormatted}
                    </p>
                  </div>
                </div>
                {audioBlob && (
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                )}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300" htmlFor="meeting-title">
                  Session Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="meeting-title"
                  type="text"
                  className="input-echo w-full"
                  placeholder="e.g., Q1 Planning Session"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                />
                {formErrors.title && <p className="text-xs text-red-400">{formErrors.title}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Category <span className="text-red-400">*</span>
                </label>
                <Select
                  placeholder="Select a category"
                  selectedKeys={formData.category ? [formData.category] : []}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0];
                    if (val) handleFormChange('category', val.toString());
                  }}
                  classNames={{
                    trigger:
                      'bg-[#0F172A] border border-white/10 rounded-full h-12 px-5 transition-all hover:bg-[#1E293B] hover:border-white/20',
                    popoverContent:
                      'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] p-2',
                    value: 'text-white text-sm',
                  }}
                  listboxProps={{
                    itemClasses: {
                      base: 'rounded-full px-4 py-2.5 transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white',
                      selected: 'bg-accent-primary/20 text-accent-primary font-bold',
                    },
                  }}
                  aria-label="Select Category"
                >
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} textValue={cat.label}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </Select>
                {formErrors.category && (
                  <p className="text-xs text-red-400">{formErrors.category}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-slate-300"
                  htmlFor="meeting-description"
                >
                  Description <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  id="meeting-description"
                  className="input-echo min-h-[100px] w-full resize-none"
                  placeholder="Brief notes about this meeting..."
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                />
              </div>
            </div>

            {/* Error */}
            {uploadError && (
              <div className="flex items-center gap-2 rounded-btn border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleBack}
                className="btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2.5 text-sm font-medium"
                type="button"
              >
                <ArrowLeft size={16} />
                Back to Recording
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploadLoading}
                className="btn-cta inline-flex items-center gap-2 rounded-btn px-6 py-2.5 text-sm font-bold transition-all hover:brightness-110 disabled:opacity-50"
                type="button"
              >
                <Upload size={16} />
                {uploadLoading ? 'Uploading...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 3: UPLOADING
            ════════════════════════════════════════════ */}
        {step === 'uploading' && (
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="size-16 animate-spin rounded-full border-2 border-accent-primary border-t-transparent"></div>
            <div>
              <h3 className="mb-2 text-xl font-bold text-white">Uploading your meeting…</h3>
              <p className="text-sm text-slate-400">This may take a few moments</p>
            </div>
            <Progress
              isIndeterminate
              size="sm"
              classNames={{
                track: 'bg-echo-surface',
                indicator: 'bg-gradient-to-r from-accent-primary to-accent-secondary',
              }}
              className="max-w-md"
            />
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 3.5: PROCESSING
            ════════════════════════════════════════════ */}
        {step === 'processing' && processingStatus && (
          <div className="flex flex-col items-center space-y-8 w-full">
            <div className="rounded-card border border-white/10 bg-[#0F172A] p-8 w-full max-w-2xl shadow-[0_0_50px_rgba(129,140,248,0.08)]">
              <div className="mb-8 flex flex-col items-center gap-3">
                <div className="ai-dot size-3" />
                <h3 className="text-xl font-bold tracking-tight text-white mb-1">
                  {processingStatus.currentStage || 'Initializing AI...'}
                </h3>
                <p className="text-sm text-slate-400 font-medium tracking-wide">
                  {processingStatus.estimatedTimeRemaining > 0
                    ? `Estimated ~${processingStatus.estimatedTimeRemaining}s remaining`
                    : 'Finalizing intelligence...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-12 px-2">
                <Progress
                  value={processingStatus.progress || 0}
                  size="md"
                  classNames={{
                    track: 'bg-[#020617] border border-white/5 h-2',
                    indicator:
                      'bg-gradient-to-r from-accent-primary to-accent-secondary shadow-[0_0_20px_rgba(167,139,250,0.5)]',
                  }}
                  className="w-full"
                />
              </div>

              {/* Pipeline Steps */}
              <div className="flex w-full items-center justify-between gap-1 px-1">
                {PIPELINE_STEPS.map((pipelineStep, index) => {
                  const currentIdx = PIPELINE_STEPS.findIndex(
                    (s) => s.key === processingStatus.status
                  );
                  const mappedIdx = currentIdx === -1 ? 0 : currentIdx;
                  const isComplete = index < mappedIdx || processingStatus.status === 'COMPLETED';
                  const isActive = index === mappedIdx && processingStatus.status !== 'COMPLETED';

                  return (
                    <div key={pipelineStep.key} className="flex flex-1 items-center">
                      <div className="flex flex-1 flex-col items-center gap-3">
                        <div
                          className={`flex size-11 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-all duration-500 ease-out ${
                            isComplete
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                              : isActive
                                ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/50 shadow-[0_0_30px_rgba(129,140,248,0.3)] animate-pulse'
                                : 'bg-[#020617]/50 text-slate-600 border border-white/5'
                          }`}
                        >
                          {isComplete ? <CheckCircle size={18} /> : index + 1}
                        </div>
                        <span
                          className={`text-center text-[10px] break-words uppercase tracking-wider font-semibold transition-colors duration-300 max-w-[80px] ${
                            isComplete
                              ? 'text-emerald-400'
                              : isActive
                                ? 'text-accent-primary drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                                : 'text-slate-600'
                          }`}
                        >
                          {pipelineStep.label}
                        </span>
                      </div>
                      {index < PIPELINE_STEPS.length - 1 && (
                        <div
                          className={`-mt-8 h-[2px] w-full max-w-[40px] flex-shrink-0 rounded-full transition-colors duration-500 mx-2 ${
                            isComplete
                              ? 'bg-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : 'bg-white/5'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 4: SUCCESS
            ════════════════════════════════════════════ */}
        {step === 'success' && (
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/15">
              <Check size={40} className="text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">Processing Complete!</h3>
              <p className="text-sm font-medium text-emerald-400/80">
                AI intelligence generated successfully.
              </p>
            </div>
            <p className="text-xs text-slate-500 animate-pulse mt-4">
              Redirecting to meeting dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordPage;

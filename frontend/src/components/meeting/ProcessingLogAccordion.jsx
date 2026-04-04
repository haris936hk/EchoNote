import { useState } from 'react';
import { LuChevronDown, LuClock, LuCheckCircle2, LuXCircle } from 'react-icons/lu';

const STAGE_LABELS = {
  PROCESSING_AUDIO: 'Audio Processing',
  TRANSCRIBING: 'Transcription (Whisper)',
  PROCESSING_NLP: 'NLP Analysis (SpaCy)',
  SUMMARIZING: 'Summarization (LLM)',
};

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '—';
  const s = parseFloat(seconds);
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(0);
  return `${m}m ${rem}s`;
};

const formatMs = (ms) => {
  if (!ms) return '—';
  return formatDuration(ms / 1000);
};

const formatDatetime = (dateString) => {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateString));
};

const getDurColor = (ms) => {
  if (!ms) return 'text-slate-500';
  const s = ms / 1000;
  if (s < 30) return 'text-emerald-400';
  if (s < 120) return 'text-amber-400';
  return 'text-red-400';
};

// ─── Main Component ───
const ProcessingLogAccordion = ({
  meetingId,
  processingDuration,
  processingStartedAt,
  processingCompletedAt,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stages, setStages] = useState(null); // null = not loaded yet
  const [loadingStages, setLoadingStages] = useState(false);

  // Lazy-fetch stage data on first open
  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);

    if (opening && stages === null && meetingId) {
      setLoadingStages(true);
      const token = localStorage.getItem('token');
      fetch(`${process.env.REACT_APP_API_URL}/meetings/${meetingId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data?.processingLogs)) {
            setStages(data.data.processingLogs);
          } else {
            setStages([]); // Mark as loaded with no data
          }
        })
        .catch(() => setStages([]))
        .finally(() => setLoadingStages(false));
    }
  };

  if (!processingDuration && !processingStartedAt) return null;

  const stagesLoaded = Array.isArray(stages);
  const hasStages = stagesLoaded && stages.length > 0;

  return (
    <div className="overflow-hidden rounded-card bg-echo-surface">
      {/* ── Accordion Header ── */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-echo-surface-hover"
      >
        <div className="flex items-center gap-2.5">
          <LuClock size={14} className="text-slate-500" />
          <span className="text-sm font-semibold text-white">Processing History</span>
          {processingDuration && (
            <span className="rounded-full bg-echo-base px-2 py-0.5 font-mono text-[10px] text-slate-500">
              {formatDuration(processingDuration)} total
            </span>
          )}
        </div>
        <LuChevronDown
          size={14}
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Accordion Body ── */}
      {isOpen && (
        <div className="bg-echo-base px-5 pb-5 pt-1">
          {/* Timestamps grid */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-btn bg-echo-surface p-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-600">Started</p>
              <p className="font-mono text-[11px] text-slate-300">
                {formatDatetime(processingStartedAt)}
              </p>
            </div>
            <div className="rounded-btn bg-echo-surface p-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-600">Completed</p>
              <p className="font-mono text-[11px] text-slate-300">
                {formatDatetime(processingCompletedAt)}
              </p>
            </div>
          </div>

          {/* Loading spinner */}
          {loadingStages && (
            <div className="flex justify-center py-3">
              <div className="size-4 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            </div>
          )}

          {/* Per-stage breakdown from ProcessingLog */}
          {!loadingStages && hasStages && (
            <div className="space-y-2.5">
              {stages.map((stage, i) => (
                <div key={i} className="flex items-center gap-3 py-0.5">
                  {stage.errorMessage ? (
                    <LuXCircle size={13} className="shrink-0 text-red-400/60" />
                  ) : (
                    <LuCheckCircle2 size={13} className="shrink-0 text-emerald-400/60" />
                  )}
                  <span className="flex-1 text-xs text-slate-400">
                    {STAGE_LABELS[stage.stage] || stage.stage}
                  </span>
                  {/* Proportional bar */}
                  {stage.durationMs && processingDuration && (
                    <div className="h-[3px] w-16 overflow-hidden rounded-full bg-echo-surface">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                        style={{
                          width: `${Math.min(
                            100,
                            (stage.durationMs / 1000 / processingDuration) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                  <span
                    className={`w-14 text-right font-mono text-[10px] ${getDurColor(stage.durationMs)}`}
                  >
                    {formatMs(stage.durationMs)}
                  </span>
                </div>
              ))}

              {/* Total row — weight shift replaces a border separator */}
              <div className="flex items-center justify-between pt-3">
                <span className="text-xs font-semibold text-white">Total pipeline</span>
                <span className="font-mono text-sm font-bold text-white">
                  {formatDuration(processingDuration)}
                </span>
              </div>
            </div>
          )}

          {/* Fallback: no stage data, just show total */}
          {!loadingStages && !hasStages && processingDuration && (
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-slate-400">Total pipeline duration</span>
              <span className="font-mono text-sm font-bold text-white">
                {formatDuration(processingDuration)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessingLogAccordion;

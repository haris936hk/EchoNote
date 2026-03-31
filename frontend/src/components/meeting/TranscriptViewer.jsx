import { useState, useRef, useEffect } from 'react';
import { LuFileText as FileText, LuCopy as Copy, LuCheck as Check, LuSearch as Search, LuX as X } from 'react-icons/lu';

const TranscriptViewer = ({
  transcript,
  title = 'Transcript',
  meetingTitle = 'Meeting',
  meetingId,
  nlpData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (!transcript || !searchQuery) {
      setHighlightedText(transcript || '');
      return;
    }
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const highlighted = transcript.replace(
      regex,
      '<mark class="bg-amber-500/30 rounded px-0.5">$1</mark>'
    );
    setHighlightedText(highlighted);
  }, [transcript, searchQuery]);

  if (!transcript) {
    return (
      <div className="py-12 text-center">
        <FileText size={40} className="mx-auto mb-4 text-slate-600" />
        <p className="text-slate-400">No transcript available</p>
        <p className="mt-1 text-xs text-slate-600">Transcript will be generated after processing</p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const wordCount = transcript.split(/\s+/).length;
  const matchCount = searchQuery
    ? (transcript.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || [])
        .length
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-accent-primary" />
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <span className="bg-echo-base rounded-full px-2 py-0.5 font-mono text-xs text-slate-500">
            {wordCount.toLocaleString()} words
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="btn-ghost inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-medium"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy Text'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in transcript..."
          className="input-echo w-full px-9 py-2 text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {searchQuery && (
        <p className="text-[11px] text-slate-500">
          {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'No matches'}
        </p>
      )}

      {/* Transcript Content */}
      <div
        ref={transcriptRef}
        className="bg-echo-base custom-scrollbar max-h-[600px] overflow-y-auto whitespace-pre-wrap rounded-[10px] p-4 font-mono text-sm leading-relaxed text-slate-300"
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    </div>
  );
};

export default TranscriptViewer;

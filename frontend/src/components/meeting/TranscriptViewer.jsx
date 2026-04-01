import { useState, useRef, useEffect, useMemo } from 'react';
import { LuFileText as FileText, LuCopy as Copy, LuCheck as Check, LuSearch as Search, LuX as X, LuPenLine as PenLine, LuUser as User } from 'react-icons/lu';

const TranscriptViewer = ({
  transcript,
  transcriptSegments = [],
  speakerMap = {},
  title = 'Transcript',
  meetingTitle = 'Meeting',
  meetingId,
  nlpData,
  onRenameSpeaker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const transcriptRef = useRef(null);

  // Fallback to old format if no segments exist
  const hasSegments = transcriptSegments && transcriptSegments.length > 0;

  // Render raw transcript if no segments available, with highlighting
  const highlightedRawText = useMemo(() => {
    if (hasSegments || !transcript) return '';
    if (!searchQuery) return transcript;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return transcript.replace(regex, '<mark class="bg-amber-500/30 rounded px-0.5">$1</mark>');
  }, [transcript, searchQuery, hasSegments]);

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (hasSegments) {
      return transcriptSegments.reduce((acc, seg) => {
        const matches = seg.text.match(regex);
        return acc + (matches ? matches.length : 0);
      }, 0);
    }
    return (transcript?.match(regex) || []).length;
  }, [searchQuery, transcript, transcriptSegments, hasSegments]);

  if (!transcript && !hasSegments) {
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
      let textToCopy = transcript;
      
      // Attempt to build pretty text if segments exist
      if (hasSegments) {
        textToCopy = transcriptSegments.map((seg) => {
          const speakerName = speakerMap[seg.speaker] || seg.speaker || 'Unknown Speaker';
          return `[${speakerName}]: ${seg.text}`;
        }).join('\n');
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const wordCount = transcript?.split(/\s+/).length || 0;

  // Utility to highlight text in a segment
  const highlightSegmentText = (text) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-amber-500/30 rounded px-0.5">{part}</mark> : part
    );
  };

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
        className="bg-echo-base custom-scrollbar max-h-[600px] overflow-y-auto rounded-[10px] p-4 text-sm leading-relaxed text-slate-300"
      >
        {!hasSegments ? (
          <div 
            className="whitespace-pre-wrap font-mono"
            dangerouslySetInnerHTML={{ __html: highlightedRawText }} 
          />
        ) : (
          <div className="space-y-4 font-sans">
            {transcriptSegments.map((seg, idx) => {
              const speakerId = seg.speaker || 'UNKNOWN';
              const speakerName = speakerMap[speakerId] || speakerId;
              const isDefaultName = speakerName === speakerId;
              
              return (
                <div key={idx} className="flex flex-col gap-1 group">
                  <div className="flex items-center gap-2">
                    <span 
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md ${isDefaultName ? 'text-accent-secondary bg-accent-secondary/10' : 'text-accent-primary bg-accent-primary/10'}`}
                    >
                      <User size={10} />
                      {speakerName}
                      
                      {/* Rename Speaker Button (shows on hover) */}
                      {onRenameSpeaker && (
                        <button 
                          onClick={() => onRenameSpeaker(speakerId, speakerName)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-white"
                          title="Rename speaker"
                        >
                          <PenLine size={10} />
                        </button>
                      )}
                    </span>
                    
                    {/* Timestamp (if available) */}
                    {seg.start !== undefined && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(seg.start * 1000).toISOString().substr(14, 5)}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 pl-1 leading-relaxed">
                    {highlightSegmentText(seg.text)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;

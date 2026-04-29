import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  LuFileText as FileText,
  LuCopy as Copy,
  LuCheck as Check,
  LuSearch as Search,
  LuX as X,
  LuPenLine as PenLine,
  LuUser as User,
  LuChevronUp as ChevronUp,
  LuChevronDown as ChevronDown,
  LuSparkles as Sparkles,
  LuTag as Tag,
  LuPlay as Play,
} from 'react-icons/lu';

const ENTITY_STYLES = {
  PERSON: { bg: 'bg-accent-secondary/15', text: 'text-accent-secondary', label: 'Person' },
  ORG: { bg: 'bg-accent-primary/15', text: 'text-accent-primary', label: 'Org' },
  DATE: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Date' },
  TIME: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Time' },
  GPE: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Location' },
  LOC: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Location' },
  MONEY: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'Money' },
  PERCENT: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'Percent' },
};

const getEntityStyle = (label) =>
  ENTITY_STYLES[label?.toUpperCase()] || {
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    label: label || 'Entity',
  };

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SpeakerAvatar = ({ name, size = 5 }) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <span
      className={`w- inline-flex items-center justify-center rounded-full bg-accent-secondary/10 text-[10px] font-bold text-accent-secondary${size} h-${size}`}
    >
      {initial}
    </span>
  );
};

SpeakerAvatar.propTypes = {
  name: PropTypes.string,
  size: PropTypes.number,
};

const TranscriptViewer = ({
  transcript,
  transcriptSegments = [],
  speakerMap = {},
  title = 'Transcript',
  nlpData,
  onRenameSpeaker,
  onSeek,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const transcriptRef = useRef(null);

  const hasSegments = transcriptSegments && transcriptSegments.length > 0;

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  const speakerStats = useMemo(() => {
    if (!hasSegments || transcriptSegments.length === 0) return [];
    const stats = {};
    for (const seg of transcriptSegments) {
      const dur = (parseFloat(seg.end) || 0) - (parseFloat(seg.start) || 0);
      const words = (seg.text || '').split(/\s+/).filter(Boolean).length;
      const id = seg.speaker || 'UNKNOWN';
      if (!stats[id]) stats[id] = { totalSeconds: 0, wordCount: 0 };
      stats[id].totalSeconds += dur;
      stats[id].wordCount += words;
    }
    const total = Object.values(stats).reduce((s, v) => s + v.totalSeconds, 0);
    return Object.entries(stats)
      .map(([speakerId, v]) => ({
        speakerId,
        speakerName: speakerMap[speakerId] || speakerId,
        totalSeconds: v.totalSeconds,
        wordCount: v.wordCount,
        percentage: total > 0 ? Math.round((v.totalSeconds / total) * 100) : 0,
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [transcriptSegments, speakerMap, hasSegments]);

  const showSpeakerAnalytics = speakerStats.length >= 2;

  const { entityRegex, entityColorMap } = useMemo(() => {
    if (!showEntities || !nlpData?.entities?.length)
      return { entityRegex: null, entityColorMap: {} };
    const colorMap = {};
    nlpData.entities.forEach(({ text, label }) => {
      if (text && label) colorMap[text.toLowerCase()] = label;
    });
    const terms = nlpData.entities
      .map((e) => e.text)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex);
    if (!terms.length) return { entityRegex: null, entityColorMap: {} };
    return {
      entityRegex: new RegExp(`(${terms.join('|')})`, 'gi'),
      entityColorMap: colorMap,
    };
  }, [nlpData, showEntities]);

  const activeEntityTypes = useMemo(() => {
    if (!showEntities || !nlpData?.entities?.length) return [];
    const seen = new Set();
    const out = [];
    for (const { label } of nlpData.entities) {
      if (label && !seen.has(label)) {
        seen.add(label);
        out.push(label);
      }
    }
    return out;
  }, [nlpData, showEntities]);

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const regex = new RegExp(escapeRegex(searchQuery), 'gi');
    if (hasSegments) {
      return transcriptSegments.reduce((acc, seg) => {
        const matches = seg.text.match(regex);
        return acc + (matches ? matches.length : 0);
      }, 0);
    }
    return (transcript?.match(regex) || []).length;
  }, [searchQuery, transcript, transcriptSegments, hasSegments]);

  useEffect(() => {
    if (!transcriptRef.current) return;
    const marks = transcriptRef.current.querySelectorAll('mark[data-search]');
    if (!marks.length) return;
    const safeIdx = Math.max(0, Math.min(currentMatchIndex, marks.length - 1));
    marks.forEach((m, i) => {
      if (i === safeIdx) {
        m.className = 'rounded bg-amber-400/50 px-0.5 ring-1 ring-amber-400/30';
        m.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        m.className = 'rounded bg-amber-500/20 px-0.5';
      }
    });
  }, [currentMatchIndex, searchQuery]);

  const handlePrevMatch = useCallback(() => {
    setCurrentMatchIndex((i) => (i <= 0 ? Math.max(0, matchCount - 1) : i - 1));
  }, [matchCount]);

  const handleNextMatch = useCallback(() => {
    setCurrentMatchIndex((i) => (i >= matchCount - 1 ? 0 : i + 1));
  }, [matchCount]);

  const highlightSearch = useCallback(
    (text) => {
      if (!searchQuery) return [text];
      const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
      return text.split(regex).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={`search-${i}`} data-search="" className="rounded bg-amber-500/20 px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    },
    [searchQuery]
  );

  const highlightEntity = useCallback(
    (text) => {
      if (!entityRegex) return [text];
      entityRegex.lastIndex = 0;
      return text.split(entityRegex).map((part, i) => {
        if (i % 2 === 1) {
          const style = getEntityStyle(entityColorMap[part.toLowerCase()]);
          return (
            <span
              key={`entity-${i}`}
              className={`cursor-default rounded-[3px] px-0.5 ${style.bg} ${style.text}`}
              title={style.label}
            >
              {part}
            </span>
          );
        }
        return part;
      });
    },
    [entityRegex, entityColorMap]
  );

  const getSegmentContent = useCallback(
    (text) => {
      if (searchQuery) return highlightSearch(text);
      if (showEntities && entityRegex) return highlightEntity(text);
      return text;
    },
    [searchQuery, showEntities, entityRegex, highlightSearch, highlightEntity]
  );

  const highlightedRawText = useMemo(() => {
    if (hasSegments || !transcript) return '';
    if (!searchQuery) return transcript;
    const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
    return transcript.replace(
      regex,
      '<mark data-search class="rounded bg-amber-500/20 px-0.5">$1</mark>'
    );
  }, [transcript, searchQuery, hasSegments]);

  const wordCount = transcript?.split(/\s+/).length || 0;

  const handleCopy = async () => {
    try {
      let textToCopy = transcript;
      if (hasSegments) {
        textToCopy = transcriptSegments
          .map((seg) => {
            const speakerName = speakerMap[seg.speaker] || seg.speaker || 'Unknown Speaker';
            return `[${speakerName}]: ${seg.text}`;
          })
          .join('\n');
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {

    }
  };

  if (!transcript && !hasSegments) {
    return (
      <div className="py-12 text-center">
        <FileText size={40} className="mx-auto mb-4 text-slate-600" />
        <p className="text-slate-400">No transcript available</p>
        <p className="mt-1 text-xs text-slate-600">Transcript will be generated after processing</p>
      </div>
    );
  }

  const hasNlpEntities = Array.isArray(nlpData?.entities) && nlpData.entities.length > 0;

  return (
    <div className="space-y-4">
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-accent-primary" />
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <span className="rounded-full bg-echo-base px-2 py-0.5 font-mono text-xs text-slate-500">
            {wordCount.toLocaleString()} words
          </span>
        </div>
        <div className="flex items-center gap-2">
          {}
          {hasSegments && hasNlpEntities && (
            <button
              onClick={() => setShowEntities((v) => !v)}
              title="Toggle entity highlights"
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                showEntities
                  ? 'bg-accent-secondary/15 text-accent-secondary ring-1 ring-accent-secondary/20'
                  : 'btn-ghost'
              }`}
              type="button"
            >
              <Tag size={11} />
              Entities
            </button>
          )}
          <button
            onClick={handleCopy}
            className="btn-ghost inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            type="button"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>
      </div>

      {}
      {showEntities && activeEntityTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeEntityTypes.map((type) => {
            const style = getEntityStyle(type);
            return (
              <span
                key={type}
                className={`inline-flex items-center gap-1 rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}
              >
                <span
                  className={`size-1.5 rounded-full ${style.bg.replace('/15', '')} inline-block`}
                />
                {style.label}
              </span>
            );
          })}
          {searchQuery && (
            <span className="text-[10px] text-slate-500">
              (clear search to see entity highlights)
            </span>
          )}
        </div>
      )}

      {}
      <div className="space-y-1.5">
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
              type="button"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {}
        {searchQuery && (
          <div className="flex items-center gap-2">
            <p className="font-mono text-[11px] text-slate-500">
              {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : 'No matches'}
            </p>
            {matchCount > 1 && (
              <>
                <button
                  onClick={handlePrevMatch}
                  className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-echo-surface-hover hover:text-white"
                  title="Previous match"
                  type="button"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={handleNextMatch}
                  className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-echo-surface-hover hover:text-white"
                  title="Next match"
                  type="button"
                >
                  <ChevronDown size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {}
      {showSpeakerAnalytics && !searchQuery && (
        <div className="rounded-btn bg-echo-base p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={13} className="text-accent-secondary" />
            <span className="text-xs font-semibold text-white">Speaker Analytics</span>
          </div>
          <div className="space-y-3">
            {speakerStats.map((s) => (
              <div key={s.speakerId} className="flex items-center gap-3">
                <SpeakerAvatar name={s.speakerName} size={5} />
                <span className="w-24 truncate text-xs text-slate-300">{s.speakerName}</span>
                {}
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-echo-surface">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[10px] text-accent-primary">
                  {s.percentage}%
                </span>
                <span className="w-12 text-right font-mono text-[10px] text-slate-500">
                  {s.totalSeconds >= 60
                    ? `${Math.floor(s.totalSeconds / 60)}m ${Math.round(s.totalSeconds % 60)}s`
                    : `${Math.round(s.totalSeconds)}s`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      <div
        ref={transcriptRef}
        className="custom-scrollbar max-h-[600px] overflow-y-auto rounded-btn bg-echo-base p-4 text-sm leading-relaxed text-slate-300"
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
                <div
                  key={`${speakerId}-${seg.start}-${idx}`}
                  onClick={() => onSeek && seg.start !== undefined && onSeek(seg.start)}
                  className={`group flex flex-col gap-1 rounded-lg transition-all duration-200 ${
                    onSeek ? '-mx-2 cursor-pointer p-2 hover:bg-white/[0.03]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        isDefaultName
                          ? 'bg-accent-secondary/10 text-accent-secondary'
                          : 'bg-accent-primary/10 text-accent-primary'
                      }`}
                    >
                      <User size={10} />
                      {speakerName}

                      {}
                      {onRenameSpeaker && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRenameSpeaker(speakerId, speakerName);
                          }}
                          className="ml-1 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                          title="Rename speaker"
                          type="button"
                        >
                          <PenLine size={10} />
                        </button>
                      )}
                    </span>

                    {seg.start !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-500">
                          {new Date(seg.start * 1000).toISOString().substr(14, 5)}
                        </span>
                        {onSeek && (
                          <Play
                            size={10}
                            className="text-accent-primary opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="pl-1 leading-relaxed text-slate-300">
                    {getSegmentContent(seg.text)}
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

TranscriptViewer.propTypes = {
  transcript: PropTypes.string,
  transcriptSegments: PropTypes.arrayOf(
    PropTypes.shape({
      speaker: PropTypes.string,
      text: PropTypes.string.isRequired,
      start: PropTypes.number,
      end: PropTypes.number,
    })
  ),
  speakerMap: PropTypes.objectOf(PropTypes.string),
  title: PropTypes.string,
  nlpData: PropTypes.shape({
    entities: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        label: PropTypes.string,
      })
    ),
  }),
  onRenameSpeaker: PropTypes.func,
  onSeek: PropTypes.func,
};

export default TranscriptViewer;

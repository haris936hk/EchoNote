import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  LuCalendar as Calendar,
  LuClock as Clock,
  LuMic2 as Mic2,
  LuCheckCircle as CheckCircle,
  LuListChecks as ListChecks,
  LuFileText as FileText,
  LuUser as User,
  LuTag as Tag,
  LuArrowRight as ArrowRight,
  LuSparkles as Sparkles,
  LuCheck as Check,
  LuCopy as Copy,
} from 'react-icons/lu';
import { publicAPI } from '../services/api';

// Static fallback since we might lack sentimentColors from theme
const fallbackSentimentColors = {
  positive: { dot: 'bg-[#22c55e]', label: 'Positive' },
  negative: { dot: 'bg-[#ef4444]', label: 'Negative' },
  neutral: { dot: 'bg-[#94a3b8]', label: 'Neutral' },
};

const CopyBtn = ({ section, content, copiedSection, onCopy }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onCopy(content, section);
    }}
    className="text-[#64748b] transition-colors hover:text-white"
    type="button"
    aria-label={`Copy ${section}`}
  >
    {copiedSection === section ? (
      <Check size={14} className="text-[#22c55e]" />
    ) : (
      <Copy size={14} />
    )}
  </button>
);

const PublicMeetingSummary = () => {
  const { token } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const response = await publicAPI.get(`/public/meetings/${token}`);
        if (response.data.success) {
          setMeeting(response.data.data);
        } else {
          setError('This link is invalid or has been revoked');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'This link is invalid or has been revoked');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [token]);

  const copySection = async (text, section) => {
    try {
      let copyText = text;
      if (Array.isArray(text)) {
        if (text.length > 0 && typeof text[0] === 'object' && text[0].task) {
          copyText = text
            .map((item, i) => {
              let line = `${i + 1}. ${item.task}`;
              if (item.assignee) line += ` (${item.assignee})`;
              if (item.deadline) line += ` [${item.deadline}]`;
              if (item.priority) line += ` {${item.priority.toUpperCase()}}`;
              return line;
            })
            .join('\n');
        } else {
          copyText = text.map((item, i) => `${i + 1}. ${item}`).join('\n');
        }
      }
      await navigator.clipboard.writeText(copyText);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityClasses = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/15 text-red-400';
      case 'medium':
        return 'bg-[#fbbf24]/15 text-[#fbbf24]';
      case 'low':
        return 'bg-[#22c55e]/15 text-[#22c55e]';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#020617] p-6">
        <div className="size-8 animate-spin rounded-full border-2 border-[#818cf8] border-t-transparent" />
        <p className="mt-4 text-[13px] font-medium text-[#64748b] tracking-wider uppercase">Loading Workspace...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#020617] w-full flex-col p-6">
        <div className="max-w-md w-full bg-[#0c1324] border border-[rgba(255,255,255,0.06)] shadow-[0_0_80px_-20px_rgba(189,194,255,0.1)] rounded-[24px] p-8 text-center flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-2">
            <FileText size={32} />
          </div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-white">Meeting Unavailable</h2>
          <p className="text-[#94a3b8] text-[14px] leading-[1.8]">{error || 'This link is invalid or has been revoked.'}</p>
        </div>
      </div>
    );
  }

  const summaryData =
    typeof meeting.summary === 'object' && meeting.summary !== null
      ? {
          executive: meeting.summary.executiveSummary || '',
          decisions: Array.isArray(meeting.summary.keyDecisions) ? meeting.summary.keyDecisions : [],
          actions: Array.isArray(meeting.summary.actionItems) ? meeting.summary.actionItems : [],
          nextSteps: Array.isArray(meeting.summary.nextSteps) ? meeting.summary.nextSteps : [],
          keyTopics: Array.isArray(meeting.summary.keyTopics) ? meeting.summary.keyTopics : [],
          sentiment: meeting.summary.sentiment || 'neutral',
        }
      : {
          executive: '',
          decisions: [],
          actions: [],
          nextSteps: [],
          keyTopics: [],
          sentiment: 'neutral',
        };

  const sentimentObj = fallbackSentimentColors[summaryData.sentiment?.toLowerCase()] || fallbackSentimentColors.neutral;

  return (
    <div className="min-h-screen bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1100px] mx-auto space-y-6">
        
        {/* Header containing Branding/Watermark */}
        <header className="flex items-center mb-8 opacity-60">
          <div className="flex items-center gap-2.5 select-none">
            <Mic2 className="text-[#818cf8]" size={20} />
            <span className="font-['Plus_Jakarta_Sans'] text-[15px] font-bold tracking-tight text-white">
              EchoNote <span className="font-normal text-[#64748b]">Shared Summary</span>
            </span>
          </div>
        </header>

        {/* ── Meeting Hero Card ── */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center bg-[#0c1324] border border-[rgba(255,255,255,0.06)] rounded-[16px] p-6 lg:p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold bg-[#818cf8]/10 text-[#818cf8] border border-[rgba(129,140,248,0.2)]">
                {meeting.category}
              </span>
              <span className="text-[11px] text-[#22c55e] bg-[#22c55e]/10 px-2.5 py-1 rounded-full font-bold">
                Read-Only
              </span>
            </div>
            
            <h1 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold tracking-tight text-[#f8fafc]">
              {meeting.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 font-mono text-[13px]">
              <span className="inline-flex items-center gap-2 text-[#94a3b8]">
                <Calendar size={13} className="text-[#64748b]" />
                {formatDate(meeting.createdAt)}
              </span>
              <span className="inline-flex items-center gap-2 text-[#94a3b8]">
                <Clock size={13} className="text-[#64748b]" />
                {formatTime(meeting.createdAt)}
              </span>
              {meeting.duration && (
                <span className="inline-flex items-center gap-2 text-[#94a3b8]">
                  <Clock size={13} className="text-[#64748b]" />
                  {formatDuration(meeting.duration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Summary Cards Grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          <div className="space-y-6">
            {/* ── Executive Summary ── */}
            {summaryData.executive && (
              <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0c1324] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-[#818cf8]" />
                    <h4 className="font-['Plus_Jakarta_Sans'] text-[15px] font-semibold text-white">Executive Summary</h4>
                    <span className="ai-dot"></span>
                  </div>
                  <CopyBtn section="executive" content={summaryData.executive} copiedSection={copiedSection} onCopy={copySection} />
                </div>
                <div className="prose prose-invert prose-p:leading-[1.8] max-w-none">
                  {summaryData.executive.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 last:mb-0 text-[14px] text-[#94a3b8] font-sans">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* ── Key Decisions ── */}
            {summaryData.decisions.length > 0 && (
              <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0c1324] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-[#22c55e]" />
                    <h4 className="font-['Plus_Jakarta_Sans'] text-[15px] font-semibold text-white">Key Decisions</h4>
                  </div>
                  <CopyBtn section="decisions" content={summaryData.decisions} copiedSection={copiedSection} onCopy={copySection} />
                </div>
                <div className="space-y-3">
                  {summaryData.decisions.map((decision, i) => (
                    <div key={`${decision}-${i}`} className="flex items-start gap-3 pl-1">
                      <div className="mt-[7px] size-[5px] shrink-0 rounded-full bg-[#818cf8]"></div>
                      <p className="text-[14px] leading-[1.8] text-[#94a3b8]">{decision}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* ── Next Steps ── */}
            {summaryData.nextSteps.length > 0 && (
              <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0c1324] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ArrowRight size={16} className="text-[#22c55e]" />
                    <h4 className="font-['Plus_Jakarta_Sans'] text-[15px] font-semibold text-white">Next Steps</h4>
                  </div>
                  <CopyBtn section="nextSteps" content={summaryData.nextSteps} copiedSection={copiedSection} onCopy={copySection} />
                </div>
                <div className="space-y-3">
                  {summaryData.nextSteps.map((step, i) => (
                    <div key={`${step}-${i}`} className="flex items-start gap-3 pl-1">
                      <ArrowRight size={12} className="mt-[5px] shrink-0 text-[#22c55e]" />
                      <p className="text-[14px] leading-[1.8] text-[#94a3b8]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* ── Action Items ── */}
            {summaryData.actions.length > 0 && (
              <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0c1324] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ListChecks size={16} className="text-[#fbbf24]" />
                    <h4 className="font-['Plus_Jakarta_Sans'] text-[15px] font-semibold text-white">Action Items</h4>
                    <span className="font-mono text-[11px] font-bold text-[#64748b]">
                      {summaryData.actions.length}
                    </span>
                  </div>
                  <CopyBtn section="actions" content={summaryData.actions} copiedSection={copiedSection} onCopy={copySection} />
                </div>
                <div className="space-y-3 relative">
                  {/* Decorative faint vertical line to ground items */}
                  <div className="absolute left-[11px] top-4 bottom-4 w-px bg-white/[0.02]"></div>
                  
                  {summaryData.actions.map((action, i) => (
                    <div key={`action-${i}`} className="relative space-y-2.5 rounded-[12px] border border-[rgba(255,255,255,0.03)] bg-[#020617] p-4 z-10 transition-colors hover:border-white/[0.08]">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-[#334155] bg-transparent"></div>
                        <p className="text-[14px] font-medium leading-[1.6] text-white">
                          {action.task}
                        </p>
                      </div>
                      {(action.assignee || action.deadline || action.priority) && (
                        <div className="flex flex-wrap items-center gap-2 pl-7">
                          {action.assignee && (
                            <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-white/[0.03] px-2 py-1 text-[11px] font-bold text-[#94a3b8]">
                              <User size={10} /> {action.assignee}
                            </span>
                          )}
                          {action.deadline && (
                            <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-white/[0.03] px-2 py-1 text-[11px] font-bold text-[#94a3b8]">
                              <Calendar size={10} /> {action.deadline}
                            </span>
                          )}
                          {action.priority && (
                            <span className={`rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getPriorityClasses(action.priority)}`}>
                              {action.priority}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* ── Key Topics ── */}
            {summaryData.keyTopics.length > 0 && (
              <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0c1324] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Tag size={15} className="text-[#a78bfa]" />
                    <h4 className="font-['Plus_Jakarta_Sans'] text-[14px] font-semibold text-white">Key Topics</h4>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summaryData.keyTopics.map((topic, i) => (
                    <span
                      key={`${topic}-${i}`}
                      className="rounded-full bg-[#818cf8]/10 px-3 py-1.5 text-[12px] font-bold text-[#818cf8]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Sentiment ── */}
            <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0c1324] p-5">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <span className={`size-3 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.1)] ${sentimentObj.dot}`}></span>
                   <span className="font-['Plus_Jakarta_Sans'] text-[15px] font-bold text-white tracking-wide">{sentimentObj.label}</span>
                 </div>
                 <span className="font-mono text-[11px] font-bold text-[#64748b] tracking-widest uppercase">
                   Sentiment
                 </span>
              </div>
            </div>
            
            {/* ── Participants ── */}
            {(meeting.speakers && meeting.speakers.length > 0) && (
              <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0c1324] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <User size={15} className="text-[#64748b]" />
                    <h4 className="font-['Plus_Jakarta_Sans'] text-[14px] font-semibold text-white">Participants</h4>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meeting.speakers.map((speaker, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-white/[0.04] px-3 py-1.5 text-[12px] font-bold text-[#94a3b8] border border-white/[0.05]"
                    >
                      {speaker}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default PublicMeetingSummary;

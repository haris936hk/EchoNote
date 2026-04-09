import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spinner, Card, CardBody, Chip, Divider, Button } from '@heroui/react';
import { LuCalendar, LuClock, LuMic2, LuCheckCircle2, LuListTodo, LuFileText } from 'react-icons/lu';
import { publicAPI } from '../services/api';

const PublicMeetingSummary = () => {
  const { token } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base p-6">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-sm font-medium text-text-secondary">Loading meeting summary...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex justify-center items-center h-screen bg-base w-full flex-col p-6">
        <Card className="max-w-md w-full bg-surface border border-[rgba(255,255,255,0.06)] rounded-[16px] shadow-2xl">
          <CardBody className="p-8 text-center flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-2">
              <LuFileText size={32} />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Meeting Unavailable</h2>
            <p className="text-text-secondary">{error || 'This link is invalid or has been revoked.'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header containing Branding */}
        <header className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-3 select-none">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <LuMic2 className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-text-primary">
              EchoNote
            </span>
          </div>
        </header>

        {/* Meeting Hero Card */}
        <Card className="bg-surface border border-[rgba(255,255,255,0.06)] rounded-[16px] overflow-visible">
          <CardBody className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Chip
                    size="sm"
                    className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 font-medium tracking-wide"
                  >
                    {meeting.category}
                  </Chip>
                  <span className="text-xs text-text-secondary font-mono tracking-wider uppercase">
                    Shared Summary
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
                  {meeting.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-text-secondary font-mono pt-2">
                  <div className="flex items-center gap-2">
                    <LuCalendar size={16} className="text-indigo-400" />
                    <span>{formatDate(meeting.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LuClock size={16} className="text-indigo-400" />
                    <span>{formatTime(meeting.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LuListTodo size={16} className="text-indigo-400" />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {(meeting.speakers && meeting.speakers.length > 0) && (
               <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                 <h3 className="text-xs uppercase tracking-widest text-text-secondary font-semibold mb-3">
                   Participants
                 </h3>
                 <div className="flex flex-wrap gap-2">
                   {meeting.speakers.map((speaker, idx) => (
                     <Chip key={idx} variant="flat" size="sm" className="bg-white/5 text-text-secondary">
                       {speaker}
                     </Chip>
                   ))}
                 </div>
               </div>
            )}
          </CardBody>
        </Card>

        {/* AI Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Executive Summary */}
            {(meeting.summary?.executiveSummary) && (
              <Card className="bg-surface border border-[rgba(255,255,255,0.06)] rounded-[16px]">
                <CardBody className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                      <LuFileText size={18} />
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary">Executive Summary</h2>
                  </div>
                  <div className="prose prose-invert prose-p:leading-relaxed prose-ol:text-text-secondary max-w-none text-text-secondary">
                    {meeting.summary.executiveSummary.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Key Decisions */}
            {(meeting.summary?.keyDecisions && meeting.summary.keyDecisions.length > 0) && (
              <Card className="bg-surface border border-[rgba(255,255,255,0.06)] rounded-[16px]">
                <CardBody className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                      <LuCheckCircle2 size={18} />
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary">Key Decisions</h2>
                  </div>
                  <ul className="space-y-4">
                    {meeting.summary.keyDecisions.map((decision, idx) => (
                      <li key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                        </div>
                        <span className="text-text-secondary leading-relaxed">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Action Items */}
            {(meeting.summary?.actionItems && meeting.summary.actionItems.length > 0) && (
              <Card className="bg-surface border border-[rgba(255,255,255,0.06)] rounded-[16px]">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <LuListTodo size={18} />
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary">Action Items</h2>
                  </div>
                  <div className="space-y-4">
                    {meeting.summary.actionItems.map((item, idx) => (
                      <div key={idx} className="rounded-xl bg-white/5 p-4 border border-[rgba(255,255,255,0.03)] hover:bg-white/[0.07] transition-colors duration-200">
                        <p className="font-medium text-text-primary mb-2 text-sm leading-relaxed">{item.task}</p>
                        {(item.assignee || item.deadline) && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {item.assignee && (
                              <Chip size="sm" variant="flat" className="bg-indigo-500/10 text-indigo-300 border-none font-medium h-6">
                                {item.assignee}
                              </Chip>
                            )}
                            {item.deadline && (
                              <Chip size="sm" variant="flat" className="bg-red-500/10 text-red-300 border-none font-medium h-6">
                                {item.deadline}
                              </Chip>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-10 pb-6 text-center border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-sm text-text-secondary mb-4">
             Powered by <span className="font-semibold text-text-primary">EchoNote</span>
          </p>
        </footer>

      </div>
    </div>
  );
};

export default PublicMeetingSummary;

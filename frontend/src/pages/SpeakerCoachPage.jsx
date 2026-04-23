import React, { useState, useEffect, useMemo } from 'react';
import { 
  LuMic, 
  LuTrendingUp, 
  LuBrain, 
  LuClock, 
  LuZap, 
  LuMessageSquare, 
  LuVolumeX, 
  LuUser,
  LuBarChart3,
  LuHelpCircle,
  LuActivity
} from 'react-icons/lu';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { meetingsAPI } from '../services/api';
import { PageLoader } from '../components/common/Loader';

const COLORS = ['#818CF8', '#A78BFA', '#6366F1', '#4F46E5', '#C084FC', '#4ADE80', '#F472B6'];


const SpeakerCoachPage = () => {
  const [meetingsData, setMeetingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await meetingsAPI.getAllMeetings();

        if (!result.success) throw new Error(result.error);

        const recentMeetings = (result.data.data || [])
          .filter(m => m.status === 'COMPLETED')
          .slice(0, 10);
        
        if (recentMeetings.length === 0) {
          setLoading(false);
          return;
        }

        const fullMeetingsData = await Promise.all(
          recentMeetings.map(m => meetingsAPI.getMeetingById(m.id))
        );

        setMeetingsData(fullMeetingsData.map(res => res.data.data).filter(Boolean));
      } catch (err) {
        setError('Failed to aggregate session data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const coachStats = useMemo(() => {
    if (!meetingsData.length) return null;

    const speakerStats = {}; 
    let totalAllSpeakingTime = 0;
    let totalMeetingDuration = 0;
    let totalQuestions = 0;

    meetingsData.forEach(meeting => {
      const segments = meeting.transcriptSegments || [];
      const speakerMap = meeting.speakerMap || {};
      totalMeetingDuration += meeting.audioDuration || 0;

      let prevSpeaker = null;
      let prevEnd = 0;

      segments.forEach(segment => {
        const { speaker, start, end, text } = segment;
        const duration = end - start;
        const name = speakerMap[speaker] || speaker;

        if (!speakerStats[name]) {
          speakerStats[name] = {
            name,
            totalDuration: 0,
            wordCount: 0,
            longestMonologue: 0,
            interruptionCount: 0,
            questionsCount: 0,
            sessionCount: new Set(),
          };
        }

        const stats = speakerStats[name];
        stats.totalDuration += duration;
        stats.wordCount += text.trim().split(/\s+/).length;
        stats.longestMonologue = Math.max(stats.longestMonologue, duration);
        stats.sessionCount.add(meeting.id);
        
        if (prevSpeaker && prevSpeaker !== name) {
          if (start < prevEnd + 0.3) { 
            stats.interruptionCount += 1;
          }
        }

        const qs = (text.match(/\?/g) || []).length;
        stats.questionsCount += qs;
        totalQuestions += qs;

        totalAllSpeakingTime += duration;
        prevSpeaker = name;
        prevEnd = end;
      });
    });

    const speakersArray = Object.values(speakerStats).map(s => ({
      ...s,
      talkRatio: totalAllSpeakingTime > 0 ? (s.totalDuration / totalAllSpeakingTime) * 100 : 0,
      wpm: s.totalDuration > 0 ? Math.round(s.wordCount / (s.totalDuration / 60)) : 0,
      sessionCount: s.sessionCount.size
    })).sort((a, b) => b.totalDuration - a.totalDuration);

    const silenceRatio = totalMeetingDuration > 0 ? Math.max(0, (totalMeetingDuration - totalAllSpeakingTime) / totalMeetingDuration) * 100 : 0;

    return {
      speakers: speakersArray,
      silenceRatio,
      totalQuestions,
      totalDuration: totalMeetingDuration,
      meetingCount: meetingsData.length
    };
  }, [meetingsData]);

  if (loading) return <PageLoader label="Analyzing Communication Patterns..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
        <LuVolumeX size={48} className="text-rose-500 opacity-50" />
        <h2 className="text-xl font-bold text-white">Coach is Unavailable</h2>
        <p className="max-w-md text-slate-400">{error}</p>
      </div>
    );
  }

  if (!coachStats || !coachStats.speakers.length) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
        <LuActivity size={48} className="text-indigo-500 opacity-50" />
        <h2 className="text-xl font-bold text-white">Insufficient Data</h2>
        <p className="max-w-md text-slate-400">Process more meetings with speaker identification to unlock the coach.</p>
      </div>
    );
  }

  const formatSecs = (s) => s > 60 ? `${Math.floor(s/60)}m ${Math.round(s%60)}s` : `${Math.round(s)}s`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-12 transition-all duration-1000">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white md:text-4xl shadow-indigo-500/20">
            <LuBrain className="text-accent-secondary" />
            Speaker <span className="text-accent-primary">Coach</span>
          </h1>
          <p className="mt-2 text-slate-400"> Communication audit across your last {coachStats.meetingCount} sessions. </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-slate-900/40 px-4 py-2 backdrop-blur-md">
          <LuClock size={16} className="text-accent-primary" />
          <span className="text-sm font-medium text-slate-300">Last 10 Meetings</span>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Participation', value: `${Math.round(100 - coachStats.silenceRatio)}%`, icon: LuActivity, desc: 'active speaking ratio', color: 'indigo' },
          { label: 'Total Questions', value: coachStats.totalQuestions, icon: LuHelpCircle, desc: 'asked by all participants', color: 'violet' },
          { label: 'Total Voice', value: formatSecs(coachStats.totalDuration), icon: LuMic, desc: 'audiovisual duration', color: 'emerald' },
          { label: 'Avg Speed', value: `${coachStats.speakers.length > 0 ? Math.round(coachStats.speakers.reduce((acc, s) => acc + s.wpm, 0) / coachStats.speakers.length) : 0} wpm`, icon: LuZap, desc: 'average words per minute', color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-[20px] border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl transition-all hover:bg-slate-900/60 shadow-lg shadow-black/20">
            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-accent-primary/5 blur-3xl" />
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                </div>
                <p className="text-[11px] text-slate-500">{stat.desc}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 group-hover:text-accent-primary transition-colors">
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Participation Split */}
        <div className="rounded-[24px] border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl lg:col-span-1 shadow-xl shadow-black/10">
          <div className="mb-6 flex items-center gap-3">
            <LuBarChart3 className="text-accent-secondary" />
            <h3 className="font-bold text-white">Participation Split</h3>
          </div>
          <div className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coachStats.speakers}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="totalDuration"
                  nameKey="name"
                  animationDuration={1500}
                >
                  {coachStats.speakers.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                  formatter={(value) => `${formatSecs(value)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {coachStats.speakers.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-medium text-slate-300">{s.name}</span>
                </div>
                <span className="font-mono text-xs text-slate-500">{Math.round(s.talkRatio)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Speaker Dashboard */}
        <div className="space-y-4 lg:col-span-2">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Participant Analysis</h3>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
             {coachStats.speakers.map((speaker, i) => (
               <div key={speaker.name} className="group overflow-hidden rounded-[20px] border border-white/5 bg-slate-900/20 p-5 transition-all hover:bg-slate-900/40 hover:border-white/10 shadow-sm">
                 <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    {/* Speaker Identity */}
                    <div className="flex min-w-[140px] items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-accent-primary/10 font-bold text-accent-primary ring-1 ring-accent-primary/20 group-hover:ring-accent-primary/40 transition-all">
                        {speaker.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{speaker.name}</h4>
                        <p className="text-[10px] text-slate-500">{speaker.sessionCount} sessions active</p>
                      </div>
                    </div>

                    {/* Matrix */}
                    <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Pace</p>
                        <p className="text-sm font-bold text-white">{speaker.wpm} <span className="text-[10px] font-normal text-slate-500">wpm</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Monologue</p>
                        <p className="text-sm font-bold text-white">{formatSecs(speaker.longestMonologue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Curiosity</p>
                        <p className="text-sm font-bold text-white">{speaker.questionsCount} <span className="text-[10px] font-normal text-slate-500">qs</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Dynamic</p>
                        <p className={`text-sm font-bold ${speaker.interruptionCount > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {speaker.interruptionCount} <span className="text-[10px] font-normal text-slate-500">interrupts</span>
                        </p>
                      </div>
                    </div>
                 </div>

                 {/* Ratio Bar */}
                 <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div 
                      className="h-full bg-accent-primary transition-all duration-1000" 
                      style={{ width: `${speaker.talkRatio}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* Footer Insight */}
      <div className="rounded-[24px] border border-accent-primary/15 bg-accent-primary/5 p-6 backdrop-blur-xl ring-1 ring-white/5">
        <div className="flex items-start gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-primary/20 text-accent-primary">
            <LuTrendingUp size={20} />
          </div>
          <div>
            <h4 className="font-bold text-white">Collaboration Insight</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              The aggregate talk-to-silence ratio is <span className="font-bold text-white">{Math.round(100 - coachStats.silenceRatio)}%</span>. 
              {coachStats.speakers[0] && (
                <> <span className="text-accent-primary font-semibold">{coachStats.speakers[0].name}</span> tends to dominate sessions with the longest active monologues. Consider facilitating earlier contributions from other participants to balance the collective input.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakerCoachPage;

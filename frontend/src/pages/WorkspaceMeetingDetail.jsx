import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuArrowLeft,
  LuExternalLink,
  LuClock,
  LuFileText,
  LuSparkles,
  LuChevronRight,
  LuCpu,
} from 'react-icons/lu';
import api from '../services/api';
import { RoomProvider } from '../lib/liveblocks';
import CollaborativeEditor from '../components/workspace/CollaborativeEditor';
import TranscriptViewer from '../components/meeting/TranscriptViewer';
import { showToast } from '../components/common/Toast';

const WorkspaceMeetingDetail = () => {
  const { id: workspaceId, meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  const fetchData = async () => {
    try {
      const [wsRes, mtRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/workspaces/${workspaceId}/meetings/${meetingId}`),
      ]);

      if (wsRes.data.success) setWorkspace(wsRes.data.data);
      if (mtRes.data.success) setMeeting(mtRes.data.data);
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, meetingId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
         <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent-primary/20 border-t-accent-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
               <LuSparkles className="animate-pulse text-accent-primary" size={16} />
            </div>
         </div>
      </div>
    );
  }

  if (!meeting || !workspace) return <div className="p-20 text-center font-['Plus_Jakarta_Sans'] text-slate-500 text-white">Not found</div>;

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const myMember = workspace.members.find((m) => m.user.email === user?.email);
  const myRole = myMember?.role || 'VIEWER';
  const canEdit = myRole === 'OWNER' || myRole === 'EDITOR';

  const tabs = [
    { id: 'summary', label: 'Collaborative Summary', icon: LuCpu },
    { id: 'transcript', label: 'Raw Transcript', icon: LuFileText },
  ];

  return (
    <RoomProvider id={`${workspaceId}:${meetingId}`} initialPresence={{}}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl space-y-10 p-8 lg:p-12"
      >
        {/* Navigation / Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-widest text-slate-600">
             <button onClick={() => navigate('/workspaces')} className="hover:text-accent-primary transition-colors">Workspaces</button>
             <LuChevronRight size={12} />
             <button onClick={() => navigate(`/workspaces/${workspaceId}`)} className="hover:text-accent-primary transition-colors">{workspace.name}</button>
             <LuChevronRight size={12} />
             <span className="text-slate-400">{meeting.title}</span>
          </div>

          <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate(`/workspaces/${workspaceId}`)}
                className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#151b2d] ring-1 ring-white/[0.06] text-slate-400 transition-all hover:bg-[#1e253c] hover:text-white"
              >
                <LuArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-tight text-white lg:text-3xl">{meeting.title}</h1>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-['JetBrains_Mono'] text-[9px] font-extrabold uppercase tracking-tighter text-emerald-400 ring-1 ring-emerald-500/20">
                     <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                     Collaborative
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-6 font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-slate-500">
                  <span className="flex items-center gap-2">
                    <LuClock className="text-accent-primary/60" size={14} />
                    {new Date(meeting.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                  <span className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-widest text-slate-700">{meeting.category}</span>
                </div>
              </div>
            </div>

            <Link to={`/meeting/${meetingId}`}>
              <button className="group flex items-center gap-3 rounded-[10px] bg-white/[0.03] px-5 py-2.5 font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-accent-primary ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.06] hover:text-[#bdc2ff] hover:ring-white/[0.12]">
                <span>Personal View</span>
                <LuExternalLink className="transition-transform group-hover:translate-x-0.5" size={16} />
              </button>
            </Link>
          </header>
        </div>

        {/* Tab System */}
        <div className="space-y-8">
           <div className="flex items-center gap-1 border-b border-white/[0.04]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2.5 px-6 pb-4 pt-2 font-['Plus_Jakarta_Sans'] text-[14px] font-bold transition-all ${
                       activeTab === tab.id ? 'text-accent-primary' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                       <motion.div 
                        layoutId="active-tab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                       />
                    )}
                  </button>
                )
              })}
           </div>

           <AnimatePresence mode="wait">
              {activeTab === 'summary' ? (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                   <CollaborativeEditor
                    workspaceId={workspaceId}
                    meetingId={meetingId}
                    initialData={meeting}
                    canEdit={canEdit}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-[24px] bg-[#0c1324] p-8 ring-1 ring-white/[0.08]"
                >
                   <TranscriptViewer
                      transcript={meeting.transcriptText || meeting.transcript}
                      transcriptSegments={meeting.transcriptSegments}
                      speakerMap={meeting.speakerMap || {}}
                      nlpData={{
                        entities: meeting.nlpEntities ? meeting.nlpEntities.split(',').map(e => {
                          const [text, label] = e.trim().split(' (');
                          return { text, label: label?.replace(')', '') };
                        }) : []
                      }}
                   />
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </motion.div>
    </RoomProvider>
  );
};

export default WorkspaceMeetingDetail;

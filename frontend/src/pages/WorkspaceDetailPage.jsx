import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuUsers,
  LuCalendar,
  LuPlus,
  LuArrowLeft,
  LuLayout,
  LuExternalLink,
  LuTrash2,
  LuChevronRight,
  LuSparkles,
} from 'react-icons/lu';
import api from '../services/api';
import MemberCard from '../components/workspace/MemberCard';
import InviteMemberModal from '../components/workspace/InviteMemberModal';
import AddMeetingModal from '../components/workspace/AddMeetingModal';
import { showToast } from '../components/common/Toast';

const WorkspaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState(false);

  const fetchWorkspaceData = async () => {
    try {
      const [wsRes, meetingsRes] = await Promise.all([
        api.get(`/workspaces/${id}`),
        api.get(`/workspaces/${id}/meetings`),
      ]);

      if (wsRes.data.success) setWorkspace(wsRes.data.data);
      if (meetingsRes.data.success) setMeetings(meetingsRes.data.data);
    } catch (error) {
      showToast('Failed to load workspace data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await api.delete(`/workspaces/${id}/members/${userId}`);
      if (res.data.success) {
        showToast('Member removed', 'success');
        fetchWorkspaceData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to remove member', 'error');
    }
  };

  const handleRemoveMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to remove this meeting from the workspace?')) return;
    try {
      const res = await api.delete(`/workspaces/${id}/meetings/${meetingId}`);
      if (res.data.success) {
        showToast('Meeting removed', 'success');
        fetchWorkspaceData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to remove meeting', 'error');
    }
  };

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

  if (!workspace) return <div className="p-20 text-center font-['Plus_Jakarta_Sans'] text-slate-500">Workspace not found</div>;

  const myMember = workspace.members.find(
    (m) => m.user.email === JSON.parse(localStorage.getItem('user'))?.email
  );
  const myRole = myMember?.role || 'VIEWER';
  const isOwner = myRole === 'OWNER';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl space-y-10 p-8 lg:p-12"
    >
      {/* Breadcrumbs / Header area */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-widest text-slate-600">
           <button onClick={() => navigate('/workspaces')} className="hover:text-accent-primary transition-colors">Workspaces</button>
           <LuChevronRight size={12} />
           <span className="text-slate-400">{workspace.name}</span>
        </div>

        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/workspaces')}
              className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#151b2d] ring-1 ring-white/[0.06] text-slate-400 transition-all hover:bg-[#1e253c] hover:text-white"
            >
              <LuArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-white lg:text-4xl">{workspace.name}</h1>
              <p className="mt-1 font-['Plus_Jakarta_Sans'] text-[15px] font-medium text-slate-500">{workspace.description || 'Collective intelligence hub.'}</p>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="group flex h-11 items-center gap-2.5 rounded-[10px] bg-[#151b2d] px-6 font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-slate-300 ring-1 ring-white/[0.08] transition-all hover:bg-[#1e253c] hover:text-white hover:ring-white/[0.15]"
              >
                <LuUsers className="transition-transform group-hover:scale-110" size={16} />
                <span>Invite</span>
              </button>
              <button
                onClick={() => setIsAddMeetingModalOpen(true)}
                className="group relative flex h-11 items-center gap-2.5 rounded-[10px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] px-6 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-[#020617] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5"
              >
                <LuPlus size={18} />
                <span>Add Meeting</span>
              </button>
            </div>
          )}
        </header>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* --- Meetings List (Left) --- */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
            <h3 className="flex items-center gap-3 font-['Plus_Jakarta_Sans'] text-lg font-bold text-white">
              <LuCalendar className="text-accent-primary" size={20} />
              Shared Knowledge Base
            </h3>
            <div className="font-['JetBrains_Mono'] text-[11px] font-bold tracking-tighter text-slate-600">
              <span className="text-accent-primary">{meetings.length}</span> LOGS RECORDED
            </div>
          </div>

          <AnimatePresence mode="wait">
            {meetings.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-[24px] bg-[#0c1324]/50 py-20 text-center ring-1 ring-white/[0.04] backdrop-blur-sm"
              >
                <LuCalendar size={32} className="mb-4 text-slate-700" />
                <p className="font-['Plus_Jakarta_Sans'] text-[15px] font-medium text-slate-600">The archive is currently empty.</p>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {meetings.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(`/workspaces/${id}/meeting/${m.id}`)}
                    className="group relative flex cursor-pointer items-center justify-between rounded-[20px] bg-[#0c1324] p-5 ring-1 ring-white/[0.06] transition-all hover:bg-[#111827] hover:ring-white/[0.12]"
                  >
                    <div className="flex items-center gap-5 overflow-hidden">
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-[#151b2d] text-slate-500 transition-all group-hover:bg-accent-primary group-hover:text-[#020617] group-hover:shadow-[0_0_20px_rgba(129,140,248,0.4)]">
                        <LuExternalLink size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="truncate font-['Plus_Jakarta_Sans'] text-[15px] font-bold text-white group-hover:text-accent-primary transition-colors">{m.title}</h4>
                        <div className="mt-1 flex items-center gap-4">
                          <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-slate-600">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                          <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest text-[#a78bfa]/60">
                            {m.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <LuChevronRight size={18} className="text-slate-800 transition-transform group-hover:translate-x-1 group-hover:text-accent-primary" />
                       {isOwner && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             handleRemoveMeeting(m.id);
                           }}
                           className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-slate-800 transition-all hover:bg-red-500/10 hover:text-red-400"
                         >
                           <LuTrash2 size={16} />
                         </button>
                       )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* --- Sidebar (Right) --- */}
        <div className="space-y-8">
          <div className="rounded-[24px] bg-[#0c1324] p-6 ring-1 ring-white/[0.08]">
            <div className="mb-6 flex items-center justify-between">
               <h3 className="flex items-center gap-3 font-['Plus_Jakarta_Sans'] text-lg font-bold text-white">
                 <LuUsers className="text-accent-primary" size={20} />
                 The Collective
               </h3>
               <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-slate-600">{workspace.members.length}</span>
            </div>
            
            <div className="space-y-3">
              {workspace.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isOwner={isOwner}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-[#0c1324] p-8 ring-1 ring-white/[0.08] shadow-[0_0_80px_-20px_rgba(189,194,255,0.08)]">
             <div className="mb-8 flex items-center gap-3 text-accent-primary">
                <LuLayout size={20} />
                <span className="font-['Plus_Jakarta_Sans'] text-sm font-extrabold uppercase tracking-widest">Workspace Insights</span>
             </div>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-slate-500">Established</span>
                   <span className="font-['JetBrains_Mono'] text-xs font-bold text-slate-300">
                     {new Date(workspace.createdAt).toLocaleDateString()}
                   </span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-slate-500">Service Role</span>
                   <div className="rounded-full bg-accent-primary/10 px-2.5 py-0.5 font-['JetBrains_Mono'] text-[9px] font-extrabold uppercase tracking-tighter text-accent-primary ring-1 ring-accent-primary/20">
                      {myRole}
                   </div>
                </div>
                <div className="flex items-center justify-between">
                   <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-slate-500">Total Intel</span>
                   <span className="font-['JetBrains_Mono'] text-xs font-bold text-slate-300">{meetings.length} Shared</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspaceId={id}
        onInvited={fetchWorkspaceData}
      />
      <AddMeetingModal
        isOpen={isAddMeetingModalOpen}
        onClose={() => setIsAddMeetingModalOpen(false)}
        workspaceId={id}
        onAdded={fetchWorkspaceData}
      />
    </motion.div>
  );
};

export default WorkspaceDetailPage;

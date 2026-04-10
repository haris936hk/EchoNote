import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuPlus, LuLayout, LuUsers, LuCalendar, LuChevronRight, LuSparkles } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal';
import { showToast } from '../components/common/Toast';

const WorkspacesPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces/me');
      if (res.data.success) {
        setWorkspaces(res.data.data);
      }
    } catch (error) {
      showToast('Failed to load workspaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
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

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-7xl space-y-12 p-8 lg:p-12"
    >
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
             <LuLayout className="text-accent-primary" size={32} />
             <h1 className="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
               Workspaces
             </h1>
          </div>
          <p className="mt-3 font-['Plus_Jakarta_Sans'] text-lg font-medium text-slate-500">
            Collaborative archives for unified mission intelligence.
          </p>
        </motion.div>
        
        <motion.button
          variants={itemVariants}
          onClick={() => setIsModalOpen(true)}
          className="group relative flex h-12 items-center gap-3 rounded-[12px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] pl-6 pr-7 font-['Plus_Jakarta_Sans'] text-[14px] font-extrabold text-[#020617] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0"
        >
          <LuPlus size={20} className="transition-transform group-hover:rotate-90" />
          <span>New Workspace</span>
        </motion.button>
      </header>

      <AnimatePresence mode="wait">
        {workspaces.length === 0 ? (
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center rounded-[32px] bg-[#0c1324]/50 py-32 text-center ring-1 ring-white/[0.04] backdrop-blur-sm"
          >
            <div className="relative mb-8">
               <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#151b2d] ring-1 ring-white/[0.06] shadow-2xl">
                 <LuLayout className="text-slate-600" size={40} />
               </div>
               <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-accent-primary/10 flex items-center justify-center ring-1 ring-accent-primary/20">
                  <LuPlus className="text-accent-primary" size={16} />
               </div>
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">The Void of Collaboration</h3>
            <p className="mt-3 max-w-sm font-['Plus_Jakarta_Sans'] text-[15px] font-medium leading-relaxed text-slate-500">
              No shared archives detected. Establish a workspace to begin collaborative synthesis with your peers.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-10 font-['Plus_Jakarta_Sans'] text-[14px] font-bold text-accent-primary transition-all hover:text-[#bdc2ff] hover:underline underline-offset-8 decoration-2"
            >
              Establish your first workspace
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <motion.div
                key={workspace.id}
                variants={itemVariants}
                onClick={() => navigate(`/workspaces/${workspace.id}`)}
                className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[24px] bg-[#0c1324] p-8 ring-1 ring-white/[0.08] transition-all hover:-translate-y-1 hover:bg-[#111827] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] hover:ring-white/[0.15]"
              >
                {/* Background Accent Glow */}
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent-primary/5 blur-3xl transition-opacity group-hover:opacity-100 opacity-0" />

                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#151b2d] text-accent-primary ring-1 ring-white/[0.06] transition-all group-hover:bg-accent-primary group-hover:text-[#020617] group-hover:shadow-[0_0_20px_rgba(129,140,248,0.4)]">
                    <LuLayout size={24} />
                  </div>
                  <div className={`rounded-full px-3 py-1 font-['JetBrains_Mono'] text-[10px] font-bold tracking-tighter ring-1 ${
                      workspace.myRole === 'OWNER'
                        ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                        : workspace.myRole === 'EDITOR'
                          ? 'bg-accent-primary/10 text-accent-primary ring-accent-primary/20'
                          : 'bg-slate-500/10 text-slate-400 ring-white/10'
                    }`}>
                    {workspace.myRole}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-tight text-white group-hover:text-accent-primary transition-colors">
                    {workspace.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 min-h-[44px] font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-relaxed text-slate-500">
                    {workspace.description || 'System storage for collective mission intelligence.'}
                  </p>
                </div>

                <div className="mt-auto pt-8">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="flex flex-col gap-1">
                            <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Members</span>
                            <div className="flex items-center gap-2">
                               <LuUsers className="text-[#818cf8]/60" size={14} />
                               <span className="font-['JetBrains_Mono'] text-[13px] font-bold text-slate-300">{workspace._count?.members || 0}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Archives</span>
                            <div className="flex items-center gap-2">
                               <LuCalendar className="text-[#a78bfa]/60" size={14} />
                               <span className="font-['JetBrains_Mono'] text-[13px] font-bold text-slate-300">{workspace._count?.meetings || 0}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.03] text-slate-500 transition-all group-hover:bg-accent-primary/10 group-hover:text-accent-primary ring-1 ring-white/[0.05]">
                         <LuChevronRight size={20} className="transition-transform group-hover:translate-x-0.5" />
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchWorkspaces}
      />
    </motion.div>
  );
};

export default WorkspacesPage;

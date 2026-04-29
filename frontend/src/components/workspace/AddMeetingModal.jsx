import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LuX, LuCalendar, LuCheckCircle, LuShare2, LuOrbit } from 'react-icons/lu';
import api from '../../services/api';
import { showToast } from '../common/Toast';

const AddMeetingModal = ({ isOpen, onClose, workspaceId, onAdded }) => {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleMeetings();
    }
  }, [isOpen]);

  const fetchEligibleMeetings = async () => {
    setFetching(true);
    try {
      const res = await api.get('/meetings?status=COMPLETED&limit=100');
      if (res.data.success) {
        setMeetings(res.data.data.filter((m) => !m.workspaceMeeting));
      }
    } catch (error) {
      showToast('Failed to load eligible meetings', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMeeting) {
      showToast('Please select a meeting', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/meetings`, {
        meetingId: selectedMeeting,
      });
      if (res.data.success) {
        showToast('Meeting added to workspace', 'success');
        setSelectedMeeting(null);
        onAdded();
        onClose();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to add meeting', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMeeting = (id) => {
    setSelectedMeeting(prev => prev === id ? null : id);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl"
          />

          {}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-[#0c1324] shadow-[0_0_80px_-20px_rgba(189,194,255,0.2)] ring-1 ring-white/[0.08]"
          >
            {}
            <div className="flex-none p-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#151b2d] ring-1 ring-white/[0.06]">
                    <LuShare2 className="text-accent-primary" size={24} />
                  </div>
                  <div>
                    <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold tracking-tight text-white">
                      Add Meeting
                    </h2>
                    <p className="text-sm font-medium text-slate-500">Share archives with the workspace</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/[0.03] p-2 text-slate-500 transition-all hover:bg-white/[0.08] hover:text-white"
                >
                  <LuX size={18} />
                </button>
              </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
              <div className="space-y-6">
                <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  SELECT A COMPLETED MEETING
                </label>

                {fetching ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 w-full animate-pulse rounded-[16px] bg-[#151b2d] ring-1 ring-white/[0.06]" />
                    ))}
                  </div>
                ) : meetings.length > 0 ? (
                  <div className="grid gap-3">
                    {meetings.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleToggleMeeting(m.id)}
                        className={`group flex items-center justify-between rounded-[16px] p-4 transition-all ring-1 ${
                          selectedMeeting === m.id
                            ? 'bg-accent-primary/10 ring-accent-primary shadow-[0_0_30px_-5px_rgba(129,140,248,0.2)]'
                            : 'bg-[#151b2d]/50 ring-white/[0.06] hover:bg-[#151b2d] hover:ring-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center gap-4 truncate">
                          <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-[10px] ring-1 ${
                             selectedMeeting === m.id ? 'bg-accent-primary/20 ring-accent-primary/40' : 'bg-[#0c1324] ring-white/[0.1]'
                          }`}>
                            <LuCalendar className={selectedMeeting === m.id ? 'text-accent-primary' : 'text-slate-500'} size={20} />
                          </div>
                          <div className="flex flex-col items-start truncate text-left">
                            <span className="truncate font-['Plus_Jakarta_Sans'] text-[14px] font-bold text-white group-hover:text-accent-primary transition-colors">
                              {m.title}
                            </span>
                            <div className="mt-0.5 flex items-center gap-3">
                              <span className="font-['JetBrains_Mono'] text-[10px] tracking-tight text-slate-500">
                                {new Date(m.createdAt).toLocaleDateString()}
                              </span>
                              <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest text-[#a78bfa]/60">
                                {m.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-4">
                          <div className="flex flex-col items-end gap-1">
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                DONE
                             </div>
                             <span className="font-['JetBrains_Mono'] text-[10px] text-slate-600">
                               {Math.floor(m.audioDuration / 60)}:{(m.audioDuration % 60).toString().padStart(2, '0')}
                             </span>
                          </div>
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ring-1 ${
                            selectedMeeting === m.id ? 'bg-accent-primary ring-accent-primary' : 'bg-transparent ring-white/[0.1]'
                          }`}>
                            {selectedMeeting === m.id && <LuCheckCircle size={14} className="text-[#020617]" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] bg-[#151b2d]/30 p-12 ring-1 ring-white/[0.04]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#151b2d] ring-1 ring-white/[0.06]">
                      <LuOrbit className="animate-spin-slow text-slate-700" size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-slate-400">
                        No eligible meetings found.
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Only completed, non-workspace meetings can be shared.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {}
            <div className="relative flex-none bg-[#080d1a] p-8 pt-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 -translate-y-full bg-gradient-to-b from-transparent to-[#080d1a]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                   {selectedMeeting && (
                     <>
                        <span className="text-accent-primary">1</span> meeting selected
                     </>
                   )}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-slate-500 transition-all hover:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !selectedMeeting}
                    className="group relative flex h-11 items-center gap-3 rounded-[10px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] px-8 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-[#020617] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#020617] border-t-transparent" />
                    ) : (
                      <LuCheckCircle size={18} />
                    )}
                    <span>{loading ? 'Adding...' : 'Add to Workspace'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default AddMeetingModal;

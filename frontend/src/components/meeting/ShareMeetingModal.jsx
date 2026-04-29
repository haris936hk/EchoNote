import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LuShare2, LuLink, LuTrash2, LuCheck, LuCopy, LuX } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../common/Toast';
import api from '../../services/api';

const ShareMeetingModal = ({ isOpen, onClose, meeting, onShareUpdate }) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localShareToken, setLocalShareToken] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (meeting?.shareEnabled && meeting?.shareToken) {
      setLocalShareToken(meeting.shareToken);
    } else {
      setLocalShareToken(null);
    }
  }, [meeting, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!meeting) return null;

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const response = await api.delete(`/meetings/${meeting.id}/share`);
      if (response.data.success) {
        showToast('Share link revoked', 'success');
        setLocalShareToken(null);
        if (onShareUpdate) onShareUpdate();
        onClose();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to revoke link', 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post(`/meetings/${meeting.id}/share`);
      if (response.data.success) {
        showToast('Share link generated', 'success');
        setLocalShareToken(response.data.data.shareToken);
        if (onShareUpdate) onShareUpdate(response.data.data.shareUrl);
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to generate link', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareHref = localShareToken ? `${window.location.origin}/share/${localShareToken}` : '';

  const copyToClipboard = async () => {
    if (!shareHref) return;
    try {
      await navigator.clipboard.writeText(shareHref);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showToast('Share link copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
          {}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/70 backdrop-blur-xl"
          />

          {}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex w-full max-w-[500px] flex-col overflow-hidden rounded-card bg-[#0c1324] shadow-[0_0_80px_-20px_rgba(189,194,255,0.15)] ring-1 ring-white/[0.06]"
          >
            {}
            <div className="pointer-events-none absolute inset-0 rounded-card shadow-[inset_0_1px_rgba(255,255,255,0.05)]" />

            {}
            <div className="z-10 flex-none bg-[#0c1324] p-8 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="flex size-14 items-center justify-center rounded-[14px] bg-[#151b2d] shadow-inner ring-1 ring-white/[0.06]">
                      <LuShare2 className="text-[#818cf8]" size={28} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-[-0.03em] text-[#f8fafc]">
                      Share Publicly
                    </h2>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full bg-white/[0.03] p-2.5 text-[#94a3b8] ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.08] hover:text-[#f8fafc]"
                >
                  <LuX size={18} />
                </button>
              </div>
            </div>

            {}
            <div className="relative z-0 px-8 pb-8 pt-2">
              <p className="font-['Plus_Jakarta_Sans'] text-[14px] leading-relaxed text-[#94a3b8] mb-8">
                Create a public URL that anyone can use to view this meeting&#39;s summary. No sign-up required. Access to the transcript and audio will remain restricted.
              </p>

              {localShareToken ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3.5"
                >
                   <div className="flex items-center justify-between mb-1">
                     <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                       Your Share Link
                     </label>
                   </div>

                   <div className="flex items-center gap-3">
                     <div className="relative flex-1">
                       <input
                         readOnly
                         value={shareHref}
                         className="h-12 w-full rounded-[10px] bg-[#151b2d] px-4 pr-12 font-['JetBrains_Mono'] text-[13px] text-[#f8fafc] ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] focus:outline-none"
                       />
                       <button
                         onClick={copyToClipboard}
                         className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-white/[0.05] p-2 text-[#94a3b8] transition-all hover:bg-white/[0.1] hover:text-[#f8fafc]"
                       >
                         {copiedLink ? <LuCheck size={14} className="text-[#22C55E]" /> : <LuCopy size={14} />}
                       </button>
                     </div>
                   </div>
                </motion.div>
              ) : (
                <button
                  disabled={isGenerating}
                  onClick={handleGenerate}
                  className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-[10px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] px-6 font-['Plus_Jakarta_Sans'] text-[14px] font-extrabold text-echo-base shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
                  >
                  {isGenerating ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-echo-base border-t-transparent" />
                  ) : (
                    <LuShare2 size={18} className="transition-transform group-hover:scale-110" />
                  )}
                  <span>Generate Share Link</span>
                </button>
              )}
            </div>

            {}
            {(localShareToken) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative z-10 flex flex-none items-center justify-between bg-[#0c1324] p-8 pt-6"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-10 -translate-y-full bg-gradient-to-b from-transparent to-[#0c1324]" />

                <button
                  onClick={handleRevoke}
                  disabled={isRevoking}
                  className="group flex items-center gap-2.5 rounded-[10px] bg-red-500/10 px-4 py-2.5 text-red-400 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRevoking ? (
                     <div className="size-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  ) : (
                     <LuTrash2 size={16} />
                  )}
                  <span className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold">Revoke Link</span>
                </button>

                <button
                  onClick={onClose}
                  className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-[#64748b] transition-all hover:text-[#94a3b8]"
                >
                  Close
                </button>
              </motion.div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(modalContent, document.body);
};

export default ShareMeetingModal;

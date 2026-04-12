import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LuMail, LuRotateCw, LuSparkles, LuCheck, LuCopy, LuX } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../common/Toast';
import { generateFollowUp } from '../../services/meeting.service';

const FollowUpModal = ({ isOpen, onClose, meetingId, meetingTitle }) => {
  const [tone, setTone] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({ subject: '', body: '' });
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchDraft = useCallback(
    async (selectedTone) => {
      setLoading(true);
      try {
        const result = await generateFollowUp(meetingId, selectedTone);
        if (result.success) {
          setDraft(result.data);
        } else {
          showToast(result.error || 'Failed to generate follow-up', 'error');
        }
      } catch (error) {
        showToast('An unexpected error occurred', 'error');
      } finally {
        setLoading(false);
        setIsRegenerating(false);
      }
    },
    [meetingId]
  );

  useEffect(() => {
    if (isOpen && meetingId && !draft.subject) {
      fetchDraft(tone);
    }
  }, [isOpen, meetingId, fetchDraft, tone, draft.subject]);

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

  const handleToneChange = (newTone) => {
    if (newTone === tone || loading) return;
    setTone(newTone);
    fetchDraft(newTone);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      }
      showToast(`${type === 'subject' ? 'Subject' : 'Email body'} copied!`, 'success');
    } catch (err) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const openInMailClient = async () => {
    const subject = draft.subject || '';
    const body = draft.body || '';
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      showToast('Draft copied to clipboard!', 'success');
    } catch (e) {
    }

    if (mailtoUrl.length > 2000) {
      setTimeout(() => {
        showToast('Email too long for auto-open. Please paste from clipboard!', 'warning');
      }, 500);
      const shortMailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please paste the email draft from your clipboard here.')}`;
      window.location.href = shortMailto;
      return;
    }

    window.location.href = mailtoUrl;
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    fetchDraft(tone);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/70 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex max-h-[min(85vh,800px)] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-[#0c1324] shadow-[0_0_80px_-20px_rgba(189,194,255,0.15)] ring-1 ring-white/[0.06]"
          >
            {/* Outline Glow Fallback / Additional ambient light */}
            <div className="pointer-events-none absolute inset-0 rounded-card shadow-[inset_0_1px_rgba(255,255,255,0.05)]" />

            {/* Header (Fixed) */}
            <div className="z-10 flex-none bg-[#0c1324] p-8 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  {/* AI Living Indicator */}
                  <div className="relative">
                    <div className="flex size-14 items-center justify-center rounded-[14px] bg-[#151b2d] shadow-inner ring-1 ring-white/[0.06]">
                      <LuSparkles className="text-[#818cf8]" size={28} />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 animate-pulse rounded-full bg-[#a78bfa] shadow-[0_0_12px_4px_rgba(167,139,250,0.3)]" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-[-0.03em] text-[#f8fafc]">
                      AI Smart Follow-up
                    </h2>
                    <div className="flex items-center gap-2.5">
                      <span className="font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#94a3b8]">
                        Context:
                      </span>
                      <span className="rounded-full bg-white/[0.03] px-3 py-1 font-['JetBrains_Mono'] text-[11px] font-medium tracking-tight text-[#818cf8] ring-1 ring-white/[0.06]">
                        {meetingTitle || 'Meeting Context'}
                      </span>
                    </div>
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

            {/* Scrollable Body */}
            <div className="relative z-0 flex-1 overflow-y-auto px-8 pb-4 scrollbar-hide">
              <div className="space-y-8">
                {/* Email Tone Selector */}
                <div className="space-y-3.5">
                  <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                    EMAIL TONE
                  </label>
                  <div className="relative flex rounded-[12px] bg-[#151b2d]/50 p-1.5 ring-1 ring-white/[0.06] backdrop-blur-md">
                    {/* Sliding Background */}
                    <motion.div
                      className="absolute inset-y-1.5 w-[calc(50%-6px)] rounded-[8px] bg-gradient-to-br from-[#818cf8] to-[#a78bfa] shadow-[0_4px_12px_rgba(129,140,248,0.25)]"
                      initial={false}
                      animate={{ x: tone === 'formal' ? 0 : '100%' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                    <button
                      onClick={() => handleToneChange('formal')}
                      className={`relative flex-1 py-2 font-['Plus_Jakarta_Sans'] text-[13px] font-bold transition-all duration-300 ${
                        tone === 'formal' ? 'text-echo-base' : 'text-[#94a3b8] hover:text-[#f8fafc]'
                      }`}
                    >
                      Formal
                    </button>
                    <button
                      onClick={() => handleToneChange('casual')}
                      className={`relative flex-1 py-2 font-['Plus_Jakarta_Sans'] text-[13px] font-bold transition-all duration-300 ${
                        tone === 'casual' ? 'text-echo-base' : 'text-[#94a3b8] hover:text-[#f8fafc]'
                      }`}
                    >
                      Casual
                    </button>
                  </div>
                </div>

                {/* Subject Line */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                      SUBJECT LINE
                    </label>
                    <AnimatePresence>
                      {!loading && draft.subject && (
                        <motion.button
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => copyToClipboard(draft.subject, 'subject')}
                          className="rounded-full bg-white/[0.03] p-2 text-[#94a3b8] ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.08] hover:text-[#f8fafc]"
                        >
                          {copiedSubject ? (
                            <LuCheck size={14} className="text-[#22C55E]" />
                          ) : (
                            <LuCopy size={14} />
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div
                          key="skeleton-subject"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="relative h-12 w-full overflow-hidden rounded-[10px] bg-[#151b2d] ring-1 ring-white/[0.06]"
                        >
                          <div
                            className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
                            style={{ backgroundSize: '200% 100%' }}
                          />
                          <div className="flex h-full items-center px-4">
                            <span className="font-['Plus_Jakarta_Sans'] text-xs italic text-[#64748b]">
                              Synthesizing subject...
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content-subject"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <input
                            value={draft.subject}
                            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                            className="h-12 w-full rounded-[10px] bg-[#151b2d] px-4 font-['Plus_Jakarta_Sans'] text-[14px] text-[#f8fafc] ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] focus:bg-[#1e253c] focus:outline-none focus:ring-[#818cf8]/50"
                            placeholder="Email subject..."
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Message Body */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                      MESSAGE BODY
                    </label>
                    <AnimatePresence>
                      {!loading && draft.body && (
                        <motion.button
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => copyToClipboard(draft.body, 'body')}
                          className="rounded-full bg-white/[0.03] p-2 text-[#94a3b8] ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.08] hover:text-[#f8fafc]"
                        >
                          {copiedBody ? (
                            <LuCheck size={14} className="text-[#22C55E]" />
                          ) : (
                            <LuCopy size={14} />
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div
                          key="skeleton-body"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="relative h-[260px] w-full overflow-hidden rounded-[10px] bg-[#151b2d] ring-1 ring-white/[0.06]"
                        >
                          <div
                            className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
                            style={{ backgroundSize: '200% 100%' }}
                          />
                          <div className="space-y-4 p-6">
                            <div className="h-2 w-4/5 rounded bg-white/[0.05]" />
                            <div className="h-2 w-[95%] rounded bg-white/[0.05]" />
                            <div className="h-2 w-[70%] rounded bg-white/[0.05]" />
                            <div className="h-2 w-2/5 rounded bg-white/[0.05]" />
                            <div className="mt-8 h-2 w-4/5 rounded bg-white/[0.05]" />
                            <div className="h-2 w-[90%] rounded bg-white/[0.05]" />
                            <div className="h-2 w-3/5 rounded bg-white/[0.05]" />
                            <span className="absolute bottom-6 left-6 font-['Plus_Jakarta_Sans'] text-xs italic text-[#64748b]">
                              The magic is happening...
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content-body"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <textarea
                            value={draft.body}
                            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                            className="h-[260px] w-full resize-none rounded-[10px] bg-[#151b2d] p-6 font-['Plus_Jakarta_Sans'] text-[14px] leading-relaxed text-[#f8fafc] ring-1 ring-white/[0.06] transition-all scrollbar-hide hover:ring-white/[0.12] focus:bg-[#1e253c] focus:outline-none focus:ring-[#818cf8]/50"
                            placeholder="Email content..."
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (Fixed) */}
            <div className="relative z-10 flex flex-none items-center justify-between bg-[#0c1324] p-8 pt-6">
              {/* Tonal Transition instead of border line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 -translate-y-full bg-gradient-to-b from-transparent to-[#0c1324]" />

              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="group flex items-center gap-2.5 bg-transparent px-0 text-[#94a3b8] transition-all hover:text-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <motion.div
                  animate={{ rotate: isRegenerating ? 360 : 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <LuRotateCw size={16} />
                </motion.div>
                <span className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold">Regenerate</span>
              </button>

              <div className="flex items-center gap-8">
                <button
                  onClick={onClose}
                  className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-[#64748b] transition-all hover:text-[#94a3b8]"
                >
                  Cancel
                </button>
                <button
                  disabled={loading || !draft.body}
                  onClick={openInMailClient}
                  className="group relative flex h-11 items-center gap-3 rounded-[10px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] pl-6 pr-7 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-echo-base shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
                >
                  <LuMail size={18} className="transition-transform group-hover:scale-110" />
                  <span>Open in Mail Client</span>
                </button>
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

export default FollowUpModal;

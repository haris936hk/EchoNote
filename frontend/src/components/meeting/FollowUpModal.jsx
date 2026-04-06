import React, { useState, useEffect, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { LuMail, LuRotateCw, LuSparkles, LuCheck, LuCopy } from 'react-icons/lu';
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

  const openInMailClient = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    window.location.href = mailtoUrl;
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    fetchDraft(tone);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      hideCloseButton
      scrollBehavior="inside"
      backdrop="blur"
      motionProps={{
        variants: {
          initial: {
            y: 8,
            opacity: 0,
          },
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: 'easeOut',
            },
          },
          exit: {
            y: 8,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: 'easeIn',
            },
          },
        },
      }}
      className="overflow-hidden border-none bg-echo-base shadow-[0_0_80px_-20px_rgba(129,140,248,0.15)]"
      classNames={{
        base: 'max-h-[92vh] flex flex-col rounded-[16px] border border-white/5 backdrop-blur-2xl',
        header: 'p-8 pb-0',
        body: 'p-8 pt-6',
        footer: 'p-8 pt-0',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-6">
          <div className="flex items-center gap-5">
            {/* AI Living Indicator */}
            <div className="relative">
              <div className="flex size-14 items-center justify-center rounded-[14px] bg-[#0f172a] shadow-inner ring-1 ring-white/5">
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
                <span className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 font-['JetBrains_Mono'] text-[11px] font-medium tracking-tight text-[#818cf8]">
                  {meetingTitle || 'Test Tasks'}
                </span>
              </div>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="scrollbar-hide">
          <div className="space-y-8">
            {/* Email Tone Selector */}
            <div className="space-y-3.5">
              <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                EMAIL TONE
              </label>
              <div className="relative flex rounded-[12px] border border-white/5 bg-[#0f172a]/50 p-1.5 backdrop-blur-md">
                {/* Sliding Background */}
                <motion.div
                  className="absolute inset-y-1.5 w-[calc(50%-6px)] rounded-[8px] bg-gradient-to-br from-[#818cf8] to-[#a78bfa] shadow-[0_4px_12px_rgba(129,140,248,0.25)]"
                  initial={false}
                  animate={{
                    x: tone === 'formal' ? 0 : '100%',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
                <button
                  onClick={() => handleToneChange('formal')}
                  className={`relative flex-1 py-2 font-['Plus_Jakarta_Sans'] text-[13px] font-bold transition-all duration-300 ${
                    tone === 'formal' ? 'text-echo-base' : 'text-[#64748b] hover:text-[#94a3b8]'
                  }`}
                >
                  Formal
                </button>
                <button
                  onClick={() => handleToneChange('casual')}
                  className={`relative flex-1 py-2 font-['Plus_Jakarta_Sans'] text-[13px] font-bold transition-all duration-300 ${
                    tone === 'casual' ? 'text-echo-base' : 'text-[#64748b] hover:text-[#94a3b8]'
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
                      className="rounded-full bg-white/[0.03] p-2 text-[#94a3b8] ring-1 ring-white/5 transition-all hover:bg-white/[0.05] hover:text-[#f8fafc]"
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
                      className="relative h-12 w-full overflow-hidden rounded-input bg-echo-surface ring-1 ring-white/5"
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
                      className="group"
                    >
                      <input
                        value={draft.subject}
                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                        className="h-12 w-full rounded-input border border-white/5 bg-echo-surface px-4 font-['Plus_Jakarta_Sans'] text-[14px] text-[#f8fafc] transition-all hover:border-white/10 focus:border-[#818cf8]/50 focus:bg-echo-surface/80 focus:outline-none"
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
                      className="rounded-full bg-white/[0.03] p-2 text-[#94a3b8] ring-1 ring-white/5 transition-all hover:bg-white/[0.05] hover:text-[#f8fafc]"
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
                      className="relative h-[260px] w-full overflow-hidden rounded-input bg-echo-surface ring-1 ring-white/5"
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
                        className="h-[260px] w-full resize-none rounded-input border border-white/5 bg-echo-surface p-6 font-['Plus_Jakarta_Sans'] text-[14px] leading-relaxed text-[#f8fafc] transition-all scrollbar-hide hover:border-white/10 focus:border-[#818cf8]/50 focus:bg-echo-surface/80 focus:outline-none"
                        placeholder="Email content..."
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex items-center justify-between border-t border-white/5">
          <Button
            variant="light"
            onPress={handleRegenerate}
            isDisabled={loading}
            className="group flex items-center gap-2.5 bg-transparent px-0 text-[#94a3b8] transition-all hover:text-[#f8fafc]"
          >
            <motion.div
              animate={{ rotate: isRegenerating ? 360 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <LuRotateCw size={16} />
            </motion.div>
            <span className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold">Regenerate</span>
          </Button>

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
              className="group relative flex h-11 items-center gap-3 rounded-btn bg-gradient-to-br from-[#818cf8] to-[#a78bfa] pl-6 pr-7 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-echo-base shadow-[0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
            >
              {/* Inner Gloss */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] rounded-t-btn bg-white/25 brightness-150" />
              <LuMail size={18} className="transition-transform group-hover:scale-110" />
              <span>Open in Mail Client</span>
            </button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FollowUpModal;

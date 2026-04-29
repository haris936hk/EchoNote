import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LuX, LuLayout, LuCheckSquare } from 'react-icons/lu';
import api from '../../services/api';
import { showToast } from '../common/Toast';

const CreateWorkspaceModal = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Workspace name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/workspaces', { name, description });
      if (res.data.success) {
        showToast('Workspace created successfully', 'success');
        setName('');
        setDescription('');
        onCreated();
        onClose();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to create workspace', 'error');
    } finally {
      setLoading(false);
    }
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
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] bg-[#0c1324] shadow-[0_0_80px_-20px_rgba(129,140,248,0.2)] ring-1 ring-white/[0.08]"
          >
            {}
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#151b2d] ring-1 ring-white/[0.06]">
                    <LuLayout className="text-accent-primary" size={24} />
                  </div>
                  <div>
                    <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold tracking-tight text-white">
                      Create Workspace
                    </h2>
                    <p className="text-sm font-medium text-slate-500">Collaborative hub for your team</p>
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
            <div className="space-y-6 p-8 pt-4">
              <div className="space-y-2">
                <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  WORKSPACE NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 w-full rounded-[12px] bg-[#151b2d] px-4 font-['Plus_Jakarta_Sans'] text-[14px] text-white ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] focus:bg-[#1e253c] focus:outline-none focus:ring-accent-primary/40"
                />
              </div>

              <div className="space-y-2">
                <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  placeholder="What is this workspace for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[12px] bg-[#151b2d] p-4 font-['Plus_Jakarta_Sans'] text-[14px] leading-relaxed text-white ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] focus:bg-[#1e253c] focus:outline-none focus:ring-accent-primary/40"
                />
              </div>
            </div>

            {}
            <div className="relative flex items-center justify-end gap-4 bg-[#080d1a] p-8 pt-6">
              {}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 -translate-y-full bg-gradient-to-b from-transparent to-[#080d1a]" />

              <button
                onClick={onClose}
                className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-slate-500 transition-all hover:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="group relative flex h-11 items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] px-6 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-[#020617] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#020617] border-t-transparent" />
                ) : (
                  <LuCheckSquare size={18} />
                )}
                <span>{loading ? 'Creating...' : 'Create Workspace'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default CreateWorkspaceModal;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LuX, LuUserPlus, LuMail, LuShieldCheck, LuSend } from 'react-icons/lu';
import api from '../../services/api';
import { showToast } from '../common/Toast';

const roles = [
  { id: 'EDITOR', label: 'Editor', desc: 'Can edit content' },
  { id: 'VIEWER', label: 'Viewer', desc: 'Read-only' },
];

const InviteMemberModal = ({ isOpen, onClose, workspaceId, onInvited }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
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
    if (!email.trim()) {
      showToast('Email is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/members`, {
        email,
        role,
      });
      if (res.data.success) {
        showToast('Member invited successfully', 'success');
        setEmail('');
        onInvited();
        onClose();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to invite member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] bg-[#0c1324] shadow-[0_0_80px_-20px_rgba(189,194,255,0.2)] ring-1 ring-white/[0.08]"
          >
            {/* Header */}
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#151b2d] ring-1 ring-white/[0.06]">
                    <LuUserPlus className="text-accent-primary" size={24} />
                  </div>
                  <div>
                    <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold tracking-tight text-white">
                      Invite Member
                    </h2>
                    <p className="text-sm font-medium text-slate-500">Expand your collaboration circle</p>
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

            {/* Body */}
            <div className="space-y-6 p-8 pt-4">
              <div className="space-y-2">
                <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <LuMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    placeholder="partner@ecosystem.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-[12px] bg-[#151b2d] pl-12 pr-4 font-['Plus_Jakarta_Sans'] text-[14px] text-white ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] focus:bg-[#1e253c] focus:outline-none focus:ring-accent-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  WORKSPACE ROLE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`group relative flex flex-col items-start gap-1 rounded-[14px] p-4 text-left transition-all ring-1 focus:outline-none ${
                        role === r.id
                          ? 'bg-accent-primary/10 ring-accent-primary'
                          : 'bg-[#151b2d] ring-white/[0.06] hover:bg-[#1e253c] hover:ring-white/[0.15]'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span
                          className={`font-['Plus_Jakarta_Sans'] text-[13px] font-bold ${
                            role === r.id ? 'text-accent-primary' : 'text-white'
                          }`}
                        >
                          {r.label}
                        </span>
                        {role === r.id && <LuShieldCheck className="text-accent-primary" size={16} />}
                      </div>
                      <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-slate-500">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-end gap-4 bg-[#080d1a] p-8 pt-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 -translate-y-full bg-gradient-to-b from-transparent to-[#080d1a]" />
              
              <button
                onClick={onClose}
                className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-slate-500 transition-all hover:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
                className="group relative flex h-11 items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] px-6 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-[#020617] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#020617] border-t-transparent" />
                ) : (
                  <LuSend size={18} />
                )}
                <span>{loading ? 'Sending...' : 'Send Invitation'}</span>
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

export default InviteMemberModal;

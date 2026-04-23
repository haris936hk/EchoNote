import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { LuListChecks, LuX, LuUser, LuCalendar, LuAlertCircle } from 'react-icons/lu';
import EtherealDatePicker from './EtherealDatePicker';

const PRIORITIES = [
  { value: 'high', label: 'High', color: 'text-red-400', bg: 'bg-red-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-400' },
  { value: 'low', label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-400' },
];

export default function EditTaskModal({ isOpen, onClose, task, onSave }) {
  const [formData, setFormData] = useState({
    task: '',
    assignee: '',
    deadline: '',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        task: task.task || '',
        assignee: task.assignee || '',
        deadline: task.deadline || '',
        priority: task.priority || 'medium',
      });
    }
  }, [task, isOpen]);

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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.task.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave({ ...task, ...formData });
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSubmitting(false);
    }
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
                  <div className="relative">
                    <div className="flex size-14 items-center justify-center rounded-[14px] bg-[#151b2d] shadow-inner ring-1 ring-white/[0.06]">
                      <LuListChecks className="text-[#818cf8]" size={28} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-[-0.03em] text-[#f8fafc]">
                      Edit Action Item
                    </h2>
                    <p className="font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#94a3b8]">
                      Update task details, deadline or assignment
                    </p>
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
              <div className="space-y-6">
                {/* Task Description */}
                <div className="space-y-3.5">
                  <label className="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                    <LuListChecks size={14} /> TASK DESCRIPTION
                  </label>
                  <textarea
                    value={formData.task}
                    onChange={(e) => handleChange('task', e.target.value)}
                    className="min-h-[100px] w-full resize-y rounded-input bg-[#151b2d] p-4 font-['Plus_Jakarta_Sans'] text-[14px] leading-relaxed text-[#f8fafc] ring-1 ring-white/[0.06] transition-all scrollbar-hide hover:ring-white/[0.12] focus:bg-[#1e253c] focus:outline-none focus:ring-[#818cf8]/50"
                    placeholder="What needs to be done?"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Assignee */}
                  <div className="space-y-3.5">
                    <label className="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                      <LuUser size={14} /> ASSIGNEE
                    </label>
                    <input
                      value={formData.assignee}
                      onChange={(e) => handleChange('assignee', e.target.value)}
                      className="h-12 w-full rounded-input bg-[#151b2d] px-4 font-['Plus_Jakarta_Sans'] text-[14px] text-[#f8fafc] ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] focus:bg-[#1e253c] focus:outline-none focus:ring-[#818cf8]/50"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  {/* Deadline (Custom Ethereal Date Picker) */}
                  <div className="space-y-3.5">
                    <label className="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                      <LuCalendar size={14} /> DEADLINE
                    </label>
                    <EtherealDatePicker
                      value={formData.deadline}
                      onChange={(date) => handleChange('deadline', date)}
                    />
                  </div>
                </div>

                {/* Priority Selector */}
                <div className="space-y-3.5">
                  <label className="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
                    <LuAlertCircle size={14} /> PRIORITY LEVEL
                  </label>
                  <div className="flex gap-3">
                    {PRIORITIES.map((p) => {
                      const isSelected = formData.priority === p.value;
                      return (
                        <button
                          key={p.value}
                          onClick={() => handleChange('priority', p.value)}
                          className={`relative flex-1 rounded-btn py-3 font-['Plus_Jakarta_Sans'] text-[13px] font-bold ring-1 transition-all duration-300 ${
                            isSelected
                              ? 'bg-[#151b2d] text-[#f8fafc] shadow-[0_4px_12px_rgba(129,140,248,0.1)] ring-[#818cf8]/50'
                              : 'bg-transparent text-[#64748b] ring-white/[0.06] hover:bg-[#151b2d]/50 hover:text-[#94a3b8]'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className={`size-2 rounded-full ${isSelected ? p.bg : 'bg-[#64748b]'}`}
                            />
                            {p.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (Fixed) */}
            <div className="relative z-10 flex flex-none items-center justify-between bg-[#0c1324] p-8 pt-6">
              {/* Tonal Transition instead of border line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 -translate-y-full bg-gradient-to-b from-transparent to-[#0c1324]" />

              <div className="flex w-full items-center justify-end gap-8">
                <button
                  onClick={onClose}
                  className="font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-[#64748b] transition-all hover:text-[#94a3b8]"
                >
                  Cancel
                </button>
                <button
                  disabled={!formData.task.trim() || isSubmitting}
                  onClick={handleSubmit}
                  className="group relative flex h-11 items-center justify-center gap-2 rounded-btn bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] px-8 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-echo-base shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_24px_-8px_rgba(129,140,248,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_32px_-8px_rgba(129,140,248,0.6)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
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
}

EditTaskModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  task: PropTypes.object,
  onSave: PropTypes.func.isRequired,
};

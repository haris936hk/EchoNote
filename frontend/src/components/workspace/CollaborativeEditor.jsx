import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuCheckCircle, LuCloud, LuCloudOff, LuUsers, LuHash, LuPenTool, LuMaximize2, LuPencil, LuPlus, LuTrash2, LuSparkles, LuUser, LuCalendar, LuTag, LuArrowRight } from 'react-icons/lu';
import {
  useMyPresence,
  useOthers,
  useBroadcastEvent,
  useEventListener,
} from '../../lib/liveblocks';
import api from '../../services/api';
import debounce from 'lodash.debounce';
import { showToast } from '../common/Toast';
import EditTaskModal from '../meeting/EditTaskModal';
import { taskService } from '../../services/task.service';

const CollaborativeEditor = ({ workspaceId, meetingId, initialData, canEdit }) => {
  const [, updatePresence] = useMyPresence();
  const others = useOthers();
  const broadcast = useBroadcastEvent();

  const s = initialData.summary || {};
  const [formData, setFormData] = useState({
    executiveSummary: s.executiveSummary || initialData.summaryExecutive || '',
    keyDecisions: Array.isArray(s.keyDecisions)
      ? s.keyDecisions
      : (initialData.summaryKeyDecisions ? (typeof initialData.summaryKeyDecisions === 'string' ? JSON.parse(initialData.summaryKeyDecisions) : initialData.summaryKeyDecisions) : []),
    actionItems: Array.isArray(s.actionItems)
      ? s.actionItems
      : (initialData.summaryActionItems || []),
    nextSteps: Array.isArray(s.nextSteps)
      ? s.nextSteps
      : (initialData.summaryNextSteps ? (typeof initialData.summaryNextSteps === 'string' ? JSON.parse(initialData.summaryNextSteps) : initialData.summaryNextSteps) : []),
  });

  const [editingTask, setEditingTask] = useState(null);

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEventListener(({ event }) => {
    if (event.type === 'UPDATE_FIELD') {
      setFormData((prev) => ({
        ...prev,
        [event.field]: event.value,
      }));
    }
  });

  const debouncedSave = useCallback(
    debounce(async (data) => {
      setSaving(true);
      try {
        await api.patch(`/meetings/${meetingId}/summary`, {
          executiveSummary: data.executiveSummary,
          keyDecisions: data.keyDecisions,
          actionItems: data.actionItems,
          nextSteps: data.nextSteps,
        });
        setLastSaved(new Date());
        setIsDirty(false);
      } catch (error) {
        showToast('Auto-save failed', 'error');
      } finally {
        setSaving(false);
      }
    }, 3000),
    [meetingId]
  );

  const handleChange = (field, value) => {
    if (!canEdit) return;

    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      setIsDirty(true);
      debouncedSave(newData);
      return newData;
    });

    try { broadcast({ type: 'UPDATE_FIELD', field, value }); } catch (_) {}
    try { updatePresence({ lastSection: field }); } catch (_) {}
  };

  const handleFocus = (field) => {
    try { updatePresence({ focusedField: field }); } catch (_) {}
  };

  const handleBlur = () => {
    try { updatePresence({ focusedField: null }); } catch (_) {}
  };

  return (
    <div className="space-y-8">
      {/* Presence bar */}
      <div className="flex items-center justify-between rounded-[20px] bg-[#0c1324] px-6 py-4 ring-1 ring-white/[0.06] shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="flex size-8 items-center justify-center rounded-[10px] bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20">
                <LuUsers size={16} />
             </div>
             <div className="flex -space-x-2 overflow-hidden">
                {others.map(({ connectionId, presence: otherPresence, info }) => (
                  <div 
                    key={connectionId}
                    className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0c1324] bg-accent-primary/10 ring-1 ring-accent-primary/20 transition-transform hover:z-10 hover:scale-110"
                  >
                    {info?.avatar ? (
                      <img src={info.avatar} alt={info.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-bold text-accent-primary">
                        {info?.name?.charAt(0) || '?'}
                      </span>
                    )}
                    {/* Tooltip Overlay */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded-md bg-[#1e253c] px-2 py-1 font-['Plus_Jakarta_Sans'] text-[10px] font-bold text-white opacity-0 shadow-lg ring-1 ring-white/[0.1] transition-opacity group-hover:opacity-100">
                      {info?.name} {otherPresence?.focusedField ? `• Editing ${otherPresence.focusedField}` : '• Viewing'}
                    </div>
                  </div>
                ))}
             </div>
          </div>
          {others.length > 0 && (
            <div className="font-['JetBrains_Mono'] text-[11px] font-bold tracking-tight text-slate-500">
              <span className="text-accent-primary">{others.length}</span> OTHER SYNCED MINDS
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {saving ? (
              <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-[10px] font-bold text-slate-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent-primary" />
                Synchronizing...
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-[10px] font-bold text-emerald-400">
                <LuCheckCircle size={14} />
                LATEST REVISION: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            ) : null}
          </div>
          <div className={`transition-colors ${isDirty ? 'text-amber-400' : 'text-slate-700'}`}>
            {isDirty ? <LuCloudOff size={20} /> : <LuCloud size={20} />}
          </div>
        </div>
      </div>

      {/* Editor Sections */}
      <div className="grid gap-8">
        <EditorSection
          title="Manifest / Executive Summary"
          value={formData.executiveSummary}
          onChange={(val) => handleChange('executiveSummary', val)}
          onFocus={() => handleFocus('executiveSummary')}
          onBlur={handleBlur}
          disabled={!canEdit}
          placeholder="Condense the mission complexity into a singular narrative..."
          othersFocussed={others.filter(o => o.presence?.focusedField === 'executiveSummary')}
        />

        <div className="grid gap-8 md:grid-cols-2">
          <StrategicDecisionsEditor
            decisions={formData.keyDecisions}
            onChange={(val) => handleChange('keyDecisions', val)}
            onFocus={() => handleFocus('keyDecisions')}
            onBlur={handleBlur}
            disabled={!canEdit}
            othersFocussed={others.filter(o => o.presence?.focusedField === 'keyDecisions')}
          />
          <AssignedInitiativesEditor
            actionItems={formData.actionItems}
            meetingId={meetingId}
            onEditTask={(task) => setEditingTask(task)}
            onUpdateTasks={(newTasks) => handleChange('actionItems', newTasks)}
            onFocus={() => handleFocus('actionItems')}
            onBlur={handleBlur}
            disabled={!canEdit}
            othersFocussed={others.filter(o => o.presence?.focusedField === 'actionItems')}
          />
        </div>

      <ForwardProjectionEditor
        nextSteps={formData.nextSteps}
        onChange={(val) => handleChange('nextSteps', val)}
        onFocus={() => handleFocus('nextSteps')}
        onBlur={handleBlur}
        disabled={!canEdit}
        othersFocussed={others.filter(o => o.presence?.focusedField === 'nextSteps')}
      />
      </div>

      <EditTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSave={async (updatedTask) => {
          const previousActions = [...formData.actionItems];
          const isNew = !updatedTask.id;

          if (isNew) {
            // Optimistic: add with a temp ID so the UI responds instantly
            const tempId = `temp-${Date.now()}`;
            const tempItem = { ...updatedTask, id: tempId };
            const optimisticActions = [...formData.actionItems, tempItem];
            handleChange('actionItems', optimisticActions);

            try {
              const result = await taskService.createTask({
                meetingId,
                task: updatedTask.task,
                assignee: updatedTask.assignee,
                deadline: updatedTask.deadline,
                priority: updatedTask.priority,
              });

              if (result.success) {
                // Replace temp item with the real DB record (real id)
                const realActions = optimisticActions.map((t) =>
                  t.id === tempId ? { ...tempItem, ...result.data, id: result.data.id } : t
                );
                handleChange('actionItems', realActions);
                showToast('Action item created', 'success');
              } else {
                handleChange('actionItems', previousActions);
                showToast('Failed to create task', 'error');
              }
            } catch (err) {
              handleChange('actionItems', previousActions);
              showToast('Failed to create task', 'error');
            }
          } else {
            // Existing task: optimistic local update + sync relational row
            const newActions = formData.actionItems.map((t) =>
              t.id === updatedTask.id ? updatedTask : t
            );
            handleChange('actionItems', newActions);

            if (!String(updatedTask.id).startsWith('temp-')) {
              try {
                await taskService.updateTask(updatedTask.id, {
                  task: updatedTask.task,
                  assignee: updatedTask.assignee,
                  deadline: updatedTask.deadline,
                  priority: updatedTask.priority,
                });
                showToast('Action item updated', 'success');
              } catch (err) {
                handleChange('actionItems', previousActions);
                showToast('Sync error', 'error');
              }
            }
          }
          setEditingTask(null);
        }}
      />
    </div>
  );
};

const EditorSection = ({ title, value, onChange, onFocus, onBlur, disabled, placeholder, othersFocussed }) => {
  const [isFocussed, setIsFocussed] = useState(false);
  
  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-[24px] bg-[#0c1324] transition-all ring-1 ${
      isFocussed ? 'bg-[#1e253c]/40 ring-accent-primary/40 shadow-[0_20px_60px_-15px_rgba(129,140,248,0.15)]' : 'ring-white/[0.06] hover:bg-[#111827] hover:ring-white/[0.12]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-4">
        <div className="flex items-center gap-3">
           <LuHash className={isFocussed ? 'text-accent-primary' : 'text-slate-700'} size={14} />
           <h4 className="font-['Plus_Jakarta_Sans'] text-[11px] font-extrabold uppercase tracking-widest text-slate-500">{title}</h4>
        </div>
        <div className="flex items-center gap-3">
           {othersFocussed.length > 0 && (
              <div className="flex -space-x-1">
                 {othersFocussed.map(o => (
                   <div key={o.connectionId} className="h-5 w-5 rounded-full ring-2 ring-[#0c1324] bg-accent-primary overflow-hidden">
                      {o.info?.avatar && <img src={o.info.avatar} alt={o.info.name} className="h-full w-full object-cover" />}
                   </div>
                 ))}
              </div>
           )}
           <LuPenTool className={`transition-opacity ${isFocussed ? 'opacity-100 text-accent-primary' : 'opacity-0'}`} size={14} />
        </div>
      </div>

      {/* Input */}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { setIsFocussed(true); onFocus(); }}
        onBlur={() => { setIsFocussed(false); onBlur(); }}
        disabled={disabled}
        className="min-h-[160px] w-full resize-none bg-transparent p-6 font-['Plus_Jakarta_Sans'] text-[15px] leading-relaxed text-slate-300 placeholder:text-slate-700 focus:outline-none disabled:opacity-60"
      />
    </div>
  );
};

const StrategicDecisionsEditor = ({ decisions, onChange, onFocus, onBlur, disabled, othersFocussed }) => {
  const [isFocussed, setIsFocussed] = useState(false);
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    onChange([...decisions, newItem.trim()]);
    setNewItem('');
  };

  const removeItem = (index) => {
    onChange(decisions.filter((_, i) => i !== index));
  };

  const updateItem = (index, val) => {
    const next = [...decisions];
    next[index] = val;
    onChange(next);
  };

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-[24px] bg-[#0c1324] transition-all ring-1 ${
      isFocussed ? 'bg-[#1e253c]/40 ring-accent-primary/40 shadow-[0_20px_60px_-15px_rgba(129,140,248,0.15)]' : 'ring-white/[0.06] hover:bg-[#111827] hover:ring-white/[0.12]'
    }`}>
      <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-4">
        <div className="flex items-center gap-3">
           <LuSparkles className={isFocussed ? 'text-accent-primary' : 'text-slate-700'} size={14} />
           <h4 className="font-['Plus_Jakarta_Sans'] text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Strategic Decisions</h4>
        </div>
        {othersFocussed.length > 0 && (
          <div className="flex -space-x-1">
             {othersFocussed.map(o => (
               <div key={o.connectionId} className="h-5 w-5 rounded-full ring-2 ring-[#0c1324] bg-accent-primary overflow-hidden">
                  {o.info?.avatar && <img src={o.info.avatar} alt={o.info.name} className="h-full w-full object-cover" />}
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="custom-scrollbar max-h-[400px] overflow-y-auto p-6 space-y-4">
        {decisions.map((decision, i) => (
          <div key={i} className="group/item flex items-start gap-3">
            <div className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
            <input 
              className="flex-1 bg-transparent font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-relaxed text-slate-300 outline-none focus:text-white"
              value={decision}
              onChange={(e) => updateItem(i, e.target.value)}
              onFocus={() => { setIsFocussed(true); onFocus(); }}
              onBlur={() => { setIsFocussed(false); onBlur(); }}
              disabled={disabled}
            />
            {!disabled && (
              <button 
                onClick={() => removeItem(i)}
                className="opacity-0 transition-opacity hover:text-red-400 group-hover/item:opacity-100 text-slate-600"
              >
                <LuTrash2 size={14} />
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <div className="flex items-center gap-3 pt-2">
            <div className="size-1.5 shrink-0 rounded-full bg-slate-800" />
            <div className="relative flex-1">
              <input
                placeholder="Declare a new pivot..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className="w-full bg-transparent font-['Plus_Jakarta_Sans'] text-[14px] text-slate-500 outline-none transition-colors focus:text-slate-300"
              />
              {newItem.trim() && (
                <button 
                  onClick={addItem}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-accent-primary hover:text-[#bdc2ff]"
                >
                  <LuPlus size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
 
      {/* Focus Indicator Lip */}
      {isFocussed && (
        <motion.div 
          layoutId="lip-decisions"
          className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary shadow-[0_0_15px_rgba(129,140,248,0.5)]"
        />
      )}
    </div>
  );
};

const AssignedInitiativesEditor = ({ actionItems, meetingId, onEditTask, onUpdateTasks, onFocus, onBlur, disabled, othersFocussed }) => {
  const [isFocussed, setIsFocussed] = useState(false);

  const toggleStatus = async (index) => {
    if (disabled) return;
    const previousItems = [...actionItems];
    const item = actionItems[index];
    const newStatus = item.status === 'DONE' ? 'TODO' : 'DONE';
    const next = [...actionItems];
    next[index] = { ...item, status: newStatus };
    onUpdateTasks(next); // optimistic update

    if (item.id && !String(item.id).startsWith('temp-')) {
      try {
        await taskService.updateTask(item.id, { status: newStatus });
      } catch (err) {
        onUpdateTasks(previousItems); // revert on failure
        showToast('Failed to update status', 'error');
      }
    }
  };

  const removeTask = async (index) => {
    const previousItems = [...actionItems];
    const item = actionItems[index];
    onUpdateTasks(actionItems.filter((_, i) => i !== index)); // optimistic update

    if (item.id && !String(item.id).startsWith('temp-')) {
      try {
        await taskService.deleteTask(item.id);
      } catch (err) {
        onUpdateTasks(previousItems); // revert on failure
        showToast('Failed to delete task', 'error');
      }
    }
  };

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-[24px] bg-[#0c1324] transition-all ring-1 ${
      isFocussed ? 'bg-[#1e253c]/40 ring-accent-primary/40 shadow-[0_20px_60px_-15px_rgba(129,140,248,0.15)]' : 'ring-white/[0.06] hover:bg-[#111827] hover:ring-white/[0.12]'
    }`}>
      <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-4">
        <div className="flex items-center gap-3">
           <LuCheckCircle className={isFocussed ? 'text-accent-primary' : 'text-slate-700'} size={14} />
           <h4 className="font-['Plus_Jakarta_Sans'] text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Assigned Initiatives</h4>
        </div>
        <div className="flex items-center gap-3">
           {othersFocussed.length > 0 && (
              <div className="flex -space-x-1">
                 {othersFocussed.map(o => (
                   <div key={o.connectionId} className="h-5 w-5 rounded-full ring-2 ring-[#0c1324] bg-accent-primary overflow-hidden">
                      {o.info?.avatar && <img src={o.info.avatar} alt={o.info.name} className="h-full w-full object-cover" />}
                   </div>
                 ))}
              </div>
           )}
           {!disabled && (
             <button 
              onClick={() => onEditTask({ meetingId, task: '', status: 'TODO' })}
              className="flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-2.5 py-1 font-['JetBrains_Mono'] text-[9px] font-bold text-accent-primary ring-1 ring-accent-primary/20 hover:bg-accent-primary/20"
             >
                <LuPlus size={10} /> ADD TASK
             </button>
           )}
        </div>
      </div>

      <div className="custom-scrollbar max-h-[400px] overflow-y-auto p-6 space-y-3">
        {actionItems.map((item, i) => {
          const isDone = item.status === 'DONE';
          return (
            <div 
              key={i} 
              onMouseEnter={() => setIsFocussed(true)}
              onMouseLeave={() => setIsFocussed(false)}
              className={`relative rounded-[16px] bg-[#050b1a] p-4 ring-1 ring-white/[0.04] transition-all hover:ring-white/[0.08] ${isDone ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleStatus(i)}
                  className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    isDone ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700 hover:border-accent-primary'
                  }`}
                >
                  {isDone && (
                    <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 space-y-2">
                   <div className="flex items-start justify-between gap-3">
                      <p className={`font-['Plus_Jakarta_Sans'] text-[13px] font-medium leading-relaxed text-slate-200 ${isDone ? 'line-through text-slate-500' : ''}`}>
                        {item.task}
                      </p>
                      {!disabled && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onEditTask(item)}
                            className="text-slate-600 transition-colors hover:text-accent-primary"
                          >
                            <LuPencil size={12} />
                          </button>
                          <button 
                            onClick={() => removeTask(i)}
                            className="text-slate-600 transition-colors hover:text-red-400"
                          >
                            <LuTrash2 size={12} />
                          </button>
                        </div>
                      )}
                   </div>
                   
                   {(item.assignee || item.deadline || item.priority) && (
                     <div className="flex flex-wrap items-center gap-2">
                        {item.assignee && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-0.5 font-['JetBrains_Mono'] text-[9px] font-bold text-slate-500 uppercase">
                            <LuUser size={8} className="text-accent-secondary" /> {item.assignee}
                          </span>
                        )}
                        {item.deadline && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-0.5 font-['JetBrains_Mono'] text-[9px] font-bold text-slate-500 uppercase">
                            <LuCalendar size={8} className="text-amber-400" /> {item.deadline}
                          </span>
                        )}
                        {item.priority && (
                          <span className={`rounded-full px-2 py-0.5 font-['JetBrains_Mono'] text-[8px] font-extrabold uppercase ring-1 ring-white/5 ${
                            item.priority.toLowerCase() === 'high' ? 'bg-red-500/10 text-red-400' :
                            item.priority.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                     </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}

        {actionItems.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-white/[0.03]">
             <LuHash size={24} className="mb-2 text-slate-800" />
             <p className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold text-slate-700 uppercase tracking-widest">No assigned initiatives</p>
          </div>
        )}
      </div>
 
      {/* Focus Indicator Lip */}
      {isFocussed && (
        <motion.div 
          layoutId="lip-initiatives"
          className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary shadow-[0_0_15px_rgba(129,140,248,0.5)]"
        />
      )}
    </div>
  );
};

const ForwardProjectionEditor = ({ nextSteps, onChange, onFocus, onBlur, disabled, othersFocussed }) => {
  const [isFocussed, setIsFocussed] = useState(false);
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    onChange([...nextSteps, newItem.trim()]);
    setNewItem('');
  };

  const removeItem = (index) => {
    onChange(nextSteps.filter((_, i) => i !== index));
  };

  const updateItem = (index, val) => {
    const next = [...nextSteps];
    next[index] = val;
    onChange(next);
  };

  return (
    <div className={`group relative mt-8 flex flex-col overflow-hidden rounded-[24px] bg-[#0c1324] transition-all ring-1 ${
      isFocussed ? 'bg-[#065f46]/10 ring-emerald-500/40 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)]' : 'ring-white/[0.06] hover:bg-[#111827] hover:ring-white/[0.12]'
    }`}>
      <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-4">
        <div className="flex items-center gap-3">
           <LuArrowRight className={isFocussed ? 'text-emerald-400' : 'text-slate-700'} size={14} />
           <h4 className="font-['Plus_Jakarta_Sans'] text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Forward Projection / Next Steps</h4>
        </div>
        {othersFocussed.length > 0 && (
          <div className="flex -space-x-1">
             {othersFocussed.map(o => (
               <div key={o.connectionId} className="h-5 w-5 rounded-full ring-2 ring-[#0c1324] bg-emerald-500 overflow-hidden">
                  {o.info?.avatar && <img src={o.info.avatar} alt={o.info.name} className="h-full w-full object-cover" />}
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="custom-scrollbar max-h-[400px] overflow-y-auto p-6 space-y-4">
        {nextSteps.map((step, i) => (
          <div key={i} className="group/item flex items-start gap-3 pl-1">
            <LuArrowRight size={10} className="mt-1.5 shrink-0 text-emerald-400/60 transition-colors group-focus-within/item:text-emerald-400" />
            <input 
              className="flex-1 bg-transparent font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-relaxed text-slate-300 outline-none focus:text-white"
              value={step}
              onChange={(e) => updateItem(i, e.target.value)}
              onFocus={() => { setIsFocussed(true); onFocus(); }}
              onBlur={() => { setIsFocussed(false); onBlur(); }}
              disabled={disabled}
            />
            {!disabled && (
              <button 
                onClick={() => removeItem(i)}
                className="opacity-0 transition-opacity hover:text-red-400 group-hover/item:opacity-100 text-slate-600"
              >
                <LuTrash2 size={14} />
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <div className="flex items-center gap-3 pt-2 pl-1">
            <LuArrowRight size={10} className="shrink-0 text-slate-800" />
            <div className="relative flex-1">
              <input
                placeholder="Strategizing the next move..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className="w-full bg-transparent font-['Plus_Jakarta_Sans'] text-[14px] text-slate-500 outline-none transition-colors focus:text-slate-300"
              />
              {newItem.trim() && (
                <button 
                  onClick={addItem}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300"
                >
                  <LuPlus size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Focus Indicator Lip */}
      {isFocussed && (
        <motion.div 
          layoutId="lip-nextsteps"
          className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
        />
      )}
    </div>
  );
};

export default CollaborativeEditor;

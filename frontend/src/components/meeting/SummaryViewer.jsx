import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  LuSparkles as Sparkles,
  LuCheckCircle as CheckCircle,
  LuListChecks as ListChecks,
  LuArrowRight as ArrowRight,
  LuCopy as Copy,
  LuCheck as Check,
  LuUser as User,
  LuCalendar as Calendar,
  LuTag as Tag,
  LuMailPlus as MailPlus,
} from 'react-icons/lu';
import { Button } from '@heroui/react';
import FollowUpModal from './FollowUpModal';
import EditTaskModal from './EditTaskModal';
import { sentimentColors } from '../../styles/theme';
import { taskService } from '../../services/task.service';
import { showToast } from '../../components/common/Toast';
import { LuPencil } from 'react-icons/lu';

const CopyBtn = ({ section, content, copiedSection, onCopy }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onCopy(content, section);
    }}
    className="text-slate-600 transition-colors hover:text-white"
    type="button"
    aria-label={`Copy ${section}`}
  >
    {copiedSection === section ? (
      <Check size={12} className="text-emerald-400" />
    ) : (
      <Copy size={12} />
    )}
  </button>
);

CopyBtn.propTypes = {
  section: PropTypes.string.isRequired,
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  copiedSection: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
};

const SummaryViewer = ({ summary, meetingId, meetingTitle }) => {
  const [copiedSection, setCopiedSection] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [localActions, setLocalActions] = useState([]);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (summary && typeof summary === 'object' && Array.isArray(summary.actionItems)) {
      setLocalActions(summary.actionItems);
    }
  }, [summary]);

  if (!summary) {
    return (
      <div className="rounded-card border border-echo-border bg-echo-surface p-8 text-center">
        <Sparkles size={32} className="mx-auto mb-3 text-slate-600" />
        <p className="text-slate-400">No summary available</p>
        <p className="mt-1 text-xs text-slate-600">Will appear after processing</p>
      </div>
    );
  }

  const summaryData =
    typeof summary === 'object'
      ? {
          executive: summary.executiveSummary || '',
          decisions: Array.isArray(summary.keyDecisions) ? summary.keyDecisions : [],
          actions: localActions,
          nextSteps: Array.isArray(summary.nextSteps) ? summary.nextSteps : [],
          keyTopics: Array.isArray(summary.keyTopics) ? summary.keyTopics : [],
          sentiment: summary.sentiment || 'neutral',
        }
      : {
          executive: '',
          decisions: [],
          actions: localActions,
          nextSteps: [],
          keyTopics: [],
          sentiment: 'neutral',
        };

  const copySection = async (text, section) => {
    try {
      let copyText = text;
      if (Array.isArray(text)) {
        if (text.length > 0 && typeof text[0] === 'object' && text[0].task) {
          copyText = text
            .map((item, i) => {
              let line = `${i + 1}. ${item.task}`;
              if (item.assignee) line += ` (${item.assignee})`;
              if (item.deadline) line += ` [${item.deadline}]`;
              if (item.priority) line += ` {${item.priority.toUpperCase()}}`;
              return line;
            })
            .join('\n');
        } else {
          copyText = text.map((item, i) => `${i + 1}. ${item}`).join('\n');
        }
      }
      await navigator.clipboard.writeText(copyText);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEditSave = async (updatedTask) => {
    if (!updatedTask.id) {
      showToast(
        'Cannot edit legacy tasks via this interface directly. Please try the Tasks page.',
        'error'
      );
      setEditingTask(null);
      return;
    }

    const previousActions = [...localActions];
    // Optimistic UI
    setLocalActions((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

    try {
      const res = await taskService.updateTask(updatedTask.id, {
        task: updatedTask.task,
        assignee: updatedTask.assignee,
        deadline: updatedTask.deadline,
        priority: updatedTask.priority,
      });
      if (!res.success) {
        setLocalActions(previousActions);
        showToast(res.error || 'Failed to update action item', 'error');
      } else {
        showToast('Action item updated successfully', 'success');
      }
    } catch (error) {
      setLocalActions(previousActions);
      showToast('Network error occurred', 'error');
    }
    setEditingTask(null);
  };

  const toggleActionItem = (index) => {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getPriorityClasses = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/15 text-red-400';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400';
      case 'low':
        return 'bg-emerald-500/15 text-emerald-400';
      default:
        return 'bg-slate-500/15 text-slate-400';
    }
  };

  const sentiment = sentimentColors[summaryData.sentiment] || sentimentColors.neutral;

  return (
    <div className="space-y-4">
      {/* ── Executive Summary ── */}
      {summaryData.executive && (
        <div className="rounded-card border border-echo-border bg-echo-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent-primary" />
              <h4 className="text-sm font-semibold text-white">Executive Summary</h4>
              <span className="ai-dot"></span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                color="primary"
                className="h-7 rounded-full border border-accent-primary/20 bg-accent-primary/10 px-4 text-[11px] font-medium text-accent-primary hover:bg-accent-primary/20"
                startContent={<MailPlus size={14} />}
                onPress={() => setIsFollowUpOpen(true)}
              >
                AI Follow-up
              </Button>
              <CopyBtn
                section="executive"
                content={summaryData.executive}
                copiedSection={copiedSection}
                onCopy={copySection}
              />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{summaryData.executive}</p>
        </div>
      )}

      {/* ── Key Decisions ── */}
      {summaryData.decisions.length > 0 && (
        <div className="rounded-card border border-echo-border bg-echo-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Key Decisions</h4>
            </div>
            <CopyBtn
              section="decisions"
              content={summaryData.decisions}
              copiedSection={copiedSection}
              onCopy={copySection}
            />
          </div>
          <div className="space-y-2">
            {summaryData.decisions.map((decision, i) => (
              <div key={`${decision}-${i}`} className="flex items-start gap-2.5 pl-1">
                <div className="mt-2 size-1 shrink-0 rounded-full bg-accent-primary"></div>
                <p className="text-sm leading-relaxed text-slate-300">{decision}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Items ── */}
      {summaryData.actions.length > 0 && (
        <div className="rounded-card border border-echo-border bg-echo-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks size={14} className="text-amber-400" />
              <h4 className="text-sm font-semibold text-white">Action Items</h4>
              <span className="font-mono text-[10px] text-slate-600">
                {summaryData.actions.length}
              </span>
            </div>
            <CopyBtn
              section="actions"
              content={summaryData.actions}
              copiedSection={copiedSection}
              onCopy={copySection}
            />
          </div>
          <div className="space-y-2.5">
            {summaryData.actions.map((action, i) => {
              const isChecked = checkedItems[i];
              return (
                <div
                  key={`${action.task}-${i}`}
                  className={`space-y-2 rounded-btn border border-echo-border bg-echo-base p-3 ${isChecked ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleActionItem(i)}
                      className={`mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-600 hover:border-emerald-400'
                      }`}
                      aria-label={isChecked ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isChecked && (
                        <svg
                          className="size-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex flex-1 items-start justify-between gap-3">
                      <p
                        className={`text-sm font-medium leading-relaxed text-slate-200 ${isChecked ? 'text-slate-400 line-through' : ''}`}
                      >
                        {action.task}
                      </p>
                      {action.id && (
                        <button
                          type="button"
                          onClick={() => setEditingTask(action)}
                          aria-label="Edit Task"
                          className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-accent-primary"
                        >
                          <LuPencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {(action.assignee || action.deadline || action.priority) && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-6">
                      {action.assignee && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-echo-surface-hover px-2 py-0.5 text-[10px] text-slate-400">
                          <User size={9} /> {action.assignee}
                        </span>
                      )}
                      {action.deadline && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-echo-surface-hover px-2 py-0.5 text-[10px] text-slate-400">
                          <Calendar size={9} /> {action.deadline}
                        </span>
                      )}
                      {action.priority && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${getPriorityClasses(action.priority)}`}
                        >
                          {action.priority}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Key Topics ── */}
      {summaryData.keyTopics.length > 0 && (
        <div className="rounded-card border border-echo-border bg-echo-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-accent-secondary" />
              <h4 className="text-sm font-semibold text-white">Key Topics</h4>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {summaryData.keyTopics.map((topic, i) => (
              <span
                key={`${topic}-${i}`}
                className="rounded-full bg-accent-primary/10 px-2.5 py-1 text-xs font-medium text-accent-primary"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Sentiment ── */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-4">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${sentiment.dot}`}></span>
          <span className="text-sm font-medium text-slate-300">{sentiment.label}</span>
          <span className="text-xs text-slate-600">Sentiment</span>
        </div>
      </div>

      {/* ── Next Steps ── */}
      {summaryData.nextSteps.length > 0 && (
        <div className="rounded-card border border-echo-border bg-echo-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRight size={14} className="text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Next Steps</h4>
            </div>
            <CopyBtn
              section="nextSteps"
              content={summaryData.nextSteps}
              copiedSection={copiedSection}
              onCopy={copySection}
            />
          </div>
          <div className="space-y-2">
            {summaryData.nextSteps.map((step, i) => (
              <div key={`${step}-${i}`} className="flex items-start gap-2.5 pl-1">
                <ArrowRight size={10} className="mt-1.5 shrink-0 text-emerald-400" />
                <p className="text-sm leading-relaxed text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Follow-up Modal ── */}
      <FollowUpModal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        meetingId={meetingId}
        meetingTitle={meetingTitle}
      />

      {/* ── Edit Task Modal ── */}
      <EditTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSave={handleEditSave}
      />
    </div>
  );
};

SummaryViewer.propTypes = {
  summary: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  meetingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  meetingTitle: PropTypes.string,
};

export default SummaryViewer;

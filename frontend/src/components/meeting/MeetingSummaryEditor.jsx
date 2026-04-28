import React, { useState, useCallback, useEffect } from 'react';
import debounce from 'lodash.debounce';
import api from '../../services/api';
import { showToast } from '../common/Toast';
import MeetingEditorBase from './MeetingEditorBase';
import { taskService } from '../../services/task.service';

const MeetingSummaryEditor = ({ meetingId, initialData, canEdit }) => {
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

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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
  };

  const handleUpdateTasks = async (updatedTask) => {
    const previousActions = [...formData.actionItems];
    const isNew = !updatedTask.id;

    if (isNew) {
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
            status: updatedTask.status
          });
          showToast('Action item updated', 'success');
        } catch (err) {
          handleChange('actionItems', previousActions);
          showToast('Sync error', 'error');
        }
      }
    }
  };

  return (
    <MeetingEditorBase
      meetingId={meetingId}
      formData={formData}
      onChange={handleChange}
      onFocus={() => {}}
      onBlur={() => {}}
      saving={saving}
      lastSaved={lastSaved}
      isDirty={isDirty}
      canEdit={canEdit}
      others={[]} // No others in personal mode
      onUpdateTasks={handleUpdateTasks}
    />
  );
};

export default MeetingSummaryEditor;

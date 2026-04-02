import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuCheckCircle,
  LuClock,
  LuListTodo,
  LuUser,
  LuCalendar,
  LuExternalLink,
  LuSearch,
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../services/task.service';
import { PageLoader } from '../components/common/Loader';
import { showToast } from '../components/common/Toast';

const COLUMNS = [
  {
    id: 'TODO',
    title: 'To Do',
    icon: LuListTodo,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    icon: LuClock,
    color: 'text-accent-primary',
    bgColor: 'bg-accent-primary/10',
  },
  {
    id: 'DONE',
    title: 'Done',
    icon: LuCheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterMeeting, setFilterMeeting] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await taskService.getTasks();
      if (res.success) {
        setTasks(res.data);
      } else {
        showToast(res.error || 'Failed to fetch tasks', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('An error occurred while fetching tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';

    // Dim the item being dragged
    const target = e.target;
    setTimeout(() => {
      target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    // Optimistic UI Update
    const oldTasks = [...tasks];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    try {
      const res = await taskService.updateTaskStatus(taskId, status);
      if (!res.success) {
        setTasks(oldTasks);
        showToast(res.error || 'Failed to update task', 'error');
      }
    } catch (error) {
      setTasks(oldTasks);
      showToast('Network error occurred', 'error');
    }
  };

  const allowDrop = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignee && t.assignee.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesMeeting = filterMeeting === 'all' || t.meetingId === filterMeeting;
    return matchesSearch && matchesPriority && matchesMeeting;
  });

  const uniqueMeetings = Array.from(new Set(tasks.map((t) => t.meetingId))).map((id) => {
    const task = tasks.find((t) => t.meetingId === id);
    return { id, title: task?.meeting?.title || 'Unknown Meeting' };
  });

  if (loading) return <PageLoader label="Fetching action items..." />;

  return (
    <div className="flex h-full min-h-[calc(100vh-120px)] flex-col gap-6 py-6">
      {/* ── Header Area ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Action Items</h1>
          <p className="text-sm text-slate-400">
            Drag tasks to update status. Track commitments across all meetings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="group relative">
            <LuSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-accent-primary"
              size={16}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-btn border border-echo-border bg-echo-surface py-2 pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 md:w-64"
            />
          </div>

          <div className="rounded-btn border border-echo-border bg-echo-surface p-1 flex items-center gap-1">
            <button
              onClick={() => setFilterPriority('all')}
              className={`rounded-md px-3 py-1 text-xs transition-all ${
                filterPriority === 'all'
                  ? 'bg-echo-surface-hover text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterPriority('high')}
              className={`rounded-md px-3 py-1 text-xs transition-all ${
                filterPriority === 'high'
                  ? 'bg-red-500/10 text-red-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              High
            </button>
          </div>

          <select
            value={filterMeeting}
            onChange={(e) => setFilterMeeting(e.target.value)}
            className="rounded-btn border border-echo-border bg-echo-surface px-3 py-1.5 text-sm text-slate-300 outline-none transition-all hover:border-accent-primary/50 focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 cursor-pointer max-w-[200px] truncate"
          >
            <option value="all">All Meetings</option>
            {uniqueMeetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex-1 pb-10">
        <div className="grid h-full min-h-[500px] grid-cols-1 gap-6 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              onDragOver={allowDrop}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex min-h-[400px] flex-col rounded-card border border-echo-border bg-echo-surface/50"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-echo-border bg-echo-surface/30 p-4">
                <div className="flex items-center gap-2.5">
                  <div className={`rounded-md p-1.5 ${col.bgColor}`}>
                    <col.icon className={col.color} size={16} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{col.title}</h3>
                </div>
                <span className="rounded-full border border-echo-border bg-echo-surface-hover px-2 py-0.5 font-mono text-[10px] text-slate-500">
                  {filteredTasks.filter((t) => t.status === col.id).length}
                </span>
              </div>

              {/* Task List */}
              <div className="custom-scrollbar max-h-[70vh] flex-1 space-y-3 overflow-y-auto p-3">
                <AnimatePresence mode="popLayout">
                  {filteredTasks
                    .filter((t) => t.status === col.id)
                    .map((task) => (
                      <motion.div
                        layout
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className="card-hover group cursor-grab rounded-xl border border-echo-border bg-echo-surface p-4 shadow-sm transition-all hover:border-accent-primary/30 active:cursor-grabbing"
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <p className="text-sm font-medium leading-relaxed text-slate-200 transition-colors group-hover:text-white">
                            {task.task}
                          </p>
                          {task.priority === 'high' && (
                            <div className="mt-1 shrink-0">
                              <div className="size-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2.5">
                          <div className="flex flex-wrap gap-2">
                            {task.assignee && (
                              <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                                <LuUser size={12} className="text-accent-secondary" />
                                <span className="font-mono">{task.assignee}</span>
                              </div>
                            )}
                            {task.deadline && (
                              <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                                <LuCalendar size={12} className="text-amber-400" />
                                <span className="font-mono">{task.deadline}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-2">
                            <button
                              onClick={() => navigate(`/meeting/${task.meetingId}`)}
                              className="flex max-w-[70%] items-center gap-1.5 truncate text-[10px] text-accent-primary/60 transition-colors hover:text-accent-primary"
                            >
                              <LuExternalLink size={12} className="shrink-0" />
                              <span className="truncate">
                                {task.meeting?.title || 'View Meeting'}
                              </span>
                            </button>

                            <span className="shrink-0 font-mono text-[9px] text-slate-600">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                  {filteredTasks.filter((t) => t.status === col.id).length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-echo-border opacity-20 transition-opacity group-hover:opacity-30">
                      <p className="font-mono text-[10px]">No tasks here</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

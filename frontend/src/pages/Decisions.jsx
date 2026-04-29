import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuShieldCheck,
  LuSearch,
  LuCalendar,
  LuMessageSquare,
  LuChevronRight,
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import meetingService from '../services/meeting.service';
import { PageLoader } from '../components/common/Loader';
import { showToast } from '../components/common/Toast';

export default function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const res = await meetingService.getDecisions();
      if (res.success) {
        setDecisions(res.data);
      } else {
        showToast(res.error || 'Failed to fetch decisions archive', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('An error occurred while fetching decisions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDecisions = decisions.filter(
    (d) =>
      d.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <PageLoader label="Opening the archive..." />;

  return (
    <div className="flex h-full min-h-[calc(100vh-120px)] flex-col gap-8 px-4 py-8">
      {}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent-primary/10 p-2 ring-1 ring-accent-primary/20">
              <LuShieldCheck className="text-accent-primary" size={24} />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary/60">
              Truth Repository
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">Decision Log</h1>
          <p className="max-w-md text-slate-400">
            The single source of truth. Every finalized decision across all your sessions, preserved
            in one place.
          </p>
        </div>

        <div className="group relative">
          <LuSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-accent-primary"
            size={18}
          />
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-white/5 bg-echo-surface/40 py-3 pl-12 pr-6 text-sm text-white outline-none backdrop-blur-xl transition-all focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 md:w-80"
          />
        </div>
      </div>

      {}
      <div className="relative flex-1">
        {}
        <div className="absolute bottom-0 left-[17px] top-4 w-px bg-gradient-to-b from-accent-primary/30 via-echo-border to-transparent" />

        <div className="space-y-12 pb-20">
          <AnimatePresence mode="popLayout">
            {filteredDecisions.length > 0 ? (
              filteredDecisions.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative pl-12"
                >
                  {}
                  <div className="absolute left-0 top-1 z-10 flex size-[35px] items-center justify-center rounded-full border-3 border-echo-surface bg-echo-base transition-colors group-hover:border-accent-primary/30">
                    <div className="size-2 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                  </div>

                  {}
                  <div className="flex flex-col gap-4">
                    {}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-slate-500">
                        <LuCalendar size={12} />
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>

                      <button
                        onClick={() => navigate(`/meeting/${item.meetingId}`)}
                        className="flex items-center gap-1.5 rounded-md border border-accent-primary/10 bg-accent-primary/5 px-2.5 py-1 font-mono text-[10px] text-accent-primary/60 transition-colors hover:text-accent-primary"
                      >
                        <LuMessageSquare size={12} />
                        <span>{item.meetingTitle}</span>
                        <LuChevronRight size={12} className="opacity-40" />
                      </button>
                    </div>

                    {}
                    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-echo-surface to-echo-surface/50 p-6 shadow-2xl transition-all hover:border-white/10 hover:bg-white/[0.03] group-hover:-translate-y-1">
                      <div className="absolute right-0 top-0 p-4 opacity-5">
                        <LuShieldCheck size={80} className="scale-125" />
                      </div>
                      <p className="text-lg font-medium leading-relaxed text-slate-200 md:text-xl">
                        {item.decision}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                <LuShieldCheck size={64} className="mb-4" />
                <p className="font-mono text-xs uppercase tracking-widest text-white">
                  No decisions found in log
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {}
      {filteredDecisions.length > 0 && (
        <div className="flex items-center justify-center border-t border-white/5 py-12">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-slate-600">
            Verified Records · {filteredDecisions.length} Finalized Points
          </span>
        </div>
      )}
    </div>
  );
}

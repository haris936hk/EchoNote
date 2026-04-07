import React, { useState, useEffect, useMemo } from 'react';
import {
  LuBarChart2,
  LuTrendingUp,
  LuBrain,
  LuClock,
  LuSmile,
  LuCheckCircle,
  LuList,
  LuAlertCircle,
  LuCalendar,
} from 'react-icons/lu';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { meetingsAPI } from '../services/api';
import { PageLoader } from '../components/common/Loader';

const COLORS = ['#818CF8', '#A78BFA', '#6366F1', '#4F46E5', '#C084FC'];

const StatCard = ({ title, value, icon: Icon, trend, description, color = 'indigo' }) => (
  <div className="group relative overflow-hidden rounded-card border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl transition-all hover:border-white/10 hover:bg-slate-900/60">
    <div className="absolute -right-4 -top-4 size-24 rounded-full bg-accent-primary/5 blur-3xl transition-all group-hover:bg-accent-primary/10" />
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
      </div>
      <div
        className={`bg- flex size-10 items-center justify-center rounded-xl${color}-500/10 text-${color}-400`}
      >
        <Icon size={20} />
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2">
      {trend && (
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            trend >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          <LuTrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </span>
      )}
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
        <p className="text-sm font-bold text-accent-primary">
          Sentiment: <span className="text-white">{payload[0].value.toFixed(2)}</span>
        </p>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const result = await meetingsAPI.getStatistics();
        if (result.success) {
          setStats(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('An unexpected error occurred while fetching analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const categoryData = useMemo(() => {
    if (!stats?.byCategory) return [];
    return Object.entries(stats.byCategory).map(([name, value]) => ({
      name: name.charAt(0) + name.slice(1).toLowerCase(),
      value,
    }));
  }, [stats]);

  if (loading) return <PageLoader label="Synthesizing Intelligence..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
        <LuAlertCircle size={48} className="text-rose-500" />
        <h2 className="text-xl font-bold text-white">Analysis Interrupted</h2>
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-7xl pb-12 duration-700">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Echo Intelligence <span className="text-accent-primary">Hub</span>
          </h1>
          <p className="mt-2 text-slate-400">
            Deep insights into your collective knowledge archive.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-slate-900/40 px-3 py-1.5 backdrop-blur-md">
          <LuCalendar size={14} className="text-accent-primary" />
          <span className="text-xs font-medium text-slate-300">Last 30 Days</span>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Experience"
          value={stats.overview.completed}
          icon={LuList}
          description="meetings archived"
          color="indigo"
        />
        <StatCard
          title="Voice Analysis"
          value={formatDuration(stats.metrics.totalDuration)}
          icon={LuClock}
          description="total meeting time"
          color="violet"
        />
        <StatCard
          title="Productivity"
          value={`${stats.metrics.productivityScore}%`}
          icon={LuCheckCircle}
          description="action items completed"
          color="emerald"
        />
        <StatCard
          title="Recent Velocity"
          value={stats.metrics.recentActivity}
          icon={LuTrendingUp}
          description="meetings this week"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Sentiment Trend */}
        <div className="lg:col-span-2">
          <div className="rounded-[20px] border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuSmile size={18} className="text-accent-primary" />
                <h3 className="font-bold text-white">Sentiment Trajectory</h3>
              </div>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.sentimentTrend}>
                  <defs>
                    <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(val) =>
                      new Date(val).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    domain={[0, 1]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#818CF8"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSentiment)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Categories Distribution */}
        <div>
          <div className="flex h-full flex-col rounded-[20px] border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-2">
              <LuBarChart2 size={18} className="text-accent-secondary" />
              <h3 className="font-bold text-white">Category Split</h3>
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                    Total
                  </p>
                  <p className="text-2xl font-black text-white">{stats.overview.completed}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    animationDuration={1500}
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 overflow-hidden px-2 py-1">
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-[10px] font-bold uppercase text-slate-400">
                    {c.name}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-slate-500">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Knowledge Nodes / Entities */}
      <div className="mt-6">
        <div className="rounded-[20px] border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-2">
            <LuBrain size={18} className="text-accent-primary" />
            <h3 className="font-bold text-white">Neural Nodes</h3>
            <span className="ml-2 text-xs text-slate-500">Most mentioned entities & concepts</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.topEntities.length > 0 ? (
              stats.topEntities.map((entity, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 transition-all hover:border-accent-primary/30 hover:bg-accent-primary/10"
                >
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">
                    {entity.name}
                  </span>
                  <span className="flex size-5 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-accent-primary">
                    {entity.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="w-full py-4 text-center text-sm italic text-slate-500">
                Insufficient data for neural mapping. Process more meetings to see trends.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

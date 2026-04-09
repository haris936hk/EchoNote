import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectItem, Accordion, AccordionItem } from '@heroui/react';
import {
  LuUser as User,
  LuSettings as Settings,
  LuShield as Shield,
  LuHelpCircle as HelpCircle,
  LuCheck as Check,
  LuDownload as Download,
  LuTrash2 as Trash2,
  LuLogOut as LogOut,
  LuBookOpen as BookOpen,
  LuMessageSquare as MessageSquare,
  LuBug as Bug,
  LuLightbulb as Lightbulb,
  LuChevronRight as ChevronRight,
  LuCalendar as Calendar,
  LuMonitor as Monitor,
  LuLink as Link,
  LuSlack as Slack,
} from 'react-icons/lu';
import ProfileSettings from '../components/user/ProfileSettings';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import notificationService from '../services/notification.service';
import { showToast } from '../components/common/Toast';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'preferences', label: 'Preferences', icon: Settings },
  { key: 'privacy', label: 'Privacy & Data', icon: Shield },
  { key: 'help', label: 'Help & FAQ', icon: HelpCircle },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'preferences':
        return <PreferencesContent />;
      case 'privacy':
        return <PrivacyContent />;
      case 'help':
        return <HelpContent />;
      default:
        return null;
    }
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1">
          <div className="sticky top-[88px] rounded-card border border-echo-border bg-echo-surface p-3">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-slate-400 hover:bg-echo-surface-hover hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">{renderContent()}</div>
      </div>
    </div>
  );
};

// ─── Toggle Component ───
const Toggle = ({ enabled, onToggle, color = 'bg-accent-primary' }) => (
  <button
    onClick={onToggle}
    className={`relative h-6 w-11 rounded-full transition-all duration-200 ${
      enabled ? color : 'bg-slate-600'
    }`}
  >
    <span
      className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// ─── Preferences ───
const PreferencesContent = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [retentionDays, setRetentionDays] = useState('30');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [isCheckingSlack, setIsCheckingSlack] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setEmailNotifications(data.data.emailNotifications ?? true);
            setPushNotifications(data.data.pushNotifications ?? true);
            setSlackWebhookUrl(data.data.slackWebhookUrl || '');
            if (data.data.autoDeleteDays !== null && data.data.autoDeleteDays !== undefined) {
              setAutoDelete(true);
              setRetentionDays(String(data.data.autoDeleteDays));
            }
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications,
          pushNotifications,
          slackWebhookUrl,
          autoDeleteDays: autoDelete ? parseInt(retentionDays) : null,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Preferences saved successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to save preferences', 'error');
      }
    } catch (error) {
      showToast('Failed to save preferences.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSlack = async () => {
    setIsCheckingSlack(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/settings/slack/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackWebhookUrl }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Slack test successful!', 'success');
      } else {
        showToast(data.error || 'Slack test failed', 'error');
      }
    } catch (error) {
      showToast('Failed to test Slack integration.', 'error');
    } finally {
      setIsCheckingSlack(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-5 rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="text-lg font-semibold text-white">App Preferences</h2>

        {/* Dark Mode — Always on */}
        <div className="flex items-center justify-between border-b border-echo-border py-3">
          <div>
            <p className="text-sm font-medium text-white">Dark Mode</p>
            <p className="text-xs text-slate-500">Always enabled for optimal viewing</p>
          </div>
          <Toggle enabled={true} onToggle={() => {}} />
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between border-b border-echo-border py-3">
          <div>
            <p className="text-sm font-medium text-white">Browser Push Notifications</p>
            <p className="text-xs text-slate-500">Receive native alerts on this device</p>
          </div>
          <Toggle
            enabled={pushNotifications}
            onToggle={async () => {
              if (!pushNotifications) {
                try {
                  const granted = await notificationService.requestPermission();
                  if (granted) {
                    await notificationService.subscribeUser();
                    setPushNotifications(true);
                  } else {
                    showToast('Notification permission denied', 'warning');
                  }
                } catch (err) {
                  showToast('Failed to enable push notifications', 'error');
                }
              } else {
                setPushNotifications(false);
                // We keep the subscription in DB but disable preference
              }
            }}
            color="bg-indigo-500"
          />
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between border-b border-echo-border py-3">
          <div>
            <p className="text-sm font-medium text-white">Email Notifications</p>
            <p className="text-xs text-slate-500">Receive email when processing completes</p>
          </div>
          <Toggle
            enabled={emailNotifications}
            onToggle={() => setEmailNotifications(!emailNotifications)}
            color="bg-emerald-500"
          />
        </div>

        {/* Auto Delete */}
        <div className="py-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Auto-delete Recordings</p>
              <p className="text-xs text-slate-500">Delete audio after retention period</p>
            </div>
            <Toggle
              enabled={autoDelete}
              onToggle={() => setAutoDelete(!autoDelete)}
              color="bg-amber-500"
            />
          </div>
          {autoDelete && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-slate-400">Retention Period</p>
              <Select
                placeholder="Select"
                selectedKeys={new Set([retentionDays])}
                onSelectionChange={(keys) => {
                  const s = Array.from(keys)[0];
                  if (s) setRetentionDays(s);
                }}
                size="sm"
                classNames={{
                  trigger:
                    'bg-[#0F172A] border border-white/10 rounded-full max-w-[160px] h-10 px-4 transition-all hover:bg-[#1E293B] hover:border-white/20',
                  popoverContent:
                    'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] p-2',
                  value: 'text-white text-xs',
                }}
                listboxProps={{
                  itemClasses: {
                    base: 'rounded-full px-4 py-2 transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white',
                    selected: 'bg-accent-primary/20 text-accent-primary font-bold',
                  },
                }}
              >
                <SelectItem key="7">7 days</SelectItem>
                <SelectItem key="30">30 days</SelectItem>
                <SelectItem key="90">90 days</SelectItem>
                <SelectItem key="180">6 months</SelectItem>
                <SelectItem key="365">1 year</SelectItem>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-5 rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Slack className="text-accent-primary" size={18} /> Slack Integration
        </h2>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              Webhook URL
              {slackWebhookUrl ? (
                <span className="flex size-2 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="flex size-2 rounded-full bg-slate-500"></span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Receive meeting summaries in a designated Slack channel
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <input
            type="text"
            className="w-full flex-1 rounded-btn border border-echo-border bg-echo-base p-2.5 text-sm text-white shadow-inner placeholder:text-slate-500 focus:border-accent-primary focus:outline-none"
            placeholder="https://hooks.slack.com/services/..."
            value={slackWebhookUrl}
            onChange={(e) => setSlackWebhookUrl(e.target.value)}
          />
          {slackWebhookUrl && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={handleTestSlack}
                disabled={isCheckingSlack}
                className="btn-ghost flex-1 whitespace-nowrap rounded-btn px-4 py-2.5 text-sm font-medium transition-colors hover:bg-echo-surface-hover disabled:opacity-50 sm:flex-none"
              >
                {isCheckingSlack ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={() => setSlackWebhookUrl('')}
                className="btn-ghost flex-1 whitespace-nowrap rounded-btn px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 sm:flex-none"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="btn-cta inline-flex items-center gap-2 rounded-btn px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {isSaving ? (
            <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <Check size={14} />
          )}
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

// ─── Privacy & Data ───
const PrivacyContent = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // B4 — Calendar connection state
  const [calStatus, setCalStatus] = useState(null);
  const [isDisconnectingCal, setIsDisconnectingCal] = useState(false);
  // B5 — Session state
  const [sessions, setSessions] = useState([]);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  // B1 — Export all meetings as ZIP via existing /meetings/download/all endpoint
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/meetings/download/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EchoNote_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Export downloaded successfully!', 'success');
    } catch (_) {
      showToast('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account?\n\nThis will permanently delete all meetings, transcripts, summaries, audio files, and account data.\n\nType "DELETE" in the next prompt to confirm.'
    );
    if (!confirmed) return;
    const finalConfirmation = window.prompt('Type "DELETE" to confirm:');
    if (finalConfirmation !== 'DELETE') {
      showToast('Account deletion cancelled', 'warning');
      return;
    }
    setIsDeleting(true);
    try {
      const result = await userAPI.deleteAccount();
      if (result.success) {
        showToast('Account deleted successfully', 'success');
        logout();
        navigate('/login');
      } else {
        showToast(result.error || 'Failed to delete account', 'error');
      }
    } catch (error) {
      showToast('Failed to delete account.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  // B4 — Load calendar status
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL}/auth/calendar/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => d.success && setCalStatus(d.data))
      .catch(() => {});
  }, []);

  // B5 — Load sessions
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL}/auth/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => d.success && setSessions(d.data.sessions || []))
      .catch(() => {});
  }, []);

  // B4 — Disconnect calendar
  const handleDisconnectCalendar = async () => {
    if (!window.confirm('Disconnect Google Calendar? You can reconnect at any time.')) return;
    setIsDisconnectingCal(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${process.env.REACT_APP_API_URL}/auth/calendar/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        setCalStatus({ connected: false, tokenExpired: false });
        showToast('Google Calendar disconnected', 'success');
      } else {
        showToast('Failed to disconnect calendar', 'error');
      }
    } catch (_) {
      showToast('Failed to disconnect calendar', 'error');
    } finally {
      setIsDisconnectingCal(false);
    }
  };

  // B5 — Revoke all other sessions
  const handleRevokeSessions = async () => {
    if (!window.confirm('Sign out all other devices? Your current session will remain active.'))
      return;
    setIsRevokingSessions(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${process.env.REACT_APP_API_URL}/auth/sessions/revoke`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        showToast('All other sessions revoked', 'success');
      } else {
        showToast('Failed to revoke sessions', 'error');
      }
    } catch (_) {
      showToast('Failed to revoke sessions', 'error');
    } finally {
      setIsRevokingSessions(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Storage Stats */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Storage & Usage</h2>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="size-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Total Meetings', value: stats?.overview?.totalMeetings ?? 0 },
              { label: 'Completed', value: stats?.overview?.completedMeetings ?? 0 },
              { label: 'Storage', value: formatBytes(stats?.metrics?.storageUsedBytes) },
              {
                label: 'Duration',
                value: stats?.metrics?.totalDuration
                  ? `${Math.floor(stats.metrics.totalDuration / 60)}m`
                  : '0m',
              },
            ].map((s, i) => (
              <div key={i} className="rounded-btn bg-echo-base p-3">
                <p className="mb-1 text-xs text-slate-500">{s.label}</p>
                <p className="font-mono text-lg font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* B4 — Google Calendar connection */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Google Calendar</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-btn bg-accent-primary/10">
              <Calendar size={16} className="text-accent-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {calStatus === null
                  ? 'Checking…'
                  : calStatus.connected
                    ? 'Connected'
                    : 'Not connected'}
              </p>
              <p className="text-xs text-slate-500">
                {calStatus?.tokenExpired
                  ? 'Token expired — reconnect to restore access'
                  : calStatus?.connected
                    ? 'Calendar events sync with your meetings'
                    : 'Connect to see calendar events on dashboard'}
              </p>
            </div>
          </div>
          {calStatus?.connected ? (
            <button
              onClick={handleDisconnectCalendar}
              disabled={isDisconnectingCal}
              className="inline-flex items-center gap-2 rounded-btn border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {isDisconnectingCal ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <span className="rounded-full bg-slate-800 px-2.5 py-1 font-mono text-[10px] text-slate-500">
              Managed via Google Sign-In
            </span>
          )}
        </div>
      </div>

      {/* B5 — Session management */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Active Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Loading sessions…</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-btn bg-echo-base p-3"
              >
                <div className="flex items-center gap-3">
                  <Monitor size={14} className="shrink-0 text-slate-500" />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-white">
                      {s.label}
                      {s.isCurrent && (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400">
                          CURRENT
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      Last active:{' '}
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(s.lastActive))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 border-t border-echo-border pt-4">
          <button
            onClick={handleRevokeSessions}
            disabled={isRevokingSessions}
            className="inline-flex items-center gap-2 rounded-btn border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
          >
            <Link size={13} />
            {isRevokingSessions ? 'Revoking…' : 'Sign out all other devices'}
          </button>
        </div>
      </div>

      {/* AI Models */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">AI Processing Pipeline</h2>
        <div className="space-y-3">
          {[
            { name: 'Qwen2.5-7B', desc: 'Fine-tuned LLM for meeting summarization' },
            { name: 'Whisper base.en', desc: 'Speech-to-text transcription' },
            { name: 'SpaCy en_core_web_lg', desc: 'NLP entity extraction' },
          ].map((model, i) => (
            <div key={i} className="flex items-center gap-3 rounded-btn bg-echo-base p-3">
              <Check size={14} className="shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">{model.name}</p>
                <p className="text-xs text-slate-500">{model.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-card border border-accent-primary/10 bg-accent-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Shield size={18} className="mt-0.5 shrink-0 text-accent-primary" />
          <div>
            <p className="mb-1 text-sm font-semibold text-accent-primary">Your Privacy Matters</p>
            <p className="text-xs leading-relaxed text-accent-primary/70">
              We never share your meeting data. All processing is done on secure servers. You have
              full control and can delete data at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-card border border-echo-border bg-echo-surface p-4">
          <div>
            <p className="text-sm font-medium text-white">Export Your Data</p>
            <p className="text-xs text-slate-500">Download meetings, transcripts, and summaries</p>
          </div>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {isExporting ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download size={14} />
            )}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-card border border-echo-border bg-echo-surface p-4">
          <div>
            <p className="text-sm font-medium text-white">Logout</p>
            <p className="text-xs text-slate-500">Sign out of your account</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>

        <div className="flex items-center justify-between rounded-card border border-red-500/10 bg-red-500/5 p-4">
          <div>
            <p className="text-sm font-medium text-red-400">Delete Account</p>
            <p className="text-xs text-red-400/60">Permanently delete all data</p>
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-btn bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Help & FAQ ───
const HelpContent = () => {
  const faqs = [
    {
      question: 'How long can my recordings be?',
      answer:
        'Each recording can be up to 10 minutes long. This ensures optimal processing speed and accuracy.',
    },
    {
      question: 'How accurate is the transcription?',
      answer:
        'Our Whisper ASR model achieves 90%+ accuracy for clear English speech. Accuracy varies based on audio quality, accents, and background noise.',
    },
    {
      question: 'Can I edit transcripts?',
      answer: 'Currently, transcripts are read-only. Re-record if major corrections are needed.',
    },
    {
      question: 'How is my data secured?',
      answer:
        'All data is encrypted in transit (HTTPS) and at rest. We use industry-standard security practices.',
    },
    {
      question: 'Can I delete my meetings?',
      answer: 'Yes, you can delete individual meetings or all your data at any time from Settings.',
    },
  ];

  const quickLinks = [
    {
      icon: BookOpen,
      label: 'Documentation',
      href: 'https://github.com/haris936hk/EchoNote/wiki',
    },
    {
      icon: MessageSquare,
      label: 'Contact Support',
      href: 'mailto:support@echonote.app',
    },
    {
      icon: Bug,
      label: 'Report a Bug',
      href: 'https://github.com/haris936hk/EchoNote/issues/new?template=bug_report.md',
    },
    {
      icon: Lightbulb,
      label: 'Request a Feature',
      href: 'https://github.com/haris936hk/EchoNote/issues/new?template=feature_request.md',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Links */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Links</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickLinks.map((link, i) => {
            const Icon = link.icon;
            return (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-btn bg-echo-base p-3 text-left transition-colors hover:bg-echo-surface-hover"
              >
                <Icon size={16} className="shrink-0 text-accent-primary" />
                <span className="flex-1 text-sm font-medium text-white">{link.label}</span>
                <ChevronRight size={14} className="text-slate-600" />
              </a>
            );
          })}
        </div>
      </div>

      {/* FAQs */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Frequently Asked Questions</h2>
        <Accordion variant="splitted" className="px-0">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              title={<span className="text-sm font-medium text-white">{faq.question}</span>}
              classNames={{
                base: 'bg-echo-base border border-echo-border rounded-btn mb-2',
                trigger: 'px-4 py-3',
                content: 'px-4 pb-4',
              }}
            >
              <p className="text-sm leading-relaxed text-slate-400">{faq.answer}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Support CTA */}
      <div className="rounded-card border border-accent-primary/10 bg-accent-primary/5 p-6 text-center">
        <p className="mb-1 text-sm font-semibold text-accent-primary">Still need help?</p>
        <p className="mb-4 text-xs text-slate-400">Our support team is here to assist you</p>
        <a
          href="mailto:support@echonote.app"
          className="btn-primary inline-block rounded-btn px-5 py-2 text-sm font-bold"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
};

export default SettingsPage;

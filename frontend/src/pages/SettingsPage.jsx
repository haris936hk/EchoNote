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
} from 'react-icons/lu';
import ProfileSettings from '../components/user/ProfileSettings';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
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
  const [autoDelete, setAutoDelete] = useState(false);
  const [retentionDays, setRetentionDays] = useState('30');
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
                  trigger: 'bg-echo-base border border-echo-border rounded-btn max-w-[160px]',
                  popoverContent: 'bg-echo-elevated border border-echo-border',
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

      <div className="flex justify-end">
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
          <button className="btn-ghost inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium">
            <Download size={14} /> Export
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
    { icon: BookOpen, label: 'Documentation' },
    { icon: MessageSquare, label: 'Contact Support' },
    { icon: Bug, label: 'Report a Bug' },
    { icon: Lightbulb, label: 'Request a Feature' },
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
              <button
                key={i}
                className="flex items-center gap-3 rounded-btn bg-echo-base p-3 text-left transition-colors hover:bg-echo-surface-hover"
              >
                <Icon size={16} className="shrink-0 text-accent-primary" />
                <span className="flex-1 text-sm font-medium text-white">{link.label}</span>
                <ChevronRight size={14} className="text-slate-600" />
              </button>
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
        <button className="btn-primary rounded-btn px-5 py-2 text-sm font-bold">
          Contact Support
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;

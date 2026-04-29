import { Avatar, Divider, Button } from '@heroui/react';
import { FiUser, FiMail, FiShield } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const ProfileSettings = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <div className="py-12 text-center">
          <p className="text-slate-400">Please login to view profile settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <FiUser className="text-accent-primary" />
            Profile Information
          </h2>
        </div>
        <Divider className="bg-white/5" />
        <div className="mt-6 space-y-6">
          {/* User Basic Info */}
          <div className="flex items-center gap-4">
            <Avatar
              src={user.picture}
              name={user.name}
              isBordered
              color="primary"
              showFallback
              fallback={<FiUser size={32} className="text-accent-primary" />}
              classNames={{
                base: 'w-20 h-20 ring-accent-primary/20',
                img: 'w-full h-full object-cover !opacity-100',
              }}
            />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{user.name}</h3>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                <FiMail size={14} />
                {user.email}
              </p>
              {user.emailVerified && (
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                  <FiShield size={12} />
                  Email verified
                </p>
              )}
            </div>
          </div>

          <Divider className="bg-white/5" />

          {/* Account Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-btn bg-echo-base p-3">
              <div>
                <p className="text-sm font-medium text-white">Account Provider</p>
                <p className="text-xs text-slate-500">Google OAuth</p>
              </div>
              <span className="rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-medium text-accent-primary">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between rounded-btn bg-echo-base p-3">
              <div>
                <p className="text-sm font-medium text-white">Member Since</p>
                <p className="text-xs text-slate-500">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Security Info */}
      <div className="rounded-card border border-echo-border bg-echo-surface p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <FiShield className="text-accent-primary" />
            Privacy & Data
          </h2>
        </div>
        <Divider className="bg-white/5" />
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-white">Data Storage</p>
            <p className="text-xs leading-relaxed text-slate-400">
              Your meeting recordings and transcripts are stored securely. Audio files are stored
              temporarily and can be automatically deleted based on your retention settings.
              Transcripts and summaries are retained until you manually delete them.
            </p>
          </div>

          <Divider className="bg-white/5" />

          <div>
            <p className="mb-2 text-sm font-medium text-white">Data Processing</p>
            <p className="text-xs leading-relaxed text-slate-400">
              Audio is processed using Deepgram Nova-3 for transcription, SpaCy for NLP, and
              EchoNote's custom AI model for summarization. Processing happens server-side and data
              is encrypted in transit and at rest.
            </p>
          </div>

          <Divider className="bg-white/5" />

          <div className="flex items-start gap-3 rounded-btn border border-amber-500/10 bg-amber-500/5 p-4">
            <FiShield className="mt-0.5 shrink-0 text-amber-500" size={18} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-500">Privacy Notice</p>
              <p className="mt-1 text-xs text-amber-500/70">
                We never share your meeting data with third parties. All processing is done on our
                secure servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileCard = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="w-full rounded-card border border-echo-border bg-echo-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar
          src={user.picture}
          name={user.name}
          size="md"
          isBordered
          color="primary"
          showFallback
          fallback={<FiUser size={18} className="text-accent-primary" />}
          classNames={{
            base: 'ring-accent-primary/20',
            img: '!opacity-100',
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

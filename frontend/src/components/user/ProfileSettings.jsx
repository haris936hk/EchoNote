import { Card, CardBody, CardHeader, Avatar, Divider, Button } from '@heroui/react';
import { FiUser, FiMail, FiShield } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const ProfileSettings = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-default-500">Please login to view profile settings</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <FiUser className="text-primary" />
            Profile Information
          </h2>
        </CardHeader>
        <Divider />
        <CardBody className="gap-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-4">
            <Avatar
              src={user.picture}
              name={user.name}
              isBordered
              color="primary"
              showFallback
              fallback={<FiUser size={32} className="text-primary" />}
              classNames={{
                base: 'w-20 h-20',
                img: 'w-full h-full object-cover !opacity-100',
              }}
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-default-500 mt-1 flex items-center gap-2 text-sm">
                <FiMail size={14} />
                {user.email}
              </p>
              {user.emailVerified && (
                <p className="text-success mt-1 flex items-center gap-1 text-xs">
                  <FiShield size={12} />
                  Email verified
                </p>
              )}
            </div>
          </div>

          <Divider />

          {/* Account Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Account Provider</p>
                <p className="text-default-500 text-xs">Google OAuth</p>
              </div>
              <Button size="sm" variant="flat" isDisabled>
                Connected
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-default-500 text-xs">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <FiShield className="text-primary" />
            Privacy & Data
          </h2>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          <div>
            <p className="mb-2 text-sm font-medium">Data Storage</p>
            <p className="text-default-500 text-xs leading-relaxed">
              Your meeting recordings and transcripts are stored securely. Audio files are stored
              temporarily and can be automatically deleted based on your retention settings.
              Transcripts and summaries are retained until you manually delete them.
            </p>
          </div>

          <Divider />

          <div>
            <p className="mb-2 text-sm font-medium">Data Processing</p>
            <p className="text-default-500 text-xs leading-relaxed">
              Audio is processed using Whisper ASR for transcription, SpaCy for NLP, and EchoNote's
              custom AI model for summarization. Processing happens server-side and data is
              encrypted in transit and at rest.
            </p>
          </div>

          <Divider />

          <div className="bg-warning/10 border-warning/20 flex items-start gap-3 rounded-lg border p-3">
            <FiShield className="text-warning mt-0.5 shrink-0" size={18} />
            <div className="flex-1">
              <p className="text-warning text-xs font-medium">Privacy Notice</p>
              <p className="text-warning/80 mt-1 text-xs">
                We never share your meeting data with third parties. All processing is done on our
                secure servers.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

// Compact profile card for sidebar
export const ProfileCard = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Card className="w-full">
      <CardBody className="gap-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={user.picture}
            name={user.name}
            size="md"
            isBordered
            color="primary"
            showFallback
            fallback={<FiUser size={18} className="text-primary" />}
            classNames={{
              img: '!opacity-100',
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-default-500 truncate text-xs">{user.email}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default ProfileSettings;

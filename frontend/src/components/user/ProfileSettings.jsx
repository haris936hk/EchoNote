import {
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Divider,
  Button
} from '@heroui/react';
import {
  FiUser,
  FiMail,
  FiShield,
  FiLogOut,
  FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and all your meetings will be permanently deleted.')) {
      // Call delete account API
      console.log('Delete account');
    }
  };

  if (!user) {
    return (
      <Card>
        <CardBody className="text-center py-12">
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
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
              fallback={
                <FiUser size={32} className="text-primary" />
              }
              classNames={{
                base: "w-20 h-20",
                img: "w-full h-full object-cover !opacity-100"
              }}
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-sm text-default-500 flex items-center gap-2 mt-1">
                <FiMail size={14} />
                {user.email}
              </p>
              {user.emailVerified && (
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <FiShield size={12} />
                  Email verified
                </p>
              )}
            </div>
          </div>

          <Divider />

          {/* Account Details */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Account Provider</p>
                <p className="text-xs text-default-500">Google OAuth</p>
              </div>
              <Button
                size="sm"
                variant="flat"
                isDisabled
              >
                Connected
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-xs text-default-500">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FiShield className="text-primary" />
            Privacy & Data
          </h2>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Data Storage</p>
            <p className="text-xs text-default-500 leading-relaxed">
              Your meeting recordings and transcripts are stored securely. Audio files are stored temporarily and can be automatically deleted based on your retention settings. Transcripts and summaries are retained until you manually delete them.
            </p>
          </div>

          <Divider />

          <div>
            <p className="text-sm font-medium mb-2">Data Processing</p>
            <p className="text-xs text-default-500 leading-relaxed">
              Audio is processed using Whisper ASR for transcription, SpaCy for NLP, and EchoNote's custom AI model for summarization. Processing happens server-side and data is encrypted in transit and at rest.
            </p>
          </div>

          <Divider />

          <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <FiShield className="text-warning mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <p className="text-xs font-medium text-warning">Privacy Notice</p>
              <p className="text-xs text-warning/80 mt-1">
                We never share your meeting data with third parties. All processing is done on our secure servers.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Account Actions</h2>
        </CardHeader>
        <Divider />
        <CardBody className="gap-3 items-start">
          <Button
            color="primary"
            variant="flat"
            startContent={<FiLogOut size={18} />}
            onPress={handleLogout}
            radius="full"
          >
            Logout
          </Button>

          <Button
            color="danger"
            variant="flat"
            startContent={<FiTrash2 size={18} />}
            onPress={handleDeleteAccount}
            radius="full"
          >
            Delete Account
          </Button>
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
            fallback={
              <FiUser size={18} className="text-primary" />
            }
            classNames={{
              img: "!opacity-100"
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-default-500 truncate">{user.email}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default ProfileSettings;
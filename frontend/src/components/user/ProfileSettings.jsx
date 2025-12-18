import {
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Divider,
  Button,
  Select,
  SelectItem
} from '@heroui/react';
import { 
  FiUser, 
  FiMail, 
  FiShield,
  FiLogOut,
  FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [retentionDays, setRetentionDays] = useState('30');

  const retentionOptions = [
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '6 months' },
    { value: '365', label: '1 year' },
  ];

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
              size="lg"
              isBordered
              color="primary"
              className="w-20 h-20"
              showFallback
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

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">App Preferences</h2>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          {/* Dark Mode */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-default-500">
                Switch between light and dark theme
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                isDark ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                  isDark ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <Divider />

          {/* Email Notifications */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-default-500">
                Receive email when meeting processing is complete
              </p>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                emailNotifications ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <Divider />

          {/* Auto Delete */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-sm font-medium">Auto-delete Recordings</p>
                <p className="text-xs text-default-500">
                  Automatically delete audio files after retention period
                </p>
              </div>
              <button
                onClick={() => setAutoDelete(!autoDelete)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                  autoDelete ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                    autoDelete ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {autoDelete && (
              <div className="pl-0 w-full">
                <p className="text-sm font-medium mb-2">Retention Period</p>
                <Select
                  placeholder="Select retention period"
                  selectedKeys={[retentionDays]}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  size="sm"
                  variant="bordered"
                  className="w-64"
                  classNames={{
                    trigger: "h-10",
                    value: "text-sm",
                  }}
                >
                  {retentionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}
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
              Audio is processed using Whisper ASR for transcription, SpaCy for NLP, and Mistral 7B for summarization. Processing happens server-side and data is encrypted in transit and at rest.
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
        <CardBody className="gap-3">
          <Button
            color="default"
            variant="flat"
            startContent={<FiLogOut size={18} />}
            onPress={handleLogout}
            className="justify-start"
          >
            Logout
          </Button>

          <Button
            color="danger"
            variant="flat"
            startContent={<FiTrash2 size={18} />}
            onPress={handleDeleteAccount}
            className="justify-start"
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
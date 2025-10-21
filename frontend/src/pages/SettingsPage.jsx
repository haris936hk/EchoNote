import { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Divider,
  Switch,
  Select,
  SelectItem,
  Button,
  Accordion,
  AccordionItem
} from '@nextui-org/react';
import {
  FiUser,
  FiSettings,
  FiShield,
  FiHelpCircle,
  FiCheck,
  FiDownload,
  FiTrash2
} from 'react-icons/fi';
import ProfileSettings from '../components/user/ProfileSettings';
import { useTheme } from '../contexts/ThemeContext';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-default-500">
            Manage your account, preferences, and privacy settings
          </p>
        </div>

        {/* Settings Tabs */}
        <Card>
          <CardBody className="p-0">
            <Tabs
              aria-label="Settings tabs"
              selectedKey={activeTab}
              onSelectionChange={setActiveTab}
              variant="underlined"
              classNames={{
                tabList: 'w-full relative rounded-none p-0 border-b border-divider',
                cursor: 'w-full bg-primary',
                tab: 'max-w-fit px-6 h-14',
                tabContent: 'group-data-[selected=true]:text-primary'
              }}
            >
              {/* Profile Tab */}
              <Tab
                key="profile"
                title={
                  <div className="flex items-center gap-2">
                    <FiUser size={18} />
                    <span>Profile</span>
                  </div>
                }
              >
                <div className="p-6">
                  <ProfileSettings />
                </div>
              </Tab>

              {/* Preferences Tab */}
              <Tab
                key="preferences"
                title={
                  <div className="flex items-center gap-2">
                    <FiSettings size={18} />
                    <span>Preferences</span>
                  </div>
                }
              >
                <div className="p-6">
                  <PreferencesContent />
                </div>
              </Tab>

              {/* Privacy Tab */}
              <Tab
                key="privacy"
                title={
                  <div className="flex items-center gap-2">
                    <FiShield size={18} />
                    <span>Privacy & Data</span>
                  </div>
                }
              >
                <div className="p-6">
                  <PrivacyContent />
                </div>
              </Tab>

              {/* Help Tab */}
              <Tab
                key="help"
                title={
                  <div className="flex items-center gap-2">
                    <FiHelpCircle size={18} />
                    <span>Help</span>
                  </div>
                }
              >
                <div className="p-6">
                  <HelpContent />
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

// Preferences Content Component
const PreferencesContent = () => {
  const { isDark, toggleTheme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [retentionDays, setRetentionDays] = useState('30');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">App Preferences</h2>
        <p className="text-sm text-default-500 mb-6">
          Customize your EchoNote experience
        </p>
      </div>

      <Card>
        <CardBody className="gap-4">
          {/* Dark Mode */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-default-500">
                Switch between light and dark theme
              </p>
            </div>
            <Switch
              isSelected={isDark}
              onValueChange={toggleTheme}
              color="primary"
            />
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
            <Switch
              isSelected={emailNotifications}
              onValueChange={setEmailNotifications}
              color="primary"
            />
          </div>

          <Divider />

          {/* Auto Delete */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Auto-delete Recordings</p>
                <p className="text-xs text-default-500">
                  Automatically delete audio files after retention period
                </p>
              </div>
              <Switch
                isSelected={autoDelete}
                onValueChange={setAutoDelete}
                color="primary"
              />
            </div>

            {autoDelete && (
              <Select
                label="Retention Period"
                placeholder="Select retention period"
                selectedKeys={[retentionDays]}
                onChange={(e) => setRetentionDays(e.target.value)}
                size="sm"
                variant="bordered"
              >
                <SelectItem key="7" value="7">7 days</SelectItem>
                <SelectItem key="30" value="30">30 days</SelectItem>
                <SelectItem key="90" value="90">90 days</SelectItem>
                <SelectItem key="180" value="180">6 months</SelectItem>
                <SelectItem key="365" value="365">1 year</SelectItem>
              </Select>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button color="primary">
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

// Privacy Content Component
const PrivacyContent = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Privacy & Data</h2>
        <p className="text-sm text-default-500 mb-6">
          Understand how we handle your data
        </p>
      </div>

      {/* Data Storage */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Data Storage</h3>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          <p className="text-sm text-default-600 leading-relaxed">
            Your meeting recordings and transcripts are stored securely on our servers. 
            Audio files are stored temporarily and can be automatically deleted based on 
            your retention settings. Transcripts and summaries are retained until you 
            manually delete them.
          </p>

          <div className="bg-default-100 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-default-600">Total Meetings:</span>
                <span className="font-semibold">24</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-default-600">Storage Used:</span>
                <span className="font-semibold">142 MB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-default-600">Audio Files:</span>
                <span className="font-semibold">18 active</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Data Processing */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Data Processing</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <p className="text-sm text-default-600 leading-relaxed mb-4">
            Audio is processed using the following AI models:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <FiCheck className="text-success mt-0.5 flex-shrink-0" size={16} />
              <span><strong>Whisper ASR:</strong> Speech-to-text transcription</span>
            </li>
            <li className="flex items-start gap-2">
              <FiCheck className="text-success mt-0.5 flex-shrink-0" size={16} />
              <span><strong>SpaCy:</strong> Natural language processing and entity extraction</span>
            </li>
            <li className="flex items-start gap-2">
              <FiCheck className="text-success mt-0.5 flex-shrink-0" size={16} />
              <span><strong>Mistral 7B:</strong> AI-powered summarization</span>
            </li>
          </ul>
          <p className="text-xs text-default-500 mt-4">
            All processing happens server-side with encryption in transit and at rest.
          </p>
        </CardBody>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardBody>
          <div className="flex items-start gap-3">
            <FiShield className="text-primary mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold text-primary mb-2">
                Your Privacy Matters
              </p>
              <p className="text-sm text-primary/80 leading-relaxed">
                We never share your meeting data with third parties. All processing 
                is done on our secure servers. You have full control over your data 
                and can delete it at any time.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Export Data */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export Your Data</p>
              <p className="text-xs text-default-500">
                Download all your meetings, transcripts, and summaries
              </p>
            </div>
            <Button variant="flat" startContent={<FiDownload size={16} />}>
              Export
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Delete All Data */}
      <Card className="border-danger/20">
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-danger">Delete All Data</p>
              <p className="text-xs text-default-500">
                Permanently delete all your meetings and account data
              </p>
            </div>
            <Button color="danger" variant="flat" startContent={<FiTrash2 size={16} />}>
              Delete
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

// Help Content Component
const HelpContent = () => {
  const faqs = [
    {
      question: 'How long can my recordings be?',
      answer: 'Each recording can be up to 3 minutes long. This limit ensures optimal processing speed and accuracy.'
    },
    {
      question: 'How accurate is the transcription?',
      answer: 'Our Whisper ASR model achieves 90%+ accuracy for clear English speech. Accuracy may vary based on audio quality, accents, and background noise.'
    },
    {
      question: 'Can I edit transcripts?',
      answer: 'Currently, transcripts are read-only. We recommend re-recording if major corrections are needed.'
    },
    {
      question: 'How is my data secured?',
      answer: 'All data is encrypted in transit (HTTPS) and at rest. We use industry-standard security practices to protect your information.'
    },
    {
      question: 'Can I delete my meetings?',
      answer: 'Yes, you can delete individual meetings or all your data at any time from the settings page.'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Help & Support</h2>
        <p className="text-sm text-default-500 mb-6">
          Find answers to common questions
        </p>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Links</h3>
        </CardHeader>
        <Divider />
        <CardBody className="gap-2">
          <Button variant="flat" className="justify-start" fullWidth>
            📚 Documentation
          </Button>
          <Button variant="flat" className="justify-start" fullWidth>
            💬 Contact Support
          </Button>
          <Button variant="flat" className="justify-start" fullWidth>
            🐛 Report a Bug
          </Button>
          <Button variant="flat" className="justify-start" fullWidth>
            💡 Request a Feature
          </Button>
        </CardBody>
      </Card>

      {/* FAQs */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <Accordion variant="splitted">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              title={<span className="text-sm font-medium">{faq.question}</span>}
            >
              <p className="text-sm text-default-600 pb-4">{faq.answer}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Contact Card */}
      <Card className="bg-primary/5 border border-primary/20">
        <CardBody className="text-center gap-3">
          <p className="text-sm font-semibold text-primary">
            Still need help?
          </p>
          <p className="text-sm text-default-600">
            Our support team is here to assist you
          </p>
          <Button color="primary" variant="flat">
            Contact Support
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default SettingsPage;
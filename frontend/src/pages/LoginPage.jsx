import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { FiMic, FiCheckCircle, FiZap, FiLock } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import LoginButton from '../components/auth/LoginButton';

const LoginPage = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const features = [
    {
      icon: FiMic,
      title: 'AI-Powered Transcription',
      description: 'Accurate speech-to-text using Whisper ASR technology'
    },
    {
      icon: FiZap,
      title: 'Instant Summaries',
      description: 'Get key decisions and action items automatically extracted'
    },
    {
      icon: FiCheckCircle,
      title: 'Easy to Use',
      description: 'Record, process, and access your meetings in minutes'
    },
    {
      icon: FiLock,
      title: 'Privacy First',
      description: 'Your data is encrypted and you control retention policies'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <FiMic size={48} className="text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
        {/* Left Column - Branding & Features */}
        <div className="space-y-8 text-center lg:text-left">
          {/* Logo & Tagline */}
          <div className="animate-fade-in">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              <div className="p-3 bg-primary rounded-3xl shadow-lg shadow-primary/50 hover:shadow-primary/80 transition-all duration-300 hover:scale-105">
                <FiMic size={32} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                EchoNote
              </h1>
            </div>
            <p className="text-xl text-default-600">
              Transform your meetings into actionable insights
            </p>
            <p className="text-default-500 mt-2">
              AI-powered transcription and summarization for modern teams
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-content1 rounded-2xl border border-divider hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-105 cursor-pointer group"
                >
                  <div className="p-2 bg-primary/10 rounded-xl flex-shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
                    <Icon className="text-primary group-hover:scale-110 transition-transform duration-300" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-xs text-default-500 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
            <div>
              <p className="text-2xl font-bold text-primary">90%+</p>
              <p className="text-xs text-default-500">Accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">3 min</p>
              <p className="text-xs text-default-500">Max Recording</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">Free</p>
              <p className="text-xs text-default-500">To Start</p>
            </div>
          </div>
        </div>

        {/* Right Column - Login Card */}
        <Card className="w-full max-w-md mx-auto lg:mx-0 rounded-3xl shadow-2xl border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 backdrop-blur-sm bg-content1/95">
          <CardHeader className="flex flex-col items-center gap-2 pb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-sm text-default-500 text-center">
              Sign in to access your meetings and continue where you left off
            </p>
          </CardHeader>

          <Divider />

          <CardBody className="gap-6 py-8">
            {/* Login Button */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl opacity-50 rounded-3xl"></div>
              <LoginButton size="lg" fullWidth />
            </div>

            {/* Privacy Notice */}
            <div className="space-y-3">
              <p className="text-xs text-center text-default-400">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>

              <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-2xl border border-primary/20 hover:border-primary/40 transition-all duration-300">
                <FiLock className="text-primary mt-0.5 flex-shrink-0" size={16} />
                <p className="text-xs text-default-600">
                  <strong className="text-primary">Secure & Private:</strong> We use Google OAuth for authentication. Your meeting data is encrypted and never shared with third parties.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <Divider />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-content1 px-3 text-xs text-default-400">
                New to EchoNote?
              </span>
            </div>

            {/* Benefits List */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-center">
                What you'll get:
              </p>
              <ul className="space-y-2">
                {[
                  'Unlimited meeting recordings (3 min each)',
                  'AI-powered transcription and summaries',
                  'Searchable meeting archive',
                  'Secure cloud storage'
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <FiCheckCircle className="text-success mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-default-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-default-400">
          © 2025 EchoNote. Made by Haris Khan.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
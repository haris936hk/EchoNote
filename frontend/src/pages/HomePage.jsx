import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import {
  FiMic,
  FiFileText,
  FiZap,
  FiShield,
  FiClock,
  FiCheckCircle,
  FiArrowRight,
  FiUsers,
  FiTrendingUp
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  const features = [
    {
      icon: FiMic,
      title: 'High-Quality Recording',
      description: 'Crystal clear audio capture with advanced noise reduction technology',
      color: 'primary'
    },
    {
      icon: FiFileText,
      title: 'AI Transcription',
      description: 'Powered by Whisper ASR with 90%+ accuracy across different accents',
      color: 'secondary'
    },
    {
      icon: FiZap,
      title: 'Instant Summaries',
      description: 'Get executive summaries, key decisions, and action items automatically',
      color: 'success'
    },
    {
      icon: FiShield,
      title: 'Privacy First',
      description: 'End-to-end encryption with configurable data retention policies',
      color: 'warning'
    },
    {
      icon: FiClock,
      title: 'Fast Processing',
      description: 'Meeting summaries ready in minutes, not hours',
      color: 'danger'
    },
    {
      icon: FiCheckCircle,
      title: 'Easy to Use',
      description: 'Simple interface designed for productivity, not complexity',
      color: 'primary'
    }
  ];

  const benefits = [
    {
      stat: '90%+',
      label: 'Transcription Accuracy',
      icon: FiTrendingUp
    },
    {
      stat: '3 min',
      label: 'Max Recording Time',
      icon: FiClock
    },
    {
      stat: 'Free',
      label: 'To Get Started',
      icon: FiUsers
    }
  ];

  const handleGetStarted = () => {
    navigate('/login');
  };

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
    <div className="min-h-screen bg-background">
      {/* Header/Navbar */}
      <nav className="border-b border-divider sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <FiMic size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold">EchoNote</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-default-600 hover:text-primary transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-default-600 hover:text-primary transition-colors">
                How It Works
              </a>
              <a href="#benefits" className="text-default-600 hover:text-primary transition-colors">
                Benefits
              </a>
            </div>

            {/* CTA Button */}
            <Button
              color="primary"
              onPress={handleGetStarted}
              endContent={<FiArrowRight />}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
              <FiZap size={16} />
              AI-Powered Meeting Intelligence
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Transform Your Meetings Into
              <span className="text-primary"> Actionable Insights</span>
            </h1>

            <p className="text-xl text-default-600 max-w-2xl mx-auto">
              Record, transcribe, and summarize your meetings automatically with AI. 
              Never miss important decisions or action items again.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                color="primary"
                size="lg"
                onPress={handleGetStarted}
                endContent={<FiArrowRight size={20} />}
                className="min-w-[200px]"
              >
                Start Free
              </Button>
              <Button
                variant="bordered"
                size="lg"
                onPress={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="min-w-[200px]"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="flex justify-center mb-2">
                      <Icon className="text-primary" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-primary">{benefit.stat}</p>
                    <p className="text-sm text-default-500 mt-1">{benefit.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-default-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Better Meetings
            </h2>
            <p className="text-lg text-default-600">
              Powerful features designed to make meeting documentation effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border border-divider">
                  <CardBody className="gap-4 p-6">
                    <div className={`p-3 bg-${feature.color}/10 rounded-lg w-fit`}>
                      <Icon className={`text-${feature.color}`} size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-default-600 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple Three-Step Process
            </h2>
            <p className="text-lg text-default-600">
              From recording to insights in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Record Your Meeting',
                description: 'Use our web app to record up to 3 minutes of crystal-clear audio with noise reduction',
                icon: FiMic
              },
              {
                step: '02',
                title: 'AI Processing',
                description: 'Our AI transcribes, analyzes, and extracts key information automatically',
                icon: FiZap
              },
              {
                step: '03',
                title: 'Get Your Summary',
                description: 'Receive structured summaries with decisions, action items, and next steps',
                icon: FiFileText
              }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="absolute top-8 left-1/2 w-full h-0.5 bg-primary/20 -z-10 hidden md:block last:hidden" />
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-default-600">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border border-primary/20">
              <CardBody className="p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Transform Your Meetings?
                </h2>
                <p className="text-lg text-default-600 mb-8 max-w-2xl mx-auto">
                  Join teams who are already saving time and capturing better insights with EchoNote
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    color="primary"
                    size="lg"
                    onPress={handleGetStarted}
                    endContent={<FiArrowRight size={20} />}
                    className="min-w-[200px]"
                  >
                    Get Started Free
                  </Button>
                </div>

                <p className="text-sm text-default-500 mt-6">
                  No credit card required • Free to start • 3-minute recordings
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-divider py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg">
                  <FiMic size={20} className="text-white" />
                </div>
                <span className="text-xl font-bold">EchoNote</span>
              </div>
              <p className="text-sm text-default-600">
                AI-powered meeting transcription and summarization
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-default-600">
                <li><a href="#features" className="hover:text-primary">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-primary">How It Works</a></li>
                <li><a href="#benefits" className="hover:text-primary">Benefits</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-default-600">
                <li><a href="/about" className="hover:text-primary">About</a></li>
                <li><a href="/privacy" className="hover:text-primary">Privacy</a></li>
                <li><a href="/terms" className="hover:text-primary">Terms</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-default-600">
                <li><a href="/contact" className="hover:text-primary">Contact</a></li>
                <li><a href="/docs" className="hover:text-primary">Documentation</a></li>
                <li><a href="/faq" className="hover:text-primary">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-divider mt-12 pt-8 text-center">
            <p className="text-sm text-default-500">
              © 2025 EchoNote. Made with ❤️ by Riphah Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
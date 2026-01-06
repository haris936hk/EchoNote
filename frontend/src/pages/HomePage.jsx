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
      title: 'Accurate Transcription',
      description: 'Whisper ASR delivers 90%+ accuracy across different accents and audio conditions',
      color: 'secondary'
    },
    {
      icon: FiZap,
      title: 'Custom AI Model',
      description: 'Fine-tuned Qwen2.5-7B achieves 88% accuracy extracting structured summaries with action items, key decisions, and next steps',
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
      stat: '88%+',
      label: 'Summarization Accuracy',
      icon: FiTrendingUp
    },
    {
      stat: '10 min',
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
              <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/60 transition-all duration-300 hover:scale-105">
                <FiMic size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                EchoNote
              </span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#features"
                className="relative group px-4 py-2 text-default-600 hover:text-primary transition-all duration-300 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/20 hover:shadow-lg hover:shadow-primary/20"
              >
                <span className="relative z-10 font-medium">Features</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 blur-sm"></div>
              </a>
              <a
                href="#how-it-works"
                className="relative group px-4 py-2 text-default-600 hover:text-primary transition-all duration-300 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/20 hover:shadow-lg hover:shadow-primary/20"
              >
                <span className="relative z-10 font-medium">How It Works</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 blur-sm"></div>
              </a>
              <a
                href="#benefits"
                className="relative group px-4 py-2 text-default-600 hover:text-primary transition-all duration-300 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/20 hover:shadow-lg hover:shadow-primary/20"
              >
                <span className="relative z-10 font-medium">Benefits</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 blur-sm"></div>
              </a>
            </div>

            {/* CTA Button */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-300 rounded-2xl"></div>
              <Button
                color="primary"
                onPress={handleGetStarted}
                endContent={<FiArrowRight />}
                className="relative rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/60 transition-all duration-300"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-0 py-20 md:py-32 overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium border border-primary/20 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
              <FiZap size={16} />
              Custom AI-Powered Meeting Summaries
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight animate-fade-in">
              Transform Your Meetings Into
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Actionable Insights</span>
            </h1>

            <p className="text-xl text-default-600 max-w-2xl mx-auto">
              Record and transcribe your meetings with Whisper ASR, then let our custom AI model extract structured summaries, action items, and key decisions automatically.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500"></div>
                <Button
                  color="primary"
                  size="lg"
                  onPress={handleGetStarted}
                  endContent={<FiArrowRight size={20} />}
                  className="min-w-[200px] relative rounded-2xl shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/60 transition-all duration-300 hover:scale-105"
                >
                  Start Free
                </Button>
              </div>
              <Button
                variant="bordered"
                size="lg"
                onPress={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="min-w-[200px] rounded-2xl border-2 hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="text-center p-4 rounded-2xl bg-content1/50 border border-divider hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 group">
                    <div className="flex justify-center mb-2">
                      <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
                        <Icon className="text-primary group-hover:scale-110 transition-transform duration-300" size={24} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {benefit.stat}
                    </p>
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
                <Card
                  key={index}
                  className="border border-divider rounded-3xl hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-105 group cursor-pointer"
                >
                  <CardBody className="gap-4 p-6">
                    <div className={`p-3 bg-${feature.color}/10 rounded-2xl w-fit group-hover:bg-${feature.color}/20 transition-all duration-300 shadow-lg group-hover:shadow-${feature.color}/30`}>
                      <Icon className={`text-${feature.color} group-hover:scale-110 transition-transform duration-300`} size={24} />
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
                description: 'Use our web app to record up to 10 minutes of crystal-clear audio with noise reduction',
                icon: FiMic
              },
              {
                step: '02',
                title: 'Transcribe & Analyze',
                description: 'Whisper ASR transcribes audio, then our custom AI model extracts structured summaries and action items',
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
                  <div className="text-center group">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4 shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/60 transition-all duration-300 hover:scale-110 group-hover:animate-glow-pulse">
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
      <section id="benefits" className="py-20 bg-primary/5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 blur-3xl"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-primary/30 rounded-3xl shadow-2xl hover:border-primary/50 transition-all duration-500 backdrop-blur-sm bg-content1/95 hover:shadow-primary/30">
              <CardBody className="p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Ready to Transform Your Meetings?
                </h2>
                <p className="text-lg text-default-600 mb-8 max-w-2xl mx-auto">
                  Join teams who are already saving time and capturing better insights with EchoNote
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500"></div>
                    <Button
                      color="primary"
                      size="lg"
                      onPress={handleGetStarted}
                      endContent={<FiArrowRight size={20} />}
                      className="min-w-[200px] relative rounded-2xl shadow-xl shadow-primary/50 hover:shadow-2xl hover:shadow-primary/70 transition-all duration-300 hover:scale-105"
                    >
                      Get Started Free
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-default-500 mt-6">
                  No credit card required • Free to start • 10-minute recordings
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
                <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/30">
                  <FiMic size={20} className="text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  EchoNote
                </span>
              </div>
              <p className="text-sm text-default-600">
                Whisper ASR transcription with custom AI-powered structured summaries
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
              © 2025 EchoNote. Made with ❤️ by Riphah Students
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
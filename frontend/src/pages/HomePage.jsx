import { useNavigate } from 'react-router-dom';
import { LuMic as Mic, LuWaves as AudioLines, LuBrain as Brain, LuSparkles as Sparkles, LuListChecks as ListChecks, LuSmilePlus as SmilePlus, LuMail as Mail } from 'react-icons/lu';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/common/Footer';

/**
 * HomePage — Public landing page
 * Matches Stitch home_echonote_final design
 */
const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const features = [
    {
      icon: AudioLines,
      title: 'Whisper Transcription',
      description: 'State-of-the-art multilingual speech recognition with human-level accuracy.',
    },
    {
      icon: Brain,
      title: 'NLP Entity Extraction',
      description:
        'Automatically detect dates, names, and organizations mentioned in your meetings.',
    },
    {
      icon: Sparkles,
      title: 'Custom AI Summaries',
      description:
        'Not just a summary, but a curated narrative of your most important discussions.',
    },
    {
      icon: ListChecks,
      title: 'Action Item Detection',
      description:
        'AI identifies commitments and tasks, converting dialogue into a concrete to-do list.',
    },
    {
      icon: SmilePlus,
      title: 'Sentiment Analysis',
      description: 'Understand the emotional pulse of your team and clients during key moments.',
    },
    {
      icon: Mail,
      title: 'Email Notifications',
      description:
        'Get your summaries delivered straight to your inbox within seconds of finishing.',
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0c1324', color: '#dce1fb' }}>
      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 w-full bg-[#2e3447]/40 shadow-2xl backdrop-blur-3xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-accent-primary flex items-center gap-2">
            <Mic size={20} />
            <span className="text-xl font-bold tracking-tighter">EchoNote</span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium tracking-tight md:flex">
            <a href="#features" className="text-slate-400 transition-colors hover:text-slate-100">
              Features
            </a>
            <span className="text-slate-600">·</span>
            <a
              href="#how-it-works"
              className="text-slate-400 transition-colors hover:text-slate-100"
            >
              How It Works
            </a>
            <span className="text-slate-600">·</span>
            <a href="#cta" className="text-slate-400 transition-colors hover:text-slate-100">
              Benefits
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleGetStarted}
              className="bg-cta hidden rounded-lg px-5 py-2 text-sm font-bold text-white transition-all hover:brightness-110 sm:block"
            >
              Get Started
            </button>
            <div
              onClick={handleGetStarted}
              className="bg-accent-primary/20 border-accent-primary/30 text-accent-primary hover:bg-accent-primary/30 flex size-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
            >
              <Mic size={16} />
            </div>
          </div>
        </div>
      </nav>

      <main className="pb-20 pt-32">
        {/* ── Hero Section ── */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
          <div className="space-y-8">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tighter text-[#dce1fb] md:text-7xl">
              Your meetings, <span className="text-gradient">perfectly</span> remembered.
            </h1>
            <p className="max-w-lg text-xl leading-relaxed text-[#c6c5d5]">
              Record. Transcribe. Summarize. Powered by a custom AI model.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleGetStarted}
                className="from-accent-primary to-primary-400 shadow-accent-primary/10 hover:shadow-accent-primary/20 rounded-xl bg-gradient-to-br px-8 py-4 font-bold text-white shadow-lg transition-all active:scale-95"
              >
                Get Started Free →
              </button>
            </div>
          </div>

          {/* Product mockup */}
          <div className="group relative">
            <div className="from-accent-primary/20 to-accent-secondary/20 absolute -inset-1 rounded-2xl bg-gradient-to-r blur-2xl transition duration-1000 group-hover:opacity-40"></div>
            <div className="glass-card relative rotate-2 rounded-2xl border border-[#454653]/10 p-2 shadow-2xl">
              <div className="flex aspect-video overflow-hidden rounded-xl border border-[#454653]/20 bg-[#23293c] shadow-2xl">
                {/* Left panel - transcript mockup */}
                <div className="w-1/2 space-y-3 border-r border-[#454653]/20 p-4">
                  <div className="bg-accent-primary/20 h-4 w-1/3 rounded"></div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-[#c6c5d5]/10"></div>
                    <div className="h-2 w-5/6 rounded bg-[#c6c5d5]/10"></div>
                    <div className="h-2 w-4/6 rounded bg-[#c6c5d5]/10"></div>
                  </div>
                  <div className="space-y-2 pt-4">
                    <div className="h-2 w-full rounded bg-[#c6c5d5]/10"></div>
                    <div className="h-2 w-3/4 rounded bg-[#c6c5d5]/10"></div>
                  </div>
                </div>
                {/* Right panel - summary mockup */}
                <div className="w-1/2 space-y-4 bg-[#070d1f]/50 p-4">
                  <div className="bg-accent-secondary/20 h-4 w-1/2 rounded"></div>
                  <div className="rounded-lg border border-[#454653]/10 bg-[#191f31] p-3">
                    <div className="bg-cta/20 mb-2 h-2 w-full rounded"></div>
                    <div className="h-2 w-2/3 rounded bg-[#c6c5d5]/10"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-accent-primary size-2 rounded-full"></div>
                      <div className="h-2 w-1/2 rounded bg-[#c6c5d5]/10"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-accent-primary size-2 rounded-full"></div>
                      <div className="h-2 w-2/3 rounded bg-[#c6c5d5]/10"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Strip ── */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-wrap items-center justify-center gap-8 rounded-2xl bg-[#151b2d]/50 px-12 py-8 md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-accent-primary font-mono text-3xl font-bold">88%+</span>
              <span className="text-xs font-medium uppercase tracking-widest text-[#c6c5d5]/60">
                Summary Accuracy
              </span>
            </div>
            <div className="hidden h-8 w-px bg-[#454653]/10 md:block"></div>
            <div className="flex items-center gap-3">
              <span className="text-accent-primary font-mono text-3xl font-bold">10 min</span>
              <span className="text-xs font-medium uppercase tracking-widest text-[#c6c5d5]/60">
                Max Recording
              </span>
            </div>
            <div className="hidden h-8 w-px bg-[#454653]/10 md:block"></div>
            <div className="flex items-center gap-3">
              <span className="text-accent-primary font-mono text-3xl font-bold">~70s</span>
              <span className="text-xs font-medium uppercase tracking-widest text-[#c6c5d5]/60">
                Processing
              </span>
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-16 text-center lg:text-left">
            <h2 className="mb-4 text-3xl font-extrabold tracking-tighter text-[#dce1fb] md:text-5xl">
              Built for meeting intelligence
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group rounded-2xl bg-[#151b2d] p-8 transition-colors hover:bg-[#191f31]"
                >
                  <div className="bg-accent-primary/10 mb-6 flex size-12 items-center justify-center rounded-lg">
                    <Icon size={20} className="text-accent-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[#dce1fb]">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-[#c6c5d5]">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          id="how-it-works"
          className="relative mx-auto max-w-7xl overflow-hidden px-6 py-20"
        >
          <div className="via-accent-primary/20 absolute left-0 top-1/2 hidden h-px w-full bg-gradient-to-r from-transparent to-transparent lg:block"></div>
          <div className="mb-20 text-center">
            <h2 className="mb-4 text-3xl font-extrabold tracking-tighter text-[#dce1fb] md:text-5xl">
              How It Works
            </h2>
          </div>
          <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-8 flex size-16 items-center justify-center rounded-full border-4 border-[#0c1324] bg-[#23293c] shadow-xl">
                <span className="text-accent-primary font-mono text-xl font-bold">01</span>
              </div>
              <div className="w-full rounded-2xl border border-[#454653]/10 bg-[#151b2d] p-6">
                <h4 className="mb-2 text-lg font-bold text-[#dce1fb]">Record</h4>
                <p className="text-sm text-[#c6c5d5]">
                  Start the recording via our web interface during your live meeting.
                </p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="ai-glow mb-8 flex size-16 items-center justify-center rounded-full border-4 border-[#0c1324] bg-[#23293c] shadow-xl">
                <span className="text-accent-secondary font-mono text-xl font-bold">02</span>
              </div>
              <div className="w-full rounded-2xl border border-[#454653]/10 bg-[#151b2d] p-6">
                <h4 className="mb-2 text-lg font-bold text-[#dce1fb]">AI Processes</h4>
                <p className="text-sm text-[#c6c5d5]">
                  Our custom model transcribes and identifies key entities in real-time with sub-70s
                  latency.
                </p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-8 flex size-16 items-center justify-center rounded-full border-4 border-[#0c1324] bg-[#23293c] shadow-xl">
                <span className="text-accent-primary font-mono text-xl font-bold">03</span>
              </div>
              <div className="w-full rounded-2xl border border-[#454653]/10 bg-[#151b2d] p-6">
                <h4 className="mb-2 text-lg font-bold text-[#dce1fb]">Get Insights</h4>
                <p className="text-sm text-[#c6c5d5]">
                  Access structured summaries and action items on your dashboard or via email.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA Card ── */}
        <section id="cta" className="mx-auto max-w-5xl px-6 py-20">
          <div className="gradient-border-card px-8 py-20 text-center">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-6 text-3xl font-extrabold tracking-tighter text-[#dce1fb] md:text-5xl">
                Ready to transform your meetings?
              </h2>
              <p className="mb-10 text-lg text-[#c6c5d5]">
                Join forward-thinking teams using EchoNote to capture clarity from chaos.
              </p>
              <button
                onClick={handleGetStarted}
                className="from-accent-primary to-primary-400 rounded-xl bg-gradient-to-br px-10 py-5 font-bold text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
              >
                Get Started For Free
              </button>
              <p className="mt-6 text-sm font-medium text-[#c6c5d5]/60">
                No credit card required • Free to start
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
};

export default HomePage;

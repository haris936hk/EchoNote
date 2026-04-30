import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  LuWaves as AudioLines,
  LuBrain as Brain,
  LuSparkles as Sparkles,
  LuListChecks as ListChecks,
  LuSmilePlus as SmilePlus,
  LuMail as Mail,
  LuWorkflow,
  LuUsers,
  LuCode,
  LuLineChart,
  LuBriefcase,
  LuMousePointer2,
  LuBoxes,
} from 'react-icons/lu';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/common/Header';
import ScrollReveal from '../components/common/ScrollReveal';
import Footer from '../components/common/Footer';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const NAV_LINKS = [
  { path: '#features', label: 'Features' },
  { path: '#how-it-works', label: 'How It Works' },
  { path: '#cta', label: 'Benefits' },
];

const STORY_STEPS = [
  {
    eyebrow: 'Capture',
    title: 'Record once. Keep every detail.',
    description:
      'Start from a live meeting or upload audio. EchoNote keeps context intact so nothing is lost after the call.',
  },
  {
    eyebrow: 'Understand',
    title: 'AI turns raw dialogue into structure.',
    description:
      'Get transcripts, sentiment, key entities, decisions, and next steps generated from one meeting flow.',
  },
  {
    eyebrow: 'Align',
    title: 'Turn summaries into accountable work.',
    description:
      'Action items become trackable tasks with assignees, priorities, and optional Jira sync to keep execution moving.',
  },
  {
    eyebrow: 'Scale',
    title: 'Collaborate across teams and workspaces.',
    description:
      'Share read-only links, send updates to Slack, and collaborate inside role-based workspaces with your team.',
  },
];

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const howItWorksRef = useRef(null);

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
      title: 'Deepgram Nova-3',
      description: 'Ultra-fast precision speech recognition with human-level accuracy.',
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

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Hero Section Animation
      const heroTl = gsap.timeline();
      heroTl
        .from('.hero-title span', {
          y: 50,
          opacity: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
        })
        .from(
          '.hero-subtitle',
          {
            y: 20,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
          },
          '-=0.4'
        )
        .fromTo(
          '.hero-btn',
          { scale: 0.9, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: 'back.out(1.5)',
          },
          '-=0.2'
        )
        .from(
          '.hero-illustration',
          {
            x: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
          },
          '-=0.6'
        );

      // Hero Parallax
      gsap.to('.hero-illustration', {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Stats Counters
      gsap.utils.toArray('.stat-number').forEach((stat) => {
        const targetValue = parseFloat(stat.getAttribute('data-value'));
        const suffix = stat.getAttribute('data-suffix') || '';

        gsap.fromTo(
          stat,
          { innerText: 0 },
          {
            innerText: targetValue,
            duration: 2,
            ease: 'power2.out',
            snap: { innerText: 1 },
            scrollTrigger: {
              trigger: '.stats-section',
              start: 'top 80%',
            },
            onUpdate: function () {
              stat.innerText = Math.round(this.targets()[0].innerText) + suffix;
            },
          }
        );
      });

      // How It Works - Horizontal Scroll
      const steps = gsap.utils.toArray('.hiw-step');
      gsap.to(steps, {
        xPercent: -100 * (steps.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: howItWorksRef.current,
          pin: true,
          scrub: 0.9,
          start: 'top top+=88',
          end: () => '+=' + window.innerWidth * (steps.length - 1),
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: -1,
        },
      });

      // Features Stagger
      gsap.from('.feature-card', {
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        scrollTrigger: {
          trigger: '#features',
          start: 'top 75%',
        },
      });

      // Multiplayer fake cursor animation
      gsap.to('.fake-cursor-1', {
        x: 100, y: 50, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
      gsap.to('.fake-cursor-2', {
        x: -80, y: -40, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.5,
      });

      // Use Cases Stagger
      gsap.from('.use-case-card', {
        y: 50, opacity: 0, duration: 0.6, stagger: 0.15,
        scrollTrigger: { trigger: '#use-cases', start: 'top 75%' }
      });

      // Ecosystem Lines
      gsap.from('.ecosystem-item', {
        scale: 0, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'back.out(1.5)',
        scrollTrigger: { trigger: '#ecosystem', start: 'top 75%' }
      });

      // Workspaces Fan Out
      const workspaceCards = gsap.utils.toArray('.workspace-card');
      gsap.set(workspaceCards, { transformOrigin: "bottom center" });
      gsap.to(workspaceCards, {
        rotation: (i) => (i - 1) * 15,
        x: (i) => (i - 1) * 40,
        y: (i) => Math.abs(i - 1) * 20,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#workspaces',
          start: 'top 60%',
        }
      });

      // CTA Scale up
      gsap.from('.cta-card', {
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#cta',
          start: 'top 80%',
        },
      });

      // Scroll Storytelling
      mm.add('(min-width: 1024px)', () => {
        const stepCount = STORY_STEPS.length;
        const storyTl = gsap.timeline({
          scrollTrigger: {
            trigger: '.story-pin-wrap',
            start: 'top top+=96',
            end: `+=${(stepCount - 1) * 380}`,
            pin: '.story-pin-wrap',
            pinSpacing: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: 2,
          },
        });

        gsap.set('.story-step', { autoAlpha: 0.2, y: 30 });
        gsap.set('.story-step-0', { autoAlpha: 1, y: 0 });
        gsap.set('.story-visual-card', { yPercent: 16, scale: 0.92, autoAlpha: 0 });
        gsap.set('.story-visual-card-0', { yPercent: 0, scale: 1, autoAlpha: 1 });
        gsap.set('.story-progress-bar', { scaleX: 0, transformOrigin: 'left center' });
        storyTl.addLabel('step-0', 0);

        STORY_STEPS.forEach((_, index) => {
          if (index > 0) {
            const at = index;
            storyTl
              .addLabel(`step-${index}`, at)
              .to(
                '.story-progress-bar',
                { scaleX: index / (stepCount - 1), duration: 0.35 },
                at
              )
              .to(`.story-step-${index - 1}`, { autoAlpha: 0.2, y: -20, duration: 0.35 }, at)
              .to(`.story-step-${index}`, { autoAlpha: 1, y: 0, duration: 0.35 }, at)
              .to(
                `.story-visual-card-${index - 1}`,
                { yPercent: -12, scale: 0.9, autoAlpha: 0, duration: 0.35 },
                at
              )
              .to(
                `.story-visual-card-${index}`,
                { yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.45 },
                at
              );
          }
        });
      });

      return () => mm.revert();
    },
    {
      scope: containerRef,
      revertOnUpdate: true,
    }
  );

  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: '#0c1324', color: '#dce1fb' }} ref={containerRef}>
      {}
      <ScrollReveal>
        <Header navItems={NAV_LINKS} />
      </ScrollReveal>

      <main className="pb-20 pt-32">
        {}
        <section className="hero-section mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
          <div className="space-y-8">
            <h1 className="hero-title text-5xl font-extrabold leading-tight tracking-tighter text-on-surface md:text-7xl">
              <span className="inline-block">Your</span> <span className="inline-block">meetings,</span> <br/>
              <span className="text-gradient inline-block">perfectly</span> <span className="inline-block">remembered.</span>
            </h1>
            <p className="hero-subtitle max-w-lg text-xl leading-relaxed text-on-surface-variant">
              Record. Transcribe. Summarize. Powered by a custom AI model.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleGetStarted}
                className="hero-btn rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary px-8 py-4 font-bold text-white shadow-lg shadow-accent-primary/10 transition-all hover:shadow-accent-primary/20 active:scale-95"
                type="button"
              >
                Get Started Free →
              </button>
            </div>
          </div>

          {}
          <div className="hero-illustration group relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 blur-2xl transition duration-1000 group-hover:opacity-40" />
            <div className="glass-card relative rotate-2 rounded-2xl border border-[#454653]/10 p-2 shadow-2xl">
              <div className="flex aspect-video overflow-hidden rounded-xl border border-[#454653]/20 bg-[#23293c] shadow-2xl">
                {}
                <div className="w-1/2 space-y-3 border-r border-[#454653]/20 p-4">
                  <div className="h-4 w-1/3 rounded bg-accent-primary/20" />
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-[#c6c5d5]/10" />
                    <div className="h-2 w-5/6 rounded bg-[#c6c5d5]/10" />
                    <div className="h-2 w-4/6 rounded bg-[#c6c5d5]/10" />
                  </div>
                  <div className="space-y-2 pt-4">
                    <div className="h-2 w-full rounded bg-[#c6c5d5]/10" />
                    <div className="h-2 w-3/4 rounded bg-[#c6c5d5]/10" />
                  </div>
                </div>
                {}
                <div className="w-1/2 space-y-4 bg-[#070d1f]/50 p-4">
                  <div className="h-4 w-1/2 rounded bg-accent-secondary/20" />
                  <div className="rounded-lg border border-[#454653]/10 bg-[#191f31] p-3">
                    <div className="mb-2 h-2 w-full rounded bg-cta/20" />
                    <div className="h-2 w-2/3 rounded bg-[#c6c5d5]/10" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-accent-primary" />
                      <div className="h-2 w-1/2 rounded bg-[#c6c5d5]/10" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-accent-primary" />
                      <div className="h-2 w-2/3 rounded bg-[#c6c5d5]/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="stats-section mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-wrap items-center justify-center gap-8 rounded-2xl bg-[#151b2d]/50 px-12 py-8 md:justify-between">
            <div className="flex items-center gap-3">
              <span className="stat-number font-mono text-3xl font-bold text-accent-primary" data-value="88" data-suffix="%+">0</span>
              <span className="text-xs font-medium uppercase tracking-widest text-[#c6c5d5]/60">
                Summary Accuracy
              </span>
            </div>
            <div className="hidden h-8 w-px bg-[#454653]/10 md:block" />
            <div className="flex items-center gap-3">
              <span className="stat-number font-mono text-3xl font-bold text-accent-primary" data-value="10" data-suffix=" min">0</span>
              <span className="text-xs font-medium uppercase tracking-widest text-[#c6c5d5]/60">
                Max Recording
              </span>
            </div>
            <div className="hidden h-8 w-px bg-[#454653]/10 md:block" />
            <div className="flex items-center gap-3">
              <span className="stat-number font-mono text-3xl font-bold text-accent-primary" data-value="70" data-suffix="s">0</span>
              <span className="text-xs font-medium uppercase tracking-widest text-[#c6c5d5]/60">
                Processing
              </span>
            </div>
          </div>
        </section>

        <section className="story-section relative mx-auto max-w-7xl px-6 py-12 lg:py-20">
          <div className="story-pin-wrap rounded-3xl border border-[#454653]/20 bg-[#0f172e]/60 p-6 lg:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-extrabold tracking-tighter text-on-surface md:text-4xl">
                From meeting chaos to team clarity
              </h2>
              <span className="hidden rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-primary md:inline-flex">
                Scroll to explore
              </span>
            </div>

            <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-[#23293c]">
              <div className="story-progress-bar h-full w-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary" />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-5">
                {STORY_STEPS.map((step, index) => (
                  <article
                    key={step.title}
                    className={`story-step story-step-${index} rounded-2xl border border-[#454653]/10 bg-[#151b2d]/80 p-5 ${index === 0 ? 'opacity-100' : 'opacity-20'}`}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-primary">
                      {step.eyebrow}
                    </p>
                    <h3 className="mb-2 text-xl font-bold text-on-surface">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                  </article>
                ))}
              </div>

              <div className="relative hidden min-h-[280px] rounded-2xl border border-[#454653]/20 bg-[#0c1324] p-4 lg:block lg:min-h-[430px]">
                {STORY_STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className={`story-visual-card story-visual-card-${index} absolute inset-4 rounded-2xl border border-[#454653]/20 bg-gradient-to-br from-[#151b2d] via-[#1a2340] to-[#0f172e] p-6 ${index === 0 ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-secondary">
                      Phase {index + 1}
                    </p>
                    <h4 className="mb-3 text-2xl font-extrabold text-on-surface">{step.eyebrow}</h4>
                    <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">
                      {step.title}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="h-16 rounded-xl bg-accent-primary/10" />
                      <div className="h-16 rounded-xl bg-accent-secondary/10" />
                      <div className="col-span-2 h-20 rounded-xl bg-[#23293c]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {}
        <section id="features" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-16 text-center lg:text-left">
            <h2 className="mb-4 text-3xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
              Built for meeting intelligence
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="feature-card group rounded-2xl bg-[#151b2d] p-8 transition-colors hover:bg-[#191f31]"
                >
                  <div className="mb-6 flex size-12 items-center justify-center rounded-lg bg-accent-primary/10">
                    <Icon size={20} className="text-accent-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-on-surface">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {}
        <section
          id="how-it-works"
          className="relative overflow-hidden bg-[#0c1324] py-20"
          ref={howItWorksRef}
        >
          <div className="absolute left-0 top-1/2 hidden h-px w-full bg-gradient-to-r from-transparent via-accent-primary/20 to-transparent lg:block" />
          <div className="mx-auto mb-20 max-w-7xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
              How It Works
            </h2>
          </div>
          <div className="flex w-[300%]">
            {}
            <div className="hiw-step flex w-screen items-center justify-center px-6">
              <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
                <div className="mb-8 flex size-16 items-center justify-center rounded-full border-4 border-[#0c1324] bg-[#23293c] shadow-xl">
                  <span className="font-mono text-xl font-bold text-accent-primary">01</span>
                </div>
                <div className="w-full rounded-2xl border border-[#454653]/10 bg-[#151b2d] p-6">
                  <h4 className="mb-2 text-lg font-bold text-on-surface">Record</h4>
                  <p className="text-sm text-on-surface-variant">
                    Start the recording via our web interface during your live meeting.
                  </p>
                </div>
              </div>
            </div>
            {}
            <div className="hiw-step flex w-screen items-center justify-center px-6">
              <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
                <div className="ai-glow mb-8 flex size-16 items-center justify-center rounded-full border-4 border-[#0c1324] bg-[#23293c] shadow-xl">
                  <span className="font-mono text-xl font-bold text-accent-secondary">02</span>
                </div>
                <div className="w-full rounded-2xl border border-[#454653]/10 bg-[#151b2d] p-6">
                  <h4 className="mb-2 text-lg font-bold text-on-surface">AI Processes</h4>
                  <p className="text-sm text-on-surface-variant">
                    Our custom model transcribes and identifies key entities in real-time with sub-70s
                    latency.
                  </p>
                </div>
              </div>
            </div>
            {}
            <div className="hiw-step flex w-screen items-center justify-center px-6">
              <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
                <div className="mb-8 flex size-16 items-center justify-center rounded-full border-4 border-[#0c1324] bg-[#23293c] shadow-xl">
                  <span className="font-mono text-xl font-bold text-accent-primary">03</span>
                </div>
                <div className="w-full rounded-2xl border border-[#454653]/10 bg-[#151b2d] p-6">
                  <h4 className="mb-2 text-lg font-bold text-on-surface">Get Insights</h4>
                  <p className="text-sm text-on-surface-variant">
                    Access structured summaries and action items on your dashboard or via email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        <section id="multiplayer" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1 relative h-80 w-full rounded-2xl border border-[#454653]/20 bg-[#151b2d] shadow-2xl p-6 overflow-hidden">
              <div className="h-6 w-1/3 rounded bg-accent-primary/20 mb-4" />
              <div className="h-4 w-full rounded bg-[#c6c5d5]/10 mb-2" />
              <div className="h-4 w-5/6 rounded bg-[#c6c5d5]/10 mb-2" />
              <div className="h-4 w-4/6 rounded bg-[#c6c5d5]/10" />
              
              {}
              <div className="fake-cursor-1 absolute top-1/3 left-1/4 flex flex-col items-center">
                <LuMousePointer2 className="text-accent-primary drop-shadow-md" size={24} fill="#818CF8" />
                <span className="mt-1 rounded bg-accent-primary px-2 py-0.5 text-[10px] font-bold text-white">Alex</span>
              </div>
              <div className="fake-cursor-2 absolute top-1/2 right-1/3 flex flex-col items-center">
                <LuMousePointer2 className="text-accent-secondary drop-shadow-md" size={24} fill="#A78BFA" />
                <span className="mt-1 rounded bg-accent-secondary px-2 py-0.5 text-[10px] font-bold text-white">Sam</span>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent-primary/10">
                <LuUsers className="text-accent-primary" size={24} />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
                Multiplayer by Design
              </h2>
              <p className="text-lg text-on-surface-variant leading-relaxed">
                Think together, instantly. Jump into generated meeting summaries with your team and refine them in real-time. See live cursors, co-edit action items, and align effortlessly using our Liveblocks integration.
              </p>
            </div>
          </div>
        </section>

        {}
        <section id="ecosystem" className="relative mx-auto max-w-7xl overflow-hidden px-6 py-20 text-center">
          <div className="mx-auto mb-16 max-w-2xl">
            <h2 className="mb-4 text-3xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
              Seamless Ecosystem Integrations
            </h2>
            <p className="text-lg text-on-surface-variant">
              EchoNote doesn't just summarize; it acts. Connect to your existing workflow and automate the busywork.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="ecosystem-item flex flex-col items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-[#151b2d] border border-[#454653]/20 shadow-xl">
                <LuWorkflow className="text-accent-primary" size={36} />
              </div>
              <span className="font-bold text-on-surface">Jira</span>
            </div>
            <div className="ecosystem-item hidden h-px w-16 bg-gradient-to-r from-accent-primary/50 to-transparent md:block" />
            <div className="ecosystem-item flex flex-col items-center gap-4">
              <div className="ai-glow flex size-24 items-center justify-center rounded-3xl bg-[#191f31] border border-accent-secondary/30 shadow-2xl shadow-accent-secondary/20">
                <Brain className="text-accent-secondary size-12 opacity-80" />
              </div>
              <span className="font-bold text-accent-secondary">EchoNote AI</span>
            </div>
            <div className="ecosystem-item hidden h-px w-16 bg-gradient-to-l from-accent-primary/50 to-transparent md:block" />
            <div className="ecosystem-item flex flex-col items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-[#151b2d] border border-[#454653]/20 shadow-xl">
                <Mail className="text-accent-primary" size={36} />
              </div>
              <span className="font-bold text-on-surface">Slack / Email</span>
            </div>
          </div>
        </section>

        {}
        <section id="workspaces" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent-secondary/10">
                <LuBoxes className="text-accent-secondary" size={24} />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
                Built for Teams
              </h2>
              <p className="text-lg text-on-surface-variant leading-relaxed">
                Dedicated spaces for every project. Isolate your meetings, invite your team, and organize knowledge with secure workspaces and built-in calendar integrations.
              </p>
            </div>
            <div className="relative h-80 w-full flex items-center justify-center">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`workspace-card absolute w-64 h-48 rounded-2xl border border-[#454653]/20 bg-[#151b2d] shadow-2xl p-6 flex flex-col justify-between z-[${4-i}]`}>
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-lg bg-gradient-to-br ${i === 2 ? 'from-accent-primary to-accent-secondary' : 'from-[#23293c] to-[#191f31]'}`} />
                    <div className="h-4 w-24 rounded bg-[#c6c5d5]/10" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-[#c6c5d5]/10" />
                    <div className="h-2 w-2/3 rounded bg-[#c6c5d5]/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {}
        <section id="use-cases" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
              Who is EchoNote for?
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="use-case-card rounded-2xl bg-[#151b2d] p-8 text-center border border-transparent hover:border-accent-primary/20 transition-colors">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#191f31]">
                <LuBriefcase className="text-accent-primary" size={28} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface">Product Managers</h3>
              <p className="text-sm text-on-surface-variant">
                Turn user interviews directly into Jira tickets and feature specs without lifting a finger.
              </p>
            </div>
            <div className="use-case-card rounded-2xl bg-[#151b2d] p-8 text-center border border-transparent hover:border-accent-primary/20 transition-colors">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#191f31]">
                <LuLineChart className="text-accent-primary" size={28} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface">Sales Teams</h3>
              <p className="text-sm text-on-surface-variant">
                Analyze client sentiment and automatically log action items into your CRM.
              </p>
            </div>
            <div className="use-case-card rounded-2xl bg-[#151b2d] p-8 text-center border border-transparent hover:border-accent-primary/20 transition-colors">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#191f31]">
                <LuCode className="text-accent-primary" size={28} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface">Engineering</h3>
              <p className="text-sm text-on-surface-variant">
                Keep standup notes and architecture decisions perfectly documented in your team workspace.
              </p>
            </div>
          </div>
        </section>

        {}
        <section id="cta" className="mx-auto max-w-5xl px-6 py-20">
          <div className="cta-card gradient-border-card px-8 py-20 text-center">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-6 text-3xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
                Ready to transform your meetings?
              </h2>
              <p className="mb-10 text-lg text-on-surface-variant">
                Join forward-thinking teams using EchoNote to capture clarity from chaos.
              </p>
              <button
                onClick={handleGetStarted}
                className="rounded-xl bg-gradient-to-br from-accent-primary to-primary-400 px-10 py-5 font-bold text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
                type="button"
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

      {}
      <Footer />
    </div>
  );
};

export default HomePage;

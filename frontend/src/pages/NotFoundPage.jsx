import { useNavigate, Link } from 'react-router-dom';
import { LuMic as Mic } from 'react-icons/lu';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#020617' }}>
      {}
      <nav className="w-full bg-[#2e3447]/40 backdrop-blur-3xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-accent-primary transition-opacity hover:opacity-80"
          >
            <Mic size={20} />
            <span className="text-xl font-bold tracking-tighter">EchoNote</span>
          </Link>
          <div className="hidden items-center gap-2 text-sm font-medium tracking-tight md:flex">
            <Link to="/dashboard" className="text-slate-400 transition-colors hover:text-slate-100">
              Dashboard
            </Link>
            <span className="text-slate-600">·</span>
            <Link to="/record" className="text-slate-400 transition-colors hover:text-slate-100">
              Record
            </Link>
            <span className="text-slate-600">·</span>
            <Link to="/meetings" className="text-slate-400 transition-colors hover:text-slate-100">
              Meetings
            </Link>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full border border-accent-primary/30 bg-accent-primary/20 text-accent-primary">
            <Mic size={14} />
          </div>
        </div>
      </nav>

      {}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
        {}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute left-1/4 top-1/4 size-64 rotate-45 border border-white/20"></div>
          <div className="absolute bottom-1/3 right-1/4 size-48 rotate-12 border border-white/15"></div>
          <div className="absolute left-1/2 top-1/2 size-32 -rotate-12 border border-white/10"></div>
        </div>

        {}
        <h1
          className="select-none text-[120px] font-extrabold leading-none tracking-tighter text-slate-700/50 md:text-[160px]"
          style={{ fontFamily: 'Plus Jakarta Sans' }}
        >
          404
        </h1>

        <h2 className="mb-3 mt-4 text-2xl font-bold text-white md:text-3xl">Page not found</h2>

        <p className="mb-10 max-w-md text-center text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {}
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="btn-cta inline-flex items-center rounded-btn px-6 py-3 text-sm font-bold transition-all hover:brightness-110"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost inline-flex items-center rounded-btn px-6 py-3 text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuMic as Mic, LuLock as Lock } from 'react-icons/lu';
import { useAuth } from '../contexts/AuthContext';
import LoginButton from '../components/auth/LoginButton';

/**
 * LoginPage — Google OAuth sign-in
 * Matches Stitch sign_in_echonote_fixed design
 */
const LoginPage = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: '#020617' }}
      >
        <div className="animate-pulse">
          <Mic size={48} className="text-accent-primary" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ backgroundColor: '#020617' }}
    >
      {/* Background gradient blob */}
      <div className="absolute bottom-0 left-0 size-[600px] -translate-x-1/3 translate-y-1/3 rounded-full bg-accent-primary/[0.08] blur-[128px]"></div>
      <div className="absolute right-0 top-0 size-[400px] -translate-y-1/4 translate-x-1/4 rounded-full bg-accent-secondary/[0.05] blur-[100px]"></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl border border-echo-border p-8 md:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-primary/15">
              <Mic size={28} className="text-accent-primary" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">Sign in to EchoNote</h2>
            <p className="text-center text-sm text-slate-400">Your meeting intelligence awaits</p>
          </div>

          {/* Google Login Button */}
          <div className="mb-6">
            <LoginButton size="lg" fullWidth />
          </div>

          {/* Terms */}
          <p className="mb-6 text-center text-xs text-slate-500">
            By continuing, you agree to our{' '}
            <span className="cursor-pointer text-accent-primary hover:underline">Terms</span> and{' '}
            <span className="cursor-pointer text-accent-primary hover:underline">
              Privacy Policy
            </span>
          </p>

          {/* Divider */}
          <div className="my-6 border-t border-echo-border"></div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Lock size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">
              Secured with Google OAuth
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import { Link, useLocation } from 'react-router-dom';
import { LuMic as Mic } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Header — Shared navigation bar for authenticated pages
 * Matches Stitch design: full-width, glass bg, text-only nav links with dot separators
 */
const Header = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/record', label: 'Record' },
    { path: '/meetings', label: 'Meetings' },
  ];

  return (
    <header className="w-full bg-[#2e3447]/40 shadow-2xl backdrop-blur-3xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link
          to="/dashboard"
          className="text-accent-primary flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Mic size={20} />
          <span className="text-xl font-bold tracking-tighter">EchoNote</span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden items-center gap-2 text-sm font-medium tracking-tight md:flex">
          {navLinks.map((link, index) => (
            <div key={link.path} className="flex items-center gap-2">
              {index > 0 && <span className="select-none text-slate-600">·</span>}
              <Link
                to={link.path}
                className={`transition-colors ${
                  isActive(link.path) ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {link.label}
              </Link>
            </div>
          ))}
        </nav>

        {/* User Avatar */}
        <div className="flex items-center">
          <Link to="/settings">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user?.name || 'User'}
                className="border-accent-primary/30 hover:border-accent-primary/60 size-8 cursor-pointer rounded-full border transition-colors"
              />
            ) : (
              <div className="bg-accent-primary/20 border-accent-primary/30 text-accent-primary hover:bg-accent-primary/30 flex size-8 cursor-pointer items-center justify-center rounded-full border transition-colors">
                <span className="text-xs font-semibold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

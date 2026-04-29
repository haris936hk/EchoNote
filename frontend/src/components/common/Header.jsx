import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { LuMic as Mic } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ navItems = [] }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState(location.pathname);

  useEffect(() => {
    setActiveItem(location.pathname);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path.startsWith('#')) {
      return location.hash === path;
    }
    if (path === '/dashboard') {
      return activeItem === '/dashboard';
    }
    return activeItem === path || activeItem.startsWith(path);
  };

  return (
    <header className="flex w-full justify-center px-4 py-6">
      <div className="flex h-14 items-center gap-6 rounded-full border border-white/10 bg-surface/40 px-6 shadow-[0_0_40px_rgba(189,194,255,0.08)] backdrop-blur-2xl">
        {}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-accent-primary transition-opacity hover:opacity-80"
          onClick={() => setActiveItem('/dashboard')}
        >
          <Mic size={18} className="text-accent-secondary" />
          <span className="text-base font-bold tracking-tighter">EchoNote</span>
        </Link>

        {}
        <div className="h-6 w-px bg-white/10" />

        {}
        <nav className="flex items-center gap-1">
          {navItems.map((link) => {
            const isHash = link.path.startsWith('#');
            const active = isActive(link.path);
            const classes = `relative rounded-full px-4 py-1.5 text-sm font-medium tracking-tight transition-colors duration-300 ${
              active ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`;

            return isHash ? (
              <a key={link.path} href={link.path} className={classes}>
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 z-0 rounded-full border border-white/5 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </a>
            ) : (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setActiveItem(link.path)}
                className={classes}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 z-0 rounded-full border border-white/5 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {}
        <div className="h-6 w-px bg-white/10" />

        {}
        <div className="flex items-center">
          {user ? (
            <Link to="/settings" onClick={() => setActiveItem('/settings')}>
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user?.name || 'User'}
                  className={`size-8 cursor-pointer rounded-full border transition-all duration-300 ${
                    activeItem === '/settings'
                      ? 'scale-110 border-accent-primary shadow-[0_0_12px_rgba(129,140,248,0.4)]'
                      : 'border-white/10 hover:border-accent-primary/40'
                  }`}
                />
              ) : (
                <div
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 ${
                    activeItem === '/settings'
                      ? 'border-accent-primary bg-accent-primary/30 text-white shadow-[0_0_12px_rgba(129,140,248,0.4)]'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-accent-primary/40'
                  }`}
                >
                  <span className="text-xs font-semibold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-cta px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all hover:brightness-110 active:scale-95"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
};

export default Header;

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMic, FiGrid, FiList, FiLogOut, FiSettings, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Header = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <header className="w-full px-4 pt-2 pb-0">
      {/* Centered wrapper */}
      <div className="max-w-6xl mx-auto flex justify-center">
        {/* Rounded container with subtle border */}
        <nav className="inline-flex items-center gap-6 px-6 py-2.5 rounded-full border border-gray-700/30 bg-gray-900/50 backdrop-blur-xl backdrop-saturate-150">
          {/* Brand */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-default-foreground hover:opacity-80 transition-opacity"
          >
            <FiMic size={20} />
            <span className="font-semibold text-sm">EchoNote</span>
          </Link>

          {/* Navigation Links */}
          <Link
            to="/dashboard"
            className={`text-sm font-medium transition-opacity flex items-center gap-2 ${
              isActive('/dashboard')
                ? 'text-default-foreground opacity-100'
                : 'text-default-400 hover:opacity-70'
            }`}
          >
            <FiGrid size={16} />
            Dashboard
          </Link>

          <Link
            to="/meetings"
            className={`text-sm font-medium transition-opacity flex items-center gap-2 ${
              isActive('/meetings')
                ? 'text-default-foreground opacity-100'
                : 'text-default-400 hover:opacity-70'
            }`}
          >
            <FiList size={16} />
            Meetings
          </Link>

          <Link
            to="/record"
            className={`text-sm font-medium transition-opacity flex items-center gap-2 ${
              isActive('/record')
                ? 'text-default-foreground opacity-100'
                : 'text-default-400 hover:opacity-70'
            }`}
          >
            <FiMic size={16} />
            Record
          </Link>

          {/* User section */}
          <div className="flex items-center gap-3 pl-2 border-l border-gray-700/30">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-xs text-default-400">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="text-default-400 hover:text-default-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>

            <Link
              to="/settings"
              className="text-default-400 hover:text-default-foreground transition-colors"
              aria-label="Settings"
            >
              <FiSettings size={18} />
            </Link>

            <button
              onClick={handleLogout}
              className="text-default-400 hover:text-red-400 transition-colors"
              aria-label="Logout"
            >
              <FiLogOut size={18} />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
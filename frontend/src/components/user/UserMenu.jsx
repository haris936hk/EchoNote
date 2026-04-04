import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Avatar,
} from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FiUser, FiSettings, FiMoon, FiSun, FiLogOut, FiRefreshCw } from 'react-icons/fi';

const UserMenu = () => {
  const { user, logout, refreshUserData } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Debug: Log user data to check if picture is available
  console.log('[UserMenu] User data:', user);
  console.log('[UserMenu] User picture URL:', user?.picture);

  if (!user) return null;

  const handleAction = (key) => {
    switch (key) {
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'theme':
        toggleTheme();
        break;
      case 'refresh':
        refreshUserData();
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <Dropdown placement="bottom-end" className="min-w-[240px]">
      <DropdownTrigger>
        <Avatar
          isBordered
          as="button"
          className="size-9 cursor-pointer transition-transform hover:scale-110"
          color="primary"
          src={user?.picture || ''}
          name={user?.name || 'User'}
          showFallback
          fallback={<FiUser size={18} className="text-primary" />}
        />
      </DropdownTrigger>

      <DropdownMenu
        aria-label="User menu actions"
        onAction={handleAction}
        variant="flat"
        itemClasses={{
          base: 'rounded-full px-4 py-2.5 transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white',
          selected: 'bg-accent-primary/20 text-accent-primary font-bold',
        }}
        classNames={{
          base: 'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] p-2',
        }}
      >
        {/* User Info Section */}
        <DropdownSection
          showDivider
          classNames={{
            divider: 'bg-white/5 mx-2 my-1',
            group: 'p-0',
          }}
        >
          <DropdownItem
            key="user-info"
            className="h-16 gap-2 rounded-2xl py-3 opacity-100"
            textValue={user.name}
            isReadOnly
          >
            <div className="flex flex-col gap-1">
              <p className="max-w-[200px] truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="max-w-[200px] truncate font-mono text-xs text-slate-400">
                {user.email}
              </p>
            </div>
          </DropdownItem>
        </DropdownSection>

        {/* Navigation Section */}
        <DropdownSection
          showDivider
          classNames={{
            divider: 'bg-white/5 mx-2 my-1',
            group: 'p-0',
          }}
        >
          <DropdownItem key="profile" startContent={<FiUser size={16} />}>
            Profile
          </DropdownItem>

          <DropdownItem key="settings" startContent={<FiSettings size={16} />}>
            Settings
          </DropdownItem>

          <DropdownItem
            key="theme"
            startContent={isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </DropdownItem>

          <DropdownItem key="refresh" startContent={<FiRefreshCw size={16} />}>
            Refresh Profile
          </DropdownItem>
        </DropdownSection>

        {/* Logout Section */}
        <DropdownSection
          classNames={{
            group: 'p-0',
          }}
        >
          <DropdownItem
            key="logout"
            color="danger"
            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
            startContent={<FiLogOut size={16} />}
          >
            Logout
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};

// Simple user menu without sections
export const SimpleUserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar isBordered as="button" size="sm" src={user.picture} name={user.name} />
      </DropdownTrigger>

      <DropdownMenu
        aria-label="User actions"
        itemClasses={{
          base: 'rounded-full px-4 py-2.5 transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white',
        }}
        classNames={{
          base: 'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] p-2',
        }}
      >
        <DropdownItem key="profile" className="h-14 rounded-2xl" textValue="Profile">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="font-mono text-xs text-slate-400">{user.email}</p>
        </DropdownItem>

        <DropdownItem key="settings" onPress={() => navigate('/settings')}>
          Settings
        </DropdownItem>

        <DropdownItem
          key="logout"
          color="danger"
          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
          onPress={logout}
        >
          Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

// User menu with badge (for notifications or status)
export const UserMenuWithBadge = ({ badgeContent }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="relative">
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Avatar isBordered as="button" size="sm" src={user.picture} name={user.name} />
        </DropdownTrigger>

        <DropdownMenu
          itemClasses={{
            base: 'rounded-full px-4 py-2.5 transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white',
          }}
          classNames={{
            base: 'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] p-2',
          }}
        >
          <DropdownItem key="profile" className="h-14 rounded-2xl">
            <p className="font-semibold text-white">{user.name}</p>
            <p className="font-mono text-xs text-slate-400">{user.email}</p>
          </DropdownItem>

          <DropdownItem onPress={() => navigate('/settings')}>Settings</DropdownItem>

          <DropdownItem
            color="danger"
            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
            onPress={logout}
          >
            Logout
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {/* Badge */}
      {badgeContent && (
        <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-danger text-xs font-medium text-white">
          {badgeContent}
        </span>
      )}
    </div>
  );
};

// Compact user button for mobile
export const MobileUserButton = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Dropdown placement="bottom">
      <DropdownTrigger>
        <button className="flex w-full items-center gap-2 rounded-full p-2 transition-colors hover:bg-white/5">
          <Avatar size="sm" src={user.picture} name={user.name} />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate font-mono text-xs text-slate-400">{user.email}</p>
          </div>
        </button>
      </DropdownTrigger>

      <DropdownMenu
        itemClasses={{
          base: 'rounded-full px-4 py-2.5 transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white',
        }}
        classNames={{
          base: 'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] p-2',
        }}
      >
        <DropdownItem onPress={() => navigate('/settings')}>Settings</DropdownItem>
        <DropdownItem
          color="danger"
          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
          onPress={logout}
        >
          Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

export default UserMenu;

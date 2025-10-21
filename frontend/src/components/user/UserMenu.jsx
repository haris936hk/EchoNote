import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Avatar,
  User
} from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  FiUser,
  FiSettings,
  FiMoon,
  FiSun,
  FiLogOut
} from 'react-icons/fi';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

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
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          isBordered
          as="button"
          className="transition-transform hover:scale-105"
          color="primary"
          size="sm"
          src={user.picture}
          name={user.name}
          showFallback
        />
      </DropdownTrigger>

      <DropdownMenu
        aria-label="User menu actions"
        onAction={handleAction}
        variant="flat"
      >
        {/* User Info Section */}
        <DropdownSection showDivider>
          <DropdownItem
            key="user-info"
            className="h-14 gap-2"
            textValue={user.name}
            isReadOnly
          >
            <User
              name={user.name}
              description={user.email}
              avatarProps={{
                src: user.picture,
                size: "sm"
              }}
            />
          </DropdownItem>
        </DropdownSection>

        {/* Navigation Section */}
        <DropdownSection showDivider>
          <DropdownItem
            key="profile"
            startContent={<FiUser size={16} />}
          >
            Profile
          </DropdownItem>

          <DropdownItem
            key="settings"
            startContent={<FiSettings size={16} />}
          >
            Settings
          </DropdownItem>

          <DropdownItem
            key="theme"
            startContent={isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </DropdownItem>
        </DropdownSection>

        {/* Logout Section */}
        <DropdownSection>
          <DropdownItem
            key="logout"
            color="danger"
            className="text-danger"
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
        <Avatar
          isBordered
          as="button"
          size="sm"
          src={user.picture}
          name={user.name}
        />
      </DropdownTrigger>

      <DropdownMenu aria-label="User actions">
        <DropdownItem 
          key="profile" 
          className="h-14"
          textValue="Profile"
        >
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-default-500">{user.email}</p>
        </DropdownItem>

        <DropdownItem
          key="settings"
          onPress={() => navigate('/settings')}
        >
          Settings
        </DropdownItem>

        <DropdownItem
          key="logout"
          color="danger"
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
          <Avatar
            isBordered
            as="button"
            size="sm"
            src={user.picture}
            name={user.name}
          />
        </DropdownTrigger>

        <DropdownMenu>
          <DropdownItem key="profile" className="h-14">
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-default-500">{user.email}</p>
          </DropdownItem>
          
          <DropdownItem onPress={() => navigate('/settings')}>
            Settings
          </DropdownItem>
          
          <DropdownItem color="danger" onPress={logout}>
            Logout
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {/* Badge */}
      {badgeContent && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white text-xs font-medium">
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
        <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-default-100 transition-colors w-full">
          <Avatar
            size="sm"
            src={user.picture}
            name={user.name}
          />
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-default-500 truncate">{user.email}</p>
          </div>
        </button>
      </DropdownTrigger>

      <DropdownMenu>
        <DropdownItem onPress={() => navigate('/settings')}>
          Settings
        </DropdownItem>
        <DropdownItem color="danger" onPress={logout}>
          Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

export default UserMenu;
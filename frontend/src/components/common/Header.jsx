import { 
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem, 
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Link as NextUILink
} from '@nextui-org/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { FiMic, FiSun, FiMoon, FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Header = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: FiMic },
    { label: 'Settings', path: '/settings', icon: FiSettings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <Navbar 
      maxWidth="full" 
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="border-b border-divider"
      isBordered
    >
      {/* Mobile Menu Toggle */}
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarMenuToggle aria-label={isMenuOpen ? "Close menu" : "Open menu"} />
      </NavbarContent>

      {/* Brand */}
      <NavbarContent className="sm:hidden pr-3" justify="center">
        <NavbarBrand>
          <Link to="/" className="flex items-center gap-2">
            <FiMic className="text-primary" size={24} />
            <p className="font-bold text-xl">EchoNote</p>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Brand */}
      <NavbarBrand className="hidden sm:flex">
        <Link to="/" className="flex items-center gap-2">
          <FiMic className="text-primary" size={28} />
          <p className="font-bold text-xl">EchoNote</p>
        </Link>
      </NavbarBrand>

      {/* Desktop Navigation */}
      <NavbarContent className="hidden sm:flex gap-6" justify="center">
        <NavbarItem isActive={isActive('/')}>
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${
              isActive('/') 
                ? 'text-primary' 
                : 'text-default-500 hover:text-default-900'
            }`}
          >
            Dashboard
          </Link>
        </NavbarItem>
        
        <NavbarItem isActive={isActive('/settings')}>
          <Link 
            to="/settings" 
            className={`text-sm font-medium transition-colors ${
              isActive('/settings') 
                ? 'text-primary' 
                : 'text-default-500 hover:text-default-900'
            }`}
          >
            Settings
          </Link>
        </NavbarItem>
      </NavbarContent>

      {/* Right Side Actions */}
      <NavbarContent justify="end">
        {/* Theme Toggle */}
        <NavbarItem>
          <Button
            isIconOnly
            variant="light"
            onPress={toggleTheme}
            aria-label="Toggle theme"
            className="text-default-500"
          >
            {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </Button>
        </NavbarItem>

        {/* User Dropdown */}
        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                className="transition-transform cursor-pointer"
                color="primary"
                size="sm"
                src={user?.picture}
                name={user?.name}
                showFallback
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu actions" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2" textValue="Profile">
                <p className="font-semibold">Signed in as</p>
                <p className="font-semibold text-default-500">{user?.email}</p>
              </DropdownItem>
              
              <DropdownItem 
                key="settings" 
                startContent={<FiSettings size={16} />}
                onPress={() => navigate('/settings')}
              >
                Settings
              </DropdownItem>
              
              <DropdownItem 
                key="logout" 
                color="danger" 
                startContent={<FiLogOut size={16} />}
                onPress={handleLogout}
              >
                Log Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.label}-${index}`}>
            <Link
              to={item.path}
              className={`w-full flex items-center gap-3 py-2 ${
                isActive(item.path) 
                  ? 'text-primary font-semibold' 
                  : 'text-default-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
        
        <NavbarMenuItem>
          <Button
            color="danger"
            variant="flat"
            onPress={handleLogout}
            startContent={<FiLogOut size={16} />}
            className="w-full"
          >
            Log Out
          </Button>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
};

export default Header;
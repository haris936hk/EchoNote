import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button } from '@nextui-org/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMic, FiGrid, FiList } from 'react-icons/fi';
import UserMenu from '../user/UserMenu';

/**
 * Main Layout Component
 * Wrapper for authenticated pages with navigation
 */
const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current path is active
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <Navbar isBordered maxWidth="full" className="bg-content1">
        <NavbarBrand>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-2">
              <FiMic className="text-white" size={20} />
            </div>
            <p className="font-bold text-xl">EchoNote</p>
          </Link>
        </NavbarBrand>

        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem isActive={isActive('/dashboard')}>
            <Button
              as={Link}
              to="/dashboard"
              variant={isActive('/dashboard') ? 'flat' : 'light'}
              color={isActive('/dashboard') ? 'primary' : 'default'}
              startContent={<FiGrid size={18} />}
            >
              Dashboard
            </Button>
          </NavbarItem>

          <NavbarItem isActive={isActive('/meetings')}>
            <Button
              as={Link}
              to="/meetings"
              variant={isActive('/meetings') ? 'flat' : 'light'}
              color={isActive('/meetings') ? 'primary' : 'default'}
              startContent={<FiList size={18} />}
            >
              Meetings
            </Button>
          </NavbarItem>

          <NavbarItem isActive={isActive('/record')}>
            <Button
              as={Link}
              to="/record"
              variant={isActive('/record') ? 'solid' : 'bordered'}
              color="primary"
              startContent={<FiMic size={18} />}
            >
              Record
            </Button>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent justify="end">
          <NavbarItem>
            <UserMenu />
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;

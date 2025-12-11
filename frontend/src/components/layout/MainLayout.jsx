import { useState, useEffect } from 'react';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button } from '@heroui/react';
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
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Check if current path is active
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  // Handle scroll to show/hide navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNavbar(false);
      } else if (currentScrollY < lastScrollY) {
        setShowNavbar(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar - Fades on scroll */}
      <div
        className={`sticky top-0 z-50 ${
          showNavbar
            ? 'translate-y-0 opacity-100'
            : '-translate-y-1 opacity-0 pointer-events-none'
        }`}
        style={{
          willChange: 'transform, opacity',
          transition: 'opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        <Navbar
          isBordered
          isBlurred
          maxWidth="full"
          className="bg-content1/95 backdrop-blur-md backdrop-saturate-150 h-20 md:h-24"
          classNames={{
            wrapper: "h-20 md:h-24 py-4 md:py-6"
          }}
        >
        <NavbarBrand>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-2">
              <FiMic className="text-white" size={20} />
            </div>
            <p className="font-bold text-xl">EchoNote</p>
          </Link>
        </NavbarBrand>

        <NavbarContent className="hidden sm:flex gap-8 md:gap-12 lg:gap-16 max-w-2xl lg:max-w-3xl" justify="center">
          <NavbarItem isActive={isActive('/dashboard')}>
            <Button
              as={Link}
              to="/dashboard"
              variant={isActive('/dashboard') ? 'flat' : 'light'}
              color={isActive('/dashboard') ? 'primary' : 'default'}
              startContent={<FiGrid size={18} />}
              radius="full"
              className="font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
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
              radius="full"
              className="font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
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
              radius="full"
              className="font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
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
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;

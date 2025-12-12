import { useState, useEffect, createContext, useContext } from 'react';
import Header from '../common/Header';

// Create context to share scroll state with child components
export const ScrollContext = createContext({
  showNavbar: true,
  isScrollingDown: false
});

export const useScrollContext = () => useContext(ScrollContext);

/**
 * Main Layout Component
 * Wrapper for authenticated pages with navigation
 */
const MainLayout = ({ children }) => {
  const [showNavbar, setShowNavbar] = useState(true);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll to show/hide navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowNavbar(true);
        setIsScrollingDown(false);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNavbar(false);
        setIsScrollingDown(true);
      } else if (currentScrollY < lastScrollY) {
        setShowNavbar(true);
        setIsScrollingDown(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <ScrollContext.Provider value={{ showNavbar, isScrollingDown }}>
      <div className="min-h-screen bg-background">
        {/* Navigation Bar - Slides on scroll */}
        <div
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
            showNavbar
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <Header />
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 max-w-7xl pt-[80px]">
          {children}
        </main>
      </div>
    </ScrollContext.Provider>
  );
};

export default MainLayout;

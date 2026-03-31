import { useState, useEffect, createContext, useContext } from 'react';
import Header from '../common/Header';

// Scroll state context shared with child components
export const ScrollContext = createContext({
  showNavbar: true,
  isScrollingDown: false,
});

export const useScrollContext = () => useContext(ScrollContext);

/**
 * MainLayout — Wrapper for authenticated pages
 * OLED dark background, scroll-hide navbar, no footer
 */
const MainLayout = ({ children }) => {
  const [showNavbar, setShowNavbar] = useState(true);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

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
      <div className="min-h-screen" style={{ backgroundColor: '#020617' }}>
        {/* Navigation Bar — Slides on scroll */}
        <div
          className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-in-out ${
            showNavbar
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-full opacity-0'
          }`}
        >
          <Header />
        </div>

        {/* Main Content */}
        <main className="container mx-auto max-w-7xl px-4 pt-[72px]">{children}</main>
      </div>
    </ScrollContext.Provider>
  );
};

export default MainLayout;

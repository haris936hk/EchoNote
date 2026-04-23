import { createContext } from 'react';
import Header from '../common/Header';
import ScrollReveal from '../common/ScrollReveal';

export const ScrollContext = createContext({
  showNavbar: true,
});


const MainLayout = ({ children }) => {
  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/workspaces', label: 'Workspaces' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/record', label: 'Record' },
    { path: '/meetings', label: 'Meetings' },
    { path: '/tasks', label: 'Tasks' },
    { path: '/decisions', label: 'Decisions' },
    { path: '/analytics', label: 'Insights' },
    { path: '/speaker-coach', label: 'Coach' },
  ];

  return (
    <ScrollContext.Provider value={{ showNavbar: true }}>
      <div className="min-h-screen" style={{ backgroundColor: '#020617' }}>
        {/* Navigation Bar — Reveal on scroll up */}
        <ScrollReveal>
          <Header navItems={navLinks} />
        </ScrollReveal>

        {/* Main Content */}
        <main className="container mx-auto max-w-7xl px-4 pt-[100px]">{children}</main>
      </div>
    </ScrollContext.Provider>
  );
};

export default MainLayout;

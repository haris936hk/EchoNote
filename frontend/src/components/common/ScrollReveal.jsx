import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ScrollReveal — A wrapper component that handles scroll-hide and scroll-reveal
 * using Framer Motion for premium 'slide-down' and 'slide-up' effects.
 */
const ScrollReveal = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Threshold for reveal/hide
      const scrollThreshold = 5;

      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - scrollThreshold) {
        // Scrolling up - reveal (with 5px buffer)
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for a 'snappier' Linear-feel
          }}
          className="fixed top-0 inset-x-0 z-50 pointer-events-none"
        >
          <div className="pointer-events-auto">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollReveal;

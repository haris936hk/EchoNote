import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * ScrollReveal — A wrapper component that handles scroll-hide and scroll-reveal
 * using Framer Motion for premium 'slide-down' and 'slide-up' effects.
 */
const ScrollReveal = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;

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

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          className="pointer-events-none fixed inset-x-0 top-0 z-50"
        >
          <div className="pointer-events-auto">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

ScrollReveal.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ScrollReveal;

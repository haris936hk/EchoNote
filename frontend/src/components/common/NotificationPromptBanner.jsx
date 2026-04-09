// frontend/src/components/common/NotificationPromptBanner.jsx
import React, { useState, useEffect } from 'react';
import { LuBell, LuX, LuSparkles } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import notificationService from '../../services/notification.service';
import { colors } from '../../styles/theme';

const NotificationPromptBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      // Don't show if user dismissed it recently
      const dismissed = localStorage.getItem('push_prompt_dismissed');
      if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        const now = Date.now();
        // Show again after 3 days
        if (now - dismissedAt < 3 * 24 * 60 * 60 * 1000) return;
      }

      const status = await notificationService.getPushStatus();
      if (status.supported && status.permission === 'default') {
        setIsVisible(true);
      }
    };

    // Small delay before showing
    const timer = setTimeout(checkStatus, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await notificationService.subscribeUser();
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Failed to enable push:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('push_prompt_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -20, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 pointer-events-none"
      >
        <div 
          className="pointer-events-auto relative flex items-center gap-5 p-5 rounded-[20px] bg-[#0c1324]/80 backdrop-blur-xl ring-1 ring-white/[0.06] overflow-hidden"
          style={{ 
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 80px -20px rgba(129, 140, 248, 0.15)',
          }}
        >
          {/* Accent Glow backdrop */}
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-indigo-500/10 to-transparent blur-2xl -translate-x-1/2" />

          {/* Icon Shield (FollowUpModal Style) */}
          <div className="relative flex-none">
            <div className="flex size-14 items-center justify-center rounded-[14px] bg-[#151b2d] shadow-inner ring-1 ring-white/[0.06]">
              <LuBell className="text-[#818cf8]" size={26} />
            </div>
            {/* AI Living Indicator pulsing dot */}
            <div className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 animate-pulse rounded-full bg-[#a78bfa] shadow-[0_0_12px_4px_rgba(167,139,250,0.3)]" />
          </div>
          
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <LuSparkles className="text-[#a78bfa] size-3" />
              <h4 className="font-['Plus_Jakarta_Sans'] text-[15px] font-bold tracking-tight text-[#f8fafc]">
                Stay in the loop
              </h4>
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-[13px] text-[#94a3b8] leading-relaxed">
              Real-time alerts for your AI meeting analysis.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
             <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full text-[#64748b] transition-all hover:bg-white/5 hover:text-[#94a3b8]"
            >
              <LuX size={16} />
            </button>

            <button
              onClick={handleEnable}
              disabled={isSubscribing}
              className="group relative flex h-10 items-center gap-2.5 rounded-[12px] bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] px-5 font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold text-[#020617] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_-6px_rgba(129,140,248,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_28px_-6px_rgba(129,140,248,0.5)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubscribing ? (
                <div className="size-4 animate-spin rounded-full border-2 border-[#020617] border-t-transparent" />
              ) : (
                <span>Enable</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPromptBanner;

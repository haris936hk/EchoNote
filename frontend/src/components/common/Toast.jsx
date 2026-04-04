import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  LuCheckCircle as CheckCircle,
  LuXCircle as XCircle,
  LuInfo as Info,
  LuX as X,
} from 'react-icons/lu';

const Toast = ({ message, type = 'success', duration = 5000, onClose }) => {
  const [visible, setVisible] = useState(false);

  // Trigger enter animation on mount
  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(enter);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const variants = {
    success: {
      icon: <CheckCircle size={18} className="shrink-0 text-[#34D399]" />,
      bar: 'bg-[#34D399]',
      border: 'border-[#34D399]/20',
      bg: 'bg-[#34D399]/[0.06]',
    },
    error: {
      icon: <XCircle size={18} className="shrink-0 text-[#F87171]" />,
      bar: 'bg-[#F87171]',
      border: 'border-[#F87171]/20',
      bg: 'bg-[#F87171]/[0.06]',
    },
    info: {
      icon: <Info size={18} className="shrink-0 text-accent-primary" />,
      bar: 'bg-accent-primary',
      border: 'border-accent-primary/20',
      bg: 'bg-accent-primary/[0.06]',
    },
  };

  const v = variants[type] ?? variants.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden',
        'rounded-xl border backdrop-blur-xl',
        'px-4 py-3 shadow-2xl',
        'transition-all duration-300 ease-out',
        v.border,
        v.bg,
        // Use bg-echo-elevated as base surface
        'bg-echo-elevated/90',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
      ].join(' ')}
    >
      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-[12px] ${v.bar}`} />

      {/* Icon */}
      <div className="mt-0.5 pl-2">{v.icon}</div>

      {/* Message */}
      <span className="flex-1 text-sm font-medium leading-snug text-white/90">{message}</span>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        className="mt-0.5 shrink-0 rounded-md p-1 text-white/40 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white/80"
      >
        <X size={14} />
      </button>
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info']),
  duration: PropTypes.number,
  onClose: PropTypes.func,
};

// ─── Toast Container ──────────────────────────────────────────────────────────
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed right-5 top-5 z-[200] flex flex-col gap-2.5"
      style={{ width: '360px' }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      message: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['success', 'error', 'info']),
      duration: PropTypes.number,
    })
  ).isRequired,
  removeToast: PropTypes.func.isRequired,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
let toastId = 0;
let listeners = [];

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      setToasts((prev) => [...prev, toast]);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, removeToast };
};

// ─── Global showToast ─────────────────────────────────────────────────────────
export const showToast = (message, type = 'success', duration = 5000) => {
  const toast = { id: ++toastId, message, type, duration };
  listeners.forEach((listener) => listener(toast));
};

export default Toast;

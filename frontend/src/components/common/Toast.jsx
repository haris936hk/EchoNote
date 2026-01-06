// frontend/src/components/common/Toast.jsx
// Simple toast notification component

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from 'react-icons/fi';

const Toast = ({ message, type = 'success', duration = 5000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300); // Wait for fade animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <FiCheckCircle className="text-success" size={20} />,
        error: <FiXCircle className="text-danger" size={20} />,
        info: <FiInfo className="text-primary" size={20} />
    };

    const bgColors = {
        success: 'bg-success/10 border-success/30',
        error: 'bg-danger/10 border-danger/30',
        info: 'bg-primary/10 border-primary/30'
    };

    return (
        <div
            className={`
        fixed bottom-6 right-6 z-[100]
        flex items-center gap-3 px-4 py-3
        rounded-xl border backdrop-blur-md shadow-xl
        transition-all duration-300
        ${bgColors[type]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
        >
            {icons[type]}
            <span className="text-sm font-medium">{message}</span>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose?.(), 300);
                }}
                className="ml-2 p-1 hover:bg-default-200 rounded-full transition-colors"
            >
                <FiX size={14} />
            </button>
        </div>
    );
};

// Toast container to manage multiple toasts
export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
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

// Hook to use toast notifications
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

// Global toast function
export const showToast = (message, type = 'success', duration = 5000) => {
    const toast = { id: ++toastId, message, type, duration };
    listeners.forEach((listener) => listener(toast));
};

export default Toast;

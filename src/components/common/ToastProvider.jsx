import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((toast) => {
    const id = ++idCounter;
    const duration = toast.duration ?? 9000;

    setToasts((prev) => [
      ...prev,
      {
        id,
        type: toast.type || 'success',
        title: toast.title || '',
        message: toast.message || '',
      },
    ]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-4 w-full max-w-lg px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`relative rounded-2xl border px-5 py-4 shadow-2xl bg-white text-[#1b1b1b] text-base flex items-start gap-3 ${
              toast.type === 'error'
                ? 'border-red-200'
                : toast.type === 'warning'
                  ? 'border-amber-200'
                  : 'border-emerald-200'
            }`}
            >
            <span
              className={`material-symbols-outlined text-2xl mt-0.5 ${
                toast.type === 'error'
                  ? 'text-red-500'
                  : toast.type === 'warning'
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              }`}
            >
              {toast.type === 'error'
                ? 'error'
                : toast.type === 'warning'
                  ? 'warning'
                  : 'check_circle'}
            </span>
            <div className="flex-1">
              {toast.title && <p className="font-semibold mb-1 text-sm sm:text-base">{toast.title}</p>}
              {toast.message && <p className="text-xs sm:text-sm leading-snug">{toast.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-slate-400 hover:text-[#1b1b1b] transition-colors"
              aria-label="Close notification"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};


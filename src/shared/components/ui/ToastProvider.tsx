'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          const typeIcons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
            info: <Info className="w-5 h-5 text-blue-500 shrink-0" />
          };

          const typeStyles = {
            success: 'border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900',
            error: 'border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900',
            warning: 'border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900',
            info: 'border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900'
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-xl border shadow-lg max-w-sm w-full transition-all animate-in slide-in-from-bottom-3 duration-200 ${typeStyles[toast.type]}`}
            >
              {typeIcons[toast.type]}
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: (t: Omit<ToastItem, 'id'>) => console.log('Toast:', t),
      removeToast: (id: string) => {}
    };
  }
  return context;
};

import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { subscribeToasts, dismissToast, ToastItem } from '../lib/toast';

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-medium flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

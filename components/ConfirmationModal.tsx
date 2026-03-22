
import React from 'react';
import { useApp } from '../AppContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel,
  variant = 'primary'
}) => {
  const { settings, t } = useApp();
  const isDark = settings.themeMode === 'dark';

  if (!isOpen) return null;

  const confirmBg = variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-violet-600 hover:bg-violet-700';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in">
      <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'} rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border p-8 text-center`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${variant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-600'}`}>
          <i className={`fas ${variant === 'danger' ? 'fa-trash-alt' : 'fa-exclamation-triangle'} text-xl`}></i>
        </div>
        
        <h3 className={`text-xl font-black mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
        <p className={`text-sm mb-8 font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className={`w-full text-white py-4 rounded-2xl font-black text-base shadow-xl transition-all active:scale-95 ${confirmBg}`}
          >
            {confirmLabel || t('confirm')}
          </button>
          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

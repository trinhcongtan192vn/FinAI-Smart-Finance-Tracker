
import React, { useState } from 'react';
import { ChevronLeft, KeyRound, AlertCircle, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';

interface ResetPasswordViewProps {
  onBack: () => void;
  emailInitial: string;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onBack, emailInitial }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(emailInitial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('login.email_label') + " required");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError(t('login.auth_error.user_not_found'));
      } else {
        setError(t('login.auth_error.general'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
        <div className="flex flex-col items-center text-center gap-4 py-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 ring-8 ring-emerald-50">
            <CheckCircle2 size={32} />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-900">{t('login.reset_email_sent')}</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">{t('login.back_to_login')}...</p>
            </div>
            <button 
                type="button" 
                onClick={onBack} 
                className="mt-4 px-6 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all"
            >
                {t('login.back_to_login')}
            </button>
        </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
        <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
            <button 
                type="button" 
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
                <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-bold text-slate-900">{t('login.reset_password')}</h2>
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                <KeyRound size={20} />
            </div>
            <p className="text-xs font-medium text-indigo-900 leading-relaxed py-0.5">
                {t('login.reset_instructions')}
            </p>
            </div>
            
            {error && (
            <div className="p-3 bg-red-50 rounded-xl flex items-start gap-2 text-red-600 text-xs font-medium animate-pulse">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
            )}

            <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">{t('login.email_label')}</label>
            <div className="relative">
                <input 
                type="email" 
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all outline-none text-slate-900 font-semibold"
                placeholder="hello@example.com"
                />
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            </div>

            <button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : t('login.send_reset_link')}
            </button>
        </form>
    </div>
  );
};

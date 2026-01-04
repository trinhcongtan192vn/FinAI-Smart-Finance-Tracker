
import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoginViewProps {
  isLogin: boolean;
  setIsLogin: (val: boolean) => void;
  onForgotPassword: () => void;
  onGoogleSignIn: () => void;
  onSubmit: (email: string, pass: string) => Promise<void>;
  error: string | null;
  setError: (err: string | null) => void;
  isLoading: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  isLogin, setIsLogin, onForgotPassword, onGoogleSignIn, onSubmit, error, setError, isLoading
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
        <h2 className="text-xl font-bold text-slate-900 mb-6">
        {isLogin ? t('login.welcome_back') : t('login.create_account')}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
            <div className="p-3 bg-red-50 rounded-xl flex items-start gap-2 text-red-600 text-xs font-medium animate-pulse">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
            </div>
        )}

        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">{t('login.email_label')}</label>
            <input 
            type="email" 
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all outline-none text-slate-900 font-semibold"
            placeholder="hello@example.com"
            />
        </div>

        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('login.password_label')}</label>
            {isLogin && (
                <button 
                type="button"
                onClick={onForgotPassword}
                className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide hover:underline"
                >
                {t('login.forgot_password')}
                </button>
            )}
            </div>
            <div className="relative">
            <input 
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className="w-full p-4 pr-12 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all outline-none text-slate-900 font-semibold"
                placeholder="••••••••"
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            </div>
        </div>

        <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group uppercase tracking-widest"
        >
            {isLoading && !error ? (
            <Loader2 size={20} className="animate-spin" />
            ) : (
            <>
                {isLogin ? t('login.sign_in') : t('login.sign_up')}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </>
            )}
        </button>
        </form>

        <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-100"></div>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('login.or')}</span>
        <div className="h-px flex-1 bg-slate-100"></div>
        </div>

        <button 
        type="button"
        onClick={onGoogleSignIn}
        disabled={isLoading}
        className="w-full h-14 bg-white border-2 border-slate-50 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-[0.98] group"
        >
        {isLoading && !error ? (
            <Loader2 size={20} className="animate-spin text-slate-400" />
        ) : (
            <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-bold text-slate-700">{t('login.continue_google')}</span>
            </>
        )}
        </button>

        <div className="mt-6 flex items-center justify-center">
        <button 
            type="button"
            onClick={toggleMode}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wide"
        >
            {isLogin ? t('login.dont_have_account') : t('login.already_have_account')}
        </button>
        </div>
    </div>
  );
};

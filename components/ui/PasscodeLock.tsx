
import React, { useState, useEffect } from 'react';
import { Lock, Delete, Loader2, AlertCircle, LogOut, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PasscodeLockProps {
  savedPasscode: string;
  onSuccess: () => void;
  onLogout: () => void;
  displayName: string;
}

export const PasscodeLock: React.FC<PasscodeLockProps> = ({ 
  savedPasscode, 
  onSuccess, 
  onLogout, 
  displayName
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState<string>('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  
  // State for Forgot Password flow
  const [showForgotView, setShowForgotView] = useState(false);

  // Handle Verify Input (Manual Passcode)
  useEffect(() => {
    if (input.length === 4) {
      handleVerify();
    }
  }, [input]);

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      if (input === savedPasscode) {
        onSuccess();
      } else {
        // Handle Error
        setError(true);
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 5) {
            // Lock for 1 minute
            setLockedUntil(Date.now() + 60000);
        }

        setTimeout(() => {
          setError(false);
          setInput('');
          setIsVerifying(false);
        }, 500);
      }
    }, 200);
  };

  const handleNumberClick = (num: string) => {
    if (input.length < 4 && !isVerifying && !lockedUntil) {
      setInput(prev => prev + num);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const handleDelete = () => {
    if (input.length > 0 && !isVerifying && !lockedUntil) {
      setInput(prev => prev.slice(0, -1));
    }
  };

  // Render lockout screen
  if (lockedUntil) {
      const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (secondsLeft <= 0) {
          setLockedUntil(null);
          setAttempts(0);
      } else {
          // Force re-render every second
          setTimeout(() => setLockedUntil(prev => prev), 1000);
          return (
              <div className="fixed inset-0 z-[2000] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <AlertCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Tạm khóa</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8">
                      Bạn đã nhập sai quá 5 lần.<br/>Vui lòng thử lại sau <span className="text-red-600 font-bold">{secondsLeft}s</span>.
                  </p>
                  <button onClick={onLogout} className="text-indigo-600 font-bold text-sm uppercase tracking-wider">
                      Đăng nhập lại
                  </button>
              </div>
          );
      }
  }

  // Render Forgot / Reset View
  if (showForgotView) {
      return (
        <div className="fixed inset-0 z-[2000] bg-slate-50 flex flex-col items-center justify-center p-8 animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                <RotateCcw size={36} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 text-center">Quên mã khóa?</h3>
            <p className="text-sm text-slate-500 font-medium text-center leading-relaxed mb-8 max-w-xs">
                Để bảo vệ dữ liệu tài chính, bạn cần <strong>đăng xuất và đăng nhập lại</strong> bằng tài khoản Google/Email để đặt lại mã mới.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                    onClick={onLogout}
                    className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                >
                    <LogOut size={18} /> Đăng nhập lại
                </button>
                <button 
                    onClick={() => setShowForgotView(false)}
                    className="w-full h-14 bg-white text-slate-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
                >
                    Quay lại
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-50 flex flex-col items-center justify-center px-6 py-10 animate-in fade-in duration-300">
      <div className="w-full max-w-sm flex flex-col items-center h-full justify-between">
        
        {/* Header Section */}
        <div className="flex flex-col items-center gap-6 mt-8">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-300 ${error ? 'bg-rose-500 text-white translate-x-2' : 'bg-indigo-600 text-white'}`}>
            {isVerifying ? <Loader2 className="animate-spin" size={28} /> : <Lock size={28} />}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('settings.security_lock')}</h2>
            <p className="text-sm font-bold text-slate-400 mt-1">{t('settings.lock_subtitle', { name: displayName })}</p>
          </div>
        </div>

        {/* DOTS Indicator */}
        <div className="flex items-center gap-6 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                error 
                  ? 'bg-rose-500 scale-110' 
                  : input.length > i 
                    ? 'bg-indigo-600 scale-110' 
                    : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Big Numpad */}
        <div className="w-full max-w-[280px]">
            <div className="grid grid-cols-3 gap-x-6 gap-y-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                key={num}
                onClick={() => handleNumberClick(num)}
                className="w-16 h-16 rounded-full bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center text-2xl font-black text-slate-800 active:bg-slate-50 active:scale-95 transition-all mx-auto select-none"
                >
                {num}
                </button>
            ))}
            
            {/* Bottom Row: Empty - 0 - Delete */}
            <div className="w-16 h-16 flex items-center justify-center mx-auto">
                {/* Empty spot */}
            </div>

            <button 
                onClick={() => handleNumberClick('0')}
                className="w-16 h-16 rounded-full bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center text-2xl font-black text-slate-800 active:bg-slate-50 active:scale-95 transition-all mx-auto select-none"
            >
                0
            </button>
            
            <button 
                onClick={handleDelete}
                className="w-16 h-16 flex items-center justify-center text-slate-400 active:text-slate-600 active:scale-90 transition-all mx-auto"
            >
                <Delete size={24} />
            </button>
            </div>
        </div>

        {/* Forgot / Logout */}
        <button 
            onClick={() => setShowForgotView(true)}
            className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors mt-4 py-4"
        >
            {t('settings.forgot_passcode_msg').replace('Log out', '')} ?
        </button>
      </div>
    </div>
  );
};

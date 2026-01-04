
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, X } from 'lucide-react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';

interface SecurityModalProps {
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Check if user is using password provider
  const isPasswordUser = auth.currentUser?.providerData.some(p => p.providerId === 'password');

  const handleChangePassword = async () => {
    if (!auth.currentUser || !isPasswordUser) return;
    if (newPassword !== confirmPassword) {
      alert(t('settings.password_mismatch'));
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setIsChangingPass(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update Password
      await updatePassword(auth.currentUser, newPassword);
      
      setToastMessage(t('settings.password_changed'));
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 2000);
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Password update error", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        alert("Incorrect current password.");
      } else {
        alert("Failed to update password: " + error.message);
      }
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-2 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                 <Lock size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-slate-900">{t('settings.change_password')}</h3>
                  <p className="text-sm font-medium text-slate-400">Security Check</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
             <X size={24} />
           </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
            {isPasswordUser ? (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('settings.current_password')}</label>
                    <div className="relative">
                    <input 
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        className="w-full px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-indigo-200 focus:bg-white text-sm font-bold outline-none transition-all" 
                        placeholder="••••••••" 
                    />
                    <button onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('settings.new_password')}</label>
                    <div className="relative">
                    <input 
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="w-full px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-indigo-200 focus:bg-white text-sm font-bold outline-none transition-all" 
                        placeholder="New password" 
                    />
                    <button onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('settings.confirm_password')}</label>
                    <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-indigo-200 focus:bg-white text-sm font-bold outline-none transition-all" 
                    placeholder="Confirm new password" 
                    />
                </div>
            </div>
            ) : (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Lock size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-indigo-900 leading-relaxed">
                {t('settings.google_account_msg')}
                </p>
            </div>
            )}
        </div>

        <div className="p-6 pt-0">
             <button 
                onClick={handleChangePassword}
                disabled={!isPasswordUser || isChangingPass || !currentPassword || !newPassword || !confirmPassword}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
             >
                {isChangingPass ? <Loader2 size={18} className="animate-spin" /> : null}
                {t('settings.change_password')}
             </button>
        </div>

        {/* Toast Notification */}
        {showToast && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-[110]">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <span className="text-sm font-bold">{toastMessage}</span>
            </div>
        )}
      </div>
    </div>
  );
};

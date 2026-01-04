
import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, Key, ShieldAlert } from 'lucide-react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { useTranslation } from 'react-i18next';

export const SecurityTab: React.FC = () => {
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

  // Passcode State
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isSettingPasscode, setIsSettingPasscode] = useState(false);
  const [passcodeLoading, setPasscodeLoading] = useState(false);

  // Check if user is using password provider
  const isPasswordUser = auth.currentUser?.providerData.some(p => p.providerId === 'password');

  useEffect(() => {
    const fetchSecurity = async () => {
      if (!auth.currentUser) return;
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setPasscodeEnabled(data.passcodeEnabled === true);
      }
    };
    fetchSecurity();
  }, []);

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
      setTimeout(() => setShowToast(false), 3000);
      
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

  const handleTogglePasscode = async () => {
     if (!auth.currentUser) return;
     
     if (passcodeEnabled) {
        // Disable
        if (confirm(t('settings.confirm_disable_passcode'))) {
           setPasscodeLoading(true);
           try {
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                 passcodeEnabled: false,
                 passcode: null
              });
              setPasscodeEnabled(false);
              setPasscode('');
              setConfirmPasscode('');
           } catch(e) { console.error(e); }
           finally { setPasscodeLoading(false); }
        }
     } else {
        setIsSettingPasscode(true);
     }
  };

  const handleSavePasscode = async () => {
    if (passcode.length !== 4) return;
    if (passcode !== confirmPasscode) {
        alert(t('settings.passcode_mismatch'));
        return;
    }

    setPasscodeLoading(true);
    try {
        if (!auth.currentUser) return;
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            passcodeEnabled: true,
            passcode: passcode
        });
        setPasscodeEnabled(true);
        setIsSettingPasscode(false);
        setToastMessage(t('settings.passcode_set_success'));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    } catch(e) {
        console.error(e);
        alert("Failed to save passcode.");
    } finally {
        setPasscodeLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 relative pb-10">
      
      {/* Passcode Section */}
      <div className="flex flex-col gap-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
          <ShieldCheck size={10} /> {t('settings.passcode_security')}
        </label>

        <div className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${passcodeEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Key size={20} />
                 </div>
                 <div>
                    <p className="text-xs font-black text-slate-900">{t('settings.passcode_lock')}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{passcodeEnabled ? t('settings.lock_active') : t('settings.lock_inactive')}</p>
                 </div>
              </div>
              <button 
                onClick={handleTogglePasscode}
                disabled={passcodeLoading}
                className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-1 ${passcodeEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}
              >
                 <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
              </button>
           </div>

           {isSettingPasscode && !passcodeEnabled && (
              <div className="mt-6 space-y-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                 <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-2">{t('settings.enter_4_digit')}</p>
                    <div className="flex justify-center gap-3">
                       <input 
                         type="password" 
                         maxLength={4} 
                         pattern="\d*"
                         inputMode="numeric"
                         value={passcode} 
                         onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                         className="w-32 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-black tracking-[0.5em] outline-none focus:border-indigo-200"
                         placeholder="••••"
                       />
                    </div>
                 </div>
                 {passcode.length === 4 && (
                    <div className="flex flex-col gap-2 animate-in fade-in">
                       <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-2">{t('settings.confirm_digit')}</p>
                       <div className="flex justify-center gap-3">
                          <input 
                            type="password" 
                            maxLength={4} 
                            pattern="\d*"
                            inputMode="numeric"
                            value={confirmPasscode} 
                            onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
                            className="w-32 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-black tracking-[0.5em] outline-none focus:border-indigo-200"
                            placeholder="••••"
                          />
                       </div>
                    </div>
                 )}
                 <div className="flex gap-2">
                    <button 
                       onClick={handleSavePasscode}
                       disabled={passcode.length !== 4 || passcode !== confirmPasscode || passcodeLoading}
                       className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                       {passcodeLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : t('common.confirm')}
                    </button>
                    <button 
                       onClick={() => { setIsSettingPasscode(false); setPasscode(''); setConfirmPasscode(''); }}
                       className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest"
                    >
                       {t('common.cancel')}
                    </button>
                 </div>
              </div>
           )}
        </div>
      </div>

      <div className="h-px bg-slate-100 my-2"></div>

      {/* Password Section */}
      <div className="flex flex-col gap-5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
          <Lock size={10} /> {t('settings.change_password')}
        </label>

        {isPasswordUser ? (
          <div className="flex flex-col gap-4 bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
             <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('settings.current_password')}</label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    className="w-full px-4 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-indigo-200 text-sm font-bold outline-none transition-all" 
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
                    className="w-full px-4 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-indigo-200 text-sm font-bold outline-none transition-all" 
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
                  className="w-full px-4 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-indigo-200 text-sm font-bold outline-none transition-all" 
                  placeholder="Confirm new password" 
                />
             </div>

             <button 
                onClick={handleChangePassword}
                disabled={isChangingPass || !currentPassword || !newPassword || !confirmPassword}
                className="mt-2 w-full h-12 bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-200 hover:text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
             >
                {isChangingPass ? <Loader2 size={16} className="animate-spin" /> : null}
                {t('settings.change_password')}
             </button>
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

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-[100]">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

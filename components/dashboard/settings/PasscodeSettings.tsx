
import React, { useState } from 'react';
import { ShieldCheck, Key, Loader2, ChevronRight } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { useTranslation } from 'react-i18next';

interface PasscodeSettingsProps {
  passcodeEnabled: boolean;
  setPasscodeEnabled: (val: boolean) => void;
  showToast: (msg: string) => void;
}

export const PasscodeSettings: React.FC<PasscodeSettingsProps> = ({ 
  passcodeEnabled, setPasscodeEnabled, showToast 
}) => {
  const { t } = useTranslation();
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'ENTER' | 'CONFIRM'>('ENTER');
  const [tempPasscode, setTempPasscode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const handleStartSetup = () => {
    setSetupStep('ENTER');
    setTempPasscode('');
    setInputCode('');
    setShowSetupModal(true);
  };

  const handleDigitInput = (digit: string) => {
    if (inputCode.length < 4) {
      const nextCode = inputCode + digit;
      setInputCode(nextCode);
      if (nextCode.length === 4) {
        setTimeout(() => processSetupStep(nextCode), 200);
      }
    }
  };

  const processSetupStep = async (code: string) => {
    if (setupStep === 'ENTER') {
      setTempPasscode(code);
      setInputCode('');
      setSetupStep('CONFIRM');
    } else {
      if (code === tempPasscode) {
        await savePasscode(code);
        setShowSetupModal(false);
      } else {
        alert(t('settings.passcode_mismatch'));
        setInputCode('');
      }
    }
  };

  const savePasscode = async (code: string) => {
    if (!auth.currentUser) return;
    setPasscodeLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        passcodeEnabled: true,
        passcode: code
      });
      setPasscodeEnabled(true);
      showToast(t('settings.passcode_set_success'));
    } catch (e: any) {
      alert("Error saving passcode: " + e.message);
    } finally {
      setPasscodeLoading(false);
    }
  };

  const executeDisablePasscode = async () => {
    if (!auth.currentUser) return;
    setPasscodeLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        passcodeEnabled: false,
        passcode: null
      });
      setPasscodeEnabled(false);
      setShowDisableConfirm(false);
      showToast("Đã tắt mã khóa");
    } catch (error: any) {
      alert("Lỗi khi tắt mã khóa: " + error.message);
    } finally {
      setPasscodeLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
        <ShieldCheck size={10} /> {t('settings.passcode_security')}
      </label>

      <div className={`p-5 bg-white border rounded-[2rem] shadow-sm transition-all ${passcodeEnabled ? 'border-indigo-100 ring-2 ring-indigo-50/50' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${passcodeEnabled ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
              <Key size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">{t('settings.passcode_lock')}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">{passcodeEnabled ? t('settings.lock_active') : t('settings.lock_inactive')}</p>
            </div>
          </div>
          <button 
            onClick={() => passcodeEnabled ? setShowDisableConfirm(true) : handleStartSetup()} 
            disabled={passcodeLoading} 
            className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-1 ${passcodeEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}
          >
            {passcodeLoading ? <Loader2 size={12} className="animate-spin text-white mx-auto" /> : <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>}
          </button>
        </div>
      </div>

      {showSetupModal && (
        <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="w-full max-w-xs flex flex-col items-center gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-4"><Key size={32} /></div>
              <h3 className="text-xl font-black text-slate-900">{setupStep === 'ENTER' ? t('settings.enter_4_digit') : t('settings.confirm_digit')}</h3>
            </div>
            <div className="flex gap-4">
              {[0, 1, 2, 3].map(i => (<div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${inputCode.length > i ? 'bg-indigo-600 scale-110' : 'bg-slate-200'}`} />))}
            </div>
            <div className="grid grid-cols-3 gap-6 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button key={num} onClick={() => handleDigitInput(num)} className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-2xl font-black text-slate-800 active:bg-slate-100 active:scale-95 transition-all mx-auto">{num}</button>
              ))}
              <div className="w-16 h-16"></div>
              <button onClick={() => handleDigitInput('0')} className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-2xl font-black text-slate-800 active:bg-slate-50 active:scale-95 transition-all mx-auto">0</button>
              <button onClick={() => setInputCode(prev => prev.slice(0, -1))} className="w-16 h-16 flex items-center justify-center text-slate-400 active:scale-90 transition-all mx-auto"><ChevronRight size={24} className="rotate-180" /></button>
            </div>
            <button onClick={() => setShowSetupModal(false)} className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Hủy bỏ</button>
          </div>
        </div>
      )}

      {showDisableConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDisableConfirm(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[2rem] relative z-10 shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-black text-slate-900 text-center">Tắt bảo mật?</h3>
            <button onClick={executeDisablePasscode} className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">Xác nhận tắt</button>
            <button onClick={() => setShowDisableConfirm(false)} className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">Hủy bỏ</button>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Loader2, Globe, Check, CheckCircle2, Camera, Bot, BarChart3 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { useTranslation } from 'react-i18next';
import { compressImage } from '../../../lib/utils';
import { useTransactionLimit } from '../../../hooks/useTransactionLimit';
import { PasscodeSettings } from './PasscodeSettings';

export const ProfileTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Profile State
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [currency, setCurrency] = useState('VND');
  const [funMode, setFunMode] = useState(true);
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);

  // Transaction Limit
  const { currentUsage, limit, loading: limitLoading } = useTransactionLimit(auth.currentUser?.uid || '');

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLanguage(data.language || 'vi');
        setCurrency(data.currency || 'VND');
        setDisplayName(data.displayName || auth.currentUser?.displayName || '');
        setFunMode(data.funMode !== false);
        setPasscodeEnabled(data.passcodeEnabled === true);
        setPhotoURL(data.photoURL || auth.currentUser?.photoURL || '');
      }
      setFetching(false);
    }, () => setFetching(false));
    return () => unsub();
  }, []);

  const handleToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { 
        displayName, 
        photoURL, 
        language,
        currency,
        funMode,
        updatedAt: new Date().toISOString()
      });
      handleToast(t('settings.success'));
    } catch (error: any) {
      alert(t('settings.error') + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try { setPhotoURL(await compressImage(file)); } catch (err) { alert("Failed to process image."); }
    }
  };

  if (fetching) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col gap-8 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 relative pb-10">
      
      {/* 1. Identity Section */}
      <div className="flex flex-col items-center">
        <div 
            className="w-24 h-24 rounded-full bg-slate-100 ring-4 ring-white shadow-lg overflow-hidden relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
        >
          {photoURL ? (
            <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40} /></div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <Camera size={20} className="text-white" />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
        <div className="mt-4 w-full">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">{t('settings.display_identity')}</label>
          <input 
            type="text" 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:bg-white focus:border-indigo-200 transition-all text-slate-900 font-bold outline-none" 
            placeholder="Your name" 
          />
        </div>
      </div>

      {/* Usage Limit Section */}
      <div className="space-y-2">
         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><BarChart3 size={10} /> {t('settings.usage_limit_title')}</label>
         <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-700">{t('settings.transactions_created')}</p>
                <p className="text-xs font-black text-indigo-600">{currentUsage} / {limit}</p>
            </div>
            {limitLoading ? <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse"></div> : (
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${currentUsage >= limit ? 'bg-red-500' : currentUsage > limit * 0.8 ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (currentUsage / limit) * 100)}%` }}></div>
                </div>
            )}
            <p className="text-[9px] font-medium text-slate-400">{t('settings.limit_reset_desc')}</p>
         </div>
      </div>

      {/* 2. Localization */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Globe size={10} /> {t('settings.language')}</label>
           <div className="grid grid-cols-2 gap-3">
              {[ {id: 'en', l: 'English', e: '🇬🇧'}, {id: 'vi', l: 'Tiếng Việt', e: '🇻🇳'} ].map(l => (
                <button key={l.id} onClick={() => { setLanguage(l.id); i18n.changeLanguage(l.id); }} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${language === l.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-600'}`}>
                   <div className="flex items-center gap-2"><span className="text-lg">{l.e}</span><span className="text-xs font-bold">{l.l}</span></div>
                   {language === l.id && <Check size={16} />}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* 3. Security Section (Refactored) */}
      <PasscodeSettings passcodeEnabled={passcodeEnabled} setPasscodeEnabled={setPasscodeEnabled} showToast={handleToast} />

      {/* 4. Fun Mode */}
      <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Bot size={20} /></div>
            <div>
               <p className="text-xs font-bold text-indigo-900">Fun Mode (FinBot)</p>
               <p className="text-[9px] font-medium text-indigo-500">Phản hồi vui nhộn khi chi tiêu.</p>
            </div>
         </div>
         <button onClick={() => setFunMode(!funMode)} className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-1 ${funMode ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
            <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
         </button>
      </div>

      {/* Global Save Button */}
      <button 
        onClick={handleUpdateProfile} 
        disabled={loading} 
        className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl"
      >
        {loading ? <Loader2 size={20} className="animate-spin text-indigo-400" /> : <Save size={20} className="text-indigo-400" />} 
        {loading ? t('settings.saving') : t('settings.commit_preferences')}
      </button>

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

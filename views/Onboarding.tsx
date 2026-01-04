
import React, { useState, useEffect } from 'react';
import { Sparkles, Wallet, CheckCircle2, ArrowRight, ArrowLeft, Loader2, User, Globe, Banknote } from 'lucide-react';
import { doc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AmountInput } from '../components/ui/AmountInput';
import { StandardInput } from '../components/ui/StandardInput';
import { useTranslation } from 'react-i18next';

interface OnboardingProps {
  onComplete: () => void;
  userEmail: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, userEmail }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: auth.currentUser?.displayName || userEmail.split('@')[0],
    initialBalance: '0',
    language: 'vi',
    currency: 'VND'
  });

  useEffect(() => {
    if (i18n.language !== 'vi' && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage('vi');
    }
  }, [i18n]);

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setFormData({ ...formData, language: lang });
    if (typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lang);
    }
  };

  const finishOnboarding = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    setLoading(true);
    
    try {
      const initialAmt = Number(formData.initialBalance) || 0;
      const now = new Date().toISOString();
      const currentMonth = now.slice(0, 7);
      const batch = writeBatch(db);

      // 1. Create Default Categories
      const catRef = collection(db, 'users', uid, 'categories');
      const existingSnap = await getDocs(catRef);
      const existingNames = new Set(existingSnap.docs.map(d => d.data().name));

      const defaultCategories = [
        { name: 'Dining', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Transport', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Housing', group: 'EXPENSES', expense_type: 'FIXED' },
        { name: 'Health', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Self-growth', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Enjoyment', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Social', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Financial Expense', group: 'EXPENSES', expense_type: 'FIXED' },
        { name: 'Shopping', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Other Expense', group: 'EXPENSES', expense_type: 'VARIABLE' },
        
        { name: 'Salary', group: 'INCOME' },
        { name: 'Bonus', group: 'INCOME' },
        { name: 'Passive Income', group: 'INCOME' },
        { name: 'Other Income', group: 'INCOME' },
        
        { name: 'Cash', group: 'ASSETS' },
        { name: 'Savings', group: 'ASSETS' },
        { name: 'Stocks', group: 'ASSETS' },
        { name: 'Crypto', group: 'ASSETS' },
        { name: 'Gold', group: 'ASSETS' },
        { name: 'Real Estate', group: 'ASSETS' },
        { name: 'Receivables', group: 'ASSETS' },
        
        { name: 'Equity Fund', group: 'CAPITAL', tags: ['income flow'] },
        { name: 'Bank Loan', group: 'CAPITAL' },
        { name: 'Personal Loan', group: 'CAPITAL' },
        { name: 'Liability', group: 'CAPITAL' }
      ];

      defaultCategories.forEach(cat => {
        if (!existingNames.has(cat.name)) {
            const newDocRef = doc(catRef);
            batch.set(newDocRef, { ...cat, createdAt: now });
        }
      });

      // 2. Create Default Accounts
      const accountsRef = collection(db, 'users', uid, 'accounts');
      
      const fundAccountRef = doc(accountsRef);
      batch.set(fundAccountRef, {
        id: fundAccountRef.id,
        name: 'Spending Fund',
        group: 'CAPITAL',
        category: 'Equity Fund',
        current_balance: initialAmt,
        status: 'ACTIVE',
        createdAt: now,
        color_code: '#4F46E5',
        target_ratio: 100,
        description: 'Quỹ chi tiêu hàng ngày và dự phòng mặc định'
      });

      const cashAccountRef = doc(accountsRef);
      batch.set(cashAccountRef, {
        id: cashAccountRef.id,
        name: 'Cash Wallet',
        group: 'ASSETS',
        category: 'Cash',
        current_balance: initialAmt,
        status: 'ACTIVE',
        createdAt: now,
        linked_fund_id: fundAccountRef.id
      });

      // 3. Update User Profile with tutorialState AND Transaction Limit
      const userRef = doc(db, 'users', uid);
      batch.set(userRef, {
        displayName: formData.displayName.trim(),
        initialBalance: initialAmt,
        language: formData.language,
        currency: formData.currency,
        onboarded: true,
        setupAt: now,
        email: userEmail,
        uid: uid,
        monthlyTransactionLimit: 30,
        transactionUsage: {
            month: currentMonth,
            count: 0
        },
        tutorialState: {
          hasSeenHome: false,
          hasSeenAssets: false,
          hasSeenCapital: false,
          hasSeenAdvisor: false
        }
      }, { merge: true });

      await batch.commit();

      setTimeout(() => {
        onComplete();
      }, 300);
    } catch (error) {
      console.error("Onboarding storage failed:", error);
      alert("Something went wrong initializing your ledger. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-500 w-full">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-100 mb-8 overflow-hidden animate-bounce-slow p-3">
              <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="FinAI Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{t('onboarding.welcome')}</h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10">
              {t('onboarding.subtitle')}
            </p>
            <div className="w-full space-y-6">
              <StandardInput 
                label={t('onboarding.name_label')}
                value={formData.displayName}
                onChange={(val) => setFormData({ ...formData, displayName: val })}
                placeholder={t('onboarding.name_placeholder')}
                icon={User}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                     <Globe size={10} /> {t('onboarding.language_label')}
                   </label>
                   <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
                      <button 
                        onClick={() => handleLanguageChange('vi')}
                        className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${formData.language === 'vi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      >VI</button>
                      <button 
                        onClick={() => handleLanguageChange('en')}
                        className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${formData.language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      >EN</button>
                   </div>
                </div>

                <div className="flex flex-col gap-2 text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                     <Banknote size={10} /> {t('onboarding.currency_label')}
                   </label>
                   <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
                      <button 
                        onClick={() => setFormData({...formData, currency: 'VND'})}
                        className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${formData.currency === 'VND' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                      >VND</button>
                      <button 
                        onClick={() => setFormData({...formData, currency: 'USD'})}
                        className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${formData.currency === 'USD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                      >USD</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mb-8">
              <Wallet size={40} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{t('onboarding.step2_title')}</h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10">
              {t('onboarding.step2_desc')}
            </p>
            <div className="w-full">
              <AmountInput 
                label={t('onboarding.balance_label')}
                value={formData.initialBalance}
                onChange={(val) => setFormData({ ...formData, initialBalance: val })}
                autoFocus
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-8 shadow-inner ring-8 ring-indigo-50/50">
              <CheckCircle2 size={56} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{t('onboarding.step3_title')}</h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10">
              {t('onboarding.step3_desc')}
            </p>
            
            <div className="w-full bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 text-left space-y-4 mb-4">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('onboarding.profile_name')}</span>
                  <span className="text-sm font-black text-slate-900">{formData.displayName}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('onboarding.initial_balance')}</span>
                  <span className="text-sm font-black text-emerald-600">{new Intl.NumberFormat(formData.language === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: formData.currency }).format(Number(formData.initialBalance))}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('onboarding.language_label')}</span>
                  <span className="text-sm font-black text-slate-900">{formData.language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
               </div>
            </div>
            
            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-3 rounded-xl mb-4">
               <Sparkles size={16} />
               <p className="text-[10px] font-bold uppercase tracking-wide">{t('onboarding.auto_create_msg')}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-display">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-indigo-200/30 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-emerald-200/30 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10 flex flex-col h-full justify-between">
         <div className="flex-1 flex items-center">
            {renderStep()}
         </div>

         <div className="mt-8 flex flex-col gap-4">
            <button 
              onClick={handleNext}
              disabled={loading || (step === 1 && !formData.displayName)}
              className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-bold text-lg shadow-xl shadow-slate-300 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : (
                <>
                  {step === totalSteps ? t('onboarding.finish') : t('onboarding.next')}
                  {step !== totalSteps && <ArrowRight size={24} />}
                </>
              )}
            </button>
            
            {step > 1 && !loading && (
              <button 
                onClick={handleBack}
                className="w-full h-14 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> {t('onboarding.back')}
              </button>
            )}
            
            <div className="flex justify-center gap-2 mt-2">
               {[1, 2, 3].map(i => (
                 <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`}></div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

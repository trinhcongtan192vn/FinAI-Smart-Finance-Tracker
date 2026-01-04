
import React, { useState } from 'react';
import { X, ShieldCheck, TrendingUp, Zap, Target, ArrowRight, Loader2, User, Briefcase, AlertTriangle, Layers, Heart, Users, ChevronLeft, Check, Edit3 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FinancialProfile, RiskAppetite, FinancialGoal } from '../../types';
import { useTranslation } from 'react-i18next';

interface RiskProfileModalProps {
  uid: string;
  onClose: () => void;
  onComplete: (profile: FinancialProfile) => void;
  initialData?: FinancialProfile;
}

export const RiskProfileModal: React.FC<RiskProfileModalProps> = ({ uid, onClose, onComplete, initialData }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Partial<FinancialProfile>>(initialData || {});

  const saveProfile = async () => {
    // Basic validation
    if (!data.riskAppetite || !data.primaryGoal) return;
    
    setSaving(true);
    try {
        const profile: FinancialProfile = {
            riskAppetite: data.riskAppetite,
            primaryGoal: data.primaryGoal,
            investmentHorizon: data.investmentHorizon || 'MEDIUM_TERM',
            ageRange: data.ageRange,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents || 0,
            occupation: data.occupation || '',
            monthlyIncome: data.monthlyIncome || '',
            painPoints: data.painPoints || [],
            existingProducts: data.existingProducts || [],
            additionalNotes: data.additionalNotes || '',
            setupAt: new Date().toISOString()
        };
        
        await updateDoc(doc(db, 'users', uid), { financialProfile: profile });
        onComplete(profile);
    } catch (e) {
        console.error(e);
        alert("Failed to save profile.");
    } finally {
        setSaving(false);
    }
  };

  const handleNext = () => {
      if (step < totalSteps) setStep(step + 1);
      else saveProfile();
  };

  const handleBack = () => {
      if (step > 1) setStep(step - 1);
  };

  const toggleMultiSelect = (field: 'painPoints' | 'existingProducts', value: string) => {
      const current = data[field] || [];
      const updated = current.includes(value) 
        ? current.filter(i => i !== value) 
        : [...current, value];
      setData({ ...data, [field]: updated });
  };

  const riskOptions: { id: RiskAppetite; icon: any; title: string; desc: string; color: string }[] = [
      { id: 'CONSERVATIVE', icon: ShieldCheck, title: t('advisor.risk_low'), desc: t('advisor.risk_low_desc'), color: 'emerald' },
      { id: 'MODERATE', icon: TrendingUp, title: t('advisor.risk_med'), desc: t('advisor.risk_med_desc'), color: 'indigo' },
      { id: 'AGGRESSIVE', icon: Zap, title: t('advisor.risk_high'), desc: t('advisor.risk_high_desc'), color: 'orange' }
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !saving && onClose()}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh]">
        
        {/* Header with Progress */}
        <div className="p-6 pb-4 border-b border-slate-50">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900">{t('advisor.setup_title')}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">{t(`advisor.step_${step}_title`)}</p>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                ></div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* STEP 1: RISK & HORIZON */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right">
                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <Zap size={14} /> {t('advisor.q_risk')}
                        </p>
                        {riskOptions.map(opt => (
                            <button 
                                key={opt.id}
                                onClick={() => setData({...data, riskAppetite: opt.id})}
                                className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all active:scale-95 ${data.riskAppetite === opt.id ? `border-${opt.color}-500 bg-${opt.color}-50` : 'border-slate-100 hover:border-indigo-100'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-${opt.color}-100 text-${opt.color}-600`}>
                                    <opt.icon size={24} />
                                </div>
                                <div>
                                    <h4 className={`font-black text-sm text-slate-900`}>{opt.title}</h4>
                                    <p className="text-[10px] font-medium text-slate-500 leading-tight mt-1">{opt.desc}</p>
                                </div>
                                {data.riskAppetite === opt.id && <div className={`ml-auto text-${opt.color}-600`}><Check size={20} /></div>}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t('advisor.q_horizon')}</p>
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            {['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'].map((h: any) => (
                                <button
                                    key={h}
                                    onClick={() => setData({...data, investmentHorizon: h})}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${data.investmentHorizon === h ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                >
                                    {t(`advisor.horizon_${h.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: DEMOGRAPHICS */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('advisor.q_age')}</label>
                             <select 
                                value={data.ageRange || ''}
                                onChange={(e) => setData({...data, ageRange: e.target.value as any})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                             >
                                 <option value="">-- Select --</option>
                                 {['18-24', '25-34', '35-44', '45-54', '55+'].map(r => <option key={r} value={r}>{r}</option>)}
                             </select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('advisor.q_marital')}</label>
                             <select 
                                value={data.maritalStatus || ''}
                                onChange={(e) => setData({...data, maritalStatus: e.target.value as any})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                             >
                                 <option value="">-- Select --</option>
                                 <option value="SINGLE">{t('advisor.marital_single')}</option>
                                 <option value="MARRIED">{t('advisor.marital_married')}</option>
                                 <option value="MARRIED_KIDS">{t('advisor.marital_married_kids')}</option>
                             </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('advisor.q_dependents')}</label>
                        <div className="flex gap-2">
                            {[0, 1, 2, 3].map(num => (
                                <button 
                                    key={num}
                                    onClick={() => setData({...data, dependents: num})}
                                    className={`flex-1 py-3 rounded-xl border font-black text-sm transition-all ${data.dependents === num ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-500'}`}
                                >
                                    {num}{num === 3 ? '+' : ''}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('advisor.q_occupation')}</label>
                        <input 
                            type="text" 
                            value={data.occupation || ''}
                            onChange={(e) => setData({...data, occupation: e.target.value})}
                            placeholder="e.g. Software Engineer, Doctor, Freelancer..."
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-100 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* STEP 3: FINANCIAL HEALTH */}
            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('advisor.q_income')}</label>
                        <select 
                            value={data.monthlyIncome || ''}
                            onChange={(e) => setData({...data, monthlyIncome: e.target.value})}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                        >
                            <option value="">-- Select Income Range --</option>
                            <option value="< 10M">&lt; 10M VND</option>
                            <option value="10M - 20M">10M - 20M VND</option>
                            <option value="20M - 50M">20M - 50M VND</option>
                            <option value="50M - 100M">50M - 100M VND</option>
                            <option value="> 100M">&gt; 100M VND</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('advisor.q_products')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'INSURANCE', label: t('advisor.prod_insurance'), icon: Heart },
                                { id: 'STOCKS', label: t('advisor.prod_stocks'), icon: TrendingUp },
                                { id: 'CRYPTO', label: t('advisor.prod_crypto'), icon: Zap },
                                { id: 'REAL_ESTATE', label: t('advisor.prod_real_estate'), icon: User }
                            ].map(item => {
                                const isSelected = data.existingProducts?.includes(item.id);
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => toggleMultiSelect('existingProducts', item.id)}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-500'}`}
                                    >
                                        <item.icon size={16} />
                                        <span className="text-xs font-bold">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: GOALS, CHALLENGES & NOTES */}
            {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right">
                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                           <Target size={14} /> {t('advisor.q_goal')}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'WEALTH_GROWTH', title: t('advisor.goal_growth') },
                                { id: 'DEBT_FREE', title: t('advisor.goal_debt_free') },
                                { id: 'BUY_HOUSE', title: t('advisor.goal_house') },
                                { id: 'RETIRE_EARLY', title: t('advisor.goal_retire') },
                                { id: 'EDUCATION', title: t('advisor.goal_education') },
                                { id: 'LEGACY', title: t('advisor.goal_legacy') }
                            ].map(g => (
                                <button 
                                    key={g.id}
                                    onClick={() => setData({...data, primaryGoal: g.id as any})}
                                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${data.primaryGoal === g.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-600 hover:border-indigo-100'}`}
                                >
                                    {g.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                           <AlertTriangle size={14} /> {t('advisor.q_pain')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'INFLATION', label: t('advisor.pain_inflation') },
                                { id: 'DEBT', label: t('advisor.pain_debt') },
                                { id: 'KNOWLEDGE', label: t('advisor.pain_knowledge') },
                                { id: 'PLANNING', label: t('advisor.pain_planning') },
                                { id: 'TAX', label: t('advisor.pain_tax') }
                            ].map(p => {
                                const isSelected = data.painPoints?.includes(p.id);
                                return (
                                    <button 
                                        key={p.id}
                                        onClick={() => toggleMultiSelect('painPoints', p.id)}
                                        className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${isSelected ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-100 text-slate-500'}`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                            <Edit3 size={12} /> {t('advisor.q_notes')}
                        </label>
                        <textarea
                            value={data.additionalNotes || ''}
                            onChange={(e) => setData({...data, additionalNotes: e.target.value})}
                            placeholder={t('advisor.notes_placeholder')}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-100 transition-all resize-none h-24"
                        />
                    </div>
                </div>
            )}
        </div>

        <div className="p-6 bg-slate-50 border-t flex justify-between items-center shrink-0">
            {step > 1 ? (
                 <button onClick={handleBack} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-2">
                    <ChevronLeft size={16} /> Back
                 </button>
            ) : <div className="w-10"></div>}
            
            <button 
                onClick={handleNext} 
                disabled={saving || (step === 1 && !data.riskAppetite) || (step === 4 && !data.primaryGoal)}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
            >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <>
                    {step === totalSteps ? t('common.confirm') : 'Next'} 
                    {step !== totalSteps && <ArrowRight size={16} />}
                </>}
            </button>
        </div>

      </div>
    </div>
  );
};

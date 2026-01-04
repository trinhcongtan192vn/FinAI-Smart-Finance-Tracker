
import React, { useState } from 'react';
import { Target, PiggyBank, Edit2, AlertCircle, X, Check, Tag } from 'lucide-react';
import { currencyFormatter, formatCurrencyCompact } from '../../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { AmountInput } from '../ui/AmountInput';
import { useTranslation } from 'react-i18next';

interface FundData {
  id: string;
  name: string;
  balance: number;
  target: number;
  color: string;
  description?: string;
  tags?: string[];
  rebalancingAlert?: boolean;
}

interface FundProgressGridProps {
  funds: FundData[];
}

export const FundProgressGrid: React.FC<FundProgressGridProps> = ({ funds }) => {
  const { t } = useTranslation();
  const [editingFund, setEditingFund] = useState<FundData | null>(null);
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (fund: FundData) => {
      setEditingFund(fund);
      setTargetAmount(fund.target.toString());
      setSelectedTag(fund.tags?.[0] || 'INVESTMENT');
  };

  const handleSave = async () => {
      if (!editingFund || !auth.currentUser) return;
      setIsSaving(true);
      try {
          const fundRef = doc(db, 'users', auth.currentUser.uid, 'accounts', editingFund.id);
          await updateDoc(fundRef, {
              target_amount: Number(targetAmount),
              tags: [selectedTag]
          });
          setEditingFund(null);
      } catch (e) {
          alert(t('settings.error'));
      } finally {
          setIsSaving(false);
      }
  };

  if (funds.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
             <Target size={20} className="text-indigo-600" /> {t('reports.fund_goals')}
          </h3>
       </div>
       
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {funds.map(fund => {
             const progress = fund.target > 0 ? Math.min(100, (fund.balance / fund.target) * 100) : 0;
             const isEmergency = fund.tags?.includes('EMERGENCY');
             const isSpending = fund.tags?.includes('SPENDING');

             return (
               <div 
                 key={fund.id} 
                 onClick={() => handleEdit(fund)}
                 className={`bg-white p-5 rounded-[2rem] border shadow-soft flex flex-col gap-4 group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${fund.rebalancingAlert ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-50 hover:border-indigo-100'}`}
               >
                  {fund.rebalancingAlert && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-xl flex items-center gap-1">
                          <AlertCircle size={10} /> {t('reports.excess_capital')}
                      </div>
                  )}

                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md relative shrink-0" style={{ backgroundColor: fund.color }}>
                           <PiggyBank size={18} />
                           {isEmergency && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                           <h4 className="text-sm font-black text-slate-900 truncate">{fund.name}</h4>
                           <div className="flex items-center gap-1 overflow-hidden">
                               <p className="text-[10px] font-bold text-slate-400 truncate">{fund.description || t('capital.equity_funds')}</p>
                               {fund.tags?.[0] && <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase shrink-0">{fund.tags[0]}</span>}
                           </div>
                        </div>
                     </div>
                     <span className="text-sm font-black text-slate-800 ml-2 whitespace-nowrap">{currencyFormatter.format(fund.balance)}</span>
                  </div>
                  
                  {fund.rebalancingAlert ? (
                      <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                          <p className="text-[9px] font-bold text-red-600 leading-tight">
                              {t('reports.spending_high_alert')}
                          </p>
                      </div>
                  ) : fund.target > 0 ? (
                     <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                           <span>{t('reports.progress')}</span>
                           <span>{progress.toFixed(0)}% / {formatCurrencyCompact(fund.target)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                           <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: fund.color }}></div>
                        </div>
                     </div>
                  ) : (
                     <div className="p-2 bg-slate-50 rounded-xl text-center flex items-center justify-center gap-2 text-slate-400">
                        <Edit2 size={12} />
                        <p className="text-[9px] font-bold uppercase">{t('reports.set_target')}</p>
                     </div>
                  )}
               </div>
             );
          })}
       </div>

       {/* Edit Modal */}
       {editingFund && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingFund(null)}></div>
               <div className="bg-white w-full max-w-sm rounded-[2.5rem] relative z-10 shadow-2xl p-6 animate-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-lg text-slate-900">{editingFund.name}</h3>
                       <button onClick={() => setEditingFund(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                   </div>
                   
                   <div className="space-y-6">
                       <AmountInput label={t('reports.set_target') + " (VND)"} value={targetAmount} onChange={setTargetAmount} autoFocus />
                       
                       <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                               <Tag size={12} /> Type
                           </label>
                           <div className="grid grid-cols-3 gap-2">
                               {['SPENDING', 'EMERGENCY', 'INVESTMENT'].map(tag => (
                                   <button 
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedTag === tag ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}
                                   >
                                       {tag}
                                   </button>
                               ))}
                           </div>
                       </div>
                   </div>

                   <button onClick={handleSave} disabled={isSaving} className="w-full mt-8 h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95">
                       {isSaving ? t('settings.saving') : <><Check size={18} /> {t('settings.commit_preferences')}</>}
                   </button>
               </div>
           </div>
       )}
    </div>
  );
};

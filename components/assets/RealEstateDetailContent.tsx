
import React, { useMemo, useState, useEffect } from 'react';
import { Home, MapPin, Maximize, TrendingUp, TrendingDown, Info, ShoppingCart, DollarSign, Activity, Hammer, Target, CheckCircle2, History, PiggyBank, Edit2, Check, X, Receipt, PieChart, Save, Loader2 } from 'lucide-react';
import { Account } from '../../types';
import { currencyFormatter, percentFormatter } from '../../lib/utils';
import { RealEstateOperationModal } from './RealEstateOperationModal';
import { SellRealEstateModal } from './SellRealEstateModal';
import { PropertyTimeline } from './PropertyTimeline';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AmountInput } from '../ui/AmountInput';

interface RealEstateDetailContentProps {
   account: Account;
   targetUid: string;
   onClose: () => void;
}

export const RealEstateDetailContent: React.FC<RealEstateDetailContentProps> = ({ account, targetUid, onClose }) => {
   const [activeModal, setActiveModal] = useState<'CAPEX' | 'OPEX' | 'REVALUE' | 'SELL' | null>(null);

   // Capital Structure State
   const [isEditingStructure, setIsEditingStructure] = useState(false);
   const [equityFunds, setEquityFunds] = useState<Account[]>([]);
   const [liabilities, setLiabilities] = useState<Account[]>([]);

   const [tempLinkedFundId, setTempLinkedFundId] = useState(account.linked_fund_id || '');
   const [tempLinkedLiabilityId, setTempLinkedLiabilityId] = useState((account as any).linked_liability_id || '');
   const [tempEquityAmount, setTempEquityAmount] = useState((account as any).equity_amount || account.real_estate_details?.total_investment || 0);
   const [savingStructure, setSavingStructure] = useState(false);

   const details = account.real_estate_details;

   const stats = useMemo(() => {
      if (!details) return null;
      const marketValue = account.current_balance;
      const costBasis = details.total_investment;
      const profit = marketValue - costBasis;
      const roi = costBasis > 0 ? (profit / costBasis) : 0;
      const isProfit = profit >= 0;

      return { marketValue, costBasis, profit, roi, isProfit };
   }, [account, details]);

   // Derived Structure Display
   const equityAmt = (account as any).equity_amount || details?.total_investment || 0;
   const liabilityAmt = (account as any).liability_amount || 0;
   const totalInvested = details?.total_investment || 0;

   const equityPct = totalInvested > 0 ? (equityAmt / totalInvested) * 100 : 100;
   const liabilityPct = totalInvested > 0 ? (liabilityAmt / totalInvested) * 100 : 0;

   const linkedFundName = equityFunds.find(f => f.id === (account.linked_fund_id || tempLinkedFundId))?.name || 'Chưa liên kết';
   const linkedLiabilityName = liabilities.find(l => l.id === ((account as any).linked_liability_id || tempLinkedLiabilityId))?.name || 'Không có nợ';

   useEffect(() => {
      const fetchLinkedData = async () => {
         const qFunds = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Equity Fund'));
         const qLiabs = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Liability'));

         const [snapFunds, snapLiabs] = await Promise.all([getDocs(qFunds), getDocs(qLiabs)]);

         setEquityFunds(snapFunds.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
         setLiabilities(snapLiabs.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
      };
      fetchLinkedData();
   }, [targetUid]);

   const handleUpdateStructure = async () => {
      setSavingStructure(true);
      try {
         const debtAmt = Math.max(0, totalInvested - tempEquityAmount);

         await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), {
            linked_fund_id: tempLinkedFundId,
            linked_liability_id: tempLinkedLiabilityId || null,
            equity_amount: tempEquityAmount,
            liability_amount: debtAmt
         });

         setIsEditingStructure(false);
      } catch (e) {
         alert("Lỗi cập nhật cấu trúc vốn");
      } finally {
         setSavingStructure(false);
      }
   };

   if (!details || !stats) return (
      <div className="p-10 text-center text-slate-400">
         <Info size={32} className="mx-auto mb-4 opacity-20" />
         <p className="text-xs font-bold uppercase tracking-widest">Dữ liệu BĐS không khả dụng</p>
      </div>
   );

   return (
      <div className="flex flex-col animate-in fade-in duration-500 px-6 space-y-8 pb-32">
         {/* 1. Header Info */}
         <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                  <Home size={24} />
               </div>
               <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                     <MapPin size={12} className="text-slate-400" />
                     <p className="text-sm font-bold text-slate-700 truncate">{details.address || 'Chưa cập nhật địa chỉ'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Maximize size={12} className="text-slate-400" />
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{details.area || 'N/A'}</p>
                  </div>
               </div>
            </div>
         </div>

         {/* 2. Capital Structure Cockpit */}
         <div className={`p-5 rounded-[2.5rem] border relative overflow-hidden transition-all ${isEditingStructure ? 'bg-white border-indigo-200 ring-4 ring-indigo-50' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <PieChart size={14} className="text-indigo-500" /> Cấu trúc vốn (Capital Structure)
               </h4>
               {!isEditingStructure ? (
                  <button onClick={() => setIsEditingStructure(true)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={14} /></button>
               ) : (
                  <div className="flex gap-2">
                     <button onClick={handleUpdateStructure} disabled={savingStructure} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors">
                        {savingStructure ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                     </button>
                     <button onClick={() => setIsEditingStructure(false)} disabled={savingStructure} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors">
                        <X size={14} />
                     </button>
                  </div>
               )}
            </div>

            {isEditingStructure ? (
               <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-slate-100 p-3 rounded-2xl text-center">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng vốn đầu tư (Cost)</p>
                     <p className="text-lg font-black text-slate-900">{currencyFormatter.format(totalInvested)}</p>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-bold text-indigo-600 uppercase ml-1">Vốn tự có (Equity)</label>
                     <input
                        type="number"
                        value={tempEquityAmount}
                        onChange={e => {
                           const val = Math.min(totalInvested, Math.max(0, Number(e.target.value)));
                           setTempEquityAmount(val);
                        }}
                        className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-100"
                     />
                     <select
                        value={tempLinkedFundId}
                        onChange={e => setTempLinkedFundId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                     >
                        <option value="">Chọn Quỹ đối ứng...</option>
                        {equityFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-bold text-orange-600 uppercase ml-1">Nợ vay (Debt)</label>
                     <div className="w-full px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl font-bold text-orange-700">
                        {currencyFormatter.format(Math.max(0, totalInvested - tempEquityAmount))}
                     </div>
                     <select
                        value={tempLinkedLiabilityId}
                        onChange={e => setTempLinkedLiabilityId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                     >
                        <option value="">Không có nợ / Chọn khoản vay...</option>
                        {liabilities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                     </select>
                  </div>
               </div>
            ) : (
               <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/50">
                     <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${equityPct}%` }}></div>
                     <div className="h-full bg-orange-400 transition-all duration-1000" style={{ width: `${liabilityPct}%` }}></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                           <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Vốn tự có</p>
                        </div>
                        <p className="text-xs sm:text-sm font-black text-slate-800 break-words">
                           {currencyFormatter.format(equityAmt)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">({equityPct.toFixed(0)}%)</p>
                        <p className="text-[9px] font-medium text-slate-400 truncate mt-0.5">{linkedFundName}</p>
                     </div>
                     <div className="text-right min-w-0">
                        <div className="flex items-center justify-end gap-1.5 mb-1">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Nợ vay</p>
                           <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0"></div>
                        </div>
                        <p className="text-xs sm:text-sm font-black text-slate-800 break-words">
                           {currencyFormatter.format(liabilityAmt)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">({liabilityPct.toFixed(0)}%)</p>
                        <p className="text-[9px] font-medium text-slate-400 truncate mt-0.5">{linkedLiabilityName}</p>
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* 3. Valuation Card */}
         <div className={`p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-colors duration-500 ${stats.isProfit ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                  <div className="min-w-0 flex-1">
                     <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em] mb-1 truncate">Giá trị thị trường</p>
                     <h2 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
                        {currencyFormatter.format(stats.marketValue)}
                     </h2>
                  </div>
                  <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0 ml-2">
                     {stats.isProfit ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 min-w-0">
                     <p className="text-white/60 text-[8px] font-black uppercase tracking-widest mb-1 truncate">Chênh lệch</p>
                     <p className="text-sm sm:text-lg font-black truncate">
                        {stats.isProfit ? '+' : ''}{currencyFormatter.format(stats.profit)}
                     </p>
                  </div>
                  <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 min-w-0">
                     <p className="text-white/60 text-[8px] font-black uppercase tracking-widest mb-1 truncate">ROI (Vốn)</p>
                     <p className="text-sm sm:text-lg font-black truncate">
                        {stats.isProfit ? '+' : ''}{percentFormatter.format(stats.roi)}
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* 4. Action Grid */}
         <div className="grid grid-cols-4 gap-3">
            {[
               { id: 'CAPEX', icon: Hammer, color: 'indigo', label: 'CapEx' },
               { id: 'OPEX', icon: Receipt, color: 'rose', label: 'OpEx' },
               { id: 'REVALUE', icon: Activity, color: 'amber', label: 'Định giá' },
               { id: 'SELL', icon: DollarSign, color: 'slate', label: 'Bán' }
            ].map(op => (
               <button
                  key={op.id}
                  onClick={() => setActiveModal(op.id as any)}
                  className="flex flex-col items-center gap-2 active:scale-90 transition-all"
               >
                  <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-${op.color}-600`}>
                     <op.icon size={22} />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{op.label}</span>
               </button>
            ))}
         </div>

         {/* 5. Property Timeline Section */}
         <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={16} className="text-indigo-500" /> Dòng thời gian tài sản
               </h3>
               <span className="text-[9px] font-black text-slate-400 uppercase">Audit Trail</span>
            </div>

            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-soft">
               <PropertyTimeline logs={account.investment_logs || []} />
            </div>
         </div>

         {activeModal === 'SELL' ? (
            <SellRealEstateModal
               account={account}
               onClose={() => setActiveModal(null)}
               targetUid={targetUid}
            />
         ) : activeModal && (
            <RealEstateOperationModal
               operation={activeModal}
               account={account}
               onClose={() => setActiveModal(null)}
               targetUid={targetUid}
            />
         )}
      </div>
   );
};


import React, { useMemo, useState } from 'react';
import { Calendar, Clock, TrendingUp, User, Phone, ArrowUpRight, ArrowDownLeft, ShieldCheck, Info, RotateCw, Wallet, Percent, History, Landmark, Sparkles } from 'lucide-react';
import { Account } from '../../types';
import { currencyFormatter, calculateFinancialStats } from '../../lib/utils';
import { LendingOperationModal } from './LendingOperationModal';

interface LendingDetailContentProps {
   account: Account;
   targetUid: string;
   onClose: () => void;
}

export const LendingDetailContent: React.FC<LendingDetailContentProps> = ({ account, targetUid, onClose }) => {
   const [activeOp, setActiveOp] = useState<'TOP_UP' | 'COLLECT' | 'EXTEND' | 'SETTLE' | null>(null);
   const details = account.lending_details;

   const stats = useMemo(() => {
      if (!details) return null;
      return calculateFinancialStats({
         principal: details.principal_amount,
         rate: details.interest_rate,
         startDate: details.start_date,
         endDate: details.end_date,
         period: details.interest_period,
         interestType: details.interest_type
      });
   }, [details]);

   if (!details || !stats) return (
      <div className="p-10 text-center text-slate-400">
         <Info size={32} className="mx-auto mb-4 opacity-20" />
         <p className="text-xs font-black uppercase tracking-widest">Dữ liệu khoản vay trống</p>
      </div>
   );

   return (
      <div className="flex flex-col animate-in fade-in duration-500 pb-20">
         <div className="px-6 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner"><User size={28} /></div>
                  <div className="min-w-0">
                     <h4 className="text-base font-black text-slate-900 truncate">{details.borrower_name}</h4>
                     <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5 uppercase tracking-wider"><Phone size={10} /> {details.borrower_phone || 'N/A'}</p>
                  </div>
               </div>
               {details.borrower_phone && (
                  <a href={`tel:${details.borrower_phone}`} className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all active:scale-90"><Phone size={20} /></a>
               )}
            </div>

            <div className="bg-slate-900 text-white p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/30 transition-colors"></div>
               <div className="flex justify-between items-start mb-8 relative z-10">
                  <div><p className="text-purple-300 text-[9px] font-black uppercase tracking-[0.25em] mb-1.5">Tổng nợ phải thu</p><h3 className="text-3xl font-black tracking-tighter">{currencyFormatter.format(account.current_balance)}</h3></div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10"><Landmark size={20} className="text-purple-300" /></div>
               </div>
               <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Gốc hiện tại</p><p className="text-sm font-black">{currencyFormatter.format(details.principal_amount)}</p></div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Lãi chưa thu</p><p className="text-sm font-black text-emerald-400">{currencyFormatter.format(account.accrued_interest || 0)}</p></div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-soft space-y-5">
               <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời hạn hợp đồng</span>
                     <p className="text-xs font-bold text-slate-800">{new Date(details.start_date).toLocaleDateString('vi-VN')} {details.end_date ? ` → ${new Date(details.end_date).toLocaleDateString('vi-VN')}` : ' (Không thời hạn)'}</p>
                  </div>
                  {stats.hasEndDate && (
                     <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stats.isExpired ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>{stats.isExpired ? 'ĐÃ QUÁ HẠN' : `CÒN ${stats.daysRemaining} NGÀY`}</span>
                  )}
               </div>
               {stats.hasEndDate && (
                  <div className="space-y-3 pt-2">
                     <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${stats.isExpired ? 'bg-red-500' : 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]'}`} style={{ width: `${stats.progress}%` }} />
                     </div>
                  </div>
               )}
               <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Percent size={14} /></div>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">Lãi suất <strong>{details.interest_rate}%</strong> {details.interest_period === 'MONTHLY' ? '/tháng' : '/năm'} ({details.interest_type === 'SIMPLE' ? 'Lãi đơn' : 'Lãi kép'}). Thu lãi <strong>{details.interest_cycle}</strong>.</p>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
               {[
                  { id: 'TOP_UP', label: 'Vay thêm', icon: ArrowUpRight, color: 'indigo' },
                  { id: 'COLLECT', label: 'Thu hồi', icon: ArrowDownLeft, color: 'emerald' },
                  { id: 'EXTEND', label: 'Gia hạn', icon: RotateCw, color: 'orange' }
               ].map(op => (
                  <button key={op.id} onClick={() => setActiveOp(op.id as any)} className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-3 group active:scale-95 transition-all">
                     <div className={`w-12 h-12 rounded-2xl bg-${op.color}-50 text-${op.color}-600 flex items-center justify-center group-hover:bg-${op.color}-600 group-hover:text-white transition-colors`}><op.icon size={24} /></div>
                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{op.label}</span>
                  </button>
               ))}
            </div>

            <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100 flex gap-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shrink-0 shadow-sm"><Sparkles size={20} /></div>
               <div className="min-w-0">
                  <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Dự báo của AI</p>
                  <p className="text-xs font-medium text-indigo-700 leading-relaxed italic">"Dựa trên ngày giải ngân ({new Date(details.start_date).toLocaleDateString('vi-VN')}), khoản lãi thực tế ước tính hiện tại là {currencyFormatter.format(stats.estimatedInterest)}."</p>
               </div>
            </div>

            <button onClick={() => setActiveOp('SETTLE')} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"><ShieldCheck size={20} className="text-emerald-400" /> Tất toán & Kết thúc Hợp đồng</button>
         </div>
         {activeOp && <LendingOperationModal operation={activeOp} account={account} onClose={() => setActiveOp(null)} targetUid={targetUid} />}
      </div>
   );
};

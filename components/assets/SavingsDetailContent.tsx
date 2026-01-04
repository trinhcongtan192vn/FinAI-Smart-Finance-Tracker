
import React, { useMemo, useState } from 'react';
import { Calendar, Clock, TrendingUp, Landmark, Info, ArrowRight, ShieldCheck, CheckCircle2, RotateCw, Percent, Banknote, CalendarDays, Archive, ChevronRight } from 'lucide-react';
import { Account, SavingsDeposit } from '../../types';
import { currencyFormatter, calculateFinancialStats } from '../../lib/utils';
import { SettleSavingsModal } from './SettleSavingsModal';
import { RenewSavingsModal } from './RenewSavingsModal';

interface SavingsDetailContentProps {
  account: Account;
  targetUid: string;
  onClose: () => void;
}

export const SavingsDetailContent: React.FC<SavingsDetailContentProps> = ({ account, targetUid, onClose }) => {
  const [activeModal, setActiveModal] = useState<'SETTLE' | 'RENEW' | null>(null);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  
  const details = account.details;

  // Process deposits: If no deposits array exists (legacy), create a virtual one from the main details
  const activeDeposits = useMemo(() => {
    if (!details) return [];
    
    // Modern Structure
    if (details.deposits && details.deposits.length > 0) {
        return details.deposits
            .filter(d => d.status === 'ACTIVE')
            .sort((a,b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
    }
    
    // Legacy Structure (Fallback)
    if (account.current_balance > 0) {
        return [{
            id: 'legacy',
            amount: details.principal_amount,
            interest_rate: details.interest_rate,
            term_months: details.term_months,
            start_date: details.start_date,
            end_date: details.end_date,
            status: 'ACTIVE'
        }] as SavingsDeposit[];
    }
    
    return [];
  }, [details, account.current_balance]);

  const totalBalance = activeDeposits.reduce((sum, d) => sum + d.amount, 0);
  
  const weightedRate = totalBalance > 0 
    ? activeDeposits.reduce((sum, d) => sum + (d.amount * d.interest_rate), 0) / totalBalance 
    : 0;

  const totalExpectedInterest = activeDeposits.reduce((sum, d) => {
      return sum + (d.amount * (d.interest_rate / 100) * d.term_months) / 12;
  }, 0);

  if (!details) return (
    <div className="p-10 text-center text-slate-400">
      <Info size={32} className="mx-auto mb-4 opacity-20" />
      <p className="text-xs font-bold uppercase tracking-widest">Dữ liệu sổ tiết kiệm trống</p>
    </div>
  );

  if (account.status === 'CLOSED' || (activeDeposits.length === 0 && account.current_balance === 0)) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/30">
            <CheckCircle2 size={48} />
         </div>
         <h3 className="text-2xl font-black text-slate-900 tracking-tight">Đã tất toán</h3>
         <p className="text-sm font-medium text-slate-500 mt-2 text-center max-w-[240px]">Tài khoản này không còn số dư.</p>
         
         <div className="w-full mt-10 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-soft">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử</span>
               <span className="text-xs font-bold text-slate-600">Xem trong Nhật ký</span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đóng sổ</span>
               <span className="text-sm font-black text-slate-600">{account.updatedAt ? new Date(account.updatedAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
            </div>
         </div>
         <button onClick={onClose} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Đóng</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="px-6 space-y-6 pb-24">
        {/* Header Card */}
        <div className="bg-white p-7 rounded-[2.5rem] border border-indigo-50 shadow-soft relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors duration-500"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Tổng số dư gốc</p>
                <h3 className="text-3xl font-black text-indigo-900 tracking-tight">{currencyFormatter.format(totalBalance)}</h3>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner"><Landmark size={24} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lãi suất BQ</p>
                    <p className="text-sm font-black text-slate-700">{weightedRate.toFixed(2)}%<span className="text-[9px] text-slate-400 font-bold">/năm</span></p>
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng lãi dự kiến</p>
                    <p className="text-sm font-black text-emerald-600">~{currencyFormatter.format(totalExpectedInterest)}</p>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Banknote size={14} className="text-indigo-500"/> Các khoản gửi ({activeDeposits.length})
            </h4>
        </div>

        {/* Deposit List */}
        <div className="flex flex-col gap-4">
            {activeDeposits.map((deposit, idx) => {
                const stats = calculateFinancialStats({
                    principal: deposit.amount,
                    rate: deposit.interest_rate,
                    startDate: deposit.start_date,
                    endDate: deposit.end_date,
                    period: 'YEARLY'
                });

                return (
                    <div key={deposit.id || idx} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-100">
                                    #{idx + 1}
                                </div>
                                <div>
                                    <p className="text-base font-black text-slate-900">{currencyFormatter.format(deposit.amount)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {deposit.interest_rate}% / {deposit.term_months} tháng
                                    </p>
                                </div>
                            </div>
                            {stats.isExpired && (
                                <span className="bg-emerald-100 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wide">Đáo hạn</span>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>{new Date(deposit.start_date).toLocaleDateString('vi-VN')}</span>
                                <span>{new Date(deposit.end_date).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${stats.isExpired ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                    style={{ width: `${stats.progress}%` }} 
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-500">Lãi ~{currencyFormatter.format(stats.estimatedInterest)}</span>
                                <span className={`text-[9px] font-black uppercase ${stats.isExpired ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                    {stats.isExpired ? 'Sẵn sàng rút' : `Còn ${stats.daysRemaining} ngày`}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-slate-50">
                            <button 
                                onClick={() => { setSelectedDepositId(deposit.id); setActiveModal('SETTLE'); }}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 ${stats.isExpired ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {stats.isExpired ? <CheckCircle2 size={12} /> : <Archive size={12} />}
                                {stats.isExpired ? 'Tất toán ngay' : 'Rút trước hạn'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {activeModal === 'SETTLE' && (
        <SettleSavingsModal 
            account={account} 
            onClose={() => setActiveModal(null)} 
            onSuccess={() => { setActiveModal(null); onClose(); }} 
            targetUid={targetUid} 
            depositId={selectedDepositId || undefined}
        />
      )}
      {/* Renew modal logic would need updates similar to Settle if we want per-deposit renew, but for now Settle is priority */}
      {activeModal === 'RENEW' && <RenewSavingsModal account={account} onClose={() => setActiveModal(null)} targetUid={targetUid} />}
    </div>
  );
};

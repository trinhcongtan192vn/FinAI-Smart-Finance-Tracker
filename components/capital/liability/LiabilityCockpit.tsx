
import React from 'react';
import { TrendingUp, Info, Check, X, Edit2, Sparkles } from 'lucide-react';
import { currencyFormatter } from '../../../lib/utils';
import { AmortizationSchedule } from '../AmortizationSchedule';
import { Account, LiabilityDetails } from '../../../types';

interface LiabilityCockpitProps {
  account: Account;
  details: LiabilityDetails | undefined;
  debtStats: { progress: number; paidAmount: number; original: number };
  isEditingRate: boolean;
  setIsEditingRate: (v: boolean) => void;
  newRate: string;
  setNewRate: (v: string) => void;
  handleUpdateRate: () => void;
  onRepay: (item: any) => void; // Added prop
}

export const LiabilityCockpit: React.FC<LiabilityCockpitProps> = ({
  account, details, debtStats, isEditingRate, setIsEditingRate, newRate, setNewRate, handleUpdateRate, onRepay
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-10">
       {/* Debt Progress Card */}
       <div className="bg-slate-900 text-white p-7 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[50px] -mr-16 -mt-16"></div>
          <div className="flex justify-between items-start relative z-10 mb-6">
             <div>
                <p className="text-orange-300 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">Tiến độ trả nợ</p>
                <h2 className="text-4xl font-black">{debtStats.progress.toFixed(1)}%</h2>
             </div>
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                <TrendingUp size={24} className="text-orange-400" />
             </div>
          </div>
          
          <div className="space-y-4 relative z-10">
             <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div className="h-full bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${debtStats.progress}%` }}></div>
             </div>
             <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                   <p className="text-[8px] font-black text-white/40 uppercase mb-1">Đã trả gốc</p>
                   <p className="text-xs font-bold text-emerald-400">{currencyFormatter.format(debtStats.paidAmount)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-white/40 uppercase mb-1">Gốc còn lại</p>
                   <p className="text-xs font-bold text-white">{currencyFormatter.format(details?.principal_amount || 0)}</p>
                </div>
             </div>
          </div>
       </div>

       {/* Loan Summary & Rate Adjustment */}
       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={12} className="text-indigo-500" /> Thông tin khoản vay
             </h4>
             {isEditingRate ? (
                <div className="flex items-center gap-2">
                   <button onClick={handleUpdateRate} className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><Check size={14}/></button>
                   <button onClick={() => setIsEditingRate(false)} className="bg-slate-100 text-slate-400 p-1.5 rounded-lg"><X size={14}/></button>
                </div>
             ) : (
                <button onClick={() => setIsEditingRate(true)} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                   <Edit2 size={10} /> Điều chỉnh lãi
                </button>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Ngày bắt đầu</p>
                <p className="text-xs font-black text-slate-800">{new Date(details?.start_date || '').toLocaleDateString('vi-VN')}</p>
             </div>
             <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Ngày kết thúc</p>
                <p className="text-xs font-black text-slate-800">{details?.end_date ? new Date(details.end_date).toLocaleDateString('vi-VN') : 'Không thời hạn'}</p>
             </div>
             <div className="col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Lãi suất thực tế</p>
                   {isEditingRate ? (
                      <div className="flex items-center gap-1">
                         <input 
                            type="number" 
                            value={newRate} 
                            onChange={(e) => setNewRate(e.target.value)} 
                            className="w-16 bg-white border border-indigo-200 rounded px-2 py-0.5 text-sm font-bold text-indigo-600 outline-none" 
                            autoFocus
                         />
                         <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                   ) : (
                      <p className="text-sm font-black text-indigo-600">{details?.interest_rate}% <span className="text-[9px] text-slate-400 font-bold">/năm</span></p>
                   )}
                </div>
                {details?.grace_period_months ? (
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Ân hạn gốc</p>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{details.grace_period_months} tháng</span>
                   </div>
                ) : null}
             </div>
          </div>
       </div>

       {details && <AmortizationSchedule details={details} currentBalance={details.principal_amount} onRepay={onRepay} />}
       
       <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
          <Sparkles size={20} className="text-indigo-600 shrink-0" />
          <p className="text-[10px] font-medium text-indigo-900 leading-relaxed uppercase">
            Bạn đã thanh toán <strong>{currencyFormatter.format(debtStats.paidAmount)}</strong> kể từ khi bắt đầu vay <strong>{currencyFormatter.format(debtStats.original)}</strong>.
          </p>
       </div>
    </div>
  );
};


import React from 'react';
import { Target, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, ExternalLink, Briefcase, Info, Database, Trash2 } from 'lucide-react';
import { currencyFormatter } from '../../../lib/utils';
import { Account } from '../../../types';

interface EquityFundCockpitProps {
  account: Account;
  stats: { totalIn: number; totalOut: number; profit: number };
  linkedAssets: Account[];
  unlinkedCash: number;
  onAction: (type: 'TRANSFER' | 'WITHDRAW' | 'DELETE') => void;
  setTransferAmount: (val: string) => void;
  setTargetFundId: (val: string) => void;
}

export const EquityFundCockpit: React.FC<EquityFundCockpitProps> = ({
  account, stats, linkedAssets, unlinkedCash, onAction, setTransferAmount, setTargetFundId
}) => {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
       {/* Balance Card */}
       <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] -mr-16 -mt-16"></div>
         <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
               <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Số dư khả dụng của quỹ</p>
               <h2 className="text-4xl font-black">{currencyFormatter.format(account.current_balance)}</h2>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
               <Target size={24} className="text-indigo-400" />
            </div>
         </div>
         
         <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-end">
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tỷ lệ mục tiêu</span>
               <span className="text-xs font-black text-indigo-400">{account.target_ratio || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${account.target_ratio || 0}%` }}></div>
            </div>
         </div>
       </div>

       {/* Fund Flow Stats */}
       <div className="grid grid-cols-2 gap-3">
           <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2 mb-2">
                   <ArrowDownLeft size={14} className="text-emerald-500"/>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền vào</p>
               </div>
               <p className="text-sm font-black text-emerald-600">{currencyFormatter.format(stats.totalIn)}</p>
           </div>
           <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2 mb-2">
                   <ArrowUpRight size={14} className="text-red-500"/>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền ra</p>
               </div>
               <p className="text-sm font-black text-red-600">{currencyFormatter.format(stats.totalOut)}</p>
           </div>
       </div>

       {/* Actions Grid */}
       <div className="grid grid-cols-2 gap-3">
           <button onClick={() => { onAction('TRANSFER'); setTransferAmount(''); setTargetFundId(''); }} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:border-indigo-100 transition-all active:scale-95 group">
               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors"><ArrowRightLeft size={20} /></div>
               <span className="text-[10px] font-black uppercase text-slate-600">Điều chuyển vốn</span>
           </button>
           <button onClick={() => { onAction('WITHDRAW'); setTransferAmount(account.current_balance.toString()); }} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:border-orange-100 transition-all active:scale-95 group">
               <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors"><ExternalLink size={20} /></div>
               <span className="text-[10px] font-black uppercase text-slate-600">Rút vốn</span>
           </button>
       </div>

       {/* Allocation Cockpit */}
       <div className="space-y-4">
         <div className="flex items-center justify-between px-1">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={12} /> Tiền của quỹ đang ở đâu?
           </h4>
           <span className="text-[8px] font-black text-slate-300 uppercase">Physical Allocation</span>
         </div>

         <div className="flex flex-col gap-3">
            {linkedAssets.length === 0 && unlinkedCash <= 0 ? (
              <div className="py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                 <Info size={24} className="opacity-20" />
                 <p className="text-[10px] font-bold uppercase tracking-widest">Chưa có phân bổ tài sản</p>
              </div>
            ) : (
              <>
                {linkedAssets.map(asset => (
                  <div key={asset.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm group">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                           <Database size={18} />
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-800">{asset.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">{asset.category}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{currencyFormatter.format(asset.current_balance)}</p>
                        <p className="text-[9px] font-bold text-indigo-500">{( (asset.current_balance / (account.current_balance || 1)) * 100 ).toFixed(1)}%</p>
                     </div>
                  </div>
                ))}
                
                {unlinkedCash > 1000 && (
                   <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white text-indigo-400 flex items-center justify-center shadow-sm">
                           <ArrowRightLeft size={18} />
                        </div>
                        <div>
                           <p className="text-xs font-black text-indigo-900">Tiền lẻ / Chưa phân bổ</p>
                           <p className="text-[9px] font-bold text-indigo-400 uppercase">Unlinked Liquidity</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-indigo-600">{currencyFormatter.format(unlinkedCash)}</p>
                        <p className="text-[9px] font-bold text-indigo-400">{( (unlinkedCash / (account.current_balance || 1)) * 100 ).toFixed(1)}%</p>
                     </div>
                  </div>
                )}
              </>
            )}
         </div>
       </div>

       <div className="pt-4 border-t border-slate-100 flex justify-center">
           <button onClick={() => onAction('DELETE')} className="flex items-center gap-2 text-[10px] font-black text-slate-300 hover:text-red-500 transition-colors uppercase tracking-widest px-4 py-2">
               <Trash2 size={12} /> Xóa quỹ này vĩnh viễn
           </button>
       </div>
    </div>
  );
};

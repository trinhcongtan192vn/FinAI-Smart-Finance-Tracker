
import React from 'react';
import { AlertTriangle, Wallet } from 'lucide-react';
import { currencyFormatter } from '../../../lib/utils';
import { AmountInput } from '../../ui/AmountInput';
import { Account } from '../../../types';

interface SettleLiabilityFormProps {
  settlementInfo: { principal: number; interest: number; fee: number; total: number };
  manualFee: string;
  setManualFee: (val: string) => void;
  selectedCashId: string;
  setSelectedCashId: (val: string) => void;
  cashAccounts: Account[];
  accountName: string;
}

export const SettleLiabilityForm: React.FC<SettleLiabilityFormProps> = ({
  settlementInfo, manualFee, setManualFee, selectedCashId, setSelectedCashId, cashAccounts, accountName
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-7 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[50px] -mr-16 -mt-16"></div>
        <p className="text-orange-300 text-[10px] font-black uppercase tracking-[0.2em] mb-3 relative z-10">Tổng tiền cần thanh toán</p>
        <h2 className="text-4xl font-black relative z-10 tracking-tight">{currencyFormatter.format(settlementInfo.total)}</h2>
        
        <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-white/10 relative z-10">
          <div>
            <p className="text-[8px] font-black text-white/40 uppercase mb-1">Gốc</p>
            <p className="text-xs font-bold">{currencyFormatter.format(settlementInfo.principal)}</p>
          </div>
          <div>
            <p className="text-[8px] font-black text-white/40 uppercase mb-1">Lãi</p>
            <p className="text-xs font-bold">{currencyFormatter.format(settlementInfo.interest)}</p>
          </div>
          <div>
            <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Phí</p>
            <p className="text-xs font-bold text-orange-400">{currencyFormatter.format(settlementInfo.fee)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <AmountInput 
          label="Phí tất toán / phạt (Nhập tay)"
          value={manualFee}
          onChange={setManualFee}
        />
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Wallet size={12} /> Trích tiền từ</label>
          <select value={selectedCashId} onChange={e => setSelectedCashId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none">
            {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>)}
          </select>
        </div>
      </div>

      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
        <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
        <p className="text-[10px] font-medium text-orange-900 leading-relaxed uppercase">
          Hành động này sẽ <strong>đóng vĩnh viễn</strong> khoản nợ này sau khi thanh toán đầy đủ.
        </p>
      </div>
    </div>
  );
};

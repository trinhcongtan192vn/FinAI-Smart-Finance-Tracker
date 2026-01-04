
import React from 'react';
import { Landmark, Receipt, Plus, ChevronDown, Wallet } from 'lucide-react';
import { currencyFormatter } from '../../../lib/utils';
import { Account } from '../../../types';

interface RECapitalStructureFormProps {
  formData: any;
  useDebt: boolean;
  setUseDebt: (val: boolean) => void;
  debtAmount: string;
  setDebtAmount: (val: string) => void;
  equityVal: number;
  price: number;
  useNewFund: boolean;
  setUseNewFund: (val: boolean) => void;
  newFundName: string;
  setNewFundName: (val: string) => void;
  selectedFundId: string;
  setSelectedFundId: (val: string) => void;
  equityFunds: Account[];
  liabilities: Account[];
  selectedLiabilityId: string;
  setSelectedLiabilityId: (val: string) => void;
  cashAccounts: Account[];
  onInputChange: (key: string, val: any) => void;
}

export const RECapitalStructureForm: React.FC<RECapitalStructureFormProps> = ({
  formData, useDebt, setUseDebt, debtAmount, setDebtAmount, equityVal, price,
  useNewFund, setUseNewFund, newFundName, setNewFundName, selectedFundId, setSelectedFundId,
  equityFunds, liabilities, selectedLiabilityId, setSelectedLiabilityId, cashAccounts, onInputChange
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Cấu trúc vốn</h4>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={useDebt} onChange={e => setUseDebt(e.target.checked)} id="useDebt" className="w-4 h-4 rounded text-indigo-600" />
          <label htmlFor="useDebt" className="text-[10px] font-bold text-slate-500 uppercase">Có vay nợ</label>
        </div>
      </div>

      {formData.isInitialBalance ? (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2"><Landmark size={12} /> Nguồn vốn tự có</label>
          <div className="flex gap-2">
            <div className="flex-1">
              {useNewFund ? <input type="text" value={newFundName} onChange={e => setNewFundName(e.target.value)} placeholder="Tên quỹ mới" className="w-full px-3 py-3 bg-slate-50 border rounded-xl font-bold text-xs" /> : 
               <select value={selectedFundId} onChange={e => setSelectedFundId(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border rounded-xl font-bold text-xs appearance-none">{equityFunds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select>}
            </div>
            <button onClick={() => setUseNewFund(!useNewFund)} className="px-3 py-2 bg-slate-100 rounded-xl text-[9px] font-bold uppercase text-slate-500 shrink-0">{useNewFund ? 'Chọn' : 'Mới'}</button>
          </div>
          <p className="text-right text-[10px] font-black text-indigo-600">{currencyFormatter.format(equityVal)} ({((equityVal / (price || 1)) * 100).toFixed(0)}%)</p>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase ml-1 flex items-center gap-2"><Wallet size={12} /> Thanh toán từ</label>
          <select value={formData.sourceAccountId} onChange={e => onInputChange('sourceAccountId', e.target.value)} className="w-full px-3 py-3 bg-slate-50 border rounded-xl font-bold text-xs appearance-none">{cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select>
          <p className="text-right text-[10px] font-black text-emerald-600">{currencyFormatter.format(equityVal)} ({((equityVal / (price || 1)) * 100).toFixed(0)}%)</p>
        </div>
      )}

      {useDebt && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] font-black uppercase ml-1 flex items-center gap-2"><Receipt size={12} /> Nguồn nợ vay</label>
          <div className="flex gap-3">
            <input type="number" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} placeholder="Số tiền vay" className="flex-1 px-3 py-3 bg-white border border-orange-200 rounded-xl font-bold text-xs text-orange-600 outline-none" />
            <select value={selectedLiabilityId} onChange={e => setSelectedLiabilityId(e.target.value)} className="flex-[1.5] px-3 py-3 bg-slate-50 border rounded-xl font-bold text-xs appearance-none">{liabilities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          </div>
        </div>
      )}
    </div>
  );
};

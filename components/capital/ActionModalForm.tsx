
import React from 'react';
import { Info } from 'lucide-react';
import { Capital } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';

interface ActionModalFormProps {
  capital: Capital;
  actionType: 'interest' | 'principal' | 'inject' | 'withdraw';
  setActionType: (val: any) => void;
  amount: string;
  setAmount: (val: string) => void;
  note: string;
  setNote: (val: string) => void;
  estimatedInterest: number;
}

export const ActionModalForm: React.FC<ActionModalFormProps> = ({
  capital,
  actionType,
  setActionType,
  amount,
  setAmount,
  note,
  setNote,
  estimatedInterest
}) => {
  const useRecommended = () => {
    if (actionType === 'interest') setAmount(estimatedInterest.toString());
    else setAmount(capital.current_balance.toString());
  };

  const addPreset = (amt: number) => {
    setAmount((Number(amount || 0) + amt).toString());
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex p-1 bg-slate-100/50 rounded-2xl border border-slate-100 shadow-inner">
        {/* Fix: Comparison was unintentional because group is always 'CAPITAL' for this view. Identification should rely on category instead. */}
        {capital.category !== 'Equity Fund' ? (
          <>
            <button onClick={() => { setActionType('interest'); setAmount(''); }} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${actionType === 'interest' ? 'bg-white text-orange-600 shadow-sm border border-orange-50' : 'text-slate-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Interest</span>
            </button>
            <button onClick={() => { setActionType('principal'); setAmount(''); }} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${actionType === 'principal' ? 'bg-white text-indigo-600 shadow-sm border border-indigo-50' : 'text-slate-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Principal</span>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setActionType('inject'); setAmount(''); }} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${actionType === 'inject' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-50' : 'text-slate-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Add Fund</span>
            </button>
            <button onClick={() => { setActionType('withdraw'); setAmount(''); }} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${actionType === 'withdraw' ? 'bg-white text-red-600 shadow-sm border border-red-50' : 'text-slate-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Withdraw</span>
            </button>
          </>
        )}
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Amount</label>
            {/* Fix: Same logic fix here for identification of Liability sources vs Equity Funds */}
            {capital.category !== 'Equity Fund' && (
              <button onClick={useRecommended} className="text-[10px] font-black text-indigo-600 uppercase hover:underline transition-all active:scale-95">
                Use {actionType === 'interest' ? 'Est.' : 'Balance'}
              </button>
            )}
          </div>
          <AmountInput 
            value={amount}
            onChange={setAmount}
            autoFocus
          />
          
          <div className="grid grid-cols-5 gap-2 px-2 mt-1">
            {[100000, 500000, 1000000, 5000000, 10000000].map(amt => (
              <button 
                key={amt}
                onClick={() => addPreset(amt)}
                className="py-2 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-tight hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 transition-all active:scale-95"
              >
                +{amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}k`}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded-xl border border-slate-100/50">
            <p className="text-[10px] font-bold text-slate-400 italic">
              Balance: {currencyFormatter.format(capital.current_balance)}
            </p>
            {actionType === 'interest' && (
              <div className="flex items-center gap-1">
                <Info size={10} className="text-orange-400" />
                <p className="text-[10px] font-black text-orange-600">Est. {currencyFormatter.format(estimatedInterest)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Memo / Description</label>
          <input 
            type="text" 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Monthly installment or Top-up"
            className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-slate-200 transition-all"
          />
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { History, TrendingUp, TrendingDown, PiggyBank, Receipt, ExternalLink, Trash2, Info } from 'lucide-react';
import { Capital, CapitalTransaction } from '../../types';
import { currencyFormatter } from '../../lib/utils';

interface ActionModalHistoryProps {
  capital: Capital;
  permission: 'view' | 'edit' | 'owner';
  onDeleteTransaction: (id: string) => void;
  onNavigateToHistory?: (query: string) => void;
  onClose: () => void;
}

export const ActionModalHistory: React.FC<ActionModalHistoryProps> = ({
  capital,
  permission,
  onDeleteTransaction,
  onNavigateToHistory,
  onClose
}) => {
  const transactions = capital.capital_transactions || [];

  return (
    <div className="p-6 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Movement Logs</h4>
        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-md">
          {transactions.length} events
        </span>
      </div>
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-50 rounded-3xl">
            <History size={36} className="opacity-10" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Zero activity records</p>
          </div>
        ) : (
          transactions.slice().reverse().map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 group hover:border-indigo-100/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  tx.transaction_type === 'INJECT' ? 'bg-emerald-50 text-emerald-600' :
                  tx.transaction_type === 'WITHDRAW' ? 'bg-red-50 text-red-600' :
                  tx.transaction_type === 'PAY_PRINCIPAL' ? 'bg-indigo-50 text-indigo-600' :
                  'bg-orange-50 text-orange-600'
                }`}>
                  {tx.transaction_type === 'INJECT' ? <TrendingUp size={18} /> : 
                   tx.transaction_type === 'WITHDRAW' ? <TrendingDown size={18} /> :
                   tx.transaction_type === 'PAY_PRINCIPAL' ? <PiggyBank size={18} /> :
                   <Receipt size={18} />}
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-900 leading-none mb-1.5 capitalize">
                    {tx.transaction_type.toLowerCase().replace('_', ' ')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">{tx.date}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1.5">
                <p className="text-sm font-black text-slate-900 tracking-tight">
                  {currencyFormatter.format(tx.amount)}
                </p>
                <div className="flex items-center gap-2">
                  {tx.related_tx_id && (
                    <button 
                      onClick={() => {
                        if (onNavigateToHistory) {
                          onClose();
                          onNavigateToHistory(capital.name); 
                        }
                      }}
                      className="flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest transition-colors"
                    >
                      <ExternalLink size={10} />
                      Cashflow
                    </button>
                  )}
                  {permission === 'owner' && (
                    <button 
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

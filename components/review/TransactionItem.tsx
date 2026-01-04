
import React, { useMemo } from 'react';
import { currencyFormatter, getCategoryIcon } from '../../lib/utils';
import { Transaction, TransactionType, Account } from '../../types';
import { Database, Code, Terminal, Fingerprint, Wallet, CreditCard, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TransactionItemProps {
  item: Transaction;
  isSelected: boolean;
  isSaving: boolean;
  showDebug?: boolean;
  toggleSelection: (id: string) => void;
  paymentAccounts?: Account[];
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ 
    item, isSelected, isSaving, showDebug, toggleSelection, paymentAccounts = [], onUpdate 
}) => {
  const { t } = useTranslation();
  const { icon, bg: bgClass, text: colorClass } = getCategoryIcon(item.category);
  const isIncome = item.group === 'INCOME';

  const selectedSourceId = item.credit_account_id || '';

  const cashWallets = useMemo(() => paymentAccounts.filter(a => a.category === 'Cash'), [paymentAccounts]);
  const creditCards = useMemo(() => paymentAccounts.filter(a => a.category === 'Credit Card'), [paymentAccounts]);

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!onUpdate) return;
      const accountId = e.target.value;
      const account = paymentAccounts.find(a => a.id === accountId);
      
      if (account) {
          let newType = item.type;
          // Determine type based on account group
          if (account.group === 'CAPITAL' && account.category === 'Credit Card') {
              newType = TransactionType.CREDIT_SPENDING;
          } else if (account.group === 'ASSETS') {
              newType = TransactionType.DAILY_CASHFLOW;
          }

          onUpdate(item.id, {
              credit_account_id: account.id,
              type: newType
          });
      } else {
          // If clearing source (unlikely with select), revert to default
          onUpdate(item.id, {
              credit_account_id: '',
              type: TransactionType.DAILY_CASHFLOW
          });
      }
  };

  const getAccountPreviewNames = () => {
    let debit = "Spending Fund";
    let credit = "Cash Wallet";

    switch (item.type) {
      case TransactionType.CREDIT_SPENDING:
        debit = "Spending Fund";
        credit = paymentAccounts.find(a => a.id === item.credit_account_id)?.name || "Credit Card";
        break;
      case TransactionType.INTERNAL_TRANSFER:
        credit = item.from_account_name || "Source Wallet";
        debit = item.to_account_name || "Target Wallet";
        break;
      // ... (other cases remain same)
      case TransactionType.DAILY_CASHFLOW:
      default:
        if (item.group === 'INCOME') {
          debit = "Cash Wallet";
          credit = "Spending Fund";
        } else {
          debit = "Spending Fund";
          credit = paymentAccounts.find(a => a.id === item.credit_account_id)?.name || "Cash Wallet";
        }
        break;
    }
    return { debit, credit };
  };

  const { debit: debitName, credit: creditName } = getAccountPreviewNames();

  // Only show source selector for expenses if user has credit cards
  const showSourceSelector = !isIncome && 
    (item.type === TransactionType.DAILY_CASHFLOW || item.type === TransactionType.CREDIT_SPENDING) && 
    creditCards.length > 0;

  return (
    <label 
      className={`group relative w-full bg-white rounded-3xl shadow-soft p-5 flex flex-col gap-4 cursor-pointer transition-all hover:shadow-glow hover:-translate-y-0.5 border ${isSelected ? 'border-indigo-100' : 'border-transparent'}`}
    >
      <div className="flex flex-row gap-4 items-start">
        <div className="flex-none pt-2">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(item.id)}
            className="custom-checkbox w-6 h-6 rounded-full border-2 border-slate-200 text-primary focus:ring-primary/20 cursor-pointer transition-all appearance-none" 
            disabled={isSaving}
          />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                {currencyFormatter.format(item.amount)}
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {item.group}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {item.date}
              </p>
            </div>
            <div className={`size-10 rounded-2xl ${bgClass} ${colorClass} flex items-center justify-center shadow-sm`}>
              <span className="material-symbols-outlined">{icon}</span>
            </div>
          </div>
          
          <div className="w-full h-px bg-slate-50 my-1"></div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Category</span>
              <span className="text-sm font-bold text-slate-800">{item.category}</span>
            </div>
            
            {showSourceSelector && onUpdate && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Paid via</span>
                    <div className="relative">
                        <select 
                            value={selectedSourceId}
                            onChange={handleSourceChange}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg py-1 pl-7 pr-6 focus:outline-none focus:border-indigo-300 transition-colors cursor-pointer"
                        >
                            <option value="">{t('assets.cash_wallet')}</option>
                            <optgroup label={t('assets.cash_wallet')}>
                                {cashWallets.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </optgroup>
                            {creditCards.length > 0 && (
                                <optgroup label={t('capital.credit_cards')}>
                                    {creditCards.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            {item.type === TransactionType.CREDIT_SPENDING ? <CreditCard size={12}/> : <Wallet size={12}/>}
                        </div>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            )}

            <div className="flex items-start gap-2 mt-1">
              <span className="material-symbols-outlined text-indigo-500 text-[18px] mt-0.5">auto_awesome</span>
              <p className="text-sm font-medium text-slate-600 leading-snug bg-slate-50 p-2 rounded-lg w-full border border-slate-100">
                {item.note}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDebug && (
        <div className="mt-2 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-indigo-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Double-Entry Preview</span>
              </div>
              <div className="flex items-center gap-1">
                 <Fingerprint size={10} className="text-slate-300" />
                 <span className="text-[8px] font-mono text-slate-300 uppercase">{item.id.substring(0,8)}</span>
              </div>
           </div>
           
           <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden border border-slate-800 shadow-inner">
              <pre className="text-[10px] font-mono leading-relaxed text-indigo-300 overflow-x-auto no-scrollbar">
                {JSON.stringify({
                  Debit: debitName,
                  Credit: creditName,
                  Type: item.type,
                  CreditID: item.credit_account_id
                }, null, 2)}
              </pre>
           </div>
        </div>
      )}
    </label>
  );
};

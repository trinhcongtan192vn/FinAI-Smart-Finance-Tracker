
import React, { useMemo } from 'react';
import { Wallet, ArrowRightLeft } from 'lucide-react';
import { Account } from '../../../types';
import { currencyFormatter } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

interface GroupProps {
  accounts: Account[];
  onAction: (acc: Account, action: any) => void;
  mergeMode?: boolean;
  onEnterMergeMode?: () => void;
  onSelect?: (id: string) => void;
  selectedIds?: Set<string>;
  t: any;
  totalValue: number;
}

const GroupHeader = ({ title, icon: Icon, onMerge, mergeMode, count, totalValue, colorClass, bgClass, t }: any) => (
  <div className="flex flex-col gap-2 mb-3 px-1">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Icon size={14} className={colorClass} /> {title}
      </h3>
      <div className="flex items-center gap-2">
        {!mergeMode && count > 1 && (
          <button 
            onClick={onMerge}
            className={`text-[10px] font-black uppercase ${colorClass} ${bgClass} px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:opacity-80 transition-all border border-current/10 shadow-sm active:scale-95`}
          >
            Merge {t('common.merge')}
          </button>
        )}
      </div>
    </div>
    {totalValue !== undefined && (
        <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total:</span>
            <span className={`text-base font-black ${colorClass} tracking-tight`}>{currencyFormatter.format(totalValue)}</span>
        </div>
    )}
  </div>
);

export const CashWalletList: React.FC<Omit<GroupProps, 't' | 'totalValue'>> = ({ accounts, onAction, mergeMode, onEnterMergeMode, onSelect, selectedIds }) => {
  const { t } = useTranslation();
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('assets.cash_wallet')} 
        icon={Wallet} 
        onMerge={onEnterMergeMode} 
        mergeMode={mergeMode} 
        count={accounts.length} 
        t={t} 
        totalValue={totalValue}
        colorClass="text-emerald-600"
        bgClass="bg-emerald-50"
      />
      <div className="grid grid-cols-1 gap-3">
        {accounts.map(acc => (
          <div 
            key={acc.id} 
            onClick={() => mergeMode ? onSelect?.(acc.id) : onAction(acc, 'HISTORY')}
            className={`bg-white p-5 rounded-[2rem] shadow-soft border flex items-center justify-between group cursor-pointer active:scale-95 transition-all ${mergeMode && selectedIds?.has(acc.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50'}`}
          >
            <div className="flex items-center gap-4">
              {mergeMode ? (
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds?.has(acc.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                   {selectedIds?.has(acc.id) && <ArrowRightLeft size={12} className="text-white" />}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet size={24} />
                </div>
              )}
              <div>
                 <p className="text-sm font-black text-slate-900">{acc.name}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('assets.desc.liquid')}</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-lg font-black text-emerald-600">{currencyFormatter.format(acc.current_balance)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

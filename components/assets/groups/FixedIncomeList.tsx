
import React, { useMemo } from 'react';
import { Banknote, Check } from 'lucide-react';
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
            Merge
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

export const FixedIncomeList: React.FC<GroupProps> = ({ accounts, onAction, mergeMode, onEnterMergeMode, onSelect, selectedIds }) => {
  const { t } = useTranslation();
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);
  
  const getProgress = (acc: Account) => {
    if (!acc.details) return null;
    const start = new Date(acc.details.start_date).getTime();
    const end = new Date(acc.details.end_date).getTime();
    const now = new Date().getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('assets.fixed_income')} 
        icon={Banknote} 
        onMerge={onEnterMergeMode} 
        mergeMode={mergeMode} 
        count={accounts.length} 
        t={t} 
        totalValue={totalValue}
        colorClass="text-blue-600"
        bgClass="bg-blue-50"
      />
      <div className="flex flex-col gap-3">
        {accounts.map(acc => {
          const progress = getProgress(acc);
          return (
            <div 
              key={acc.id} 
              onClick={() => mergeMode ? onSelect?.(acc.id) : onAction(acc, 'COCKPIT')}
              className={`bg-white p-5 rounded-[2rem] shadow-soft border flex flex-col gap-3 group cursor-pointer active:scale-95 transition-all ${mergeMode && selectedIds?.has(acc.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {mergeMode ? (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds?.has(acc.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                       {selectedIds?.has(acc.id) && <Check size={12} className="text-white" />}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Banknote size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                     <p className="text-sm font-black text-slate-900 truncate">{acc.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{acc.interest_rate}% APR</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-base font-black text-slate-900">{currencyFormatter.format(acc.current_balance)}</p>
                </div>
              </div>

              {progress !== null && !mergeMode && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                    <span>{t('assets.desc.maturity_progress')}</span>
                    <span className="text-indigo-600">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};


import React, { useMemo } from 'react';
import { ArrowRightLeft, Users, Check } from 'lucide-react';
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
  onOpenContacts?: () => void;
}

const GroupHeader = ({ title, icon: Icon, onMerge, mergeMode, count, totalValue, colorClass, bgClass, t, onContacts }: any) => (
  <div className="flex flex-col gap-2 mb-3 px-1">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Icon size={14} className={colorClass} /> {title}
      </h3>
      <div className="flex items-center gap-2">
        {onContacts && (
          <button 
            onClick={onContacts}
            className={`text-[9px] font-black uppercase ${colorClass} ${bgClass} px-2 py-1 rounded-lg flex items-center gap-1 hover:opacity-80 transition-all border border-current/10 shadow-sm active:scale-95`}
          >
            <Users size={10} /> {t('common.contacts')}
          </button>
        )}
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

export const ReceivablesList: React.FC<GroupProps> = ({ accounts, onAction, mergeMode, onEnterMergeMode, onSelect, selectedIds, onOpenContacts }) => {
  const { t } = useTranslation();
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('assets.receivables')} 
        icon={ArrowRightLeft} 
        onMerge={onEnterMergeMode} 
        mergeMode={mergeMode} 
        count={accounts.length} 
        onContacts={onOpenContacts}
        t={t}
        totalValue={totalValue}
        colorClass="text-purple-600"
        bgClass="bg-purple-50"
      />
      <div className="grid grid-cols-1 gap-3">
        {accounts.length === 0 ? (
          <div className="py-8 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
             <p className="text-[9px] font-black uppercase tracking-widest">{t('capital.desc.no_debt')}</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div 
              key={acc.id} 
              onClick={() => mergeMode ? onSelect?.(acc.id) : onAction(acc, 'COCKPIT')}
              className={`bg-white p-5 rounded-[2rem] shadow-soft border flex items-center justify-between group cursor-pointer active:scale-95 transition-all ${mergeMode && selectedIds?.has(acc.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50'}`}
            >
              <div className="flex items-center gap-4">
                {mergeMode ? (
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds?.has(acc.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                     {selectedIds?.has(acc.id) && <Check size={12} className="text-white" />}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ArrowRightLeft size={24} />
                  </div>
                )}
                <div>
                   <p className="text-sm font-black text-slate-900">{acc.name}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('assets.desc.receivable')}</p>
                </div>
              </div>
              <div className="text-right">
                 <p className="text-lg font-black text-amber-600">{currencyFormatter.format(acc.current_balance)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

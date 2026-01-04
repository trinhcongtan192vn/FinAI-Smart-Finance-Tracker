
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, History, Trash2, Merge, Check, PiggyBank, Receipt, Landmark, ChevronRight, Users } from 'lucide-react';
import { Account } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface GroupProps {
  accounts: Account[];
  onAction: (acc: Account, historyFirst: boolean) => void;
  onDelete: (id: string) => void;
  mergeMode?: boolean;
  onEnterMergeMode?: () => void;
  onSelect?: (id: string) => void;
  selectedIds?: Set<string>;
  onOpenContacts?: () => void;
}

const GroupHeader = ({ title, icon: Icon, onMerge, mergeMode, count, onContacts, colorClass = "text-indigo-500", bgClass = "bg-indigo-50", t }: any) => (
  <div className="flex items-center justify-between px-1 mb-2">
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
          <Merge size={12} /> {t('common.merge')}
        </button>
      )}
    </div>
  </div>
);

export const EquityGroup: React.FC<GroupProps> = ({ accounts, onAction, onDelete, mergeMode, onEnterMergeMode, onSelect, selectedIds }) => {
  const { t } = useTranslation();
  // Tính tổng Equity để làm mẫu số cho %
  const totalEquity = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('capital.equity_funds')}
        icon={PiggyBank} 
        onMerge={onEnterMergeMode} 
        mergeMode={mergeMode} 
        count={accounts.length} 
        t={t}
      />
      <div className="grid grid-cols-1 gap-3">
        {accounts.map(eq => {
          // Tính % tỷ trọng
          const pct = totalEquity > 0 ? ((eq.current_balance || 0) / totalEquity) * 100 : 0;

          return (
            <div 
              key={eq.id} 
              onClick={() => mergeMode ? onSelect?.(eq.id) : onAction(eq, false)}
              className={`bg-white p-5 rounded-[2.5rem] shadow-soft border flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden ${mergeMode && selectedIds?.has(eq.id) ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-100' : 'border-slate-50'}`}
            >
              <div className="flex items-center gap-4">
                {mergeMode ? (
                  <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${selectedIds?.has(eq.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-transparent'}`}>
                    <Check size={20} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/50 group-hover:scale-105 transition-transform" style={{ backgroundColor: eq.color_code ? `${eq.color_code}15` : undefined, color: eq.color_code }}>
                    <TrendingUp size={24} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate leading-tight">{eq.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{eq.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900 tracking-tight">{currencyFormatter.format(eq.current_balance)}</p>
                <div className="flex justify-end mt-0.5">
                   <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                     {pct.toFixed(1)}%
                   </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const LiabilityGroup: React.FC<GroupProps> = ({ accounts, onDelete, onAction, mergeMode, onEnterMergeMode, onSelect, selectedIds, onOpenContacts }) => {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('capital.liabilities')}
        icon={Receipt} 
        onMerge={onEnterMergeMode} 
        mergeMode={mergeMode} 
        count={accounts.length} 
        onContacts={onOpenContacts}
        colorClass="text-orange-600" 
        bgClass="bg-orange-50" 
        t={t}
      />
      <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-50 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('capital.table.source')}</th>
              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('capital.table.outstanding')}</th>
              <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('capital.table.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {accounts.length === 0 ? (
               <tr>
                 <td colSpan={3} className="px-5 py-10 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">{t('capital.desc.no_debt')}</td>
               </tr>
            ) : accounts.map(loan => (
              <tr 
                key={loan.id} 
                className={`group hover:bg-slate-50/50 transition-colors cursor-pointer ${mergeMode && selectedIds?.has(loan.id) ? 'bg-orange-50/30' : ''}`}
                onClick={() => mergeMode ? onSelect?.(loan.id) : onAction(loan, false)}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {mergeMode ? (
                      <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds?.has(loan.id) ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-200 text-transparent'}`}>
                        <Check size={16} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Landmark size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 uppercase truncate">{loan.name}</p>
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">{loan.interest_rate}% APR</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <p className="text-xs font-black text-slate-900">{currencyFormatter.format(loan.current_balance)}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAction(loan, true); }} 
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <History size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

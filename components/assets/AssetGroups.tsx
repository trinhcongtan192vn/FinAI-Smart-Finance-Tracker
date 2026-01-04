
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, History, Trash2, Merge, Check, PiggyBank, Receipt, Landmark, ChevronRight, Users, Wallet, ArrowRightLeft, Banknote, Activity, Home } from 'lucide-react';
import { Account } from '../../types';
import { currencyFormatter, calculateInvestmentPerformance, percentFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface GroupProps {
  accounts: Account[];
  onAction: (acc: Account, action: any) => void;
  onDelete: (id: string) => void;
  mergeMode?: boolean;
  onEnterMergeMode?: () => void;
  onSelect?: (id: string) => void;
  selectedIds?: Set<string>;
  onOpenContacts?: () => void;
  getIcon?: (cat: string) => React.ReactNode;
}

const GroupHeader = ({ title, icon: Icon, onMerge, mergeMode, count, onContacts, colorClass = "text-indigo-500", bgClass = "bg-indigo-50", t, totalValue }: any) => (
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
            <Merge size={12} /> {t('common.merge')}
          </button>
        )}
      </div>
    </div>
    {totalValue !== undefined && (
        <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tổng giá trị:</span>
            <span className={`text-base font-black ${colorClass} tracking-tight`}>{currencyFormatter.format(totalValue)}</span>
        </div>
    )}
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
        totalValue={totalEquity}
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
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

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
        totalValue={totalValue}
      />
      <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{t('capital.table.source')}</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('capital.table.outstanding')}</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('capital.table.action')}</th>
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
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <p className="text-xs font-black text-slate-900">{currencyFormatter.format(loan.current_balance)}</p>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
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
      </div>
    </section>
  );
};

export const CashWalletList: React.FC<GroupProps> = ({ accounts, onAction, mergeMode, onEnterMergeMode, onSelect, selectedIds }) => {
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
                     {selectedIds?.has(acc.id) && <ArrowRightLeft size={12} className="text-white" />}
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
                       {selectedIds?.has(acc.id) && <ArrowRightLeft size={12} className="text-white" />}
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

export const MarketVolatileList: React.FC<GroupProps> = ({ accounts, onAction, getIcon }) => {
  const { t } = useTranslation();
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('assets.market_assets')} 
        icon={Activity} 
        count={accounts.length} 
        t={t} 
        totalValue={totalValue}
        colorClass="text-indigo-500"
        bgClass="bg-indigo-50"
      />
      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{t('assets.table.asset')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.price_wac')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.pnl_roi')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.balance')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {accounts.map(acc => {
                const perf = calculateInvestmentPerformance(acc.investment_details);
                return (
                  <tr key={acc.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${acc.category === 'Crypto' ? 'bg-orange-50 text-orange-500' : 'bg-indigo-50 text-indigo-500'}`}>
                          {getIcon && getIcon(acc.category)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-900 uppercase truncate leading-tight max-w-[100px]">{acc.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{acc.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-indigo-600 leading-tight">
                          {acc.investment_details?.market_price ? currencyFormatter.format(acc.investment_details.market_price) : '—'}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                          Cost: {acc.investment_details?.avg_price ? currencyFormatter.format(acc.investment_details.avg_price) : '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {perf ? (
                        <div className="flex flex-col">
                          <p className={`text-[9px] font-black leading-tight ${perf.isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {perf.isProfit ? '+' : ''}{currencyFormatter.format(perf.unrealizedPnL)}
                          </p>
                          <p className={`text-[8px] font-bold mt-0.5 ${perf.isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {perf.isProfit ? '+' : ''}{percentFormatter.format(perf.roi)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-300 font-black">—</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <p className="text-[10px] font-black text-slate-900">{currencyFormatter.format(acc.current_balance)}</p>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onAction(acc, 'REVALUE')} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-indigo-600 transition-colors" title={t('assets.actions.revalue')}><Activity size={12}/></button>
                        <button onClick={() => onAction(acc, 'HISTORY')} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title={t('assets.actions.history')}><History size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export const RealEstateList: React.FC<GroupProps> = ({ accounts, onAction }) => {
  const { t } = useTranslation();
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('assets.real_estate')} 
        icon={Home} 
        count={accounts.length} 
        t={t} 
        totalValue={totalValue}
        colorClass="text-emerald-600"
        bgClass="bg-emerald-50"
      />
      <div className="grid grid-cols-1 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-slate-50 flex flex-col gap-5 group overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/30">
                  <Home size={24} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-slate-900 font-black text-base truncate">{acc.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">{t('assets.desc.portfolio')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900">{currencyFormatter.format(acc.current_balance)}</p>
              </div>
            </div>
            <div className="flex gap-2 relative z-10">
              <button onClick={() => onAction(acc, 'COCKPIT')} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                {t('assets.actions.history')} & {t('common.details')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

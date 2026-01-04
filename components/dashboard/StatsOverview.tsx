
import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Landmark, Coins, X, Info } from 'lucide-react';
import { currencyFormatter, getCategoryIcon, formatCurrencyCompact, getCategoryLabel } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface StatsOverviewProps {
  stats: {
    income: number;
    expense: number;
    debt: number;
    equity: number;
    incomeTrend: number;
    expenseTrend: number;
    prevStats: {
      income: number;
      expense: number;
      debt: number;
      equity: number;
    };
    lists: {
      income: any[];
      expense: any[];
      debt: any[];
      equity: any[];
    };
  };
  isVisible?: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, isVisible = true }) => {
  const { t } = useTranslation();
  const [drillDown, setDrillDown] = useState<{ type: string; list: any[]; title: string; color: string } | null>(null);

  const calcDebtTrend = stats.prevStats.debt > 0 ? ((stats.debt - stats.prevStats.debt) / stats.prevStats.debt) * 100 : 0;
  const calcEquityTrend = stats.prevStats.equity > 0 ? ((stats.equity - stats.prevStats.equity) / stats.prevStats.equity) * 100 : 0;

  const pillars = [
    {
      id: 'income',
      label: t('stats.total_income'),
      value: stats.income,
      prevValue: stats.prevStats.income,
      trend: stats.incomeTrend,
      icon: ArrowUp,
      bg: 'bg-indigo-600',
      text: 'text-white',
      subText: 'text-indigo-200',
      list: stats.lists.income,
      themeColor: 'text-indigo-600'
    },
    {
      id: 'expense',
      label: t('stats.total_expense'),
      value: stats.expense,
      prevValue: stats.prevStats.expense,
      trend: stats.expenseTrend,
      icon: ArrowDown,
      bg: 'bg-white',
      text: 'text-slate-900',
      subText: 'text-slate-400',
      list: stats.lists.expense,
      themeColor: 'text-rose-500'
    },
    {
      id: 'debt',
      label: t('stats.debt_repayment'),
      value: stats.debt,
      prevValue: stats.prevStats.debt,
      trend: calcDebtTrend,
      icon: Landmark,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      subText: 'text-amber-500/80',
      list: stats.lists.debt,
      themeColor: 'text-amber-600'
    },
    {
      id: 'equity',
      label: t('stats.equity_injection'),
      value: stats.equity,
      prevValue: stats.prevStats.equity,
      trend: calcEquityTrend,
      icon: Coins,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      subText: 'text-emerald-500/80',
      list: stats.lists.equity,
      themeColor: 'text-emerald-600'
    }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3 px-1">
         <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('stats.monthly_activity')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {pillars.map((p) => {
          const isPos = p.trend >= 0;
          return (
            <button
              key={p.id}
              onClick={() => setDrillDown({ type: p.id, list: p.list, title: p.label, color: p.themeColor })}
              className={`flex flex-col justify-between p-4 rounded-[1.75rem] ${p.bg} ${p.id === 'expense' ? 'border border-slate-100 shadow-soft' : p.id === 'income' ? 'shadow-lg shadow-indigo-100' : 'border border-transparent shadow-soft'} relative overflow-hidden h-40 group text-left transition-all active:scale-[0.98]`}
            >
              {p.id === 'income' && <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>}
              
              <div className="flex justify-between items-start">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${p.id === 'income' ? 'bg-white/20 backdrop-blur-md border border-white/10' : p.id === 'expense' ? 'bg-rose-50 border border-rose-100/50' : 'bg-white shadow-sm border border-slate-100'}`}>
                  <p.icon size={16} className={p.id === 'income' ? 'text-white' : p.id === 'expense' ? 'text-rose-500' : p.id === 'debt' ? 'text-amber-600' : 'text-emerald-600'} strokeWidth={3} />
                </div>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg ${p.id === 'income' ? 'backdrop-blur-sm border border-white/10 bg-emerald-500/20 text-emerald-100' : (p.trend <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}`}>
                  <span className="text-[8px] font-black">{p.trend > 0 ? '+' : ''}{Math.abs(p.trend).toFixed(0)}%</span>
                </div>
              </div>
              
              <div>
                <p className={`${p.subText} text-[9px] font-black uppercase tracking-wider mb-0.5`}>{p.label}</p>
                <p className={`text-[1.15rem] font-black tracking-tight ${p.text} mb-1.5`}>
                  {isVisible ? currencyFormatter.format(p.value) : '*******'}
                </p>
                <p className={`${p.subText} text-[8px] font-bold uppercase`}>
                  {t('stats.prev_month')}: {isVisible ? formatCurrencyCompact(p.prevValue) : '***'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drill Down Modal */}
      {drillDown && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDrillDown(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] relative z-10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50 shrink-0">
               <div>
                  <h3 className={`text-xl font-black ${drillDown.color} leading-tight`}>{drillDown.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('stats.drill_down_sub')}</p>
               </div>
               <button onClick={() => setDrillDown(null)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {drillDown.list.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                   <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center"><Info size={32} className="opacity-10" /></div>
                   <p className="text-xs font-black uppercase tracking-widest">{t('stats.no_transactions')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {drillDown.list.slice().sort((a,b) => b.datetime.localeCompare(a.datetime)).map((item, idx) => {
                    const { icon, bg, text } = getCategoryIcon(item.category);
                    const isInc = item.group === 'INCOME';
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${text} shrink-0`}>
                             <span className="material-symbols-outlined text-[20px]">{icon}</span>
                          </div>
                          <div className="min-w-0">
                             <p className="text-xs font-bold text-slate-900 truncate leading-tight">{item.note}</p>
                             <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">{item.datetime} • {getCategoryLabel(item.category, t)}</p>
                             </div>
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                           <p className={`text-sm font-black ${isInc ? 'text-emerald-600' : 'text-slate-900'}`}>
                             {isInc ? '+' : '-'}{currencyFormatter.format(item.amount)}
                           </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { currencyFormatter, getCategoryLabel } from '../../lib/utils';
import { PnLBreakdown } from '../../types';
import { useTranslation } from 'react-i18next';

interface PnLAnalysisCardProps {
  current: PnLBreakdown;
  previous: PnLBreakdown;
}

export const PnLAnalysisCard: React.FC<PnLAnalysisCardProps> = ({ current, previous }) => {
  const { t } = useTranslation();
  const [showCostDetails, setShowCostDetails] = useState(false);

  const calcGrowth = (curr: number, prev: number) => {
    if (prev === 0) return 0;
    return (curr - prev) / prev;
  };

  const incomeGrowth = calcGrowth(current.income.total, previous.income.total);
  const expenseGrowth = calcGrowth(current.expense.total, previous.expense.total);
  
  const fixedPct = current.expense.total > 0 ? (current.expense.fixed / current.expense.total) * 100 : 0;
  const variablePct = current.expense.total > 0 ? (current.expense.variable / current.expense.total) * 100 : 0;

  const prevFixedPct = previous.expense.total > 0 ? (previous.expense.fixed / previous.expense.total) * 100 : 0;
  const prevVariablePct = previous.expense.total > 0 ? (previous.expense.variable / previous.expense.total) * 100 : 0;

  const renderTrend = (value: number, type: 'income' | 'expense') => {
    const isPositive = value > 0;
    const isGood = type === 'income' ? isPositive : !isPositive; 
    const ColorIcon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isGood ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
    
    if (value === 0) return <span className="text-slate-400 text-xs font-bold flex items-center gap-1"><Minus size={12} /> 0%</span>;

    return (
      <span className={`text-xs font-black flex items-center gap-1 px-2 py-0.5 rounded-lg ${colorClass}`}>
        <ColorIcon size={12} />
        {Math.abs(value * 100).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* PnL Comparison */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-indigo-50/50 flex flex-col justify-between">
         <div className="flex items-center justify-between mb-4">
            <div>
               <h3 className="font-black text-slate-900 text-lg">{t('reports.monthly_pnl')}</h3>
               <div className="flex items-center gap-1 text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                  <Calendar size={10} /> {current.periodLabel}
               </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('reports.mom_change')}</span>
         </div>
         
         <div className="space-y-4">
            <div className="flex justify-between items-center">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('stats.total_income')}</span>
                  <span className="text-xl font-black text-emerald-600">{currencyFormatter.format(current.income.total)}</span>
               </div>
               {renderTrend(incomeGrowth, 'income')}
            </div>
            
            <div className="w-full h-px bg-slate-50"></div>

            <div className="flex justify-between items-center">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('stats.total_expense')}</span>
                  <span className="text-xl font-black text-rose-600">{currencyFormatter.format(current.expense.total)}</span>
               </div>
               {renderTrend(expenseGrowth, 'expense')}
            </div>
         </div>
      </div>

      {/* Cost Structure */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-indigo-50/50 flex flex-col justify-between">
         <div className="flex items-center justify-between mb-4">
            <div>
               <h3 className="font-black text-slate-900 text-lg">{t('reports.cost_structure')}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('reports.fixed_vs_variable')}</p>
            </div>
            <button 
                onClick={() => setShowCostDetails(!showCostDetails)} 
                className="w-8 h-8 flex items-center justify-center bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
            >
               {showCostDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
         </div>

         <div className="flex flex-col gap-6">
            {/* Current Month */}
            <div className="flex flex-col gap-1">
               <div className="flex justify-between items-end px-1 mb-1">
                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">{t('reports.this_month')}</span>
               </div>
               {/* 
                  FIX: Removed overflow-hidden from parent to allow tooltips to show.
                  Added first:rounded-l-full last:rounded-r-full to children to maintain shape.
               */}
               <div className="flex h-6 w-full rounded-full relative shadow-inner bg-slate-100">
                  {/* Fixed Section */}
                  <div 
                    className="h-full bg-indigo-500 flex items-center justify-center transition-all duration-1000 relative group cursor-help first:rounded-l-full last:rounded-r-full" 
                    style={{ width: `${fixedPct}%` }} 
                  >
                     <span className="text-[9px] font-bold text-white z-10 select-none">{fixedPct > 15 && `${fixedPct.toFixed(0)}%`}</span>
                     
                     {/* Enhanced Tooltip for Fixed */}
                     <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60] shadow-xl min-w-[140px]">
                        <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                           <span className="font-black text-indigo-300 uppercase tracking-wider">{t('manage_categories.type_fixed')}</span>
                           <span className="font-black">{currencyFormatter.format(current.expense.fixed)}</span>
                        </div>
                        <div className="space-y-1">
                           {current.expense.fixedList.length === 0 ? <span className="text-white/50 italic">{t('common.no_data')}</span> :
                            current.expense.fixedList.slice(0, 5).map((item, i) => (
                              <div key={i} className="flex justify-between gap-3">
                                 <span className="opacity-80 truncate max-w-[80px]">{getCategoryLabel(item.name, t)}</span>
                                 <span className="font-bold">{currencyFormatter.format(item.amount)}</span>
                              </div>
                           ))}
                        </div>
                        {/* Triangle pointer */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                     </div>
                  </div>
                  
                  {/* Variable Section */}
                  <div 
                    className="h-full bg-orange-400 flex items-center justify-center transition-all duration-1000 relative group cursor-help first:rounded-l-full last:rounded-r-full" 
                    style={{ width: `${variablePct}%` }} 
                  >
                     <span className="text-[9px] font-bold text-white z-10 select-none">{variablePct > 15 && `${variablePct.toFixed(0)}%`}</span>
                     
                     {/* Enhanced Tooltip for Variable */}
                     <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60] shadow-xl min-w-[140px]">
                        <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                           <span className="font-black text-orange-300 uppercase tracking-wider">{t('manage_categories.type_variable')}</span>
                           <span className="font-black">{currencyFormatter.format(current.expense.variable)}</span>
                        </div>
                        <div className="space-y-1">
                           {current.expense.variableList.length === 0 ? <span className="text-white/50 italic">{t('common.no_data')}</span> :
                            current.expense.variableList.slice(0, 5).map((item, i) => (
                              <div key={i} className="flex justify-between gap-3">
                                 <span className="opacity-80 truncate max-w-[80px]">{getCategoryLabel(item.name, t)}</span>
                                 <span className="font-bold">{currencyFormatter.format(item.amount)}</span>
                              </div>
                           ))}
                        </div>
                        {/* Triangle pointer */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                     </div>
                  </div>
               </div>
               <div className="flex justify-between px-1">
                  <span className="text-[9px] font-bold text-indigo-600">{currencyFormatter.format(current.expense.fixed)}</span>
                  <span className="text-[9px] font-bold text-orange-500">{currencyFormatter.format(current.expense.variable)}</span>
               </div>
            </div>

            {/* Details Panel (Collapsible) */}
            {showCostDetails && (
               <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                     <div className="p-3 bg-indigo-50 rounded-xl">
                        <p className="font-black text-[9px] text-indigo-400 uppercase tracking-widest mb-2">{t('manage_categories.type_fixed')} (Top 3)</p>
                        <div className="space-y-1">
                           {current.expense.fixedList.slice(0,3).map((item, i) => (
                              <div key={i} className="flex justify-between items-center">
                                 <span className="truncate max-w-[70px] text-indigo-900 font-bold">{getCategoryLabel(item.name, t)}</span>
                                 <span className="font-medium text-slate-500">{currencyFormatter.format(item.amount)}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="p-3 bg-orange-50 rounded-xl">
                        <p className="font-black text-[9px] text-orange-400 uppercase tracking-widest mb-2">{t('manage_categories.type_variable')} (Top 3)</p>
                        <div className="space-y-1">
                           {current.expense.variableList.slice(0,3).map((item, i) => (
                              <div key={i} className="flex justify-between items-center">
                                 <span className="truncate max-w-[70px] text-orange-900 font-bold">{getCategoryLabel(item.name, t)}</span>
                                 <span className="font-medium text-slate-500">{currencyFormatter.format(item.amount)}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Previous Month (Only show if not detailed view) */}
            {!showCostDetails && (
               <div className="flex flex-col gap-1 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-end px-1 mb-1">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('reports.last_month')}</span>
                  </div>
                  <div className="flex h-3 w-full rounded-full overflow-hidden relative bg-slate-100">
                     <div className="h-full bg-indigo-400 transition-all duration-1000" style={{ width: `${prevFixedPct}%` }}></div>
                     <div className="h-full bg-orange-300 transition-all duration-1000" style={{ width: `${prevVariablePct}%` }}></div>
                  </div>
                  <div className="flex justify-between px-1">
                     <span className="text-[8px] font-bold text-slate-400">{currencyFormatter.format(previous.expense.fixed)}</span>
                     <span className="text-[8px] font-bold text-slate-400">{currencyFormatter.format(previous.expense.variable)}</span>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

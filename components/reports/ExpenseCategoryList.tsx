
import React from 'react';
import { PieChart, Target } from 'lucide-react';
import { currencyFormatter, getCategoryColor, getCategoryIcon, getCategoryLabel } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface ExpenseCategoryListProps {
  categoryStats: any[];
  totalExpense: number;
  onSelectCategory: (category: string) => void;
  activeTab?: string;
}

export const ExpenseCategoryList: React.FC<ExpenseCategoryListProps> = ({ 
  categoryStats, 
  totalExpense, 
  onSelectCategory,
  activeTab = "Month"
}) => {
  const { t } = useTranslation();
  const showBudget = activeTab === "Month";

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <PieChart size={20} className="text-indigo-500" />
          Expense Breakdown
        </h2>
      </div>
      
      <div className="flex flex-col gap-3 pb-4">
          {categoryStats.length > 0 ? (
            categoryStats.map((cat, idx) => {
              const style = getCategoryColor(cat.name);
              const { icon } = getCategoryIcon(cat.name);
              const totalPercentage = totalExpense > 0 ? Math.round((cat.value / totalExpense) * 100) : 0;
              
              const hasBudget = cat.limit > 0;
              const budgetPercentage = hasBudget ? Math.round((cat.value / cat.limit) * 100) : 0;
              const isOver = hasBudget && cat.value > cat.limit;

              return (
                <div 
                    key={idx} 
                    onClick={() => onSelectCategory(cat.name)}
                    className="flex flex-col gap-3 bg-white p-5 rounded-[1.5rem] shadow-soft border border-slate-50 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`${style.bg} ${style.text} flex items-center justify-center rounded-2xl shrink-0 w-12 h-12 group-hover:scale-110 transition-transform shadow-sm`}>
                          <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-900 font-bold group-hover:text-indigo-600 transition-colors truncate">{getCategoryLabel(cat.name, t)}</p>
                        <p className="text-xs font-semibold text-slate-400">
                          {totalPercentage}% of Total
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-slate-900 font-black ${isOver && showBudget ? 'text-red-500' : ''}`}>
                        {currencyFormatter.format(cat.value)}
                      </p>
                      {showBudget && hasBudget && (
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isOver ? 'text-red-400' : 'text-slate-400'}`}>
                          Goal: {currencyFormatter.format(cat.limit)}
                        </p>
                      )}
                    </div>
                  </div>

                  {showBudget && hasBudget ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isOver ? 'text-red-500' : 'text-slate-500'}`}>
                          {isOver ? 'Exceeded' : 'Budget Usage'}
                        </span>
                        <span className={`text-[10px] font-black ${isOver ? 'text-red-500' : 'text-indigo-600'}`}>
                          {budgetPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : ''}`} 
                            style={{ 
                              width: `${Math.min(100, budgetPercentage)}%`, 
                              backgroundColor: isOver ? undefined : style.bar 
                            }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${totalPercentage}%`, backgroundColor: style.bar }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-slate-50 flex flex-col items-center justify-center text-slate-400 gap-2">
                <PieChart size={32} className="opacity-20" />
                <span className="text-sm font-bold">No expense data to display</span>
            </div>
          )}
      </div>
    </section>
  );
};

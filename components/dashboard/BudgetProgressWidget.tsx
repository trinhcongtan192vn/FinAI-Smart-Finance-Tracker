
import React from 'react';
import { Target, Settings2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { currencyFormatter, formatCurrencyCompact } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface BudgetProgressWidgetProps {
  spent: number;
  limit: number;
  onNavigateToBudget: () => void;
}

export const BudgetProgressWidget: React.FC<BudgetProgressWidgetProps> = ({ spent, limit, onNavigateToBudget }) => {
  const { t } = useTranslation();
  const usage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const isOverBudget = spent > limit && limit > 0;
  const remaining = Math.max(0, limit - spent);

  const chartData = [
    { name: t('budget_widget.consumed'), value: spent, color: isOverBudget ? '#ef4444' : '#6366f1' },
    { name: t('budget.remaining'), value: remaining, color: '#f1f5f9' }
  ];

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-indigo-50/50 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-indigo-600" />
          <div className="flex flex-col">
            <h3 className="font-black text-slate-900 text-sm leading-none">{t('budget_widget.title')}</h3>
            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mt-1">{t('budget_widget.mtd')}</p>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onNavigateToBudget(); }}
          className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all"
        >
          <Settings2 size={18} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 shrink-0 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={28} outerRadius={38} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={10}>
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={`text-[10px] font-black ${isOverBudget ? 'text-red-500' : 'text-indigo-600'}`}>{usage}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isOverBudget ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
              {isOverBudget ? t('budget_widget.exceeded') : t('budget_widget.on_track')}
            </span>
            <p className="text-[10px] font-bold text-slate-400">{t('budget_widget.target')}: {formatCurrencyCompact(limit)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline">
              <p className="text-xs font-bold text-slate-500">{t('budget_widget.consumed')}</p>
              <p className={`text-lg font-black ${isOverBudget ? 'text-red-500' : 'text-slate-900'}`}>{currencyFormatter.format(spent)}</p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${usage}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

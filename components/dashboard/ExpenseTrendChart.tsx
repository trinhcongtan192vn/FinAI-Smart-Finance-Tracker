
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, CartesianGrid, Brush, ReferenceLine } from 'recharts';
import { currencyFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface ExpenseTrendChartProps {
  chartData: any[];
  monthlyBudget?: number;
}

const CustomTooltip = ({ active, payload, label, t }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-700 text-white min-w-[200px] z-50">
        <p className="text-slate-400 text-xs font-bold mb-2">{t('expense_trend.day')} {label}</p>
        
        <div className="flex justify-between items-center mb-1">
            <span className="text-indigo-300 font-bold text-xs">{t('expense_trend.total_so_far')}</span>
            <span className="font-bold text-sm">{currencyFormatter.format(data.current || 0)}</span>
        </div>
        {data.dailyAmount > 0 && (
          <div className="flex justify-between items-center mb-1">
              <span className="text-emerald-400/80 font-bold text-[10px]">{t('expense_trend.spent_today')}</span>
              <span className="font-bold text-xs text-emerald-400">+{currencyFormatter.format(data.dailyAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400 font-bold text-xs">{t('expense_trend.avg_3m')}</span>
            <span className="font-bold text-slate-400 text-sm">{currencyFormatter.format(data.average || 0)}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
            <span className="text-emerald-400/60 font-bold text-xs">{t('expense_trend.avg_1y')}</span>
            <span className="font-bold text-emerald-400/60 text-sm">{currencyFormatter.format(data.yearAverage || 0)}</span>
        </div>

        {data.details && data.details.length > 0 && (
            <>
                <div className="h-px bg-slate-700 my-2"></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">{t('expense_trend.key_drivers')}</p>
                <div className="flex flex-col gap-2">
                    {data.details.map((t: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs gap-4">
                            <span className="truncate text-slate-300 font-medium">{t.note || t.category}</span>
                            <span className="text-slate-200 font-bold whitespace-nowrap">{currencyFormatter.format(t.amount)}</span>
                        </div>
                    ))}
                </div>
            </>
        )}
      </div>
    );
  }
  return null;
};

export const ExpenseTrendChart: React.FC<ExpenseTrendChartProps> = ({ chartData, monthlyBudget }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-[2rem] bg-white p-6 border border-slate-50 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-600" />
            {t('expense_trend.title')}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">{t('expense_trend.subtitle')}</p>
        </div>
      </div>
      {/* min-w-0 is critical for ResponsiveContainer in flex layouts to avoid sizing errors */}
      <div className="h-64 w-full min-w-0 -ml-2 mt-4 relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => val % 5 === 0 || val === 1 ? val : ''} 
                  interval={0}
              />
              <Tooltip content={<CustomTooltip t={t} />} />
              
              {/* Total Budget Reference Line */}
              {monthlyBudget && monthlyBudget > 0 && (
                <ReferenceLine 
                  y={monthlyBudget} 
                  stroke="#f59e0b" 
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{ 
                    position: 'insideTopRight', 
                    value: t('budget_widget.target'), 
                    fill: '#f59e0b', 
                    fontSize: 9, 
                    fontWeight: 800,
                    textAnchor: 'end'
                  }}
                />
              )}

              <Line 
                type="monotone" 
                dataKey="yearAverage" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name={t('expense_trend.avg_1y')}
                strokeDasharray="2 2"
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#94a3b8" 
                strokeWidth={2}
                dot={false}
                name={t('expense_trend.avg_3m')}
                strokeDasharray="4 4"
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#4F46E5" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#4F46E5' }}
                name={t('reports.this_month')}
                animationDuration={1500}
              />
              <Brush 
                  dataKey="day" 
                  height={20} 
                  stroke="#cbd5e1" 
                  fill="#f8fafc"
                  travellerWidth={10}
                  tickFormatter={() => ''}
                  className="mt-2"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300 text-sm font-bold">
            {t('expense_trend.not_enough_data')}
          </div>
        )}
      </div>
    </div>
  );
};

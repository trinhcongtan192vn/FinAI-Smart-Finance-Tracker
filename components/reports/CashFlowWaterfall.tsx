
import React from 'react';
import { Wallet, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from 'recharts';
import { currencyFormatter, getCategoryLabel } from '../../lib/utils';
import { WaterfallStep } from '../../types';
import { useTranslation } from 'react-i18next';

interface CashFlowWaterfallProps {
  data: WaterfallStep[];
}

const CustomTooltip = ({ active, payload, label, t }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.value >= 0;
    
    // Group details by category/note to show top drivers
    // We expect 'data.details' to contain transactions with signed 'amount'
    const drivers: Record<string, number> = {};
    if (data.details && data.details.length > 0) {
        data.details.forEach((tx: any) => {
            // Use note for specific investment/debt actions, category for general expenses
            const key = (tx.category === 'Stocks' || tx.category === 'Crypto') ? tx.note : tx.category;
            // Aggregate signed amounts directly
            drivers[key] = (drivers[key] || 0) + Number(tx.amount);
        });
    }

    // Sort by absolute impact
    const sortedDrivers = Object.entries(drivers)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 5); // Top 5

    return (
      <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-white/10 text-white min-w-[200px] z-50">
        <div className="mb-2">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{data.type === 'final' ? t('waterfall.final') : t('reports.flow_component')}</p>
            <p className="text-sm font-bold text-white">{t(data.name)}</p>
        </div>
        
        <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-medium text-slate-300">{t('reports.net_change')}</span>
            <span className={`font-black text-sm ${isPositive || data.type==='final' ? 'text-emerald-400' : 'text-rose-400'}`}>
               {data.type==='final' ? '' : (isPositive ? '+' : '')}{currencyFormatter.format(data.value)}
            </span>
        </div>

        {sortedDrivers.length > 0 && (
            <div className="space-y-1">
                {sortedDrivers.map(([name, val], idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                        <span className="text-slate-400 truncate max-w-[120px]">{getCategoryLabel(name, t)}</span>
                        {/* Explicit Green for Positive, Red for Negative */}
                        <span className={`font-bold ${val >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {val > 0 ? '+' : ''}{currencyFormatter.format(val)}
                        </span>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
  }
  return null;
};

export const CashFlowWaterfall: React.FC<CashFlowWaterfallProps> = ({ data }) => {
  const { t } = useTranslation();
  
  // Transform data for Recharts Waterfall
  const chartData = [];
  let currentBalance = 0;

  for (const step of data) {
      const translatedName = t(step.name);

      if (step.type === 'final') {
          // For Opening, set currentBalance
          if (step.name === 'waterfall.opening') {
              currentBalance = step.value;
          }
          // For Closing/Opening, bar starts at 0 up to value
          chartData.push({
              ...step,
              displayName: translatedName,
              range: [0, step.value], 
              isCheckpoint: true
          });
      } else {
          // For Bridge steps, bar starts at previous balance
          const prev = currentBalance;
          currentBalance += step.value; // Add the signed delta
          
          chartData.push({
              ...step,
              displayName: translatedName,
              // Recharts Range: [min, max]
              range: [Math.min(prev, currentBalance), Math.max(prev, currentBalance)],
              isCheckpoint: false
          });
      }
  }

  const currentMonthLabel = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Wallet size={20} className="text-indigo-600" />
            {t('reports.monthly_cash_flow')}
            </h2>
            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-7">
               <Calendar size={10} /> {currentMonthLabel} • Cash Bridge
            </div>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-indigo-50/50 flex items-center justify-center h-80 min-w-0 relative">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 8}}
                  content={(props) => <CustomTooltip {...props} t={t} />}
                  offset={20}
                />
                <XAxis 
                    dataKey="displayName" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} 
                    dy={10}
                    interval={0}
                />
                <Bar dataKey="range" radius={[4, 4, 4, 4]} maxBarSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || '#cbd5e1'} />
                  ))}
                  <LabelList 
                    dataKey="displayValue" 
                    position="top" 
                    style={{ fill: '#334155', fontSize: '10px', fontWeight: '800' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-300">
                <Wallet size={32} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">{t('common.no_data')}</p>
            </div>
          )}
      </div>
    </section>
  );
};

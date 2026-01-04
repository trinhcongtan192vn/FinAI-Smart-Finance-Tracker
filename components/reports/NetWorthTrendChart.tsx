
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { currencyFormatter, formatCurrencyCompact } from '../../lib/utils';
import { TrendingUp, TrendingDown, GitCommit, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NetWorthTrendChartProps {
  data: any[];
}

const CustomTooltip = ({ active, payload, label, t }: any) => {
  if (active && payload && payload.length) {
    const isForecast = payload[0].payload.forecast !== undefined && payload[0].payload.netWorth === undefined;
    const isNow = label === 'Now' || label === t('reports.current');

    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl text-white min-w-[180px] z-50">
        <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            {isForecast && <span className="text-[8px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">{t('reports.forecast').toUpperCase()}</span>}
            {isNow && <span className="text-[8px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">{t('reports.current').toUpperCase()}</span>}
        </div>
        
        <div className="space-y-2">
          {payload.map((entry: any) => {
            if (entry.name === t('reports.ai_forecast') && !entry.value) return null;
            return (
                <div key={entry.name} className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-xs font-bold text-slate-300">{entry.name}</span>
                </div>
                <span className="text-xs font-black">{currencyFormatter.format(entry.value)}</span>
                </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const NetWorthTrendChart: React.FC<NetWorthTrendChartProps> = ({ data }) => {
  const { t } = useTranslation();
  
  // Find "Now" index to calculate growth
  const nowIndex = data.findIndex(d => d.date === 'Now');
  const currentNetWorth = data[nowIndex]?.netWorth || 0;
  const startNetWorth = data[0]?.netWorth || 0;
  const growth = startNetWorth !== 0 ? ((currentNetWorth - startNetWorth) / Math.abs(startNetWorth)) * 100 : 0;
  
  // Count historical points (excluding forecast)
  const historicalPoints = data.filter(d => d.netWorth !== undefined).length;
  const showOverlay = historicalPoints <= 1;

  if (data.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-indigo-50/50 flex flex-col gap-6 relative overflow-hidden">
      <div className="flex justify-between items-start px-1">
        <div>
          <h3 className="text-lg font-black text-slate-900">{t('reports.net_worth_growth')}</h3>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('reports.history_projection')}</p>
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-500 uppercase tracking-widest">
                <GitCommit size={10} /> {t('reports.ai_forecast')}
             </div>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border ${growth >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
           {growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
           <span className="text-xs font-black">{Math.abs(growth).toFixed(1)}%</span>
        </div>
      </div>

      <div className="h-64 w-full relative -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <pattern id="patternForecast" patternUnits="userSpaceOnUse" width="4" height="4">
                 <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#6366f1" strokeWidth="1" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
              dy={10}
              tickFormatter={(val) => {
                 if (val === 'Now') return t('reports.current');
                 // Format: 2024-03 -> T03/24
                 const parts = val.split('-');
                 return parts.length > 1 ? `T${parts[1]}/${parts[0].slice(2)}` : val;
              }}
            />
            <YAxis 
              hide 
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip t={t} />} />
            
            <Area 
              type="monotone" 
              dataKey="assets" 
              stackId="2"
              stroke="#10b981" 
              strokeWidth={2}
              fill="url(#colorAssets)" 
              name={t('assets.total_assets')}
            />
            <Area 
              type="monotone" 
              dataKey="liabilities" 
              stackId="3"
              stroke="#f43f5e" 
              strokeWidth={2}
              fill="transparent" 
              name={t('capital.liabilities')}
            />
            <Area 
              type="monotone" 
              dataKey="netWorth" 
              stackId="1" 
              stroke="#4F46E5" 
              strokeWidth={3}
              fill="url(#colorNetWorth)" 
              name={t('dashboard.net_worth')}
            />
            {/* Forecast Line */}
            <Area
              type="monotone"
              dataKey="forecast"
              stackId="4" // Separate stack to allow overlay
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#colorNetWorth)"
              fillOpacity={0.2}
              name={t('reports.ai_forecast')}
              connectNulls
            />
            <ReferenceLine x="Now" stroke="#94a3b8" strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showOverlay && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 rounded-[2.5rem]">
           <div className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 mb-3">
              <Camera size={24} />
           </div>
           <h4 className="text-sm font-black text-slate-900">Insufficient Historical Data</h4>
           <p className="text-[10px] font-bold text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              Please trigger <span className="text-indigo-600">Data Snapshots</span> manually to build the trend chart.
           </p>
        </div>
      )}
    </div>
  );
};

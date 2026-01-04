
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Account } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { CircleDollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CapitalStructureChartProps {
  accounts: Account[];
}

const COLORS_INNER = ['#10b981', '#6366f1']; // Assets (Green), Capital (Indigo)
const COLORS_OUTER_ASSETS = ['#34d399', '#6ee7b7', '#a7f3d0', '#059669'];
const COLORS_OUTER_CAPITAL = ['#818cf8', '#a5b4fc', '#c7d2fe', '#f43f5e', '#fb7185']; // Include Red/Pink for Debt

export const CapitalStructureChart: React.FC<CapitalStructureChartProps> = ({ accounts }) => {
  const { t } = useTranslation();
  const data = useMemo(() => {
    // Inner Ring: Structure (Assets vs Sources)
    const assetAccounts = accounts.filter(a => a.group === 'ASSETS' && a.current_balance > 0);
    const capitalAccounts = accounts.filter(a => a.group === 'CAPITAL' && a.current_balance > 0);

    const totalAssets = assetAccounts.reduce((sum, a) => sum + a.current_balance, 0);
    const totalCapital = capitalAccounts.reduce((sum, a) => sum + a.current_balance, 0);

    const innerData = [
      { name: 'Assets', value: totalAssets },
      { name: 'Sources', value: totalCapital }
    ];

    // Outer Ring: Breakdown
    const assetBreakdown = assetAccounts.reduce((acc, a) => {
        acc[a.category] = (acc[a.category] || 0) + a.current_balance;
        return acc;
    }, {} as Record<string, number>);

    const capitalBreakdown = capitalAccounts.reduce((acc, a) => {
        acc[a.category] = (acc[a.category] || 0) + a.current_balance;
        return acc;
    }, {} as Record<string, number>);

    const outerData = [
        ...Object.entries(assetBreakdown).map(([name, value]) => ({ name, value, type: 'ASSET' })),
        ...Object.entries(capitalBreakdown).map(([name, value]) => ({ name, value, type: 'CAPITAL' }))
    ];

    return { innerData, outerData };
  }, [accounts]);

  if (data.innerData.length === 0 || data.innerData[0].value === 0) return null;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-indigo-50/50 flex flex-col gap-2 h-full relative">
      <div className="flex items-center gap-2 mb-2 px-1">
         <CircleDollarSign size={20} className="text-indigo-600" />
         <div>
            <h3 className="text-lg font-black text-slate-900 leading-none">{t('reports.capital_structure')}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('reports.assets_vs_funding')}</p>
         </div>
      </div>

      <div className="flex-1 min-h-[220px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.innerData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={55}
              innerRadius={40}
              paddingAngle={2}
              stroke="none"
              cornerRadius={4}
            >
              {data.innerData.map((entry, index) => (
                <Cell key={`inner-${index}`} fill={COLORS_INNER[index % COLORS_INNER.length]} />
              ))}
            </Pie>
            <Pie
              data={data.outerData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
              cornerRadius={4}
            >
              {data.outerData.map((entry, index) => {
                 let color;
                 if (entry.type === 'ASSET') {
                    color = COLORS_OUTER_ASSETS[index % COLORS_OUTER_ASSETS.length];
                 } else {
                    if (entry.name === 'Liability' || entry.name.includes('Loan')) color = '#f43f5e';
                    else color = '#818cf8'; 
                 }
                 return <Cell key={`outer-${index}`} fill={color} />;
              })}
            </Pie>
            <Tooltip 
               content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs font-black shadow-xl border border-white/10 z-50">
                         <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-0.5">{d.name}</p>
                         <p>{currencyFormatter.format(Number(d.value))}</p>
                      </div>
                    );
                  }
                  return null;
               }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text - Improved positioning */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
           <span className="text-[8px] font-black text-slate-400 uppercase">Balance</span>
           <span className="text-xs font-black text-slate-900">Sheet</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-[9px] font-black uppercase text-slate-400">
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {t('nav.assets')}
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div> {t('categories.equity')}
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div> {t('capital.liabilities')}
         </div>
      </div>
    </div>
  );
};

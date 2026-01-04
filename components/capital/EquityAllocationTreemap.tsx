
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Account } from '../../types';
import { currencyFormatter, formatCurrencyCompact } from '../../lib/utils';

interface AllocationProps {
  equityAccounts: Account[];
  assets: Account[];
}

export const EquityAllocationTreemap: React.FC<AllocationProps> = ({ equityAccounts, assets }) => {
  const data = useMemo(() => {
    return equityAccounts.map(fund => ({
      name: fund.name,
      value: fund.current_balance || 0,
      color: fund.color_code || '#4F46E5'
    })).filter(f => f.value > 0);
  }, [equityAccounts]);

  return (
    <div className="flex items-center gap-6 h-40">
      <div className="w-32 h-32 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={35}
              outerRadius={50}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white p-2 rounded-lg text-[10px] font-black border border-white/10">
                      {currencyFormatter.format(Number(payload[0].value))}
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
           <span className="text-[8px] font-black text-slate-400 uppercase">Funds</span>
           <span className="text-[10px] font-black text-slate-900">{data.length}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto no-scrollbar max-h-32">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between group">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-bold text-slate-600 truncate uppercase tracking-tighter">{item.name}</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 ml-2">{formatCurrencyCompact(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

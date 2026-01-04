
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { formatCurrencyCompact } from '../../../lib/utils';
import { MarketScenario, SimulationYear } from '../../../types';

interface FIREChartProps {
  data: SimulationYear[];
  scenario: MarketScenario;
  retirementAge: number;
}

export const FIREChart: React.FC<FIREChartProps> = ({ data, scenario, retirementAge }) => {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft h-[380px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="age"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            interval={9}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            tickFormatter={(val) => formatCurrencyCompact(val)}
          />
          <Tooltip
            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '12px' }}
            formatter={(val) => formatCurrencyCompact(Number(val))}
          />
          {scenario === MarketScenario.BEAR && (
            <ReferenceArea
              x1={retirementAge}
              x2={retirementAge + 3}
              fill="#f43f5e"
              fillOpacity={0.1}
              label={{ position: 'top', value: 'Khủng hoảng Stocks', fill: '#f43f5e', fontSize: 8, fontWeight: 900, textTransform: 'uppercase' }}
            />
          )}
          <Area type="monotone" dataKey="yieldShield" stackId="1" stroke="#6366f1" strokeWidth={3} fill="url(#colorYield)" name="Tài sản đầu tư" />
          <Area type="monotone" dataKey="cashCushion" stackId="1" stroke="#10b981" strokeWidth={3} fill="url(#colorCash)" name="Đệm tiền mặt" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

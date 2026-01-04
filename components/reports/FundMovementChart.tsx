
import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { currencyFormatter } from '../../lib/utils';
import { ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FundMovementChartProps {
  data: { month: string; inflow: number; outflow: number }[];
}

export const FundMovementChart: React.FC<FundMovementChartProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-indigo-50/50 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
         <ArrowRightLeft size={20} className="text-indigo-600" />
         <div>
            <h3 className="text-lg font-black text-slate-900 leading-none">{t('reports.fund_movement')}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('reports.inflow_outflow')}</p>
         </div>
      </div>

      <div className="h-64 w-full relative -ml-2">
         {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                     dataKey="month" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                     tickFormatter={(val) => {
                        const parts = val.split('-');
                        return parts.length > 1 ? `T${parts[1]}/${parts[0].slice(2)}` : val;
                     }}
                     dy={10}
                  />
                  <Tooltip 
                     cursor={{fill: '#f8fafc', radius: 8}}
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                     itemStyle={{ fontSize: 12, fontWeight: 700 }}
                     formatter={(val: number) => currencyFormatter.format(val)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', paddingTop: '10px' }} />
                  <Bar dataKey="inflow" name={t('reports.money_in')} stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={20} />
                  <Bar dataKey="outflow" name={t('reports.money_out')} stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
               </BarChart>
            </ResponsiveContainer>
         ) : (
            <div className="h-full flex items-center justify-center text-slate-300">
               <span className="text-xs font-bold uppercase">{t('common.no_data')}</span>
            </div>
         )}
      </div>
    </div>
  );
};

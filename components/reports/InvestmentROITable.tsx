
import React from 'react';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { InvestmentPerformance } from '../../hooks/useFinancialHealth';
import { currencyFormatter, percentFormatter, getCategoryLabel } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface InvestmentROITableProps {
  data: InvestmentPerformance[];
}

export const InvestmentROITable: React.FC<InvestmentROITableProps> = ({ data }) => {
  const { t } = useTranslation();
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-soft border border-indigo-50/50 overflow-hidden">
      <div className="p-6 pb-4 border-b border-slate-50 flex items-center justify-between">
         <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            <Award size={20} className="text-amber-500" />
            {t('reports.roi_ranking')}
         </h3>
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('reports.performance_class')}</span>
      </div>
      
      <div className="overflow-x-auto">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-50/50">
                  <th className="p-4 pl-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('reports.asset_class')}</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">{t('reports.invested')}</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">{t('reports.current_val')}</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">{t('reports.net_profit')}</th>
                  <th className="p-4 pr-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">ROI</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {data.map((item, idx) => {
                  const totalProfit = item.realizedPnL + item.unrealizedPnL;
                  const isProfitable = totalProfit >= 0;
                  
                  return (
                     <tr key={item.category} className="group hover:bg-indigo-50/10 transition-colors">
                        <td className="p-4 pl-6">
                           <div className="flex items-center gap-3">
                              <span className={`text-xs font-black w-5 h-5 flex items-center justify-center rounded-full ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                              <span className="text-xs font-bold text-slate-900">{getCategoryLabel(item.category, t)}</span>
                           </div>
                        </td>
                        <td className="p-4 text-right text-xs font-medium text-slate-500">
                           {currencyFormatter.format(item.costBasis)}
                        </td>
                        <td className="p-4 text-right text-xs font-bold text-slate-800">
                           {currencyFormatter.format(item.marketValue)}
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex flex-col items-end">
                              <span className={`text-xs font-black ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {isProfitable ? '+' : ''}{currencyFormatter.format(totalProfit)}
                              </span>
                              {item.realizedPnL !== 0 && (
                                 <span className="text-[8px] font-bold text-slate-400 uppercase">
                                    Realized: {currencyFormatter.format(item.realizedPnL)}
                                 </span>
                              )}
                           </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                           <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${isProfitable ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              <span className="text-xs font-black">{percentFormatter.format(item.totalROI)}</span>
                              {isProfitable ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                           </div>
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
    </div>
  );
};

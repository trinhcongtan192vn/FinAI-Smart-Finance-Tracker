
import React, { useMemo } from 'react';
import { Activity, History } from 'lucide-react';
import { Account } from '../../../types';
import { currencyFormatter, calculateInvestmentPerformance, percentFormatter } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

interface GroupProps {
  accounts: Account[];
  onAction: (acc: Account, action: any) => void;
  getIcon?: (cat: string) => React.ReactNode;
}

const GroupHeader = ({ title, icon: Icon, count, totalValue, colorClass, t }: any) => (
  <div className="flex flex-col gap-2 mb-3 px-1">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Icon size={14} className={colorClass} /> {title}
      </h3>
    </div>
    {totalValue !== undefined && (
        <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total:</span>
            <span className={`text-base font-black ${colorClass} tracking-tight`}>{currencyFormatter.format(totalValue)}</span>
        </div>
    )}
  </div>
);

export const MarketVolatileList: React.FC<GroupProps> = ({ accounts, onAction, getIcon }) => {
  const { t } = useTranslation();
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('assets.market_assets')} 
        icon={Activity} 
        count={accounts.length} 
        t={t} 
        totalValue={totalValue}
        colorClass="text-indigo-500"
      />
      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{t('assets.table.asset')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.price_wac')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.pnl_roi')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.balance')}</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{t('assets.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {accounts.map(acc => {
                const perf = calculateInvestmentPerformance(acc.investment_details);
                return (
                  <tr key={acc.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${acc.category === 'Crypto' ? 'bg-orange-50 text-orange-500' : 'bg-indigo-50 text-indigo-500'}`}>
                          {getIcon && getIcon(acc.category)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-900 uppercase truncate leading-tight max-w-[100px]">{acc.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{acc.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-indigo-600 leading-tight">
                          {acc.investment_details?.market_price ? currencyFormatter.format(acc.investment_details.market_price) : '—'}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                          Cost: {acc.investment_details?.avg_price ? currencyFormatter.format(acc.investment_details.avg_price) : '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {perf ? (
                        <div className="flex flex-col">
                          <p className={`text-[9px] font-black leading-tight ${perf.isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {perf.isProfit ? '+' : ''}{currencyFormatter.format(perf.unrealizedPnL)}
                          </p>
                          <p className={`text-[8px] font-bold mt-0.5 ${perf.isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {perf.isProfit ? '+' : ''}{percentFormatter.format(perf.roi)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-300 font-black">—</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <p className="text-[10px] font-black text-slate-900">{currencyFormatter.format(acc.current_balance)}</p>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onAction(acc, 'REVALUE')} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-indigo-600 transition-colors" title={t('assets.actions.revalue')}><Activity size={12}/></button>
                        <button onClick={() => onAction(acc, 'HISTORY')} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title={t('assets.actions.history')}><History size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};


import React, { useMemo } from 'react';
import { RefreshCcw, Loader2, Briefcase, Eye, EyeOff } from 'lucide-react';
import { currencyFormatter, calculateTotalPortfolioPerformance, getCategoryLabel } from '../../lib/utils';
import { Account } from '../../types';
import { useTranslation } from 'react-i18next';

interface PortfolioOverviewProps {
  accounts: Account[];
  isSyncing: boolean;
  onSync: () => void;
  isPrivacyEnabled: boolean;
  onTogglePrivacy: () => void;
}

const ALLOCATION_COLORS: Record<string, string> = {
  'Cash': 'bg-emerald-400',
  'Stocks': 'bg-indigo-400',
  'Crypto': 'bg-orange-400',
  'Gold': 'bg-amber-400',
  'Real Estate': 'bg-teal-400',
  'Savings': 'bg-blue-400',
  'Receivables': 'bg-purple-400',
  'Other': 'bg-slate-400'
};

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ 
  accounts, 
  isSyncing, 
  onSync,
  isPrivacyEnabled,
  onTogglePrivacy
}) => {
  const { t } = useTranslation();
  
  const stats = useMemo(() => {
    const totalNetValue: number = accounts.reduce((sum: number, a) => sum + (a.current_balance || 0), 0);
    // Keeping this calculation if needed for other logic, or future re-integration, 
    // but effectively we are not displaying the detailed breakdown anymore.
    const investmentStats = calculateTotalPortfolioPerformance(accounts);
    
    const allocationMap = accounts.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + (a.current_balance || 0);
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(allocationMap)
      .map(([name, val]) => {
        const value = val as number;
        return { 
          name, 
          value, 
          percentage: totalNetValue > 0 ? (value / totalNetValue) * 100 : 0 
        };
      })
      .sort((a, b) => b.value - a.value);

    return { totalNetValue, investmentStats, chartData };
  }, [accounts]);

  return (
    <section className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[110px] -mr-32 -mt-32 opacity-20 group-hover:opacity-30 transition-opacity"></div>
      
      <div className="relative z-10 flex flex-col gap-6">
        {/* Header Section: Total Net Worth */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
               <Briefcase size={12} className="text-indigo-400" />
               <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">{t('assets.total_assets')}</p>
               <button onClick={onTogglePrivacy} className="p-1 hover:text-white text-indigo-400/70 transition-colors">
                  {!isPrivacyEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
               </button>
            </div>
            <h2 className="text-4xl font-black tracking-tighter">
              {!isPrivacyEnabled ? currencyFormatter.format(stats.totalNetValue) : '*******'}
            </h2>
          </div>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all active:scale-95 disabled:opacity-50 border border-white/5"
          >
            {isSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
            {t('assets.sync')}
          </button>
        </div>

        {/* Allocation Mini Chart */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex justify-between items-center px-0.5">
             <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t('assets.allocation')}</span>
          </div>
          
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex p-[1px] border border-white/5">
            {stats.chartData.map((item, idx) => (
              <div 
                key={item.name}
                className={`h-full transition-all duration-1000 first:rounded-l-full last:rounded-r-full ${ALLOCATION_COLORS[item.name] || ALLOCATION_COLORS['Other']}`}
                style={{ 
                  width: `${item.percentage}%`,
                  marginRight: idx < stats.chartData.length - 1 && item.percentage > 1 ? '1px' : '0'
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {stats.chartData.slice(0, 3).map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${ALLOCATION_COLORS[item.name] || ALLOCATION_COLORS['Other']}`} />
                <span className="text-[9px] font-bold text-white/60 uppercase">{getCategoryLabel(item.name, t)}</span>
                <span className="text-[9px] font-black text-white/40">{Math.round(item.percentage)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

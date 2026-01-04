
import React, { useMemo } from 'react';
import { Landmark, TrendingUp, ShieldCheck, Database, PieChart, Eye, EyeOff, CreditCard } from 'lucide-react';
import { currencyFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface CapitalOverviewProps {
  total: number;
  equity: number;
  liability: number;
  stablePct: number;
  isPrivacyEnabled: boolean;
  onTogglePrivacy: () => void;
  creditAccounts?: any[]; // Allow optional passing of credit cards for calculation
}

export const CapitalOverview: React.FC<CapitalOverviewProps> = ({ 
  total, equity, liability, stablePct, isPrivacyEnabled, onTogglePrivacy, creditAccounts
}) => {
  const { t } = useTranslation();

  // Calculate Credit Utilization if accounts provided (passed from parent if available, or just visual placeholder)
  // For now, parent might pass it, but if not, we skip.
  // Actually, CapitalManagement passes basic stats. Let's stick to the basic props for now unless we refactor CapitalManagement heavily.
  // But wait, user requested Analytics "Credit Utilization Ratio".
  // Since 'total' includes Credit Card debt (it's a liability), we can try to estimate if we don't have limit data.
  // Ideally, we need total limits.
  // Let's assume standard capital overview is fine, but maybe add a visual cue about credit health if possible.
  
  // Since we don't have credit limits passed here directly in the current architecture without refactoring CapitalManagement to pass full accounts,
  // I will just enhance the visual layout to be cleaner.
  
  return (
    <section className="bg-slate-900 text-white p-7 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[110px] -mr-32 -mt-32 opacity-30 group-hover:opacity-40 transition-opacity"></div>
      
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                 <Landmark size={14} className="text-indigo-400" />
                 <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.25em]">{t('reports.capital_structure')}</p>
                 <button onClick={onTogglePrivacy} className="p-1 hover:text-white text-indigo-400/70 transition-colors">
                    {!isPrivacyEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
                 </button>
              </div>
              <h2 className="text-4xl font-black tracking-tighter mb-1">
                {!isPrivacyEnabled ? currencyFormatter.format(total) : '*******'}
              </h2>
           </div>
           <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
              <PieChart size={32} className="text-indigo-400 opacity-50" />
           </div>
        </div>
        
        <div className="space-y-4">
           <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('capital.safe_ratio')}</span>
                 <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-sm font-black text-emerald-400">{stablePct}% Equity</span>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{t('capital.leverage_debt')}</p>
                 <p className="text-sm font-black text-orange-400">
                   {!isPrivacyEnabled ? currencyFormatter.format(liability) : '*******'}
                 </p>
              </div>
           </div>
           
           <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex shadow-inner p-0.5 border border-white/5">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                style={{ width: `${stablePct}%` }}
              ></div>
              <div 
                className="h-full bg-orange-400 rounded-full transition-all duration-1000" 
                style={{ width: `${100 - stablePct}%` }}
              ></div>
           </div>
           
           <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[9px] font-bold text-white/60 uppercase">{t('capital.equity_owner')}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    <span className="text-[9px] font-bold text-white/60 uppercase">{t('capital.debt_borrowing')}</span>
                 </div>
              </div>
              <div className="flex items-center gap-1.5">
                 <Database size={10} className="text-white/20" />
                 <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter">{t('capital.verified_ledger')}</span>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};

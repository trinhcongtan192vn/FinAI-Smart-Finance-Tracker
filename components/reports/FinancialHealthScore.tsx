
import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FinancialHealthScoreProps {
  debtToAssetRatio: number;
}

export const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({ debtToAssetRatio }) => {
  const { t } = useTranslation();
  // Logic: <30 Safe, 30-50 Warning, >50 Danger
  let status: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';
  if (debtToAssetRatio > 50) status = 'DANGER';
  else if (debtToAssetRatio > 30) status = 'WARNING';

  const config = {
    SAFE: { color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', label: t('reports.healthy'), icon: ShieldCheck, desc: t('reports.risk_safe_desc') },
    WARNING: { color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', label: t('reports.moderate_risk'), icon: AlertTriangle, desc: t('reports.risk_warning_desc') },
    DANGER: { color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500', label: t('reports.high_risk'), icon: AlertOctagon, desc: t('reports.risk_danger_desc') },
  }[status];

  const Icon = config.icon;

  return (
    <div className={`p-6 rounded-[2.5rem] border ${status === 'DANGER' ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-indigo-50/50'} shadow-soft flex flex-col justify-between h-full`}>
      <div className="flex justify-between items-start">
         <div>
            <h3 className="text-lg font-black text-slate-900 leading-none">{t('reports.financial_risk')}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('reports.debt_asset_ratio')}</p>
         </div>
         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg} ${config.color}`}>
            <Icon size={20} />
         </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
         <div className="flex items-end gap-2">
            <span className={`text-4xl font-black ${config.color}`}>{debtToAssetRatio.toFixed(1)}<span className="text-xl">%</span></span>
            <span className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${config.color}`}>{config.label}</span>
         </div>
         
         <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
            <div 
               className={`h-full rounded-full transition-all duration-1000 ${config.bar}`} 
               style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
            ></div>
         </div>
         
         <p className="text-[9px] font-medium text-slate-400 leading-relaxed">
            {config.desc}
         </p>
      </div>
    </div>
  );
};


import React from 'react';
import { Timer, AlertTriangle, ShieldCheck } from 'lucide-react';
import { currencyFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface EmergencyRunwayProps {
  runwayMonths: number;
  avgMonthlyExpense: number;
  fundName: string;
}

export const EmergencyRunway: React.FC<EmergencyRunwayProps> = ({ runwayMonths, avgMonthlyExpense, fundName }) => {
  const { t } = useTranslation();
  let status: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
  if (runwayMonths < 3) status = 'CRITICAL';
  else if (runwayMonths < 6) status = 'WARNING';

  const config = {
    CRITICAL: { color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500', icon: AlertTriangle, msg: t('reports.status_critical') },
    WARNING: { color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', icon: Timer, msg: t('reports.status_warning') },
    HEALTHY: { color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', icon: ShieldCheck, msg: t('reports.status_healthy') }
  }[status];

  const Icon = config.icon;
  // Cap visual bar at 12 months
  const progress = Math.min(100, (runwayMonths / 12) * 100);

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-indigo-50/50 flex flex-col gap-4">
      <div className="flex justify-between items-start">
         <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.bg} ${config.color}`}>
               <Icon size={24} />
            </div>
            <div>
               <h3 className="text-lg font-black text-slate-900 leading-none">{t('reports.emergency_runway')}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('reports.survival_ability')}</p>
            </div>
         </div>
         <div className="text-right">
            <p className={`text-2xl font-black ${config.color}`}>{runwayMonths.toFixed(1)} <span className="text-xs text-slate-400 font-bold uppercase">{t('reports.months')}</span></p>
         </div>
      </div>

      <div className="space-y-2">
         <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('reports.avg_expense')}: {currencyFormatter.format(avgMonthlyExpense)}/{t('reports.months')}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${config.color}`}>{config.msg}</span>
         </div>
         <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner p-0.5">
            <div className={`h-full rounded-full transition-all duration-1000 relative ${config.bar}`} style={{ width: `${progress}%` }}>
               <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
         </div>
         <p className="text-[9px] text-slate-400 italic text-right">Based on: {fundName}</p>
      </div>
    </div>
  );
};

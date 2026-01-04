
import React, { useMemo } from 'react';
import { Home } from 'lucide-react';
import { Account } from '../../../types';
import { currencyFormatter } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

interface GroupProps {
  accounts: Account[];
  onAction: (acc: Account, action: any) => void;
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

export const RealEstateList: React.FC<GroupProps> = ({ accounts, onAction }) => {
  const { t } = useTranslation();
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0), [accounts]);

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader 
        title={t('assets.real_estate')} 
        icon={Home} 
        count={accounts.length} 
        t={t} 
        totalValue={totalValue}
        colorClass="text-emerald-600"
      />
      <div className="grid grid-cols-1 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-slate-50 flex flex-col gap-5 group overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/30 shrink-0">
                  <Home size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-slate-900 font-black text-base truncate">{acc.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">{t('assets.desc.portfolio')}</p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <p className="text-lg sm:text-xl font-black text-slate-900 truncate max-w-[140px] sm:max-w-none">{currencyFormatter.format(acc.current_balance)}</p>
              </div>
            </div>
            <div className="flex gap-2 relative z-10">
              <button onClick={() => onAction(acc, 'COCKPIT')} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                {t('assets.actions.history')} & {t('common.details')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

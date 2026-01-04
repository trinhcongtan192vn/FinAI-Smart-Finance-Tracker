
import React, { useMemo } from 'react';
import { CreditCard, Wifi, Zap } from 'lucide-react';
import { Account } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { getCreditCardStatus } from '../../lib/creditUtils';

interface CreditCardItemProps {
  account: Account;
  onClick: () => void;
}

export const CreditCardItem: React.FC<CreditCardItemProps> = ({ account, onClick }) => {
  const details = account.credit_card_details;
  
  const status = useMemo(() => {
    if (!details) return null;
    return getCreditCardStatus(account.current_balance, details);
  }, [account.current_balance, details]);

  if (!details || !status) return null;

  const getGradient = () => {
    switch (details.card_color) {
      case 'gold': return 'bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-amber-900';
      case 'platinum': return 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 text-slate-900';
      case 'black': return 'bg-gradient-to-br from-gray-700 via-gray-900 to-black text-white';
      case 'blue': return 'bg-gradient-to-br from-blue-400 via-blue-600 to-blue-900 text-white';
      default: return 'bg-gradient-to-br from-indigo-400 via-indigo-600 to-indigo-900 text-white';
    }
  };

  const isDark = ['black', 'blue'].includes(details.card_color || '') || !details.card_color;

  return (
    <div 
      onClick={onClick}
      className={`relative w-full aspect-[1.586/1] rounded-3xl p-6 shadow-xl overflow-hidden cursor-pointer transition-transform active:scale-95 group ${getGradient()}`}
    >
      {/* Texture/Shine Effect */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
             <CreditCard size={20} className="opacity-80" />
             <span className="text-xs font-bold tracking-widest uppercase opacity-80">{details.bank_name}</span>
          </div>
          <Wifi size={24} className="opacity-60 rotate-90" />
        </div>

        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-3">
              <div className="bg-white/20 w-10 h-7 rounded-md border border-white/20"></div>
              <Zap size={16} className={`opacity-80 ${status.statusColor === 'red' ? 'text-rose-400 animate-pulse' : ''}`} />
           </div>
           <p className="font-mono text-lg tracking-widest opacity-90 mt-2">
             •••• •••• •••• <span className="font-bold">{details.card_last_digits || '0000'}</span>
           </p>
        </div>

        <div className="flex justify-between items-end">
           <div>
              <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Current Balance</p>
              <p className="text-xl font-black tracking-tight">{currencyFormatter.format(account.current_balance)}</p>
           </div>
           <div className="text-right">
              <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
                 {status.daysToDue > 0 ? `Due in ${status.daysToDue} days` : 'Statement Closed'}
              </p>
              <div className="flex items-center justify-end gap-1.5">
                 <div className="h-1.5 w-16 bg-black/20 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${status.utilization > 70 ? 'bg-rose-500' : isDark ? 'bg-white' : 'bg-black'}`} 
                        style={{ width: `${status.utilization}%` }}
                    ></div>
                 </div>
                 <span className="text-[9px] font-bold opacity-80">{status.utilization.toFixed(0)}%</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

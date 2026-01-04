
import React from 'react';
import { currencyFormatter, getCategoryIcon, getCategoryLabel } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface RecentTransactionListProps {
  transactions: any[];
  onSeeAll: () => void;
  onEditTransaction: (txn: any) => void;
}

export const RecentTransactionList: React.FC<RecentTransactionListProps> = ({ 
  transactions, 
  onSeeAll,
  onEditTransaction 
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-lg text-slate-900">{t('common.recent')}</h3>
        <button 
          onClick={onSeeAll}
          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
        >
          {t('common.see_all')}
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm font-medium">{t('stats.no_transactions')}</div>
        ) : (
          transactions.map((item, idx) => {
            const { icon, bg, text } = getCategoryIcon(item.category);
            const isIncome = item.group === 'INCOME';
            
            // Format date to DD/MM/YYYY or equivalent locale date string
            const dateObj = new Date(item.date || item.datetime);
            const dateStr = dateObj.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            return (
              <div 
                key={idx} 
                onClick={() => onEditTransaction(item)}
                className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white border border-slate-50 shadow-soft hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} ${text} group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-[24px]">{icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{item.note}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <p className="text-xs text-slate-400 font-medium">{getCategoryLabel(item.category, t)}</p>
                       <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                       <span className={`text-[8px] font-black uppercase tracking-widest ${isIncome ? 'text-emerald-500' : 'text-indigo-400'}`}>
                         {isIncome ? t('history.income') : t('history.expense')}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {isIncome ? '+' : '-'}{currencyFormatter.format(item.amount)}
                  </p>
                  <p className="text-[10px] text-slate-300 font-bold mt-0.5">{dateStr}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

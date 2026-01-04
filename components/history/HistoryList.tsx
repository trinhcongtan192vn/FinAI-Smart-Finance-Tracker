
import React from 'react';
import { Info } from 'lucide-react';
import { currencyFormatter, getCategoryIcon, getCategoryLabel } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface HistoryListProps {
  grouped: any[];
  onEdit: (item: any) => void;
  permission: string;
  sortKey: string;
}

export const HistoryList: React.FC<HistoryListProps> = ({ grouped, onEdit, permission, sortKey }) => {
  const { t } = useTranslation();

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-300 gap-4">
        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
          <Info size={40} className="opacity-20" />
        </div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">{t('history.no_entries')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 px-5 mt-6 pb-20">
      {grouped.map(([friendlyLabel, items]: any) => (
        <div key={friendlyLabel} className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{friendlyLabel}</span>
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase leading-none">{items.length} items</span>
          </div>
          <div className="flex flex-col gap-3">
            {items.map((item: any) => {
              const { icon, bg, text: iconText } = getCategoryIcon(item.category);
              const isInc = item.group === 'INCOME';
              const displayDate = item.date || (item.datetime ? item.datetime.split('T')[0] : '');
              return (
                <div 
                  key={item.id} 
                  onClick={() => permission !== 'view' ? onEdit(item) : alert("View-only access.")} 
                  className="flex items-center justify-between p-4 bg-white rounded-[1.5rem] border border-transparent shadow-soft hover:shadow-md hover:border-indigo-50/50 group cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl shrink-0 flex items-center justify-center ${bg} ${iconText} group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-[20px] sm:text-[24px]">{icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                        {item.note || getCategoryLabel(item.category, t)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {getCategoryLabel(item.category, t)}
                        </span>
                        {item.group && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-slate-300 shrink-0"></span>
                            <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0 ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {isInc ? t('history.income') : t('history.expense')}
                            </span>
                          </>
                        )}
                      </div>
                      {sortKey === 'amount' && (
                         <p className="text-[9px] font-bold text-slate-300 uppercase mt-0.5">{displayDate}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2 sm:ml-4">
                    <p className={`text-sm sm:text-base font-black whitespace-nowrap ${isInc ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {isInc ? '+' : '-'}{currencyFormatter.format(item.amount || 0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};


import React from 'react';
import { Search, LayoutGrid, TrendingUp, TrendingDown } from 'lucide-react';
import { DateInput } from '../ui/DateInput';
import { useTranslation } from 'react-i18next';

interface HistoryFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  groupFilter: 'all' | 'INCOME' | 'EXPENSES';
  setGroupFilter: (val: 'all' | 'INCOME' | 'EXPENSES') => void;
  dateRange: { start: string; end: string };
  setDateRange: (val: { start: string; end: string }) => void;
}

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  groupFilter,
  setGroupFilter,
  dateRange,
  setDateRange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder={t('history.search_placeholder')}
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-[1.25rem] text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all" 
        />
      </div>

      <div className="flex p-1 bg-slate-100 rounded-[1.25rem] shadow-inner">
        {[
          { id: 'all', label: t('history.all'), icon: LayoutGrid },
          { id: 'INCOME', label: t('history.income'), icon: TrendingUp },
          { id: 'EXPENSES', label: t('history.expense'), icon: TrendingDown },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setGroupFilter(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${
              groupFilter === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={14} className={groupFilter === tab.id ? 'text-indigo-600' : 'text-slate-400'} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <DateInput 
            value={dateRange.start} 
            onChange={(val) => setDateRange({...dateRange, start: val})} 
          />
        </div>
        <div className="flex items-center text-slate-300 font-black pt-1">TO</div>
        <div className="flex-1">
          <DateInput 
            value={dateRange.end} 
            onChange={(val) => setDateRange({...dateRange, end: val})} 
          />
        </div>
      </div>
    </div>
  );
};

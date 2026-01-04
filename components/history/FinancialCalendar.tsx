
import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, MoreHorizontal } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrencyCompact, currencyFormatter, getCategoryIcon } from '../../lib/utils';

interface FinancialCalendarProps {
  transactions: Transaction[];
  currentDate: Date;
  onMonthChange: (date: Date) => void;
}

export const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ 
  transactions, 
  currentDate, 
  onMonthChange 
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Reset selection when month changes
  useEffect(() => {
    setSelectedDay(null);
  }, [currentDate]);

  // Helpers for Date Math
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => {
    // 0 = Sunday, 1 = Monday. We want Monday start.
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const startOffset = getFirstDayOfMonth(currentDate);
  const monthLabel = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  // Aggregate Data per Day
  const dailyData = useMemo(() => {
    const map: Record<number, { income: number; expense: number; net: number; count: number }> = {};
    
    transactions.forEach(t => {
      // Only process INCOME or EXPENSES for the calendar visualization
      if (t.group !== 'INCOME' && t.group !== 'EXPENSES') return;

      const d = new Date(t.datetime);
      if (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()) {
        const day = d.getDate();
        if (!map[day]) map[day] = { income: 0, expense: 0, net: 0, count: 0 };
        
        const amt = Number(t.amount);
        if (t.group === 'INCOME') {
          map[day].income += amt;
          map[day].net += amt;
        } else {
          map[day].expense += amt;
          map[day].net -= amt;
        }
        map[day].count += 1;
      }
    });
    return map;
  }, [transactions, currentDate]);

  const getDayTransactions = (day: number) => {
    return transactions.filter(t => {
        const d = new Date(t.datetime);
        return d.getDate() === day && 
               d.getMonth() === currentDate.getMonth() && 
               d.getFullYear() === currentDate.getFullYear() &&
               (t.group === 'INCOME' || t.group === 'EXPENSES');
    }).sort((a, b) => Number(b.amount) - Number(a.amount));
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  // Generate Calendar Grid
  const renderCalendarDays = () => {
    const days = [];
    // Padding for empty days at start
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-slate-50/30 border border-slate-50/50 rounded-xl"></div>);
    }

    // Actual Days
    for (let i = 1; i <= daysInMonth; i++) {
      const data = dailyData[i];
      const dayOfWeekIndex = (startOffset + i - 1) % 7;
      const isWeekend = dayOfWeekIndex === 5 || dayOfWeekIndex === 6;

      const hasActivity = data && data.count > 0;
      const isPositive = data && data.net >= 0;
      const isNeutral = data && data.income === 0 && data.expense === 0;
      const isSelected = selectedDay === i;

      days.push(
        <div 
          key={i}
          onClick={() => hasActivity && setSelectedDay(i)}
          className={`h-20 p-1.5 flex flex-col justify-between rounded-2xl border transition-all relative overflow-hidden ${
            isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 z-10' :
            isWeekend ? 'bg-slate-100/50 border-slate-200/60' : 'bg-white border-slate-100'
          } ${hasActivity ? 'cursor-pointer hover:border-indigo-200 shadow-sm' : ''}`}
        >
          <span className={`text-[10px] font-bold ${isWeekend ? 'text-slate-500' : 'text-slate-300'}`}>{i}</span>
          
          {hasActivity && !isNeutral ? (
            <div className="flex flex-col items-end gap-0.5">
               {/* Show Income dot if exists */}
               {data.income > 0 && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute top-2 right-2"></div>}
               {/* Show Expense dot if exists */}
               {data.expense > 0 && <div className="w-1.5 h-1.5 bg-rose-400 rounded-full absolute top-2 right-4"></div>}

               {/* Net Value Display */}
               <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-md w-full text-center truncate ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                 {isPositive ? '+' : ''}{formatCurrencyCompact(data.net)}
               </div>
            </div>
          ) : null}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white p-4 rounded-[2rem] shadow-soft border border-indigo-50/50 mb-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft size={20} className="text-slate-400" /></button>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{monthLabel}</h3>
        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight size={20} className="text-slate-400" /></button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, idx) => (
          <span key={d} className={`text-[9px] font-black uppercase ${idx >= 5 ? 'text-orange-400' : 'text-slate-300'}`}>{d}</span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 relative">
        {renderCalendarDays()}
      </div>
      
      {/* Tooltip Overlay */}
      {selectedDay !== null && (
        <div className="absolute inset-x-4 top-16 bottom-4 z-20 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm rounded-2xl" onClick={() => setSelectedDay(null)}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[280px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        {selectedDay} {monthLabel}
                    </span>
                    <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
                    {getDayTransactions(selectedDay).slice(0, 5).map(t => {
                        const { icon, text } = getCategoryIcon(t.category);
                        const isIncome = t.group === 'INCOME';
                        return (
                            <div key={t.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 ${text}`}>
                                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-slate-900 truncate">{t.note || t.category}</p>
                                        <p className="text-[9px] text-slate-400 truncate">{t.category}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black ${isIncome ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {isIncome ? '+' : '-'}{currencyFormatter.format(Math.abs(Number(t.amount)))}
                                </span>
                            </div>
                        );
                    })}
                    {getDayTransactions(selectedDay).length > 5 && (
                        <div className="text-center pt-1">
                            <span className="text-[9px] font-bold text-slate-400 flex items-center justify-center gap-1">
                                <MoreHorizontal size={12} /> và {getDayTransactions(selectedDay).length - 5} giao dịch khác
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Summary Legend */}
      <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-slate-50">
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-[9px] font-bold text-slate-400">Thu nhập</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-400"></div>
            <span className="text-[9px] font-bold text-slate-400">Chi tiêu</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-md bg-slate-200"></div>
            <span className="text-[9px] font-bold text-slate-400">Cuối tuần</span>
         </div>
      </div>
    </div>
  );
};

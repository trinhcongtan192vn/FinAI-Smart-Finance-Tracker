
import React, { useMemo } from 'react';
import { Calendar, Info, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
import { currencyFormatter } from '../../lib/utils';
import { LiabilityDetails } from '../../types';

interface AmortizationScheduleProps {
  details: LiabilityDetails;
  currentBalance: number;
  onRepay: (item: any) => void;
}

export const AmortizationSchedule: React.FC<AmortizationScheduleProps> = ({ details, currentBalance, onRepay }) => {
  const schedule = useMemo(() => {
    const items = [];
    let runningBalance = currentBalance;
    
    // Safety check
    if (runningBalance <= 0) return [];

    const loanStartDate = new Date(details.start_date);
    loanStartDate.setHours(0,0,0,0);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const totalTermMonths = details.term_months || 12;
    const paymentDayParam = details.payment_day; 

    // Helper: Determine payment date based on an absolute month offset from start
    const getPaymentDateByOffset = (startYear: number, startMonth: number, monthOffset: number) => {
        const targetDate = new Date(startYear, startMonth + monthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        if (paymentDayParam === 0) {
            // Last day of month
            return new Date(year, month + 1, 0); 
        }
        // Specific day: take min(param, lastDayOfMonth) to handle Feb 28/30/31 logic
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(paymentDayParam, lastDayOfMonth));
    };

    const getDaysDiff = (start: Date, end: Date) => {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    };

    // Determine Interval
    let intervalMonths = 1;
    if (details.payment_cycle === 'QUARTERLY') intervalMonths = 3;
    else if (details.payment_cycle === 'SEMI_ANNUAL') intervalMonths = 6;
    else if (details.payment_cycle === 'YEARLY') intervalMonths = 12;
    else if (details.payment_cycle === 'END_OF_TERM') intervalMonths = totalTermMonths;

    // --- ALGORITHM START ---
    const startYear = loanStartDate.getFullYear();
    const startMonth = loanStartDate.getMonth();
    
    // 1. Find the First Payment Date
    // If cycle > 1 month (e.g. Quarterly), we default to Start + Interval to ensure full period.
    // If Monthly, we check if we can snap to the current month's payment day (Short Period) or need to go to next.
    let currentMonthOffset = 0;
    
    if (intervalMonths === 1) {
        // Monthly: Try aligning to same month first
        let candidate = getPaymentDateByOffset(startYear, startMonth, 0);
        if (candidate > loanStartDate) {
            currentMonthOffset = 0; // Short first period (e.g. Borrow Jan 1, Pay Jan 15)
        } else {
            currentMonthOffset = 1; // Standard next month (e.g. Borrow Jan 20, Pay Feb 15)
        }
    } else {
        // Long Cycles: Always jump full interval
        // e.g. Quarterly: Borrow Jan 1 -> First Payment April (Offset 3)
        currentMonthOffset = intervalMonths;
    }

    let periodEnd = getPaymentDateByOffset(startYear, startMonth, currentMonthOffset);
    
    // 2. Fast forward to Current/Future Period
    // Skip past periods to show upcoming schedule based on Current Balance
    while (periodEnd < today) {
        currentMonthOffset += intervalMonths;
        periodEnd = getPaymentDateByOffset(startYear, startMonth, currentMonthOffset);
    }

    // 3. Generate Forecast Rows
    const maxRows = 12;
    let rowCount = 0;
    
    // Determine start of the *current* period
    let prevPeriodEnd: Date;
    if (currentMonthOffset === 0 && periodEnd >= loanStartDate) {
         prevPeriodEnd = new Date(loanStartDate);
    } else if (currentMonthOffset < intervalMonths) {
         // Should not happen with new logic, but fallback to loan start
         prevPeriodEnd = new Date(loanStartDate);
    } else {
         prevPeriodEnd = getPaymentDateByOffset(startYear, startMonth, currentMonthOffset - intervalMonths);
         // Ensure we don't go before loan start if logic was fuzzy
         if (prevPeriodEnd < loanStartDate) prevPeriodEnd = new Date(loanStartDate);
    }

    let periodStart = new Date(prevPeriodEnd);
    if (periodStart.getTime() !== loanStartDate.getTime()) {
        periodStart.setDate(periodStart.getDate() + 1);
    }

    while (rowCount < maxRows && runningBalance > 100) {
      periodEnd = getPaymentDateByOffset(startYear, startMonth, currentMonthOffset);
      
      const daysForInterest = Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const dailyRate = (details.interest_rate / 100) / 365;
      
      let interest = 0;
      if (details.interest_type === 'REDUCING_BALANCE') {
          interest = runningBalance * dailyRate * daysForInterest;
      } else {
          // Flat rate on original principal
          interest = details.principal_amount * dailyRate * daysForInterest;
      }

      // Principal Repayment Logic
      let principalRepay = 0;
      
      // Calculate approximate months passed for Grace Period check
      const monthsFromStart = (periodEnd.getFullYear() - startYear) * 12 + (periodEnd.getMonth() - startMonth);
      const isGrace = monthsFromStart <= (details.grace_period_months || 0);

      if (isGrace) {
          principalRepay = 0;
      } else {
          if (details.payment_cycle === 'END_OF_TERM') {
              const loanEndDate = details.end_date ? new Date(details.end_date) : null;
              if (loanEndDate && periodEnd >= loanEndDate) {
                  principalRepay = runningBalance;
              } else {
                  principalRepay = 0;
              }
          } else {
              // Amortizing approximation
              // Calculate remaining *full* intervals
              const remainingMonths = Math.max(1, (totalTermMonths || 12) - (monthsFromStart - intervalMonths)); 
              const remainingPeriods = Math.ceil(remainingMonths / intervalMonths);
              
              // Simple division of current balance by remaining periods
              if (remainingPeriods > 0) {
                  principalRepay = runningBalance / remainingPeriods;
              } else {
                  principalRepay = runningBalance;
              }
          }
      }

      if (principalRepay > runningBalance) principalRepay = runningBalance;

      interest = Math.round(interest);
      principalRepay = Math.round(principalRepay);
      const totalPay = interest + principalRepay;
      const endingBalance = runningBalance - principalRepay;

      items.push({
        idx: rowCount,
        startDateStr: periodStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        endDateStr: periodEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        fullDate: periodEnd.toISOString().split('T')[0],
        days: daysForInterest,
        interest,
        principal: principalRepay,
        total: totalPay,
        remaining: Math.max(0, endingBalance),
        isGrace
      });

      if (endingBalance <= 0) break;

      runningBalance = endingBalance;
      rowCount++;

      periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() + 1);
      currentMonthOffset += intervalMonths;
    }

    return items;
  }, [details, currentBalance]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dự kiến thanh toán (Dynamic)</h4>
        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
           {details.payment_cycle}
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-3 text-[8px] font-black text-slate-400 uppercase whitespace-nowrap">Kỳ hạn</th>
                <th className="p-3 text-[8px] font-black text-slate-400 uppercase text-right">Lãi (Est)</th>
                <th className="p-3 text-[8px] font-black text-slate-400 uppercase text-right">Gốc</th>
                <th className="p-3 text-[8px] font-black text-slate-400 uppercase text-center">Thao tác</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {schedule.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-[10px] text-slate-400 italic">Đã tất toán xong.</td></tr>
                ) : schedule.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-900">{item.startDateStr} - {item.endDateStr}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{item.days} ngày {item.isGrace ? '(Ân hạn)' : ''}</span>
                        </div>
                    </td>
                    <td className="p-3 text-right">
                        <p className="text-[10px] font-bold text-orange-500">{currencyFormatter.format(item.interest)}</p>
                    </td>
                    <td className="p-3 text-right">
                        <p className="text-[10px] font-bold text-indigo-600">
                            {currencyFormatter.format(item.principal)}
                        </p>
                        <p className="text-[8px] text-slate-400">Dư nợ: {currencyFormatter.format(item.remaining)}</p>
                    </td>
                    <td className="p-3 text-center">
                        <button 
                            onClick={() => onRepay(item)}
                            className="bg-slate-900 text-white p-2 rounded-xl shadow-md hover:bg-slate-700 active:scale-90 transition-all"
                            title="Trả kỳ này"
                        >
                            <Wallet size={12} />
                        </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
      
      <div className="p-3 bg-slate-50 rounded-2xl flex gap-2 items-start border border-slate-100">
        <ShieldCheck size={12} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
            <p className="text-[8px] font-medium text-slate-500 leading-relaxed uppercase">
            Hệ thống tự động tính lãi theo <strong>số ngày thực tế</strong> và <strong>dư nợ giảm dần</strong>.
            </p>
            <p className="text-[8px] font-medium text-slate-400 leading-relaxed uppercase">
            Bất kỳ khoản trả nợ nào (dù nhỏ) cũng sẽ làm giảm gốc và cập nhật lại bảng này ngay lập tức.
            </p>
        </div>
      </div>
    </div>
  );
};

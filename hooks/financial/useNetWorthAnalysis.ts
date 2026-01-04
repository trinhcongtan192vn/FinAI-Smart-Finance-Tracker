
import { useMemo } from 'react';
import { Account, MonthlySnapshot, Transaction } from '../../types';
import { NetWorthPoint } from '../useFinancialHealth';

export const useNetWorthAnalysis = (
  accounts: Account[],
  snapshots: MonthlySnapshot[],
  transactions: Transaction[] // Injected to calculate history if snapshots missing
) => {
  const netWorthData = useMemo(() => {
    const history: NetWorthPoint[] = [];

    // 1. Try to use official Snapshots first (Highest Accuracy)
    snapshots.forEach(s => {
       history.push({
          date: s.id, // YYYY-MM
          assets: s.summary.total_assets,
          liabilities: s.summary.total_liabilities,
          netWorth: s.summary.net_worth
       });
    });

    // 2. Calculate Current Live Status
    const currentAssets = accounts.filter(a => a.group === 'ASSETS').reduce((s, a) => s + (a.current_balance || 0), 0);
    const currentLiabilities = accounts.filter(a => a.group === 'CAPITAL' && a.category !== 'Equity Fund').reduce((s, a) => s + (a.current_balance || 0), 0);
    const currentNetWorth = currentAssets - currentLiabilities;
    
    // Add "Now" if not already covered by a snapshot for this month
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    if (!history.find(h => h.date === currentMonthKey)) {
        history.push({
            date: 'Now',
            assets: currentAssets,
            liabilities: currentLiabilities,
            netWorth: currentNetWorth
        });
    }

    // --- FORECAST LOGIC ---
    // Ensure history is sorted
    history.sort((a,b) => (a.date === 'Now' ? 1 : b.date === 'Now' ? -1 : a.date.localeCompare(b.date)));

    let avgGrowth = 0;
    if (history.length > 1) {
        // Calculate Weighted Growth (Last 3 months matter more)
        const recent = history.slice(-4); // Last 3 points + Now
        const firstVal = recent[0]?.netWorth || 0;
        const lastVal = recent[recent.length - 1]?.netWorth || 0;
        if (firstVal !== 0) {
             const diff = lastVal - firstVal;
             avgGrowth = diff / Math.max(1, recent.length - 1);
        }
    }

    // Bridge the gap
    const lastPoint = history[history.length - 1];
    if (lastPoint) {
        lastPoint.forecast = lastPoint.netWorth; 
    }

    const forecast: NetWorthPoint[] = [];
    let lastForecastVal = lastPoint?.netWorth || 0;
    
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const dateLabel = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        lastForecastVal += avgGrowth;
        forecast.push({ date: dateLabel, forecast: lastForecastVal });
    }

    return { combined: [...history, ...forecast], avgGrowth };
  }, [snapshots, accounts, transactions]);

  return netWorthData;
};


import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where, doc } from 'firebase/firestore';
import { Account, Transaction, MonthlySnapshot, Category, PnLBreakdown, WaterfallStep, UserAIInsights } from '../types';
import { currencyFormatter, percentFormatter } from '../lib/utils';
import { usePnLAnalysis } from './financial/usePnLAnalysis';
import { useNetWorthAnalysis } from './financial/useNetWorthAnalysis';

export interface NetWorthPoint {
  date: string;
  assets?: number;
  liabilities?: number;
  netWorth?: number;
  forecast?: number;
}

export interface InvestmentPerformance {
  category: string;
  costBasis: number;
  marketValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalROI: number;
}

export interface FundHealthData {
  avgMonthlyExpense: number;
  runwayMonths: number;
  emergencyFundName: string;
  funds: {
    id: string;
    name: string;
    balance: number;
    target: number;
    color: string;
    description?: string;
    tags?: string[];
    rebalancingAlert?: boolean;
  }[];
  movements: {
    month: string;
    inflow: number;
    outflow: number;
  }[];
}

export const useFinancialHealth = (uid: string) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [aiInsights, setAiInsights] = useState<UserAIInsights>({});
  const [reportMode, setReportMode] = useState<'BASIC' | 'ADVANCED'>('ADVANCED');
  const [loading, setLoading] = useState(true);

  // 1. Fetch Basic Data (Live) + Snapshots
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const unsubUser = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAiInsights(data.aiInsights || {});
        if (data.reportMode) setReportMode(data.reportMode);
      }
    });

    const unsubAccs = onSnapshot(collection(db, 'users', uid, 'accounts'), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    }, (err) => console.warn("FinancialHealth Accs Error:", err.code));

    const unsubCats = onSnapshot(collection(db, 'users', uid, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (err) => console.warn("FinancialHealth Cats Error:", err.code));

    // Optimization: Only fetch transactions from last 6 months for PnL & Retrograde NW Calc
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    const qTxns = query(collection(db, 'users', uid, 'transactions'), where('datetime', '>=', sixMonthsAgo.toISOString()), orderBy('datetime', 'asc'));
    const unsubTxns = onSnapshot(qTxns, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (err) => console.warn("FinancialHealth Txns Error:", err.code));

    // Fetch Snapshots (Optimized History)
    const qSnaps = query(collection(db, 'users', uid, 'monthly_snapshots'), orderBy('id', 'desc'), limit(12));
    const unsubSnaps = onSnapshot(qSnaps, (snap) => {
      setSnapshots(snap.docs.map(d => d.data() as MonthlySnapshot).reverse()); // Reverse to get ASC order
      setLoading(false);
    }, (err) => {
      console.warn("FinancialHealth Snaps Error:", err.code);
      setLoading(false);
    });

    return () => { unsubUser(); unsubAccs(); unsubCats(); unsubTxns(); unsubSnaps(); };
  }, [uid]);

  // Helpers
  const getTxnsForMonth = (monthOffset: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    return transactions.filter(t => {
      const d = new Date(t.datetime);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
  };

  const getMonthLabel = (monthOffset: number) => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  };

  // 2. Sub-hooks for logic - PASS TRANSACTIONS TO NET WORTH ANALYSIS
  const netWorthData = useNetWorthAnalysis(accounts, snapshots, transactions);
  // Pass accounts to PnL Analysis for Cash Flow Bridge
  const { pnlAnalysis, waterfallData } = usePnLAnalysis(transactions, categories, accounts, getTxnsForMonth, getMonthLabel);

  // 3. Computed: Investment Performance (Kept local as it relies heavily on account structure)
  const investmentStats = useMemo((): InvestmentPerformance[] => {
    // Filter out CLOSED or LIQUIDATED accounts to prevent sold assets from affecting active ROI
    const investmentAccs = accounts.filter(a => 
      ['Stocks', 'Crypto', 'Gold', 'Real Estate'].includes(a.category) && 
      a.status === 'ACTIVE'
    );
    const cats = Array.from(new Set(investmentAccs.map(a => a.category))) as string[];
    
    const stats = cats.map(cat => {
        const accs = investmentAccs.filter(a => a.category === cat);
        let cost = 0;
        let market = 0;
        let realized = 0;
        
        accs.forEach(a => {
            if (a.category === 'Real Estate' && a.real_estate_details) {
                cost += a.real_estate_details.total_investment;
            } else if (a.investment_details) {
                cost += a.investment_details.total_units * a.investment_details.avg_price;
            }
            market += a.current_balance || 0;
            realized += a.realized_pnl || 0;
        });

        // Debug Log for ROI Calculation
        console.log(`[ROI Debug] Group: ${cat}`, { 
            activeAccounts: accs.length, 
            totalCost: cost, 
            marketValue: market, 
            realizedPnL: realized 
        });

        const unrealized = market - cost;
        // Logic Adjustment: ROI % should reflect Active Portfolio Performance (Unrealized ROI)
        const totalROI = cost > 0 ? (unrealized / cost) : 0;

        return { category: cat, costBasis: cost, marketValue: market, realizedPnL: realized, unrealizedPnL: unrealized, totalROI };
    });
    
    // Filter out inactive categories (No active capital invested)
    return stats
        .filter(s => s.costBasis > 0 || s.marketValue > 0)
        .sort((a, b) => b.totalROI - a.totalROI);
  }, [accounts]);

  // 4. Capital Structure
  const capitalStructure = useMemo(() => {
      const assets = accounts.filter(a => a.group === 'ASSETS').reduce((s, a) => s + (a.current_balance || 0), 0);
      const equity = accounts.filter(a => a.group === 'CAPITAL' && a.category === 'Equity Fund').reduce((s, a) => s + (a.current_balance || 0), 0);
      const debt = accounts.filter(a => a.group === 'CAPITAL' && a.category !== 'Equity Fund').reduce((s, a) => s + (a.current_balance || 0), 0);
      const debtToAsset = assets > 0 ? (debt / assets) * 100 : 0;
      return { assets, equity, debt, debtToAsset };
  }, [accounts]);

  // 5. Fund Health
  const fundHealth = useMemo((): FundHealthData => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const expenseTxns = transactions.filter(t => t.group === 'EXPENSES' && new Date(t.datetime) >= sixMonthsAgo);
    const totalExpense6M = expenseTxns.reduce((sum, t) => sum + Number(t.amount), 0);
    const avgMonthlyExpense = totalExpense6M > 0 ? totalExpense6M / 6 : 0;

    const emergencyFund = accounts.find(a => 
        a.group === 'CAPITAL' && 
        a.category === 'Equity Fund' && 
        (a.tags?.includes('EMERGENCY') || a.name.toLowerCase().includes('emergency') || a.name.toLowerCase().includes('dự phòng'))
    ) || accounts.find(a => a.group === 'CAPITAL' && a.category === 'Equity Fund');

    const runwayMonths = avgMonthlyExpense > 0 ? (emergencyFund?.current_balance || 0) / avgMonthlyExpense : 0;

    const funds = accounts
        .filter(a => a.group === 'CAPITAL' && a.category === 'Equity Fund')
        .map(f => {
            const isSpending = f.tags?.includes('SPENDING') || f.name.toLowerCase().includes('spending') || f.name.toLowerCase().includes('chi tiêu');
            const alertThreshold = avgMonthlyExpense * 1.6; 
            const rebalancingAlert = isSpending && f.current_balance > alertThreshold && f.current_balance > 10000000;

            return {
                id: f.id,
                name: f.name,
                balance: f.current_balance,
                target: f.target_amount || 0,
                color: f.color_code || '#4F46E5',
                description: f.description,
                tags: f.tags || [],
                rebalancingAlert
            };
        });

    const movementsMap: Record<string, { month: string, inflow: number, outflow: number }> = {};
    const equityFundIds = new Set(funds.map(f => f.id));

    transactions.forEach(t => {
        const month = t.datetime.substring(0, 7);
        if (!movementsMap[month]) movementsMap[month] = { month, inflow: 0, outflow: 0 };
        const amt = Number(t.amount);

        if (equityFundIds.has(t.credit_account_id)) movementsMap[month].inflow += amt;
        if (equityFundIds.has(t.debit_account_id)) movementsMap[month].outflow += amt;
    });

    const movements = Object.values(movementsMap).sort((a,b) => a.month.localeCompare(b.month)).slice(-6);

    return { avgMonthlyExpense, runwayMonths, emergencyFundName: emergencyFund?.name || 'Cash Reserve', funds, movements };
  }, [accounts, transactions]);

  // 6. CFO Context
  const cfoContext = useMemo(() => {
      const topExpense = pnlAnalysis.current.expense.topCategories[0];
      const bestInvestment = investmentStats.length > 0 ? investmentStats[0] : null;
      
      const lastNetWorth = netWorthData.combined.find(p => p.date === 'Now')?.netWorth || 0;
      const firstNetWorth = netWorthData.combined[0]?.netWorth || 0;
      const nwGrowth = firstNetWorth !== 0 ? (lastNetWorth - firstNetWorth) / firstNetWorth : 0;

      return {
          net_worth_growth_6m: percentFormatter.format(nwGrowth),
          monthly_burn: currencyFormatter.format(fundHealth.avgMonthlyExpense),
          runway: `${fundHealth.runwayMonths.toFixed(1)} months`,
          top_expense_category: topExpense ? `${topExpense.name} (${currencyFormatter.format(topExpense.amount)})` : 'None',
          best_performing_asset: bestInvestment ? `${bestInvestment.category} (${percentFormatter.format(bestInvestment.totalROI)})` : 'None',
          savings_rate: percentFormatter.format(pnlAnalysis.current.savingsRate / 100),
          debt_to_asset: percentFormatter.format(capitalStructure.debtToAsset / 100)
      };
  }, [netWorthData, pnlAnalysis, investmentStats, fundHealth, capitalStructure]);

  return {
    loading,
    accounts, 
    netWorthHistory: netWorthData.combined,
    pnlAnalysis,
    waterfallData,
    investmentStats,
    capitalStructure,
    fundHealth,
    cfoContext,
    aiInsights,
    reportMode
  };
};

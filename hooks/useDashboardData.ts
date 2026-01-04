
import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, where } from 'firebase/firestore';
import { Account, Transaction, UserAIInsights } from '../types';

export interface DashboardStats {
  balance: number;      
  netWorth: number;     
  totalAssets: number;
  totalLiabilities: number;
  income: number;
  expense: number;
  debt: number;
  equity: number;
  incomeTrend: number;
  expenseTrend: number;
  prevStats: {
    income: number;
    expense: number;
    debt: number;
    equity: number;
  };
  lists: {
    income: any[];
    expense: any[];
    debt: any[];
    equity: any[];
  };
}

export const useDashboardData = (targetUid?: string) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [aiInsights, setAiInsights] = useState<UserAIInsights>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats>({ 
    balance: 0, 
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    income: 0, 
    expense: 0,
    debt: 0,
    equity: 0,
    incomeTrend: 0,
    expenseTrend: 0,
    prevStats: { income: 0, expense: 0, debt: 0, equity: 0 },
    lists: { income: [], expense: [], debt: [], equity: [] }
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const uid = targetUid || auth.currentUser?.uid;
    if (!uid) return;

    setLoading(true);
    
    // OPTIMIZATION: Dashboard only needs Current Month + Last Month for comparison
    const now = new Date();
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const dateLimit = firstDayPrevMonth.toISOString().split('T')[0];

    const unsubProfile = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInitialBalance(data.initialBalance || 0);
        setAiInsights(data.aiInsights || {});
      }
    }, (err) => console.warn("Profile Listener Error:", err.code));

    const unsubAccs = onSnapshot(collection(db, 'users', uid, 'accounts'), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    }, (err) => console.warn("Accounts Listener Error:", err.code));

    const unsubCats = onSnapshot(collection(db, 'users', uid, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(cats);
      setMonthlyBudget(cats.reduce((sum, cat) => sum + (cat.group === 'EXPENSES' ? (Number(cat.limit) || 0) : 0), 0));
    }, (err) => console.warn("Categories Listener Error:", err.code));

    const qRecent = query(collection(db, 'users', uid, 'transactions'), orderBy('datetime', 'desc'), limit(20));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn("Recent Tx Listener Error:", err.code));

    // OPTIMIZATION: Fixed range query (last 2 months instead of 1 year)
    const qAnalytics = query(
      collection(db, 'users', uid, 'transactions'), 
      where('datetime', '>=', dateLimit),
      orderBy('datetime', 'asc')
    );
    
    const unsubAnalytics = onSnapshot(qAnalytics, (snapshot) => {
      setAllTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Analytics fetch error:", err);
      // Don't set global error here to avoid blocking dashboard if only analytics fail
      setLoading(false);
    });

    return () => {
      unsubProfile(); unsubAccs(); unsubCats(); unsubRecent(); unsubAnalytics();
    };
  }, [targetUid]);

  const monthlyTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return allTransactions.filter(t => {
      const d = new Date(t.datetime);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [allTransactions]);

  useEffect(() => {
    if (loading && allTransactions.length === 0) return;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth()}`;

    const totalAssets = accounts.filter(a => a.group === 'ASSETS').reduce((s, a) => s + (a.current_balance || 0), 0);
    const totalLiabilities = accounts.filter(a => a.group === 'CAPITAL' && a.category !== 'Equity Fund').reduce((s, a) => s + (a.current_balance || 0), 0);
    const totalCash = accounts.filter(a => a.group === 'ASSETS' && a.category === 'Cash').reduce((s, a) => s + (a.current_balance || 0), 0);

    const equityFundIds = accounts.filter(a => a.group === 'CAPITAL' && a.category === 'Equity Fund').map(a => a.id);
    const spendingFundId = accounts.find(a => a.name === 'Spending Fund' && a.category === 'Equity Fund')?.id;

    const catMap = categories.reduce((acc, c) => {
      acc[c.name] = { group: c.group };
      return acc;
    }, {} as any);

    let thisMonthInc = 0, thisMonthConsumption = 0, thisMonthDebtInterest = 0, thisMonthEquity = 0;
    let prevMonthInc = 0, prevMonthExp = 0, prevMonthDebt = 0, prevMonthEquity = 0;

    const currentMonthLists = { income: [] as any[], expense: [] as any[], debt: [] as any[], equity: [] as any[] };
    const currentMonthExpensesByDay: Record<number, number> = {};
    const currentMonthTxnsByDay: Record<number, any[]> = {};
    
    // We only use the data available in the optimized 2-month window
    const pastMonthKeys = [1].map(i => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${d.getMonth()}`;
    });

    allTransactions.forEach(d => {
      const tDate = new Date(d.datetime);
      if (isNaN(tDate.getTime())) return;

      const tKey = `${tDate.getFullYear()}-${tDate.getMonth()}`;
      const day = tDate.getDate();
      const amt = Number(d.amount) || 0;
      const effectiveGroup = d.group || catMap[d.category]?.group || 'Other';
      
      const isTargetValidEquity = equityFundIds.includes(d.credit_account_id) && d.credit_account_id !== spendingFundId;
      const isSourceValidEquity = equityFundIds.includes(d.debit_account_id) && d.debit_account_id !== spendingFundId;
      const isCapitalInjection = isTargetValidEquity && !isSourceValidEquity;

      if (tKey === currentMonthKey) {
        if (effectiveGroup === 'INCOME') { thisMonthInc += amt; currentMonthLists.income.push(d); } 
        if (d.category === 'Financial Expense' || d.category === 'Chi phí lãi vay') { thisMonthDebtInterest += amt; currentMonthLists.debt.push(d); } 
        else if (isCapitalInjection) { thisMonthEquity += amt; currentMonthLists.equity.push(d); } 
        else if (effectiveGroup === 'EXPENSES') {
          thisMonthConsumption += amt;
          currentMonthLists.expense.push(d);
          currentMonthExpensesByDay[day] = (currentMonthExpensesByDay[day] || 0) + amt;
          if (!currentMonthTxnsByDay[day]) currentMonthTxnsByDay[day] = [];
          currentMonthTxnsByDay[day].push(d);
        }
      } else if (tKey === prevMonthKey) {
        if (effectiveGroup === 'INCOME') prevMonthInc += amt;
        else if (d.category === 'Financial Expense') prevMonthDebt += amt;
        else if (effectiveGroup === 'EXPENSES') prevMonthExp += amt;
        else if (isCapitalInjection) prevMonthEquity += amt;
      }
    });

    const calcTrend = (curr: number, prev: number) => prev <= 0 ? 0 : ((curr - prev) / prev) * 100;
    
    setStats({
      balance: totalCash,
      netWorth: totalAssets - totalLiabilities,
      totalAssets, totalLiabilities,
      income: thisMonthInc, expense: thisMonthConsumption, debt: thisMonthDebtInterest, equity: thisMonthEquity,
      incomeTrend: calcTrend(thisMonthInc, prevMonthInc),
      expenseTrend: calcTrend(thisMonthConsumption, prevMonthExp),
      prevStats: { income: prevMonthInc, expense: prevMonthExp, debt: prevMonthDebt, equity: prevMonthEquity },
      lists: currentMonthLists
    });

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const chartPoints = [];
    let cumulativeCurrent = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      const dayAmount = currentMonthExpensesByDay[i] || 0;
      cumulativeCurrent += dayAmount;
      
      chartPoints.push({
        day: i,
        current: cumulativeCurrent,
        // average and yearAverage removed here to simplify dashboard load, 
        // they are better placed in full reports view
        dailyAmount: dayAmount,
        details: (currentMonthTxnsByDay[i] || []).sort((a,b) => b.amount - a.amount).slice(0, 3)
      });
    }
    setChartData(chartPoints);
  }, [allTransactions, accounts, categories, loading]);

  return { transactions, monthlyTransactions, categories, accounts, stats, chartData, initialBalance, monthlyBudget, loading, aiInsights, error };
};

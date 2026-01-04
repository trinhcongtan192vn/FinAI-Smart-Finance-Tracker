
import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { formatCurrencyCompact } from '../lib/utils';
import { Account, TransactionType, WaterfallStep } from '../types';

const getStartDateForPeriod = (period: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  if (period === 'Week') {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return d.toISOString().split('T')[0];
  } else if (period === 'Month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().split('T')[0];
  } else if (period === 'Year') {
    const d = new Date(now.getFullYear(), 0, 1);
    return d.toISOString().split('T')[0];
  }
  return null; // Fallback
};

export const useReportsData = (uid: string, activeTab: string) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Optimization: Calculate startDate based on activeTab to limit reads
    const startDate = getStartDateForPeriod(activeTab);
    // If activeTab is Year, we fetch from Jan 1. 
    // If Month, we fetch from 1st of month.
    // However, to calculate Opening Balance accurately without Snapshots, we technically need history.
    // But for the 'Flow' reports, we only need the delta.
    // For 'Opening Balance' calculation in useReportsData below, we currently fetch from 'startOfYear' in the old code.
    // To optimize, we will match the query to the period + a buffer if needed, 
    // BUT since we calculate 'openingBalance' by subtracting flows from 'Current Balance', 
    // we only need transactions WITHIN the period to reverse-engineer the opening balance!
    // So: currentBalance (Live) - FlowsInPeriod = OpeningBalanceOfPeriod.
    // This means we DO NOT need startOfYear if we are viewing Month. We only need startOfMonth.
    
    const queryDate = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    
    const qTxns = query(
      collection(db, 'users', uid, 'transactions'), 
      where('datetime', '>=', queryDate),
      orderBy('datetime', 'desc')
    );

    const unsubTxns = onSnapshot(qTxns, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Reports error:", err);
      setError("Insufficient permissions.");
      setLoading(false);
    });

    const unsubCats = onSnapshot(collection(db, 'users', uid, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAccs = onSnapshot(collection(db, 'users', uid, 'accounts'), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
    });

    return () => { unsubTxns(); unsubCats(); unsubAccs(); };
  }, [uid, activeTab]);

  const reportStats = useMemo(() => {
    // 1. Identify Cash Accounts
    const cashAccountIds = accounts
      .filter(a => a.group === 'ASSETS' && a.category === 'Cash')
      .map(a => a.id);
    
    // Real-time current Cash Balance (The Truth)
    const currentTotalCash = accounts
      .filter(a => cashAccountIds.includes(a.id))
      .reduce((sum, a) => sum + (a.current_balance || 0), 0);

    // 2. Filter Transactions for Period (Double check in memory)
    const periodStart = getStartDateForPeriod(activeTab);
    
    // Logic: Opening Balance = Current Balance - (Net Flow from PeriodStart to NOW)
    // The 'transactions' array contains data from 'queryDate' (which is periodStart) up to NOW.
    // So summing them up gives us the exact flow to reverse.
    const flowFromPeriodStartToNow = transactions
        .filter(t => periodStart ? t.datetime >= periodStart : true)
        .reduce((net, t) => {
            const isDebitCash = cashAccountIds.includes(t.debit_account_id);
            const isCreditCash = cashAccountIds.includes(t.credit_account_id);
            const amt = Number(t.amount) || 0;

            if (isDebitCash && !isCreditCash) return net + amt; // Inflow to Cash
            if (!isDebitCash && isCreditCash) return net - amt; // Outflow from Cash
            return net;
        }, 0);

    const openingBalance = currentTotalCash - flowFromPeriodStartToNow;

    const inPeriodTxns = periodStart 
      ? transactions.filter(t => t.datetime >= periodStart) 
      : transactions;

    // 3. Classify Cash Flow Components (Bridge Analysis)
    let flowOperating = 0;
    let flowInvesting = 0;
    let flowFinancing = 0;
    
    const detailsOperating: any[] = [];
    const detailsInvesting: any[] = [];
    const detailsFinancing: any[] = [];

    inPeriodTxns.forEach(t => {
        const isDebitCash = cashAccountIds.includes(t.debit_account_id);
        const isCreditCash = cashAccountIds.includes(t.credit_account_id);
        const amt = Number(t.amount) || 0;

        // Internal transfer between cash accounts -> Ignore
        if (isDebitCash && isCreditCash) return; 

        if (isDebitCash) {
            // CASH INFLOW (+)
            if (t.group === 'INCOME' || t.type === TransactionType.INTEREST_LOG) {
                // Operating Income (Salary, Bonus, Interest Received)
                flowOperating += amt;
                detailsOperating.push(t);
            } else if (
                t.type === TransactionType.ASSET_SELL || 
                t.category === 'Receivables' // Collecting Lending
            ) {
                // Investing Inflow (Divestment)
                flowInvesting += amt;
                detailsInvesting.push({ ...t, isPositive: true });
            } else if (
                t.type === TransactionType.BORROWING || 
                t.type === TransactionType.CAPITAL_INJECTION ||
                t.category === 'Liability'
            ) {
                // Financing Inflow (Loan, Owner Injection)
                flowFinancing += amt;
                detailsFinancing.push({ ...t, isPositive: true });
            } else {
                // Fallback Classification
                if (['Stocks','Crypto','Gold','Real Estate','Savings'].includes(t.category)) {
                    flowInvesting += amt;
                    detailsInvesting.push({ ...t, isPositive: true });
                } else if (t.category === 'Equity Fund') {
                    flowFinancing += amt;
                    detailsFinancing.push({ ...t, isPositive: true });
                } else {
                    flowOperating += amt;
                    detailsOperating.push(t);
                }
            }
        } else if (isCreditCash) {
            // CASH OUTFLOW (-)
            if (t.group === 'EXPENSES' || t.type === TransactionType.INTEREST_LOG) {
                // Operating Expense (Daily Living, Interest Paid)
                flowOperating -= amt;
                detailsOperating.push({ ...t, isNegative: true });
            } else if (
                t.type === TransactionType.ASSET_BUY || 
                t.type === TransactionType.ASSET_INVESTMENT ||
                t.type === TransactionType.LENDING
            ) {
                // Investing Outflow (Purchase Asset, Lend Money)
                flowInvesting -= amt;
                detailsInvesting.push({ ...t, isNegative: true });
            } else if (
                t.type === TransactionType.DEBT_REPAYMENT || 
                t.type === TransactionType.CAPITAL_WITHDRAWAL
            ) {
                if (t.category === 'Receivables') { 
                     // Rare case: outflow to receivables usually LENDING
                     flowInvesting -= amt;
                     detailsInvesting.push({ ...t, isNegative: true });
                } else {
                     // Financing Outflow (Repay Loan, Owner Draw)
                     flowFinancing -= amt;
                     detailsFinancing.push({ ...t, isNegative: true });
                }
            } else {
                 // Fallback Classification
                 if (['Stocks','Crypto','Gold','Real Estate','Savings'].includes(t.category)) {
                    flowInvesting -= amt;
                    detailsInvesting.push({ ...t, isNegative: true });
                 } else if (t.category === 'Liability') {
                    flowFinancing -= amt;
                    detailsFinancing.push({ ...t, isNegative: true });
                 } else {
                    flowOperating -= amt;
                    detailsOperating.push({ ...t, isNegative: true });
                 }
            }
        }
    });

    // Final Closing should match reconstruction
    const closingBalance = openingBalance + flowOperating + flowInvesting + flowFinancing;

    // 4. Waterfall Data Structure (Bridge)
    // Structure: Opening -> Operating (Net) -> Investing (Net) -> Financing (Net) -> Closing
    const waterfallData: WaterfallStep[] = [
        { 
            name: 'waterfall.opening', 
            value: openingBalance, 
            type: 'final', 
            fill: '#94a3b8', // Slate 400 (Gray)
            displayValue: formatCurrencyCompact(openingBalance) 
        },
        { 
            name: 'waterfall.operating', 
            value: flowOperating, 
            type: 'income', // Used for tooltip typing
            fill: flowOperating >= 0 ? '#10b981' : '#f43f5e', // Green or Red
            displayValue: (flowOperating > 0 ? '+' : '') + formatCurrencyCompact(flowOperating),
            details: detailsOperating
        },
        { 
            name: 'waterfall.investing', 
            value: flowInvesting, 
            type: 'allocation', 
            fill: '#3b82f6', // Blue/Purple
            displayValue: (flowInvesting > 0 ? '+' : '') + formatCurrencyCompact(flowInvesting),
            details: detailsInvesting
        },
        { 
            name: 'waterfall.financing', 
            value: flowFinancing, 
            type: 'allocation', 
            fill: '#f97316', // Orange
            displayValue: (flowFinancing > 0 ? '+' : '') + formatCurrencyCompact(flowFinancing),
            details: detailsFinancing
        },
        { 
            name: 'waterfall.final', 
            value: closingBalance, 
            type: 'final', 
            fill: '#334155', // Slate 700 (Dark Gray/Navy)
            displayValue: formatCurrencyCompact(closingBalance) 
        }
    ];

    // Expense Breakdown Calculation (Standard Logic)
    const catMap: Record<string, number> = {};
    let totalExpense = 0;
    inPeriodTxns.forEach(t => {
        if (t.group === 'EXPENSES' && !cashAccountIds.includes(t.debit_account_id)) { 
             const amount = Number(t.amount) || 0;
             catMap[t.category] = (catMap[t.category] || 0) + amount;
             totalExpense += amount;
        }
    });
    
    const sortedCats = Object.entries(catMap)
      .map(([name, value]) => {
        const catInfo = categories.find(c => c.name === name);
        return { name, value, limit: catInfo?.limit || 0, id: catInfo?.id };
      })
      .sort((a, b) => b.value - a.value);

    return {
      totalIncome: flowOperating > 0 ? flowOperating : 0, // Approx
      totalExpense: totalExpense,
      netSavings: flowOperating + flowInvesting + flowFinancing, // Net Cash Flow
      categoryStats: sortedCats,
      waterfallData,
      topCategory: sortedCats.length > 0 ? sortedCats[0].name : null,
      transactionCount: inPeriodTxns.length
    };
  }, [transactions, categories, activeTab, accounts]);

  return { loading, error, reportStats, transactions, categories };
};

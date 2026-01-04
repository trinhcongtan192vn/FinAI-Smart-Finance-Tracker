
import { useMemo } from 'react';
import { Transaction, Category, PnLBreakdown, WaterfallStep, TransactionType, Account } from '../../types';
import { classifyExpenseType, formatCurrencyCompact } from '../../lib/utils';

export const usePnLAnalysis = (
  transactions: Transaction[], 
  categories: Category[],
  accounts: Account[],
  getTxnsForMonth: (offset: number) => Transaction[],
  getMonthLabel: (offset: number) => string
) => {
  
  // Helper to resolve expense type
  const resolveExpenseType = (categoryName: string) => {
      const found = categories.find(c => c.name === categoryName);
      if (found && found.expense_type) return found.expense_type;
      return classifyExpenseType(categoryName);
  };

  const pnlAnalysis = useMemo(() => {
    const calculatePnL = (txns: Transaction[], label: string): PnLBreakdown => {
        let totalIncome = 0, salary = 0, investmentIncome = 0, otherInc = 0;
        let totalExpense = 0, fixedExp = 0, variableExp = 0;
        const expenseCats: Record<string, number> = {};

        txns.forEach(t => {
            const amt = Number(t.amount);
            if (t.group === 'INCOME') {
                totalIncome += amt;
                if (t.category === 'Salary' || t.category === 'Bonus') salary += amt;
                else if (t.category === 'Passive Income' || t.category === 'Capital Gain' || t.category.includes('Interest')) investmentIncome += amt;
                else otherInc += amt;
            }
            
            if (t.group === 'EXPENSES') {
                totalExpense += amt;
                const type = resolveExpenseType(t.category);
                if (type === 'FIXED') fixedExp += amt;
                else variableExp += amt;
                expenseCats[t.category] = (expenseCats[t.category] || 0) + amt;
            }
        });

        const topCategories = Object.entries(expenseCats)
            .map(([name, amount]) => ({ name, amount, type: resolveExpenseType(name) }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const fixedList = Object.entries(expenseCats)
            .filter(([name]) => resolveExpenseType(name) === 'FIXED')
            .map(([name, amount]) => ({ name, amount }))
            .sort((a,b) => b.amount - a.amount);

        const variableList = Object.entries(expenseCats)
            .filter(([name]) => resolveExpenseType(name) === 'VARIABLE')
            .map(([name, amount]) => ({ name, amount }))
            .sort((a,b) => b.amount - a.amount);

        return {
            income: { total: totalIncome, salary, investment: investmentIncome, other: otherInc },
            expense: { total: totalExpense, fixed: fixedExp, variable: variableExp, topCategories, fixedList, variableList },
            savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
            periodLabel: label
        };
    };

    const currentMonthData = calculatePnL(getTxnsForMonth(0), getMonthLabel(0));
    const prevMonthData = calculatePnL(getTxnsForMonth(-1), getMonthLabel(-1));

    return { current: currentMonthData, previous: prevMonthData };
  }, [transactions, categories, getTxnsForMonth, getMonthLabel]);

  // --- CASH FLOW BRIDGE LOGIC (Opening -> Operating -> Investing -> Financing -> Closing) ---
  const waterfallData = useMemo((): WaterfallStep[] => {
    // 1. Identify Cash Accounts
    const cashAccountIds = accounts
      .filter(a => a.group === 'ASSETS' && a.category === 'Cash')
      .map(a => a.id);
    
    // If no cash accounts, return empty
    if (cashAccountIds.length === 0) return [];

    // Current Real-time Cash Balance
    const currentTotalCash = accounts
      .filter(a => cashAccountIds.includes(a.id))
      .reduce((sum, a) => sum + (a.current_balance || 0), 0);

    // 2. Identify Transactions in the View Period (Current Month = 0)
    const txnsInMonth = getTxnsForMonth(0);
    
    // 3. Calculate Opening Balance
    // Formula: Opening = Current Balance - (Net Flow from Start of Month to Now)
    const firstTxnDate = new Date();
    const startOfMonth = new Date(firstTxnDate.getFullYear(), firstTxnDate.getMonth(), 1).toISOString();

    const flowFromStartToNow = transactions
        .filter(t => t.datetime >= startOfMonth)
        .reduce((net, t) => {
            const isDebitCash = cashAccountIds.includes(t.debit_account_id);
            const isCreditCash = cashAccountIds.includes(t.credit_account_id);
            const amt = Number(t.amount);
            if (isDebitCash && !isCreditCash) return net + amt; // Inflow
            if (!isDebitCash && isCreditCash) return net - amt; // Outflow
            return net;
        }, 0);

    const openingBalance = currentTotalCash - flowFromStartToNow;

    // 4. Classify Flows into Bridge Components
    let flowOperating = 0;
    let flowInvesting = 0;
    let flowFinancing = 0;
    
    const detailsOperating: any[] = [];
    const detailsInvesting: any[] = [];
    const detailsFinancing: any[] = [];

    txnsInMonth.forEach(t => {
        const isDebitCash = cashAccountIds.includes(t.debit_account_id);
        const isCreditCash = cashAccountIds.includes(t.credit_account_id);
        const amt = Number(t.amount);

        // Ignore Internal transfers (Cash to Cash)
        if (isDebitCash && isCreditCash) return; 
        // Ignore Non-Cash (e.g. Equity to Asset directly without cash)
        if (!isDebitCash && !isCreditCash) return; 

        const isInflow = isDebitCash;
        const signedAmt = isInflow ? amt : -amt;
        
        // Prepare detail item with signed amount for tooltip
        const detailItem = { 
            ...t, 
            amount: signedAmt, // Store signed amount directly
            displayCategory: t.category 
        };

        // --- CLASSIFICATION LOGIC ---
        let category = 'OPERATING';

        if (
            t.type === TransactionType.ASSET_BUY || 
            t.type === TransactionType.ASSET_SELL || 
            t.type === TransactionType.ASSET_INVESTMENT ||
            t.type === TransactionType.LENDING ||
            ['Stocks','Crypto','Gold','Real Estate','Savings','Receivables'].includes(t.category)
        ) {
            category = 'INVESTING';
        } else if (
            t.type === TransactionType.BORROWING ||
            t.type === TransactionType.DEBT_REPAYMENT ||
            t.type === TransactionType.CAPITAL_INJECTION ||
            t.type === TransactionType.CAPITAL_WITHDRAWAL ||
            ['Liability', 'Equity Fund', 'Bank Loan', 'Personal Loan'].includes(t.category)
        ) {
            category = 'FINANCING';
        }

        // Aggregate
        if (category === 'INVESTING') {
            flowInvesting += signedAmt;
            detailsInvesting.push(detailItem);
        } else if (category === 'FINANCING') {
            flowFinancing += signedAmt;
            detailsFinancing.push(detailItem);
        } else {
            flowOperating += signedAmt;
            detailsOperating.push(detailItem);
        }
    });

    const closingBalance = openingBalance + flowOperating + flowInvesting + flowFinancing;

    // 5. Construct Waterfall Steps
    const steps: WaterfallStep[] = [
        { 
            name: 'waterfall.opening', 
            value: openingBalance, 
            type: 'final', 
            fill: '#94a3b8', // Gray
            displayValue: formatCurrencyCompact(openingBalance) 
        },
        { 
            name: 'waterfall.operating', 
            value: flowOperating, 
            type: 'income', 
            fill: flowOperating >= 0 ? '#10b981' : '#f43f5e', // Green if +, Red if -
            displayValue: (flowOperating > 0 ? '+' : '') + formatCurrencyCompact(flowOperating),
            details: detailsOperating
        },
        { 
            name: 'waterfall.investing', 
            value: flowInvesting, 
            type: 'allocation', 
            fill: '#8b5cf6', // Purple/Violet for Investing
            displayValue: (flowInvesting > 0 ? '+' : '') + formatCurrencyCompact(flowInvesting),
            details: detailsInvesting
        },
        { 
            name: 'waterfall.financing', 
            value: flowFinancing, 
            type: 'allocation', 
            fill: '#f97316', // Orange for Financing
            displayValue: (flowFinancing > 0 ? '+' : '') + formatCurrencyCompact(flowFinancing),
            details: detailsFinancing
        },
        { 
            name: 'waterfall.final', 
            value: closingBalance, 
            type: 'final', 
            fill: '#334155', // Dark Gray/Navy
            displayValue: formatCurrencyCompact(closingBalance) 
        }
    ];

    return steps;
  }, [transactions, accounts, getTxnsForMonth]);

  return { pnlAnalysis, waterfallData };
};

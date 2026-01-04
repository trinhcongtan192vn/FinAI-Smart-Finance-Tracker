
import { useMemo } from 'react';
import { Account, FinancialProfile } from '../types';
import { currencyFormatter, percentFormatter } from '../lib/utils';

export const useFinancialContext = (
  accounts: Account[],
  financialProfile?: FinancialProfile,
  pnlStats?: { savingsRate: number; monthlyExpense: number },
  netWorth?: number
) => {
  const contextString = useMemo(() => {
    if (!financialProfile) return null;

    const totalAssets = accounts.filter(a => a.group === 'ASSETS').reduce((s, a) => s + (a.current_balance || 0), 0);
    const totalDebt = accounts.filter(a => a.group === 'CAPITAL' && a.category !== 'Equity Fund').reduce((s, a) => s + (a.current_balance || 0), 0);
    const totalCash = accounts.filter(a => a.category === 'Cash').reduce((s, a) => s + (a.current_balance || 0), 0);
    
    // Investment breakdown
    const investableAssets = accounts.filter(a => ['Stocks', 'Crypto', 'Gold', 'Real Estate'].includes(a.category));
    const investmentTotal = investableAssets.reduce((s, a) => s + (a.current_balance || 0), 0);
    
    // Top 3 assets
    const topAssets = investableAssets
        .sort((a,b) => (b.current_balance || 0) - (a.current_balance || 0))
        .slice(0, 3)
        .map(a => `${a.name} (${a.category})`);

    const context = `
      USER PERSONA (DEEP PROFILE):
      - Demographics: Age ${financialProfile.ageRange || 'Unknown'}, ${financialProfile.maritalStatus || 'Unknown'}, ${financialProfile.dependents || 0} Dependents.
      - Career: ${financialProfile.occupation || 'Not specified'}, Income ~${financialProfile.monthlyIncome || 'Unknown'}.
      - Psychology: Risk ${financialProfile.riskAppetite}, Horizon ${financialProfile.investmentHorizon}.
      - Goals: ${financialProfile.primaryGoal}.
      - Pain Points: ${(financialProfile.painPoints || []).join(', ') || 'None stated'}.
      - Existing Products: ${(financialProfile.existingProducts || []).join(', ') || 'None'}.
      - Additional Notes / User Context: "${financialProfile.additionalNotes || 'None'}"
      
      FINANCIAL SNAPSHOT (Live):
      - Net Worth: ${currencyFormatter.format(netWorth || 0)}
      - Total Assets: ${currencyFormatter.format(totalAssets)}
      - Total Debt: ${currencyFormatter.format(totalDebt)}
      - Liquidity (Cash): ${currencyFormatter.format(totalCash)}
      - Debt-to-Asset Ratio: ${totalAssets > 0 ? (totalDebt / totalAssets * 100).toFixed(1) : 0}%
      
      PERFORMANCE:
      - Monthly Savings Rate: ${pnlStats ? percentFormatter.format(pnlStats.savingsRate / 100) : 'Unknown'}
      - Avg Monthly Expense: ${pnlStats ? currencyFormatter.format(pnlStats.monthlyExpense) : 'Unknown'}
      
      PORTFOLIO STRUCTURE:
      - Investment Value: ${currencyFormatter.format(investmentTotal)}
      - Top Assets: ${topAssets.join(', ') || 'None'}
    `;

    return context;
  }, [accounts, financialProfile, pnlStats, netWorth]);

  return contextString;
};


import i18n from './i18n';
import { ScheduledEvent } from '../types';

let appCurrency = 'VND';

export const setAppCurrency = (currency: string) => {
  appCurrency = currency;
};

// --- Image Processing Helper ---

export const compressImage = async (file: File, maxWidth = 200, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        const finalScale = scaleSize < 1 ? scaleSize : 1;

        canvas.width = img.width * finalScale;
        canvas.height = img.height * finalScale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- Formatting Helpers ---

export const formatCurrency = (value: number | string | undefined | null, currency = appCurrency) => {
  const numValue = Number(value);
  if (isNaN(numValue)) return '0';

  let locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  if (currency === 'USD') locale = 'en-US';
  else if (currency === 'VND') locale = 'vi-VN';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(numValue);
  } catch (error) {
    return numValue.toString();
  }
};

export const currencyFormatter = {
  format: (value: number | string | undefined | null) => formatCurrency(value)
};

export const formatCurrencyCompact = (val: number | string | undefined | null, currency = appCurrency) => {
  const numValue = Number(val);
  if (isNaN(numValue)) return '0';

  let locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  if (currency === 'USD') locale = 'en-US';
  else if (currency === 'VND') locale = 'vi-VN';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      notation: "compact"
    }).format(numValue);
  } catch (error) {
    return numValue.toString();
  }
};

export const unitFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 6,
  minimumFractionDigits: 0
});

export const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const getCategoryLabel = (name: string, t: any) => {
  if (!name) return "";
  const key = name.toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  const translationKey = `categories.${key}`;

  if (i18n.exists(translationKey)) {
    return t(translationKey);
  }
  return name;
};

// --- Logic Helpers ---

export const classifyExpenseType = (categoryName: string): 'FIXED' | 'VARIABLE' => {
  const fixedKeywords = [
    'housing', 'rent', 'mortgage', 'nhà', 'thuê', 'nợ', 'lãi', 'interest', 'loan',
    'financial', 'insurance', 'bảo hiểm', 'internet', 'electric', 'water', 'điện', 'nước',
    'tuition', 'học phí', 'education', 'health', 'y tế', 'thuốc', 'subscription'
  ];

  const lowerName = categoryName.toLowerCase();
  if (fixedKeywords.some(k => lowerName.includes(k))) return 'FIXED';
  return 'VARIABLE';
};

export const calculateNewWAC = (
  currentUnits: number,
  currentAvgPrice: number,
  newUnits: number,
  buyPrice: number,
  fees: number = 0
): number => {
  const totalUnits = currentUnits + newUnits;
  if (totalUnits <= 0) return 0;

  const currentCostBasis = currentUnits * currentAvgPrice;
  const newCostBasis = (newUnits * buyPrice) + fees;

  return (currentCostBasis + newCostBasis) / totalUnits;
};

export const calculateRealizedPnL = (
  unitsSold: number,
  sellPrice: number,
  avgPrice: number,
  fees: number = 0
): number => {
  return (unitsSold * (sellPrice - avgPrice)) - fees;
};

export const calculateInvestmentPerformance = (details: any) => {
  if (!details || details.total_units === 0) return null;

  const costBasis = details.total_units * details.avg_price;
  const marketValue = details.total_units * details.market_price;
  const unrealizedPnL = marketValue - costBasis;
  const roi = costBasis !== 0 ? (unrealizedPnL / costBasis) : 0;

  return {
    costBasis,
    marketValue,
    unrealizedPnL,
    roi,
    isProfit: unrealizedPnL >= 0
  };
};

export const calculateTotalPortfolioPerformance = (accounts: any[]) => {
  const investments = accounts.filter(a => ['Stocks', 'Crypto', 'Gold', 'Real Estate'].includes(a.category));
  if (investments.length === 0) return null;

  let totalCostBasis = 0;
  let totalMarketValue = 0;
  let totalRealizedPnL = 0;

  investments.forEach(acc => {
    if (acc.investment_details && acc.investment_details.total_units > 0) {
      totalCostBasis += acc.investment_details.total_units * acc.investment_details.avg_price;
      totalMarketValue += acc.investment_details.total_units * acc.investment_details.market_price;
    }
    else if (acc.real_estate_details) {
      totalCostBasis += acc.real_estate_details.total_investment || 0;
      totalMarketValue += acc.current_balance || 0;
    }

    totalRealizedPnL += (acc.realized_pnl || 0);
  });

  const totalUnrealizedPnL = totalMarketValue - totalCostBasis;
  const currentPortfolioROI = totalCostBasis !== 0 ? (totalUnrealizedPnL / totalCostBasis) : 0;

  return {
    totalCostBasis,
    totalMarketValue,
    totalUnrealizedPnL,
    totalRealizedPnL,
    totalROI: currentPortfolioROI,
    isProfit: currentPortfolioROI >= 0
  };
};

export interface FinStatsParams {
  principal: number;
  rate: number;
  startDate: string;
  endDate?: string;
  period?: 'MONTHLY' | 'YEARLY';
  interestType?: 'REDUCING_BALANCE' | 'FLAT' | 'SIMPLE';
}

export const calculateFinancialStats = (params: FinStatsParams) => {
  const { principal, rate, startDate, endDate, period, interestType } = params;

  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  let progress = 0;
  let daysRemaining = 0;
  let isExpired = false;

  if (end) {
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    isExpired = now > end;
  }

  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const periodicRate = rate / 100;
  const ratePerDay = period === 'MONTHLY' ? periodicRate / 30 : periodicRate / 365;
  const estimatedInterest = principal * ratePerDay * Math.max(0, daysElapsed);

  return {
    progress,
    daysRemaining: Math.max(0, daysRemaining),
    estimatedInterest: Math.round(estimatedInterest),
    isExpired,
    hasEndDate: !!end,
    daysElapsed: Math.max(0, daysElapsed)
  };
};

export const getCategoryIcon = (category: string) => {
  const map: Record<string, { icon: string; bg: string; text: string }> = {
    'Dining': { icon: 'restaurant', bg: 'bg-orange-100', text: 'text-orange-600' },
    'Transport': { icon: 'directions_car', bg: 'bg-blue-100', text: 'text-blue-600' },
    'Housing': { icon: 'home', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    'Health': { icon: 'medical_services', bg: 'bg-rose-100', text: 'text-rose-600' },
    'Self-growth': { icon: 'school', bg: 'bg-violet-100', text: 'text-violet-600' },
    'Enjoyment': { icon: 'theater_comedy', bg: 'bg-pink-100', text: 'text-pink-600' },
    'Social': { icon: 'group', bg: 'bg-cyan-100', text: 'text-cyan-600' },
    'Financial Expense': { icon: 'account_balance', bg: 'bg-slate-100', text: 'text-slate-600' },
    'Shopping': { icon: 'shopping_bag', bg: 'bg-pink-100', text: 'text-pink-600' },
    'Other Expense': { icon: 'more_horiz', bg: 'bg-slate-100', text: 'text-slate-600' },
    'Salary': { icon: 'payments', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    'Bonus': { icon: 'card_giftcard', bg: 'bg-teal-100', text: 'text-teal-600' },
    'Passive Income': { icon: 'trending_up', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    'Other Income': { icon: 'attach_money', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    'Cash': { icon: 'payments', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    'Savings': { icon: 'savings', bg: 'bg-blue-100', text: 'text-blue-600' },
    'Stocks': { icon: 'leaderboard', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    'Crypto': { icon: 'currency_bitcoin', bg: 'bg-orange-100', text: 'text-orange-600' },
    'Gold': { icon: 'workspace_premium', bg: 'bg-amber-100', text: 'text-amber-600' },
    'Real Estate': { icon: 'location_city', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    'Lending': { icon: 'volunteer_activism', bg: 'bg-purple-100', text: 'text-purple-600' },
    'Receivables': { icon: 'volunteer_activism', bg: 'bg-purple-100', text: 'text-purple-600' },
    'Equity Fund': { icon: 'person', bg: 'bg-slate-100', text: 'text-slate-600' },
    'Equity': { icon: 'person', bg: 'bg-slate-100', text: 'text-slate-600' },
    'Bank Loan': { icon: 'request_quote', bg: 'bg-red-100', text: 'text-red-600' },
    'Personal Loan': { icon: 'handshake', bg: 'bg-orange-100', text: 'text-orange-600' },
    'Liability': { icon: 'request_quote', bg: 'bg-red-100', text: 'text-red-600' },
    'Other': { icon: 'description', bg: 'bg-slate-100', text: 'text-slate-600' },
  };
  return map[category] || map['Other'];
};

export const getCategoryColor = (category: string) => {
  const map: Record<string, { bg: string; text: string; bar: string }> = {
    'Dining': { bg: 'bg-orange-100', text: 'text-orange-600', bar: '#f97316' },
    'Transport': { bg: 'bg-blue-100', text: 'text-blue-600', bar: '#3b82f6' },
    'Housing': { bg: 'bg-indigo-100', text: 'text-indigo-600', bar: '#6366f1' },
    'Health': { bg: 'bg-rose-100', text: 'text-rose-600', bar: '#f43f5e' },
    'Self-growth': { bg: 'bg-violet-100', text: 'text-violet-600', bar: '#8b5cf6' },
    'Enjoyment': { bg: 'bg-pink-100', text: 'text-pink-600', bar: '#ec4899' },
    'Salary': { bg: 'bg-emerald-100', text: 'text-emerald-600', bar: '#10b981' },
    'Cash': { bg: 'bg-emerald-100', text: 'text-emerald-600', bar: '#10b981' },
    'Savings': { bg: 'bg-blue-100', text: 'text-blue-600', bar: '#3b82f6' },
    'Stocks': { bg: 'bg-indigo-100', text: 'text-indigo-600', bar: '#4f46e5' },
    'Personal Loan': { bg: 'bg-orange-100', text: 'text-orange-600', bar: '#f59e0b' },
    'Other': { bg: 'bg-slate-100', text: 'text-slate-600', bar: '#94a3b8' },
  };
  return map[category] || { bg: 'bg-slate-100', text: 'text-slate-600', bar: '#94a3b8' };
};

// Generate Scheduled Events based on parameters
export const generateFutureEvents = (
  principal: number,
  rate: number, // % per year
  startDate: string,
  termMonths: number,
  cycle: string, // MONTHLY, QUARTERLY, YEARLY, END_OF_TERM
  flowType: 'INFLOW' | 'OUTFLOW',
  baseTitle: string,
  paymentDay?: number
): ScheduledEvent[] => {
  const events: ScheduledEvent[] = [];
  const start = new Date(startDate);

  if (cycle === 'END_OF_TERM') {
    const end = new Date(start);
    end.setMonth(end.getMonth() + termMonths);
    // Simple interest assumption for end of term visualization
    const interest = principal * (rate / 100) * (termMonths / 12);
    events.push({
      id: crypto.randomUUID(),
      date: end.toISOString().split('T')[0],
      title: `Đáo hạn: ${baseTitle}`,
      amount: Math.round(principal + interest),
      type: flowType,
      completed: false
    });
  } else {
    // Periodic Payments
    let interval = 1;
    if (cycle === 'QUARTERLY') interval = 3;
    if (cycle === 'YEARLY') interval = 12;
    if (cycle === 'SEMI_ANNUAL') interval = 6;

    const count = Math.ceil(termMonths / interval);
    const periodicPrincipal = principal / count;
    const periodicInterest = principal * (rate / 100) * (interval / 12);
    const estimatedPayment = Math.round(periodicPrincipal + periodicInterest);

    for (let i = 1; i <= count; i++) {
      // Logic to align with paymentDay if provided
      const d = new Date(start);
      const targetMonth = d.getMonth() + (i * interval);

      if (paymentDay && paymentDay > 0) {
        // Set to specific day of target month
        d.setMonth(targetMonth);
        const daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(paymentDay, daysInTargetMonth));
      } else {
        // Default cycle add
        d.setMonth(targetMonth);
      }

      events.push({
        id: crypto.randomUUID(),
        date: d.toISOString().split('T')[0],
        title: `Kỳ ${i}: ${baseTitle}`,
        amount: estimatedPayment,
        type: flowType,
        completed: false
      });
    }
  }

  return events;
};

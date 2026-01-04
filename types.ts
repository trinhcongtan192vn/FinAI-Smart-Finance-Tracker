
export enum ViewName {
  DASHBOARD = 'DASHBOARD',
  NEW_ENTRY = 'NEW_ENTRY',
  REVIEW = 'REVIEW',
  REPORTS = 'REPORTS',
  TRANSACTIONS_HISTORY = 'TRANSACTIONS_HISTORY',
  BUDGET = 'BUDGET',
  CAPITAL = 'CAPITAL',
  ASSETS = 'ASSETS',
  ADVISOR_CHAT = 'ADVISOR_CHAT'
}

export enum MarketScenario {
  STABLE = 'STABLE',
  BEAR = 'BEAR',
  BULL = 'BULL',
  VOLATILE = 'VOLATILE'
}

export interface FIREConfig {
  currentAge: number;
  retirementAge: number;
  annualIncome: number;
  annualExpenses: number;
  savingsRate: number; // Calculated from income and expenses
  currentPortfolio: number;
  withdrawalRate: number; 
  inflationRate: number;
  
  // Asset Allocation Fields
  stocksWeight: number; // e.g. 60
  bondsWeight: number;  // e.g. 40
  stocksReturn: number; // e.g. 10
  bondsReturn: number;  // e.g. 5
  cashReturn: number;   // e.g. 3 (Interest rate for cushion)
  
  cashCushionYears: number;
}

export interface SimulationYear {
  year: number;
  age: number;
  income: number;
  expenses: number;
  bondYield: number;     // Yield from bonds
  cashInterest: number;  // Interest from cash cushion
  totalYield: number;    // bondYield + cashInterest
  stockGrowth: number;   // Growth from stocks
  yieldShield: number;   // Total non-cash portfolio
  bondAsset: number;     // Value of bonds
  stockAsset: number;    // Value of stocks
  cashCushion: number;
  totalPortfolio: number;
  isFailed: boolean;
  marketStatus: 'BULL' | 'BEAR' | 'CRASH' | 'STABLE';
  status: 'ACCUMULATION' | 'PROSPERITY' | 'PROTECTION';
}

export interface TutorialState {
  hasSeenHome: boolean;
  hasSeenAssets: boolean;
  hasSeenCapital: boolean;
  hasSeenAdvisor: boolean;
}

export interface DataContext {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  permission: 'view' | 'edit' | 'owner';
  tutorialState?: TutorialState;
  financialProfile?: FinancialProfile;
}

export enum TransactionType {
  DAILY_CASHFLOW = 'DAILY_CASHFLOW',
  CREDIT_SPENDING = 'CREDIT_SPENDING',
  CREDIT_PAYMENT = 'CREDIT_PAYMENT',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  ASSET_BUY = 'ASSET_BUY',
  ASSET_SELL = 'ASSET_SELL',
  ASSET_INVESTMENT = 'ASSET_INVESTMENT',
  ASSET_REVALUATION = 'ASSET_REVALUATION',
  LENDING = 'LENDING',
  BORROWING = 'BORROWING',
  DEBT_REPAYMENT = 'DEBT_REPAYMENT',
  CAPITAL_INJECTION = 'CAPITAL_INJECTION',
  CAPITAL_WITHDRAWAL = 'CAPITAL_WITHDRAWAL',
  FUND_ALLOCATION = 'FUND_ALLOCATION',
  INTEREST_LOG = 'INTEREST_LOG',
  INITIAL_BALANCE = 'INITIAL_BALANCE'
}

export interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: TransactionType;
  group: 'INCOME' | 'EXPENSES' | 'ASSETS' | 'CAPITAL';
  status: 'pending' | 'confirmed';
  credit_account_id: string;
  debit_account_id: string;
  createdAt: string;
  date: string;
  datetime: string;
  addedBy?: string | null;
  asset_link_id?: string | null;
  linked_fund_id?: string | null;
  units?: number;
  price?: number;
  fees?: number;
  from_account_name?: string;
  to_account_name?: string;
  related_detail_id?: string;
}

export interface InvestmentDetails {
  symbol: string;
  total_units: number;
  avg_price: number;
  market_price: number;
  last_sync: string;
  currency?: string;
  latest_ai_valuation?: any;
}

export interface InvestmentLog {
  id: string;
  date: string;
  type: 'BUY' | 'SELL' | 'CAPEX' | 'OPEX' | 'REVALUE' | 'REPAYMENT' | 'BORROW_MORE' | 'CONTRACT_ADJUSTMENT';
  units?: number;
  price: number;
  fees?: number;
  note?: string;
}

export interface LiabilityDetails {
  lender_id: string;
  lender_name: string;
  principal_amount: number;
  interest_rate: number;
  interest_type: 'REDUCING_BALANCE' | 'FLAT';
  interest_period?: 'MONTHLY' | 'YEARLY';
  payment_day: number;
  payment_cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY' | 'END_OF_TERM';
  early_settlement_fee: number;
  start_date: string;
  end_date: string;
  term_months: number;
  grace_period_months: number;
}

export interface CreditCardDetails {
  bank_name: string;
  credit_limit: number;
  statement_day: number;
  due_day: number;
  interest_rate: number;
  card_last_digits: string;
  card_color: 'gold' | 'platinum' | 'black' | 'blue';
}

export interface SavingsDetails {
  provider_name: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  end_date: string;
  interest_type: 'COMPOUND_AT_MATURITY';
  early_withdrawal_rate: number;
  deposits?: SavingsDeposit[];
}

export interface SavingsDeposit {
  id: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'SETTLED';
  settled_date?: string;
  settled_interest?: number;
}

export interface RealEstateDetails {
  address?: string;
  area?: string;
  total_investment: number;
  valuation_history: { date: string; price: number }[];
  latest_ai_valuation?: any;
}

export interface ScheduledEvent {
  id: string;
  date: string;
  title: string;
  amount: number;
  type: 'INFLOW' | 'OUTFLOW';
  completed: boolean;
  accountId?: string;
  accountGroup?: string;
}

export interface WaterfallStep {
  name: string;
  value: number;
  type: 'final' | 'income' | 'allocation';
  fill?: string;
  displayValue: string;
  details?: any[];
}

export interface AIInsightData {
  content: string;
  timestamp: string;
}

export interface UserAIInsights {
  wealthAdvisor?: AIInsightData;
  cfoInsight?: AIInsightData;
  portfolioAdvisor?: AIInsightData;
  equityAnalysis?: AIInsightData;
}

export interface ShareDetail {
  email: string;
  permission: 'view' | 'edit';
}

export interface Category {
  id: string;
  name: string;
  group: 'EXPENSES' | 'INCOME' | 'ASSETS' | 'CAPITAL';
  createdAt?: string;
  expense_type?: 'FIXED' | 'VARIABLE';
  limit?: number;
}

export interface PnLBreakdown {
  income: {
    total: number;
    salary: number;
    investment: number;
    other: number;
  };
  expense: {
    total: number;
    fixed: number;
    variable: number;
    topCategories: { name: string; amount: number; type: 'FIXED' | 'VARIABLE' }[];
    fixedList: { name: string; amount: number }[];
    variableList: { name: string; amount: number }[];
  };
  savingsRate: number;
  periodLabel: string;
}

export interface MonthlySnapshot {
  id: string; // YYYY-MM
  snapshot_date: string;
  summary: {
    net_worth: number;
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
  };
  accounts_detail: {
    id: string;
    name: string;
    group: string;
    category: string;
    balance: number;
  }[];
  pnl_performance: {
    income: number;
    expense: number;
    savings: number;
  };
  createdAt: string;
}

export interface FinancialContact {
  id: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  total_receivable?: number;
  total_payable?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Account {
  id: string;
  name: string;
  group: 'ASSETS' | 'CAPITAL';
  category: string;
  current_balance: number;
  status: 'ACTIVE' | 'CLOSED' | 'LIQUIDATED' | 'LIQUIDATED_PARTIAL';
  createdAt: string;
  updatedAt?: string;
  color_code?: string;
  target_ratio?: number;
  description?: string;
  creditor_debtor_name?: string;
  interest_rate?: number;
  realized_pnl?: number;
  unrealized_pnl?: number;
  accrued_interest?: number;
  linked_fund_id?: string | null;
  investment_details?: InvestmentDetails;
  investment_logs?: InvestmentLog[];
  liability_details?: LiabilityDetails;
  credit_card_details?: CreditCardDetails;
  real_estate_details?: RealEstateDetails;
  equity_amount?: number;
  liability_amount?: number;
  linked_liability_id?: string | null;
  details?: SavingsDetails;
  scheduled_events?: ScheduledEvent[];
  tags?: string[];
  target_amount?: number;
}

export interface LendingExtension {
  id: string;
  date: string;
  previous_end_date: string;
  new_end_date: string;
  note?: string;
}

export type RiskAppetite = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export type FinancialGoal = 'WEALTH_GROWTH' | 'DEBT_FREE' | 'BUY_HOUSE' | 'RETIRE_EARLY' | 'EDUCATION' | 'LEGACY';

export interface FinancialProfile {
  riskAppetite: RiskAppetite;
  primaryGoal: FinancialGoal;
  investmentHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  ageRange?: string;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'MARRIED_KIDS';
  dependents?: number;
  occupation?: string;
  monthlyIncome?: string;
  painPoints?: string[];
  existingProducts?: string[];
  additionalNotes?: string;
  setupAt: string;
}

export interface CapitalTransaction {
  id: string;
  transaction_type: 'INJECT' | 'WITHDRAW' | 'PAY_PRINCIPAL' | 'PAY_INTEREST';
  amount: number;
  date: string;
  related_tx_id?: string;
}

export interface Capital {
  id: string;
  name: string;
  category: string;
  current_balance: number;
  capital_transactions?: CapitalTransaction[];
}

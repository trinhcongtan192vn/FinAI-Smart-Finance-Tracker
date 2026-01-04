
import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Sparkles, Briefcase, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { ViewName, DataContext } from '../types';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, writeBatch, limit, query, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { StatsOverview } from '../components/dashboard/StatsOverview';
import { ExpenseTrendChart } from '../components/dashboard/ExpenseTrendChart';
import { RecentTransactionList } from '../components/dashboard/RecentTransactionList';
import { CategorySetupModal } from '../components/dashboard/CategorySetupModal';
import { AccountSettingsModal } from '../components/dashboard/AccountSettingsModal';
import { SecurityModal } from '../components/dashboard/SecurityModal';
import { IncomeFlowWidget } from '../components/dashboard/IncomeFlowWidget';
import { WealthAdvisorCard } from '../components/dashboard/WealthAdvisorCard';
import { BudgetProgressWidget } from '../components/dashboard/BudgetProgressWidget';
import { UpcomingEventsWidget } from '../components/dashboard/UpcomingEventsWidget';
import { SmartReminders } from '../components/dashboard/SmartReminders';
import { EditTransactionModal } from '../components/dashboard/EditTransactionModal';
import { currencyFormatter } from '../lib/utils';
import { useFunReaction } from '../hooks/useFunReaction';

interface DashboardProps {
  onNavigate: (view: ViewName, state?: any) => void;
  activeContext: DataContext;
  onSwitchContext: (context: DataContext) => void;
  isPrivacyEnabled: boolean;
  onTogglePrivacy: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigate, 
  activeContext, 
  onSwitchContext, 
  isPrivacyEnabled, 
  onTogglePrivacy 
}) => {
  const { t } = useTranslation();
  const { transactions = [], monthlyTransactions = [], categories = [], accounts = [], stats, chartData = [], monthlyBudget, loading, aiInsights } = useDashboardData(activeContext.uid);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'category' | 'account' | 'security' | 'reset' | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);
  
  // Fun Reaction Hook (Global)
  const { checkAndTrigger } = useFunReaction(activeContext.uid);

  const wealthStats = useMemo(() => {
    const debtToAssetRatio = stats.totalAssets > 0 ? (stats.totalLiabilities / stats.totalAssets) * 100 : 0;
    
    return { 
      ...stats, 
      debtToAssetRatio, 
      isHighRisk: debtToAssetRatio > 50
    };
  }, [stats]);

  // Logic to gather and sort upcoming events from active accounts only
  const upcomingEvents = useMemo(() => {
    // Only include accounts that are ACTIVE
    const activeAccounts = accounts.filter(acc => acc.status === 'ACTIVE');

    const allEvents = activeAccounts.flatMap(acc => 
      (acc.scheduled_events || []).map(e => ({
        ...e,
        // Attach account metadata to the event for navigation
        accountId: acc.id,
        accountGroup: acc.group
      }))
    ).filter(e => !e.completed);

    const today = new Date().toISOString().split('T')[0];
    
    // Get events for the next 45 days
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 45);
    const futureLimitStr = futureLimit.toISOString().split('T')[0];

    return allEvents
      .filter(e => e.date >= today && e.date <= futureLimitStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [accounts]);

  // Check for Debt King status once data is loaded
  useEffect(() => {
    if (!loading && stats.totalAssets > 0) {
       checkAndTrigger(null, { 
           totalAssets: stats.totalAssets,
           totalDebt: stats.totalLiabilities 
       });
    }
  }, [loading, stats.totalAssets, stats.totalLiabilities]);

  const filteredRecentTransactions = useMemo(() => {
    return (transactions || [])
      .filter(t => t.group === 'INCOME' || t.group === 'EXPENSES' || t.type === 'DAILY_CASHFLOW')
      .slice(0, 10);
  }, [transactions]);

  const deleteCollectionBatch = async (collectionName: string) => {
    const q = query(collection(db, 'users', activeContext.uid, collectionName), limit(400));
    const snapshot = await getDocs(q);
    
    if (snapshot.size === 0) return 0;

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
  };

  const handleFullReset = async () => {
    setIsResetting(true);
    try {
      // Loop to delete large collections in batches
      let deletedCount = 0;
      do {
        deletedCount = await deleteCollectionBatch('transactions');
      } while (deletedCount >= 400);

      do {
        deletedCount = await deleteCollectionBatch('accounts');
      } while (deletedCount >= 400);

      do {
        deletedCount = await deleteCollectionBatch('categories');
      } while (deletedCount >= 400);

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', activeContext.uid), { 
        initialBalance: 0, 
        onboarded: false,
        resetAt: new Date().toISOString() 
      });

      await batch.commit();
      setActiveModal(null);
      alert(t('settings.success'));
    } catch (error: any) {
      console.error(error);
      alert(t('settings.error') + ": " + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveInsight = async (content: string) => {
      try {
          await updateDoc(doc(db, 'users', activeContext.uid), {
              'aiInsights.wealthAdvisor': {
                  content,
                  timestamp: new Date().toISOString()
              }
          });
      } catch (e) { console.error("Error saving insight", e); }
  };

  const handleEventClick = (event: any) => {
    if (event.accountGroup === 'ASSETS') {
        onNavigate(ViewName.ASSETS, { targetAccountId: event.accountId });
    } else if (event.accountGroup === 'CAPITAL') {
        onNavigate(ViewName.CAPITAL, { targetAccountId: event.accountId });
    }
  };

  if (loading && accounts.length === 0) return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-white gap-6 animate-pulse">
      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-xl">
         <Sparkles size={40} />
      </div>
      <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{t('common.loading')}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-[#F9FAFB] font-display text-text-main relative overflow-x-hidden pb-10">
      {isMenuOpen && <div className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />}
      
      <DashboardHeader 
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} handleLogout={() => signOut(auth)} 
        onOpenCategorySetup={() => setActiveModal('category')} 
        onOpenAccountSettings={() => setActiveModal('account')} 
        onOpenSecurity={() => setActiveModal('security')}
        onResetAccount={() => setActiveModal('reset')}
        activeContext={activeContext}
      />

      <main className="flex-1 flex flex-col gap-6 pt-4">
        {/* Smart Reminders (Top Priority) */}
        <SmartReminders 
            accounts={accounts} 
            onNavigateToCard={(id) => onNavigate(ViewName.CAPITAL, { targetAccountId: id })} 
        />

        <section className="flex flex-col items-center py-2 text-center animate-in fade-in duration-700 relative px-5">
          <button 
            onClick={onTogglePrivacy} 
            className="absolute top-6 right-5 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {!isPrivacyEnabled ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em] leading-none">{t('dashboard.available_cash')}</p>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-3">
            {!isPrivacyEnabled ? currencyFormatter.format(wealthStats.balance) : '*******'}
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100/50">
             <Briefcase size={12} className="text-indigo-500" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.net_worth')}:</span>
             <span className="text-xs font-black text-indigo-600">
               {!isPrivacyEnabled ? currencyFormatter.format(wealthStats.netWorth) : '*******'}
             </span>
          </div>
          <div className="w-full mt-10">
             <StatsOverview stats={stats as any} isVisible={!isPrivacyEnabled} />
          </div>
        </section>

        {wealthStats.isHighRisk && (
           <div className="mx-5 bg-orange-50 border border-orange-100 p-4 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-2">
             <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><AlertTriangle size={20} /></div>
             <div>
               <p className="text-xs font-black text-orange-900 uppercase tracking-tight">{t('dashboard.risk_alert')}</p>
               <p className="text-xs font-medium text-orange-700 leading-snug mt-1">
                 {t('dashboard.risk_desc', { ratio: wealthStats.debtToAssetRatio.toFixed(1) })}
               </p>
             </div>
           </div>
        )}

        <div className="px-5 flex flex-col gap-6">
            {/* 0. Upcoming Events Widget */}
            <UpcomingEventsWidget events={upcomingEvents} onEventClick={handleEventClick} />

            {/* 1. Recent Transactions */}
            <RecentTransactionList 
                transactions={filteredRecentTransactions} 
                onSeeAll={() => onNavigate(ViewName.TRANSACTIONS_HISTORY)} 
                onEditTransaction={(txn) => activeContext.permission !== 'view' ? setEditingTransaction(txn) : alert("Không có quyền chỉnh sửa.")} 
            />

            {/* 2. Expense Trend Chart */}
            <ExpenseTrendChart chartData={chartData} monthlyBudget={monthlyBudget} />

            {/* 3. AI Advisor */}
            <WealthAdvisorCard 
                displayName={activeContext.displayName} availableCash={wealthStats.balance}
                totalAssets={wealthStats.totalAssets} debtToAssetRatio={wealthStats.debtToAssetRatio}
                equity={wealthStats.equity} liability={wealthStats.totalLiabilities}
                monthlyExpense={stats?.expense || 0} monthlyBudget={monthlyBudget}
                recentTransactions={transactions} canGenerate={activeContext.permission !== 'view'}
                initialInsight={aiInsights.wealthAdvisor}
                onSaveInsight={handleSaveInsight}
                onChatClick={() => onNavigate(ViewName.ADVISOR_CHAT)}
            />

            {/* 4. Income Flow & Budget */}
            <div id="dashboard-income-flow" className="flex flex-col gap-6">
            <IncomeFlowWidget income={stats?.income || 0} expense={stats?.expense || 0} transactions={monthlyTransactions} categories={categories} />
            <BudgetProgressWidget spent={stats?.expense || 0} limit={monthlyBudget} onNavigateToBudget={() => onNavigate(ViewName.BUDGET)} />
            </div>
        </div>
      </main>

      {activeModal === 'category' && <CategorySetupModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} permission={activeContext.permission} />}
      {activeModal === 'account' && <AccountSettingsModal onClose={() => setActiveModal(null)} onSwitchContext={onSwitchContext} activeContext={activeContext} />}
      {activeModal === 'security' && <SecurityModal onClose={() => setActiveModal(null)} />}
      {editingTransaction && <EditTransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} targetUid={activeContext.uid} />}
      {activeModal === 'reset' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isResetting && setActiveModal(null)}></div>
           <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 shadow-inner ring-8 ring-red-50/50">
                   <RotateCcw size={40} className={isResetting ? "animate-spin" : ""} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{t('settings.reset_title')}</h3>
                <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{t('settings.reset_desc')}</p>
                <div className="flex flex-col gap-3 w-full mt-8">
                   <button onClick={handleFullReset} disabled={isResetting} className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50">{isResetting ? t('settings.deleting') : t('settings.confirm_reset')}</button>
                   <button onClick={() => setActiveModal(null)} disabled={isResetting} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">{t('common.cancel')}</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

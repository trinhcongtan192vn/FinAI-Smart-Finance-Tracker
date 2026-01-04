
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewName, Transaction } from './types';
import { BottomNav } from './components/BottomNav';
import { Loader2, Sparkles } from 'lucide-react';
import { useTutorial } from './hooks/useTutorial';
import { TutorialOverlay } from './components/ui/TutorialOverlay';
import { ReactionProvider } from './components/providers/ReactionProvider';
import { PasscodeLock } from './components/ui/PasscodeLock';
import { EarlyFeedbackModal } from './components/dashboard/EarlyFeedbackModal';
import { NpsSurveyModal } from './components/dashboard/NpsSurveyModal';
import { AdvisorFab } from './components/advisor/AdvisorFab';
import { AuthProvider, useAuth } from './components/providers/AuthProvider';
import { usePasscode } from './hooks/usePasscode';

// Lazy load views
const Dashboard = lazy(() => import('./views/Dashboard').then(m => ({ default: m.Dashboard })));
const FinancialReports = lazy(() => import('./views/FinancialReports').then(m => ({ default: m.FinancialReports })));
const TransactionHistory = lazy(() => import('./views/TransactionHistory').then(m => ({ default: m.TransactionHistory })));
const Budget = lazy(() => import('./views/Budget').then(m => ({ default: m.Budget })));
const CapitalManagement = lazy(() => import('./views/CapitalManagement').then(m => ({ default: m.CapitalManagement })));
const AssetManagement = lazy(() => import('./views/AssetManagement').then(m => ({ default: m.AssetManagement })));
const NewEntry = lazy(() => import('./views/NewEntry').then(m => ({ default: m.NewEntry })));
const ReviewTransactions = lazy(() => import('./views/ReviewTransactions').then(m => ({ default: m.ReviewTransactions })));
const Onboarding = lazy(() => import('./views/Onboarding').then(m => ({ default: m.Onboarding })));
const Login = lazy(() => import('./views/Login').then(m => ({ default: m.Login })));
const AdvisorChat = lazy(() => import('./views/AdvisorChat').then(m => ({ default: m.AdvisorChat })));

const ViewLoader = () => (
  <div className="h-[80dvh] w-full flex flex-col items-center justify-center gap-4 text-indigo-600 animate-in fade-in duration-500">
    <div className="relative">
      <Loader2 size={48} className="animate-spin opacity-20" />
      <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading module...</p>
  </div>
);

const AppContent: React.FC = () => {
  const {
    user,
    loading,
    activeContext,
    setActiveContext,
    isOnboarding,
    setIsOnboarding,
    privacyMode,
    togglePrivacy,
    passcodeData,
    userData
  } = useAuth();

  const { isPasscodeVerified, handlePasscodeSuccess, handleLogout } = usePasscode();

  const [currentView, setCurrentView] = useState<ViewName>(ViewName.DASHBOARD);
  const [viewState, setViewState] = useState<any>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);

  // Engagement Trigger States
  const [showEarlyFeedback, setShowEarlyFeedback] = useState(false);
  const [showNpsSurvey, setShowNpsSurvey] = useState(false);

  const { activeSteps, triggerHome, triggerAssets, triggerCapital, triggerAdvisor, completeTutorial, skipTutorial } = useTutorial(
    activeContext?.uid || '',
    activeContext?.tutorialState
  );

  // Engagement Logic
  useEffect(() => {
    if (userData) {
      const txCount = userData.transactionUsage?.count || 0;
      if (txCount >= 5 && !userData.hasSeenFeedbackPrompt) {
        setShowEarlyFeedback(true);
      }
      if (txCount >= 20 && !userData.hasSeenNpsSurvey && userData.hasSeenFeedbackPrompt) {
        if (!showEarlyFeedback) setShowNpsSurvey(true);
      }
    }
  }, [userData, showEarlyFeedback]);

  // Tutorial Triggers
  useEffect(() => {
    if (!loading && activeContext) {
      if (currentView === ViewName.DASHBOARD) triggerHome();
      else if (currentView === ViewName.ASSETS) triggerAssets();
      else if (currentView === ViewName.CAPITAL) triggerCapital();
      else if (currentView === ViewName.ADVISOR_CHAT) {
        if (activeContext.financialProfile) {
          triggerAdvisor();
        }
      }
    }
  }, [currentView, loading, activeContext, triggerHome, triggerAssets, triggerCapital, triggerAdvisor]);

  const handleNavigate = (view: ViewName, state?: any) => {
    setCurrentView(view);
    setViewState(state);
  };

  if (loading) return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-white text-indigo-600">
      <Loader2 size={40} className="animate-spin" />
    </div>
  );

  if (!user || !activeContext) return <Suspense fallback={<ViewLoader />}><Login /></Suspense>;

  if (passcodeData?.enabled && !isPasscodeVerified && !isOnboarding) {
    return (
      <PasscodeLock
        savedPasscode={passcodeData.code}
        onSuccess={handlePasscodeSuccess}
        onLogout={handleLogout}
        displayName={activeContext.displayName}
      />
    );
  }

  if (isOnboarding) return <Suspense fallback={<ViewLoader />}><Onboarding onComplete={() => setIsOnboarding(false)} userEmail={user.email || ''} /></Suspense>;

  const renderMainView = () => {
    switch (currentView) {
      case ViewName.DASHBOARD:
        return <Dashboard onNavigate={handleNavigate} activeContext={activeContext} onSwitchContext={setActiveContext} isPrivacyEnabled={privacyMode} onTogglePrivacy={togglePrivacy} />;
      case ViewName.REPORTS:
        return <FinancialReports onNavigate={handleNavigate} activeContext={activeContext} />;
      case ViewName.TRANSACTIONS_HISTORY:
        return <TransactionHistory onNavigate={handleNavigate} activeContext={activeContext} initialSearch={viewState?.initialSearch} />;
      case ViewName.BUDGET:
        return <Budget onNavigate={handleNavigate} activeContext={activeContext} />;
      case ViewName.CAPITAL:
        return <CapitalManagement onNavigate={handleNavigate} activeContext={activeContext} isPrivacyEnabled={privacyMode} onTogglePrivacy={togglePrivacy} viewState={viewState} />;
      case ViewName.ASSETS:
        return <AssetManagement onNavigate={handleNavigate} activeContext={activeContext} isPrivacyEnabled={privacyMode} onTogglePrivacy={togglePrivacy} viewState={viewState} />;
      case ViewName.ADVISOR_CHAT:
        return <AdvisorChat onNavigate={handleNavigate} activeContext={activeContext} />;
      default:
        return <Dashboard onNavigate={handleNavigate} activeContext={activeContext} onSwitchContext={setActiveContext} isPrivacyEnabled={privacyMode} onTogglePrivacy={togglePrivacy} />;
    }
  };

  const showBottomNav = [ViewName.DASHBOARD, ViewName.REPORTS, ViewName.CAPITAL, ViewName.ASSETS].includes(currentView);
  const showFab = showBottomNav && !isOnboarding;

  return (
    <div className="font-display min-h-[100dvh] flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[calc(110px+env(safe-area-inset-bottom))]">
        <Suspense fallback={<ViewLoader />}>
          {renderMainView()}
        </Suspense>
      </div>

      {showBottomNav && <BottomNav currentView={currentView} onNavigate={handleNavigate} />}

      {showFab && <AdvisorFab onClick={() => handleNavigate(ViewName.ADVISOR_CHAT)} />}

      {activeSteps && <TutorialOverlay steps={activeSteps} onComplete={completeTutorial} onSkip={skipTutorial} />}

      {/* Engagement Modals */}
      {showEarlyFeedback && activeContext && (
        <EarlyFeedbackModal onClose={() => setShowEarlyFeedback(false)} uid={activeContext.uid} />
      )}

      {showNpsSurvey && activeContext && (
        <NpsSurveyModal onClose={() => setShowNpsSurvey(false)} uid={activeContext.uid} />
      )}

      {currentView === ViewName.NEW_ENTRY && (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300">
          <Suspense fallback={<ViewLoader />}>
            <NewEntry onNavigate={handleNavigate} onClose={() => handleNavigate(ViewName.DASHBOARD)} setPendingTransactions={setPendingTransactions} activeContext={activeContext} />
          </Suspense>
        </div>
      )}

      {currentView === ViewName.REVIEW && (
        <div className="fixed inset-0 z-[110] bg-white animate-in slide-in-from-bottom duration-300">
          <Suspense fallback={<ViewLoader />}>
            <ReviewTransactions onNavigate={handleNavigate} transactions={pendingTransactions} activeContext={activeContext} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ReactionProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ReactionProvider>
  );
};

export default App;

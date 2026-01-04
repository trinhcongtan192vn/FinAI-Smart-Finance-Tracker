
import React, { useState } from 'react';
import { RefreshCw, BarChart3, Target, Database, Camera, Wallet, PieChart, Layers } from 'lucide-react';
import { ViewName, DataContext } from '../types';
import { useFinancialHealth } from '../hooks/useFinancialHealth';
import { NetWorthTrendChart } from '../components/reports/NetWorthTrendChart';
import { CapitalStructureChart } from '../components/reports/CapitalStructureChart';
import { FinancialHealthScore } from '../components/reports/FinancialHealthScore';
import { PnLAnalysisCard } from '../components/reports/PnLAnalysisCard';
import { CashFlowWaterfall } from '../components/reports/CashFlowWaterfall';
import { InvestmentROITable } from '../components/reports/InvestmentROITable';
import { EmergencyRunway } from '../components/reports/EmergencyRunway';
import { FundProgressGrid } from '../components/reports/FundProgressGrid';
import { FundMovementChart } from '../components/reports/FundMovementChart';
import { InsightCard } from '../components/reports/InsightCard';
import { SnapshotManagerModal } from '../components/reports/SnapshotManagerModal';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReportsProps {
  onNavigate: (view: ViewName) => void;
  activeContext: DataContext;
}

export const FinancialReports: React.FC<ReportsProps> = ({ onNavigate, activeContext }) => {
  const { t } = useTranslation();
  const [showSnapshotManager, setShowSnapshotManager] = useState(false);
  
  const { 
    netWorthHistory, 
    capitalStructure, 
    accounts: rawAccounts, 
    pnlAnalysis,
    waterfallData,
    investmentStats,
    fundHealth, 
    cfoContext, 
    loading,
    aiInsights,
    reportMode
  } = useFinancialHealth(activeContext.uid);

  const saveInsight = async (content: string) => {
      await updateDoc(doc(db, 'users', activeContext.uid), {
          'aiInsights.cfoInsight': {
              content,
              timestamp: new Date().toISOString()
          }
      });
  };

  const setReportMode = async (mode: 'BASIC' | 'ADVANCED') => {
      try {
          await updateDoc(doc(db, 'users', activeContext.uid), { reportMode: mode });
      } catch (error) {
          console.error("Failed to update report mode:", error);
      }
  };

  if (loading) return (
    <div className="flex justify-center py-20 text-indigo-600">
      <RefreshCw className="animate-spin" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] pb-40 font-display text-text-main relative">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-50/50 gap-4 transition-all">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('reports.title')}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
             <BarChart3 size={12} className="text-indigo-500" />
             <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{t('reports.subtitle')}</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start sm:self-center">
            <button 
              onClick={() => setReportMode('BASIC')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${reportMode === 'BASIC' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <Wallet size={14} /> Basic
            </button>
            <button 
              onClick={() => setReportMode('ADVANCED')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${reportMode === 'ADVANCED' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <PieChart size={14} /> Advanced
            </button>
        </div>
      </header>

      <main className="flex-1 w-full pb-8 overflow-x-hidden px-5 pt-6 flex flex-col gap-8">
        
        {/* LEVEL 5: AI CFO Insight (Advanced Only) */}
        {reportMode === 'ADVANCED' && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
             <InsightCard 
               cfoContext={cfoContext} 
               canGenerate={activeContext.permission !== 'view'}
               initialInsight={aiInsights.cfoInsight}
               onSaveInsight={saveInsight}
             />
          </section>
        )}

        {/* LEVEL 1: OVERALL HEALTH (Advanced Only) */}
        {reportMode === 'ADVANCED' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('reports.overall_health')}</h2>
                </div>
                {activeContext.permission === 'owner' && (
                  <button 
                    onClick={() => setShowSnapshotManager(true)}
                    className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors uppercase tracking-wide"
                  >
                    <Camera size={10} /> {t('common.snapshots')}
                  </button>
                )}
             </div>
             
             <div className="flex flex-col gap-4">
                <NetWorthTrendChart data={netWorthHistory} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                   <div className="h-full min-h-[300px]">
                      <CapitalStructureChart accounts={rawAccounts} />
                   </div>
                   <div className="h-full">
                      <FinancialHealthScore debtToAssetRatio={capitalStructure.debtToAsset} />
                   </div>
                </div>
             </div>
          </section>
        )}

        {/* LEVEL 2: CASHFLOW & EFFICIENCY (Basic & Advanced) */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
           <div className={`flex items-center gap-2 mb-4 px-1 ${reportMode === 'ADVANCED' ? 'border-t border-slate-200 pt-8' : ''}`}>
              <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('reports.cashflow_efficiency')}</h2>
           </div>

           <div className="flex flex-col gap-6">
              <PnLAnalysisCard current={pnlAnalysis.current} previous={pnlAnalysis.previous} />
              <CashFlowWaterfall data={waterfallData} />
              {/* Investment ROI is Advanced */}
              {reportMode === 'ADVANCED' && <InvestmentROITable data={investmentStats} />}
           </div>
        </section>

        {/* LEVEL 3: FUNDS & GOALS (Advanced Only) */}
        {reportMode === 'ADVANCED' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
             <div className="flex items-center gap-2 mb-4 px-1 border-t border-slate-200 pt-8">
                <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('reports.funds_goals')}</h2>
             </div>

             <div className="flex flex-col gap-6">
                <EmergencyRunway 
                   runwayMonths={fundHealth.runwayMonths} 
                   avgMonthlyExpense={fundHealth.avgMonthlyExpense} 
                   fundName={fundHealth.emergencyFundName} 
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <FundProgressGrid funds={fundHealth.funds} />
                   <FundMovementChart data={fundHealth.movements} />
                </div>
             </div>
          </section>
        )}

      </main>

      {showSnapshotManager && (
        <SnapshotManagerModal 
          onClose={() => setShowSnapshotManager(false)} 
          targetUid={activeContext.uid} 
        />
      )}
    </div>
  );
};

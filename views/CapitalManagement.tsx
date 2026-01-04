
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Loader2, X, Receipt, Wallet, ArrowRightLeft, Users, PiggyBank, Landmark, LayoutDashboard, ListFilter, Sparkles, ChevronDown, ChevronUp, PieChart, TrendingUp, CheckCircle2, ShieldCheck, CreditCard, AlertTriangle } from 'lucide-react';
import { ViewName, DataContext, Account, UserAIInsights } from '../types';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { AddCapitalModal } from '../components/capital/AddCapitalModal';
import { AddLiabilityModal } from '../components/capital/AddLiabilityModal';
import { LiabilityActionModal } from '../components/capital/LiabilityActionModal';
import { EquityFundActionModal } from '../components/capital/EquityFundActionModal';
import { MergeAccountsModal } from '../components/assets/MergeAccountsModal';
import { CapitalOverview } from '../components/capital/CapitalOverview';
import { EquityGroup, LiabilityGroup } from '../components/capital/CapitalGroups';
import { ContactDirectoryModal } from '../components/contacts/ContactDirectoryModal';
import { EquitySourceAnalysis } from '../components/capital/EquitySourceAnalysis';
import { SixJarsWizardModal } from '../components/capital/SixJarsWizardModal';
import { AddCreditCardModal } from '../components/capital/AddCreditCardModal';
import { CreditCardItem } from '../components/capital/CreditCardItem';
import { CreditCardDetailModal } from '../components/capital/CreditCardDetailModal';
import { useTranslation } from 'react-i18next';
import { currencyFormatter } from '../lib/utils';

interface CapitalManagementProps {
  onNavigate: (view: ViewName, state?: any) => void;
  activeContext: DataContext;
  isPrivacyEnabled: boolean;
  onTogglePrivacy: () => void;
  viewState?: any;
}

export const CapitalManagement: React.FC<CapitalManagementProps> = ({ 
  onNavigate, 
  activeContext,
  isPrivacyEnabled,
  onTogglePrivacy,
  viewState
}) => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAssets, setAllAssets] = useState<Account[]>([]);
  const [aiInsights, setAiInsights] = useState<UserAIInsights>({});
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'add' | 'add_debt' | 'add_cc' | 'action' | 'merge' | 'contacts' | 'six_jars' | 'cc_detail' | null>(null);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [modalModeHistory, setModalModeHistory] = useState(false);
  const [mergeModeGroup, setMergeModeGroup] = useState<'EQUITY' | 'LIABILITY' | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());

  const activeAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId) || null, [accounts, selectedAccountId]);

  // Split accounts for easier checking
  const equityAccounts = useMemo(() => accounts.filter(a => a.category === 'Equity Fund' && a.status === 'ACTIVE'), [accounts]);
  const liabilityAccounts = useMemo(() => accounts.filter(a => a.category !== 'Equity Fund' && a.category !== 'Credit Card' && a.status === 'ACTIVE'), [accounts]);
  const creditCards = useMemo(() => accounts.filter(a => a.category === 'Credit Card' && a.status === 'ACTIVE'), [accounts]);

  // Credit Card Aggregate Stats
  const ccStats = useMemo(() => {
      const totalBalance = creditCards.reduce((sum, c) => sum + (c.current_balance || 0), 0);
      const totalLimit = creditCards.reduce((sum, c) => sum + (c.credit_card_details?.credit_limit || 0), 0);
      const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
      return { totalBalance, totalLimit, utilization };
  }, [creditCards]);

  useEffect(() => {
    // 1. Fetch User Data
    const unsubUser = onSnapshot(doc(db, 'users', activeContext.uid), (docSnap) => {
        if (docSnap.exists()) {
            setAiInsights(docSnap.data().aiInsights || {});
        }
    });

    const qCap = query(collection(db, 'users', activeContext.uid, 'accounts'), where('group', '==', 'CAPITAL'));
    const unsubCap = onSnapshot(qCap, (snap) => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account))));
    const qAssets = query(collection(db, 'users', activeContext.uid, 'accounts'), where('group', '==', 'ASSETS'));
    const unsubAssets = onSnapshot(qAssets, (snap) => {
      setAllAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
      setLoading(false);
    });
    return () => { unsubUser(); unsubCap(); unsubAssets(); };
  }, [activeContext.uid]);

  // 6 Jars Recommendation Trigger
  useEffect(() => {
    if (!loading && activeContext.tutorialState?.hasSeenCapital) {
        // If user has only 1 equity fund (Default Spending Fund) and hasn't skipped this suggestion
        if (equityAccounts.length === 1 && !localStorage.getItem(`skipped_6jars_${activeContext.uid}`)) {
            // Small delay to feel natural after tutorial or load
            const timer = setTimeout(() => {
                setActiveModal('six_jars');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }
  }, [loading, activeContext.tutorialState, equityAccounts.length, activeContext.uid]);

  // Deep linking handling
  useEffect(() => {
    if (viewState?.targetAccountId && !loading && accounts.length > 0) {
        const found = accounts.find(a => a.id === viewState.targetAccountId);
        if (found) {
            setSelectedAccountId(found.id);
            if (found.category === 'Credit Card') setActiveModal('cc_detail');
            else setActiveModal('action');
        }
    }
  }, [viewState, loading, accounts]);

  const stats = useMemo(() => {
    const active = accounts.filter(c => c.status === 'ACTIVE');
    const equity = active.filter(c => c.category === 'Equity Fund').reduce((sum, c) => sum + (c.current_balance || 0), 0);
    const liability = active.filter(c => c.category !== 'Equity Fund').reduce((sum, c) => sum + (c.current_balance || 0), 0);
    const total = equity + liability;
    return { total, equity, liability, stablePct: total > 0 ? Math.round((equity / total) * 100) : 100 };
  }, [accounts]);

  const handleAction = (acc: Account, historyFirst = false) => {
    if (activeContext.permission === 'view' && !historyFirst) return alert("Read-only Access.");
    setSelectedAccountId(acc.id);
    setModalModeHistory(historyFirst);
    setActiveModal('action');
  };

  const saveInsight = async (content: string) => {
      await updateDoc(doc(db, 'users', activeContext.uid), {
          'aiInsights.equityAnalysis': {
              content,
              timestamp: new Date().toISOString()
          }
      });
  };

  const toggleMergeSelection = (id: string) => {
    const n = new Set(selectedForMerge);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelectedForMerge(n);
  };

  const closeSixJars = () => {
      setActiveModal(null);
      localStorage.setItem(`skipped_6jars_${activeContext.uid}`, 'true');
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-white"><Loader2 size={40} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] pb-40">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-indigo-50/50">
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">{t('capital.title')}</h1>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{t('capital.subtitle')}</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 px-5 pt-6">
        {/* Step 1: Capital Structure Overview */}
        <div id="capital-overview">
          <CapitalOverview 
            {...stats} 
            isPrivacyEnabled={isPrivacyEnabled}
            onTogglePrivacy={onTogglePrivacy}
          />
        </div>
        
        {/* Step 2: Primary Actions */}
        <div id="capital-actions" className="-mx-5 px-5 overflow-x-auto no-scrollbar touch-pan-x no-swipe">
          <div className="flex gap-3 py-2 min-w-max">
            <button 
              onClick={() => setActiveModal('add')}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm active:scale-95 transition-all"
            >
              <PiggyBank size={16} /> {t('capital.add_capital')}
            </button>
            <button 
              onClick={() => setActiveModal('add_debt')}
              className="flex items-center gap-2 bg-orange-50 text-orange-700 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-orange-100 shadow-sm active:scale-95 transition-all"
            >
              <Receipt size={16} /> {t('capital.add_debt')}
            </button>
            <button 
              onClick={() => setActiveModal('add_cc')}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-700 shadow-sm active:scale-95 transition-all"
            >
              <CreditCard size={16} /> {t('capital.add_cc')}
            </button>
          </div>
        </div>

        {/* Step 3: AI Insight (Only if Equity exists) */}
        {equityAccounts.length > 0 && (
            <EquitySourceAnalysis 
                uid={activeContext.uid} 
                equityAccounts={equityAccounts}
                initialInsight={aiInsights.equityAnalysis}
                onSaveInsight={saveInsight} 
            />
        )}

        {/* Step 4: Management Lists */}
        <section className="flex flex-col gap-8 pb-10">
            {mergeModeGroup && (
              <div className="bg-slate-900 text-white p-4 rounded-3xl flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2 sticky top-20 z-30 ring-4 ring-indigo-500/20">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setMergeModeGroup(null); setSelectedForMerge(new Set()); }} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('capital.merge_count', { count: selectedForMerge.size })}</span>
                  </div>
                  <button 
                    onClick={() => setActiveModal('merge')}
                    disabled={selectedForMerge.size < 2}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                  >
                    {t('capital.confirm')}
                  </button>
              </div>
            )}

            {/* Credit Cards Section */}
            {creditCards.length > 0 && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard size={14} className="text-indigo-600" /> {t('capital.credit_cards')}
                        </h3>
                        {ccStats.totalLimit > 0 && (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className={`text-[10px] font-black ${ccStats.utilization > 50 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                        {t('capital.utilization')}: {ccStats.utilization.toFixed(0)}%
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400">
                                        {!isPrivacyEnabled ? currencyFormatter.format(ccStats.totalBalance) : '*******'}
                                    </p>
                                </div>
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                                    {ccStats.utilization > 80 ? (
                                        <AlertTriangle size={14} className="text-red-500" />
                                    ) : (
                                        <PieChart size={14} className="text-slate-400" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {creditCards.map(card => (
                            <CreditCardItem 
                                key={card.id} 
                                account={card} 
                                onClick={() => { setSelectedAccountId(card.id); setActiveModal('cc_detail'); }} 
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Always show Equity Group */}
            <EquityGroup 
              accounts={equityAccounts} 
              onAction={handleAction} 
              onDelete={()=>{}} 
              mergeMode={mergeModeGroup==='EQUITY'} 
              onEnterMergeMode={()=>setMergeModeGroup('EQUITY')} 
              onSelect={toggleMergeSelection} 
              selectedIds={selectedForMerge} 
            />
            
            {/* Conditionally Show Liability Group or Debt Free Card */}
            {liabilityAccounts.length > 0 ? (
                <LiabilityGroup 
                  accounts={liabilityAccounts} 
                  onAction={handleAction} 
                  onDelete={()=>{}} 
                  mergeMode={mergeModeGroup==='LIABILITY'} 
                  onEnterMergeMode={()=>setMergeModeGroup('LIABILITY')} 
                  onSelect={toggleMergeSelection} 
                  selectedIds={selectedForMerge} 
                  onOpenContacts={() => setActiveModal('contacts')} 
                />
            ) : (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] p-8 text-center border border-emerald-100 flex flex-col items-center gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 mb-2">
                        <ShieldCheck size={40} className="text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-emerald-900 tracking-tight">Debt Free!</h3>
                        <p className="text-xs font-medium text-emerald-700 max-w-[250px] mx-auto mt-2 leading-relaxed">
                            {t('capital.desc.no_debt')}
                        </p>
                    </div>
                    {/* Optional: Call to action to verify if they really are debt free */}
                    <button 
                        onClick={() => setActiveModal('contacts')}
                        className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline flex items-center gap-1"
                    >
                        <Users size={12} /> {t('common.contacts')}
                    </button>
                </div>
            )}
        </section>
      </main>

      {/* Modals Mapping */}
      {activeModal === 'add' && <AddCapitalModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'add_debt' && <AddLiabilityModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'add_cc' && <AddCreditCardModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'contacts' && <ContactDirectoryModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      
      {activeModal === 'cc_detail' && activeAccount && (
          <CreditCardDetailModal account={activeAccount} onClose={() => { setActiveModal(null); setSelectedAccountId(null); }} targetUid={activeContext.uid} />
      )}

      {activeModal === 'six_jars' && equityAccounts.length > 0 && (
        <SixJarsWizardModal 
            onClose={closeSixJars} 
            targetUid={activeContext.uid} 
            defaultFund={equityAccounts[0]} 
        />
      )}

      {activeModal === 'action' && activeAccount && (
        activeAccount.category === 'Equity Fund' ? (
          <EquityFundActionModal 
            account={activeAccount} 
            onClose={() => { setActiveModal(null); setSelectedAccountId(null); }} 
            targetUid={activeContext.uid} 
          />
        ) : (
          <LiabilityActionModal 
            account={activeAccount} 
            onClose={() => { setActiveModal(null); setSelectedAccountId(null); setModalModeHistory(false); }} 
            targetUid={activeContext.uid} 
            startWithHistory={modalModeHistory} 
            permission={activeContext.permission} 
          />
        )
      )}

      {activeModal === 'merge' && (
        <MergeAccountsModal 
          selectedAccounts={accounts.filter(a => selectedForMerge.has(a.id))} 
          onClose={() => { setActiveModal(null); setMergeModeGroup(null); setSelectedForMerge(new Set()); }} 
          targetUid={activeContext.uid} 
        />
      )}
    </div>
  );
};

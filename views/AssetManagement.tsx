
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ShoppingCart, Home, PiggyBank, ArrowRightLeft, Receipt, Coins, Activity, TrendingUp, Wallet, X, CheckCircle2, AlertCircle, Layers, Plus } from 'lucide-react';
import { ViewName, DataContext, Account, UserAIInsights } from '../types';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { AddAssetModal } from '../components/assets/AddAssetModal';
import { AddSavingsModal } from '../components/assets/AddSavingsModal';
import { AddLendingModal } from '../components/assets/AddLendingModal';
import { AddRealEstateModal } from '../components/assets/AddRealEstateModal';
import { AssetActionModal } from '../components/assets/AssetActionModal';
import { PortfolioOverview } from '../components/assets/PortfolioOverview';
import { CashWalletList } from '../components/assets/groups/CashWalletList';
import { MarketVolatileList } from '../components/assets/groups/MarketVolatileList';
import { ReceivablesList } from '../components/assets/groups/ReceivablesList';
import { FixedIncomeList } from '../components/assets/groups/FixedIncomeList';
import { RealEstateList } from '../components/assets/groups/RealEstateList';
import { MergeAccountsModal } from '../components/assets/MergeAccountsModal';
import { ContactDirectoryModal } from '../components/contacts/ContactDirectoryModal';
import { AIPortfolioAdvisor } from '../components/assets/AIPortfolioAdvisor';
import { useTranslation } from 'react-i18next';

interface AssetManagementProps {
  onNavigate: (view: ViewName, state?: any) => void;
  activeContext: DataContext;
  isPrivacyEnabled: boolean;
  onTogglePrivacy: () => void;
  viewState?: any;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({ onNavigate, activeContext, isPrivacyEnabled, onTogglePrivacy, viewState }) => {
  const { t, i18n } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [aiInsights, setAiInsights] = useState<UserAIInsights>({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeModal, setActiveModal] = useState<'add' | 'add_savings' | 'add_lending' | 'add_re' | 'action' | 'merge' | 'contacts' | 'quick_buy' | null>(null);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'BUY' | 'SELL' | 'REVALUE' | 'INTEREST' | 'PRINCIPAL' | 'HISTORY' | 'COCKPIT'>('BUY');

  const [mergeModeGroup, setMergeModeGroup] = useState<string | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const activeAccount = useMemo(() => 
    accounts.find(a => a.id === selectedAccountId) || null
  , [accounts, selectedAccountId]);

  // Categorized Accounts - Memoized for Performance & Clean Logic
  const cashAccounts = useMemo(() => accounts.filter(a => a.category === 'Cash'), [accounts]);
  const marketAccounts = useMemo(() => accounts.filter(a => ['Stocks', 'Crypto', 'Gold'].includes(a.category)), [accounts]);
  const receivableAccounts = useMemo(() => accounts.filter(a => ['Receivables', 'Money Owed', 'Lending'].includes(a.category)), [accounts]);
  const fixedIncomeAccounts = useMemo(() => accounts.filter(a => ['Savings', 'Deposits'].includes(a.category)), [accounts]);
  const realEstateAccounts = useMemo(() => accounts.filter(a => a.category === 'Real Estate'), [accounts]);

  const hasInvestments = marketAccounts.length > 0 || receivableAccounts.length > 0 || fixedIncomeAccounts.length > 0 || realEstateAccounts.length > 0;

  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, 'users', activeContext.uid), (docSnap) => {
        if (docSnap.exists()) {
            setAiInsights(docSnap.data().aiInsights || {});
        }
    });

    const q = query(
      collection(db, 'users', activeContext.uid, 'accounts'),
      where('group', '==', 'ASSETS')
    );
    const unsubAccs = onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)).filter(a => a.status === 'ACTIVE'));
      setLoading(false);
    });

    return () => { unsubUser(); unsubAccs(); };
  }, [activeContext.uid]);

  // Deep linking handling
  useEffect(() => {
    if (viewState?.targetAccountId && !loading && accounts.length > 0) {
        const found = accounts.find(a => a.id === viewState.targetAccountId);
        if (found) {
            setSelectedAccountId(found.id);
            setActionType('COCKPIT');
            setActiveModal('action');
        }
    }
  }, [viewState, loading, accounts]);

  const handleSyncPrices = async () => {
    if (marketAccounts.length === 0) {
        setToastMessage(i18n.language === 'vi' ? "Không có tài sản thị trường để cập nhật." : "No market assets found.");
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
    }

    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const batch = writeBatch(db);
      let updatedCount = 0;
      const now = new Date().toISOString();

      const targets = marketAccounts.slice(0, 5); 

      for (const asset of targets) {
          try {
            const symbol = asset.investment_details?.symbol || asset.name;
            const prompt = `Get current market price in VND for: ${symbol}. JSON: {"price": number}`;
            
            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ parts: [{ text: prompt }] }],
                config: { 
                    responseMimeType: 'application/json',
                    tools: [{ googleSearch: {} }] 
                }
            });
            
            const text = result.text || "{}";
            const data = JSON.parse(text);
            
            if (data.price && typeof data.price === 'number') {
                const ref = doc(db, 'users', activeContext.uid, 'accounts', asset.id);
                const units = asset.investment_details?.total_units || 0;
                
                batch.update(ref, {
                    current_balance: units * data.price,
                    'investment_details.market_price': data.price,
                    'investment_details.last_sync': now
                });
                updatedCount++;
            }
          } catch (err) {
              console.warn(`Skipping ${asset.name}`, err);
          }
      }

      if (updatedCount > 0) {
          await batch.commit();
          setToastMessage(i18n.language === 'vi' ? `Đã cập nhật giá cho ${updatedCount} tài sản.` : `Synced ${updatedCount} assets successfully.`);
          setToastType('success');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      } else {
          setToastMessage(i18n.language === 'vi' ? "Không tìm thấy dữ liệu giá mới." : "No new price data found.");
          setToastType('error');
      }

    } catch (e) {
      console.error("Sync failed", e);
      setToastMessage(i18n.language === 'vi' ? "Lỗi đồng bộ. Vui lòng thử lại." : "Sync failed. Please try again.");
      setToastType('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const saveInsight = async (data: any) => {
      await updateDoc(doc(db, 'users', activeContext.uid), {
          'aiInsights.portfolioAdvisor': {
              content: data,
              timestamp: new Date().toISOString()
          }
      });
  };

  const openAction = (acc: Account, type: any) => {
    setSelectedAccountId(acc.id); 
    setActionType(type); 
    setActiveModal('action');
  };

  const getAssetIcon = (category: string) => {
    switch (category) {
      case 'Savings': return <PiggyBank size={20} />;
      case 'Gold': return <Coins size={20} />;
      case 'Stocks': return <Activity size={20} />;
      case 'Crypto': return <TrendingUp size={20} />;
      case 'Real Estate': return <Home size={20} />;
      case 'Cash': return <Wallet size={20} />;
      case 'Receivables': return <ArrowRightLeft size={20} />;
      default: return <Receipt size={20} />;
    }
  };

  const toggleMergeSelection = (id: string) => {
    const next = new Set(selectedForMerge);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedForMerge(next);
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <Loader2 size={40} className="animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] font-display text-text-main pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-indigo-50/50">
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">{t('assets.title')}</h1>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{t('assets.subtitle')}</p>
        </div>
      </header>

      <main className="flex-1 px-5 pt-6 flex flex-col gap-6">
        <div id="assets-overview">
          <PortfolioOverview 
            accounts={accounts} 
            isSyncing={isSyncing} 
            onSync={handleSyncPrices} 
            isPrivacyEnabled={isPrivacyEnabled}
            onTogglePrivacy={onTogglePrivacy}
          />
        </div>
        
        {/* Action Buttons - Always Visible to Allow Creation */}
        <div id="assets-actions" className="-mx-5 px-5 overflow-x-auto no-scrollbar touch-pan-x no-swipe">
          <div className="flex gap-3 py-2 min-w-max">
             <button 
              onClick={() => setActiveModal('quick_buy')}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 sm:px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm active:scale-95 transition-all"
             >
               <ShoppingCart size={16} /> {t('assets.buy_asset')}
             </button>
             <button 
              onClick={() => setActiveModal('add_re')}
              className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 sm:px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm active:scale-95 transition-all"
             >
               <Home size={16} /> {t('assets.buy_re')}
             </button>
             <button 
              onClick={() => setActiveModal('add_savings')}
              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 sm:px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm active:scale-95 transition-all"
             >
               <PiggyBank size={16} /> {t('assets.add_savings')}
             </button>
             <button 
              onClick={() => setActiveModal('add_lending')}
              className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 sm:px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-purple-100 shadow-sm active:scale-95 transition-all"
             >
               <ArrowRightLeft size={16} /> {t('assets.add_lending')}
             </button>
          </div>
        </div>

        {hasInvestments && (
            <AIPortfolioAdvisor 
                accounts={accounts} 
                canGenerate={activeContext.permission !== 'view'}
                initialInsight={aiInsights.portfolioAdvisor}
                onSaveInsight={saveInsight}
            />
        )}

        {mergeModeGroup && (
           <div className="bg-indigo-600 text-white p-4 rounded-3xl flex items-center justify-between shadow-glow animate-in slide-in-from-top-2 sticky top-20 z-30">
              <div className="flex items-center gap-3">
                 <button onClick={() => { setMergeModeGroup(null); setSelectedForMerge(new Set()); }} className="p-1 hover:bg-white/20 rounded-lg">
                    <X size={20} />
                 </button>
                 <span className="text-xs font-black uppercase tracking-widest">{t('assets.merge_count', { count: selectedForMerge.size })}</span>
              </div>
              <button 
                onClick={() => setActiveModal('merge')}
                disabled={selectedForMerge.size < 2}
                className="bg-white text-indigo-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                {t('common.proceed')}
              </button>
           </div>
        )}

        {/* SECTION 1: CASH (Always Show) */}
        <CashWalletList 
          accounts={cashAccounts} 
          onAction={openAction} 
          mergeMode={mergeModeGroup === 'Cash'}
          onEnterMergeMode={() => setMergeModeGroup('Cash')}
          onSelect={toggleMergeSelection}
          selectedIds={selectedForMerge}
        />

        {/* SECTION 2: MARKET ASSETS (Conditional) */}
        {marketAccounts.length > 0 && (
            <div id="market-assets-section" className="animate-in fade-in slide-in-from-bottom-4">
                <MarketVolatileList 
                  accounts={marketAccounts} 
                  onAction={openAction} 
                  getIcon={getAssetIcon} 
                />
            </div>
        )}

        {/* SECTION 3: FIXED INCOME (Conditional) */}
        {fixedIncomeAccounts.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <FixedIncomeList 
                  accounts={fixedIncomeAccounts} 
                  onAction={openAction} 
                  mergeMode={mergeModeGroup === 'Savings'}
                  onEnterMergeMode={() => setMergeModeGroup('Savings')}
                  onSelect={toggleMergeSelection}
                  selectedIds={selectedForMerge}
                />
            </div>
        )}

        {/* SECTION 4: REAL ESTATE (Conditional) */}
        {realEstateAccounts.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <RealEstateList 
                  accounts={realEstateAccounts} 
                  onAction={openAction} 
                />
            </div>
        )}

        {/* SECTION 5: RECEIVABLES (Conditional) */}
        {receivableAccounts.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <ReceivablesList 
                  accounts={receivableAccounts}
                  onAction={openAction} 
                  mergeMode={mergeModeGroup === 'Receivables'}
                  onEnterMergeMode={() => setMergeModeGroup('Receivables')}
                  onSelect={toggleMergeSelection}
                  selectedIds={selectedForMerge}
                  onOpenContacts={() => setActiveModal('contacts')}
                />
            </div>
        )}

        {/* EMPTY STATE FOR INVESTMENTS */}
        {!hasInvestments && (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-4 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 animate-in fade-in">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Layers size={32} className="text-slate-300" />
                </div>
                <div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Đa dạng hóa danh mục</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Bạn chưa có tài sản đầu tư nào. Hãy sử dụng các nút phía trên để bắt đầu.</p>
                </div>
            </div>
        )}

      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl bg-slate-900 text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toastType === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertCircle size={20} className="text-rose-400" />}
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'add' && <AddAssetModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'add_savings' && <AddSavingsModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'add_lending' && <AddLendingModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'add_re' && <AddRealEstateModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'contacts' && <ContactDirectoryModal onClose={() => setActiveModal(null)} targetUid={activeContext.uid} />}
      {activeModal === 'quick_buy' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
           <div className="bg-white rounded-[2.5rem] p-8 w-full max-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black mb-4">{t('assets.buy_asset')}</h3>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
                 {marketAccounts.length === 0 ? (
                   <div className="p-6 text-center border-2 border-dashed rounded-2xl bg-slate-50">
                       <p className="text-xs text-slate-400 font-bold italic">Chưa có danh mục đầu tư.</p>
                       <p className="text-[10px] text-slate-400 mt-1">Tạo tài sản mới để bắt đầu.</p>
                   </div>
                 ) : (
                   marketAccounts.map(acc => (
                    <button 
                      key={acc.id}
                      onClick={() => { setSelectedAccountId(acc.id); setActionType('BUY'); setActiveModal('action'); }}
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left font-black text-slate-900 flex justify-between items-center hover:bg-indigo-50 hover:border-indigo-100 transition-all"
                    >
                      {acc.name} <ShoppingCart size={14} className="text-indigo-400" />
                    </button>
                   ))
                 )}
              </div>
              <button onClick={() => setActiveModal('add')} className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <Plus size={16} /> Tạo mã tài sản mới
              </button>
           </div>
        </div>
      )}
      {activeModal === 'action' && activeAccount && (
        <AssetActionModal account={activeAccount} type={actionType} onClose={() => { setActiveModal(null); setSelectedAccountId(null); }} targetUid={activeContext.uid} />
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

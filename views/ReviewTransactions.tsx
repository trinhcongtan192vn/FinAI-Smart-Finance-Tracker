
import React, { useState, useEffect } from 'react';
import { ViewName, Transaction, DataContext, Account, TransactionType } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Loader2, ShieldCheck, AlertCircle, Bug } from 'lucide-react';
import { TransactionItem } from '../components/review/TransactionItem';
import { useFunReaction } from '../hooks/useFunReaction';
import { useLedgerConfirm } from '../hooks/useLedgerConfirm';

interface ReviewProps {
  onNavigate: (view: ViewName) => void;
  transactions: Transaction[];
  activeContext: DataContext;
}

export const ReviewTransactions: React.FC<ReviewProps> = ({ onNavigate, transactions, activeContext }) => {
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  // Hook handles logic only, UI is global
  const { checkAndTrigger } = useFunReaction(activeContext.uid);
  
  const { confirmTransactions, isSaving } = useLedgerConfirm(
    activeContext.uid,
    accounts,
    () => onNavigate(ViewName.DASHBOARD),
    checkAndTrigger
  );

  useEffect(() => {
    if (transactions.length > 0) {
        setLocalTransactions(transactions);
        setSelectedIds(new Set(transactions.map(t => t.id)));
    }
    
    // Fetch all accounts
    const q = collection(db, 'users', activeContext.uid, 'accounts');
    const unsub = onSnapshot(q, (snap) => {
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setAccounts(accs);
      
      // Filter payment accounts (Cash + Credit Cards)
      const payments = accs.filter(a => 
        (a.group === 'ASSETS' && a.category === 'Cash') || 
        (a.group === 'CAPITAL' && a.category === 'Credit Card')
      );
      setPaymentAccounts(payments);
      
      setIsInitializing(false);
    }, (err) => {
      console.error("Failed to fetch accounts:", err);
      setIsInitializing(false);
    });

    return () => unsub();
  }, [activeContext.uid, transactions]);

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
      setLocalTransactions(prev => prev.map(t => 
          t.id === id ? { ...t, ...updates } : t
      ));
  };

  const handleConfirm = () => {
    confirmTransactions(localTransactions, selectedIds);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-display">
      <div className="flex items-center justify-between p-5 bg-white border-b sticky top-0 z-50">
        <button onClick={() => onNavigate(ViewName.NEW_ENTRY)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center">
            <h2 className="text-slate-900 font-black">Audit Review</h2>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Double-Entry Verification</p>
        </div>
        <button 
          onClick={() => setDebugMode(!debugMode)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${debugMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
        >
          <Bug size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar pb-40">
        {debugMode && (
          <div className="bg-indigo-900 text-indigo-100 p-4 rounded-2xl flex items-start gap-3 shadow-xl animate-in slide-in-from-top duration-300">
             <div className="p-2 bg-white/10 rounded-lg"><Bug size={18} /></div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Developer Preview Active</p>
                <p className="text-xs font-medium leading-relaxed mt-1">Hệ thống hạch toán an toàn đã được kích hoạt. Các yêu cầu ghi được gộp thành Batch xử lý nguyên tử (Atomic Batch).</p>
             </div>
          </div>
        )}

        {isInitializing ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 className="animate-spin text-indigo-600" size={32} />
             <p className="text-sm font-bold text-slate-400">Verifying ledger state...</p>
          </div>
        ) : localTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-10">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-slate-300" />
             </div>
             <p className="text-slate-500 font-bold">No entries to review.</p>
             <button onClick={() => onNavigate(ViewName.DASHBOARD)} className="mt-4 text-indigo-600 font-black text-xs uppercase tracking-widest">Return Home</button>
          </div>
        ) : (
          localTransactions.map(item => (
            <TransactionItem 
                key={item.id} 
                item={item} 
                isSelected={selectedIds.has(item.id)} 
                isSaving={isSaving} 
                showDebug={debugMode}
                toggleSelection={(id) => {
                    const next = new Set(selectedIds);
                    next.has(id) ? next.delete(id) : next.add(id);
                    setSelectedIds(next);
                }} 
                paymentAccounts={paymentAccounts}
                onUpdate={handleUpdateTransaction}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t rounded-t-[2.5rem] shadow-2xl z-20">
        <button 
            onClick={handleConfirm} 
            disabled={isSaving || isInitializing || selectedIds.size === 0} 
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50 transition-all"
        >
            {isSaving ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} className="text-emerald-400" />}
            {isSaving ? "Syncing Ledger..." : `Authorize ${selectedIds.size} Entries`}
        </button>
      </div>
    </div>
  );
};

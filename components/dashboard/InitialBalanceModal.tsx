
import React, { useState } from 'react';
import { X, Wallet, Loader2 } from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { AmountInput } from '../ui/AmountInput';

interface InitialBalanceModalProps {
  currentInitialBalance: number;
  onClose: () => void;
  targetUid: string;
}

export const InitialBalanceModal: React.FC<InitialBalanceModalProps> = ({ currentInitialBalance, onClose, targetUid }) => {
  const [amount, setAmount] = useState(currentInitialBalance.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const newAmt = Number(amount) || 0;
      const uid = targetUid;
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      // 1. Update the user's base initialBalance field
      const userRef = doc(db, 'users', uid);
      batch.update(userRef, { initialBalance: newAmt });

      // 2. Sync with Ledger Accounts
      const accountsRef = collection(db, 'users', uid, 'accounts');
      
      // Find existing Cash Wallet and Spending Fund
      const qCash = query(accountsRef, where('category', '==', 'Cash'), where('group', '==', 'ASSETS'));
      const qFund = query(accountsRef, where('category', '==', 'Equity Fund'), where('group', '==', 'CAPITAL'));
      
      const [cashSnap, fundSnap] = await Promise.all([
        getDocs(qCash),
        getDocs(qFund)
      ]);

      // Handle Cash Wallet
      if (!cashSnap.empty) {
        // Update existing
        batch.update(cashSnap.docs[0].ref, { current_balance: newAmt });
      } else {
        // Create new if it doesn't exist (post-reset scenario)
        const newCashRef = doc(accountsRef);
        batch.set(newCashRef, {
          id: newCashRef.id,
          name: 'Cash Wallet',
          group: 'ASSETS',
          category: 'Cash',
          current_balance: newAmt,
          status: 'ACTIVE',
          createdAt: now
        });
      }

      // Handle Spending Fund
      if (!fundSnap.empty) {
        // Update existing
        batch.update(fundSnap.docs[0].ref, { current_balance: newAmt });
      } else {
        // Create new if it doesn't exist (post-reset scenario)
        const newFundRef = doc(accountsRef);
        batch.set(newFundRef, {
          id: newFundRef.id,
          name: 'Spending Fund',
          group: 'CAPITAL',
          category: 'Equity Fund',
          current_balance: newAmt,
          status: 'ACTIVE',
          createdAt: now
        });
      }

      await batch.commit();
      onClose();
    } catch (error) {
      console.error("Error updating balance and ledger:", error);
      alert("Failed to sync ledger balances. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                 <Wallet size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Adjust Wallet</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Initial base balance</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
             <X size={24} />
           </button>
        </div>

        <div className="mb-8">
           <AmountInput 
             label="Starting Amount (VND)"
             value={amount}
             onChange={setAmount}
             autoFocus
           />
           <p className="mt-4 text-[10px] font-medium text-slate-400 leading-relaxed text-center px-4">
             Setting this will automatically update your <span className="text-indigo-600 font-bold">Cash Wallet</span> and <span className="text-indigo-600 font-bold">Spending Fund</span> to keep your ledger balanced.
           </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 hover:bg-slate-800"
        >
          {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Wallet size={20} className="text-indigo-400" />}
          {loading ? 'Syncing Ledger...' : 'Apply New Balance'}
        </button>
      </div>
    </div>
  );
};

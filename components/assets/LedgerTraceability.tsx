
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, getDoc, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { Transaction, Account } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { History, Database, Info, AlertCircle, Clock, Trash2, ArrowUpRight, ArrowDownLeft, Calculator, Loader2, X, CheckCircle2 } from 'lucide-react';

interface LedgerTraceabilityProps {
  accountId: string;
  targetUid: string;
}

export const LedgerTraceability: React.FC<LedgerTraceabilityProps> = ({ accountId, targetUid }) => {
  const [ledger, setLedger] = useState<Transaction[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  
  // UI State for cleanup suggestion
  const [showCleanup, setShowCleanup] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // 1. Real-time Account Listener (To detect 0 balance immediately)
    const unsubAccount = onSnapshot(doc(db, 'users', targetUid, 'accounts', accountId), (docSnap) => {
        if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Account;
            setAccount(data);
            
            // Logic Trigger Cleanup Suggestion
            const balanceZero = Math.abs(data.current_balance) < 1;
            
            // Condition 1: Created more than 2 days ago
            const createdTime = new Date(data.createdAt).getTime();
            const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
            const isOldEnough = (Date.now() - createdTime) > twoDaysInMs;

            // Condition 2: Not snoozed (checked via localStorage)
            const snoozeKey = `cleanup_snooze_${accountId}`;
            const snoozeUntil = localStorage.getItem(snoozeKey);
            const isSnoozed = snoozeUntil && Date.now() < Number(snoozeUntil);

            if (balanceZero && isOldEnough && !isSnoozed) {
                setShowCleanup(true);
            } else {
                setShowCleanup(false);
            }
        }
    }, (err) => {
        console.error("Account Listener Error:", err);
    });

    // 2. Real-time Ledger Listener
    const q = query(collection(db, 'users', targetUid, 'transactions'));
    const unsubLedger = onSnapshot(q, (snap) => {
      const allTx = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      
      const filtered = allTx.filter(tx => 
        tx.debit_account_id === accountId || 
        tx.credit_account_id === accountId || 
        tx.asset_link_id === accountId
      );

      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.datetime || a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.datetime || b.date || b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setLedger(sorted);
      setLoading(false);
    }, (err) => {
      console.error("Ledger Snapshot Error:", err);
      setError("Database connection error.");
      setLoading(false);
    });

    return () => {
      unsubAccount();
      unsubLedger();
    };
  }, [accountId, targetUid]);

  const handleKeepAccount = () => {
      // Snooze for 30 days
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const snoozeUntil = Date.now() + thirtyDaysInMs;
      localStorage.setItem(`cleanup_snooze_${accountId}`, snoozeUntil.toString());
      setShowCleanup(false);
  };

  // Logic xóa an toàn: Hoàn tác số dư và các chỉ số chi tiết (Gốc, Unit)
  const handleDelete = async (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    
    if (confirmingId !== tx.id) {
        setConfirmingId(tx.id);
        setTimeout(() => setConfirmingId(prev => prev === tx.id ? null : prev), 3000);
        return;
    }

    if (deletingId) return;
    setDeletingId(tx.id);
    setConfirmingId(null);

    try {
        const batch = writeBatch(db);
        const amt = Number(tx.amount || 0);
        const accountsRef = collection(db, 'users', targetUid, 'accounts');
        
        // Helper: Revert logic for a single account involved in the transaction
        const processAccountRevert = async (accId: string, isDebit: boolean) => {
            const accRef = doc(accountsRef, accId);
            const accSnap = await getDoc(accRef);
            
            if (!accSnap.exists()) return;
            const accData = accSnap.data() as Account;
            
            // 1. Revert Balance (General Ledger)
            let balanceChange = 0;
            if (accData.group === 'ASSETS') {
                balanceChange = isDebit ? -amt : amt;
            } else {
                balanceChange = isDebit ? amt : -amt;
            }
            
            const updates: any = { current_balance: increment(balanceChange) };

            // 2. Revert Specific Details (Sub-ledger) using EXACT MATCHING if possible
            const relatedDetailId = (tx as any).related_detail_id;

            // A. LIABILITY: Revert Principal
            if (accData.category === 'Liability' && accData.liability_details) {
                updates['liability_details.principal_amount'] = increment(balanceChange);
            }

            // B. INVESTMENT: Revert Units
            if (['Stocks', 'Crypto', 'Gold'].includes(accData.category) && accData.investment_details) {
                const units = Number(tx.units || 0);
                if (units > 0) {
                    const unitChange = isDebit ? -units : units;
                    updates['investment_details.total_units'] = increment(unitChange);
                }
            }

            // C. REAL ESTATE: Revert Total Investment
            if (accData.category === 'Real Estate' && accData.real_estate_details) {
                if (isDebit && tx.type === 'ASSET_INVESTMENT') {
                     updates['real_estate_details.total_investment'] = increment(-amt);
                }
            }

            // 3. Remove Internal Log Entry or Deposit
            // STRATEGY: Prefer ID match, fallback to heuristic
            let logsModified = false;

            // Type 1: Investment Logs
            if (accData.investment_logs && accData.investment_logs.length > 0) {
                let newLogs = [...accData.investment_logs];
                if (relatedDetailId) {
                    // Precision removal
                    const initialLen = newLogs.length;
                    newLogs = newLogs.filter(l => l.id !== relatedDetailId);
                    if (newLogs.length !== initialLen) logsModified = true;
                } 
                
                if (!logsModified) {
                    // Fallback Heuristic
                    const logIndex = newLogs.findIndex(l => {
                        const logDate = l.date;
                        const txDate = tx.date || (tx.datetime ? tx.datetime.split('T')[0] : '');
                        if (logDate !== txDate) return false;
                        
                        // Match Value
                        const logVal = (l.units && l.units > 0 && l.price) ? (l.price * l.units) : l.price;
                        return Math.abs(logVal - amt) < 1000 || Math.abs(l.price - amt) < 1000;
                    });
                    if (logIndex !== -1) {
                        newLogs.splice(logIndex, 1);
                        logsModified = true;
                    }
                }

                if (logsModified) updates['investment_logs'] = newLogs;
            }

            // Type 2: Savings Deposits (Special Case)
            if (accData.category === 'Savings' && accData.details?.deposits) {
                let newDeposits = [...accData.details.deposits];
                if (relatedDetailId) {
                    const initialLen = newDeposits.length;
                    newDeposits = newDeposits.filter(d => d.id !== relatedDetailId);
                    if (newDeposits.length !== initialLen) {
                        updates['details.deposits'] = newDeposits;
                        // Also revert principal amount if specific deposit removed
                        updates['details.principal_amount'] = increment(balanceChange);
                    }
                }
            }

            batch.update(accRef, updates);
        };

        // Execute reverts
        if (tx.debit_account_id) await processAccountRevert(tx.debit_account_id, true);
        if (tx.credit_account_id) await processAccountRevert(tx.credit_account_id, false);

        // Delete the transaction
        batch.delete(doc(db, 'users', targetUid, 'transactions', tx.id));
        
        await batch.commit();

    } catch (e: any) {
        console.error("DELETE ERROR:", e);
        alert("Lỗi khi xóa và hoàn tác: " + e.message);
    } finally {
        setDeletingId(null);
    }
  };

  const handleCleanupAccount = async () => {
      if (isDeletingAccount) return;
      setIsDeletingAccount(true);
      try {
          await deleteDoc(doc(db, 'users', targetUid, 'accounts', accountId));
          // Parent component should react to this deletion (e.g. close modal)
      } catch (e: any) {
          alert("Lỗi xóa tài khoản: " + e.message);
          setIsDeletingAccount(false);
      }
  };

  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    
    ledger.forEach(tx => {
      const amt = Number(tx.amount || 0);
      const isAsset = account?.group === 'ASSETS';
      const isIncrease = isAsset 
        ? tx.debit_account_id === accountId 
        : tx.credit_account_id === accountId;

      if (isIncrease) totalIn += amt;
      else totalOut += amt;
    });

    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [ledger, accountId, account?.group]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <History className="animate-spin text-indigo-400" size={32} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reconstructing Ledger...</p>
    </div>
  );

  if (error) return (
    <div className="py-12 bg-red-50 rounded-[2rem] border border-red-100 flex flex-col items-center justify-center text-red-500 gap-2 px-6 text-center">
        <AlertCircle size={32} />
        <p className="text-xs font-bold">{error}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Cleanup Suggestion (Visible when balance is 0 and conditions met) */}
      {showCleanup && !loading && (
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-[1.5rem] flex flex-col sm:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
            <div className="flex gap-3 items-center">
                <div className="bg-white p-2.5 rounded-full text-orange-500 shadow-sm border border-orange-100 shrink-0">
                    <Trash2 size={18} />
                </div>
                <div>
                    <p className="text-xs font-black text-slate-800">Tài khoản trống (0đ)</p>
                    <p className="text-[10px] text-slate-500 font-medium">Bạn có muốn xóa tài khoản này khỏi danh sách không?</p>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleKeepAccount} 
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-slate-500 text-[10px] font-black uppercase rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                    Giữ lại
                </button>
                <button 
                    onClick={handleCleanupAccount} 
                    disabled={isDeletingAccount}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-orange-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                    {isDeletingAccount ? <Loader2 size={12} className="animate-spin" /> : "Xóa vĩnh viễn"}
                </button>
            </div>
        </div>
      )}

      {/* Ledger Summary Stats */}
      <div className="bg-slate-900 rounded-[2rem] p-5 shadow-xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
         <div className="flex items-center gap-2 mb-4">
            <Calculator size={14} className="text-indigo-400" />
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Tổng quan dòng tiền</span>
         </div>
         <div className="grid grid-cols-3 gap-4 relative z-10">
            <div className="flex flex-col gap-1">
               <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Tổng tiền vào</p>
               <p className="text-sm font-black text-white">{currencyFormatter.format(stats.totalIn)}</p>
            </div>
            <div className="flex flex-col gap-1">
               <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Tổng tiền ra</p>
               <p className="text-sm font-black text-white">{currencyFormatter.format(stats.totalOut)}</p>
            </div>
            <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
               <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Biến động ròng</p>
               <p className={`text-sm font-black ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {stats.net > 0 ? '+' : ''}{currencyFormatter.format(stats.net)}
               </p>
            </div>
         </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết biến động (Audit Trail)</h4>
           <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{ledger.length} giao dịch</span>
        </div>

        {ledger.length === 0 ? (
          <div className="py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-2">
              <Database size={32} className="opacity-10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-center px-10">Không có biến động nào</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {ledger.map((tx) => {
              const isAsset = account?.group === 'ASSETS';
              const isIncrease = isAsset 
                ? tx.debit_account_id === accountId 
                : tx.credit_account_id === accountId;

              const displayDate = tx.date || (tx.datetime ? tx.datetime.split('T')[0] : 'Gần đây');
              const displayNote = tx.note || tx.category || 'Hạch toán nội bộ';
              const refId = typeof tx.id === 'string' ? tx.id.substring(0, 8).toUpperCase() : 'TRANS';
              const isDeleting = deletingId === tx.id;
              const isConfirming = confirmingId === tx.id;

              return (
                <div key={tx.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col gap-3 shadow-sm hover:border-indigo-100 transition-colors group">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIncrease ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {isIncrease ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                         </div>
                         <div className="min-w-0">
                            <div className="flex items-center gap-2">
                               <p className="text-xs font-bold text-slate-900 leading-none truncate max-w-[150px]">{displayNote}</p>
                               <div className="flex items-center gap-1">
                                  <button 
                                    onClick={(e) => handleDelete(e, tx)}
                                    disabled={isDeleting}
                                    className={`p-1.5 rounded-md transition-all cursor-pointer relative z-20 flex items-center gap-1 ${
                                        isConfirming 
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
                                        : 'bg-slate-50 text-rose-500 hover:bg-rose-50'
                                    }`}
                                    title="Xóa giao dịch & Hoàn tác số dư"
                                  >
                                    {isDeleting ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : isConfirming ? (
                                        <>
                                            <Trash2 size={12} />
                                            <span className="text-[9px] font-black uppercase">Confirm?</span>
                                        </>
                                    ) : (
                                        <Trash2 size={12} />
                                    )}
                                  </button>
                                  {isConfirming && (
                                      <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmingId(null);
                                        }}
                                        className="p-1.5 bg-slate-100 text-slate-400 rounded-md hover:bg-slate-200"
                                      >
                                          <X size={12} />
                                      </button>
                                  )}
                               </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock size={10} className="text-slate-300" />
                              <p className="text-[9px] font-bold text-slate-400 uppercase">
                                {displayDate} • {tx.category || 'Khác'}
                              </p>
                            </div>
                         </div>
                      </div>
                      <p className={`text-xs font-black ${isIncrease ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isIncrease ? '+' : '-'}{currencyFormatter.format(tx.amount || 0)}
                      </p>
                   </div>
                   <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-1.5">
                         <Info size={10} className="text-slate-300" />
                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            {isIncrease ? 'Dòng tiền vào' : 'Dòng tiền ra'}
                         </p>
                      </div>
                      <p className="text-[8px] font-black text-slate-300 uppercase">Ref: {refId}</p>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

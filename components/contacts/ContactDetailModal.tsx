
import React, { useState, useEffect, useMemo } from 'react';
import { X, Phone, ArrowUpRight, ArrowDownLeft, Landmark, History, Wallet, User, MessageCircle, AlertCircle, Loader2, Edit2 } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FinancialContact, Transaction, Account, TransactionType } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { ContactForm } from './ContactForm';

interface ContactDetailModalProps {
  contact: FinancialContact;
  targetUid: string;
  onClose: () => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ contact: initialContact, targetUid, onClose }) => {
  const [currentContact, setCurrentContact] = useState<FinancialContact>(initialContact);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Listen for real-time updates to the Contact itself (Sync Name/Phone changes immediately)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', targetUid, 'contacts', initialContact.id), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentContact({ id: docSnap.id, ...docSnap.data() } as FinancialContact);
      }
    });
    return () => unsub();
  }, [initialContact.id, targetUid]);

  // 2. Fetch linked data
  useEffect(() => {
    // Note: Accounts are currently linked by NAME. If name changes without updating accounts, this might break linkage.
    const qAccs = query(
      collection(db, 'users', targetUid, 'accounts'),
      where('creditor_debtor_name', '==', currentContact.name)
    );

    const unsubAccs = onSnapshot(qAccs, (snap) => {
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setAccounts(accs);
      
      if (accs.length > 0) {
        const accIds = accs.map(a => a.id);
        // Optimized: Add limit(50) and orderBy('datetime', 'desc') to reduce reads and show latest first
        const qTxns = query(
          collection(db, 'users', targetUid, 'transactions'),
          where('asset_link_id', 'in', accIds.slice(0, 10)),
          orderBy('datetime', 'desc'),
          limit(50)
        );
        
        onSnapshot(qTxns, (tSnap) => {
          const txs = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
          setTransactions(txs);
          setLoading(false);
        });
      } else {
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => unsubAccs();
  }, [currentContact.name, targetUid]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 outline-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="bg-slate-50 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh]">
        
        {/* Header Profile */}
        <div className="bg-white p-6 pb-8 border-b border-slate-100 shrink-0 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div className="flex items-center justify-between relative z-10 mb-6">
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
              <div className="flex gap-2">
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                 >
                    <Edit2 size={20} />
                 </button>
              </div>
           </div>

           <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 rounded-[2rem] bg-slate-100 overflow-hidden mb-4 ring-8 ring-white shadow-xl">
                 {currentContact.avatar_url ? (
                    <img src={currentContact.avatar_url} alt="" className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                       <User size={48} />
                    </div>
                 )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{currentContact.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{currentContact.phone || 'Lender / Borrower'}</p>
           </div>
        </div>

        {/* Balance Overview */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <ArrowDownLeft size={10} className="text-emerald-500" /> Tổng phải thu
                 </p>
                 <p className="text-lg font-black text-emerald-600">{currencyFormatter.format(currentContact.total_receivable || 0)}</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <ArrowUpRight size={10} className="text-red-500" /> Tổng phải trả
                 </p>
                 <p className="text-lg font-black text-red-600">{currencyFormatter.format(currentContact.total_payable || 0)}</p>
              </div>
           </div>

           {/* Linked Accounts */}
           <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Các khoản nợ liên quan</h4>
              <div className="flex flex-col gap-2">
                 {accounts.length === 0 ? (
                    <p className="text-[10px] font-bold text-slate-300 italic px-2">Không tìm thấy tài khoản liên kết.</p>
                 ) : accounts.map(acc => (
                    <div key={acc.id} className="p-4 bg-white rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                             <Landmark size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-800">{acc.name}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">{acc.category}</p>
                          </div>
                       </div>
                       <p className="text-sm font-black text-slate-900">{currencyFormatter.format(acc.current_balance)}</p>
                    </div>
                 ))}
              </div>
           </div>

           {/* Transaction History for this Contact */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History size={12} className="text-indigo-500" /> Lịch sử giao dịch
                 </h4>
              </div>

              {loading ? (
                <div className="py-10 flex justify-center"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
              ) : transactions.length === 0 ? (
                <div className="py-10 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-300">
                   <AlertCircle size={32} className="mx-auto mb-2 opacity-10" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Chưa có giao dịch ghi nhận</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                   {transactions.map(tx => {
                      const isPay = tx.type === TransactionType.DEBT_REPAYMENT;
                      return (
                        <div key={tx.id} className="p-4 bg-white rounded-3xl border border-slate-100 flex items-center justify-between hover:border-indigo-100 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isPay ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                 <Wallet size={16} />
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-slate-900">{tx.note || tx.category}</p>
                                 <p className="text-[9px] font-bold text-slate-400">{tx.datetime}</p>
                              </div>
                           </div>
                           <p className={`text-xs font-black ${isPay ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {isPay ? '-' : '+'}{currencyFormatter.format(tx.amount)}
                           </p>
                        </div>
                      )
                   })}
                </div>
              )}
           </div>
        </div>
      </div>

      {isEditing && (
        <ContactForm 
          targetUid={targetUid} 
          contact={currentContact} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
};


import React, { useState } from 'react';
// Added Check to the lucide-react imports
import { X, Merge, Loader2, AlertCircle, Info, Database, Check } from 'lucide-react';
import { doc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Account } from '../../types';
import { currencyFormatter } from '../../lib/utils';

interface MergeAccountsModalProps {
  selectedAccounts: Account[];
  onClose: () => void;
  targetUid: string;
}

export const MergeAccountsModal: React.FC<MergeAccountsModalProps> = ({ selectedAccounts, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');

  const totalBalance = selectedAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

  const handleMerge = async () => {
    if (!newName.trim() || loading) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      
      // 1. Tạo tài khoản mới
      const newAccRef = doc(accountsRef);
      const now = new Date().toISOString();
      const firstAccount = selectedAccounts[0];
      
      const newAccountData = {
        id: newAccRef.id,
        name: newName.trim(),
        group: firstAccount.group,
        category: firstAccount.category,
        current_balance: totalBalance,
        status: 'ACTIVE',
        createdAt: now,
        mergedFrom: selectedAccounts.map(a => a.id)
      };
      
      batch.set(newAccRef, newAccountData);

      // 2. Tìm và cập nhật tất cả Transaction liên quan
      // Lưu ý: Trong một app thực tế quy mô lớn, việc này nên làm ở Cloud Function hoặc xử lý theo trang
      // Nhưng trong context này chúng ta xử lý batch cho sự tiện dụng.
      
      const oldIds = selectedAccounts.map(a => a.id);
      
      // Cập nhật debit_account_id
      const qDebit = query(transactionsRef, where('debit_account_id', 'in', oldIds));
      const snapDebit = await getDocs(qDebit);
      snapDebit.docs.forEach(d => batch.update(d.ref, { debit_account_id: newAccRef.id }));

      // Cập nhật credit_account_id
      const qCredit = query(transactionsRef, where('credit_account_id', 'in', oldIds));
      const snapCredit = await getDocs(qCredit);
      snapCredit.docs.forEach(d => batch.update(d.ref, { credit_account_id: newAccRef.id }));

      // Cập nhật asset_link_id
      const qLink = query(transactionsRef, where('asset_link_id', 'in', oldIds));
      const snapLink = await getDocs(qLink);
      snapLink.docs.forEach(d => batch.update(d.ref, { asset_link_id: newAccRef.id }));

      // 3. Xóa các tài khoản cũ
      selectedAccounts.forEach(acc => {
        batch.delete(doc(db, 'users', targetUid, 'accounts', acc.id));
      });

      await batch.commit();
      onClose();
    } catch (error: any) {
      console.error("Merge failed:", error);
      alert("Hệ thống gặp lỗi khi gộp dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-50">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                 <Merge size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-slate-900">Gộp tài khoản</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merger & Audit Consolidation</p>
              </div>
           </div>
           <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
           <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100/50 flex items-start gap-4">
              <Info size={20} className="text-indigo-600 shrink-0 mt-1" />
              <div className="text-[11px] font-medium text-indigo-900 leading-relaxed">
                 Hành động này sẽ tạo một tài khoản mới với số dư bằng tổng các tài khoản được chọn. 
                 Toàn bộ lịch sử giao dịch sẽ được tự động liên kết (Traceability) sang tài khoản mới này.
              </div>
           </div>

           <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Accounts to be merged:</p>
              <div className="flex flex-col gap-2">
                 {selectedAccounts.map(acc => (
                   <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-700">{acc.name}</span>
                      <span className="text-xs font-black text-slate-900">{currencyFormatter.format(acc.current_balance)}</span>
                   </div>
                 ))}
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-900 rounded-2xl text-white shadow-lg">
                 <span className="text-[10px] font-black uppercase tracking-widest">Total Combined Balance</span>
                 <span className="text-lg font-black">{currencyFormatter.format(totalBalance)}</span>
              </div>
           </div>

           <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Account Name</label>
              <div className="relative group">
                 <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Total Cash Wallet"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-100 transition-all shadow-inner"
                 />
                 <Database size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <button 
             onClick={handleMerge}
             disabled={loading || !newName.trim()}
             className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
           >
              {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Check size={24} className="text-indigo-400" />}
              {loading ? "Consolidating Ledger..." : "Finalize & Merge"}
           </button>
        </div>
      </div>
    </div>
  );
};

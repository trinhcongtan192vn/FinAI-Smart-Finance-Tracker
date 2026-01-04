
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Loader2, AlertTriangle, User, Calendar, Wallet, CreditCard, ChevronDown } from 'lucide-react';
import { doc, collection, getDocs, writeBatch, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { getCategoryIcon } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { StandardSelect } from '../ui/StandardSelect';
import { DateInput } from '../ui/DateInput';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TransactionType, Account } from '../../types';

interface EditTransactionModalProps {
  transaction: any;
  onClose: () => void;
  targetUid: string;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  
  const isIncome = transaction?.group === 'INCOME';
  // For Income: Payment Account is Debit. For Expense: Payment Account is Credit.
  const initialSourceId = isIncome ? transaction.debit_account_id : transaction.credit_account_id;

  const [formData, setFormData] = useState({
    note: transaction?.note || '',
    amount: transaction?.amount || 0,
    category: transaction?.category || 'Other',
    type: (isIncome ? 'income' : 'expense') as 'income' | 'expense',
    datetime: transaction?.datetime || transaction?.date || new Date().toISOString().split('T')[0],
    sourceAccountId: initialSourceId || ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catSnap, accSnap] = await Promise.all([
          getDocs(collection(db, 'users', targetUid, 'categories')),
          getDocs(collection(db, 'users', targetUid, 'accounts'))
        ]);
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAllAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
      } catch (error) { console.error(error); }
    };
    fetchData();
  }, [targetUid]);

  const paymentAccounts = useMemo(() => {
      return allAccounts.filter(a => 
        (a.group === 'ASSETS' && a.category === 'Cash') || 
        (a.group === 'CAPITAL' && a.category === 'Credit Card')
      );
  }, [allAccounts]);

  const isValidAccountId = (id: any) => 
    id && typeof id === 'string' && id.length > 5 && !id.includes('temp');

  const handleSave = async () => {
    if (!transaction?.id || loading) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const docRef = doc(db, 'users', targetUid, 'transactions', transaction.id);
      
      const newAmount = Number(formData.amount);
      const oldAmount = Number(transaction.amount || 0);
      const hasAmountChanged = newAmount !== oldAmount;
      const hasAccountChanged = formData.sourceAccountId !== initialSourceId;

      if (transaction.status === 'confirmed' && (hasAmountChanged || hasAccountChanged)) {
        // Logic hạch toán lại số dư
        // 1. Revert cũ
        if (isValidAccountId(transaction.debit_account_id)) {
            const accRef = doc(db, 'users', targetUid, 'accounts', transaction.debit_account_id);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
                const acc = accSnap.data() as Account;
                const revertVal = acc.group === 'ASSETS' ? -oldAmount : oldAmount;
                batch.update(accRef, { current_balance: increment(revertVal) });
            }
        }
        if (isValidAccountId(transaction.credit_account_id)) {
            const accRef = doc(db, 'users', targetUid, 'accounts', transaction.credit_account_id);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
                const acc = accSnap.data() as Account;
                const revertVal = acc.group === 'ASSETS' ? oldAmount : -oldAmount;
                batch.update(accRef, { current_balance: increment(revertVal) });
            }
        }

        // 2. Apply mới
        const newDebitId = formData.type === 'income' ? formData.sourceAccountId : transaction.debit_account_id;
        const newCreditId = formData.type === 'income' ? transaction.credit_account_id : formData.sourceAccountId;

        if (isValidAccountId(newDebitId)) {
            const accRef = doc(db, 'users', targetUid, 'accounts', newDebitId);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
                const acc = accSnap.data() as Account;
                const applyVal = acc.group === 'ASSETS' ? newAmount : -newAmount;
                batch.update(accRef, { current_balance: increment(applyVal) });
            }
        }
        if (isValidAccountId(newCreditId)) {
            const accRef = doc(db, 'users', targetUid, 'accounts', newCreditId);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
                const acc = accSnap.data() as Account;
                const applyVal = acc.group === 'ASSETS' ? -newAmount : newAmount;
                batch.update(accRef, { current_balance: increment(applyVal) });
            }
        }

        // Cập nhật IDs trong transaction object
        batch.update(docRef, {
            debit_account_id: newDebitId,
            credit_account_id: newCreditId
        });
      }

      batch.update(docRef, {
        note: formData.note,
        category: formData.category,
        datetime: formData.datetime,
        date: formData.datetime.split('T')[0],
        group: formData.type.toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSES',
        amount: newAmount,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email
      });

      await batch.commit();
      onClose();
    } catch (error: any) {
      console.error("Update failed:", error);
      alert(`Lỗi hạch toán: ${error.message}`);
    } finally { 
      setLoading(false); 
    }
  };

  const confirmDelete = async () => {
    if (!transaction?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'users', targetUid, 'transactions', transaction.id);
      
      if (transaction.status === 'confirmed') {
        const amt = Number(transaction.amount || 0);

        if (isValidAccountId(transaction.debit_account_id)) {
            const accRef = doc(db, 'users', targetUid, 'accounts', transaction.debit_account_id);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
                const acc = accSnap.data() as Account;
                batch.update(accRef, { current_balance: increment(acc.group === 'ASSETS' ? -amt : amt) });
            }
        }
        if (isValidAccountId(transaction.credit_account_id)) {
            const accRef = doc(db, 'users', targetUid, 'accounts', transaction.credit_account_id);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
                const acc = accSnap.data() as Account;
                batch.update(accRef, { current_balance: increment(acc.group === 'ASSETS' ? amt : -amt) });
            }
        }
      }

      batch.delete(txRef);
      await batch.commit();
      onClose();
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert(`Lỗi khi xóa: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const { icon, bg, text } = getCategoryIcon(formData.category);
  const filteredCategories = categories.filter(c => 
    formData.type === 'income' ? c.group === 'INCOME' : c.group === 'EXPENSES'
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !loading && !isDeleting && onClose()}></div>
      <div className="bg-white w-full max-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header Section */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
           <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${bg} ${text} flex items-center justify-center shadow-inner`}>
                 <span className="material-symbols-outlined text-[32px]">{icon}</span>
              </div>
              <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Chỉnh sửa giao dịch</h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">ID: {transaction?.id?.substring(0, 8)}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-90"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          <AmountInput 
            label="Số tiền giao dịch"
            value={formData.amount}
            onChange={(val) => setFormData({...formData, amount: Number(val)})}
          />

          <SegmentedControl 
            label="Loại dòng tiền"
            options={[
              { label: 'Chi tiêu', value: 'expense', activeColor: 'bg-white text-red-600 shadow-md ring-1 ring-red-50' },
              { label: 'Thu nhập', value: 'income', activeColor: 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-50' }
            ]}
            value={formData.type}
            onChange={(val) => setFormData({...formData, type: val as any})}
          />

          <div className="grid grid-cols-1 gap-6">
            {/* Account Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Wallet size={12} className="text-indigo-400" /> Tài khoản thanh toán / Nhận tiền
                </label>
                <div className="relative group">
                    <select 
                        value={formData.sourceAccountId}
                        onChange={(e) => setFormData({...formData, sourceAccountId: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none appearance-none focus:bg-white focus:border-indigo-100 transition-all"
                    >
                        <optgroup label="Tiền mặt & Ngân hàng">
                            {paymentAccounts.filter(a => a.category === 'Cash').map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.group})</option>
                            ))}
                        </optgroup>
                        <optgroup label="Thẻ tín dụng (Nợ)">
                            {paymentAccounts.filter(a => a.category === 'Credit Card').map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} (Liability)</option>
                            ))}
                        </optgroup>
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
            </div>

            <StandardInput 
              label="Nội dung / Ghi chú"
              value={formData.note}
              onChange={(val) => setFormData({...formData, note: val})}
            />

            <div className="grid grid-cols-2 gap-4">
              <StandardSelect 
                label="Hạng mục"
                value={formData.category}
                onChange={(val) => setFormData({...formData, category: val})}
                options={filteredCategories.length > 0 ? filteredCategories.map(cat => ({ label: cat.name, value: cat.name })) : [{ label: 'Other', value: 'Other' }]}
              />
              <DateInput 
                label="Ngày giao dịch"
                value={formData.datetime.split('T')[0]}
                onChange={(val) => setFormData({...formData, datetime: val})}
              />
            </div>
          </div>

          {/* Audit Info */}
          <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                 <AlertTriangle size={12} className="text-indigo-400" /> Thông tin kiểm toán
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                 <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">Người tạo:</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 truncate max-w-[200px]">
                        {transaction?.addedBy || 'Hệ thống'}
                    </span>
                 </div>
                 
                 <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">Ngày ghi sổ:</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                        {transaction?.createdAt ? new Date(transaction.createdAt).toLocaleString('vi-VN') : 'N/A'}
                    </span>
                 </div>

                 {transaction?.updatedBy && (
                   <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                          <User size={14} className="text-indigo-400" />
                          <span className="text-xs font-bold text-slate-500">Cập nhật bởi:</span>
                      </div>
                      <span className="text-xs font-black text-indigo-600 truncate max-w-[200px]">
                          {transaction.updatedBy}
                      </span>
                   </div>
                 )}
              </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <button onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting || loading} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 hover:bg-red-100"><Trash2 size={24} /></button>
          <button onClick={handleSave} disabled={loading || isDeleting} className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]">
            {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Save size={20} className="text-indigo-400" />} {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md"></div>
            <div className="relative flex flex-col items-center text-center max-w-xs">
              <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 shadow-inner"><AlertTriangle size={40} /></div>
              <h4 className="text-2xl font-black text-slate-900 leading-tight">Xóa giao dịch này?</h4>
              <p className="text-sm font-medium text-slate-500 mt-2 mb-8 leading-relaxed">
                Hệ thống sẽ <span className="font-bold text-red-600">tự động hoàn tác (revert)</span> số dư của các tài khoản liên quan để đảm bảo tính chính xác của sổ cái.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button onClick={confirmDelete} disabled={isDeleting} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 flex items-center justify-center gap-2 transition-all active:scale-95">{isDeleting ? <Loader2 size={20} className="animate-spin" /> : "Xác nhận xóa & Hoàn số dư"}</button>
                <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold transition-all active:scale-95">Hủy bỏ</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

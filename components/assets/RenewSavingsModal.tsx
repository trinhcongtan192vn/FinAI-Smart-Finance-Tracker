
import React, { useState, useMemo } from 'react';
import { X, RotateCw, Loader2, Calendar, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { doc, collection, writeBatch, increment, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { DateInput } from '../ui/DateInput';

interface RenewSavingsModalProps {
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const RenewSavingsModal: React.FC<RenewSavingsModalProps> = ({ account, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [renewalType, setRenewalType] = useState<'PRINCIPAL_ONLY' | 'PRINCIPAL_AND_INTEREST'>('PRINCIPAL_ONLY');
  
  const details = account.details!;
  const expectedInterest = (details.principal_amount * (details.interest_rate / 100) * details.term_months) / 12;

  const [formData, setFormData] = useState({
    rate: details.interest_rate.toString(),
    term: details.term_months.toString(),
    startDate: new Date().toISOString().split('T')[0]
  });

  const newMaturityDate = useMemo(() => {
    const date = new Date(formData.startDate);
    date.setMonth(date.getMonth() + Number(formData.term));
    return date.toISOString().split('T')[0];
  }, [formData.startDate, formData.term]);

  const handleRenew = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const interest = Math.round(expectedInterest);
      const newPrincipal = renewalType === 'PRINCIPAL_AND_INTEREST' 
        ? details.principal_amount + interest 
        : details.principal_amount;

      // 1. Cập nhật Sổ tiết kiệm với thông số mới
      batch.update(doc(db, 'users', targetUid, 'accounts', account.id), {
        current_balance: newPrincipal,
        details: {
          ...details,
          principal_amount: newPrincipal,
          interest_rate: Number(formData.rate),
          term_months: Number(formData.term),
          start_date: formData.startDate,
          end_date: newMaturityDate,
        },
        updatedAt: now
      });

      // 2. Nếu chỉ tái tục gốc, gửi lãi về ví Cash Wallet
      if (renewalType === 'PRINCIPAL_ONLY') {
        const cashQ = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
        const cashSnap = await getDocs(cashQ);
        const cashAcc = cashSnap.docs[0];
        
        if (cashAcc) {
          batch.update(cashAcc.ref, { current_balance: increment(interest) });
          
          const txRef = doc(collection(db, 'users', targetUid, 'transactions'));
          batch.set(txRef, {
            id: txRef.id,
            amount: interest,
            date: formData.startDate,
            datetime: now,
            note: `Lãi tiết kiệm (Tái tục gốc): ${account.name}`,
            type: TransactionType.INTEREST_LOG,
            debit_account_id: cashAcc.id,
            credit_account_id: account.id, // Hạch toán từ sổ ra ví
            category: 'Salary',
            group: 'INCOME',
            status: 'confirmed',
            createdAt: now,
            addedBy: auth.currentUser?.email
          });
        }
      } else {
        // Nếu tái tục cả gốc lãi, ghi nhận một giao dịch ảo để theo dõi sự tăng trưởng
        const txRef = doc(collection(db, 'users', targetUid, 'transactions'));
        batch.set(txRef, {
          id: txRef.id,
          amount: interest,
          date: formData.startDate,
          datetime: now,
          note: `Tái tục gốc + lãi (Lãi kép): ${account.name}`,
          type: TransactionType.INTEREST_LOG,
          debit_account_id: account.id,
          credit_account_id: account.id,
          category: 'Savings',
          group: 'INCOME',
          status: 'confirmed',
          createdAt: now,
          addedBy: auth.currentUser?.email
        });
      }

      await batch.commit();
      onClose();
    } catch (e: any) {
      alert("Lỗi tái tục: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || parseFloat(val) >= 0) {
      setFormData({...formData, rate: val});
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                 <RotateCw size={20} />
              </div>
              <h3 className="font-black text-slate-900">Tái tục tiết kiệm</h3>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
           <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hình thức tái tục</p>
              <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={() => setRenewalType('PRINCIPAL_ONLY')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${renewalType === 'PRINCIPAL_ONLY' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-slate-50'}`}
                 >
                    <Wallet size={18} className={renewalType === 'PRINCIPAL_ONLY' ? 'text-indigo-600' : 'text-slate-400'} />
                    <p className="text-xs font-black mt-2 text-slate-900 leading-tight">Chỉ gốc</p>
                    <p className="text-[9px] font-medium text-slate-500 mt-1">Lãi chuyển về ví</p>
                 </button>
                 <button 
                  onClick={() => setRenewalType('PRINCIPAL_AND_INTEREST')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${renewalType === 'PRINCIPAL_AND_INTEREST' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-slate-50'}`}
                 >
                    <TrendingUp size={18} className={renewalType === 'PRINCIPAL_AND_INTEREST' ? 'text-indigo-600' : 'text-slate-400'} />
                    <p className="text-xs font-black mt-2 text-slate-900 leading-tight">Gốc + Lãi</p>
                    <p className="text-[9px] font-medium text-slate-500 mt-1">Lãi kép kỳ sau</p>
                 </button>
              </div>
           </div>

           <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 blur-2xl -mr-12 -mt-12"></div>
              <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Số dư kỳ tiếp theo</p>
              <h4 className="text-xl font-black">
                 {currencyFormatter.format(renewalType === 'PRINCIPAL_AND_INTEREST' ? details.principal_amount + expectedInterest : details.principal_amount)}
              </h4>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lãi suất mới (%)</label>
                 <input 
                   type="number" 
                   min="0"
                   value={formData.rate} 
                   onChange={handleRateChange} 
                   onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" 
                 />
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kỳ hạn mới (T)</label>
                 <select value={formData.term} onChange={e => setFormData({...formData, term: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none appearance-none">
                    {[1, 3, 6, 9, 12, 24].map(m => <option key={m} value={m}>{m} tháng</option>)}
                 </select>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 items-end">
              <DateInput label="Ngày bắt đầu mới" value={formData.startDate} onChange={val => setFormData({...formData, startDate: val})} />
              <div className="p-3.5 bg-slate-100 rounded-xl flex items-center gap-2">
                 <Calendar size={14} className="text-slate-400" />
                 <span className="text-[11px] font-black text-slate-500">{newMaturityDate}</span>
              </div>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex flex-col gap-3">
           <button 
            onClick={handleRenew}
            disabled={loading}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95"
           >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <RotateCw size={18} />}
              Xác nhận tái tục sổ
           </button>
           <button onClick={onClose} className="w-full py-2 text-xs font-bold text-slate-400">Hủy bỏ</button>
        </div>
      </div>
    </div>
  );
};

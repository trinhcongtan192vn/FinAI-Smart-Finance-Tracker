
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Loader2, Save, Palette, Target, Info, Wallet, ChevronDown } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { currencyFormatter } from '../../lib/utils';
import { Account, TransactionType } from '../../types';

interface AddCapitalModalProps {
  onClose: () => void;
  targetUid: string;
}

export const AddCapitalModal: React.FC<AddCapitalModalProps> = ({ onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const currentUserDisplayName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || '';
  
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);

  const [formData, setFormData] = useState({ 
    name: '', 
    initial_amount: '', 
    owner_name: currentUserDisplayName, 
    target_ratio: '25',
    description: '',
    destAccountId: ''
  });

  useEffect(() => {
    const fetchCash = async () => {
      const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'), where('group', '==', 'ASSETS'));
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setFormData(prev => ({ ...prev, destAccountId: accs[0].id }));
    };
    fetchCash();
  }, [targetUid]);

  const handleSave = async () => {
    if (!formData.name || !formData.initial_amount || !formData.owner_name || !formData.destAccountId) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const amount = Number(formData.initial_amount);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      
      const data: any = { 
        name: formData.name, 
        owner_name: formData.owner_name, 
        initial_amount: amount, 
        current_balance: amount, 
        group: 'CAPITAL',
        category: 'Equity Fund',
        status: 'ACTIVE', 
        createdAt: now,
        color_code: '#4F46E5', // Default color
        target_ratio: Number(formData.target_ratio),
        description: formData.description
      };

      // 1. Create the fund account (Capital Increase)
      const newAccRef = doc(accountsRef);
      batch.set(newAccRef, { ...data, id: newAccRef.id });

      // 2. Update Destination Cash Wallet (Asset Increase)
      const destRef = doc(accountsRef, formData.destAccountId);
      batch.update(destRef, { current_balance: increment(amount) });

      // 3. Create a transaction to reflect the injection
      // Debit: Cash (Asset+) | Credit: Fund (Capital+)
      const txRef = doc(transactionsRef);
      batch.set(txRef, {
        id: txRef.id,
        amount,
        group: 'CAPITAL',
        type: TransactionType.CAPITAL_INJECTION,
        category: 'Equity Fund',
        note: `Nạp vốn khởi tạo: ${formData.name}`,
        datetime: now,
        date: now.split('T')[0],
        credit_account_id: newAccRef.id,
        debit_account_id: formData.destAccountId, 
        status: 'confirmed',
        asset_link_id: newAccRef.id,
        createdAt: now,
        addedBy: auth.currentUser?.email
      });

      await batch.commit();
      onClose();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-indigo-50 text-indigo-600">
              <TrendingUp size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Nạp vốn tự có</h3>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Thêm quỹ chủ sở hữu mới</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số tiền nạp (VND)</label>
            <div className="relative group">
              <input 
                type="number" 
                value={formData.initial_amount} 
                onChange={(e) => setFormData({...formData, initial_amount: e.target.value})} 
                className="w-full px-6 py-8 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-[2.5rem] text-4xl font-black text-slate-900 outline-none text-center shadow-inner transition-all" 
                placeholder="0" 
                autoFocus
              />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl group-focus-within:text-indigo-500">đ</div>
            </div>
            <p className="text-center text-xs font-bold text-indigo-600 mt-1">
              {formData.initial_amount ? currencyFormatter.format(Number(formData.initial_amount)) : 'Nhập số tiền nạp'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên quỹ vốn</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="VD: Quỹ Tiết kiệm, Vốn KD..."
                className="w-full px-5 py-4 rounded-2xl text-sm font-bold outline-none bg-slate-50 border border-slate-100 focus:border-indigo-100 focus:bg-white transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ sở hữu</label>
              <input 
                type="text" 
                value={formData.owner_name} 
                onChange={(e) => setFormData({...formData, owner_name: e.target.value})} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-100 focus:bg-white transition-all" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Wallet size={12} /> Nhận tiền vào (Cash Wallet)</label>
             <div className="relative group">
                <select value={formData.destAccountId} onChange={e => setFormData({...formData, destAccountId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none cursor-pointer">
                   {cashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>
                   ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
             </div>
          </div>

          <div className="space-y-6 bg-indigo-50/30 p-5 rounded-[2rem] border border-indigo-100/50">
             <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Chiến lược quản trị quỹ</span>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tỷ lệ mục tiêu (%)</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        value={formData.target_ratio} 
                        onChange={e => setFormData({...formData, target_ratio: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-200 transition-all" 
                      />
                      <Info size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mục đích sử dụng</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ghi chú mục đích của nguồn vốn này..."
                  className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-medium text-slate-600 outline-none resize-none h-20 focus:border-indigo-200 transition-all"
                />
             </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
          <button 
            onClick={handleSave} 
            disabled={loading || !formData.name || !formData.initial_amount || !formData.owner_name || !formData.destAccountId} 
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Save size={20} className="text-indigo-400" />}
            {loading ? "Đang xử lý..." : "Xác nhận & Khởi tạo quỹ"}
          </button>
        </div>
      </div>
    </div>
  );
};

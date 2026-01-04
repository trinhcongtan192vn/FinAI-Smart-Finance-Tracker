
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, Wallet, Target, Info, Percent, Layers, ShoppingCart, Calendar } from 'lucide-react';
import { doc, collection, writeBatch, increment, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType, InvestmentLog } from '../../types';
import { currencyFormatter, calculateNewWAC, unitFormatter } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';
import { useFunReaction } from '../../hooks/useFunReaction';

interface BuyInvestmentModalProps {
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const BuyInvestmentModal: React.FC<BuyInvestmentModalProps> = ({ account, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  
  const [formData, setFormData] = useState({
    units: '',
    price: '',
    fees: '0',
    date: new Date().toISOString().split('T')[0],
    sourceAccountId: ''
  });

  // Fun Reaction Hook (Global)
  const { checkAndTrigger } = useFunReaction(targetUid);

  useEffect(() => {
    const fetchCash = async () => {
      const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setFormData(p => ({ ...p, sourceAccountId: accs[0].id }));
    };
    fetchCash();
  }, [targetUid]);

  const units = Number(formData.units) || 0;
  const price = Number(formData.price) || 0;
  const fees = Number(formData.fees) || 0;
  const totalCost = (units * price) + fees;

  const currentDetails = account.investment_details || { total_units: 0, avg_price: 0, market_price: price, symbol: account.name, currency: 'VND' };
  const nextWac = calculateNewWAC(currentDetails.total_units, currentDetails.avg_price, units, price, fees);

  const handleBuy = async () => {
    if (!formData.units || !formData.price || !formData.sourceAccountId) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const txRef = doc(collection(db, 'users', targetUid, 'transactions'));
      
      const newLog: InvestmentLog = {
        id: crypto.randomUUID(),
        date: formData.date,
        type: 'BUY',
        units,
        price,
        fees,
        note: `Mua thêm ${formData.units} ${account.name}`
      };

      // 1. Ghi nhận giao dịch hạch toán
      const txData = {
        id: txRef.id,
        amount: totalCost,
        date: formData.date,
        datetime: now,
        type: TransactionType.ASSET_BUY,
        debit_account_id: account.id,
        credit_account_id: formData.sourceAccountId,
        category: account.category,
        group: 'ASSETS',
        status: 'confirmed',
        asset_link_id: account.id,
        units, price, fees,
        createdAt: now,
        addedBy: auth.currentUser?.email
      };
      
      batch.set(txRef, txData as any);

      // 2. Cập nhật tài khoản đầu tư
      const prevTotalAssets = currentDetails.total_units * currentDetails.market_price; // Approximate previous value

      batch.update(doc(db, 'users', targetUid, 'accounts', account.id), {
        current_balance: (currentDetails.total_units + units) * (price || currentDetails.market_price),
        investment_details: {
          ...currentDetails,
          total_units: currentDetails.total_units + units,
          avg_price: nextWac,
          market_price: price || currentDetails.market_price,
          last_sync: now
        },
        investment_logs: [...(account.investment_logs || []), newLog]
      });

      // 3. Trích tiền từ ví
      batch.update(doc(db, 'users', targetUid, 'accounts', formData.sourceAccountId), {
        current_balance: increment(-totalCost)
      });

      await batch.commit();

      // Check Reaction (First Asset Check)
      checkAndTrigger(txData as any, { totalAssets: prevTotalAssets });

      setTimeout(() => {
         onClose();
      }, 1500);

    } catch (e: any) {
      alert("Lỗi mua tài sản: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePositiveInput = (key: string, val: string) => {
    if (val === '' || parseFloat(val) >= 0) {
      setFormData({ ...formData, [key]: val });
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                 <ShoppingCart size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-tight">Mua {account.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Strategy</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh] no-scrollbar">
           {/* Financial Context Card */}
           <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl -mr-16 -mt-16"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                 <div>
                    <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Tổng chi phí</p>
                    <h4 className="text-3xl font-black">{currencyFormatter.format(totalCost)}</h4>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Giá vốn dự kiến</p>
                    <p className="text-base font-black text-white">{currencyFormatter.format(nextWac)}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5 relative z-10">
                 <Target size={12} className="text-indigo-400" />
                 <p className="text-[10px] font-bold text-white/60 uppercase">Số lượng sau mua: <span className="text-white">{(currentDetails.total_units + units).toFixed(2)}</span></p>
              </div>
           </div>

           {/* Input Fields */}
           <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số lượng</label>
                 <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      value={formData.units} 
                      onChange={e => handlePositiveInput('units', e.target.value)} 
                      onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                      placeholder="0.00" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" 
                    />
                    <Layers size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                 </div>
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá mỗi đơn vị</label>
                 <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      value={formData.price} 
                      onChange={e => handlePositiveInput('price', e.target.value)} 
                      onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                      placeholder="0" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" 
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phí giao dịch</label>
                 <input 
                   type="number" 
                   min="0"
                   value={formData.fees} 
                   onChange={e => handlePositiveInput('fees', e.target.value)} 
                   onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                   placeholder="0" 
                   className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none shadow-inner" 
                 />
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày mua</label>
                 <div className="relative group">
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none shadow-inner appearance-none" />
                    <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trích từ ví / ngân hàng</label>
              <div className="relative group">
                 <select value={formData.sourceAccountId} onChange={e => setFormData({...formData, sourceAccountId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none appearance-none cursor-pointer">
                    {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>)}
                 </select>
                 <Wallet size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
           </div>

           <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
              <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-indigo-900 leading-relaxed uppercase">
                Tài khoản đầu tư được hạch toán theo phương pháp <strong>WAC (Bình quân gia quyền)</strong> để tối ưu lợi nhuận.
              </p>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
           <button 
            onClick={handleBuy}
            disabled={loading || !formData.units || !formData.price || !formData.sourceAccountId}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
           >
              {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <ArrowRight size={20} className="text-indigo-400" />}
              {loading ? "Đang ghi sổ..." : "Xác nhận Mua"}
           </button>
        </div>
      </div>
    </div>
  );
};

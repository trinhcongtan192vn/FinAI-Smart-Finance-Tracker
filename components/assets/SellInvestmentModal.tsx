
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, Wallet, TrendingUp, Info, Percent, Layers, DollarSign, Calendar } from 'lucide-react';
import { doc, collection, writeBatch, increment, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType, InvestmentLog } from '../../types';
import { currencyFormatter, calculateRealizedPnL, unitFormatter } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';

interface SellInvestmentModalProps {
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const SellInvestmentModal: React.FC<SellInvestmentModalProps> = ({ account, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  
  const [formData, setFormData] = useState({
    units: '',
    price: '',
    fees: '0',
    date: new Date().toISOString().split('T')[0],
    destAccountId: ''
  });

  const details = account.investment_details!;

  useEffect(() => {
    const fetchCash = async () => {
      const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setFormData(p => ({ ...p, destAccountId: accs[0].id }));
    };
    fetchCash();
    if (details) {
        setFormData(p => ({ ...p, price: details.market_price.toString() }));
    }
  }, [targetUid, details]);

  const units = Number(formData.units) || 0;
  const sellPrice = Number(formData.price) || 0;
  const fees = Number(formData.fees) || 0;
  const totalReceived = (units * sellPrice) - fees;

  const profit = calculateRealizedPnL(units, sellPrice, details.avg_price, fees);
  const isProfit = profit >= 0;

  const setShortcut = (pct: number) => {
     const val = (details.total_units * (pct / 100)).toFixed(6); // Hỗ trợ crypto
     setFormData({...formData, units: Number(val).toString()});
  };

  const handleSell = async () => {
    if (!formData.units || !formData.price || !formData.destAccountId) return;
    if (units > details.total_units) return alert("Số lượng bán vượt quá số lượng đang nắm giữ.");

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      const txRef = doc(transactionsRef);
      
      // 1. Xác định Equity Fund liên kết để ghi nhận lãi/lỗ
      let equityFundId = account.linked_fund_id;
      if (!equityFundId) {
          // Fallback: Tìm quỹ Equity đầu tiên nếu chưa link
          const fundQ = query(accountsRef, where('category', '==', 'Equity Fund'), where('status', '==', 'ACTIVE'));
          const fundSnap = await getDocs(fundQ);
          equityFundId = fundSnap.docs[0]?.id;
      }

      const newLog: InvestmentLog = {
        id: crypto.randomUUID(),
        date: formData.date,
        type: 'SELL',
        units,
        price: sellPrice,
        fees,
        note: `Bán chốt ${formData.units} ${account.name}`
      };

      // 2. Ghi nhận giao dịch Dòng tiền (ASSET_SELL)
      // Debit: Cash Wallet (Tăng tiền)
      // Credit: Investment Asset (Giảm giá trị tài sản)
      batch.set(txRef, {
        id: txRef.id,
        amount: totalReceived,
        date: formData.date,
        datetime: now,
        type: TransactionType.ASSET_SELL,
        debit_account_id: formData.destAccountId,
        credit_account_id: account.id,
        category: account.category,
        group: 'ASSETS',
        status: 'confirmed',
        asset_link_id: account.id,
        units, price: sellPrice, fees,
        note: `Bán ${formData.units} ${account.name} giá ${currencyFormatter.format(sellPrice)}`,
        createdAt: now,
        addedBy: auth.currentUser?.email
      });

      // 3. Ghi nhận Lãi/Lỗ vào Equity Fund (INTEREST_LOG / CAPITAL_ADJUSTMENT)
      if (equityFundId && Math.abs(profit) > 0) {
          const plTxRef = doc(transactionsRef);
          batch.set(plTxRef, {
              id: plTxRef.id,
              amount: Math.abs(profit),
              date: formData.date,
              datetime: now,
              // Nếu lãi: Tăng Equity (Credit Equity), Debit Asset (để cân đối phần chênh lệch giá vốn)
              // Nếu lỗ: Giảm Equity (Debit Equity), Credit Asset
              type: TransactionType.ASSET_REVALUATION, // Sử dụng loại này để biểu thị điều chỉnh giá trị vốn
              debit_account_id: isProfit ? account.id : equityFundId,
              credit_account_id: isProfit ? equityFundId : account.id,
              category: 'Capital Gain',
              group: isProfit ? 'INCOME' : 'EXPENSES',
              status: 'confirmed',
              asset_link_id: account.id,
              note: `Hạch toán ${isProfit ? 'Lãi' : 'Lỗ'} thực tế từ việc bán tài sản`,
              createdAt: now,
              addedBy: auth.currentUser?.email
          });

          // Cập nhật số dư Equity Fund
          batch.update(doc(accountsRef, equityFundId), {
             current_balance: increment(profit)
          });
      }

      // 4. Cập nhật tài khoản đầu tư (Giảm số dư theo giá thị trường còn lại, tăng realized_pnl)
      const remainingUnits = details.total_units - units;
      // Nếu bán hết, số dư về 0. Nếu còn, cập nhật theo giá thị trường mới nhất (giá bán)
      const newBalance = remainingUnits * sellPrice; 
      
      batch.update(doc(accountsRef, account.id), {
        current_balance: newBalance,
        realized_pnl: increment(profit),
        investment_details: {
          ...details,
          total_units: remainingUnits,
          market_price: sellPrice, // Cập nhật giá thị trường theo giá khớp lệnh gần nhất
          last_sync: now
        },
        investment_logs: [...(account.investment_logs || []), newLog]
      });

      // 5. Thu tiền về ví
      batch.update(doc(accountsRef, formData.destAccountId), {
        current_balance: increment(totalReceived)
      });

      await batch.commit();
      onClose();
    } catch (e: any) {
      alert("Lỗi bán tài sản: " + e.message);
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
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                 <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-tight">Bán {account.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exit Strategy</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh] no-scrollbar">
           {/* Exit Context Card */}
           <div className={`p-6 rounded-[2rem] shadow-lg relative overflow-hidden transition-colors ${isProfit ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                 <div>
                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Lãi / Lỗ dự tính</p>
                    <h4 className="text-3xl font-black">{isProfit ? '+' : ''}{currencyFormatter.format(profit)}</h4>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Tiền thu về</p>
                    <p className="text-base font-black text-white">{currencyFormatter.format(totalReceived)}</p>
                 </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/10 rounded-2xl border border-white/10 relative z-10">
                 <div className="flex items-center gap-2">
                    <Wallet size={12} className="text-white/60" />
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">ROI: {((profit / (units * details.avg_price || 1)) * 100).toFixed(1)}%</p>
                 </div>
                 <div className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black uppercase tracking-tighter">Realized P/L</div>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng muốn bán</label>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded">Tối đa: {unitFormatter.format(details.total_units)}</span>
                 </div>
                 <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      value={formData.units} 
                      onChange={e => handlePositiveInput('units', e.target.value)} 
                      onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                      placeholder="0.00" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-orange-50 transition-all shadow-inner" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                       <button onClick={() => setShortcut(50)} className="px-2 py-1 bg-white text-[9px] font-black text-slate-500 rounded-lg border shadow-sm active:scale-95 transition-all">50%</button>
                       <button onClick={() => setShortcut(100)} className="px-2 py-1 bg-white text-[9px] font-black text-slate-500 rounded-lg border shadow-sm active:scale-95 transition-all">MAX</button>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn giá bán</label>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.price} 
                      onChange={e => handlePositiveInput('price', e.target.value)} 
                      onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                      placeholder="0" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none shadow-inner" 
                    />
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phí & Thuế</label>
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
              </div>

              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nhận tiền tại ví</label>
                 <div className="relative group">
                    <select value={formData.destAccountId} onChange={e => setFormData({...formData, destAccountId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none appearance-none cursor-pointer">
                        {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>)}
                    </select>
                    <Wallet size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                 </div>
              </div>
           </div>

           <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
              <Info size={18} className="text-orange-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-orange-900 leading-relaxed uppercase">
                Lợi nhuận chốt lời/cắt lỗ sẽ tự động được kết chuyển sang <strong>{account.linked_fund_id ? 'quỹ đối ứng đã chọn' : 'Equity Fund mặc định'}</strong> để bảo toàn tính cân đối kế toán.
              </p>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
           <button 
            onClick={handleSell}
            disabled={loading || !formData.units || !formData.price || !formData.destAccountId}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
           >
              {loading ? <Loader2 size={24} className="animate-spin text-orange-400" /> : <DollarSign size={20} className="text-orange-400" />}
              {loading ? "Đang ghi sổ..." : "Xác nhận Bán"}
           </button>
        </div>
      </div>
    </div>
  );
};

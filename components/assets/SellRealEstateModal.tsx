
import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Loader2, Save, Wallet, Info, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { collection, doc, writeBatch, query, where, getDocs, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { currencyFormatter, percentFormatter } from '../../lib/utils';
import { Account, TransactionType } from '../../types';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { DateInput } from '../ui/DateInput';

interface SellRealEstateModalProps {
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const SellRealEstateModal: React.FC<SellRealEstateModalProps> = ({ account, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [sellingPrice, setSellingPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [destAccountId, setDestAccountId] = useState('');

  const details = account.real_estate_details!;

  useEffect(() => {
    const fetchCash = async () => {
      const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setDestAccountId(accs[0].id);
    };
    fetchCash();
    setSellingPrice(account.current_balance.toString());
    setNote(`Bán tất toán: ${account.name}`);
  }, [targetUid, account]);

  const stats = useMemo(() => {
    const price = Number(sellingPrice) || 0;
    const cost = details.total_investment;
    const profit = price - cost;
    const roi = cost > 0 ? (profit / cost) : 0;
    const isProfit = profit >= 0;
    return { price, cost, profit, roi, isProfit };
  }, [sellingPrice, details]);

  const handleSell = async () => {
    if (!sellingPrice || !destAccountId) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      
      const fundSnap = await getDocs(query(accountsRef, where('category', '==', 'Equity Fund')));
      const equityFundId = fundSnap.docs[0]?.id;

      // 1. Ghi nhận tiền về ví: Dr Cash Wallet / Cr Real Estate
      const txRef = doc(transactionsRef);
      batch.set(txRef, {
        id: txRef.id, amount: stats.price, date, datetime: now, note: note || 'Bán bất động sản',
        type: TransactionType.ASSET_SELL, debit_account_id: destAccountId, credit_account_id: account.id,
        category: 'Real Estate', group: 'ASSETS', status: 'confirmed', asset_link_id: account.id,
        createdAt: now, addedBy: auth.currentUser?.email
      });

      // 2. Kết chuyển Lãi/Lỗ sang Equity Fund
      if (equityFundId && stats.profit !== 0) {
        const profitTxRef = doc(transactionsRef);
        batch.set(profitTxRef, {
          id: profitTxRef.id, amount: Math.abs(stats.profit), date, datetime: now,
          note: `Lãi/Lỗ thực tế từ bán BĐS: ${account.name}`,
          type: TransactionType.INTEREST_LOG,
          debit_account_id: stats.isProfit ? destAccountId : equityFundId,
          credit_account_id: stats.isProfit ? equityFundId : destAccountId,
          category: 'Passive Income', group: stats.isProfit ? 'INCOME' : 'EXPENSES',
          status: 'confirmed', asset_link_id: account.id,
          createdAt: now, addedBy: auth.currentUser?.email
        });
        batch.update(doc(accountsRef, equityFundId), { current_balance: increment(stats.profit) });
      }

      // 3. Cập nhật Ví tiền
      batch.update(doc(accountsRef, destAccountId), { current_balance: increment(stats.price) });

      // 4. Đóng tài khoản BĐS
      batch.update(doc(accountsRef, account.id), {
        current_balance: 0,
        status: 'LIQUIDATED',
        realized_pnl: increment(stats.profit),
        updatedAt: now,
        investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'SELL', price: stats.price, note }]
      });

      await batch.commit();
      onClose();
    } catch (e: any) {
      alert("Lỗi tất toán: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-inner"><DollarSign size={24} /></div>
              <h3 className="font-black text-slate-900">Bán tất toán tài sản</h3>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh] no-scrollbar">
           {/* Performance Preview Card */}
           <div className={`p-6 rounded-[2rem] shadow-lg relative overflow-hidden transition-colors duration-500 ${stats.isProfit ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                 <div>
                    <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-1">Lãi / Lỗ chốt sổ</p>
                    <h4 className="text-3xl font-black">{stats.isProfit ? '+' : ''}{currencyFormatter.format(stats.profit)}</h4>
                 </div>
                 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    {stats.isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                 </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/10 rounded-2xl border border-white/10 relative z-10">
                 <p className="text-[10px] font-bold text-white/60 uppercase">Tỷ suất ROI thực tế: <span className="text-white">{percentFormatter.format(stats.roi)}</span></p>
                 <div className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black uppercase tracking-tighter">Realized</div>
              </div>
           </div>

           <AmountInput label="Giá bán thực tế" value={sellingPrice} onChange={setSellingPrice} autoFocus />

           <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Wallet size={12} /> Thu tiền về ví</label>
              <select value={destAccountId} onChange={e => setDestAccountId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none">
                 {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>)}
              </select>
           </div>

           <div className="grid grid-cols-1 gap-4">
             <DateInput label="Ngày bán" value={date} onChange={setDate} />
             <StandardInput label="Ghi chú" value={note} onChange={setNote} />
           </div>

           <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-amber-900 leading-relaxed uppercase">
                Hành động này sẽ <strong>đóng vĩnh viễn</strong> tài khoản BĐS này. Lợi nhuận sẽ được hạch toán vào quỹ đối ứng.
              </p>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
           <button onClick={handleSell} disabled={loading || !sellingPrice} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
              {loading ? <Loader2 size={24} className="animate-spin text-emerald-400" /> : <Save size={20} className="text-emerald-400" />}
              {loading ? "Đang tất toán..." : "Xác nhận bán tài sản"}
           </button>
        </div>
      </div>
    </div>
  );
};

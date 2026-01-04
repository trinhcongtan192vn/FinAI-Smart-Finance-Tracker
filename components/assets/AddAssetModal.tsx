
import React, { useState, useEffect, useMemo } from 'react';
import { X, Activity, Loader2, Save, Plus, ChevronDown, Target, Wallet, Info } from 'lucide-react';
import { collection, getDocs, query, where, writeBatch, doc, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType } from '../../types';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { DateInput } from '../ui/DateInput';
import { InvestmentInputs } from './forms/InvestmentInputs';

export const AddAssetModal: React.FC<{ onClose: () => void; targetUid: string }> = ({ onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [capitalAccounts, setCapitalAccounts] = useState<Account[]>([]);
  const [isInitialBalance, setIsInitialBalance] = useState(false);
  const [useNewFund, setUseNewFund] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [newFundName, setNewFundName] = useState('');
  const [formData, setFormData] = useState({ name: '', category: 'Stocks', initial_balance: '', interest_rate: '0', creditor_debtor_name: '', sourceAccountId: '', units: '', price: '', fees: '0', date: new Date().toISOString().split('T')[0] });

  const isInvestment = ['Stocks', 'Crypto', 'Gold'].includes(formData.category);
  const calculatedTotal = useMemo(() => isInvestment ? (Number(formData.units) * Number(formData.price)) + Number(formData.fees) : Number(formData.initial_balance), [isInvestment, formData]);

  useEffect(() => {
    const fetch = async () => {
        const [cSnap, aSnap, pSnap] = await Promise.all([
            getDocs(query(collection(db, 'users', targetUid, 'categories'), where('group', '==', 'ASSETS'))),
            getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'))),
            getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('group', '==', 'CAPITAL'), where('status', '==', 'ACTIVE')))
        ]);
        setCategories(cSnap.docs.map(d => d.data().name));
        const cashAccs = aSnap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        setCashAccounts(cashAccs);
        if (cashAccs.length > 0) setFormData(p => ({ ...p, sourceAccountId: cashAccs[0].id }));
        const caps = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        setCapitalAccounts(caps);
        const def = caps.find(c => c.category === 'Equity Fund');
        if (def) setSelectedFundId(def.id);
    };
    fetch();
  }, [targetUid]);

  const handleSave = async () => {
    if (!formData.name || (isInvestment && (!formData.units || !formData.price)) || (!isInvestment && !formData.initial_balance)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const amt = calculatedTotal;
      const now = new Date().toISOString();
      let creditId = isInitialBalance ? (useNewFund ? '' : selectedFundId) : '';

      if (isInitialBalance && useNewFund) {
          const nRef = doc(collection(db, 'users', targetUid, 'accounts'));
          creditId = nRef.id;
          batch.set(nRef, { id: nRef.id, name: newFundName.trim(), group: 'CAPITAL', category: 'Equity Fund', current_balance: amt, status: 'ACTIVE', createdAt: now });
      } else if (isInitialBalance) {
          batch.update(doc(db, 'users', targetUid, 'accounts', creditId), { current_balance: increment(amt) });
      }

      const aRef = doc(collection(db, 'users', targetUid, 'accounts'));
      const units = Number(formData.units) || 0;
      batch.set(aRef, { id: aRef.id, name: formData.name, group: 'ASSETS', category: formData.category, current_balance: amt, status: 'ACTIVE', createdAt: now, linked_fund_id: creditId || null, investment_details: isInvestment ? { symbol: formData.name, total_units: units, avg_price: amt / units, market_price: Number(formData.price), last_sync: now } : undefined, investment_logs: [{ id: crypto.randomUUID(), date: formData.date, type: 'BUY', price: Number(formData.price || amt), units, note: 'Initial' }] });

      const tRef = doc(collection(db, 'users', targetUid, 'transactions'));
      batch.set(tRef, { id: tRef.id, amount: amt, date: formData.date, datetime: now, category: formData.category, group: 'ASSETS', status: 'confirmed', asset_link_id: aRef.id, type: isInitialBalance ? TransactionType.INITIAL_BALANCE : TransactionType.ASSET_INVESTMENT, debit_account_id: aRef.id, credit_account_id: isInitialBalance ? creditId : formData.sourceAccountId });
      if (!isInitialBalance) batch.update(doc(db, 'users', targetUid, 'accounts', formData.sourceAccountId), { current_balance: increment(-amt) });

      await batch.commit(); onClose();
    } catch (e) { alert("Error saving asset"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-6 pb-2 flex items-center justify-between border-b"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner"><Activity size={32} /></div><div><h3 className="text-xl font-black text-slate-900">Thêm Tài sản</h3><p className="text-sm font-medium text-slate-400">Vàng, Chứng khoán, Crypto...</p></div></div><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {isInvestment ? <InvestmentInputs units={formData.units} price={formData.price} fees={formData.fees} date={formData.date} onInputChange={(k, v) => setFormData(p => ({...p, [k]:v}))} calculatedTotal={calculatedTotal} /> : <><AmountInput label="Giá trị (VND)" value={formData.initial_balance} onChange={v => setFormData(p => ({...p, initial_balance: v}))} autoFocus /><DateInput label="Ngày ghi nhận" value={formData.date} onChange={v => setFormData(p => ({...p, date: v}))} /></>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><StandardInput label="Tên tài sản" value={formData.name} onChange={v => setFormData(p => ({...p, name: v}))} /><div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loại</label><select value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold appearance-none">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
          <div className="flex p-1 bg-slate-100 rounded-xl"><button onClick={() => setIsInitialBalance(false)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${!isInitialBalance ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Mua mới</button><button onClick={() => setIsInitialBalance(true)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${isInitialBalance ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Ghi gốc</button></div>
          {isInitialBalance ? <div className="space-y-2"><div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={12} /> Nguồn vốn đối ứng</label><button onClick={() => setUseNewFund(!useNewFund)} className="text-[9px] font-bold text-indigo-600 uppercase underline">{useNewFund ? 'Chọn' : 'Mới'}</button></div>{useNewFund ? <input type="text" value={newFundName} onChange={e => setNewFundName(e.target.value)} placeholder="Tên quỹ mới" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" /> : <select value={selectedFundId} onChange={e => setSelectedFundId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black">{capitalAccounts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>}</div> : <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Wallet size={12} /> Thanh toán từ</label><select value={formData.sourceAccountId} onChange={e => setFormData(p => ({...p, sourceAccountId: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black">{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3"><Info size={20} className="text-indigo-600 shrink-0" /><p className="text-[11px] font-medium text-indigo-900 leading-relaxed uppercase">{isInitialBalance ? "Ghi nhận tài sản và tăng vốn chủ sở hữu." : "Trừ tiền từ Ví thanh toán để chuyển sang Tài sản mới."}</p></div>
        </div>
        <div className="p-6 bg-slate-50 border-t"><button onClick={handleSave} disabled={loading} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3">{loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={20} />} Lưu Tài sản</button></div>
      </div>
    </div>
  );
};

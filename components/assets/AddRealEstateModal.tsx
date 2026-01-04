
import React, { useState, useEffect, useMemo } from 'react';
import { X, Home, MapPin, Maximize, Loader2, Save, Info } from 'lucide-react';
import { collection, doc, writeBatch, query, where, getDocs, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { currencyFormatter } from '../../lib/utils';
import { Account, TransactionType } from '../../types';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { DateInput } from '../ui/DateInput';
import { RECapitalStructureForm } from './forms/RECapitalStructureForm';

export const AddRealEstateModal: React.FC<{ onClose: () => void; targetUid: string }> = ({ onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [equityFunds, setEquityFunds] = useState<Account[]>([]);
  const [liabilities, setLiabilities] = useState<Account[]>([]);
  const [useNewFund, setUseNewFund] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [newFundName, setNewFundName] = useState('');
  const [useDebt, setUseDebt] = useState(false);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [formData, setFormData] = useState({ name: '', address: '', area: '', purchasePrice: '', date: new Date().toISOString().split('T')[0], sourceAccountId: '', isInitialBalance: false });

  useEffect(() => {
    const fetch = async () => {
      const [cSnap, fSnap, lSnap] = await Promise.all([getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'))), getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Equity Fund'), where('status', '==', 'ACTIVE'))), getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Liability'), where('status', '==', 'ACTIVE')))]);
      setCashAccounts(cSnap.docs.map(d => d.data() as any)); setEquityFunds(fSnap.docs.map(d => d.data() as any)); setLiabilities(lSnap.docs.map(d => d.data() as any));
      if (!cSnap.empty) setFormData(p => ({ ...p, sourceAccountId: cSnap.docs[0].id }));
      if (!fSnap.empty) setSelectedFundId(fSnap.docs[0].id);
      if (!lSnap.empty) setSelectedLiabilityId(lSnap.docs[0].id);
    };
    fetch();
  }, [targetUid]);

  const price = Number(formData.purchasePrice) || 0;
  const debtVal = useDebt ? (Number(debtAmount) || 0) : 0;
  const equityVal = Math.max(0, price - debtVal);

  const handleSave = async () => {
    if (!formData.name || !formData.purchasePrice || (useDebt && !selectedLiabilityId)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      let creditId = formData.isInitialBalance ? (useNewFund ? '' : selectedFundId) : '';
      if (formData.isInitialBalance && useNewFund) {
          const nF = doc(collection(db, 'users', targetUid, 'accounts')); creditId = nF.id;
          batch.set(nF, { id: nF.id, name: newFundName.trim(), group: 'CAPITAL', category: 'Equity Fund', current_balance: equityVal, status: 'ACTIVE', createdAt: now });
      } else if (formData.isInitialBalance) { batch.update(doc(db, 'users', targetUid, 'accounts', creditId), { current_balance: increment(equityVal) }); }

      const reRef = doc(collection(db, 'users', targetUid, 'accounts'));
      batch.set(reRef, { id: reRef.id, name: formData.name, group: 'ASSETS', category: 'Real Estate', current_balance: price, status: 'ACTIVE', createdAt: now, linked_fund_id: creditId || null, equity_amount: equityVal, liability_amount: debtVal, linked_liability_id: useDebt ? selectedLiabilityId : null, real_estate_details: { ...formData, total_investment: price, valuation_history: [{ date: formData.date, price }] }, investment_logs: [{ id: crypto.randomUUID(), date: formData.date, type: 'BUY', price, note: 'Initial' }] });

      if (equityVal > 0) {
        const tx = doc(collection(db, 'users', targetUid, 'transactions'));
        batch.set(tx, { id: tx.id, amount: equityVal, date: formData.date, datetime: now, type: formData.isInitialBalance ? TransactionType.INITIAL_BALANCE : TransactionType.ASSET_INVESTMENT, debit_account_id: reRef.id, credit_account_id: formData.isInitialBalance ? creditId : formData.sourceAccountId, category: 'Real Estate', group: 'ASSETS', status: 'confirmed', asset_link_id: reRef.id });
        if (!formData.isInitialBalance) batch.update(doc(db, 'users', targetUid, 'accounts', formData.sourceAccountId), { current_balance: increment(-equityVal) });
      }
      if (useDebt && debtVal > 0) {
        const dTx = doc(collection(db, 'users', targetUid, 'transactions'));
        batch.set(dTx, { id: dTx.id, amount: debtVal, date: formData.date, datetime: now, type: TransactionType.BORROWING, debit_account_id: reRef.id, credit_account_id: selectedLiabilityId, category: 'Real Estate', group: 'ASSETS', status: 'confirmed', asset_link_id: reRef.id });
        batch.update(doc(db, 'users', targetUid, 'accounts', selectedLiabilityId), { current_balance: increment(debtVal), 'liability_details.principal_amount': increment(debtVal) });
      }
      await batch.commit(); onClose();
    } catch (e) { alert("Error saving RE"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom">
        <div className="p-6 pb-2 border-b flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><Home size={32} /></div><div><h3 className="text-xl font-black text-slate-900">Thêm Bất động sản</h3><p className="text-sm font-medium text-slate-400">Khởi tạo nhà đất</p></div></div><button onClick={onClose} className="p-3 text-slate-400"><X size={24} /></button></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <AmountInput label="Giá mua (VND)" value={formData.purchasePrice} onChange={v => setFormData({...formData, purchasePrice: v})} autoFocus />
          <StandardInput label="Tên tài sản" value={formData.name} onChange={v => setFormData({...formData, name: v})} /><div className="grid grid-cols-2 gap-4"><StandardInput label="Địa chỉ" value={formData.address} onChange={v => setFormData({...formData, address: v})} icon={MapPin}/><StandardInput label="Diện tích" value={formData.area} onChange={v => setFormData({...formData, area: v})} icon={Maximize}/></div>
          <div className="grid grid-cols-2 gap-4"><DateInput label="Ngày mua" value={formData.date} onChange={v => setFormData({...formData, date: v})} /><div className="flex p-1 bg-slate-100 rounded-xl"><button onClick={() => setFormData({...formData, isInitialBalance: false})} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg ${!formData.isInitialBalance ? 'bg-white text-emerald-600 shadow-sm' : ''}`}>Mua mới</button><button onClick={() => setFormData({...formData, isInitialBalance: true})} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg ${formData.isInitialBalance ? 'bg-white text-indigo-600 shadow-sm' : ''}`}>Ghi gốc</button></div></div>
          <RECapitalStructureForm formData={formData} useDebt={useDebt} setUseDebt={setUseDebt} debtAmount={debtAmount} setDebtAmount={setDebtAmount} equityVal={equityVal} price={price} useNewFund={useNewFund} setUseNewFund={setUseNewFund} newFundName={newFundName} setNewFundName={setNewFundName} selectedFundId={selectedFundId} setSelectedFundId={setSelectedFundId} equityFunds={equityFunds} liabilities={liabilities} selectedLiabilityId={selectedLiabilityId} setSelectedLiabilityId={setSelectedLiabilityId} cashAccounts={cashAccounts} onInputChange={(k,v)=>setFormData(p=>({...p,[k]:v}))} />
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3"><Info size={20} className="text-indigo-600 shrink-0" /><div className="text-[11px] font-medium text-indigo-900 leading-relaxed uppercase">{price ? `Tổng ${currencyFormatter.format(price)}. Gồm ${currencyFormatter.format(equityVal)} vốn tự có.` : "Nhập giá mua để tính cấu trúc vốn."}</div></div>
        </div>
        <div className="p-6 bg-slate-50 border-t"><button onClick={handleSave} disabled={loading} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl">{loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={20} />} Lưu BĐS</button></div>
      </div>
    </div>
  );
};

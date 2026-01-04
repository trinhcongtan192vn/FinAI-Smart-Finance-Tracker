
import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRightLeft, Loader2, Save, Users, UserPlus, Target, Wallet, Plus, ChevronDown, Info } from 'lucide-react';
import { collection, doc, writeBatch, query, where, getDocs, increment, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { currencyFormatter, generateFutureEvents } from '../../lib/utils';
import { Account, TransactionType, FinancialContact } from '../../types';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { ContactForm } from '../contacts/ContactForm';
import { LendingDetailsForm } from './forms/LendingDetailsForm';

export const AddLendingModal: React.FC<{ onClose: () => void; targetUid: string }> = ({ onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<FinancialContact[]>([]);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [equityFunds, setEquityFunds] = useState<Account[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isInitialBalance, setIsInitialBalance] = useState(false);
  const [useNewFund, setUseNewFund] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [newFundName, setNewFundName] = useState('');
  const [formData, setFormData] = useState({ 
    name: '', 
    borrowerId: '', 
    amount: '', 
    rate: '1.5', 
    interestPeriod: 'MONTHLY' as any, 
    interestType: 'SIMPLE' as any, 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: '', 
    interestCycle: 'MONTHLY' as any, 
    sourceAccountId: '' 
  });

  useEffect(() => {
    onSnapshot(query(collection(db, 'users', targetUid, 'contacts'), orderBy('name', 'asc')), (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() } as any))));
    const fetch = async () => {
      const [cSnap, eSnap] = await Promise.all([getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'))), getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Equity Fund'), where('status', '==', 'ACTIVE')))]);
      const accs = cSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setCashAccounts(accs); if (accs.length > 0) setFormData(p => ({ ...p, sourceAccountId: accs[0].id }));
      const funds = eSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setEquityFunds(funds); if (funds.length > 0) setSelectedFundId(funds[0].id);
    };
    fetch();
  }, [targetUid]);

  const selectedContact = useMemo(() => contacts.find(c => c.id === formData.borrowerId), [contacts, formData.borrowerId]);

  const handleSave = async () => {
    if (!formData.borrowerId || !formData.amount) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const amount = Number(formData.amount);
      const now = new Date().toISOString();
      let creditId = isInitialBalance ? (useNewFund ? '' : selectedFundId) : formData.sourceAccountId;

      if (isInitialBalance && useNewFund) {
          const nF = doc(collection(db, 'users', targetUid, 'accounts'));
          creditId = nF.id;
          batch.set(nF, { id: nF.id, name: newFundName.trim(), group: 'CAPITAL', category: 'Equity Fund', current_balance: amount, status: 'ACTIVE', createdAt: now });
      } else if (isInitialBalance) { batch.update(doc(db, 'users', targetUid, 'accounts', creditId), { current_balance: increment(amount) }); }

      // Estimate term for scheduling
      let termMonths = 12; // Default if no end date
      if (formData.endDate && formData.startDate) {
          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          termMonths = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      }

      // Generate Scheduled Events
      // For lending, usually interest is INFLOW
      const scheduledEvents = generateFutureEvents(
        amount,
        Number(formData.rate) * (formData.interestPeriod === 'MONTHLY' ? 12 : 1), // Convert to yearly rate for helper
        formData.startDate,
        termMonths,
        formData.interestCycle, 
        'INFLOW',
        `Thu lãi vay: ${selectedContact?.name}`
      );

      const lRef = doc(collection(db, 'users', targetUid, 'accounts'));
      batch.set(lRef, { 
          id: lRef.id, 
          name: formData.name || `Cho ${selectedContact?.name} vay`, 
          group: 'ASSETS', 
          category: 'Receivables', 
          current_balance: amount, 
          status: 'ACTIVE', 
          createdAt: now, 
          lending_details: { ...formData, principal_amount: amount, borrower_name: selectedContact?.name },
          scheduled_events: scheduledEvents
      });

      const tRef = doc(collection(db, 'users', targetUid, 'transactions'));
      batch.set(tRef, { id: tRef.id, amount, date: formData.startDate, datetime: now, type: isInitialBalance ? TransactionType.INITIAL_BALANCE : TransactionType.LENDING, debit_account_id: lRef.id, credit_account_id: creditId, category: 'Receivables', group: 'ASSETS', status: 'confirmed', asset_link_id: lRef.id });
      if (!isInitialBalance) batch.update(doc(db, 'users', targetUid, 'accounts', formData.sourceAccountId), { current_balance: increment(-amount) });
      batch.update(doc(db, 'users', targetUid, 'contacts', formData.borrowerId), { total_receivable: increment(amount), updatedAt: now });
      await batch.commit(); onClose();
    } catch (e) { alert("Lỗi ghi sổ"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="p-6 pb-2 border-b flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner"><ArrowRightLeft size={32} /></div><div><h3 className="text-xl font-black text-slate-900">Mở khoản cho vay</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Thiết lập khoản phải thu</p></div></div><button onClick={onClose} className="p-3 text-slate-400"><X size={24} /></button></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-10">
          <div className="space-y-3"><div className="flex items-center justify-between"><label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Users size={12} /> Đối tượng vay</label><button onClick={() => setShowContactForm(true)} className="text-[9px] font-black text-indigo-600 uppercase">Thêm mới</button></div><div className="flex gap-2 overflow-x-auto pb-2">{contacts.map(c => (<button key={c.id} onClick={() => setFormData({...formData, borrowerId: c.id})} className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${formData.borrowerId === c.id ? 'border-purple-500 bg-purple-50 shadow-md' : 'bg-slate-50'}`}><div className="w-10 h-10 rounded-xl bg-white border overflow-hidden flex items-center justify-center">{c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <Users size={16} />}</div><span className="text-[10px] font-black truncate w-16 text-center">{c.name}</span></button>))}</div></div>
          <AmountInput label="Số tiền cho vay (Gốc)" value={formData.amount} onChange={(v) => setFormData({...formData, amount: v})} autoFocus />
          <StandardInput label="Tên khoản vay / Hợp đồng" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} /><div className="flex p-1 bg-slate-100 rounded-xl"><button onClick={() => setIsInitialBalance(false)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg ${!isInitialBalance ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Cho vay mới</button><button onClick={() => setIsInitialBalance(true)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg ${isInitialBalance ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Ghi gốc</button></div>
          <LendingDetailsForm formData={formData} onInputChange={(k,v)=>setFormData(p=>({...p,[k]:v}))} handleRateChange={e=>setFormData({...formData, rate: e.target.value})} />
          {isInitialBalance ? <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Target size={12} /> Nguồn vốn đối ứng</label><select value={selectedFundId} onChange={e => setSelectedFundId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black outline-none">{equityFunds.map(f => <option key={f.id} value={f.id}>{f.name} ({currencyFormatter.format(f.current_balance)})</option>)}</select></div> : <div className="flex flex-col gap-2"><label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Wallet size={12} /> Trích tiền từ</label><select value={formData.sourceAccountId} onChange={e => setFormData({...formData, sourceAccountId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black">{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3"><Info size={20} className="text-indigo-600 shrink-0" /><p className="text-[10px] font-medium uppercase">{isInitialBalance ? "Ghi nhận tài sản và tăng vốn chủ sở hữu." : "Hạch toán: Nợ Khoản phải thu / Có Ví tiền mặt."}</p></div>
        </div>
        <div className="p-6 bg-slate-50 border-t"><button onClick={handleSave} disabled={loading} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3">{loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={20} />} Xác nhận & Lưu</button></div>
      </div>
      {showContactForm && <ContactForm targetUid={targetUid} onClose={() => setShowContactForm(false)} />}
    </div>
  );
};

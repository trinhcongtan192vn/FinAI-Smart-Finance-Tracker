
import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, History, Database, Wallet, Calendar, ShieldCheck, Target, Pencil, Check } from 'lucide-react';
import { doc, updateDoc, collection, increment, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType } from '../../types';
import { LedgerTraceability } from '../assets/LedgerTraceability';
import { currencyFormatter } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { DateInput } from '../ui/DateInput';
import { LiabilityCockpit } from './liability/LiabilityCockpit';
import { SettleLiabilityForm } from './liability/SettleLiabilityForm';

type LiabilityOp = 'REPAY' | 'BORROW_MORE' | 'EXTEND' | 'SETTLE' | 'HISTORY' | 'COCKPIT';

interface LiabilityActionModalProps {
  account: Account;
  onClose: () => void;
  targetUid: string;
  startWithHistory?: boolean;
  permission?: 'view' | 'edit' | 'owner';
}

export const LiabilityActionModal: React.FC<LiabilityActionModalProps> = ({ 
  account, onClose, targetUid, startWithHistory = false, permission = 'owner'
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<LiabilityOp>(startWithHistory ? 'HISTORY' : 'COCKPIT');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [repayType, setRepayType] = useState<'PRINCIPAL' | 'INTEREST'>('PRINCIPAL');
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [selectedCashId, setSelectedCashId] = useState('');
  const [manualFee, setManualFee] = useState<string>('0');
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRate, setNewRate] = useState(account.liability_details?.interest_rate?.toString() || '0');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(account.name);
  const [isSavingName, setIsSavingName] = useState(false);

  const details = account.liability_details;

  useEffect(() => {
    const fetchCash = async () => {
      const q = query(collection(db, 'users', targetUid, 'accounts'), 
        where('group', '==', 'ASSETS'), 
        where('category', '==', 'Cash')
      );
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setSelectedCashId(accs[0].id);
    };
    fetchCash();
  }, [targetUid]);

  const debtStats = useMemo(() => {
    if (!details) return { progress: 0, paidAmount: 0, original: 0 };
    const firstLog = account.investment_logs?.find(l => l.type === 'BUY');
    const original = firstLog?.price || details.principal_amount;
    const paidAmount = Math.max(0, original - details.principal_amount);
    const progress = original > 0 ? (paidAmount / original) * 100 : 0;
    return { progress, paidAmount, original };
  }, [account, details]);

  const settlementInfo = useMemo(() => {
    if (!details) return { principal: 0, interest: 0, fee: 0, total: 0 };
    const principal = details.principal_amount || 0;
    const interest = account.accrued_interest || 0;
    const fee = Number(manualFee) || 0;
    return { principal, interest, fee, total: principal + interest + fee };
  }, [account, details, manualFee]);

  const handleUpdateRate = async () => {
    if (!details || permission === 'view') return;
    try {
        await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), {
            'liability_details.interest_rate': Number(newRate),
            interest_rate: Number(newRate)
        });
        setIsEditingRate(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === account.name || permission === 'view') {
        setIsEditingName(false); setNewName(account.name); return;
    }
    setIsSavingName(true);
    try {
        await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), { name: newName.trim() });
        setIsEditingName(false);
    } catch (e: any) { alert(e.message); } finally { setIsSavingName(false); }
  };

  const handleApply = async () => {
    if (activeTab !== 'SETTLE' && activeTab !== 'EXTEND' && (!amount || Number(amount) <= 0)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const val = Number(amount);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      const fundSnap = await getDocs(query(accountsRef, where('category', '==', 'Equity Fund')));
      const equityFundId = fundSnap.docs[0]?.id;
      const txRef = doc(transactionsRef);
      const commonTxData = { id: txRef.id, date, datetime: now, group: 'CAPITAL', status: 'confirmed', asset_link_id: account.id, createdAt: now, addedBy: auth.currentUser?.email };

      if (activeTab === 'REPAY') {
        if (repayType === 'PRINCIPAL') {
            batch.set(txRef, { ...commonTxData, amount: val, note: note || `Trả gốc: ${account.name}`, type: TransactionType.DEBT_REPAYMENT, debit_account_id: account.id, credit_account_id: selectedCashId, category: 'Liability' });
            batch.update(doc(accountsRef, account.id), { current_balance: increment(-val), 'liability_details.principal_amount': increment(-val), investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'REPAYMENT', price: val, note: 'Trả gốc' }] });
        } else {
            batch.set(txRef, { ...commonTxData, amount: val, note: note || `Trả lãi: ${account.name}`, type: TransactionType.INTEREST_LOG, debit_account_id: equityFundId || account.id, credit_account_id: selectedCashId, category: 'Financial Expense', group: 'EXPENSES' });
            if (equityFundId) batch.update(doc(accountsRef, equityFundId), { current_balance: increment(-val) });
        }
        batch.update(doc(accountsRef, selectedCashId), { current_balance: increment(-val) });
      } else if (activeTab === 'BORROW_MORE') {
        batch.set(txRef, { ...commonTxData, amount: val, note: note || `Vay thêm: ${account.name}`, type: TransactionType.BORROWING, debit_account_id: selectedCashId, credit_account_id: account.id, category: 'Liability' });
        batch.update(doc(accountsRef, account.id), { current_balance: increment(val), 'liability_details.principal_amount': increment(val), investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'BORROW_MORE', price: val, note }] });
        batch.update(doc(accountsRef, selectedCashId), { current_balance: increment(val) });
      } else if (activeTab === 'EXTEND') {
        batch.update(doc(accountsRef, account.id), { 'liability_details.end_date': date, investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'CONTRACT_ADJUSTMENT', price: 0, note: note || `Gia hạn đến ${date}` }] });
      } else if (activeTab === 'SETTLE') {
        if (settlementInfo.fee > 0 && equityFundId) {
           const fTx = doc(transactionsRef);
           batch.set(fTx, { ...commonTxData, id: fTx.id, amount: settlementInfo.fee, note: `Phí tất toán: ${account.name}`, type: TransactionType.INTEREST_LOG, debit_account_id: equityFundId, credit_account_id: account.id, category: 'Financial Expense' });
           batch.update(doc(accountsRef, equityFundId), { current_balance: increment(-settlementInfo.fee) });
        }
        batch.set(txRef, { ...commonTxData, amount: settlementInfo.total, note: note || `Tất toán toàn bộ: ${account.name}`, type: TransactionType.DEBT_REPAYMENT, debit_account_id: account.id, credit_account_id: selectedCashId, category: 'Liability' });
        batch.update(doc(accountsRef, account.id), { current_balance: 0, status: 'CLOSED', 'liability_details.principal_amount': 0, investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'REPAYMENT', price: settlementInfo.total, note: 'Tất toán' }] });
        batch.update(doc(accountsRef, selectedCashId), { current_balance: increment(-settlementInfo.total) });
      }
      await batch.commit(); onClose();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 outline-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90dvh]">
        <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-50 shrink-0 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner shrink-0"><Database size={24} /></div>
            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-1">
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-50 border border-orange-200 rounded-lg px-2 py-1 text-xl font-black text-slate-900 outline-none min-w-0" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRename()} />
                    <button onClick={handleRename} disabled={isSavingName} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><Check size={16} /></button>
                    <button onClick={() => { setIsEditingName(false); setNewName(account.name); }} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg shrink-0"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group mb-1">
                    <h3 className="text-xl font-black text-slate-900 truncate tracking-tight">{account.name}</h3>
                    {permission !== 'view' && <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 transition-all rounded-md hover:bg-slate-50"><Pencil size={14} /></button>}
                </div>
              )}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Loan Management Hub</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 shrink-0"><X size={24} /></button>
        </div>

        <div className="px-6 pt-4 bg-slate-50/50 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-slate-100 min-w-max">
                {[
                  { id: 'COCKPIT', label: 'Báo cáo', icon: Target },
                  { id: 'REPAY', label: 'Trả nợ', icon: Wallet },
                  { id: 'BORROW_MORE', label: 'Vay thêm', icon: Calendar },
                  { id: 'EXTEND', label: 'Gia hạn', icon: Calendar },
                  { id: 'SETTLE', label: 'Tất toán', icon: ShieldCheck },
                  { id: 'HISTORY', label: 'Sổ cái', icon: History }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2.5 flex flex-col items-center gap-1 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>
                      <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {activeTab === 'HISTORY' ? <LedgerTraceability accountId={account.id} targetUid={targetUid} /> : 
           activeTab === 'COCKPIT' ? <LiabilityCockpit account={account} details={details} debtStats={debtStats} isEditingRate={isEditingRate} setIsEditingRate={setIsEditingRate} newRate={newRate} setNewRate={setNewRate} handleUpdateRate={handleUpdateRate} onRepay={(it) => { setActiveTab('REPAY'); setAmount(it.principal.toString()); setDate(it.fullDate); }} /> : 
           activeTab === 'SETTLE' ? <SettleLiabilityForm settlementInfo={settlementInfo} manualFee={manualFee} setManualFee={setManualFee} selectedCashId={selectedCashId} setSelectedCashId={setSelectedCashId} cashAccounts={cashAccounts} accountName={account.name} /> : 
           <div className="space-y-8 animate-in fade-in duration-300 pb-20">
               {activeTab === 'EXTEND' ? (
                  <div className="space-y-6">
                     <DateInput label="Ngày hết hạn mới" value={date} onChange={setDate} />
                     <StandardInput label="Ghi chú thay đổi" value={note} onChange={setNote} placeholder="Gia hạn thêm do..." />
                  </div>
               ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gốc hiện tại</p><p className="text-sm font-black text-slate-900">{currencyFormatter.format(details?.principal_amount || 0)}</p></div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center"><p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Lãi lũy kế</p><p className="text-sm font-black text-orange-600">{currencyFormatter.format(account.accrued_interest || 0)}</p></div>
                    </div>
                    {activeTab === 'REPAY' && (
                        <div className="space-y-4">
                            <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button onClick={() => setRepayType('PRINCIPAL')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${repayType === 'PRINCIPAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Trả gốc</button>
                            <button onClick={() => setRepayType('INTEREST')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${repayType === 'INTEREST' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Trả lãi</button>
                            </div>
                            <select value={selectedCashId} onChange={e => setSelectedCashId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black outline-none appearance-none">
                                {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>)}
                            </select>
                        </div>
                    )}
                    <AmountInput label={activeTab === 'REPAY' ? "Số tiền trả" : "Số tiền vay thêm"} value={amount} onChange={setAmount} autoFocus />
                    <div className="grid grid-cols-2 gap-4"><DateInput label="Ngày thực hiện" value={date} onChange={setDate} /><StandardInput label="Ghi chú" value={note} onChange={setNote} /></div>
                  </div>
               )}
            </div>}
        </div>

        {activeTab !== 'COCKPIT' && activeTab !== 'HISTORY' && (
          <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-slate-50 border-t shrink-0 z-20">
            <button onClick={handleApply} disabled={loading} className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-slate-200">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />} {activeTab === 'REPAY' ? "Trả nợ" : activeTab === 'BORROW_MORE' ? "Vay thêm" : activeTab === 'EXTEND' ? "Gia hạn" : "Tất toán"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

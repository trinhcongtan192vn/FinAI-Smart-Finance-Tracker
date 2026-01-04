
import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, Calendar, Wallet, CheckCircle2, AlertTriangle, History, ArrowRightLeft, Loader2, DollarSign, Pencil, Save, Trash2, Undo2, BadgePercent } from 'lucide-react';
import { Account, TransactionType } from '../../types';
import { currencyFormatter, calculateFinancialStats } from '../../lib/utils';
import { getCreditCardStatus } from '../../lib/creditUtils';
import { AmountInput } from '../ui/AmountInput';
import { collection, query, where, getDocs, doc, writeBatch, increment, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { LedgerTraceability } from '../assets/LedgerTraceability';
import { StandardInput } from '../ui/StandardInput';
import { useTranslation } from 'react-i18next';

interface CreditCardDetailModalProps {
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const CreditCardDetailModal: React.FC<CreditCardDetailModalProps> = ({ account, onClose, targetUid }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HISTORY'>('OVERVIEW');
  const [showRepay, setShowRepay] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Repay State
  const [repayAmount, setRepayAmount] = useState('');
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [selectedCashId, setSelectedCashId] = useState('');
  
  // Edit State
  const [editForm, setEditForm] = useState({
      name: account.name,
      bankName: account.credit_card_details?.bank_name || '',
      limit: account.credit_card_details?.credit_limit.toString() || '0',
      statementDay: account.credit_card_details?.statement_day.toString() || '1',
      dueDay: account.credit_card_details?.due_day.toString() || '1',
      lastDigits: account.credit_card_details?.card_last_digits || ''
  });

  const [loading, setLoading] = useState(false);

  const details = account.credit_card_details;
  const status = useMemo(() => details ? getCreditCardStatus(account.current_balance, details) : null, [account, details]);

  useEffect(() => {
    if (showRepay) {
        setRepayAmount(account.current_balance.toString());
        const fetchCash = async () => {
            const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'), where('group', '==', 'ASSETS'));
            const snap = await getDocs(q);
            const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
            setCashAccounts(accs);
            if (accs.length > 0) setSelectedCashId(accs[0].id);
        };
        fetchCash();
    }
  }, [showRepay, account.current_balance, targetUid]);

  // Sync edit form when account updates
  useEffect(() => {
      if (!isEditing) {
          setEditForm({
            name: account.name,
            bankName: account.credit_card_details?.bank_name || '',
            limit: account.credit_card_details?.credit_limit.toString() || '0',
            statementDay: account.credit_card_details?.statement_day.toString() || '1',
            dueDay: account.credit_card_details?.due_day.toString() || '1',
            lastDigits: account.credit_card_details?.card_last_digits || ''
          });
      }
  }, [account, isEditing]);

  const handleUpdate = async () => {
      if (!editForm.name || !editForm.limit) return;
      setLoading(true);
      try {
          const accRef = doc(db, 'users', targetUid, 'accounts', account.id);
          await updateDoc(accRef, {
              name: editForm.name,
              'credit_card_details.bank_name': editForm.bankName,
              'credit_card_details.credit_limit': Number(editForm.limit),
              'credit_card_details.statement_day': Number(editForm.statementDay),
              'credit_card_details.due_day': Number(editForm.dueDay),
              'credit_card_details.card_last_digits': editForm.lastDigits,
              updatedAt: new Date().toISOString()
          });
          setIsEditing(false);
      } catch (e: any) {
          alert("Lỗi cập nhật: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleRepay = async () => {
      if (!repayAmount || !selectedCashId) return;
      setLoading(true);
      try {
          const batch = writeBatch(db);
          const now = new Date().toISOString();
          const val = Number(repayAmount);
          const txRef = doc(collection(db, 'users', targetUid, 'transactions'));
          
          // Transaction: Dr Liability (Credit Card) / Cr Asset (Cash)
          batch.set(txRef, {
              id: txRef.id,
              amount: val,
              date: now.split('T')[0],
              datetime: now,
              type: TransactionType.CREDIT_PAYMENT,
              debit_account_id: account.id, // Reduce Liability
              credit_account_id: selectedCashId, // Reduce Cash
              category: 'Credit Card',
              group: 'CAPITAL',
              note: `Thanh toán dư nợ thẻ ${account.name}`,
              status: 'confirmed',
              createdAt: now,
              addedBy: auth.currentUser?.email
          });

          batch.update(doc(db, 'users', targetUid, 'accounts', account.id), { current_balance: increment(-val) });
          batch.update(doc(db, 'users', targetUid, 'accounts', selectedCashId), { current_balance: increment(-val) });

          await batch.commit();
          setShowRepay(false);
      } catch (e: any) {
          alert("Lỗi thanh toán: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  if (!details || !status) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-slate-50">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                 <CreditCard size={24} />
              </div>
              <div>
                 <h3 className="text-lg font-black text-slate-900">{account.name}</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{details.bank_name} •••• {details.card_last_digits}</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
               {!isEditing && (
                   <button onClick={() => setIsEditing(true)} className="p-2 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-slate-100">
                       <Pencil size={18} />
                   </button>
               )}
               <button onClick={onClose} className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"><X size={24}/></button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
           
           {isEditing ? (
               <div className="space-y-6 animate-in fade-in">
                   <StandardInput label="Tên gợi nhớ" value={editForm.name} onChange={v => setEditForm({...editForm, name: v})} />
                   <StandardInput label="Tên ngân hàng" value={editForm.bankName} onChange={v => setEditForm({...editForm, bankName: v})} />
                   <AmountInput label={t('credit_card.limit')} value={editForm.limit} onChange={v => setEditForm({...editForm, limit: v})} />
                   
                   <div className="grid grid-cols-3 gap-4">
                       <div className="flex flex-col gap-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('credit_card.statement_date')}</label>
                           <select value={editForm.statementDay} onChange={e => setEditForm({...editForm, statementDay: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none">
                               {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                       </div>
                       <div className="flex flex-col gap-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('credit_card.due_date')}</label>
                           <select value={editForm.dueDay} onChange={e => setEditForm({...editForm, dueDay: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none">
                               {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                       </div>
                       <StandardInput label="4 số cuối" value={editForm.lastDigits} onChange={v => setEditForm({...editForm, lastDigits: v})} placeholder="XXXX" type="number" />
                   </div>

                   <div className="pt-4 flex flex-col gap-3">
                       <button onClick={handleUpdate} disabled={loading} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl">
                           {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} {t('common.confirm')}
                       </button>
                   </div>
               </div>
           ) : (
               <>
                {/* Tab Switcher */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button onClick={() => setActiveTab('OVERVIEW')} className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'OVERVIEW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t('common.details')}</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t('common.history')}</button>
                </div>

                {activeTab === 'HISTORY' ? (
                    <LedgerTraceability accountId={account.id} targetUid={targetUid} />
                ) : showRepay ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right">
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-800">
                            <CheckCircle2 size={24} />
                            <div>
                                <p className="text-xs font-bold">{t('credit_card.repay_title')}</p>
                                <p className="text-[10px]">{t('credit_card.repay_desc')}</p>
                            </div>
                        </div>
                        
                        <AmountInput label={t('credit_card.repay_amount')} value={repayAmount} onChange={setRepayAmount} autoFocus />
                        
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{t('credit_card.min_payment')} (5%)</span>
                            <span className="text-xs font-black text-indigo-600 cursor-pointer hover:underline" onClick={() => setRepayAmount(status.minimumPayment.toString())}>
                                {currencyFormatter.format(status.minimumPayment)}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2"><Wallet size={12}/> {t('assets.desc.liquid')}</label>
                            <select value={selectedCashId} onChange={e => setSelectedCashId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold appearance-none">
                                {cashAccounts.map(c => <option key={c.id} value={c.id}>{c.name} ({currencyFormatter.format(c.current_balance)})</option>)}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={handleRepay} disabled={loading} className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin"/> : <DollarSign size={20}/>} {t('common.confirm')}
                            </button>
                            <button onClick={() => setShowRepay(false)} className="px-6 h-14 bg-slate-100 text-slate-500 rounded-2xl font-bold">{t('common.cancel')}</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Main Balance Card */}
                        <div className={`text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden text-center transition-colors duration-500 ${status.utilization > 80 ? 'bg-red-600' : 'bg-slate-900'}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] -mr-16 -mt-16"></div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Dư nợ hiện tại</p>
                            <h2 className="text-4xl font-black tracking-tight">{currencyFormatter.format(account.current_balance)}</h2>
                            
                            {status.utilization > 80 && (
                                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full animate-pulse">
                                    <AlertTriangle size={12} className="text-white" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('reports.high_risk')}</span>
                                </div>
                            )}

                            <div className="mt-6 flex justify-center gap-4">
                                <div className="text-center">
                                    <p className="text-[9px] font-bold text-white/40 uppercase mb-1">{t('credit_card.available')}</p>
                                    <p className="text-sm font-bold text-emerald-400">{currencyFormatter.format(status.available)}</p>
                                </div>
                                <div className="w-px bg-white/10"></div>
                                <div className="text-center">
                                    <p className="text-[9px] font-bold text-white/40 uppercase mb-1">{t('budget_widget.consumed')}</p>
                                    <p className="text-sm font-bold text-orange-400">{status.utilization.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Billing Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-1 text-slate-400">
                                    <Calendar size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{t('credit_card.statement_date')}</span>
                                </div>
                                <p className="text-xs font-black text-slate-900">{status.billingCycleLabel}</p>
                                {status.isStatementOpen && account.current_balance > 0 && (
                                    <p className="text-[9px] text-indigo-600 font-bold mt-1">Statement Closed</p>
                                )}
                            </div>
                            <div className={`p-4 rounded-2xl border ${status.daysToDue <= 5 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`flex items-center gap-2 mb-1 ${status.daysToDue <= 5 ? 'text-red-400' : 'text-slate-400'}`}>
                                    <AlertTriangle size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{t('credit_card.due_date')}</span>
                                </div>
                                <p className={`text-sm font-black ${status.daysToDue <= 5 ? 'text-red-600' : 'text-slate-900'}`}>Day {details.due_day}</p>
                                <p className={`text-[9px] mt-1 font-bold ${status.daysToDue <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                                    {status.daysToDue > 0 ? `${status.daysToDue} days left` : 'Overdue'}
                                </p>
                            </div>
                        </div>

                        {/* Minimum Payment Hint */}
                        <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                                    <BadgePercent size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{t('credit_card.min_payment')} (5%)</p>
                                    <p className="text-xs font-bold text-indigo-900">{currencyFormatter.format(status.minimumPayment)}</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setShowRepay(true)} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <ArrowRightLeft size={20} /> {t('credit_card.repay')}
                        </button>
                    </div>
                )}
               </>
           )}
        </div>
      </div>
    </div>
  );
};

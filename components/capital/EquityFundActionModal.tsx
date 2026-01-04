
import React, { useState, useMemo, useEffect } from 'react';
import { X, PiggyBank, History, LayoutDashboard, ArrowRightLeft, ExternalLink, CheckCircle2, AlertTriangle, Loader2, Trash2, ShieldCheck, Pencil, Check, Lock } from 'lucide-react';
import { Account, Transaction, TransactionType } from '../../types';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, writeBatch, getDocs, increment, deleteDoc, updateDoc } from 'firebase/firestore';
import { currencyFormatter } from '../../lib/utils';
import { LedgerTraceability } from '../assets/LedgerTraceability';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { EquityFundCockpit } from './equity/EquityFundCockpit';

interface EquityFundActionModalProps {
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const EquityFundActionModal: React.FC<EquityFundActionModalProps> = ({ account, onClose, targetUid }) => {
  const [activeTab, setActiveTab] = useState<'COCKPIT' | 'HISTORY'>('COCKPIT');
  const [linkedAssets, setLinkedAssets] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for Actions
  const [actionType, setActionType] = useState<'TRANSFER' | 'WITHDRAW' | 'DELETE' | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [targetFundId, setTargetFundId] = useState('');
  const [newFundName, setNewFundName] = useState('');
  const [allFunds, setAllFunds] = useState<Account[]>([]);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [withdrawSourceId, setWithdrawSourceId] = useState('');
  const [processing, setProcessing] = useState(false);

  // Renaming State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(account.name);
  const [isSavingName, setIsSavingName] = useState(false);

  // System accounts cannot be renamed
  const isSystemAccount = account.name === 'Spending Fund';

  useEffect(() => {
    // 1. Fetch assets linked to this fund
    const qAssets = query(
      collection(db, 'users', targetUid, 'accounts'),
      where('linked_fund_id', '==', account.id),
      where('status', '==', 'ACTIVE')
    );
    const unsubAssets = onSnapshot(qAssets, (snap) => {
      setLinkedAssets(snap.docs.map(d => d.data() as Account));
    });

    // 2. Fetch transactions for flow analysis
    const qTxns = query(collection(db, 'users', targetUid, 'transactions'));
    const unsubTxns = onSnapshot(qTxns, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      // Filter for this fund (Debit or Credit)
      setTransactions(all.filter(t => t.debit_account_id === account.id || t.credit_account_id === account.id));
      setLoading(false);
    });

    // 3. Fetch other funds for Transfer
    const qFunds = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Equity Fund'), where('group', '==', 'CAPITAL'));
    getDocs(qFunds).then(snap => {
        setAllFunds(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)).filter(f => f.id !== account.id));
    });

    // 4. Fetch Cash Accounts for Withdrawal payout
    const qCash = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'), where('group', '==', 'ASSETS'));
    getDocs(qCash).then(snap => {
        const cash = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        setCashAccounts(cash);
        if (cash.length > 0) setWithdrawSourceId(cash[0].id);
    });

    return () => { unsubAssets(); unsubTxns(); };
  }, [account.id, targetUid]);

  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let profit = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount);
      // Inflow: Credit to Capital Account
      if (t.credit_account_id === account.id) {
         if (t.group === 'INCOME' || t.type === TransactionType.INTEREST_LOG) profit += amt;
         totalIn += amt;
      }
      // Outflow: Debit to Capital Account
      if (t.debit_account_id === account.id) {
         if (t.group === 'EXPENSES' || t.type === TransactionType.INTEREST_LOG) profit -= amt;
         totalOut += amt;
      }
    });

    return { totalIn, totalOut, profit };
  }, [transactions, account.id]);

  const allocationTotal = useMemo(() => 
    linkedAssets.reduce((sum, a) => sum + (a.current_balance || 0), 0)
  , [linkedAssets]);

  const unlinkedCash = Math.max(0, (account.current_balance || 0) - allocationTotal);

  // --- ACTIONS ---

  const handleRename = async () => {
    if (!newName.trim() || newName === account.name) {
        setIsEditingName(false);
        setNewName(account.name);
        return;
    }
    setIsSavingName(true);
    try {
        await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), { name: newName.trim() });
        setIsEditingName(false);
    } catch (e: any) {
        alert("Lỗi đổi tên: " + e.message);
    } finally {
        setIsSavingName(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || (!targetFundId && !newFundName) || processing) return;
    setProcessing(true);
    try {
        const batch = writeBatch(db);
        const now = new Date().toISOString();
        const amt = Number(transferAmount);
        let finalTargetId = targetFundId;

        // Create new fund if needed
        if (!targetFundId && newFundName) {
            const newRef = doc(collection(db, 'users', targetUid, 'accounts'));
            finalTargetId = newRef.id;
            batch.set(newRef, {
                id: newRef.id,
                name: newFundName,
                group: 'CAPITAL',
                category: 'Equity Fund',
                current_balance: 0,
                status: 'ACTIVE',
                createdAt: now,
                color_code: '#6366f1',
                target_ratio: 0
            });
        }

        // Transaction: Debit Source (Current Fund), Credit Target
        const txRef = doc(collection(db, 'users', targetUid, 'transactions'));
        batch.set(txRef, {
            id: txRef.id,
            amount: amt,
            date: now.split('T')[0],
            datetime: now,
            type: TransactionType.FUND_ALLOCATION,
            debit_account_id: account.id,
            credit_account_id: finalTargetId,
            category: 'Equity Fund',
            group: 'CAPITAL',
            status: 'confirmed',
            note: `Điều chuyển vốn sang: ${newFundName || allFunds.find(f=>f.id===targetFundId)?.name}`,
            createdAt: now,
            addedBy: auth.currentUser?.email
        });

        // Update Balances
        batch.update(doc(db, 'users', targetUid, 'accounts', account.id), { current_balance: increment(-amt) });
        batch.update(doc(db, 'users', targetUid, 'accounts', finalTargetId), { current_balance: increment(amt) });

        await batch.commit();
        setActionType(null);
    } catch (e: any) { alert(e.message); } finally { setProcessing(false); }
  };

  const handleWithdraw = async () => {
    if (!transferAmount || !withdrawSourceId || processing) return;
    setProcessing(true);
    try {
        const batch = writeBatch(db);
        const now = new Date().toISOString();
        const amt = Number(transferAmount);

        // Transaction: Debit Equity (Decrease), Credit Cash Asset (Decrease)
        const txRef = doc(collection(db, 'users', targetUid, 'transactions'));
        batch.set(txRef, {
            id: txRef.id,
            amount: amt,
            date: now.split('T')[0],
            datetime: now,
            type: TransactionType.CAPITAL_WITHDRAWAL,
            debit_account_id: account.id, // Reduce Capital
            credit_account_id: withdrawSourceId, // Reduce Cash
            category: 'Equity Fund',
            group: 'CAPITAL',
            status: 'confirmed',
            note: 'Rút vốn chủ sở hữu',
            createdAt: now,
            addedBy: auth.currentUser?.email
        });

        batch.update(doc(db, 'users', targetUid, 'accounts', account.id), { current_balance: increment(-amt) });
        batch.update(doc(db, 'users', targetUid, 'accounts', withdrawSourceId), { current_balance: increment(-amt) });

        await batch.commit();
        setActionType(null);
    } catch (e: any) { alert(e.message); } finally { setProcessing(false); }
  };

  const handleDelete = async () => {
      if (!confirm("Hành động này sẽ xóa vĩnh viễn quỹ này. Bạn chắc chắn chứ?")) return;
      if (account.current_balance > 1000) return alert("Vui lòng chuyển hết số dư về 0 trước khi xóa.");
      if (isSystemAccount) return alert("Không thể xóa quỹ mặc định của hệ thống.");
      setProcessing(true);
      try {
          await deleteDoc(doc(db, 'users', targetUid, 'accounts', account.id));
          onClose();
      } catch(e: any) { alert(e.message); } finally { setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 outline-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="bg-slate-50 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-white p-5 flex items-center justify-between border-b border-slate-100 shrink-0 sticky top-0 z-20 shadow-sm">
           <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg bg-indigo-600 text-white shrink-0" style={{ backgroundColor: account.color_code }}>
                 <PiggyBank size={22} />
              </div>
              <div className="min-w-0 flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mb-1">
                        <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)} 
                            className="w-full bg-slate-50 border border-indigo-200 rounded-lg px-2 py-1 text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 min-w-0"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        />
                        <button onClick={handleRename} disabled={isSavingName} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 hover:bg-emerald-100 transition-colors"><Check size={16} /></button>
                        <button onClick={() => { setIsEditingName(false); setNewName(account.name); }} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg shrink-0 hover:bg-slate-200 transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group mb-1">
                        <h3 className="text-lg font-black text-slate-900 truncate tracking-tight">{account.name}</h3>
                        {isSystemAccount ? (
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title="Tài khoản mặc định hệ thống - Không thể đổi tên">
                                <Lock size={10} className="text-slate-400" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Default</span>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-indigo-500 transition-all rounded-md hover:bg-slate-50"><Pencil size={14} /></button>
                        )}
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none">
                    Quản trị quỹ chủ sở hữu
                  </p>
              </div>
           </div>
           <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-90 shrink-0">
             <X size={24} />
           </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 bg-slate-50 shrink-0">
            <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100">
                <button 
                  onClick={() => setActiveTab('COCKPIT')} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'COCKPIT' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <LayoutDashboard size={14} /> Cockpit
                </button>
                <button 
                  onClick={() => setActiveTab('HISTORY')} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <History size={14} /> Ledger Logs
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-4 pb-10">
           {activeTab === 'HISTORY' ? (
             <div className="px-6">
                <LedgerTraceability accountId={account.id} targetUid={targetUid} />
             </div>
           ) : (
             <EquityFundCockpit 
                account={account} 
                stats={stats} 
                linkedAssets={linkedAssets} 
                unlinkedCash={unlinkedCash} 
                onAction={(type) => setActionType(type)}
                setTransferAmount={setTransferAmount}
                setTargetFundId={setTargetFundId}
             />
           )}
        </div>
      </div>

      {/* OVERLAY MODALS FOR ACTIONS */}
      {actionType === 'TRANSFER' && (
        <div className="absolute inset-0 z-[120] bg-white animate-in slide-in-from-bottom duration-300 flex flex-col rounded-[2.5rem] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                <h3 className="font-black text-slate-900 flex items-center gap-2"><ArrowRightLeft size={18} className="text-indigo-600"/> Điều chuyển vốn</h3>
                <button onClick={() => setActionType(null)} className="p-2 bg-white rounded-full text-slate-400 shadow-sm"><X size={18} /></button>
            </div>
            <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                <AmountInput label="Số tiền chuyển" value={transferAmount} onChange={setTransferAmount} autoFocus />
                
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chuyển đến quỹ</p>
                    <div className="grid grid-cols-1 gap-2">
                        {allFunds.map(f => (
                            <button key={f.id} onClick={() => { setTargetFundId(f.id); setNewFundName(''); }} className={`p-4 rounded-2xl border text-left transition-all ${targetFundId === f.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-600'}`}>
                                <span className="font-bold text-sm">{f.name}</span>
                                <span className="block text-[10px] opacity-70">Balance: {currencyFormatter.format(f.current_balance)}</span>
                            </button>
                        ))}
                        <button onClick={() => { setTargetFundId(''); setNewFundName('Quỹ mới'); }} className={`p-4 rounded-2xl border text-left transition-all border-dashed ${!targetFundId && newFundName ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-slate-200 text-slate-400'}`}>
                            <span className="font-bold text-sm">+ Tạo quỹ mới</span>
                        </button>
                    </div>
                    {!targetFundId && newFundName && (
                        <StandardInput label="Tên quỹ mới" value={newFundName} onChange={setNewFundName} placeholder="VD: Quỹ đầu tư mạo hiểm" />
                    )}
                </div>
            </div>
            <div className="p-6 border-t">
                <button onClick={handleTransfer} disabled={processing || !transferAmount || (!targetFundId && !newFundName)} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
                    {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Xác nhận chuyển
                </button>
            </div>
        </div>
      )}

      {actionType === 'WITHDRAW' && (
        <div className="absolute inset-0 z-[120] bg-white animate-in slide-in-from-bottom duration-300 flex flex-col rounded-[2.5rem] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                <h3 className="font-black text-slate-900 flex items-center gap-2"><ExternalLink size={18} className="text-orange-600"/> Rút vốn chủ sở hữu</h3>
                <button onClick={() => setActionType(null)} className="p-2 bg-white rounded-full text-slate-400 shadow-sm"><X size={18} /></button>
            </div>
            <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3 text-orange-800 text-[11px] font-medium leading-relaxed">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    Việc rút vốn sẽ làm giảm Equity và yêu cầu chi trả bằng Tiền mặt (Cash) hoặc Tài sản tương đương.
                </div>

                <AmountInput label="Số tiền rút" value={transferAmount} onChange={setTransferAmount} autoFocus />
                
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chi trả từ ví (Nguồn tiền)</p>
                    <select value={withdrawSourceId} onChange={e => setWithdrawSourceId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none appearance-none">
                        {cashAccounts.map(c => <option key={c.id} value={c.id}>{c.name} ({currencyFormatter.format(c.current_balance)})</option>)}
                    </select>
                </div>
            </div>
            <div className="p-6 border-t">
                <button onClick={handleWithdraw} disabled={processing || !transferAmount || !withdrawSourceId} className="w-full h-14 bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
                    {processing ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Xác nhận rút vốn
                </button>
            </div>
        </div>
      )}

      {actionType === 'DELETE' && (
          <div className="absolute inset-0 z-[130] bg-white/90 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl border border-slate-100 text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                  <h3 className="text-xl font-black text-slate-900">Xóa quỹ này?</h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Hành động này không thể hoàn tác. Mọi lịch sử liên quan sẽ mất liên kết.</p>
                  <div className="flex flex-col gap-3 mt-6">
                      <button onClick={handleDelete} disabled={processing} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200">Xác nhận xóa</button>
                      <button onClick={() => setActionType(null)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Hủy bỏ</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

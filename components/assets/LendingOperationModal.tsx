
import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, TrendingUp, RotateCw, ShieldCheck, Loader2, Save, Landmark, Info } from 'lucide-react';
import { doc, collection, writeBatch, increment, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType, LendingExtension } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';
import { DateInput } from '../ui/DateInput';
import { StandardInput } from '../ui/StandardInput';

type LendingOp = 'TOP_UP' | 'COLLECT' | 'EXTEND' | 'SETTLE';

interface LendingOperationModalProps {
  operation: LendingOp;
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const LendingOperationModal: React.FC<LendingOperationModalProps> = ({ operation, account, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [linkedAccountId, setLinkedAccountId] = useState('');

  useEffect(() => {
    const fetchCash = async () => {
      const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setLinkedAccountId(accs[0].id);
    };
    if (['TOP_UP', 'COLLECT', 'SETTLE'].includes(operation)) fetchCash();
  }, [operation, targetUid]);

  const getOpConfig = () => {
    switch (operation) {
      case 'TOP_UP': return { title: 'Cho vay thêm', icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50' };
      case 'COLLECT': return { title: 'Thu hồi nợ/lãi', icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'EXTEND': return { title: 'Gia hạn nợ', icon: RotateCw, color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'SETTLE': return { title: 'Tất toán', icon: ShieldCheck, color: 'text-slate-900', bg: 'bg-slate-100' };
    }
  };

  const handleSave = async () => {
    if (operation !== 'EXTEND' && operation !== 'SETTLE' && !amount) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const val = Number(amount);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      const contactsRef = collection(db, 'users', targetUid, 'contacts');
      const lendingAccRef = doc(accountsRef, account.id);
      const txRef = doc(transactionsRef);

      const commonTxData = {
        id: txRef.id, date, datetime: now, group: 'ASSETS', status: 'confirmed', asset_link_id: account.id,
        createdAt: now, addedBy: auth.currentUser?.email
      };

      switch (operation) {
        case 'TOP_UP':
          // Debit: Lending (Asset +) | Credit: Cash (Asset -)
          batch.set(txRef, { ...commonTxData, amount: val, note: note || `Ghi tăng vốn vay: ${account.name}`, type: TransactionType.LENDING, debit_account_id: account.id, credit_account_id: linkedAccountId, category: 'Receivables' });
          batch.update(lendingAccRef, { current_balance: increment(val), 'lending_details.principal_amount': increment(val) });
          batch.update(doc(accountsRef, linkedAccountId), { current_balance: increment(-val) });
          if (account.lending_details?.borrower_id) batch.update(doc(contactsRef, account.lending_details.borrower_id), { total_receivable: increment(val) });
          break;

        case 'COLLECT':
          // Debit: Cash (Asset +) | Credit: Lending (Asset -)
          batch.set(txRef, { ...commonTxData, amount: val, note: note || `Thu hồi dòng tiền: ${account.name}`, type: TransactionType.DEBT_REPAYMENT, debit_account_id: linkedAccountId, credit_account_id: account.id, category: 'Receivables' });
          batch.update(lendingAccRef, { current_balance: increment(-val) });
          batch.update(doc(accountsRef, linkedAccountId), { current_balance: increment(val) });
          if (account.lending_details?.borrower_id) batch.update(doc(contactsRef, account.lending_details.borrower_id), { total_receivable: increment(-val) });
          break;

        case 'EXTEND':
          if (!account.lending_details) throw new Error("Lending details missing");
          const extension: LendingExtension = { id: crypto.randomUUID(), date: now.split('T')[0], previous_end_date: account.lending_details.end_date || 'N/A', new_end_date: date, note };
          batch.update(lendingAccRef, { 'lending_details.end_date': date, 'lending_details.extension_history': [...(account.lending_details.extension_history || []), extension] });
          break;

        case 'SETTLE':
          const settleVal = account.current_balance;
          batch.set(txRef, { ...commonTxData, amount: settleVal, note: note || `Tất toán toàn bộ: ${account.name}`, type: TransactionType.DEBT_REPAYMENT, debit_account_id: linkedAccountId, credit_account_id: account.id, category: 'Receivables' });
          batch.update(lendingAccRef, { current_balance: 0, status: 'CLOSED', updatedAt: now });
          batch.update(doc(accountsRef, linkedAccountId), { current_balance: increment(settleVal) });
          if (account.lending_details?.borrower_id) batch.update(doc(contactsRef, account.lending_details.borrower_id), { total_receivable: increment(-settleVal) });
          break;
      }

      await batch.commit();
      onClose();
    } catch (e: any) {
      alert("Lỗi hạch toán: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const config = getOpConfig()!;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${config.bg} ${config.color} flex items-center justify-center`}><Icon size={24} /></div>
            <h3 className="font-black text-slate-900">{config.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] no-scrollbar">
          {operation === 'SETTLE' ? (
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center space-y-2">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tổng dư nợ hiện tại</p>
              <p className="text-2xl font-black text-indigo-900">{currencyFormatter.format(account.current_balance)}</p>
              <p className="text-[10px] font-medium text-indigo-600 pt-2 border-t border-indigo-100 italic">Toàn bộ dư nợ sẽ được thu hồi về ví chọn.</p>
            </div>
          ) : operation !== 'EXTEND' && (
            <AmountInput label={operation === 'COLLECT' ? "Số tiền thu hồi" : "Số tiền hạch toán"} value={amount} onChange={setAmount} autoFocus />
          )}

          {operation === 'EXTEND' && <DateInput label="Ngày đáo hạn mới" value={date} onChange={setDate} />}

          {['TOP_UP', 'COLLECT', 'SETTLE'].includes(operation) && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Landmark size={12} /> {operation === 'TOP_UP' ? 'Trích tiền từ' : 'Thu hồi về'}</label>
              <select value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none">
                {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>)}
              </select>
            </div>
          )}

          <StandardInput label="Ghi chú" value={note} onChange={setNote} placeholder="Nhập nội dung hạch toán..." />
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">Mọi nghiệp vụ sẽ được ghi sổ tự động vào Ledger để bảo đảm tính cân đối kế toán.</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
          <button onClick={handleSave} disabled={loading || (operation !== 'EXTEND' && operation !== 'SETTLE' && !amount)} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {loading ? <Loader2 size={24} className="animate-spin text-emerald-400" /> : <Save size={20} className="text-emerald-400" />}
            {operation === 'SETTLE' ? 'Xác nhận tất toán' : 'Xác nhận hạch toán'}
          </button>
        </div>
      </div>
    </div>
  );
};

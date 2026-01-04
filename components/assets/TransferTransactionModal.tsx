import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Loader2, Check, Plus, Database, Sparkles, CheckCircle2, Tag, Layers, Trash2 } from 'lucide-react';
import { doc, collection, writeBatch, query, where, getDocs, increment, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, Transaction, Category } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { NewAccountForm } from './NewAccountForm';

interface TransferTransactionModalProps {
  transaction: Transaction;
  sourceAccount: Account;
  onClose: () => void;
  targetUid: string;
}

const FinishedView: React.FC<{ sourceAccount: Account; srcNewBalance: number | null; loading: boolean; onDelete: () => void; onClose: () => void; }> = ({ sourceAccount, srcNewBalance, loading, onDelete, onClose }) => {
  const isZero = srcNewBalance === 0;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50"><CheckCircle2 size={40} /></div>
        <h3 className="text-2xl font-black text-slate-900 leading-tight">Hạch toán lại thành công!</h3>
        <p className="text-slate-500 text-sm font-medium mt-2 mb-8 px-4">Giao dịch đã được chuyển sang tài khoản mới. {isZero ? <> Tài khoản <span className="font-bold text-slate-900">{sourceAccount.name}</span> hiện đã <strong>hết số dư (0đ)</strong>.</> : <> Số dư còn lại của {sourceAccount.name}: <span className="font-bold text-slate-900">{currencyFormatter.format(srcNewBalance || 0)}</span>.</>}</p>
        {isZero ? <div className="w-full space-y-3"><div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3 text-left mb-6"><Sparkles size={20} className="text-indigo-600 shrink-0" /><p className="text-[11px] font-medium text-indigo-900 leading-relaxed"><strong>Gợi ý:</strong> Tài khoản cũ đang có số dư 0đ. Bạn có muốn xóa nó để danh sách gọn gàng hơn không?</p></div><button onClick={onDelete} disabled={loading} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg">{loading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} className="text-indigo-400" />} Xóa tài khoản cũ</button><button onClick={onClose} disabled={loading} className="w-full h-14 bg-slate-50 text-slate-400 rounded-2xl font-bold text-sm">Giữ lại & Đóng</button></div> : <button onClick={onClose} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl">Hoàn tất</button>}
      </div>
    </div>
  );
};

export const TransferTransactionModal: React.FC<TransferTransactionModalProps> = ({ transaction, sourceAccount, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [sameCatAccounts, setSameCatAccounts] = useState<Account[]>([]);
  const [otherCatAccounts, setOtherCatAccounts] = useState<Account[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState({ newName: '', newCategory: sourceAccount.category, newInterestRate: '0', newOwnerName: '' });
  const [isFinished, setIsFinished] = useState(false);
  const [srcNewBalance, setSrcNewBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const snapAccs = await getDocs(query(collection(db, 'users', targetUid, 'accounts'), where('group', '==', sourceAccount.group)));
      const all = snapAccs.docs.map(d => ({ id: d.id, ...d.data() } as Account)).filter(a => a.id !== sourceAccount.id && a.status === 'ACTIVE');
      setSameCatAccounts(all.filter(a => a.category === sourceAccount.category));
      setOtherCatAccounts(all.filter(a => a.category !== sourceAccount.category));
      const snapCats = await getDocs(query(collection(db, 'users', targetUid, 'categories'), where('group', '==', sourceAccount.group)));
      setAvailableCategories(snapCats.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    };
    fetchData();
  }, [targetUid, sourceAccount.id, sourceAccount.group, sourceAccount.category]);

  const handleExecute = async () => {
    if ((!isCreatingNew && !selectedDestId) || (isCreatingNew && !formData.newName.trim()) || loading) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const amt = Number(transaction.amount);
      const now = new Date().toISOString();
      let destId = selectedDestId;
      if (isCreatingNew) {
        const ref = doc(collection(db, 'users', targetUid, 'accounts'));
        const data: any = { id: ref.id, name: formData.newName.trim(), group: sourceAccount.group, category: formData.newCategory, current_balance: 0, status: 'ACTIVE', createdAt: now, interest_rate: Number(formData.newInterestRate) || 0 };
        if (formData.newOwnerName.trim()) data.creditor_debtor_name = formData.newOwnerName.trim();
        batch.set(ref, data); destId = ref.id;
      }
      const isSrcDebit = transaction.debit_account_id === sourceAccount.id;
      const sD = sourceAccount.group === 'ASSETS' ? (isSrcDebit ? -amt : amt) : (isSrcDebit ? amt : -amt);
      const dD = sourceAccount.group === 'ASSETS' ? (isSrcDebit ? amt : -amt) : (isSrcDebit ? -amt : amt);
      setSrcNewBalance((sourceAccount.current_balance || 0) + sD);
      batch.update(doc(db, 'users', targetUid, 'transactions', transaction.id), { [isSrcDebit ? 'debit_account_id' : 'credit_account_id']: destId });
      batch.update(doc(db, 'users', targetUid, 'accounts', sourceAccount.id), { current_balance: increment(sD) });
      batch.update(doc(db, 'users', targetUid, 'accounts', destId), { current_balance: increment(dD) });
      await batch.commit(); setIsFinished(true);
    } finally { setLoading(false); }
  };

  if (isFinished) return <FinishedView sourceAccount={sourceAccount} srcNewBalance={srcNewBalance} loading={loading} onDelete={() => deleteDoc(doc(db, 'users', targetUid, 'accounts', sourceAccount.id)).then(onClose)} onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 pb-2 flex items-center justify-between border-b"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ArrowRightLeft size={20} /></div><div><h3 className="text-lg font-black text-slate-900">Chuyển tài khoản</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reassign Transaction</p></div></div><button onClick={onClose} className="p-2 text-slate-400"><X size={24} /></button></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"><div className="bg-slate-50 p-4 rounded-2xl border space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giao dịch:</p><div className="flex justify-between items-center"><span className="text-sm font-bold truncate pr-4">{transaction.note || transaction.category}</span><span className="text-sm font-black text-indigo-600 shrink-0">{currencyFormatter.format(transaction.amount)}</span></div></div>
          <div className="space-y-6"><div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyển sang:</p><button onClick={() => setIsCreatingNew(!isCreatingNew)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1">{isCreatingNew ? "Chọn sẵn có" : "Tạo mới"}</button></div>
            {isCreatingNew ? <NewAccountForm formData={formData} setFormData={setFormData} availableCategories={availableCategories} sourceGroup={sourceAccount.group} /> : (
              <div className="space-y-6">{[{l:'Cùng loại',t:Tag,a:sameCatAccounts},{l:'Khác nhóm',t:Layers,a:otherCatAccounts}].map((g,i)=>(<div key={i} className="space-y-3"><div className="flex items-center gap-2 px-1"><g.t size={12} className="text-indigo-500"/><span className="text-[10px] font-black text-slate-400 uppercase">{g.l}</span></div><div className="grid grid-cols-1 gap-2">{g.a.length===0?<p className="text-[10px] font-bold text-slate-300 italic px-2">Không có.</p>:g.a.map(acc=>(<button key={acc.id} onClick={()=>setSelectedDestId(acc.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${selectedDestId===acc.id?'bg-indigo-600 border-indigo-600 text-white shadow-lg':'bg-slate-50 border-slate-100 hover:border-indigo-200 text-slate-700'}`}><div className="flex items-center gap-3 min-w-0"><div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedDestId===acc.id?'bg-white/20':'bg-indigo-50 text-indigo-500'}`}>{sourceAccount.group==='ASSETS'?<Database size={16}/>:<Database size={16}/>}</div><div className="truncate"><p className="text-sm font-bold truncate">{acc.name}</p><p className={`text-[9px] font-black uppercase ${selectedDestId===acc.id?'opacity-70':'text-slate-400'}`}>{acc.category}</p></div></div>{selectedDestId===acc.id&&<Check size={16}/>}</button>)))}</div></div>))}</div>
            )}
          </div><div className="p-4 bg-amber-50 rounded-2xl border flex gap-3"><Database size={16} className="text-amber-600 shrink-0 mt-0.5"/><p className="text-[10px] font-medium text-amber-900 leading-relaxed">Hệ thống hạch toán lại số dư của <strong>{sourceAccount.name}</strong> và tài khoản đích.</p></div></div>
        <div className="p-6 bg-slate-50 border-t"><button onClick={handleExecute} disabled={loading||(!isCreatingNew&&!selectedDestId)||(isCreatingNew&&!formData.newName.trim())} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">{loading?<Loader2 size={24} className="animate-spin text-indigo-400"/>:<Check size={24} className="text-indigo-400"/>}{loading?"Đang hạch toán...":"Xác nhận chuyển"}</button></div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { X, Receipt, Users, UserPlus, Landmark, Percent, Calendar, Wallet, Loader2, Save, Info, ChevronDown, Clock, ShieldCheck } from 'lucide-react';
import { collection, doc, writeBatch, query, where, getDocs, onSnapshot, orderBy, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType, FinancialContact, LiabilityDetails } from '../../types';
import { currencyFormatter, generateFutureEvents } from '../../lib/utils';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { DateInput } from '../ui/DateInput';
import { ContactForm } from '../contacts/ContactForm';

interface AddLiabilityModalProps {
  onClose: () => void;
  targetUid: string;
}

export const AddLiabilityModal: React.FC<AddLiabilityModalProps> = ({ onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<FinancialContact[]>([]);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    lenderId: '',
    amount: '',
    rate: '8.5',
    interestType: 'REDUCING_BALANCE' as 'REDUCING_BALANCE' | 'FLAT',
    paymentDay: '0', // Default to Last Day
    paymentCycle: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY' | 'END_OF_TERM',
    startDate: new Date().toISOString().split('T')[0],
    termMonths: '12',
    gracePeriod: '0',
    destAccountId: ''
  });

  // Auto-calculate Maturity Date
  const maturityDate = useMemo(() => {
    if (!formData.startDate || !formData.termMonths) return '';
    try {
      const start = new Date(formData.startDate);
      const months = parseInt(formData.termMonths);
      if (isNaN(months)) return '';
      const end = new Date(start.setMonth(start.getMonth() + months));
      return end.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  }, [formData.startDate, formData.termMonths]);

  useEffect(() => {
    const unsubContacts = onSnapshot(
      query(collection(db, 'users', targetUid, 'contacts'), orderBy('name', 'asc')),
      (snap) => setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialContact)))
    );

    const fetchCash = async () => {
      const q = query(collection(db, 'users', targetUid, 'accounts'), 
        where('group', '==', 'ASSETS'), 
        where('category', '==', 'Cash')
      );
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setFormData(prev => ({ ...prev, destAccountId: accs[0].id }));
    };
    fetchCash();

    return () => unsubContacts();
  }, [targetUid]);

  const selectedLender = useMemo(() => 
    contacts.find(c => c.id === formData.lenderId), 
  [contacts, formData.lenderId]);

  const handleSave = async () => {
    if (!formData.lenderId || !formData.amount || !formData.destAccountId) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const amount = Number(formData.amount);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      const contactRef = doc(db, 'users', targetUid, 'contacts', formData.lenderId);

      // Generate Scheduled Events (Repayment is OUTFLOW)
      const scheduledEvents = generateFutureEvents(
        amount,
        Number(formData.rate),
        formData.startDate,
        Number(formData.termMonths),
        formData.paymentCycle, 
        'OUTFLOW',
        `Trả nợ: ${selectedLender?.name}`,
        Number(formData.paymentDay)
      );

      // 1. Tạo Account Liability (Nợ phải trả)
      const liabilityAccRef = doc(accountsRef);
      const liabilityData: Account = {
        id: liabilityAccRef.id,
        name: formData.name || `Vay từ ${selectedLender?.name}`,
        group: 'CAPITAL',
        category: 'Liability',
        current_balance: amount,
        status: 'ACTIVE',
        createdAt: now,
        creditor_debtor_name: selectedLender?.name || '',
        interest_rate: Number(formData.rate),
        liability_details: {
          lender_id: formData.lenderId,
          lender_name: selectedLender?.name || '',
          principal_amount: amount,
          interest_rate: Number(formData.rate),
          interest_type: formData.interestType,
          payment_day: Number(formData.paymentDay),
          payment_cycle: formData.paymentCycle,
          early_settlement_fee: 0,
          start_date: formData.startDate,
          end_date: maturityDate,
          term_months: Number(formData.termMonths),
          grace_period_months: Number(formData.gracePeriod)
        },
        investment_logs: [{
          id: crypto.randomUUID(),
          date: formData.startDate,
          type: 'BUY',
          price: amount,
          note: 'Khởi tạo khoản nợ mới'
        }],
        scheduled_events: scheduledEvents
      };
      batch.set(liabilityAccRef, liabilityData);

      // 2. Ghi nhận giao dịch BORROWING
      const txRef = doc(transactionsRef);
      batch.set(txRef, {
        id: txRef.id,
        amount: amount,
        date: formData.startDate,
        datetime: now,
        note: `Nhận tiền vay: ${liabilityData.name}`,
        type: TransactionType.BORROWING,
        debit_account_id: formData.destAccountId,
        credit_account_id: liabilityAccRef.id,
        category: 'Liability',
        group: 'CAPITAL',
        status: 'confirmed',
        asset_link_id: liabilityAccRef.id,
        createdAt: now,
        addedBy: auth.currentUser?.email
      });

      // 3. Cập nhật số dư ví
      batch.update(doc(db, 'users', targetUid, 'accounts', formData.destAccountId), {
        current_balance: increment(amount)
      });

      // 4. Cập nhật contact
      batch.update(contactRef, {
        total_payable: increment(amount),
        updatedAt: now
      });

      await batch.commit();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert("Lỗi khi ghi nợ: " + error.message);
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
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !loading && onClose()}></div>
      
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[95vh]">
        
        <div className="p-6 pb-2 flex items-center justify-between border-b">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
              <Receipt size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Ghi nhận khoản vay</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Vay mới hoặc vay thêm</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-10">
          {/* 1. Lender Selection */}
          <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Users size={12} /> Đối tượng cho vay
                </label>
                <button onClick={() => setShowContactForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:underline">
                  <UserPlus size={10} /> Thêm mới
                </button>
             </div>
             
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {contacts.length === 0 ? (
                   <button onClick={() => setShowContactForm(true)} className="w-full p-4 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs font-bold italic">Chưa có danh bạ. Nhấn để tạo mới.</button>
                ) : (
                   contacts.map(c => (
                      <button 
                         key={c.id}
                         onClick={() => setFormData({...formData, lenderId: c.id})}
                         className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${formData.lenderId === c.id ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-50 bg-slate-50'}`}
                      >
                         <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center">
                            {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <Users size={16} className="text-slate-300" />}
                         </div>
                         <span className={`text-[10px] font-black truncate w-16 text-center ${formData.lenderId === c.id ? 'text-orange-600' : 'text-slate-500'}`}>{c.name}</span>
                      </button>
                   ))
                )}
             </div>
          </div>

          <AmountInput 
            label="Số tiền vay (Gốc)"
            value={formData.amount}
            onChange={(val) => setFormData({...formData, amount: val})}
            autoFocus
          />

          <StandardInput 
            label="Tên khoản vay / Mục đích"
            value={formData.name}
            onChange={(val) => setFormData({...formData, name: val})}
            placeholder="VD: Vay mua xe..."
          />

          {/* 2. Contract Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lãi suất (%/năm)</label>
                <div className="relative">
                   <input 
                      type="number" 
                      min="0"
                      value={formData.rate} 
                      onChange={e => handlePositiveInput('rate', e.target.value)} 
                      onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                      className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none" 
                   />
                   <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cách tính lãi</label>
                <select value={formData.interestType} onChange={e => setFormData({...formData, interestType: e.target.value as any})} className="w-full px-3 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 text-[10px] outline-none appearance-none">
                   <option value="REDUCING_BALANCE">Dư nợ giảm dần</option>
                   <option value="FLAT">Lãi phẳng</option>
                </select>
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kỳ trả lãi</label>
                <select value={formData.paymentCycle} onChange={e => setFormData({...formData, paymentCycle: e.target.value as any})} className="w-full px-3 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 text-[10px] outline-none appearance-none">
                   <option value="MONTHLY">Hàng tháng</option>
                   <option value="QUARTERLY">Hàng quý (3T)</option>
                   <option value="SEMI_ANNUAL">6 tháng</option>
                   <option value="YEARLY">Hàng năm</option>
                   <option value="END_OF_TERM">Cuối kỳ</option>
                </select>
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày trả nợ</label>
                <div className="relative">
                   <select 
                      value={formData.paymentDay} 
                      onChange={e => setFormData({...formData, paymentDay: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none appearance-none cursor-pointer" 
                   >
                      <option value="0">Ngày cuối tháng</option>
                      {Array.from({length: 30}, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>Ngày {d} hàng tháng</option>
                      ))}
                   </select>
                   <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tháng vay</label>
                <div className="relative">
                   <input 
                      type="number" 
                      min="0"
                      value={formData.termMonths} 
                      onChange={e => handlePositiveInput('termMonths', e.target.value)} 
                      onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none" 
                   />
                   <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày giải ngân</label>
                <DateInput value={formData.startDate} onChange={val => setFormData({...formData, startDate: val})} />
             </div>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" /> Số tháng ân hạn gốc
             </label>
             <div className="relative">
                <input 
                   type="number" 
                   min="0"
                   value={formData.gracePeriod} 
                   onChange={e => handlePositiveInput('gracePeriod', e.target.value)} 
                   onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                   className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl font-bold text-emerald-800 outline-none focus:bg-white focus:border-emerald-200 transition-all" 
                   placeholder="0"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 pointer-events-none">tháng</span>
             </div>
             <p className="text-[9px] text-slate-400 italic ml-2">Trong thời gian ân hạn, bạn chỉ cần trả lãi, không phải trả gốc.</p>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Wallet size={12} /> Nhận tiền vào (Debit Account)
             </label>
             <select 
                value={formData.destAccountId} 
                onChange={e => setFormData({...formData, destAccountId: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none"
             >
                {cashAccounts.map(acc => (
                   <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>
                ))}
             </select>
          </div>

          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
             <Info size={20} className="text-orange-600 shrink-0 mt-0.5" />
             <div className="text-[10px] font-medium text-orange-900 leading-relaxed uppercase">
                Khoản vay sẽ đáo hạn vào ngày <strong>{new Date(maturityDate).toLocaleDateString('vi-VN')}</strong>.
             </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
           <button 
             onClick={handleSave}
             disabled={loading || !formData.lenderId || !formData.amount || !formData.destAccountId}
             className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
           >
              {loading ? <Loader2 size={24} className="animate-spin text-orange-400" /> : <Save size={20} className="text-orange-400" />}
              {loading ? "Đang ghi nợ..." : "Giải ngân & Lưu khoản nợ"}
           </button>
        </div>
      </div>

      {showContactForm && (
         <ContactForm targetUid={targetUid} onClose={() => setShowContactForm(false)} />
      )}
    </div>
  );
};

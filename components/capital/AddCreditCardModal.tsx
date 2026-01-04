
import React, { useState } from 'react';
import { X, CreditCard, Save, Loader2, Calendar } from 'lucide-react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Account, TransactionType } from '../../types';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';

interface AddCreditCardModalProps {
  onClose: () => void;
  targetUid: string;
}

export const AddCreditCardModal: React.FC<AddCreditCardModalProps> = ({ onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    cardName: '',
    limit: '',
    statementDay: '20',
    dueDay: '5',
    lastDigits: '',
    color: 'black' as 'gold' | 'platinum' | 'black' | 'blue'
  });

  const handleSave = async () => {
    if (!formData.bankName || !formData.limit) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      
      const newRef = doc(collection(db, 'users', targetUid, 'accounts'));
      
      const newCard: Account = {
        id: newRef.id,
        name: formData.cardName || `${formData.bankName} Credit`,
        group: 'CAPITAL',
        category: 'Credit Card', // Special Category
        current_balance: 0, // Starts with 0 debt
        status: 'ACTIVE',
        createdAt: now,
        credit_card_details: {
            bank_name: formData.bankName,
            credit_limit: Number(formData.limit),
            statement_day: Number(formData.statementDay),
            due_day: Number(formData.dueDay),
            interest_rate: 0, // Usually handled dynamically if unpaid
            card_last_digits: formData.lastDigits || '0000',
            card_color: formData.color
        },
        investment_logs: [{
            id: crypto.randomUUID(),
            date: now.split('T')[0],
            type: 'BUY', // Using BUY as 'Opening'
            price: 0,
            note: 'Activated Credit Card'
        }]
      };

      batch.set(newRef, newCard);
      await batch.commit();
      onClose();
    } catch (e: any) {
      alert("Error adding card: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        <div className="p-6 border-b flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                 <CreditCard size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Thêm Thẻ Tín Dụng</h3>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] no-scrollbar">
           <AmountInput 
             label="Hạn mức tín dụng (Limit)" 
             value={formData.limit} 
             onChange={v => setFormData({...formData, limit: v})} 
             autoFocus 
           />

           <div className="grid grid-cols-2 gap-4">
              <StandardInput label="Ngân hàng" value={formData.bankName} onChange={v => setFormData({...formData, bankName: v})} placeholder="VD: HSBC, VIB" />
              <StandardInput label="Tên gợi nhớ" value={formData.cardName} onChange={v => setFormData({...formData, cardName: v})} placeholder="VD: Thẻ chi tiêu, Thẻ hoàn tiền" />
           </div>

           <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày chốt sao kê</label>
                 <select value={formData.statementDay} onChange={e => setFormData({...formData, statementDay: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none">
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày hạn TT</label>
                 <select value={formData.dueDay} onChange={e => setFormData({...formData, dueDay: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none">
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
              </div>
              <StandardInput label="4 số cuối" value={formData.lastDigits} onChange={v => setFormData({...formData, lastDigits: v})} placeholder="XXXX" type="number" />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Màu thẻ</label>
              <div className="flex gap-3">
                 {['black', 'platinum', 'gold', 'blue'].map((color) => (
                    <button 
                      key={color} 
                      onClick={() => setFormData({...formData, color: color as any})}
                      className={`flex-1 h-12 rounded-xl transition-all ${formData.color === color ? 'ring-4 ring-indigo-100 scale-105' : 'opacity-60'} ${
                        color === 'gold' ? 'bg-gradient-to-r from-amber-300 to-amber-500' :
                        color === 'platinum' ? 'bg-gradient-to-r from-slate-300 to-slate-500' :
                        color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-800' :
                        'bg-gradient-to-r from-gray-700 to-black'
                      }`}
                    />
                 ))}
              </div>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
           <button onClick={handleSave} disabled={loading || !formData.bankName} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Lưu Thẻ
           </button>
        </div>
      </div>
    </div>
  );
};

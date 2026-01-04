
import React from 'react';
import { Plus, ChevronDown, Percent, User } from 'lucide-react';
import { Category } from '../../types';

interface NewAccountFormProps {
  formData: any;
  setFormData: (val: any) => void;
  availableCategories: Category[];
  sourceGroup: string;
}

export const NewAccountForm: React.FC<NewAccountFormProps> = ({ formData, setFormData, availableCategories, sourceGroup }) => {
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || parseFloat(val) >= 0) {
      setFormData({ ...formData, newInterestRate: val });
    }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên tài khoản mới</label>
        <div className="relative">
          <input type="text" value={formData.newName} onChange={e => setFormData({ ...formData, newName: e.target.value })} placeholder="VD: Ví tiết kiệm mới, Khoản vay B..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-200 transition-all shadow-inner" autoFocus />
          <Plus size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loại (Category)</label>
          <div className="relative">
            <select value={formData.newCategory} onChange={e => setFormData({ ...formData, newCategory: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none appearance-none focus:bg-white focus:border-indigo-200">
              {availableCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lãi suất (%/năm)</label>
          <div className="relative">
            <input 
              type="number" 
              min="0"
              value={formData.newInterestRate} 
              onChange={handleRateChange} 
              onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
              placeholder="0.0" 
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-200" 
            />
            <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>
      {((sourceGroup === 'CAPITAL' && formData.newCategory !== 'Equity Fund') || (sourceGroup === 'ASSETS' && (formData.newCategory === 'Lending' || formData.newCategory === 'Receivables'))) && (
        <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên {sourceGroup === 'CAPITAL' ? 'chủ nợ' : 'con nợ'}</label>
          <div className="relative">
            <input type="text" value={formData.newOwnerName} onChange={e => setFormData({ ...formData, newOwnerName: e.target.value })} placeholder="VD: Ngân hàng ACB, Anh Ba..." className="w-full px-10 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-200 transition-all" />
            <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      )}
    </div>
  );
};

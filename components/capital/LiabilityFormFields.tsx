
import React from 'react';
import { Percent } from 'lucide-react';
import { DateInput } from '../ui/DateInput';

interface LiabilityFormFieldsProps {
  formData: any;
  setFormData: (val: any) => void;
}

export const LiabilityFormFields: React.FC<LiabilityFormFieldsProps> = ({ formData, setFormData }) => {
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || parseFloat(val) >= 0) {
      setFormData({...formData, interest_rate: val});
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate (%)</label>
        <div className="relative">
          <input 
            type="number" 
            min="0"
            value={formData.interest_rate} 
            onChange={handleRateChange} 
            onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
            placeholder="0.0" 
            className="w-full px-4 py-3.5 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none pr-10" 
          />
          <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interest Period</label>
        <select 
          value={formData.interest_period} 
          onChange={(e) => setFormData({...formData, interest_period: e.target.value as any})} 
          className="w-full px-4 py-3.5 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 outline-none appearance-none"
        >
          <option value="YEARLY">Yearly (APR)</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Cycle</label>
        <select 
          value={formData.payment_cycle} 
          onChange={(e) => setFormData({...formData, payment_cycle: e.target.value as any})} 
          className="w-full px-4 py-3.5 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 outline-none appearance-none"
        >
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="SEMI_ANNUAL">Semi-Annual</option>
          <option value="YEARLY">Yearly</option>
          <option value="END_OF_TERM">End of Term</option>
        </select>
      </div>
      <DateInput 
        label="Start Date"
        value={formData.start_date}
        onChange={(val) => setFormData({...formData, start_date: val})}
      />
      <div className="col-span-2">
        <DateInput 
          label="End Date (Maturity)"
          value={formData.end_date}
          onChange={(val) => setFormData({...formData, end_date: val})}
        />
      </div>
    </div>
  );
};

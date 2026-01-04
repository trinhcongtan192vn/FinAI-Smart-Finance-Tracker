
import React from 'react';
import { Percent, Calendar } from 'lucide-react';
import { DateInput } from '../../ui/DateInput';

interface LendingDetailsFormProps {
  formData: any;
  onInputChange: (key: string, val: any) => void;
  handleRateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LendingDetailsForm: React.FC<LendingDetailsFormProps> = ({ 
  formData, onInputChange, handleRateChange 
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lãi suất</label>
          <div className="relative">
            <input type="number" min="0" value={formData.rate} onChange={handleRateChange} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none" />
            <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kỳ hạn lãi</label>
          <select value={formData.interestPeriod} onChange={e => onInputChange('interestPeriod', e.target.value)} className="w-full px-3 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 text-[10px] outline-none appearance-none">
            <option value="MONTHLY">% / tháng</option>
            <option value="YEARLY">% / năm (APR)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateInput label="Ngày giải ngân" value={formData.startDate} onChange={val => onInputChange('startDate', val)} />
        <DateInput label="Ngày đáo hạn" value={formData.endDate} onChange={val => onInputChange('endDate', val)} />
      </div>
    </>
  );
};

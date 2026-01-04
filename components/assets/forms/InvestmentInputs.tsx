
import React from 'react';
import { Layers, Percent } from 'lucide-react';
import { DateInput } from '../../ui/DateInput';
import { currencyFormatter } from '../../../lib/utils';

interface InvestmentInputsProps {
  units: string;
  price: string;
  fees: string;
  date: string;
  onInputChange: (key: string, val: string) => void;
  calculatedTotal: number;
}

export const InvestmentInputs: React.FC<InvestmentInputsProps> = ({ 
  units, price, fees, date, onInputChange, calculatedTotal 
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số lượng</label>
          <div className="relative">
            <input 
              type="number" value={units} 
              onChange={e => onInputChange('units', e.target.value)} 
              placeholder="0.00" 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none shadow-inner" autoFocus 
            />
            <Layers size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn giá mua</label>
          <div className="relative">
            <input 
              type="number" value={price} 
              onChange={e => onInputChange('price', e.target.value)} 
              placeholder="0" 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none shadow-inner" 
            />
            <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phí giao dịch</label>
          <input 
            type="number" value={fees} 
            onChange={e => onInputChange('fees', e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none shadow-inner" 
          />
        </div>
        <DateInput label="Ngày mua" value={date} onChange={(val) => onInputChange('date', val)} />
      </div>

      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tổng giá trị</span>
        <span className="text-xl font-black text-indigo-900">{currencyFormatter.format(calculatedTotal)}</span>
      </div>
    </div>
  );
};

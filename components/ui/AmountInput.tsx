
import React from 'react';
import { currencyFormatter } from '../../lib/utils';

interface AmountInputProps {
  value: string | number;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({ value, onChange, label, placeholder = "0", autoFocus }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e') {
      e.preventDefault();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-1">{label}</label>}
      <div className="relative group">
        <input 
          type="number" 
          min="0"
          value={value} 
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-6 py-8 text-4xl font-black text-slate-900 bg-slate-50 rounded-[2.5rem] border-2 border-transparent focus:border-indigo-100 focus:bg-white transition-all outline-none text-center shadow-inner placeholder:text-slate-200" 
        />
        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl group-focus-within:text-indigo-500 transition-colors">đ</div>
      </div>
      <p className="text-center text-[11px] font-bold text-indigo-600 mt-1">
        {value ? currencyFormatter.format(Number(value)) : 'Enter transaction value'}
      </p>
    </div>
  );
};

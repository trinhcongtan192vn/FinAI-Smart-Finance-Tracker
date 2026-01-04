
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface StandardSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  label?: string;
}

export const StandardSelect: React.FC<StandardSelectProps> = ({ value, onChange, options, label }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-900 focus:border-indigo-100 focus:bg-white outline-none appearance-none shadow-sm cursor-pointer"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
      </div>
    </div>
  );
};

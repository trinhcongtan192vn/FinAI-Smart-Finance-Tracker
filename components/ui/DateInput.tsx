
import React from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, label }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group overflow-hidden bg-slate-50 border border-slate-100 rounded-2xl transition-all focus-within:border-indigo-100 focus-within:bg-white shadow-sm">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
          <Calendar size={18} />
        </div>
        <input 
          type="date" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer appearance-none"
          style={{ colorScheme: 'light' }}
        />
      </div>
    </div>
  );
};

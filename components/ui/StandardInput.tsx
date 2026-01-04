
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StandardInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  type?: string;
  icon?: LucideIcon;
}

export const StandardInput: React.FC<StandardInputProps> = ({ value, onChange, label, placeholder, type = "text", icon: Icon }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (type === 'number') {
      if (val === '') {
        onChange('');
        return;
      }
      const num = parseFloat(val);
      if (num < 0) return;
    }
    onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === 'number' && (e.key === '-' || e.key === 'e')) {
      e.preventDefault();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group">
        <input 
          type={type} 
          min={type === 'number' ? "0" : undefined}
          value={value} 
          onChange={handleChange} 
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-12' : 'px-6'} py-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:border-indigo-100 focus:bg-white outline-none transition-all shadow-sm`} 
        />
        {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />}
      </div>
    </div>
  );
};

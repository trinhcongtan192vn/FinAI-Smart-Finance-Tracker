
import React from 'react';

interface Option {
  label: string;
  value: string;
  color?: string;
  activeColor?: string;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (val: any) => void;
  label?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange, label }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/50 shadow-inner relative">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 relative z-10 ${
                isActive 
                  ? (opt.activeColor || 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5') 
                  : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

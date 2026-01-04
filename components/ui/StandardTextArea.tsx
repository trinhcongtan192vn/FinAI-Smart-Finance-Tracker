
import React from 'react';

interface StandardTextAreaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  rows?: number;
}

export const StandardTextArea: React.FC<StandardTextAreaProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  autoFocus,
  rows = 4 
}) => {
  return (
    <div className="flex flex-col gap-2 h-full">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="flex-1 relative group">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={rows}
          className="w-full h-full p-6 bg-slate-50/50 border-2 border-transparent rounded-[2rem] text-xl font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-100 transition-all resize-none shadow-inner leading-relaxed"
        />
      </div>
    </div>
  );
};

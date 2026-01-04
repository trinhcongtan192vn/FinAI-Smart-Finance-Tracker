import React from 'react';

interface ReportTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onTabChange?: () => void;
}

export const ReportTabs: React.FC<ReportTabsProps> = ({ activeTab, setActiveTab, onTabChange }) => {
  return (
    <div className="flex p-1 bg-white border border-slate-100 rounded-2xl mb-6 relative shadow-sm">
      {["Week", "Month", "Year"].map((label) => (
        <button 
          key={label} 
          onClick={() => { 
            setActiveTab(label); 
            if (onTabChange) onTabChange();
          }} 
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 z-10 ${
            activeTab === label 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
import React from 'react';
import { currencyFormatter } from '../../lib/utils';

interface ReportSummaryCardProps {
  netSavings: number;
  activeTab: string;
  transactionCount: number;
}

export const ReportSummaryCard: React.FC<ReportSummaryCardProps> = ({ netSavings, activeTab, transactionCount }) => {
  return (
    <div className="mb-6">
       <div className="flex flex-col items-center justify-center py-8 bg-white rounded-[2rem] shadow-soft border border-indigo-50/50 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Net Cash Flow ({activeTab})</span>
          <h2 className={`text-4xl font-black tracking-tight mb-2 ${netSavings >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
            {currencyFormatter.format(netSavings)}
          </h2>
          <span className="text-xs font-bold text-slate-500">{transactionCount} active entries</span>
       </div>
    </div>
  );
};

import React from 'react';
import { Table as TableIcon, Info } from 'lucide-react';
import { formatCurrencyCompact } from '../../../lib/utils';
import { SimulationYear } from '../../../types';

interface FIRESimulationTableProps {
  data: SimulationYear[];
  retirementAge: number;
}

export const FIRESimulationTable: React.FC<FIRESimulationTableProps> = ({ data, retirementAge }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-soft overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="overflow-x-auto max-h-[600px] no-scrollbar">
        <table className="w-full text-left text-[10px] border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b">
            <tr>
              <th className="px-3 py-4 font-black text-slate-400 uppercase">Tuổi</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Thu nhập</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Chi phí</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Bond Yield</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Cash Yield</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Đệm Tiền</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Bond Asset</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Stock Asset</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-right">Tổng Tài Sản</th>
              <th className="px-3 py-4 font-black text-slate-400 uppercase text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((year, idx) => (
              <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${year.age === retirementAge ? 'bg-orange-50/50' : ''}`}>
                <td className="px-3 py-3.5 font-bold text-slate-900">{year.age} {year.age === retirementAge && '🚀'}</td>
                <td className="px-3 py-3.5 text-right font-medium text-emerald-600">{formatCurrencyCompact(year.income)}</td>
                <td className="px-3 py-3.5 text-right font-medium text-rose-500">{formatCurrencyCompact(year.expenses)}</td>
                <td className="px-3 py-3.5 text-right font-medium text-indigo-600">{formatCurrencyCompact(year.bondYield)}</td>
                <td className="px-3 py-3.5 text-right font-medium text-amber-600">{formatCurrencyCompact(year.cashInterest)}</td>
                <td className="px-3 py-3.5 text-right font-bold text-emerald-700">{formatCurrencyCompact(year.cashCushion)}</td>
                <td className="px-3 py-3.5 text-right font-bold text-indigo-700">{formatCurrencyCompact(year.bondAsset)}</td>
                <td className="px-3 py-3.5 text-right font-bold text-indigo-500">{formatCurrencyCompact(year.stockAsset)}</td>
                <td className="px-3 py-3.5 text-right font-black text-slate-900">{formatCurrencyCompact(year.totalPortfolio)}</td>
                <td className="px-3 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                    year.status === 'ACCUMULATION' ? 'bg-indigo-50 text-indigo-600' :
                    year.status === 'PROSPERITY' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {year.status === 'ACCUMULATION' ? 'Tích lũy' :
                     year.status === 'PROSPERITY' ? 'Thịnh vượng' : 'Bảo vệ'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

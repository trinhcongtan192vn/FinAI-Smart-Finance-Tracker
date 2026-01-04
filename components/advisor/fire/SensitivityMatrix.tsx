
import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface SensitivityMatrixProps {
  matrix: any[];
  currentSavingsRate: number;
}

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = ({ matrix, currentSavingsRate }) => {
  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <LayoutGrid size={18} className="text-indigo-600" />
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ma Trận Nhạy Cảm FIRE</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số năm đạt mục tiêu dựa trên biến số Lợi nhuận kỳ vọng & Tiết kiệm</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-soft overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-center border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="p-2 text-[9px] font-black text-slate-400 uppercase whitespace-nowrap text-left">LỢI NHUẬN \ TIẾT KIỆM</th>
                {[20, 30, 40, 50, 60, 70].map(sr => (
                  <th key={sr} className="p-2 text-[10px] font-black text-slate-900 uppercase">{sr}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.rate}>
                  <td className="p-2 text-[10px] font-black text-slate-900 text-left">{row.rate}%</td>
                  {row.results.map((cell: any, idx: number) => {
                    const isCurrent = Math.abs(cell.sr - currentSavingsRate) < 5;

                    let bgColor = 'bg-slate-200 text-slate-600';
                    if (cell.years <= 5) bgColor = 'bg-emerald-500 text-white';
                    else if (cell.years <= 15) bgColor = 'bg-teal-400 text-white';
                    else if (cell.years <= 25) bgColor = 'bg-indigo-400 text-white';
                    else if (cell.years <= 30) bgColor = 'bg-blue-400 text-white';

                    return (
                      <td
                        key={idx}
                        className={`p-4 text-xs font-black rounded-xl transition-all relative ${bgColor} ${isCurrent ? 'ring-4 ring-emerald-300 ring-offset-2 scale-105 z-10' : ''}`}
                      >
                        {cell.years > 50 ? '50+' : cell.years}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matrix Legend */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-50">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">&lt; 5 NĂM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">10-15 NĂM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">30+ NĂM</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-md ring-2 ring-emerald-300 ring-offset-1"></div>
            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Thiết lập hiện tại</span>
          </div>
        </div>
      </div>
    </div>
  );
};

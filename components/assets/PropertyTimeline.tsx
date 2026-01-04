
import React from 'react';
import { ShoppingCart, Hammer, ReceiptText, Activity, DollarSign, Calendar, Info } from 'lucide-react';
import { InvestmentLog } from '../../types';
import { currencyFormatter } from '../../lib/utils';

interface PropertyTimelineProps {
  logs: InvestmentLog[];
}

export const PropertyTimeline: React.FC<PropertyTimelineProps> = ({ logs }) => {
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getLogConfig = (type: string) => {
    switch (type) {
      case 'BUY': return { icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Mua tài sản' };
      case 'CAPEX': return { icon: Hammer, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Đầu tư thêm' };
      case 'OPEX': return { icon: ReceiptText, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Chi phí duy trì' };
      case 'REVALUE': return { icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Định giá lại' };
      case 'SELL': return { icon: DollarSign, color: 'text-slate-900', bg: 'bg-slate-100', label: 'Tất toán (Bán)' };
      default: return { icon: Info, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Sự kiện khác' };
    }
  };

  if (sortedLogs.length === 0) return (
    <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
       <Calendar size={32} className="mx-auto mb-2 text-slate-200" />
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chưa có lịch sử biến động</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Vertical Line Connector */}
      <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-slate-100"></div>

      {sortedLogs.map((log, idx) => {
        const config = getLogConfig(log.type);
        const Icon = config.icon;
        
        return (
          <div key={log.id || idx} className="flex gap-4 relative animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
             <div className={`w-11 h-11 rounded-2xl ${config.bg} ${config.color} flex items-center justify-center shrink-0 shadow-sm relative z-10 border-4 border-white`}>
                <Icon size={18} />
             </div>
             
             <div className="flex-1 pt-1">
                <div className="flex justify-between items-start mb-1">
                   <h4 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">{config.label}</h4>
                   <span className="text-[10px] font-bold text-slate-400">{new Date(log.date).toLocaleDateString('vi-VN')}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                   <p className="text-xs font-black text-slate-600">
                      {log.type === 'OPEX' ? '-' : ''}{currencyFormatter.format(log.price)}
                   </p>
                   {log.note && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                         <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">"{log.note}"</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        );
      })}
    </div>
  );
};


import React from 'react';
import { Calendar, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { ScheduledEvent } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface UpcomingEventsWidgetProps {
  events: ScheduledEvent[];
  onEventClick?: (event: ScheduledEvent) => void;
}

export const UpcomingEventsWidget: React.FC<UpcomingEventsWidgetProps> = ({ events, onEventClick }) => {
  const { t } = useTranslation();
  
  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
           <Calendar size={18} className="text-indigo-600" />
           Sự kiện sắp tới
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">{events.length} Upcoming</span>
      </div>
      
      <div className="flex flex-col gap-3">
        {events.slice(0, 3).map((event) => {
           const isToday = new Date().toISOString().split('T')[0] === event.date;
           const isInflow = event.type === 'INFLOW';
           
           return (
             <div 
               key={event.id} 
               onClick={() => onEventClick && onEventClick(event)}
               className={`p-4 rounded-[1.5rem] border flex items-center justify-between shadow-sm relative overflow-hidden transition-all cursor-pointer hover:shadow-md active:scale-95 ${isToday ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100'}`}
             >
                {isToday && <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500"></div>}
                
                <div className="flex items-center gap-3 min-w-0">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isInflow ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {isInflow ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                   </div>
                   <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className={`text-[10px] font-black uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {new Date(event.date).toLocaleDateString('vi-VN')}
                         </span>
                         {isToday && <span className="text-[8px] font-black bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded">HÔM NAY</span>}
                      </div>
                   </div>
                </div>
                
                <div className="text-right shrink-0">
                   <p className={`text-sm font-black ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isInflow ? '+' : '-'}{currencyFormatter.format(event.amount)}
                   </p>
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};

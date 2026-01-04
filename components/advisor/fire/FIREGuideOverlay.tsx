
import React from 'react';
import { X, TrendingUp, ShieldCheck, Coins, AlertTriangle, CheckCircle2, BookOpen, Info, ArrowRight } from 'lucide-react';

interface FIREGuideOverlayProps {
  onClose: () => void;
}

export const FIREGuideOverlay: React.FC<FIREGuideOverlayProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-[60] bg-white animate-in fade-in duration-300 flex flex-col">
      {/* Header - Fixed to top */}
      <div className="bg-white px-6 py-5 flex justify-between items-center border-b border-slate-100 shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Hướng Dẫn FIRE</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Triết lý "Quit Like a Millionaire"</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2.5 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors active:scale-90"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Area - Scrollable with clear background */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/30">
        <div className="max-w-2xl mx-auto p-6 space-y-8 pb-24">
          
          {/* Intro Message */}
          <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
             <div className="flex gap-4 relative z-10">
                <Info size={24} className="text-white shrink-0" />
                <p className="text-sm font-bold text-white leading-relaxed italic">
                  "Chiến lược này giúp bạn nghỉ hưu sớm mà không lo lắng về biến động thị trường thông qua việc quản trị rủi ro thông minh."
                </p>
             </div>
          </div>

          {/* Methodology Sections */}
          <div className="grid grid-cols-1 gap-6">
            
            <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" /> Quy Tắc 4% (FIRE)
              </h3>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed font-medium">
                <p>Phương pháp FIRE khẳng định rằng bạn có thể rút <span className="text-slate-900 font-bold">4% tài sản hàng năm</span> mà không làm cạn kiệt tiền gốc trong ít nhất 30 năm.</p>
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-center">
                  <p className="text-xs font-black text-indigo-900">Số tiền FIRE = Chi phí hàng năm × 25</p>
                </div>
                <p className="text-[11px] text-slate-400 italic">Đây là con số tối thiểu để đạt tự do tài chính.</p>
              </div>
            </section>

            <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" /> Đệm Tiền Mặt (Cash Cushion)
              </h3>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed font-medium">
                <p>Là khoản tiền mặt dự phòng tương đương <span className="text-slate-900 font-bold">2-3 năm chi phí</span>, tách biệt khỏi danh mục đầu tư.</p>
                <ul className="space-y-2.5">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-1 shrink-0" /> 
                    <span>Giúp tránh việc phải <span className="text-rose-600 font-bold">bán tháo cổ phiếu</span> khi thị trường đang ở đáy (Bear Market).</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-1 shrink-0" /> 
                    <span>Rút từ "Đệm" khi thị trường giảm, nạp lại đệm khi thị trường tăng trưởng xanh.</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                <Coins size={18} className="text-amber-500" /> Lá Chắn Cổ Tức (Yield Shield)
              </h3>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed font-medium">
                <p>Chuyển dịch cơ cấu danh mục sang tài sản tạo thu nhập thụ động như <span className="text-slate-900 font-bold">Trái phiếu</span> hoặc <span className="text-slate-900 font-bold">Cổ tức</span>.</p>
                <p>Ưu tiên dùng tiền mặt từ lợi tức thay vì bán gốc tài sản, giúp danh mục bền vững hơn qua các chu kỳ kinh tế.</p>
              </div>
            </section>

            <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" /> Rủi ro Trình tự Lợi nhuận
              </h3>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed font-medium">
                <p>Nếu thị trường sụp đổ ngay khi nghỉ hưu, Portfolio sẽ bị <span className="text-rose-600 font-bold">"chảy máu" nhanh gấp đôi</span> do vừa lỗ vừa phải rút tiền chi tiêu.</p>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <p className="text-[10px] font-bold text-rose-900 leading-relaxed uppercase">
                    Giả lập này cho phép bạn mô phỏng kịch bản "Khủng hoảng" 3 năm đầu nghỉ hưu để kiểm tra độ bền của Đệm tiền mặt.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 text-white p-7 rounded-[2.5rem] shadow-2xl space-y-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Cơ chế rút tiền trong App</h3>
              <div className="space-y-4">
                {[
                  "Dùng Cổ tức (Yield Shield) đầu tiên.",
                  "Dùng Đệm tiền mặt nếu năm đó Thị trường Gấu.",
                  "Nạp lại Đệm tiền mặt khi Thị trường tăng trưởng."
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-black border border-white/10">{i+1}</div>
                    <span className="text-xs font-bold text-slate-200">{step}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer - Fixed to bottom */}
      <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={onClose}
          className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          Bắt đầu lập kế hoạch <ArrowRight size={20} className="text-indigo-400" />
        </button>
      </div>
    </div>
  );
};

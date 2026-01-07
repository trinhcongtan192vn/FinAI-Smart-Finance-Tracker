
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Star, PartyPopper } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';

interface EarlyFeedbackModalProps {
  onClose: () => void;
  uid: string;
}

export const EarlyFeedbackModal: React.FC<EarlyFeedbackModalProps> = ({ onClose, uid }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to mark the prompt as seen so it doesn't appear again
  const markAsSeen = async () => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        hasSeenFeedbackPrompt: true
      });
    } catch (e) {
      console.error("Failed to mark feedback prompt as seen", e);
    }
  };

  const handleClose = async () => {
    await markAsSeen();
    onClose();
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const user = auth.currentUser;

      const message = `
🎉 *EARLY USER FEEDBACK (5 Txns)*
---------------------------
👤 *User:* ${user?.email || uid}
📝 *Feedback:*
${content.trim()}
📅 *Time:* ${new Date().toLocaleString('vi-VN')}
      `;

      await fetch('/api/telegram/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message
        })
      });

      await markAsSeen();
      onClose();
      alert("Cảm ơn bạn! Ý kiến của bạn đã được ghi nhận.");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={!loading ? handleClose : undefined}></div>
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header Decor */}
        <div className="bg-indigo-600 p-6 pt-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white/10">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:10px_10px] opacity-30"></div>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-3 text-amber-400">
              <PartyPopper size={32} />
            </div>
            <h3 className="text-xl font-black text-white">5 Giao dịch đầu tiên!</h3>
            <p className="text-indigo-100 text-xs font-medium mt-1 px-4">
              Chúc mừng bạn đã bắt đầu hành trình quản lý tài chính. Bạn thấy ứng dụng thế nào?
            </p>
          </div>
          <button onClick={handleClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Góp ý của bạn</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ứng dụng dễ dùng không? Bạn muốn thêm tính năng gì?"
              className="w-full h-32 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-200 focus:bg-white transition-all resize-none"
              autoFocus
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Gửi Góp ý
          </button>

          <button
            onClick={handleClose}
            disabled={loading}
            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

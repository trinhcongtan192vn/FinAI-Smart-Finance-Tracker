
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, MessageSquare, Bug, Lightbulb, Sparkles, CheckCircle2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';

interface FeedbackModalProps {
  onClose: () => void;
}

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
// Updated Group Chat ID
const TELEGRAM_CHAT_ID = "-5008015561";

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState<'General' | 'Bug' | 'Feature'>('General');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please sign in to send feedback.");
        setLoading(false);
        return;
      }

      // 1. Save to Firestore (Persistent Record)
      await addDoc(collection(db, 'users', user.uid, 'feedbacks'), {
        uid: user.uid,
        user_email: user.email || 'anonymous',
        topic: topic,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: 'PENDING'
      });

      // 2. Send Notification to Telegram Group
      try {
        const message = `
🚀 *New FinAI Feedback*
---------------------------
📌 *Topic:* ${topic}
👤 *User:* ${user.email}
📝 *Content:*
${content.trim()}
        `;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgError) {
        console.warn("Telegram notification failed (Check Chat ID):", tgError);
        // We don't block the success flow if Telegram fails, as data is safe in Firestore
      }

      setShowToast(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error(error);
      alert("Error sending feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const topics = [
    { id: 'General', label: 'Chung', icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { id: 'Bug', label: 'Báo lỗi', icon: Bug, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    { id: 'Feature', label: 'Tính năng', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">

        <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{t('settings.help_feedback')}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Chúng tôi lắng nghe bạn</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">

          {/* Topic Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ đề góp ý</label>
            <div className="grid grid-cols-3 gap-3">
              {topics.map((t) => {
                const isSelected = topic === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTopic(t.id as any)}
                    className={`flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all duration-200 ${isSelected
                        ? `${t.bg} ${t.color} ${t.border} shadow-sm scale-[1.02]`
                        : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-black uppercase tracking-wide">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('feedback.placeholder')}
              className="w-full h-40 p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-100 focus:bg-white transition-all resize-none shadow-inner"
              autoFocus
            />
          </div>

          {/* Helper Text */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-[10px] font-medium text-indigo-900 leading-relaxed flex gap-3">
            <MessageSquare size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <p>
              Góp ý của bạn sẽ được gửi trực tiếp đến <strong>Trung tâm hỗ trợ FinAI</strong> (Telegram). Chúng tôi sẽ phản hồi sớm nhất có thể.
            </p>
          </div>
        </div>

        <div className="p-6 pt-0 bg-white">
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
          >
            {loading ? <Loader2 size={20} className="animate-spin text-indigo-400" /> : <Send size={20} className="text-indigo-400" />}
            {t('feedback.submit')}
          </button>
        </div>

        {/* Success Toast */}
        {showToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 z-50">
            <CheckCircle2 size={24} className="text-emerald-400" />
            <div>
              <p className="text-sm font-bold">{t('feedback.success')}</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

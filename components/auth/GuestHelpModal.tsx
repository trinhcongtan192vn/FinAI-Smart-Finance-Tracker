
import React, { useState } from 'react';
import { X, Sparkles, User, Phone, Mail, MessageSquare, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = "8313929993:AAFJvH3Xss5L0ttWL07zqexh1DVHfo6jddE";
const TELEGRAM_CHAT_ID = "-5008015561";

interface GuestHelpModalProps {
  onClose: () => void;
}

export const GuestHelpModal: React.FC<GuestHelpModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [helpForm, setHelpForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [isSendingHelp, setIsSendingHelp] = useState(false);
  const [helpSent, setHelpSent] = useState(false);

  const submitHelp = async () => {
    if (!helpForm.name || !helpForm.phone || !helpForm.email || !helpForm.message) return;
    setIsSendingHelp(true);
    try {
        // 1. Send to Telegram
        const message = `
🆘 *GUEST HELP REQUEST*
---------------------------
👤 *Name:* ${helpForm.name}
📱 *Phone:* ${helpForm.phone}
📧 *Email:* ${helpForm.email}
📝 *Content:*
${helpForm.message}
📅 *Time:* ${new Date().toLocaleString('vi-VN')}
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

        // 2. Try Save to Firestore (Optional)
        try {
            await addDoc(collection(db, 'guest_feedbacks'), {
                ...helpForm,
                createdAt: new Date().toISOString(),
                status: 'PENDING'
            });
        } catch (e) { console.warn("Firestore write skipped (Rules)"); }

        setHelpSent(true);
        setTimeout(() => {
            onClose();
            setHelpSent(false);
            setHelpForm({ name: '', phone: '', email: '', message: '' });
        }, 2000);
    } catch (e) {
        alert("Failed to send request. Please try again.");
    } finally {
        setIsSendingHelp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{t('feedback.guest_title')}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('feedback.guest_subtitle')}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('feedback.your_name')} *</label>
                        <div className="relative">
                            <input type="text" value={helpForm.name} onChange={e => setHelpForm({...helpForm, name: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-100 transition-all font-bold text-slate-900 outline-none shadow-sm" placeholder="VD: Nguyen Van A" />
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('feedback.your_phone')} *</label>
                        <div className="relative">
                            <input type="tel" value={helpForm.phone} onChange={e => setHelpForm({...helpForm, phone: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-100 transition-all font-bold text-slate-900 outline-none shadow-sm" placeholder="090..." />
                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('feedback.your_email')} *</label>
                        <div className="relative">
                            <input type="email" value={helpForm.email} onChange={e => setHelpForm({...helpForm, email: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-100 transition-all font-bold text-slate-900 outline-none shadow-sm" placeholder="contact@example.com" />
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('feedback.message')} *</label>
                        <div className="relative">
                            <textarea value={helpForm.message} onChange={e => setHelpForm({...helpForm, message: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-100 transition-all font-bold text-slate-900 outline-none shadow-sm h-32 resize-none" placeholder="..." />
                            <MessageSquare size={18} className="absolute left-4 top-4 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                <button 
                    onClick={submitHelp} 
                    disabled={isSendingHelp || !helpForm.name || !helpForm.phone || !helpForm.email || !helpForm.message} 
                    className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                    {isSendingHelp ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Send size={18} className="text-indigo-400" />}
                    {isSendingHelp ? "Sending..." : t('feedback.submit')}
                </button>
            </div>

            {helpSent && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <CheckCircle2 size={48} className="text-emerald-500 mb-4 animate-bounce" />
                    <h3 className="text-xl font-black text-slate-900">{t('feedback.success')}</h3>
                </div>
            )}
        </div>
    </div>
  );
};

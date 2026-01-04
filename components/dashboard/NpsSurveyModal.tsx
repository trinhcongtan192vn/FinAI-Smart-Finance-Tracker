
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Star, Heart, ThumbsUp } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';

interface NpsSurveyModalProps {
    onClose: () => void;
    uid: string;
}

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = "-5008015561";

export const NpsSurveyModal: React.FC<NpsSurveyModalProps> = ({ onClose, uid }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [happiness, setHappiness] = useState<number | null>(null);
    const [nps, setNps] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const markAsSeen = async () => {
        try {
            await updateDoc(doc(db, 'users', uid), {
                hasSeenNpsSurvey: true
            });
        } catch (e) {
            console.error("Failed to mark NPS prompt as seen", e);
        }
    };

    const handleClose = async () => {
        await markAsSeen();
        onClose();
    };

    const handleSubmit = async (selectedNps: number) => {
        setNps(selectedNps);
        setLoading(true);

        try {
            const user = auth.currentUser;

            // Determine NPS Category
            let npsCategory = "😐 Passive";
            if (selectedNps >= 9) npsCategory = "🚀 Promoter";
            else if (selectedNps <= 6) npsCategory = "🔻 Detractor";

            const message = `
📊 *NPS & HAPPINESS SURVEY*
---------------------------
👤 *User:* ${user?.email || uid}
⭐️ *Happiness:* ${happiness}/5
📈 *NPS:* ${selectedNps}/10 (${npsCategory})
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

            await markAsSeen();
            setTimeout(() => {
                onClose();
                alert(t('nps_survey.thank_you'));
            }, 500);
        } catch (error) {
            console.error(error);
            onClose(); // Close anyway on error
        } finally {
            setLoading(false);
        }
    };

    const renderStars = () => {
        return (
            <div className="flex gap-2 justify-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => { setHappiness(star); setTimeout(() => setStep(2), 300); }}
                        className="transition-transform active:scale-90 hover:scale-110 focus:outline-none"
                    >
                        <Star
                            size={36}
                            className={`${(happiness || 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                            strokeWidth={3}
                        />
                    </button>
                ))}
            </div>
        );
    };

    const renderNpsButtons = () => {
        return (
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-2 mb-2">
                {Array.from({ length: 11 }, (_, i) => i).map((num) => {
                    let bgClass = "bg-slate-50 text-slate-600 border-slate-200";
                    let activeClass = "hover:bg-slate-100";

                    if (nps === num) {
                        if (num <= 6) bgClass = "bg-rose-500 text-white border-rose-600";
                        else if (num <= 8) bgClass = "bg-amber-400 text-white border-amber-500";
                        else bgClass = "bg-emerald-500 text-white border-emerald-600";
                    }

                    return (
                        <button
                            key={num}
                            disabled={loading}
                            onClick={() => handleSubmit(num)}
                            className={`w-9 h-10 rounded-lg border font-black text-sm flex items-center justify-center transition-all active:scale-90 ${bgClass} ${nps === null ? activeClass : ''}`}
                        >
                            {loading && nps === num ? <Loader2 size={14} className="animate-spin" /> : num}
                        </button>
                    );
                })}
            </div>
        );
    };

    const getHappinessLabel = () => {
        if (!happiness) return t('nps_survey.rating_label');
        if (happiness === 5) return t('nps_survey.rating_excellent');
        if (happiness === 1) return t('nps_survey.rating_poor');
        return t('nps_survey.rating_label');
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
                    <button onClick={handleClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
                        <X size={20} />
                    </button>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-3 text-pink-500">
                            {step === 1 ? <Heart size={32} className="fill-pink-500" /> : <ThumbsUp size={32} />}
                        </div>
                        <h3 className="text-xl font-black text-white">
                            {step === 1 ? t('nps_survey.happiness_title') : t('nps_survey.nps_title')}
                        </h3>
                        <p className="text-indigo-100 text-xs font-medium mt-1 px-4">
                            {step === 1
                                ? t('nps_survey.happiness_question')
                                : t('nps_survey.nps_question')}
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <div className="flex flex-col items-center">
                            {renderStars()}
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                                {getHappinessLabel()}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            {renderNpsButtons()}
                            <div className="w-full flex justify-between px-1 mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>{t('nps_survey.not_likely')}</span>
                                <span>{t('nps_survey.very_likely')}</span>
                            </div>
                        </div>
                    )}
                </div>

                {step === 1 && (
                    <div className="px-6 pb-6">
                        <button
                            onClick={handleClose}
                            className="w-full py-2 text-xs font-bold text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            {t('nps_survey.later')}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

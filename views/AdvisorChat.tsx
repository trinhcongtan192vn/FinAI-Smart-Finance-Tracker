
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, Settings, ShieldAlert, Circle, Flame, Loader2 } from 'lucide-react';
import { ViewName, DataContext, FinancialProfile } from '../types';
import { useFinancialHealth } from '../hooks/useFinancialHealth';
import { useFinancialContext } from '../hooks/useFinancialContext';
import { RiskProfileModal } from '../components/advisor/RiskProfileModal';
import { FIREPlannerModal } from '../components/advisor/FIREPlannerModal';
import { useTranslation } from 'react-i18next';
import { ChatBubble } from '../components/advisor/ChatBubble';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdvisorChatProps {
    onNavigate: (view: ViewName) => void;
    activeContext: DataContext;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export const AdvisorChat: React.FC<AdvisorChatProps> = ({ onNavigate, activeContext }) => {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', role: 'assistant', content: t('advisor.welcome_msg') }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showFIREModal, setShowFIREModal] = useState(false);
    const [fireConfig, setFireConfig] = useState<any>(null);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    // Use relative path to leverage Vite proxy in dev and same-origin in prod
    const PROXY_URL = '/api/chat';

    const { accounts, pnlAnalysis, netWorthHistory } = useFinancialHealth(activeContext.uid);
    const currentNetWorth = netWorthHistory.find(d => d.date === 'Now')?.netWorth || 0;

    const contextString = useFinancialContext(
        accounts,
        activeContext.financialProfile,
        {
            savingsRate: pnlAnalysis.current.savingsRate,
            monthlyExpense: pnlAnalysis.current.expense.total
        },
        currentNetWorth
    );

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'users', activeContext.uid), (snap) => {
            if (snap.exists()) setFireConfig(snap.data().fireConfig);
        });
        return () => unsub();
    }, [activeContext.uid]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (!activeContext.financialProfile && !showProfileModal) {
            setShowProfileModal(true);
        }
    }, [activeContext.financialProfile, showProfileModal]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleProfileUpdate = (profile: FinancialProfile) => {
        setShowProfileModal(false);
        setMessages(prev => [...prev, {
            id: 'profile-update-' + Date.now(),
            role: 'assistant',
            content: t('advisor.profile_setup_done')
        }]);
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text }]);
        setInput('');
        setIsTyping(true);

        try {
            const payload = {
                query: text,
                user: activeContext.uid,
                fire_config: fireConfig,
                context_string: contextString,
                conversation_id: currentConversationId,
                language: i18n.language === 'vi' ? 'Vietnamese' : 'English'
            };

            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Kiểm tra content-type để tránh parse HTML thành JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const textError = await response.text();
                console.error("Lỗi API: Server trả về nội dung không phải JSON. Có thể do lỗi cấu hình Proxy.", textError.substring(0, 200));
                throw new Error("Không nhận được phản hồi hợp lệ từ máy chủ AI.");
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Lỗi từ AI Advisor');

            const reply = data.answer || "Xin lỗi, tôi gặp chút trục trặc khi trả lời.";
            if (data.conversation_id) setCurrentConversationId(data.conversation_id);

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
        } catch (error: any) {
            console.error("[Chat Error]", error);
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'assistant',
                content: `${t('advisor.error_msg')} (Debug: ${error.message})`
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] bg-slate-50 font-display">
            {/* Header */}
            <div className="bg-white px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate(ViewName.DASHBOARD)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 transition-all ${isTyping ? 'animate-pulse scale-110' : ''}`}>
                                <Sparkles size={20} />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 leading-tight text-sm">FinAI Expert</h3>
                            <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${isTyping ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                <Circle size={6} fill="currentColor" className={isTyping ? 'animate-ping' : ''} />
                                {isTyping ? 'Đang suy nghĩ...' : 'Sẵn sàng'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFIREModal(true)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${fireConfig ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                    >
                        <Flame size={20} />
                    </button>
                    <button id="advisor-settings-btn" onClick={() => setShowProfileModal(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-white rounded-xl">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <ChatBubble
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        animate={idx === messages.length - 1 && msg.role === 'assistant'}
                    />
                ))}

                {isTyping && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Loader2 size={16} className="animate-spin" />
                            </div>
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-center py-2 opacity-50">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                        <ShieldAlert size={10} /> {t('advisor.disclaimer')}
                    </div>
                </div>
            </div>

            {/* Input */}
            <div className="bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)] shrink-0 z-10">
                <div className="p-4 pt-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                            placeholder={t('advisor.input_placeholder')}
                            disabled={isTyping}
                            className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all shadow-inner"
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 top-2 bottom-2 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {showProfileModal && (
                <RiskProfileModal
                    uid={activeContext.uid}
                    onClose={() => setShowProfileModal(false)}
                    onComplete={handleProfileUpdate}
                    initialData={activeContext.financialProfile}
                />
            )}

            {showFIREModal && (
                <FIREPlannerModal
                    onClose={() => setShowFIREModal(false)}
                    uid={activeContext.uid}
                    initialData={fireConfig}
                />
            )}
        </div>
    );
};

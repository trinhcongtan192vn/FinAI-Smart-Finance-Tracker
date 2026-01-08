
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Database, ArrowRight, Briefcase, Landmark, Camera, Mic, MicOff, Lock, Check, Edit2, Trash2, ChevronDown, Wallet, CreditCard, Loader2, Image as ImageIcon } from 'lucide-react';
import { ViewName, Transaction, DataContext, TransactionType, Account, Category } from '../types';
import { GoogleGenAI } from "@google/genai";
import { collection, getDocs, query, where, writeBatch, doc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { compressImage, currencyFormatter, getCategoryIcon } from '../lib/utils';
import { ChatThread } from '../components/entry/ChatThread';
import { useTransactionLimit } from '../hooks/useTransactionLimit';

declare global {
    interface Window { webkitSpeechRecognition: any; SpeechRecognition: any; }
}

interface Message { role: 'user' | 'assistant'; content: string; image?: string; isProcessing?: boolean; }

export const NewEntry: React.FC<{ onNavigate: (v: ViewName) => void; onClose: () => void; setPendingTransactions: (t: Transaction[]) => void; activeContext: DataContext; }> = ({ onNavigate, onClose, setPendingTransactions, activeContext }) => {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t('new_entry.welcome_ai', { name: activeContext.displayName }) }]);
    const [inputValue, setInputValue] = useState("");
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Data State
    const [categories, setCategories] = useState<Category[]>([]);
    const [creditCards, setCreditCards] = useState<Account[]>([]);
    const [cashAccounts, setCashAccounts] = useState<Account[]>([]);

    // Transaction State
    const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showComplexHints, setShowComplexHints] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    // Transaction Limit Check
    const { isLimitReached, loading: limitLoading } = useTransactionLimit(activeContext.uid);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isLoading, showComplexHints, parsedTransactions]);

    const [defaultSourceId, setDefaultSourceId] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            // Fetch User Profile for Default Source
            try {
                const userDoc = await getDoc(doc(db, 'users', activeContext.uid));
                if (userDoc.exists()) {
                    setDefaultSourceId(userDoc.data().defaultSourceId || '');
                }
            } catch (e) { }

            const catSnap = await getDocs(collection(db, 'users', activeContext.uid, 'categories'));
            const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
            setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));

            const accSnap = await getDocs(collection(db, 'users', activeContext.uid, 'accounts'));
            const allAccs = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as Account));

            setCreditCards(allAccs.filter(a => a.category === 'Credit Card' && a.status === 'ACTIVE'));
            setCashAccounts(allAccs.filter(a => a.category === 'Cash' && a.status === 'ACTIVE'));
        };
        fetchData();

        return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
    }, [activeContext.uid]);

    const startSpeechRecognition = () => {
        const SR = window.Object.hasOwnProperty('SpeechRecognition') ? (window as any).SpeechRecognition : (window as any).webkitSpeechRecognition;
        if (!SR) return alert("Trình duyệt không hỗ trợ nhận diện giọng nói.");

        if (!recognitionRef.current) {
            recognitionRef.current = new SR();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
            recognitionRef.current.onresult = (e: any) => { setInputValue(e.results[0][0].transcript); setIsListening(false); };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        } else {
            recognitionRef.current.lang = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
        }
        try { recognitionRef.current.start(); setIsListening(true); } catch (e) { setIsListening(false); }
    };

    const toggleListening = async () => {
        if (isLimitReached) return;
        if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
        setInputValue("");
        try {
            let hasPerm = false;
            try { const permStatus = await navigator.permissions.query({ name: 'microphone' as any }); if (permStatus.state === 'granted') hasPerm = true; } catch (e) { }
            if (!hasPerm) { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(track => track.stop()); }
            startSpeechRecognition();
        } catch (err) { alert("Vui lòng cấp quyền Microphone."); setIsListening(false); }
    };

    const handleSendMessage = async () => {
        if (isLimitReached) { alert("Bạn đã đạt giới hạn giao dịch hàng tháng."); return; }
        if ((!inputValue.trim() && !attachedImage) || isLoading || activeContext.permission === 'view') return;

        const msg = inputValue.trim();
        const img = attachedImage;
        const todayStr = new Date().toISOString().split('T')[0];

        setMessages(prev => [...prev, { role: 'user', content: msg || "Processing...", image: img || undefined }]);
        setInputValue(""); setAttachedImage(null); setIsLoading(true); setShowComplexHints(false);

        try {
            // SỬ DỤNG BIẾN API_KEY CHO GEMINI (Hệ thống Cloud Run của bạn phải có biến API_KEY)
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const catListStr = categories.filter(c => c.group === 'INCOME' || c.group === 'EXPENSES').map(c => c.name).join(', ');
            const ccListStr = creditCards.length > 0
                ? `Available Credit Cards: ${creditCards.map(c => `${c.name} (Bank: ${c.credit_card_details?.bank_name})`).join(', ')}.`
                : "No credit cards registered.";

            const prompt = `You are FinAI, a world-class financial expert. Today is ${todayStr}.
      
      TASK:
      1. Analyze the user's input (text, bill image, or bank statement text).
      2. Identify the intent clearly.
      3. For "valid_transaction": Extract all entries. If bank statement text, extract EVERY single record found.
      4. Mapping: Use Categories: [${catListStr}]. Default to "Other" if unclear.
      5. ${ccListStr} Detection: If credit card name or "thẻ", "credit" is mentioned, set "is_credit_card": true.
      6. Date Logic: If user says "yesterday", "last Monday", or a date is visible on a receipt, convert it to "YYYY-MM-DD". Default to "${todayStr}".
      
      INTENT CLASSIFICATION:
      - "valid_transaction": User wants to record income or expense.
      - "no_transaction_intent": Greeting, random chat, or irrelevant text.
      - "unclear_or_unsupported": Image without data, meme, or complex request like "buy stocks" or "how to save".

      RESPONSE FORMAT (JSON):
      {
        "intent": "valid_transaction" | "no_transaction_intent" | "unclear_or_unsupported",
        "reason": "Short explanation in English for internal logic",
        "reply": "string (Helpful response in ${i18n.language === 'vi' ? 'Vietnamese' : 'English'})", 
        "extracted_transactions": [
            {
                "amount": number, 
                "category": "string", 
                "note": "string", 
                "group": "INCOME" | "EXPENSES",
                "is_credit_card": boolean,
                "credit_card_name": "string",
                "date": "YYYY-MM-DD"
            }
        ], 
        "is_complex": boolean (true if user wants to invest, repay debt, open savings - things beyond simple spending/income)
      }`;

            let contents: any = msg || "Extract financial data";
            if (img) {
                contents = { parts: [{ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] } }, { text: msg || "Extract financial data" }] };
            }

            const resp = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents,
                config: { systemInstruction: prompt, responseMimeType: "application/json" }
            });

            const data = JSON.parse(resp.text || '{}');

            if (data.is_complex) {
                setShowComplexHints(true);
            }

            if (data.intent === 'valid_transaction' && data.extracted_transactions?.length > 0) {
                const newTxs = data.extracted_transactions.map((t: any) => {
                    let matchedSourceId = defaultSourceId || '';

                    // Logic to Auto-Detect from Credit Card name if specified by AI
                    if (t.is_credit_card && creditCards.length > 0) {
                        if (t.credit_card_name) {
                            const found = creditCards.find(c =>
                                c.name.toLowerCase().includes(t.credit_card_name.toLowerCase()) ||
                                c.credit_card_details?.bank_name.toLowerCase().includes(t.credit_card_name.toLowerCase())
                            );
                            matchedSourceId = found ? found.id : (matchedSourceId || creditCards[0].id);
                        } else {
                            // If user didn't specify name, but intent is credit, prefer credit card.
                            // If defaultSource is NOT a credit card, force pick first credit card.
                            const defaultIsCredit = creditCards.some(c => c.id === defaultSourceId);
                            matchedSourceId = defaultIsCredit ? defaultSourceId : creditCards[0].id;
                        }
                    } else if (!matchedSourceId) {
                        // Fallback if no default set
                        if (cashAccounts.length > 0) matchedSourceId = cashAccounts[0].id;
                        else if (creditCards.length > 0) matchedSourceId = creditCards[0].id;
                    }

                    return {
                        id: Math.random().toString(36).substring(2),
                        amount: t.amount,
                        note: t.note || '',
                        category: t.category || 'Other',
                        type: t.is_credit_card ? TransactionType.CREDIT_SPENDING : TransactionType.DAILY_CASHFLOW,
                        group: t.group?.toUpperCase() || 'EXPENSES',
                        status: 'pending',
                        credit_account_id: matchedSourceId,
                        debit_account_id: '',
                        createdAt: new Date().toISOString(),
                        date: t.date || todayStr,
                        datetime: `${t.date || todayStr}T${new Date().toLocaleTimeString('en-GB')}`
                    };
                });
                setParsedTransactions(newTxs as any);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            }
        } catch (e) {
            console.error("AI Error:", e);
            setMessages(prev => [...prev, { role: 'assistant', content: "Error processing request." }]);
        } finally { setIsLoading(false); }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setIsCompressing(true);
            try {
                const compressed = await compressImage(f, 1024, 0.8);
                setAttachedImage(compressed);
            } catch (err) {
                console.error(err);
                alert("Failed to process image.");
            } finally {
                setIsCompressing(false);
                e.target.value = '';
            }
        }
    };

    const updateTransaction = (id: string, field: string, value: any) => {
        setParsedTransactions(prev => prev.map(t => {
            if (t.id === id) {
                const updated = { ...t, [field]: value };

                // Custom Logic: When category changes, check if we need to flip the group (Income/Expense)
                if (field === 'category') {
                    const cat = categories.find(c => c.name === value);
                    if (cat && cat.group && (cat.group === 'INCOME' || cat.group === 'EXPENSES')) {
                        updated.group = cat.group;
                    }
                }

                if (field === 'credit_account_id') {
                    const acc = [...creditCards, ...cashAccounts].find(a => a.id === value);
                    if (acc) {
                        if (acc.category === 'Credit Card') updated.type = TransactionType.CREDIT_SPENDING;
                        else updated.type = TransactionType.DAILY_CASHFLOW;
                    }
                }
                return updated;
            }
            return t;
        }));
    };

    const removeTransaction = (id: string) => setParsedTransactions(prev => prev.filter(t => t.id !== id));

    const handleConfirmSave = async () => {
        if (isSaving || parsedTransactions.length === 0) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const now = new Date().toISOString();
            const currentMonth = now.slice(0, 7);

            const userRef = doc(db, 'users', activeContext.uid);
            const userSnap = await getDoc(userRef);
            const usageMetadata = userSnap.data()?.transactionUsage || { month: '', count: 0 };
            const newCount = usageMetadata.month === currentMonth ? increment(parsedTransactions.length) : parsedTransactions.length;
            batch.update(userRef, { 'transactionUsage.month': currentMonth, 'transactionUsage.count': newCount });

            const qFund = query(collection(db, 'users', activeContext.uid, 'accounts'), where('category', '==', 'Equity Fund'), where('name', '==', 'Spending Fund'));
            const fundSnap = await getDocs(qFund);
            let spendingFundId = !fundSnap.empty ? fundSnap.docs[0].id : '';
            if (!spendingFundId) {
                const qAnyFund = query(collection(db, 'users', activeContext.uid, 'accounts'), where('category', '==', 'Equity Fund'));
                const anyFundSnap = await getDocs(qAnyFund);
                if (!anyFundSnap.empty) spendingFundId = anyFundSnap.docs[0].id;
            }

            const qCash = query(collection(db, 'users', activeContext.uid, 'accounts'), where('category', '==', 'Cash'));
            const cashSnap = await getDocs(qCash);
            const cashWalletId = !cashSnap.empty ? cashSnap.docs[0].id : '';

            parsedTransactions.forEach(t => {
                const txRef = doc(collection(db, 'users', activeContext.uid, 'transactions'));
                const amt = Number(t.amount);
                let dId = '', cId = '';

                if (t.group === 'INCOME') { dId = t.credit_account_id || cashWalletId; cId = spendingFundId; }
                else { dId = spendingFundId; cId = t.credit_account_id || cashWalletId; }

                batch.set(txRef, { ...t, id: txRef.id, debit_account_id: dId, credit_account_id: cId, status: 'confirmed', addedBy: auth.currentUser?.email });

                if (t.group === 'INCOME') {
                    if (dId) batch.update(doc(db, 'users', activeContext.uid, 'accounts', dId), { current_balance: increment(amt) });
                    if (cId) batch.update(doc(db, 'users', activeContext.uid, 'accounts', cId), { current_balance: increment(amt) });
                } else {
                    if (dId) batch.update(doc(db, 'users', activeContext.uid, 'accounts', dId), { current_balance: increment(-amt) });
                    if (cId) {
                        const isCC = creditCards.some(cc => cc.id === cId);
                        batch.update(doc(db, 'users', activeContext.uid, 'accounts', cId), { current_balance: increment(isCC ? amt : -amt) });
                    }
                }
            });

            await batch.commit();
            onNavigate(ViewName.DASHBOARD);
        } catch (e) { alert("Lỗi khi lưu giao dịch."); } finally { setIsSaving(false); }
    };

    const incomeCats = categories.filter(c => c.group === 'INCOME');
    const expenseCats = categories.filter(c => c.group === 'EXPENSES');

    return (
        <div className="flex flex-col h-full bg-white font-display overflow-hidden">
            <div className="flex items-center p-5 justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
                <button onClick={onClose} className="text-slate-500 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50"><X size={24} /></button>
                <div className="flex flex-col items-center"><div className="flex items-center gap-2"><Sparkles size={16} className="text-indigo-600 animate-pulse" /><h2 className="text-slate-900 font-black uppercase tracking-tight">{t('new_entry.title')}</h2></div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('new_entry.subtitle')}</p></div><div className="w-10"></div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pt-6 pb-24 no-scrollbar space-y-6">
                <ChatThread messages={messages} isLoading={isLoading} t={t} />

                {parsedTransactions.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Database size={16} className="text-indigo-600" />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Verify Entries ({parsedTransactions.length})</span>
                        </div>

                        {parsedTransactions.map((tx) => {
                            const { icon, bg, text } = getCategoryIcon(tx.category);
                            const isInc = tx.group === 'INCOME';
                            const isCC = tx.type === TransactionType.CREDIT_SPENDING;

                            return (
                                <div key={tx.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden relative group">
                                    <button onClick={() => removeTransaction(tx.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>

                                    <div className="p-4 flex gap-4 items-start border-b border-slate-50">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bg} ${text}`}><span className="material-symbols-outlined text-[24px]">{icon}</span></div>
                                        <div className="flex-1 min-w-0 grid grid-cols-1 gap-2">
                                            <input type="text" value={tx.note} onChange={(e) => updateTransaction(tx.id, 'note', e.target.value)} className="text-sm font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-200 focus:border-indigo-500 outline-none pb-1 w-full" placeholder="Note..." />
                                            <div className="flex items-center gap-2">
                                                <input type="number" value={tx.amount} onChange={(e) => updateTransaction(tx.id, 'amount', Number(e.target.value))} className={`text-lg font-black bg-transparent outline-none w-32 ${isInc ? 'text-emerald-600' : 'text-slate-900'}`} />
                                                <span className="text-[10px] font-bold text-slate-400">VND</span>
                                            </div>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{tx.date}</p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-50/50 flex gap-2">
                                        <div className="flex-1 relative">
                                            <select
                                                value={tx.category}
                                                onChange={(e) => updateTransaction(tx.id, 'category', e.target.value)}
                                                className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
                                            >
                                                <optgroup label="Chi tiêu">
                                                    {expenseCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </optgroup>
                                                <optgroup label="Thu nhập">
                                                    {incomeCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </optgroup>
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Edit2 size={10} /></div>
                                        </div>
                                        {!isInc && (
                                            <div className="flex-1 relative">
                                                <select value={tx.credit_account_id} onChange={(e) => updateTransaction(tx.id, 'credit_account_id', e.target.value)} className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300 pl-8">
                                                    <optgroup label="Cash">{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
                                                    <optgroup label="Credit">{creditCards.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
                                                </select>
                                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">{isCC ? <CreditCard size={12} /> : <Wallet size={12} />}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {showComplexHints && (
                    <div className="flex flex-col gap-3 py-6 animate-in slide-in-from-top-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">{t('new_entry.complex_intent')}</p><div className="grid grid-cols-2 gap-3"><button onClick={() => onNavigate(ViewName.ASSETS)} className="flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm"><Briefcase size={16} className="text-indigo-500" /><span className="text-[10px] font-black uppercase text-slate-600">{t('nav.assets')}</span></button><button onClick={() => onNavigate(ViewName.CAPITAL)} className="flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm"><Landmark size={16} className="text-orange-500" /><span className="text-[10px] font-black uppercase text-slate-600">{t('nav.capital')}</span></button></div></div>
                )}
            </div>

            <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-white border-t sticky bottom-0 z-50">
                {parsedTransactions.length > 0 ? (
                    <div className="flex gap-3">
                        <button onClick={() => setParsedTransactions([])} className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center shrink-0 hover:bg-slate-200 transition-colors"><X size={24} /></button>
                        <button onClick={handleConfirmSave} disabled={isSaving} className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">{isSaving ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />} Confirm & Save</button>
                    </div>
                ) : (
                    <>
                        {isCompressing && (
                            <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 justify-center animate-in fade-in">
                                <Loader2 size={14} className="animate-spin" /> {i18n.language === 'vi' ? 'Đang nén ảnh...' : 'Compressing image...'}
                            </div>
                        )}

                        {attachedImage && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-[1.5rem] mb-4 border border-slate-100 animate-in slide-in-from-bottom-2">
                                <div className="w-14 h-14 rounded-xl overflow-hidden relative shadow-sm">
                                    <img src={attachedImage} className="w-full h-full object-cover" alt="Receipt preview" />
                                    <button
                                        onClick={() => setAttachedImage(null)}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bill Attached</p>
                                    <button onClick={() => setAttachedImage(null)} className="text-[10px] font-bold text-rose-500 uppercase mt-0.5">Remove</button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 items-center">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isLimitReached || isCompressing} className={`w-12 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-indigo-100 transition-colors ${isCompressing ? 'animate-pulse' : ''}`}>
                                <Camera size={22} />
                            </button>
                            <button onClick={toggleListening} disabled={isLoading || isLimitReached || isCompressing} className={`w-12 h-14 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-50 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{isListening ? <MicOff size={22} /> : <Mic size={22} />}</button>
                            <div className="relative flex-1">
                                <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder={isLimitReached ? "Limit reached..." : (isListening ? "Listening..." : t('new_entry.placeholder'))} disabled={isLimitReached || isCompressing} className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-400" />
                                <button onClick={handleSendMessage} disabled={(!inputValue.trim() && !attachedImage) || isLoading || isLimitReached || isCompressing} className={`absolute right-2 top-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${(inputValue.trim() || attachedImage) && !isLoading && !isLimitReached ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'}`}><Send size={18} /></button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

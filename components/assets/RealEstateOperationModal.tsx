
import React, { useState, useEffect } from 'react';
import { X, Hammer, ReceiptText, Activity, Loader2, Save, Landmark, Info, Wallet, Calendar, TrendingUp, Sparkles, BrainCircuit, Check, ArrowRight } from 'lucide-react';
import { collection, doc, writeBatch, query, where, getDocs, increment, updateDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { db, auth } from '../../lib/firebase';
import { currencyFormatter } from '../../lib/utils';
import { Account, TransactionType } from '../../types';
import { AmountInput } from '../ui/AmountInput';
import { StandardInput } from '../ui/StandardInput';
import { DateInput } from '../ui/DateInput';

type REOpType = 'CAPEX' | 'OPEX' | 'REVALUE';

interface RealEstateOperationModalProps {
  operation: REOpType;
  account: Account;
  onClose: () => void;
  targetUid: string;
}

export const RealEstateOperationModal: React.FC<RealEstateOperationModalProps> = ({ operation, account, onClose, targetUid }) => {
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');

  // AI Valuation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  // Persisted AI Result Structure
  const [aiResult, setAiResult] = useState<{ price: number; range: string; reasoning: string; date?: string } | null>(null);

  // Simulated Progress Steps for UX
  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    if (isAnalyzing) {
        setAiStatus("Đang kết nối AI...");
        timers.push(setTimeout(() => setAiStatus("Đang tìm kiếm dữ liệu BĐS trên Google..."), 2000));
        timers.push(setTimeout(() => setAiStatus("Đang phân tích vị trí và diện tích..."), 7000));
        timers.push(setTimeout(() => setAiStatus("Đang so sánh giá thị trường khu vực..."), 14000));
        timers.push(setTimeout(() => setAiStatus("Đang tổng hợp báo cáo định giá..."), 22000));
    } else {
        setAiStatus("");
    }
    return () => timers.forEach(clearTimeout);
  }, [isAnalyzing]);

  useEffect(() => {
    const fetchCash = async () => {
      if (operation === 'REVALUE') return;
      const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Cash'));
      const snap = await getDocs(q);
      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setCashAccounts(accs);
      if (accs.length > 0) setSourceAccountId(accs[0].id);
    };
    fetchCash();
    
    // Default notes & Load Persisted AI Data
    if (operation === 'CAPEX') setNote('Cải tạo / Làm nội thất');
    else if (operation === 'OPEX') setNote('Phí quản lý / Thuế đất');
    else {
      setNote('Định giá lại theo thị trường');
      setAmount(account.current_balance.toString());
      
      // Load saved AI valuation if exists
      if (account.real_estate_details?.latest_ai_valuation) {
          setAiResult(account.real_estate_details.latest_ai_valuation);
      }
    }
  }, [operation, targetUid, account]);

  const handleAIValuation = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAiResult(null);

    try {
        const details = account.real_estate_details;
        // Always use process.env.API_KEY string directly when initializing GoogleGenAI instance.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
            Task: Estimate current market value (VND) for this real estate in Vietnam.
            Property: ${account.name}
            Address: ${details?.address || 'Vietnam'}
            Area: ${details?.area || 'Unknown'}
            
            Use Google Search to find comparable listings or price trends in this specific area.
            
            Return ONLY a JSON object:
            {
                "estimated_price": number (in VND, pure number),
                "price_range": string (e.g. "5.2 tỷ - 5.5 tỷ"),
                "reasoning": string (brief explanation of pricing based on location/area/trends in Vietnamese, max 30 words)
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: { 
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json'
            }
        });

        const text = response.text || "{}";
        const data = JSON.parse(text);

        if (data.estimated_price) {
            const resultData = {
                price: data.estimated_price,
                range: data.price_range || 'N/A',
                reasoning: data.reasoning || 'Dựa trên dữ liệu thị trường khu vực.',
                date: new Date().toISOString()
            };

            setAmount(data.estimated_price.toString());
            setAiResult(resultData);
            setNote('Định giá lại theo tham chiếu AI');

            // Persist to Firestore immediately so user can see it next time
            await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), {
                'real_estate_details.latest_ai_valuation': resultData
            });

        } else {
            alert("AI không tìm thấy đủ dữ liệu để định giá tài sản này.");
        }

    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối AI service. Vui lòng thử lại hoặc nhập tay.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!amount || (operation !== 'REVALUE' && !sourceAccountId)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const val = Number(amount);
      const now = new Date().toISOString();
      const accountsRef = collection(db, 'users', targetUid, 'accounts');
      const transactionsRef = collection(db, 'users', targetUid, 'transactions');
      const reAccRef = doc(accountsRef, account.id);

      const commonTxData = {
        date, datetime: now, group: 'ASSETS', status: 'confirmed', asset_link_id: account.id,
        createdAt: now, addedBy: auth.currentUser?.email
      };

      if (operation === 'CAPEX') {
        // Hạch toán: Dr BĐS (Asset+) / Cr Wallet (Asset-)
        // Đặc biệt: Tăng total_investment
        const txRef = doc(transactionsRef);
        batch.set(txRef, {
          ...commonTxData, id: txRef.id, amount: val, note: note || 'Đầu tư thêm vào BĐS',
          type: TransactionType.ASSET_INVESTMENT, debit_account_id: account.id, credit_account_id: sourceAccountId,
          category: 'Real Estate'
        });
        batch.update(reAccRef, {
          current_balance: increment(val),
          'real_estate_details.total_investment': increment(val),
          investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'CAPEX', price: val, note }]
        });
        batch.update(doc(accountsRef, sourceAccountId), { current_balance: increment(-val) });

      } else if (operation === 'OPEX') {
        // Hạch toán: Dr Equity Fund (Capital-) / Cr Wallet (Asset-)
        const fundSnap = await getDocs(query(accountsRef, where('category', '==', 'Equity Fund')));
        const equityFundId = fundSnap.docs[0]?.id;
        
        const txRef = doc(transactionsRef);
        batch.set(txRef, {
          ...commonTxData, id: txRef.id, amount: val, note: note || 'Chi phí duy trì BĐS',
          type: TransactionType.DAILY_CASHFLOW, debit_account_id: equityFundId || 'expense', credit_account_id: sourceAccountId,
          category: 'Housing', group: 'EXPENSES'
        });
        batch.update(doc(accountsRef, sourceAccountId), { current_balance: increment(-val) });
        if (equityFundId) batch.update(doc(accountsRef, equityFundId), { current_balance: increment(-val) });
        
        batch.update(reAccRef, {
          investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'OPEX', price: val, note }]
        });

      } else if (operation === 'REVALUE') {
        // Hạch toán biến động giá thị trường (Unrealized P/L)
        // Cập nhật current_balance của BĐS và điều chỉnh Equity Fund tương ứng
        const diff = val - account.current_balance;
        
        // 1. Xác định Quỹ đối ứng
        let targetFundId = account.linked_fund_id;
        let didFallback = false;

        // Fallback: Nếu không có linked_fund_id, tìm Equity Fund đầu tiên còn hoạt động
        if (!targetFundId) {
            const fundSnap = await getDocs(query(accountsRef, where('category', '==', 'Equity Fund'), where('status', '==', 'ACTIVE')));
            if (!fundSnap.empty) {
                targetFundId = fundSnap.docs[0].id;
                didFallback = true;
            }
        }

        if (!targetFundId) {
            throw new Error("Không tìm thấy Quỹ vốn (Equity Fund) nào để hạch toán chênh lệch. Vui lòng tạo quỹ vốn trước.");
        }

        const txRef = doc(transactionsRef);
        
        // 2. Ghi Transaction
        // Lãi (diff > 0): Dr BĐS (Asset tăng), Cr Equity (Nguồn vốn tăng)
        // Lỗ (diff < 0): Dr Equity (Nguồn vốn giảm), Cr BĐS (Asset giảm)
        batch.set(txRef, {
          ...commonTxData, id: txRef.id, amount: Math.abs(diff), note: note || 'Định giá lại tài sản (Mark-to-Market)',
          type: TransactionType.ASSET_REVALUATION, 
          debit_account_id: diff >= 0 ? account.id : targetFundId,
          credit_account_id: diff >= 0 ? targetFundId : account.id,
          category: 'Real Estate', price: val
        });
        
        // 3. Cập nhật BĐS
        const newHistory = [...(account.real_estate_details?.valuation_history || []), { date, price: val }];
        const reUpdateData: any = {
          current_balance: val,
          'real_estate_details.valuation_history': newHistory,
          investment_logs: [...(account.investment_logs || []), { id: crypto.randomUUID(), date, type: 'REVALUE', price: val, note }]
        };
        // Tự động sửa lỗi (Self-healing): Cập nhật lại linked_fund_id nếu vừa fallback
        if (didFallback) {
            reUpdateData.linked_fund_id = targetFundId;
        }
        batch.update(reAccRef, reUpdateData);

        // 4. Cập nhật Quỹ đối ứng (Ghi nhận chênh lệch vào vốn chủ sở hữu)
        batch.update(doc(accountsRef, targetFundId), {
            current_balance: increment(diff)
        });
      }

      await batch.commit();
      onClose();
    } catch (e: any) {
      alert("Lỗi hạch toán: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const config = {
    CAPEX: { title: 'Đầu tư thêm (CapEx)', icon: Hammer, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Làm nội thất, sửa chữa... sẽ cộng vào Giá vốn của nhà.' },
    OPEX: { title: 'Chi phí duy trì (OpEx)', icon: ReceiptText, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Phí quản lý, tiền điện nước... không làm tăng giá trị nhà.' },
    REVALUE: { title: 'Định giá lại tài sản', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Cập nhật giá thị trường. Chênh lệch sẽ được ghi vào Quỹ vốn đối ứng.' }
  }[operation];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${config.bg} ${config.color} flex items-center justify-center shadow-inner`}><Icon size={24} /></div>
              <h3 className="font-black text-slate-900">{config.title}</h3>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
           
           {/* AI Valuation Trigger */}
           {operation === 'REVALUE' && (
             <div className="flex flex-col gap-3">
                <button 
                    onClick={handleAIValuation}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isAnalyzing ? aiStatus : "Định giá bằng AI"}
                </button>

                {aiResult && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2 relative group">
                        <div className="flex items-start gap-3">
                            <BrainCircuit size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Kết quả định giá</p>
                                    {aiResult.date && <span className="text-[8px] text-indigo-400 font-bold">{new Date(aiResult.date).toLocaleDateString('vi-VN')}</span>}
                                </div>
                                <p className="text-sm font-bold text-slate-900 mb-1">Khoảng giá: {aiResult.range}</p>
                                <p className="text-xs font-medium text-indigo-700 leading-relaxed italic">"{aiResult.reasoning}"</p>
                                
                                <button 
                                    onClick={() => { setAmount(aiResult.price.toString()); setNote(`Định giá theo AI (${new Date().toLocaleDateString('vi-VN')})`); }}
                                    className="mt-3 flex items-center gap-1 text-[9px] font-black uppercase text-white bg-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-fit"
                                >
                                    Sử dụng giá này <ArrowRight size={10} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
             </div>
           )}

           <AmountInput 
             label={operation === 'REVALUE' ? "Giá thị trường mới" : "Số tiền chi trả"} 
             value={amount} 
             onChange={setAmount} 
             autoFocus={operation !== 'REVALUE'} 
           />

           {operation !== 'REVALUE' && (
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Wallet size={12} /> Trích tiền từ ví</label>
                 <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none appearance-none">
                    {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({currencyFormatter.format(acc.current_balance)})</option>)}
                 </select>
              </div>
           )}

           <div className="grid grid-cols-1 gap-4">
             <DateInput label="Ngày thực hiện" value={date} onChange={setDate} />
             <StandardInput label="Ghi chú chi tiết" value={note} onChange={setNote} placeholder="VD: Thay sàn gỗ, sơn lại tường..." />
           </div>

           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
              <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">{config.desc}</p>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t">
           <button onClick={handleSave} disabled={loading || !amount} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
              {loading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Save size={20} className="text-indigo-400" />}
              {loading ? "Đang xử lý..." : "Xác nhận hạch toán"}
           </button>
        </div>
      </div>
    </div>
  );
};

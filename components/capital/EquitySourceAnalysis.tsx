
import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Account, AIInsightData } from '../../types';
import { useTranslation } from 'react-i18next';

interface SourceAnalysisProps {
  uid: string;
  equityAccounts: Account[];
  initialInsight?: AIInsightData;
  onSaveInsight: (content: string) => Promise<void>;
}

export const EquitySourceAnalysis: React.FC<SourceAnalysisProps> = ({ uid, equityAccounts, initialInsight, onSaveInsight }) => {
  const { t, i18n } = useTranslation();
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check freshness on mount
  useEffect(() => {
      if (initialInsight && initialInsight.content) {
          const storedDate = new Date(initialInsight.timestamp);
          const now = new Date();
          // Reset monthly logic
          if (storedDate.getMonth() === now.getMonth() && storedDate.getFullYear() === now.getFullYear()) {
              setAnalysis(initialInsight.content);
              setIsExpanded(true);
          }
      }
  }, [initialInsight]);

  const runAnalysis = async () => {
    if (loading || equityAccounts.length === 0) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'users', uid, 'transactions'), orderBy('datetime', 'desc'), limit(30));
      const snap = await getDocs(q);
      const relevantTxs = snap.docs.map(d => d.data()).filter(t => t.group === 'INCOME' || t.group === 'CAPITAL');
      const fundsSummary = equityAccounts.map(f => ({ name: f.name, balance: f.current_balance }));
      const langName = i18n.language === 'vi' ? 'Vietnamese' : 'English';

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Briefly analyze these equity funds and recent transactions:
        Funds: ${JSON.stringify(fundsSummary)}
        Txns: ${JSON.stringify(relevantTxs)}
        
        Task: Provide 1 key insight about capital flow stability or efficiency (max 15 words).
        Language: ${langName}.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const text = response.text?.trim() || (i18n.language === 'vi' ? "Dòng tiền ổn định, hãy tiếp tục tối ưu hóa." : "Cash flow is stable, continue optimizing.");
      setAnalysis(text);
      setIsExpanded(true);
      
      await onSaveInsight(text);

    } catch (e) {
      setAnalysis(i18n.language === 'vi' ? "Sẵn sàng phân tích dữ liệu." : "Ready to analyze data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-1">
      <button 
        onClick={analysis ? () => setIsExpanded(!isExpanded) : runAnalysis}
        disabled={loading}
        className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border ${analysis ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-600'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${analysis ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          </div>
          <div className="text-left min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest ${analysis ? 'text-indigo-200' : 'text-slate-400'}`}>{t('capital.equity_source_insight')}</p>
            <p className={`text-xs font-bold truncate ${analysis ? 'text-white' : 'text-slate-600 italic'}`}>
              {loading 
                ? (i18n.language === 'vi' ? "Đang quét sổ cái..." : "Scanning ledger...") 
                : (analysis || (i18n.language === 'vi' ? "Nhấn để AI phân tích nguồn vốn" : "Tap for AI capital analysis"))
              }
            </p>
          </div>
        </div>
        {analysis && <ChevronRight size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />}
      </button>

      {isExpanded && analysis && (
        <div className="mt-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
           <p className="text-xs font-medium text-indigo-900 leading-relaxed italic">"{analysis}"</p>
           <button onClick={runAnalysis} className="mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-500">
              <RefreshCw size={10} /> {i18n.language === 'vi' ? 'Cập nhật lại' : 'Refresh'}
           </button>
        </div>
      )}
    </div>
  );
};

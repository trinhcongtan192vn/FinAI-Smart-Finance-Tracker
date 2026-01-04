
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertCircle, ChevronRight, BrainCircuit } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Account, AIInsightData } from '../../types';
import { calculateTotalPortfolioPerformance, percentFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface AIPortfolioAdvisorProps {
  accounts: Account[];
  canGenerate: boolean;
  initialInsight?: AIInsightData;
  onSaveInsight: (data: any) => Promise<void>;
}

export const AIPortfolioAdvisor: React.FC<AIPortfolioAdvisorProps> = ({ accounts, canGenerate, initialInsight, onSaveInsight }) => {
  const { t, i18n } = useTranslation();
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check freshness on mount
  useEffect(() => {
      if (initialInsight && initialInsight.content) {
          const storedDate = new Date(initialInsight.timestamp);
          const now = new Date();
          // Reset monthly logic
          if (storedDate.getMonth() === now.getMonth() && storedDate.getFullYear() === now.getFullYear()) {
              setInsight(initialInsight.content);
              setIsExpanded(true);
          }
      }
  }, [initialInsight]);

  const analyzePortfolio = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    try {
      const investments = accounts.filter(a => ['Stocks', 'Crypto', 'Gold'].includes(a.category))
        .map(a => ({
          name: a.name,
          category: a.category,
          units: a.investment_details?.total_units || 0,
          avg_price: a.investment_details?.avg_price || 0,
          market_price: a.investment_details?.market_price || 0,
          roi: a.investment_details ? ((a.investment_details.market_price - a.investment_details.avg_price) / a.investment_details.avg_price) * 100 : 0
        }));

      const portfolioPerformance = calculateTotalPortfolioPerformance(accounts);
      const langName = i18n.language === 'vi' ? 'Vietnamese' : 'English';

      // SỬ DỤNG API_KEY (Hệ thống Cloud Run của bạn phải có biến API_KEY)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analyze this investment portfolio and provide strategic advice in ${langName}.
        Data: ${JSON.stringify(investments)}
        Total ROI: ${portfolioPerformance ? percentFormatter.format(portfolioPerformance.totalROI) : '0%'}
        
        Return a JSON object with:
        - "summary": (string, brief overall status)
        - "risk_level": (string, LOW/MEDIUM/HIGH)
        - "top_performer": (string, asset name)
        - "worst_performer": (string, asset name)
        - "advice": (string, one actionable sentence about rebalancing or buying more)
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      setInsight(data);
      setIsExpanded(true);
      
      // Save result
      await onSaveInsight(data);

    } catch (e) {
      console.error(e);
      const errMsg = i18n.language === 'vi' 
        ? "Dữ liệu đang được đồng bộ. Hãy thử lại sau ít phút." 
        : "Data is syncing. Please try again later.";
      const errAdvice = i18n.language === 'vi'
        ? "Duy trì kỷ luật đầu tư và theo dõi biến động giá vốn."
        : "Maintain investment discipline and monitor cost basis.";

      const fallback = { 
        summary: errMsg,
        risk_level: "MEDIUM",
        advice: errAdvice
      };
      setInsight(fallback);
      setIsExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-[2rem] border border-indigo-100/50 shadow-soft transition-all duration-300 overflow-hidden ${isExpanded ? 'p-5' : 'p-3'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isExpanded ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600'}`}>
            <BrainCircuit size={18} />
          </div>
          {!isExpanded ? (
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-900 leading-tight">{t('assets.ai_advisor')}</span>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('assets.ai_advisor_sub')}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <h3 className="text-xs font-black text-slate-900 leading-tight uppercase tracking-wider">{t('assets.ai_advisor')}</h3>
              <p className="text-[8px] font-black text-indigo-50 uppercase tracking-[0.2em] mt-0.5">{t('assets.ai_advisor_sub')}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!insight ? (
            <button 
              onClick={analyzePortfolio}
              disabled={loading || !canGenerate}
              className="px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              Analyze
            </button>
          ) : (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:text-indigo-600 transition-colors"
            >
              <ChevronRight size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {insight && (
        <div className={`transition-all duration-300 ${isExpanded ? 'mt-4 opacity-100 max-h-[400px]' : 'mt-0 opacity-0 max-h-0 overflow-hidden'}`}>
          <div className={`p-3.5 rounded-2xl text-[11px] font-bold leading-relaxed border ${insight.risk_level === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-100' : insight.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            <div className="flex justify-between items-start mb-1.5">
               <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Status: {insight.risk_level} Risk</span>
               <Sparkles size={10} className="opacity-40" />
            </div>
            {insight.summary}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
               <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Top Performer</p>
               <p className="text-[10px] font-black text-emerald-600 truncate">{insight.top_performer || 'N/A'}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
               <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Watchlist</p>
               <p className="text-[10px] font-black text-rose-600 truncate">{insight.worst_performer || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-3 mt-3 border-t border-slate-50">
            <AlertCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-slate-600 leading-snug">{insight.advice}</p>
          </div>
          
          <button 
            onClick={analyzePortfolio}
            disabled={loading}
            className="w-full mt-4 py-2 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-all"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Rescan
          </button>
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, ArrowRight, Loader2, Lightbulb } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Account } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface SavingsStrategyCardProps {
  account: Account;
  canGenerate: boolean;
}

export const SavingsStrategyCard: React.FC<SavingsStrategyCardProps> = ({ account, canGenerate }) => {
  const { i18n } = useTranslation();
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);

  const getAdvice = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    try {
      // Always use process.env.API_KEY string directly when initializing GoogleGenAI instance.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const langName = i18n.language === 'vi' ? 'Vietnamese' : 'English';
      
      const prompt = `
        I have a savings account:
        - Name: ${account.name}
        - Amount: ${currencyFormatter.format(account.current_balance)}
        - Rate: ${account.details?.interest_rate}%
        - Term: ${account.details?.term_months} months.
        
        Act as a portfolio optimization expert. 
        Given current market conditions (approx 5-6% for 1y term), 
        give 1 specific advice (max 20 words) on whether to renew or diversify into Gold/Stocks.
        Language: ${langName}.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const fallbackMsg = i18n.language === 'vi' ? "Cân nhắc đa dạng hóa sang các lớp tài sản khác." : "Consider diversifying into other asset classes.";
      setAdvice(response.text?.trim() || fallbackMsg);
    } catch (e) {
      setAdvice(i18n.language === 'vi' ? "Tiết kiệm là nền tảng tài chính an toàn. Hãy duy trì!" : "Savings provide a safe financial foundation. Keep it up!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canGenerate && !advice) {
        const timer = setTimeout(getAdvice, 1000);
        return () => clearTimeout(timer);
    }
  }, [account.id]);

  return (
    <div className="bg-indigo-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl border border-white/10 group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 blur-[50px] -mr-16 -mt-16 group-hover:bg-indigo-400/40 transition-colors"></div>
      <div className="relative z-10">
         <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-indigo-300" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">AI Savings Strategy</span>
         </div>
         <div className="flex items-start gap-4">
            <div className="w-10 h-10 shrink-0 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
               {loading ? <Loader2 size={20} className="animate-spin text-indigo-300" /> : <Lightbulb size={20} className="text-indigo-300" />}
            </div>
            <p className="text-sm font-medium text-indigo-50 leading-relaxed italic">
               {loading 
                 ? (i18n.language === 'vi' ? "Đang phân tích thị trường..." : "Analyzing market...") 
                 : (advice || (i18n.language === 'vi' ? "Đang kết nối chuyên gia..." : "Connecting to expert..."))
               }
            </p>
         </div>
         {advice && !loading && (
            <button 
                onClick={getAdvice}
                className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-300 hover:text-white transition-colors"
            >
                {i18n.language === 'vi' ? 'Cập nhật phân tích' : 'Refresh Analysis'} <ArrowRight size={10} />
            </button>
         )}
      </div>
    </div>
  );
};

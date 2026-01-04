
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useTranslation } from 'react-i18next';
import { AIInsightData } from '../../types';

interface InsightCardProps {
  cfoContext: any;
  canGenerate: boolean;
  initialInsight?: AIInsightData;
  onSaveInsight: (content: string) => Promise<void>;
}

export const InsightCard: React.FC<InsightCardProps> = ({ cfoContext, canGenerate, initialInsight, onSaveInsight }) => {
  const { t, i18n } = useTranslation();
  const [insight, setInsight] = React.useState<string>("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Check freshness on mount
  useEffect(() => {
      if (initialInsight && initialInsight.content) {
          const storedDate = new Date(initialInsight.timestamp);
          const now = new Date();
          // Reset monthly logic
          if (storedDate.getMonth() === now.getMonth() && storedDate.getFullYear() === now.getFullYear()) {
              setInsight(initialInsight.content);
          }
      }
  }, [initialInsight]);

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;
    setIsGenerating(true);
    try {
      // SỬ DỤNG API_KEY (Đảm bảo biến này đã được set trong môi trường Cloud Run)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const langName = i18n.language === 'vi' ? 'Vietnamese' : 'English';
      const prompt = `
        Act as a professional Personal CFO. Analyze this financial summary JSON:
        ${JSON.stringify(cfoContext)}

        Task: Provide ONE specific, high-impact strategic recommendation to optimize wealth or reduce risk.
        Style: Direct, professional, authoritative (like a Fortune 500 CFO).
        Language: ${langName}.
        Max length: 25 words.
      `;

      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: [{ parts: [{ text: prompt }] }] 
      });
      
      const fallbackMsg = i18n.language === 'vi' ? "Hãy duy trì kỷ luật tài chính và theo dõi dòng tiền chặt chẽ." : "Maintain financial discipline and monitor cash flow closely.";
      const text = response.text?.trim() || fallbackMsg;
      setInsight(text);
      
      await onSaveInsight(text);

    } catch (e) { 
      console.error("AI Error:", e); 
      setInsight(i18n.language === 'vi' ? "Hệ thống đang bận. Vui lòng thử lại sau." : "System busy. Please try again later.");
    } finally { 
      setIsGenerating(false); 
    }
  };

  return (
    <div className="mb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl ring-1 ring-white/10 group">
        {/* Abstract Art Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-indigo-500/30 transition-colors duration-500"></div>
        
        <div className="flex items-start gap-4 relative z-10">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 shadow-inner"
          >
            {isGenerating ? (
              <RefreshCw size={24} className="text-indigo-300 animate-spin" />
            ) : (
              <Sparkles size={24} className="text-indigo-300" fill={insight ? "currentColor" : "none"} />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-sm uppercase tracking-widest text-indigo-300">{t('reports.cfo_insight')}</h3>
                {insight && (
                   <button 
                    onClick={handleGenerate}
                    className="text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-1"
                   >
                     {i18n.language === 'vi' ? 'Làm mới' : 'Refresh'} <ChevronRight size={10} />
                   </button>
                )}
             </div>
             
             {isGenerating ? (
               <div className="space-y-2">
                 <div className="h-2 w-3/4 bg-white/10 rounded-full animate-pulse"></div>
                 <div className="h-2 w-1/2 bg-white/10 rounded-full animate-pulse delay-75"></div>
               </div>
             ) : (
               <p className="text-base font-medium text-white leading-relaxed">
                 {insight ? `"${insight}"` : (i18n.language === 'vi' ? "Nhấn nút để nhận phân tích chiến lược từ AI CFO dựa trên dữ liệu tài chính của bạn." : "Tap to receive strategic analysis from AI CFO based on your financial data.")}
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AIInsightData } from '../../types';

interface WealthAdvisorCardProps {
  displayName: string;
  availableCash: number;
  totalAssets: number;
  debtToAssetRatio: number;
  equity: number;
  liability: number;
  monthlyExpense: number;
  monthlyBudget: number;
  recentTransactions: any[];
  canGenerate: boolean;
  initialInsight?: AIInsightData;
  onSaveInsight: (content: string) => Promise<void>;
  onChatClick?: () => void; // New Prop
}

export const WealthAdvisorCard: React.FC<WealthAdvisorCardProps> = ({
  onChatClick
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-6 shadow-xl border border-slate-800 cursor-pointer group" onClick={onChatClick}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 group-hover:opacity-30 transition-opacity"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <Sparkles size={24} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                   {t('wealth_advisor.title')}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                   {t('advisor.card_subtitle')}
                </p>
            </div>
        </div>
        
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-indigo-300 group-hover:bg-white/20 group-hover:text-white transition-all">
            <MessageCircle size={20} />
        </div>
      </div>
    </div>
  );
};

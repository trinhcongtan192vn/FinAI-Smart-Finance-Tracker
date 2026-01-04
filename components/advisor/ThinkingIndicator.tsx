
import React, { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ThinkingIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [loadingStep, setLoadingStep] = useState(0);
  
  const loadingMessages = [
    t('advisor.analyzing_profile'),
    t('advisor.checking_risk'),
    t('advisor.formulating_plan')
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start animate-in fade-in duration-300">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"><Bot size={16} /></div>
        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-3 shadow-sm">
          <Loader2 size={16} className="animate-spin text-indigo-500" />
          <span className="text-xs font-bold text-slate-500 animate-pulse">{loadingMessages[loadingStep]}</span>
        </div>
      </div>
    </div>
  );
};

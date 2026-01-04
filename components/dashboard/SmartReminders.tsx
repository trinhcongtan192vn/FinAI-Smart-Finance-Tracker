
import React, { useMemo } from 'react';
import { CreditCard, AlertTriangle, Calendar, ChevronRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { Account } from '../../types';
import { getCreditCardStatus } from '../../lib/creditUtils';
import { currencyFormatter } from '../../lib/utils';

interface SmartRemindersProps {
  accounts: Account[];
  onNavigateToCard: (accountId: string) => void;
}

export const SmartReminders: React.FC<SmartRemindersProps> = ({ accounts, onNavigateToCard }) => {
  
  const alerts = useMemo(() => {
    const activeAlerts: any[] = [];
    const creditCards = accounts.filter(a => a.category === 'Credit Card' && a.status === 'ACTIVE');

    creditCards.forEach(card => {
        if (!card.credit_card_details) return;
        const status = getCreditCardStatus(card.current_balance, card.credit_card_details);

        // 1. High Utilization Alert (> 80%)
        if (status.utilization > 80) {
            activeAlerts.push({
                type: 'HIGH_UTIL',
                priority: 1, // Highest priority
                cardId: card.id,
                cardName: card.name,
                message: `Cảnh báo: Bạn đã dùng ${status.utilization.toFixed(0)}% hạn mức thẻ ${card.name}.`,
                subMessage: `Dư nợ: ${currencyFormatter.format(card.current_balance)}`,
                icon: AlertTriangle,
                color: 'bg-red-50 text-red-600 border-red-100'
            });
        }
        
        // 2. Statement Payment Reminder (If statement issued and balance > 0)
        // Only show if due date is within 15 days to avoid spamming all month
        else if (status.isStatementOpen && status.daysToDue <= 15 && status.daysToDue >= 0) {
            const isUrgent = status.daysToDue <= 3;
            activeAlerts.push({
                type: 'STATEMENT_DUE',
                priority: isUrgent ? 2 : 3,
                cardId: card.id,
                cardName: card.name,
                message: `Kỳ sao kê: ${currencyFormatter.format(card.current_balance)}`,
                subMessage: isUrgent ? `Hạn chót: ${status.daysToDue} ngày nữa!` : `Hạn thanh toán: ${status.dueDate.toLocaleDateString('vi-VN')}`,
                icon: Calendar,
                color: isUrgent ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
            });
        }
    });

    return activeAlerts.sort((a, b) => a.priority - b.priority);
  }, [accounts]);

  if (alerts.length === 0) return null;

  // Only show the top priority alert to keep dashboard clean, or maybe a carousel later.
  const topAlert = alerts[0];
  const Icon = topAlert.icon;

  return (
    <div 
        onClick={() => onNavigateToCard(topAlert.cardId)}
        className={`mx-5 mb-4 p-4 rounded-[1.5rem] border flex items-center justify-between shadow-sm cursor-pointer active:scale-95 transition-all relative overflow-hidden group ${topAlert.color}`}
    >
        {/* Animated Background Stripe */}
        <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-50"></div>
        
        <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon size={20} className={topAlert.type === 'HIGH_UTIL' ? 'animate-pulse' : ''} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">{topAlert.cardName}</p>
                <p className="text-sm font-bold truncate leading-tight">{topAlert.message}</p>
                <p className="text-[10px] font-medium opacity-90 mt-0.5">{topAlert.subMessage}</p>
            </div>
        </div>
        
        <div className="bg-white/40 p-1.5 rounded-full shrink-0">
            <ChevronRight size={16} />
        </div>
    </div>
  );
};

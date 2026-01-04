
import React, { useMemo, useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Account, Transaction } from '../../types';
import { currencyFormatter, formatCurrencyCompact } from '../../lib/utils';
import { Loader2, TrendingUp } from 'lucide-react';

interface EquityGrowthChartProps {
  uid: string;
  equityAccounts: Account[];
}

export const EquityGrowthChart: React.FC<EquityGrowthChartProps> = ({ uid, equityAccounts }) => {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const q = query(collection(db, 'users', uid, 'transactions'), where('datetime', '>=', sixMonthsAgo.toISOString().split('T')[0]), orderBy('datetime', 'asc'));
    return onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(d => d.data() as Transaction));
      setLoading(false);
    });
  }, [uid]);

  const chartData = useMemo(() => {
    if (loading || history.length === 0) return [];
    const monthlySnapshots: Record<string, any> = {};
    let runningTotal = 0;
    history.forEach(tx => {
      const month = tx.datetime.substring(0, 7);
      const isEquity = equityAccounts.some(f => f.id === tx.debit_account_id || f.id === tx.credit_account_id);
      if (!isEquity) return;
      
      const amt = Number(tx.amount);
      if (equityAccounts.some(f => f.id === tx.credit_account_id)) runningTotal += amt;
      else runningTotal -= amt;

      monthlySnapshots[month] = { month, value: runningTotal };
    });
    return Object.values(monthlySnapshots).sort((a,b) => a.month.localeCompare(b.month));
  }, [history, equityAccounts, loading]);

  if (loading) return <div className="h-40 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="h-40 w-full relative pt-2">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" hide />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white p-2 rounded-lg text-[10px] font-black border border-white/10">
                       {currencyFormatter.format(Number(payload[0].value))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
           <TrendingUp size={24} className="opacity-10" />
           <p className="text-[9px] font-black uppercase tracking-widest">Không có biến động vốn</p>
        </div>
      )}
    </div>
  );
};

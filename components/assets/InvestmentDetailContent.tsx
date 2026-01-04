
import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Info, Wallet, Target, Clock, ShoppingCart, DollarSign, RefreshCcw, Loader2, Edit2, Check, X, PiggyBank, ArrowUpRight, ArrowDownRight, Maximize2 } from 'lucide-react';
import { Account } from '../../types';
import { currencyFormatter, calculateInvestmentPerformance, unitFormatter, percentFormatter } from '../../lib/utils';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis, CartesianGrid } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BuyInvestmentModal } from './BuyInvestmentModal';
import { SellInvestmentModal } from './SellInvestmentModal';

interface InvestmentDetailContentProps {
  account: Account;
  targetUid: string;
  onClose: () => void;
}

type TimeRange = '1W' | '1M' | '6M' | 'ALL';

export const InvestmentDetailContent: React.FC<InvestmentDetailContentProps> = ({ account, targetUid }) => {
  const [activeModal, setActiveModal] = useState<'BUY' | 'SELL' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  
  // Link Fund State
  const [isEditingFund, setIsEditingFund] = useState(false);
  const [linkedFundName, setLinkedFundName] = useState('Chưa liên kết');
  const [equityFunds, setEquityFunds] = useState<Account[]>([]);
  const [tempLinkedFundId, setTempLinkedFundId] = useState(account.linked_fund_id || '');

  const details = account.investment_details;
  const logs = account.investment_logs || [];

  const perf = useMemo(() => calculateInvestmentPerformance(details), [details]);

  // Filter Chart Data based on Range
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];
    
    let filteredLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const now = new Date();

    if (timeRange === '1W') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        filteredLogs = filteredLogs.filter(l => new Date(l.date) >= d);
    } else if (timeRange === '1M') {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        filteredLogs = filteredLogs.filter(l => new Date(l.date) >= d);
    } else if (timeRange === '6M') {
        const d = new Date(); d.setMonth(d.getMonth() - 6);
        filteredLogs = filteredLogs.filter(l => new Date(l.date) >= d);
    }

    // If less than 2 points, show at least last 2 or construct a line
    if (filteredLogs.length < 2 && logs.length > 0) {
        return logs.slice(-5).map(log => ({ 
            date: new Date(log.date).toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'}), 
            value: log.price 
        }));
    }

    return filteredLogs.map(log => ({ 
        date: new Date(log.date).toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'}), 
        value: log.price 
    }));
  }, [logs, timeRange]);

  useEffect(() => {
    const fetchFunds = async () => {
       const q = query(collection(db, 'users', targetUid, 'accounts'), where('category', '==', 'Equity Fund'));
       const snap = await getDocs(q);
       const funds = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
       setEquityFunds(funds);
       
       if (account.linked_fund_id) {
          const found = funds.find(f => f.id === account.linked_fund_id);
          if (found) setLinkedFundName(found.name);
       }
    };
    fetchFunds();
  }, [account.linked_fund_id, targetUid]);

  const handleUpdateLink = async () => {
     try {
        await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), {
           linked_fund_id: tempLinkedFundId
        });
        const found = equityFunds.find(f => f.id === tempLinkedFundId);
        setLinkedFundName(found ? found.name : 'Chưa liên kết');
        setIsEditingFund(false);
     } catch (e) {
        alert("Lỗi cập nhật liên kết quỹ");
     }
  };

  const handleAISyncPrice = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Find current market price in VND for asset: ${account.name} (Symbol: ${details?.symbol || account.name}). Return ONLY a JSON object: {"price": number}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { tools: [{ googleSearch: {} }] }
      });

      const jsonMatch = response.text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         const data = JSON.parse(jsonMatch[0]);
         if (data.price && details) {
            const now = new Date().toISOString();
            await updateDoc(doc(db, 'users', targetUid, 'accounts', account.id), {
               'investment_details.market_price': data.price,
               'investment_details.last_sync': now,
               current_balance: details.total_units * data.price
            });
            alert(`Đã cập nhật giá mới: ${currencyFormatter.format(data.price)}`);
         }
      }
    } catch (e) {
      console.error(e);
      alert("AI không thể truy xuất giá lúc này. Thử lại sau.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!details || details.total_units === 0) return (
    <div className="p-10 text-center flex flex-col items-center gap-6 animate-in fade-in duration-500">
       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 ring-8 ring-slate-50 shadow-inner">
          <Activity size={32} className="opacity-20" />
       </div>
       <div>
          <h3 className="text-lg font-black text-slate-900">Danh mục trống</h3>
          <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed max-w-[200px] mx-auto">
            Bạn chưa sở hữu đơn vị nào của tài sản này. Hãy thực hiện lệnh mua đầu tiên.
          </p>
          <button onClick={() => setActiveModal('BUY')} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all w-full justify-center">
             <ShoppingCart size={16} /> Mua ngay
          </button>
       </div>
       {activeModal === 'BUY' && <BuyInvestmentModal account={account} onClose={() => setActiveModal(null)} targetUid={targetUid} />}
    </div>
  );

  return (
    <div className="flex flex-col animate-in slide-in-from-bottom-4 duration-500 relative min-h-full pb-28">
      <div className="px-6 space-y-6">
        
        {/* 1. Hero Card (Value & P/L) */}
        <div className={`relative overflow-hidden rounded-[2.5rem] shadow-2xl p-7 text-white transition-all duration-500 ${perf?.isProfit ? 'bg-gradient-to-br from-emerald-600 to-teal-800' : 'bg-gradient-to-br from-rose-600 to-pink-800'}`}>
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Market Value</span>
                            {isSyncing && <Loader2 size={10} className="animate-spin opacity-70" />}
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter drop-shadow-sm">
                            {currencyFormatter.format(perf?.marketValue || 0)}
                        </h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                        {perf?.isProfit ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/5">
                        <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mb-1">Unrealized P/L</p>
                        <p className="text-lg font-black tracking-tight">
                            {perf?.isProfit ? '+' : ''}{currencyFormatter.format(perf?.unrealizedPnL || 0)}
                        </p>
                    </div>
                    <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/5">
                        <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mb-1">Return (ROI)</p>
                        <p className="text-lg font-black tracking-tight flex items-center gap-1">
                            {perf?.isProfit ? '+' : ''}{percentFormatter.format(perf?.roi || 0)}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. Interactive Chart */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Price History</span>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['1W', '1M', '6M', 'ALL'] as TimeRange[]).map(r => (
                        <button 
                            key={r} 
                            onClick={() => setTimeRange(r)}
                            className={`px-2.5 py-1 text-[9px] font-black rounded-md transition-all ${timeRange === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-40 w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={perf?.isProfit ? '#10b981' : '#f43f5e'} stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor={perf?.isProfit ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                itemStyle={{ color: perf?.isProfit ? '#059669' : '#e11d48' }}
                                formatter={(val: number) => currencyFormatter.format(val)}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={perf?.isProfit ? '#10b981' : '#f43f5e'} 
                                strokeWidth={2} 
                                fillOpacity={1} 
                                fill="url(#colorPrice)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-300">
                        <span className="text-[10px] font-bold uppercase">Not enough data</span>
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Clock size={12} />
                    <span>Last Sync: {details.last_sync ? new Date(details.last_sync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span>
                </div>
                <button onClick={handleAISyncPrice} disabled={isSyncing} className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50">
                    {isSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
                    Update
                </button>
            </div>
        </div>

        {/* 3. Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col gap-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">W. Avg Cost</p>
                <p className="text-sm font-black text-slate-900">{currencyFormatter.format(details.avg_price)}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col gap-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Market Price</p>
                <p className="text-sm font-black text-indigo-600">{currencyFormatter.format(details.market_price)}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col gap-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Holdings</p>
                <p className="text-sm font-black text-slate-900">{unitFormatter.format(details.total_units)} <span className="text-[9px] text-slate-400">{details.symbol}</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col gap-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Realized P/L</p>
                <p className="text-sm font-black text-slate-900">{currencyFormatter.format(account.realized_pnl || 0)}</p>
            </div>
        </div>

        {/* 4. Linked Fund Chip */}
        <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                <PiggyBank size={14} className="text-slate-400" />
                {isEditingFund ? (
                    <div className="flex items-center gap-2">
                        <select 
                            value={tempLinkedFundId} 
                            onChange={e => setTempLinkedFundId(e.target.value)}
                            className="text-[10px] font-bold bg-slate-50 rounded px-2 py-1 outline-none"
                        >
                            <option value="">Chọn quỹ...</option>
                            {equityFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button onClick={handleUpdateLink} className="text-emerald-600"><Check size={14} /></button>
                        <button onClick={() => setIsEditingFund(false)} className="text-slate-400"><X size={14} /></button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditingFund(true)} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{linkedFundName}</span>
                        <Edit2 size={10} className="text-slate-300" />
                    </button>
                )}
            </div>
        </div>

      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex gap-3 z-20 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
         <button 
            onClick={() => setActiveModal('BUY')} 
            className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
         >
            <ShoppingCart size={18} className="text-emerald-400" /> Buy More
         </button>
         <button 
            onClick={() => setActiveModal('SELL')} 
            className="flex-1 h-14 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-50"
         >
            <DollarSign size={18} className="text-rose-500" /> Sell
         </button>
      </div>

      {activeModal === 'BUY' && <BuyInvestmentModal account={account} onClose={() => setActiveModal(null)} targetUid={targetUid} />}
      {activeModal === 'SELL' && <SellInvestmentModal account={account} onClose={() => setActiveModal(null)} targetUid={targetUid} />}
    </div>
  );
};

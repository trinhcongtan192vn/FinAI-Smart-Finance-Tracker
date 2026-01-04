
import React, { useState } from 'react';
import { X, Camera, Calendar, CheckCircle2, Loader2, AlertCircle, Play, Database } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Account, Transaction, MonthlySnapshot, TransactionType } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface SnapshotManagerModalProps {
  onClose: () => void;
  targetUid: string;
}

export const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({ onClose, targetUid }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'SINGLE' | 'RANGE'>('SINGLE');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  // CORE LOGIC: Calculate snapshot for a specific month end
  const generateSnapshotForMonth = async (year: number, month: number, allAccounts: Account[], allTransactions: Transaction[]) => {
    // 1. Determine time boundaries
    // End of selected month (e.g., 2023-10-31 23:59:59)
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    const endDateStr = endDate.toISOString();
    
    // Start of selected month (for PnL)
    const startDate = new Date(year, month, 1, 0, 0, 0);
    const startDateStr = startDate.toISOString();

    const snapshotId = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    addLog(`Processing ${snapshotId}...`);

    // 2. Filter Transactions
    // For Balances: All transactions <= endDate
    const historicalTxns = allTransactions.filter(t => t.datetime <= endDateStr);
    
    // For PnL: Transactions strictly within the month
    const monthTxns = allTransactions.filter(t => t.datetime >= startDateStr && t.datetime <= endDateStr);

    // 3. Calculate Account Balances (Replay Ledger)
    const balances: Record<string, number> = {};
    
    // Initialize with 0
    allAccounts.forEach(acc => { balances[acc.id] = 0; });

    historicalTxns.forEach(t => {
      const amt = Number(t.amount);
      const debitAcc = balances[t.debit_account_id];
      const creditAcc = balances[t.credit_account_id];

      // Debit increases Assets, decreases Capital (Withdrawal) or Liability (Repayment)
      // Actually in our system: 
      // Assets: Debit (+), Credit (-)
      // Capital/Liability: Debit (-), Credit (+)
      
      const debitType = allAccounts.find(a => a.id === t.debit_account_id)?.group;
      const creditType = allAccounts.find(a => a.id === t.credit_account_id)?.group;

      if (debitType === 'ASSETS') balances[t.debit_account_id] = (balances[t.debit_account_id] || 0) + amt;
      else if (debitType === 'CAPITAL') balances[t.debit_account_id] = (balances[t.debit_account_id] || 0) - amt;

      if (creditType === 'ASSETS') balances[t.credit_account_id] = (balances[t.credit_account_id] || 0) - amt;
      else if (creditType === 'CAPITAL') balances[t.credit_account_id] = (balances[t.credit_account_id] || 0) + amt;
    });

    // 4. Calculate PnL
    let income = 0;
    let expense = 0;
    monthTxns.forEach(t => {
        const amt = Number(t.amount);
        if (t.group === 'INCOME') income += amt;
        if (t.group === 'EXPENSES') expense += amt;
    });

    // 5. Aggregate Summary
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    const accountsDetail = [];

    for (const acc of allAccounts) {
        const bal = balances[acc.id] || 0;
        if (acc.group === 'ASSETS') totalAssets += bal;
        else if (acc.category === 'Equity Fund') totalEquity += bal;
        else totalLiabilities += bal;

        accountsDetail.push({
            id: acc.id,
            name: acc.name,
            group: acc.group,
            category: acc.category,
            balance: bal
        });
    }

    const snapshotData: MonthlySnapshot = {
        id: snapshotId,
        snapshot_date: endDateStr,
        summary: {
            net_worth: totalAssets - totalLiabilities,
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            total_equity: totalEquity
        },
        accounts_detail: accountsDetail,
        pnl_performance: {
            income,
            expense,
            savings: income - expense
        },
        createdAt: new Date().toISOString()
    };

    return snapshotData;
  };

  const handleRun = async () => {
    if (loading) return;
    setLoading(true);
    setLogs([]);
    try {
        // 1. Fetch EVERYTHING (Optimization: Fetch once, process in memory)
        addLog("Fetching all ledger data...");
        const [accSnap, txSnap] = await Promise.all([
            getDocs(collection(db, 'users', targetUid, 'accounts')),
            getDocs(query(collection(db, 'users', targetUid, 'transactions'), orderBy('datetime', 'asc')))
        ]);

        const allAccounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        const allTransactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        
        addLog(`Loaded ${allAccounts.length} accounts, ${allTransactions.length} transactions.`);

        const monthsToProcess = [];
        if (mode === 'SINGLE') {
            if (!selectedMonth) throw new Error("Please select a month");
            monthsToProcess.push(selectedMonth);
        } else {
            if (!rangeStart || !rangeEnd) throw new Error("Please select start and end months");
            let current = new Date(rangeStart + '-01');
            const end = new Date(rangeEnd + '-01');
            while (current <= end) {
                monthsToProcess.push(current.toISOString().slice(0, 7));
                current.setMonth(current.getMonth() + 1);
            }
        }

        const batch = writeBatch(db);
        let opCount = 0;

        for (const mStr of monthsToProcess) {
            const [y, m] = mStr.split('-').map(Number);
            const snapshot = await generateSnapshotForMonth(y, m - 1, allAccounts, allTransactions); // month is 0-indexed in JS Date
            
            const ref = doc(db, 'users', targetUid, 'monthly_snapshots', snapshot.id);
            batch.set(ref, snapshot);
            opCount++;
            addLog(`Generated snapshot for ${snapshot.id}: NW ${currencyFormatter.format(snapshot.summary.net_worth)}`);
        }

        addLog(`Committing ${opCount} snapshots to database...`);
        await batch.commit();
        addLog("Success! Snapshots updated.");
        
        setTimeout(() => {
            onClose();
        }, 1500);

    } catch (e: any) {
        addLog(`Error: ${e.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                 <Camera size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900">{t('common.snapshots')}</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Balance Engine</p>
              </div>
           </div>
           <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
              <X size={24} />
           </button>
        </div>

        <div className="p-6 space-y-6">
           <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
              <Database size={20} className="text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-indigo-900 leading-relaxed">
                 Tính năng này sẽ quét lại toàn bộ Sổ cái (Ledger) để tái tạo chính xác số dư tài khoản tại các thời điểm trong quá khứ. Giúp báo cáo Net Worth tải nhanh gấp 10 lần.
              </p>
           </div>

           <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setMode('SINGLE')}
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${mode === 'SINGLE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >Một tháng</button>
              <button 
                onClick={() => setMode('RANGE')}
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${mode === 'RANGE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >Khoảng thời gian</button>
           </div>

           {mode === 'SINGLE' ? (
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chọn tháng chốt sổ</label>
                 <div className="relative">
                    <input 
                       type="month" 
                       value={selectedMonth} 
                       onChange={e => setSelectedMonth(e.target.value)} 
                       className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none"
                    />
                    <Calendar size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                 </div>
              </div>
           ) : (
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Từ tháng</label>
                    <input type="month" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 text-xs outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đến tháng</label>
                    <input type="month" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 text-xs outline-none" />
                 </div>
              </div>
           )}

           {logs.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 h-32 overflow-y-auto no-scrollbar font-mono text-[10px] text-green-400 space-y-1 border border-slate-800 shadow-inner">
                 {logs.map((l, i) => <div key={i}>> {l}</div>)}
              </div>
           )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <button 
             onClick={handleRun} 
             disabled={loading || (mode === 'RANGE' && (!rangeStart || !rangeEnd))} 
             className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
           >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {loading ? "Processing..." : "Generate Snapshots"}
           </button>
        </div>
      </div>
    </div>
  );
};

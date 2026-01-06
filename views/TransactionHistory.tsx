
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, ArrowUpDown, Database, Loader2, CalendarRange } from 'lucide-react';
import { ViewName, DataContext } from '../types';
import { collection, query, orderBy, onSnapshot, where, limit, QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EditTransactionModal } from '../components/dashboard/EditTransactionModal';
import { HistoryFilters } from '../components/history/HistoryFilters';
import { HistoryList } from '../components/history/HistoryList';
import { FinancialCalendar } from '../components/history/FinancialCalendar';
import { useTranslation } from 'react-i18next';

interface TransactionHistoryProps {
  onNavigate: (view: ViewName) => void;
  activeContext: DataContext;
  initialSearch?: string;
}

type SortKey = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';

const formatFriendlyDate = (dateStr: string) => {
  if (!dateStr) return 'Recent History';
  try {
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = datePart.split('-');
    if (parts.length !== 3) return datePart || 'Transaction Date';
    const [year, month, day] = parts.map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return datePart || 'Transaction Date';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch (e) { return dateStr || 'History'; }
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ onNavigate, activeContext, initialSearch = '' }) => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'date', order: 'desc' });
  const [groupFilter, setGroupFilter] = useState<'all' | 'INCOME' | 'EXPENSES'>('all');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Calendar View State
  const [showCalendar, setShowCalendar] = useState(true);

  // Default to current month (Local Time)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    // Helper to format YYYY-MM-DD in local time
    const toLocalYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      start: toLocalYMD(start),
      end: toLocalYMD(end)
    };
  });

  // Calendar Focus Date (Independent of range for navigation, but initialized by range)
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    setLoading(true);
    // Optimization: Apply date filters directly to Firestore Query
    const constraints: QueryConstraint[] = [
      orderBy('datetime', 'desc')
    ];

    if (dateRange.start) {
      constraints.push(where('datetime', '>=', dateRange.start));
    }
    if (dateRange.end) {
      // Add time to end date to include the full day
      const endDateFull = dateRange.end + 'T23:59:59';
      constraints.push(where('datetime', '<=', endDateFull));
    }

    constraints.push(limit(300));

    const q = query(collection(db, 'users', activeContext.uid, 'transactions'), ...constraints);

    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("History query error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [activeContext.uid, dateRange.start, dateRange.end]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = (t.note || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && (groupFilter === 'all' || t.group === groupFilter);
    }).sort((a, b) => {
      if (sortConfig.key === 'date') {
        return sortConfig.order === 'desc' ? new Date(b.datetime || b.date || b.createdAt).getTime() - new Date(a.datetime || a.date || a.createdAt).getTime() : new Date(a.datetime || a.date || a.createdAt).getTime() - new Date(b.datetime || b.date || b.createdAt).getTime();
      }
      return sortConfig.order === 'desc' ? Number(b.amount) - Number(a.amount) : Number(a.amount) - Number(b.amount);
    });
  }, [transactions, searchQuery, groupFilter, sortConfig]);

  const grouped = useMemo(() => {
    if (sortConfig.key === 'amount') return [['Ranked by Amount', filtered]];
    const groups: Record<string, any[]> = {};
    filtered.forEach(t => {
      const dateKey = (t.datetime || t.date || t.createdAt)?.split('T')[0] || 'No Date';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return Object.keys(groups).sort((a, b) => sortConfig.order === 'desc' ? b.localeCompare(a) : a.localeCompare(b)).map(k => [formatFriendlyDate(k), groups[k]]);
  }, [filtered, sortConfig]);

  // Sync calendar date when dateRange changes drastically
  useEffect(() => {
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      setCalendarDate(startDate);
    }
  }, [dateRange.start]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-white"><Loader2 size={40} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] font-display text-text-main pb-10">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-indigo-50/50 px-5 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => onNavigate(ViewName.DASHBOARD)} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-600 rounded-2xl shadow-sm"><ArrowLeft size={24} /></button>
          <div className="flex-1"><h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{t('history.title')}</h1><div className="flex items-center gap-2 mt-1.5"><Database size={12} className="text-indigo-500" /><p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{activeContext.displayName}{t('history.logs_suffix')}</p></div></div>

          <div className="flex gap-2">
            <button onClick={() => setShowCalendar(!showCalendar)} className={`w-12 h-12 flex items-center justify-center rounded-2xl shadow-sm transition-all ${showCalendar ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
              <CalendarRange size={20} />
            </button>
            <div className="relative">
              <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className={`w-12 h-12 flex items-center justify-center rounded-2xl shadow-sm ${isSortMenuOpen ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}><ArrowUpDown size={20} /></button>
              {isSortMenuOpen && (
                <><div className="fixed inset-0 z-10" onClick={() => setIsSortMenuOpen(false)}></div><div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border p-2 z-20">
                  {[
                    { l: t('history.sort_newest'), k: 'date', o: 'desc' },
                    { l: t('history.sort_oldest'), k: 'date', o: 'asc' },
                    { l: t('history.sort_amount_high'), k: 'amount', o: 'desc' },
                    { l: t('history.sort_amount_low'), k: 'amount', o: 'asc' }
                  ].map((opt, i) => (
                    <button key={i} onClick={() => { setSortConfig({ key: opt.k as any, order: opt.o as any }); setIsSortMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${sortConfig.key === opt.k && sortConfig.order === opt.o ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}>{opt.l}</button>
                  ))}
                </div></>
              )}
            </div>
          </div>
        </div>

        <HistoryFilters searchQuery={searchQuery} setSearchQuery={setSearchQuery} groupFilter={groupFilter} setGroupFilter={setGroupFilter} dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      <div className="flex-1 px-5 mt-6 flex flex-col">
        {/* Financial Calendar Visualization */}
        {showCalendar && (
          <FinancialCalendar
            transactions={filtered}
            currentDate={calendarDate}
            onMonthChange={setCalendarDate}
          />
        )}

        <HistoryList grouped={grouped} onEdit={setEditingTransaction} permission={activeContext.permission} sortKey={sortConfig.key} />
      </div>

      {editingTransaction && <EditTransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} targetUid={activeContext.uid} />}
    </div>
  );
};

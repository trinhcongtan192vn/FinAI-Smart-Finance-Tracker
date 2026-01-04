
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Target, Loader2, Edit2, Check, AlertCircle, TrendingDown } from 'lucide-react';
import { ViewName, DataContext } from '../types';
import { collection, query, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { currencyFormatter, getCategoryIcon, getCategoryColor, getCategoryLabel } from '../lib/utils';
import { useTranslation } from 'react-i18next';

// --- Local Sub-components ---

const BudgetSummaryCard: React.FC<{ totalBudget: number; totalSpent: number; totalProgressPct: number; isOver: boolean }> = ({ 
  totalBudget, totalSpent, totalProgressPct, isOver 
}) => {
  const { t } = useTranslation();
  return (
    <div className={`relative rounded-[2.5rem] overflow-hidden transition-all duration-500 shadow-xl ${isOver ? 'bg-red-600' : 'bg-slate-900'} text-white`}>
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -mr-16 -mt-16 opacity-30 ${isOver ? 'bg-orange-400' : 'bg-indigo-600'}`}></div>
      <div className="relative z-10 p-8 flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t('budget.total_budget', 'Total Monthly Budget')}</p>
            <h1 className="text-4xl font-black tracking-tight">{currencyFormatter.format(totalBudget)}</h1>
          </div>
          {isOver && <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-2 animate-pulse"><AlertCircle size={14} className="text-white" /><span className="text-[10px] font-black uppercase">{t('budget.over_budget', 'Over Budget')}</span></div>}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-end"><span className="text-sm font-bold text-white/80">{currencyFormatter.format(totalSpent)} {t('budget.spent', 'spent')}</span><span className={`text-sm font-black ${totalProgressPct > 90 ? 'text-white' : 'text-white/60'}`}>{totalProgressPct}%</span></div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5"><div className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.2)] ${isOver ? 'bg-white' : totalProgressPct > 80 ? 'bg-orange-400' : 'bg-indigo-400'}`} style={{ width: `${Math.min(100, totalProgressPct)}%` }}></div></div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center mt-1">
            {isOver 
              ? `${t('budget.exceeded_by', 'Exceeded by')} ${currencyFormatter.format(totalSpent - totalBudget)}` 
              : `${currencyFormatter.format(totalBudget - totalSpent)} ${t('budget.remaining', 'remaining this month')}`
            }
          </p>
        </div>
      </div>
    </div>
  );
};

const BudgetItemCard: React.FC<{ item: any; isViewOnly: boolean; onEdit: (it: any) => void }> = ({ item, isViewOnly, onEdit }) => {
  const { t } = useTranslation();
  const { icon } = getCategoryIcon(item.name);
  const { bg, text, bar } = getCategoryColor(item.name);
  const hasLimit = item.limit > 0;
  const pct = hasLimit ? Math.round((item.actuals / item.limit) * 100) : 0;
  const isOver = hasLimit && item.actuals > item.limit;
  const isWarning = hasLimit && pct >= 85 && pct <= 100;

  return (
    <div onClick={() => !isViewOnly && onEdit(item)} className={`flex flex-col gap-5 bg-white p-6 rounded-[2.5rem] shadow-soft border transition-all ${isOver ? 'border-red-100 bg-red-50/20' : isWarning ? 'border-orange-100 bg-orange-50/20' : 'border-slate-50'} ${isViewOnly ? '' : 'hover:shadow-md cursor-pointer active:scale-[0.98] group'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`${bg} ${text} flex items-center justify-center rounded-2xl shrink-0 w-12 h-12 group-hover:scale-110 transition-transform shadow-sm`}><span className="material-symbols-outlined text-[24px]">{icon}</span></div>
          <div className="min-w-0"><p className="text-slate-900 font-black text-base truncate leading-tight">{getCategoryLabel(item.name, t)}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isOver ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-slate-400'}`}>{hasLimit ? `${pct}% ${t('budget.limit_used', 'of limit used')}` : t('budget.no_limit_set', 'No limit set')}</p></div>
        </div>
        <div className="text-right">
          <p className={`text-base font-black flex items-center justify-end gap-2 ${isOver ? 'text-red-600' : 'text-slate-900'}`}>{currencyFormatter.format(item.actuals)}{!isViewOnly && <Edit2 size={12} className="text-slate-300 group-hover:text-indigo-600" />}</p>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Limit: {currencyFormatter.format(item.limit)}</p>
        </div>
      </div>
      {hasLimit && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1"><div className="flex items-center gap-1.5">{isOver ? <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Over!</span> : <span className="text-slate-400">Monthly Usage</span>}</div><span className={isOver ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-slate-600'}>{currencyFormatter.format(Math.max(0, item.limit - item.actuals))} {item.actuals > item.limit ? t('budget.over', 'over') : t('budget.left', 'left')}</span></div>
          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden shadow-inner p-0.5"><div className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-red-500' : isWarning ? 'bg-orange-400' : ''}`} style={{ width: `${Math.min(100, pct)}%`, backgroundColor: (isOver || isWarning) ? undefined : bar }}></div></div>
        </div>
      )}
    </div>
  );
};

const AdjustmentModal: React.FC<{ cat: any; val: string; setVal: (v: string) => void; isSaving: boolean; onSave: () => void; onCancel: () => void }> = ({ 
  cat, val, setVal, isSaving, onSave, onCancel 
}) => {
  const { t } = useTranslation();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '' || parseFloat(v) >= 0) {
      setVal(v);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && onCancel()}></div>
      <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-sm p-8 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 flex flex-col items-center text-center gap-8">
        <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-xl ${getCategoryColor(cat.name).bg} ${getCategoryColor(cat.name).text}`}><span className="material-symbols-outlined text-[48px]">{getCategoryIcon(cat.name).icon}</span></div>
        <div className="space-y-2"><h3 className="text-2xl font-black text-slate-900">{t('budget.adjust_title', 'Adjust Budget')}</h3><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{t('budget.target_for', 'Target for')} {getCategoryLabel(cat.name, t)}</p></div>
        <div className="w-full space-y-4">
          <div className="relative group">
            <input 
              type="number" 
              min="0"
              autoFocus 
              value={val} 
              onChange={handleInputChange} 
              onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
              className="w-full px-6 py-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent focus:border-indigo-100 focus:bg-white text-4xl font-black text-slate-900 outline-none transition-all text-center shadow-inner" 
              placeholder="0" 
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 font-black text-2xl">đ</div>
          </div>
          <p className="text-center text-sm font-bold text-indigo-600">{val ? currencyFormatter.format(Number(val)) : t('budget.enter_target', 'Enter target')}</p>
          <div className="grid grid-cols-3 gap-2">{[500000, 1000000, 5000000].map(a => <button key={a} onClick={() => setVal((Number(val || 0) + a).toString())} className="py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 active:scale-95 transition-all border border-indigo-100/50">+{a >= 1000000 ? `${a / 1000000}M` : `${a / 1000}k`}</button>)}</div>
        </div>
        <div className="flex flex-col gap-3 w-full pt-4">
          <button onClick={onSave} disabled={isSaving} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]">{isSaving ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Check size={24} className="text-indigo-400" />}{isSaving ? t('settings.saving', 'Saving...') : t('budget.confirm', 'Confirm Limit')}</button>
          <button onClick={onCancel} disabled={isSaving} className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm">{t('budget.go_back', 'Go Back')}</button>
        </div>
      </div>
    </div>
  );
};

// --- Main View ---

export const Budget: React.FC<{ onNavigate: (v: ViewName) => void; activeContext: DataContext }> = ({ onNavigate, activeContext }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [tempLimit, setTempLimit] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const uid = activeContext.uid;
    setLoading(true);
    const unsubCats = onSnapshot(query(collection(db, 'users', uid, 'categories')), s => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const unsubTxns = onSnapshot(query(collection(db, 'users', uid, 'transactions'), where('datetime', '>=', firstDay)), s => {
      setTransactions(s.docs.map(d => d.data()).filter(t => t.type === 'expense' || t.group === 'EXPENSES'));
      setLoading(false);
    });
    return () => { unsubCats(); unsubTxns(); };
  }, [activeContext.uid]);

  const budgetItems = useMemo(() => categories.filter(c => c.group === 'EXPENSES').map(cat => ({ ...cat, actuals: transactions.filter(t => t.category === cat.name).reduce((sum, t) => sum + Number(t.amount), 0), limit: cat.limit || 0 })).sort((a, b) => b.actuals - a.actuals), [categories, transactions]);
  const totalBudget = useMemo(() => budgetItems.reduce((sum, it) => sum + it.limit, 0), [budgetItems]);
  const totalSpent = useMemo(() => budgetItems.reduce((sum, it) => sum + it.actuals, 0), [budgetItems]);
  const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-white"><Loader2 size={40} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] font-display text-text-main pb-32 relative">
      <div className="flex items-center p-5 justify-between sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-indigo-50/50">
        <button onClick={() => onNavigate(ViewName.DASHBOARD)} className="flex w-10 h-10 shrink-0 items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
        <div className="flex flex-col items-center"><h2 className="text-slate-900 text-lg font-black leading-none">{t('budget.title', 'Monthly Budget')}</h2><span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{t('budget.subtitle', 'Expense Planning')}</span></div>
        <div className="w-10" />
      </div>
      <div className="flex-1 flex flex-col gap-6 px-5 pt-4">
        <BudgetSummaryCard totalBudget={totalBudget} totalSpent={totalSpent} totalProgressPct={totalPct} isOver={totalSpent > totalBudget && totalBudget > 0} />
        <div className="flex items-center justify-between mt-2 px-1"><h3 className="text-slate-900 text-lg font-black flex items-center gap-2"><TrendingDown size={20} className="text-indigo-600" />{t('budget.spending_limits', 'Spending Limits')}</h3></div>
        <div className="flex flex-col gap-4 pb-12">{budgetItems.length === 0 ? <div className="py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-4"><AlertCircle size={32} className="opacity-20" /><p className="text-xs font-black uppercase text-slate-400">{t('budget.no_limits', 'No expense categories')}</p></div> : budgetItems.map(it => <BudgetItemCard key={it.id} item={it} isViewOnly={activeContext.permission === 'view'} onEdit={c => { setEditingCat(c); setTempLimit(c.limit.toString()); }} />)}</div>
      </div>
      {editingCat && <AdjustmentModal cat={editingCat} val={tempLimit} setVal={setTempLimit} isSaving={isSaving} onCancel={() => setEditingCat(null)} onSave={() => { setIsSaving(true); updateDoc(doc(db, 'users', activeContext.uid, 'categories', editingCat.id), { limit: Number(tempLimit) || 0 }).then(() => { setEditingCat(null); setIsSaving(false); }).catch(() => setIsSaving(false)); }} />}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Loader2, TrendingUp, TrendingDown, RotateCcw, AlertCircle, Lock, Wallet, Landmark, PiggyBank, Tag } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CategoryItem } from './CategoryItem';
import { useTranslation } from 'react-i18next';

export type CategoryGroup = 'EXPENSES' | 'INCOME' | 'ASSETS' | 'CAPITAL';

export interface Category { 
  id: string; 
  name: string; 
  group: CategoryGroup;
  createdAt?: string; 
  expense_type?: 'FIXED' | 'VARIABLE';
}

export const CategorySetupModal: React.FC<{ 
    onClose: () => void, 
    targetUid: string, 
    permission: 'view' | 'edit' | 'owner' 
}> = ({ onClose, targetUid, permission }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<CategoryGroup>('EXPENSES');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newExpenseType, setNewExpenseType] = useState<'FIXED' | 'VARIABLE'>('VARIABLE');
  
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [permissionError, setPermissionError] = useState(false);

  const canManage = permission === 'owner';
  const isLockedGroup = ['ASSETS', 'CAPITAL'].includes(activeTab);

  useEffect(() => {
    const q = query(collection(db, 'users', targetUid, 'categories'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      setLoading(false);
      setPermissionError(false);
    }, (err) => {
      if (err.code === 'permission-denied') setPermissionError(true);
      setLoading(false);
    });
    return () => unsub();
  }, [targetUid]);

  const handleAdd = async () => {
    if (!newCategoryName.trim() || !canManage || isLockedGroup) return;
    setIsAdding(true);
    try {
      const data: any = {
        name: newCategoryName.trim(), 
        group: activeTab,
        createdAt: new Date().toISOString()
      };
      if (activeTab === 'EXPENSES') {
          data.expense_type = newExpenseType;
      }
      await addDoc(collection(db, 'users', targetUid, 'categories'), data);
      setNewCategoryName('');
    } catch (err) { alert("Permission denied by system rules."); } finally { setIsAdding(false); }
  };

  const handleUpdate = async (id: string, name: string) => {
    if (!canManage || isLockedGroup) return;
    try { 
      const updateObj: any = { name };
      await updateDoc(doc(db, 'users', targetUid, 'categories', id), updateObj); 
    }
    catch (err) { alert("Update failed."); }
  };

  const handleToggleType = async (cat: Category) => {
      if (!canManage || cat.group !== 'EXPENSES') return;
      const newType = cat.expense_type === 'FIXED' ? 'VARIABLE' : 'FIXED';
      try {
          await updateDoc(doc(db, 'users', targetUid, 'categories', cat.id), { expense_type: newType });
      } catch(e) { console.error(e); }
  };

  const handleResetAction = async () => {
    if (!canManage) return;
    setIsResetting(true); setShowResetConfirm(false);
    try {
      const snapshot = await getDocs(collection(db, 'users', targetUid, 'categories'));
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      
      const defaults: { name: string; group: CategoryGroup; expense_type?: 'FIXED' | 'VARIABLE' }[] = [
        // Expenses
        { name: 'Dining', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Transport', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Housing', group: 'EXPENSES', expense_type: 'FIXED' },
        { name: 'Health', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Self-growth', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Enjoyment', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Social', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Financial Expense', group: 'EXPENSES', expense_type: 'FIXED' },
        { name: 'Shopping', group: 'EXPENSES', expense_type: 'VARIABLE' },
        { name: 'Other Expense', group: 'EXPENSES', expense_type: 'VARIABLE' },
        // Income
        { name: 'Salary', group: 'INCOME' },
        { name: 'Bonus', group: 'INCOME' },
        { name: 'Passive Income', group: 'INCOME' },
        { name: 'Other Income', group: 'INCOME' },
        // Assets
        { name: 'Cash', group: 'ASSETS' },
        { name: 'Savings', group: 'ASSETS' },
        { name: 'Stocks', group: 'ASSETS' },
        { name: 'Crypto', group: 'ASSETS' },
        { name: 'Gold', group: 'ASSETS' },
        { name: 'Real Estate', group: 'ASSETS' },
        { name: 'Receivables', group: 'ASSETS' },
        // Capital
        { name: 'Equity Fund', group: 'CAPITAL' },
        { name: 'Bank Loan', group: 'CAPITAL' },
        { name: 'Personal Loan', group: 'CAPITAL' },
      ];

      defaults.forEach(cat => {
        const newDocRef = doc(collection(db, 'users', targetUid, 'categories'));
        batch.set(newDocRef, { ...cat, createdAt: new Date().toISOString() });
      });
      await batch.commit();
    } catch (err) { alert("Reset action failed."); } finally { setIsResetting(false); }
  };

  const filtered = categories.filter(c => c.group === activeTab);

  const tabs: { id: CategoryGroup; label: string; icon: any; color: string; desc: string }[] = [
    { id: 'EXPENSES', label: t('income_flow.expenses'), icon: TrendingDown, color: 'text-red-500', desc: t('manage_categories.expenses_desc') },
    { id: 'INCOME', label: t('history.income'), icon: TrendingUp, color: 'text-emerald-500', desc: t('manage_categories.income_desc') },
    { id: 'ASSETS', label: t('nav.assets'), icon: Landmark, color: 'text-indigo-500', desc: t('manage_categories.assets_desc') },
    { id: 'CAPITAL', label: t('nav.capital'), icon: PiggyBank, color: 'text-amber-500', desc: t('manage_categories.capital_desc') },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[2rem] w-full max-lg relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-2 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner"><Layers size={24} /></div>
              <div><h3 className="text-xl font-black text-slate-900">{t('manage_categories.title')}</h3><p className="text-sm font-medium text-slate-400">{t('manage_categories.subtitle')}</p></div>
           </div>
           <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-4 flex flex-col gap-4">
            <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                {tabs.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)} 
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[9px] font-black uppercase tracking-tight rounded-xl transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}
                  >
                    <tab.icon size={16} className={activeTab === tab.id ? tab.color : 'text-slate-400'} />
                    {tab.label}
                  </button>
                ))}
            </div>
            
            <div className="flex items-center justify-between px-1">
               <p className="text-[10px] font-bold text-slate-400 italic">"{currentTab?.desc}"</p>
               {(!canManage || isLockedGroup) && (
                 <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Lock size={10} /> {t('manage_categories.locked')}
                 </div>
               )}
            </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-6">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div> :
             permissionError ? <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 px-6"><p className="text-xs font-bold text-slate-400 leading-relaxed">Insufficient permissions.</p></div> :
             filtered.length === 0 ? <div className="text-center py-14 text-slate-400 font-bold bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-2"><Layers className="opacity-10" size={32} />{t('common.no_data')}</div> :
             <div className="flex flex-col gap-3">
                {filtered.map(cat => (
                    <div key={cat.id} className="group relative">
                        <CategoryItem 
                            cat={cat} 
                            onUpdate={handleUpdate} 
                            onDelete={setDeletingCat} 
                            isLastOfType={filtered.length <= 1} 
                            readOnly={!canManage || isLockedGroup} 
                        />
                        {/* Type Toggle for Expenses */}
                        {cat.group === 'EXPENSES' && canManage && (
                            <button 
                                onClick={() => handleToggleType(cat)}
                                className={`absolute right-24 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${cat.expense_type === 'FIXED' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                            >
                                {cat.expense_type === 'FIXED' ? t('manage_categories.type_fixed') : t('manage_categories.type_variable')}
                            </button>
                        )}
                    </div>
                ))}
             </div>}
        </div>

        {/* Action Footer */}
        {canManage && !permissionError && !isLockedGroup && (
          <div className="p-6 pt-4 border-t border-slate-100 bg-white flex flex-col gap-4">
            <div className="flex gap-3">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder={t('manage_categories.add_placeholder', { group: currentTab?.label })} className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none placeholder:text-slate-300" />
                
                {/* Expense Type Selector for Expense Tab */}
                {activeTab === 'EXPENSES' && (
                    <button 
                        onClick={() => setNewExpenseType(prev => prev === 'FIXED' ? 'VARIABLE' : 'FIXED')}
                        className={`w-20 rounded-2xl flex flex-col items-center justify-center border text-[9px] font-black uppercase tracking-widest ${newExpenseType === 'FIXED' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                        <span>{newExpenseType === 'FIXED' ? t('manage_categories.type_fixed') : t('manage_categories.type_variable')}</span>
                    </button>
                )}

                <button onClick={() => { handleAdd(); }} disabled={isAdding || !newCategoryName.trim()} className="w-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-slate-800 transition-all">{isAdding ? <Loader2 size={24} className="animate-spin" /> : <Plus size={28} />}</button>
            </div>
            
            <button onClick={() => { setShowResetConfirm(true); }} disabled={isResetting} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"><RotateCcw size={14} className={isResetting ? 'animate-spin' : ''} /> {t('manage_categories.restore_defaults')}</button>
          </div>
        )}

        {/* Overlays */}
        {deletingCat && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md"></div>
            <div className="relative flex flex-col items-center text-center max-w-xs">
              <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 shadow-inner"><AlertCircle size={40} /></div>
              <h4 className="text-2xl font-black text-slate-900">{t('manage_categories.delete_title')}</h4>
              <p className="text-sm font-medium text-slate-500 mt-2 mb-8 leading-relaxed">{t('manage_categories.delete_desc')}</p>
              <div className="flex flex-col gap-3 w-full">
                <button onClick={async () => { await deleteDoc(doc(db, 'users', targetUid, 'categories', deletingCat.id)); setDeletingCat(null); }} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200">{t('manage_categories.confirm_delete')}</button>
                <button onClick={() => setDeletingCat(null)} className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold">{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        )}
        {showResetConfirm && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md"></div>
            <div className="relative flex flex-col items-center text-center max-w-xs">
              <div className="w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 shadow-inner"><RotateCcw size={40} /></div>
              <h4 className="text-2xl font-black text-slate-900">{t('manage_categories.reset_title')}</h4>
              <p className="text-sm font-medium text-slate-500 mt-2 mb-8 leading-relaxed">{t('manage_categories.reset_desc')}</p>
              <div className="flex flex-col gap-3 w-full">
                <button onClick={() => { handleResetAction(); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">{t('manage_categories.restore_btn')}</button>
                <button onClick={() => setShowResetConfirm(false)} className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold">{t('manage_categories.go_back')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

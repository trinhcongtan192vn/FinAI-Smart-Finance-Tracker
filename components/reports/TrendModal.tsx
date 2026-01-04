
import React, { useState } from 'react';
import { X, Target, Edit2, Loader2, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { currencyFormatter, getCategoryColor, getCategoryIcon } from '../../lib/utils';
import { DataContext } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TrendModalProps {
  category: string;
  categoryFull: any;
  activeTab: string;
  data: any[];
  activeContext: DataContext;
  onClose: () => void;
}

export const TrendModal: React.FC<TrendModalProps> = ({ 
  category, 
  categoryFull,
  activeTab, 
  data, 
  activeContext,
  onClose 
}) => {
  const { icon } = getCategoryIcon(category);
  const colorScheme = getCategoryColor(category);
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempLimit, setTempLimit] = useState<string>(categoryFull?.limit?.toString() || "0");
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = activeContext.permission !== 'view' && activeTab === 'Month' && categoryFull?.type === 'expense';

  const handleSaveLimit = async () => {
    if (!categoryFull?.id) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', activeContext.uid, 'categories', categoryFull.id);
      await updateDoc(docRef, {
        limit: Number(tempLimit) || 0
      });
      setIsEditingGoal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to save budget limit.");
    } finally {
      setIsSaving(false);
    }
  };

  const addPreset = (amt: number) => {
    setTempLimit((prev) => (Number(prev || 0) + amt).toString());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSaving && onClose()}></div>
        <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] p-6 pb-10 sm:pb-8 shadow-2xl z-10 transform transition-transform animate-in slide-in-from-bottom duration-300 flex flex-col gap-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorScheme.bg} ${colorScheme.text} shadow-sm`}>
                        <span className="material-symbols-outlined text-2xl">{icon}</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{category}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trend Analysis ({activeTab})</p>
                    </div>
                </div>
                <button onClick={onClose} disabled={isSaving} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            {/* Goal Management Section (Only for Month tab & Expense cats) */}
            {activeTab === 'Month' && categoryFull?.type === 'expense' && (
              <div className={`p-5 rounded-3xl border transition-all ${isEditingGoal ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                {isEditingGoal ? (
                  <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">New Monthly Goal</span>
                       <button onClick={() => setIsEditingGoal(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-black text-xl">đ</div>
                      <input 
                        type="number" 
                        autoFocus
                        min="0"
                        value={tempLimit}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || parseFloat(val) >= 0) setTempLimit(val);
                        }}
                        onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                        className="w-full pl-10 pr-4 py-4 bg-white rounded-2xl text-2xl font-black text-slate-900 text-center outline-none border-2 border-transparent focus:border-indigo-200 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[100000, 500000, 1000000].map(amt => (
                        <button 
                          key={amt}
                          onClick={() => addPreset(amt)}
                          className="py-2 bg-white text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-wider border border-indigo-100 hover:bg-indigo-50 transition-colors"
                        >
                          +{amt / 1000}k
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={handleSaveLimit}
                      disabled={isSaving}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} 
                      {isSaving ? 'Updating...' : 'Confirm Goal'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <Target size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget Goal</p>
                        <p className="text-lg font-black text-slate-900">{currencyFormatter.format(categoryFull?.limit || 0)}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <button 
                        onClick={() => {
                          setTempLimit(categoryFull?.limit?.toString() || "0");
                          setIsEditingGoal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Chart Area */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Spending Pattern</span>
              <div className="h-60 w-full min-w-0 relative">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="label" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                                dy={10}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                                itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 800 }}
                                formatter={(value: number) => [currencyFormatter.format(value), 'Spent']}
                                cursor={{ fill: '#f8fafc', radius: 4 }}
                            />
                            <Bar 
                                dataKey="value" 
                                fill={colorScheme.bar} 
                                radius={[6, 6, 6, 6]}
                                maxBarSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold gap-2 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <Target size={32} className="opacity-10" />
                          <span className="text-sm">No activity recorded for this period</span>
                      </div>
                  )}
              </div>
            </div>
        </div>
    </div>
  );
};

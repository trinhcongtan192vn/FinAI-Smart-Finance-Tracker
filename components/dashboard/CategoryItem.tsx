
import React, { useState } from 'react';
import { Pencil, Trash2, Check, X, Loader2, Lock } from 'lucide-react';
import { getCategoryIcon, getCategoryLabel } from '../../lib/utils';
import { CategoryGroup } from './CategorySetupModal';
import { useTranslation } from 'react-i18next';

interface CategoryItemProps {
  cat: { id: string, name: string, group: CategoryGroup };
  onUpdate: (id: string, newName: string) => Promise<void>;
  onDelete: (cat: any) => void;
  isLastOfType: boolean;
  readOnly?: boolean;
}

export const CategoryItem: React.FC<CategoryItemProps> = ({ cat, onUpdate, onDelete, isLastOfType, readOnly = false }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(cat.name);
  const [isUpdating, setIsUpdating] = useState(false);

  const { icon, bg, text } = getCategoryIcon(cat.name);

  const handleUpdate = async () => {
    if (!editingName.trim() || readOnly) return;
    setIsUpdating(true);
    await onUpdate(cat.id, editingName);
    setIsUpdating(false);
    setIsEditing(false);
  };

  return (
    <div className={`flex flex-col p-4 rounded-2xl border transition-all ${isEditing ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${bg} ${text}`}>
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
          {isEditing ? (
            <input 
              type="text" autoFocus value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none shadow-sm min-w-0"
            />
          ) : (
            <div className="flex flex-col truncate">
              <span className="font-black text-slate-800 truncate">{getCategoryLabel(cat.name, t)}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{cat.group}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-3">
          {readOnly ? (
              <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-300 flex items-center gap-1.5">
                  <Lock size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{t('manage_categories.locked')}</span>
              </div>
          ) : isEditing ? (
            <>
              <button onClick={handleUpdate} disabled={isUpdating} className="p-2.5 text-emerald-500 hover:bg-emerald-100 rounded-xl transition-colors">
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
              </button>
              <button onClick={() => { setIsEditing(false); setEditingName(cat.name); }} disabled={isUpdating} className="p-2.5 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors">
                <X size={20} strokeWidth={3} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all">
                <Pencil size={18} />
              </button>
              <button 
                onClick={() => onDelete(cat)} disabled={isLastOfType}
                className={`p-2.5 transition-all rounded-xl ${isLastOfType ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Search, Loader2, Plus, X, Eye, Edit3 } from 'lucide-react';

interface SharingFormProps {
  shareEmail: string;
  setShareEmail: (val: string) => void;
  sharePermission: 'view' | 'edit';
  setSharePermission: (val: 'view' | 'edit') => void;
  isSearchingUsers: boolean;
  showDropdown: boolean;
  recommendations: any[];
  onSelectRecommendation: (email: string) => void;
  onAdd: () => void;
  isSharing: boolean;
}

export const SharingForm: React.FC<SharingFormProps> = ({
  shareEmail, setShareEmail, sharePermission, setSharePermission,
  isSearchingUsers, showDropdown, recommendations, onSelectRecommendation,
  onAdd, isSharing
}) => {
  return (
    <div className="flex flex-col gap-3 relative">
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Recipient Email</label>
        <div className="relative">
          <input 
            type="email" 
            value={shareEmail} 
            onChange={(e) => setShareEmail(e.target.value)} 
            className="w-full pl-11 pr-11 py-3.5 bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-indigo-100 transition-all text-slate-900 font-semibold outline-none shadow-inner" 
            placeholder="Search user by email..." 
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
            {isSearchingUsers ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Search size={18} />}
          </div>
          {shareEmail && (
             <button onClick={() => setShareEmail('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">
               <X size={14} />
             </button>
          )}
        </div>

        {showDropdown && recommendations.length > 0 && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white/95 backdrop-blur-xl border rounded-2xl shadow-2xl z-50 py-2">
            {recommendations.map((user) => (
              <button key={user.id} onClick={() => onSelectRecommendation(user.email)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-indigo-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="text-slate-300">U</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email.split('@')[0]}</p>
                  <p className="text-[10px] font-medium text-slate-400 truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setSharePermission('view')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl border transition-all ${sharePermission === 'view' ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400'}`}>
          <Eye size={14} /> View Only
        </button>
        <button onClick={() => setSharePermission('edit')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl border transition-all ${sharePermission === 'edit' ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400'}`}>
          <Edit3 size={14} /> Can Edit
        </button>
      </div>
      <button onClick={onAdd} disabled={isSharing || !shareEmail} className="w-full h-12 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
        {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Grant Access
      </button>
    </div>
  );
};
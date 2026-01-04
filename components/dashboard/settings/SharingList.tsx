import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { ShareDetail } from '../../../types';

interface SharingListProps {
  loading: boolean;
  sharedWithDetails: ShareDetail[];
  deletingEmail: string | null;
  confirmDeleteEmail: string | null;
  onRemove: (email: string) => void;
  onTogglePermission: (email: string) => void;
}

export const SharingList: React.FC<SharingListProps> = ({
  loading, sharedWithDetails, deletingEmail, confirmDeleteEmail, onRemove, onTogglePermission
}) => {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-100/50" /></div>;
  if (sharedWithDetails.length === 0) return <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed text-slate-400 text-xs font-bold">No active shares found.</div>;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Current Shared Access ({sharedWithDetails.length})</label>
      {sharedWithDetails.map((share) => {
        const isTargetDeleting = deletingEmail === share.email.toLowerCase();
        const isTargetConfirming = confirmDeleteEmail === share.email.toLowerCase();
        return (
          <div key={share.email} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-50 transition-colors">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-700 truncate">{share.email}</span>
              <button onClick={() => onTogglePermission(share.email)} disabled={isTargetDeleting} className={`text-[9px] font-black uppercase tracking-widest w-fit px-1.5 py-0.5 rounded transition-colors mt-0.5 ${share.permission === 'edit' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {share.permission === 'edit' ? 'Can Edit' : 'View Only'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isTargetConfirming ? (
                <button onClick={() => onRemove(share.email)} className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                  <Trash2 size={12} /> Confirm?
                </button>
              ) : (
                <button onClick={() => onRemove(share.email)} disabled={deletingEmail !== null} className={`p-2.5 rounded-xl transition-all ${isTargetDeleting ? 'text-slate-200' : 'text-slate-300 hover:text-red-500'}`}>
                  {isTargetDeleting ? <Loader2 size={18} className="animate-spin text-red-400" /> : <Trash2 size={18} />}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { RefreshCw, User, Database, Check, AlertCircle, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { DataContext, ShareDetail } from '../../../types';

interface IncomingTabProps {
  onSwitchContext: (context: DataContext) => void;
  activeContext: DataContext;
}

export const IncomingTab: React.FC<IncomingTabProps> = ({ onSwitchContext, activeContext }) => {
  const [incomingShares, setIncomingShares] = useState<DataContext[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultViewUid, setDefaultViewUid] = useState<string>('');

  const fetchDefaultView = async () => {
    if (!auth.currentUser) return;
    try {
      const d = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (d.exists()) setDefaultViewUid(d.data().defaultViewUid || '');
    } catch (e) { }
  };

  const toggleDefault = async (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    const newVal = defaultViewUid === uid ? '' : uid;
    setDefaultViewUid(newVal);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { defaultViewUid: newVal });
    } catch (e) { alert("Failed to save preference."); }
  };

  const findIncoming = async () => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) return;

    setLoading(true);
    setError(null);
    try {
      const emailLower = userEmail.trim().toLowerCase();
      // Truy vấn này có thể bị chặn bởi rules nếu chưa cấu hình allow list
      const q = query(collection(db, 'users'), where('sharedWithEmails', 'array-contains', emailLower));
      const snap = await getDocs(q);

      const incoming: DataContext[] = snap.docs.map(d => {
        const data = d.data();
        const myEntry = (data.sharedWithDetails || []).find((s: ShareDetail) => s.email.toLowerCase() === emailLower);
        return {
          uid: d.id,
          displayName: data.displayName || data.email?.split('@')[0] || 'Shared Account',
          email: data.email || 'No email',
          permission: myEntry?.permission || 'view'
        };
      });
      setIncomingShares(incoming);
    } catch (err: any) {
      console.error("Discovery error:", err);
      if (err.code === 'permission-denied') {
        setError("Không thể tìm kiếm tài khoản chia sẻ (Lỗi quyền truy cập).");
      } else {
        setError("Lỗi khi tải danh sách: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { findIncoming(); fetchDefaultView(); }, []);

  return (
    <div className="flex flex-col gap-5 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Tài khoản khả dụng</label>
        <button onClick={findIncoming} disabled={loading} className="text-indigo-600 p-1 hover:bg-indigo-50 rounded-lg transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <button
        onClick={() => onSwitchContext({
          uid: auth.currentUser?.uid || '',
          displayName: auth.currentUser?.displayName || 'Personal',
          email: auth.currentUser?.email || '',
          permission: 'owner'
        })}
        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${activeContext.uid === auth.currentUser?.uid ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeContext.uid === auth.currentUser?.uid ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
            <User size={20} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black">Tài khoản cá nhân</p>
            <p className={`text-[10px] font-bold ${activeContext.uid === auth.currentUser?.uid ? 'opacity-80' : 'text-slate-400'}`}>Chủ sở hữu</p>
          </div>
        </div>
        {activeContext.uid === auth.currentUser?.uid && <Check size={20} className="text-white" />}

        <div
          onClick={(e) => toggleDefault(auth.currentUser?.uid || '', e)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${defaultViewUid === auth.currentUser?.uid ? 'bg-amber-100 text-amber-500' : 'bg-transparent text-slate-300 hover:bg-slate-100'}`}
        >
          <span className="material-symbols-outlined text-[18px] font-bold">{defaultViewUid === auth.currentUser?.uid ? 'star' : 'star_border'}</span>
        </div>
      </button>

      <div className="h-px bg-slate-100 my-1"></div>

      {error && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-[10px] font-bold flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-100" /></div>}

      <div className="flex flex-col gap-3">
        {incomingShares.map((share) => (
          <button
            key={share.uid}
            onClick={() => onSwitchContext(share)}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${activeContext.uid === share.uid ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeContext.uid === share.uid ? 'bg-white/20' : 'bg-slate-100'}`}>
                <Database size={20} />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-black truncate">{share.displayName}</p>
                <p className={`text-[10px] font-bold ${activeContext.uid === share.uid ? 'opacity-70' : 'text-slate-400'} truncate`}>{share.email} • {share.permission}</p>
              </div>
            </div>
            {activeContext.uid === share.uid && <Check size={20} className="text-white" />}

            <div
              onClick={(e) => toggleDefault(share.uid, e)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${defaultViewUid === share.uid ? 'bg-amber-100 text-amber-500' : 'bg-transparent text-slate-300 hover:bg-slate-100'}`}
            >
              <span className="material-symbols-outlined text-[18px] font-bold">{defaultViewUid === share.uid ? 'star' : 'star_border'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
/* RETHINK: We need to inject the Default View logic directly into the list items. */

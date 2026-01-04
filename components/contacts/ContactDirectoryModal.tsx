
import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Phone, MessageCircle, ArrowUpRight, ArrowDownLeft, Loader2, Users } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FinancialContact } from '../../types';
import { currencyFormatter } from '../../lib/utils';
import { ContactForm } from './ContactForm';
import { ContactDetailModal } from './ContactDetailModal';

interface ContactDirectoryModalProps {
  onClose: () => void;
  targetUid: string;
}

export const ContactDirectoryModal: React.FC<ContactDirectoryModalProps> = ({ onClose, targetUid }) => {
  const [contacts, setContacts] = useState<FinancialContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<FinancialContact | undefined>(undefined);
  const [selectedContact, setSelectedContact] = useState<FinancialContact | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users', targetUid, 'contacts'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialContact)));
      setLoading(false);
    });
    return () => unsub();
  }, [targetUid]);

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone?.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 outline-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="bg-slate-50 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-100 shrink-0">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <Users size={20} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Danh bạ Tài chính</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Đối tượng vay / mượn</p>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
           </div>

           <div className="flex gap-3">
              <div className="flex-1 relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                 <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên hoặc SĐT..."
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all"
                 />
              </div>
              <button 
                onClick={() => { setEditingContact(undefined); setShowForm(true); }}
                className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"
              >
                 <UserPlus size={24} />
              </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-10">
           {loading ? (
             <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
           ) : filtered.length === 0 ? (
             <div className="py-20 text-center flex flex-col items-center gap-4 text-slate-300">
                <Users size={48} className="opacity-10" />
                <p className="text-sm font-bold uppercase tracking-widest">Không có dữ liệu</p>
             </div>
           ) : (
             <div className="flex flex-col gap-4">
                {filtered.map(contact => (
                  <div key={contact.id} 
                    onClick={() => setSelectedContact(contact)}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-indigo-100 cursor-pointer active:scale-[0.98] transition-all group"
                  >
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50">
                              {contact.avatar_url ? (
                                <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                   <Users size={24} />
                                </div>
                              )}
                           </div>
                           <div className="min-w-0">
                              <h4 className="text-base font-black text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">{contact.name}</h4>
                              <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                                 <Phone size={10} /> {contact.phone || 'Chưa có SĐT'}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-1">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setEditingContact(contact); setShowForm(true); }}
                             className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors"
                           >
                              <ArrowUpRight size={16} />
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                        <div className="bg-slate-50/50 p-3 rounded-2xl">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <ArrowDownLeft size={8} className="text-emerald-500" /> Phải thu
                           </p>
                           <p className="text-sm font-black text-slate-900 leading-none">
                              {currencyFormatter.format(contact.total_receivable || 0)}
                           </p>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-2xl">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <ArrowUpRight size={8} className="text-red-500" /> Phải trả
                           </p>
                           <p className="text-sm font-black text-slate-900 leading-none">
                              {currencyFormatter.format(contact.total_payable || 0)}
                           </p>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      {selectedContact && (
        <ContactDetailModal 
          contact={selectedContact}
          targetUid={targetUid}
          onClose={() => setSelectedContact(null)}
        />
      )}

      {showForm && (
        <ContactForm 
          targetUid={targetUid} 
          contact={editingContact} 
          onClose={() => { setShowForm(false); setEditingContact(undefined); }} 
        />
      )}
    </div>
  );
};

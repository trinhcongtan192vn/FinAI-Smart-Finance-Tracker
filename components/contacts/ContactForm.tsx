
import React, { useState, useRef } from 'react';
import { X, User, Phone, Save, Loader2, Camera } from 'lucide-react';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FinancialContact } from '../../types';
import { StandardInput } from '../ui/StandardInput';
import { compressImage } from '../../lib/utils';

interface ContactFormProps {
  targetUid: string;
  contact?: FinancialContact;
  onClose: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ targetUid, contact, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    phone: contact?.phone || '',
    avatar_url: contact?.avatar_url || ''
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Please select an image under 5MB.");
        return;
    }

    try {
        const base64Image = await compressImage(file);
        setFormData(prev => ({ ...prev, avatar_url: base64Image }));
    } catch (err) {
        console.error("Image processing failed", err);
        alert("Failed to process image.");
    }
  };

  const handleSave = async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) return;
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const contactData = {
        name: trimmedName,
        phone: formData.phone.trim(),
        avatar_url: formData.avatar_url,
        updatedAt: now
      };

      if (contact?.id) {
        // Cập nhật đối tượng hiện có
        const contactRef = doc(db, 'users', targetUid, 'contacts', contact.id);
        await setDoc(contactRef, contactData, { merge: true });
      } else {
        // Thêm đối tượng mới
        const contactsCol = collection(db, 'users', targetUid, 'contacts');
        await addDoc(contactsCol, {
          ...contactData,
          total_receivable: 0,
          total_payable: 0,
          createdAt: now
        });
      }
      onClose();
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      if (error.code === 'permission-denied') {
        alert("Bạn không có quyền thực hiện thao tác này trên tài khoản này.");
      } else {
        alert("Lỗi hệ thống: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !loading && onClose()}></div>
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
           <div className="flex flex-col">
              <h3 className="text-xl font-black text-slate-900">{contact ? 'Sửa thông tin' : 'Thêm đối tượng'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Danh bạ tài chính</p>
           </div>
           <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* Avatar Upload Area */}
        <div className="flex justify-center mb-6">
            <div 
                className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <User size={40} />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={24} className="text-white" />
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/png, image/jpeg, image/webp" 
                    className="hidden" 
                />
            </div>
        </div>

        <div className="space-y-5">
           <StandardInput 
             label="Tên đối tượng (Bắt buộc)"
             value={formData.name}
             onChange={(val) => setFormData({...formData, name: val})}
             placeholder="VD: Nguyễn Văn A"
             icon={User}
           />
           <StandardInput 
             label="Số điện thoại"
             value={formData.phone}
             onChange={(val) => setFormData({...formData, phone: val})}
             placeholder="090..."
             icon={Phone}
             type="tel"
           />
        </div>

        <div className="flex flex-col gap-3 mt-10">
           <button 
             onClick={handleSave}
             disabled={loading || !formData.name.trim()}
             className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50"
           >
             {loading ? (
               <>
                 <Loader2 size={20} className="animate-spin text-indigo-400" />
                 <span>Đang lưu...</span>
               </>
             ) : (
               <>
                 <Save size={20} className="text-indigo-400" />
                 <span>Lưu vào danh bạ</span>
               </>
             )}
           </button>
           <button 
             onClick={onClose}
             disabled={loading}
             className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
           >
             Hủy bỏ
           </button>
        </div>
      </div>
    </div>
  );
};

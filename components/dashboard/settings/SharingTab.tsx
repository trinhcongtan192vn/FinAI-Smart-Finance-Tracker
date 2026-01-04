
import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { ShareDetail } from '../../../types';
import { SharingForm } from './SharingForm';
import { SharingList } from './SharingList';

export const SharingTab: React.FC = () => {
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [sharedWithDetails, setSharedWithDetails] = useState<ShareDetail[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<any>(null);
  
  // Ref to prevent search trigger when selecting from dropdown
  const ignoreNextSearchRef = useRef(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) setSharedWithDetails(docSnap.data().sharedWithDetails || []);
      setLoadingList(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // If flag is set, reset it and skip search logic
    if (ignoreNextSearchRef.current) {
        ignoreNextSearchRef.current = false;
        return;
    }

    const queryStr = shareEmail.trim().toLowerCase();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (queryStr.length < 2) { setRecommendations([]); setShowDropdown(false); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const q = query(collection(db, 'users'), where('email', '>=', queryStr), where('email', '<=', queryStr + '\uf8ff'), limit(5));
        const snap = await getDocs(q);
        const found = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => u.email?.toLowerCase() !== auth.currentUser?.email?.toLowerCase());
        setRecommendations(found); setShowDropdown(found.length > 0);
      } finally { setIsSearchingUsers(false); }
    }, 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [shareEmail]);

  const syncSharing = async (details: ShareDetail[]) => {
    if (!auth.currentUser) return;
    const sanitized = details.filter(d => d && d.email).map(d => ({ email: d.email.toLowerCase().trim(), permission: d.permission }));
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { sharedWithDetails: sanitized, sharedWithEmails: sanitized.map(d => d.email) });
  };

  const handleAdd = async () => {
    const emailLower = shareEmail.trim().toLowerCase();
    if (!emailLower || emailLower === auth.currentUser?.email?.toLowerCase()) return;
    setIsSharing(true);
    try {
      const idx = sharedWithDetails.findIndex(s => s.email.toLowerCase() === emailLower);
      const updated = [...sharedWithDetails];
      if (idx > -1) updated[idx].permission = sharePermission; else updated.push({ email: emailLower, permission: sharePermission });
      await syncSharing(updated); setShareEmail(''); setShowDropdown(false);
    } catch (err: any) { alert(err.message); } finally { setIsSharing(false); }
  };

  const handleRemove = async (email: string) => {
    const emailLower = email.toLowerCase();
    if (confirmDeleteEmail !== emailLower) { setConfirmDeleteEmail(emailLower); setTimeout(() => setConfirmDeleteEmail(prev => prev === emailLower ? null : prev), 3000); return; }
    setConfirmDeleteEmail(null); setDeletingEmail(emailLower);
    try { await syncSharing(sharedWithDetails.filter(s => s.email.toLowerCase() !== emailLower)); } catch (err: any) { alert(err.message); } finally { setDeletingEmail(null); }
  };

  const togglePermission = (email: string) => {
    syncSharing(sharedWithDetails.map(s => s.email.toLowerCase() === email.toLowerCase() ? { ...s, permission: s.permission === 'view' ? 'edit' : 'view' } : s));
  };

  return (
    <div className="flex flex-col gap-5 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SharingForm 
        shareEmail={shareEmail} 
        setShareEmail={setShareEmail} 
        sharePermission={sharePermission} 
        setSharePermission={setSharePermission} 
        isSearchingUsers={isSearchingUsers} 
        showDropdown={showDropdown} 
        recommendations={recommendations} 
        onSelectRecommendation={(e) => { 
            ignoreNextSearchRef.current = true; // Set flag to ignore the subsequent search effect
            setShareEmail(e); 
            setShowDropdown(false); 
        }} 
        onAdd={handleAdd} 
        isSharing={isSharing} 
      />
      <SharingList loading={loadingList} sharedWithDetails={sharedWithDetails} deletingEmail={deletingEmail} confirmDeleteEmail={confirmDeleteEmail} onRemove={handleRemove} onTogglePermission={togglePermission} />
    </div>
  );
};

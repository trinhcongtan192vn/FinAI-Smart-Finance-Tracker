
import React, { useState } from 'react';
import { Settings, Wallet, Layers, LogOut, RotateCcw, Database, Lock, MessageSquare } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { DataContext } from '../../types';
import { useTranslation } from 'react-i18next';
import { FeedbackModal } from './FeedbackModal';

interface DashboardHeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  handleLogout: () => void;
  onOpenCategorySetup: () => void;
  onOpenAccountSettings: () => void;
  onOpenSecurity: () => void;
  onResetAccount: () => void;
  activeContext: DataContext;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  isMenuOpen, 
  setIsMenuOpen, 
  handleLogout, 
  onOpenCategorySetup,
  onOpenAccountSettings,
  onOpenSecurity,
  onResetAccount,
  activeContext
}) => {
  const { t } = useTranslation();
  const [showFeedback, setShowFeedback] = useState(false);
  const user = auth.currentUser;
  const isOwner = activeContext.permission === 'owner';
  
  // Prefer Firestore photoURL (from activeContext) over Auth photoURL
  const avatarUrl = activeContext.photoURL || user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-5 bg-white/80 backdrop-blur-xl border-b border-indigo-50/50">
      <div className="flex items-center gap-3 relative">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="relative group focus:outline-none"
        >
          <div 
            className={`w-10 h-10 rounded-full bg-cover bg-center ring-2 shadow-sm transition-transform group-active:scale-95 ${isOwner ? 'ring-white' : 'ring-indigo-500'}`}
            style={{ backgroundImage: `url("${avatarUrl}")` }}
          />
          {!isOwner && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                <Database size={10} />
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
        </button>
        
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
             {isOwner ? t('dashboard.hi_there') : t('dashboard.viewing_data')}
          </p>
          <h2 className="text-base font-black text-slate-900 leading-none flex items-center gap-1.5">
            {activeContext.displayName}
          </h2>
        </div>

        {/* User Menu Dropdown */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-4 w-64 bg-white/90 backdrop-blur-2xl rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white/50 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
            {[
              { label: t('settings.title'), icon: Settings, action: onOpenAccountSettings },
              { label: t('settings.categories'), icon: Layers, action: onOpenCategorySetup },
              { label: t('settings.change_password'), icon: Lock, action: onOpenSecurity },
              { label: t('settings.help_feedback'), icon: MessageSquare, action: () => setShowFeedback(true) },
            ].map((item, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  setIsMenuOpen(false);
                  if (item.action) item.action();
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
              </button>
            ))}
            
            <div className="h-px bg-slate-100 my-1 mx-2"></div>
            
            {isOwner && (
              <button 
                onClick={() => {
                    setIsMenuOpen(false);
                    onResetAccount();
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-orange-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <RotateCcw size={18} />
                </div>
                <span className="text-sm font-bold text-orange-600">{t('settings.reset_data')}</span>
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <LogOut size={18} />
              </div>
              <span className="text-sm font-bold text-red-600">{t('settings.logout')}</span>
            </button>
          </div>
        )}
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </header>
  );
};

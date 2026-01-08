
import React, { useState } from 'react';
import { X, User, Share2, Database } from 'lucide-react';
import { DataContext } from '../../types';
// Reading ProfileTab content first to decide where to place the setting.
import { ProfileTab } from './settings/ProfileTab';
import { SharingTab } from './settings/SharingTab';
import { IncomingTab } from './settings/IncomingTab';
import { useTranslation } from 'react-i18next';

interface AccountSettingsModalProps {
  onClose: () => void;
  onSwitchContext: (context: DataContext) => void;
  activeContext: DataContext;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ onClose, onSwitchContext, activeContext }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'sharing' | 'incoming'>('profile');

  const handleSwitch = (ctx: DataContext) => {
    onSwitchContext(ctx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{t('settings.title')}</h3>
              <p className="text-sm font-medium text-slate-400">{t('settings.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-6 py-4 shrink-0">
          <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100 w-full">
            {[
              { id: 'profile', label: t('settings.profile'), icon: User },
              { id: 'sharing', label: t('settings.share'), icon: Share2 },
              { id: 'incoming', label: t('settings.access'), icon: Database }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-indigo-50' : 'text-slate-400 hover:text-slate-500'}`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0 no-scrollbar">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'sharing' && <SharingTab />}
          {activeTab === 'incoming' && <IncomingTab onSwitchContext={handleSwitch} activeContext={activeContext} />}
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { Home, Plus, BarChart3, Landmark, Briefcase } from 'lucide-react';
import { ViewName } from '../types';
import { useTranslation } from 'react-i18next';

interface BottomNavProps {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const { t } = useTranslation();

  const navItems = [
    { view: ViewName.DASHBOARD, label: t('nav.home'), icon: Home },
    { view: ViewName.ASSETS, label: t('nav.assets'), icon: Briefcase },
    { view: ViewName.CAPITAL, label: t('nav.capital'), icon: Landmark },
    { view: ViewName.REPORTS, label: t('nav.reports'), icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none">
      <nav className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2.5rem] p-2 pointer-events-auto flex items-center justify-between relative">
        
        {/* Nav Items Left */}
        <div className="flex-1 flex justify-around items-center">
          {navItems.slice(0, 2).map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`p-3 rounded-2xl transition-all duration-300 active:scale-90 ${
                  isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'
                }`}
                title={item.label}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </div>

        {/* Floating Action Button for New Entry */}
        <div className="mx-2 flex items-center justify-center">
          <button
            id="nav-new-entry"
            type="button"
            onClick={() => onNavigate(ViewName.NEW_ENTRY)}
            className="w-14 h-14 rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-900/30 flex items-center justify-center transform transition-all hover:scale-105 active:scale-90 duration-300 cursor-pointer"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Nav Items Right */}
        <div className="flex-1 flex justify-around items-center">
           {navItems.slice(2).map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`p-3 rounded-2xl transition-all duration-300 active:scale-90 ${
                  isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'
                }`}
                title={item.label}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

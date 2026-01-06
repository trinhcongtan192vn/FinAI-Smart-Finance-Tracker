
import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, Play, Heart, GraduationCap, PiggyBank, Briefcase, Home } from 'lucide-react';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Account } from '../../types';
import { useTranslation, Trans } from 'react-i18next';

interface SixJarsWizardModalProps {
  onClose: () => void;
  targetUid: string;
  defaultFund: Account;
}

const JARS = [
  { id: 'NEC', code: 'NEC', pct: 55, color: '#4F46E5', icon: Home }, // Indigo
  { id: 'LTS', code: 'LTS', pct: 10, color: '#10b981', icon: PiggyBank }, // Emerald
  { id: 'FFA', code: 'FFA', pct: 10, color: '#8b5cf6', icon: Briefcase }, // Violet
  { id: 'EDU', code: 'EDU', pct: 10, color: '#3b82f6', icon: GraduationCap }, // Blue
  { id: 'PLAY', code: 'PLAY', pct: 10, color: '#ec4899', icon: Play }, // Pink
  { id: 'GIVE', code: 'GIVE', pct: 5, color: '#f59e0b', icon: Heart }, // Amber
];

export const SixJarsWizardModal: React.FC<SixJarsWizardModalProps> = ({ onClose, targetUid, defaultFund }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const oldName = defaultFund.name;

  const handleApply = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      // 1. Update Existing Default Fund -> NEC
      const necJar = JARS[0];
      const necRef = doc(db, 'users', targetUid, 'accounts', defaultFund.id);

      // Note: We use t() here to generate the initial name in the user's current language.
      // Firestore data is static once created, but this is acceptable for initialization.
      const necName = t(`six_jars.nec.name`);
      const necDesc = t(`six_jars.nec.desc`);

      batch.update(necRef, {
        name: `${necName} (${necJar.code})`,
        target_ratio: necJar.pct,
        color_code: necJar.color,
        description: necDesc,
        tags: ['SPENDING', 'NEC'],
        updatedAt: now
      });

      // 2. Create the other 5 Jars
      JARS.slice(1).forEach(jar => {
        const newRef = doc(collection(db, 'users', targetUid, 'accounts'));
        const jarName = t(`six_jars.${jar.code.toLowerCase()}.name`);
        const jarDesc = t(`six_jars.${jar.code.toLowerCase()}.desc`);

        batch.set(newRef, {
          id: newRef.id,
          name: `${jarName} (${jar.code})`,
          group: 'CAPITAL',
          category: 'Equity Fund',
          current_balance: 0, // Start empty, user needs to allocate
          status: 'ACTIVE',
          createdAt: now,
          color_code: jar.color,
          target_ratio: jar.pct,
          description: jarDesc,
          tags: [jar.id === 'FFA' ? 'INVESTMENT' : jar.id === 'LTS' ? 'SAVINGS' : 'SPENDING', jar.code]
        });
      });

      await batch.commit();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error initializing jars. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !loading && onClose()}></div>
      <div className="bg-white w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">

        {/* Header */}
        <div className="bg-indigo-600 p-8 pb-12 text-center relative overflow-hidden shrink-0">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:10px_10px] opacity-30"></div>
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg text-indigo-600 mb-2">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-white">{t('six_jars.title')}</h3>
            <p className="text-indigo-100 text-xs font-medium max-w-[260px] leading-relaxed">
              {t('six_jars.subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Jars Grid */}
        <div className="flex-1 overflow-y-auto p-6 -mt-6 bg-white rounded-t-[2.5rem] relative z-20 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {JARS.map((jar) => {
              const Icon = jar.icon;
              // Dynamic keys: six_jars.nec.name, six_jars.nec.desc
              const nameKey = `six_jars.${jar.code.toLowerCase()}.name`;
              const descKey = `six_jars.${jar.code.toLowerCase()}.desc`;

              return (
                <div key={jar.id} className="p-3 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: jar.color }}>
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-900" style={{ color: jar.color }}>{jar.pct}%</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">{t(nameKey)}</p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{t(descKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-medium text-slate-500 leading-relaxed text-center">
            <Trans i18nKey="six_jars.convert_msg" values={{ oldName }}>
              We will convert <strong>"{oldName}"</strong> into the <strong>Necessities Jar (55%)</strong> and create the remaining 5 jars for you.
            </Trans>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 bg-white shrink-0">
          <button
            onClick={handleApply}
            disabled={loading}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : t('six_jars.apply_btn')}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 hover:text-slate-600"
          >
            {t('six_jars.later_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

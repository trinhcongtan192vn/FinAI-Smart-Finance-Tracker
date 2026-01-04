
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Mascot } from './Mascot';
import { ReactionMood } from '../../lib/reactions';

interface ReactionToastProps {
  message: string;
  mood: ReactionMood;
  onDismiss: () => void;
  isVisible: boolean;
}

export const ReactionToast: React.FC<ReactionToastProps> = ({ message, mood, onDismiss, isVisible }) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Optional: Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 6000);
      
      // Haptic feedback if available on mobile
      if (navigator.vibrate) {
         navigator.vibrate([50, 50, 50]); 
      }

      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 500); // Wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed bottom-[110px] left-4 right-4 z-[90] flex items-end justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-90'}`}>
      <div className="bg-white/95 backdrop-blur-xl border border-indigo-50/50 p-5 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.35)] flex items-center gap-5 max-w-sm pointer-events-auto relative ring-4 ring-white/60">
        
        {/* Mascot - Popping out effect */}
        <div className="-mt-16 -ml-2 shrink-0 filter drop-shadow-xl transform transition-transform hover:scale-110 duration-300">
           <Mascot mood={mood} size={80} />
        </div>

        {/* Message Bubble */}
        <div className="flex-1 min-w-0 py-1 pr-2">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 opacity-80">FinBot Reaction</p>
           <p className="text-sm font-bold text-slate-800 leading-snug">
             "{message}"
           </p>
        </div>

        {/* Close Button */}
        <button 
          onClick={onDismiss}
          className="absolute -top-3 -right-2 w-9 h-9 bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center shadow-lg border border-slate-50 transition-all active:scale-90"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};


import React from 'react';
import { Bot, Smile, Frown, AlertTriangle, Zap } from 'lucide-react';
import { ReactionMood } from '../../lib/reactions';

interface MascotProps {
  mood: ReactionMood;
  size?: number;
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({ mood, size = 48, className = '' }) => {
  
  const getMascotStyle = () => {
    switch (mood) {
      case 'happy':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-600',
          icon: Smile,
          animation: 'animate-bounce'
        };
      case 'shocked':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-600',
          icon: Zap,
          animation: 'animate-pulse'
        };
      case 'sad':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-600',
          icon: Frown,
          animation: ''
        };
      case 'sarcastic':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-600',
          icon:  Bot, // Robot face often looks neutral/sarcastic
          animation: 'animate-spin-slow' // Custom spin or just still
        };
      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-600',
          icon: Bot,
          animation: ''
        };
    }
  };

  const style = getMascotStyle();
  const Icon = style.icon;

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`rounded-2xl flex items-center justify-center border-4 border-white shadow-lg transition-all duration-300 ${style.bg} ${style.text} ${style.animation}`}
        style={{ width: size, height: size }}
      >
        <Icon size={size * 0.6} strokeWidth={2.5} />
      </div>
      {/* Eye shine effect */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-60"></div>
    </div>
  );
};

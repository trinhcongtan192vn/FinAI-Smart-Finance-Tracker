
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ReactionToast } from '../ui/ReactionToast';
import { ReactionMood } from '../../lib/reactions';

interface ReactionContextType {
  showReaction: (message: string, mood: ReactionMood) => void;
}

const ReactionContext = createContext<ReactionContextType | undefined>(undefined);

export const useReaction = () => {
  const context = useContext(ReactionContext);
  if (!context) {
    throw new Error('useReaction must be used within a ReactionProvider');
  }
  return context;
};

export const ReactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeReaction, setActiveReaction] = useState<{ message: string; mood: ReactionMood } | null>(null);

  const showReaction = useCallback((message: string, mood: ReactionMood) => {
    // Clear previous reaction first to allow animation reset if needed
    setActiveReaction(null); 
    setTimeout(() => {
        setActiveReaction({ message, mood });
    }, 50);
  }, []);

  const dismissReaction = useCallback(() => {
    setActiveReaction(null);
  }, []);

  return (
    <ReactionContext.Provider value={{ showReaction }}>
      {children}
      {activeReaction && (
        <ReactionToast
          message={activeReaction.message}
          mood={activeReaction.mood}
          isVisible={!!activeReaction}
          onDismiss={dismissReaction}
        />
      )}
    </ReactionContext.Provider>
  );
};

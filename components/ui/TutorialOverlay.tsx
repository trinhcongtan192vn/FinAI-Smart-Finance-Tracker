
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X, Sparkles } from 'lucide-react';

export interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ steps, onComplete, onSkip }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ 
    w: typeof window !== 'undefined' ? window.innerWidth : 0, 
    h: typeof window !== 'undefined' ? window.innerHeight : 0 
  });
  
  const currentStep = steps[currentStepIndex];

  const updateTarget = useCallback(() => {
    const element = document.getElementById(currentStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Ensure we don't get negative width/height or weird values
      if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
      }
    }
  }, [currentStep.targetId]);

  useEffect(() => {
    // Initial size update
    setWindowSize({ 
      w: document.documentElement.clientWidth || window.innerWidth, 
      h: document.documentElement.clientHeight || window.innerHeight
    });

    const element = document.getElementById(currentStep.targetId);
    if (element) {
      // Smooth scroll with block: 'center' to ensure vertical visibility
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Small delay to allow scroll to settle
      setTimeout(updateTarget, 100);
    } else {
      const timer = setTimeout(updateTarget, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, currentStep.targetId, updateTarget]);

  useEffect(() => {
    const handleResize = () => {
        setWindowSize({ 
          w: document.documentElement.clientWidth || window.innerWidth, 
          h: document.documentElement.clientHeight || window.innerHeight
        });
        updateTarget();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateTarget, { capture: true, passive: true });
    
    const interval = setInterval(updateTarget, 100); // Polling for layout shifts
    const timeout = setTimeout(() => clearInterval(interval), 3000);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateTarget, { capture: true });
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [updateTarget]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!targetRect) return null;

  // Constants
  const SCREEN_PADDING = 16;
  const MARGIN = 16;
  const MAX_TOOLTIP_WIDTH = 340;
  
  // 1. Calculate Constrained Tooltip Width
  // Ensure it never exceeds screen width minus padding
  const availableWidth = windowSize.w - (SCREEN_PADDING * 2);
  const tooltipWidth = Math.min(MAX_TOOLTIP_WIDTH, availableWidth);
  
  let tooltipStyle: React.CSSProperties = {
    width: tooltipWidth,
    maxWidth: '90vw',
    position: 'fixed'
  };
  let arrowStyle: React.CSSProperties = {
      position: 'absolute',
      width: '14px',
      height: '14px',
      backgroundColor: 'white',
      transform: 'rotate(45deg)',
      boxShadow: '-2px -2px 5px rgba(0,0,0,0.03)' // Subtle shadow for depth
  };
  
  // 2. Determine "Visual Center" of the target
  const visibleTargetLeft = Math.max(0, targetRect.left);
  const visibleTargetRight = Math.min(windowSize.w, targetRect.right);
  const visualTargetCenterX = (visibleTargetLeft + visibleTargetRight) / 2;
  
  const visualTargetCenterY = targetRect.top + targetRect.height / 2;

  // 3. Determine Position
  let pos = currentStep.position;
  const isMobile = windowSize.w < 768;
  
  if (!pos || (isMobile && (pos === 'left' || pos === 'right'))) {
    // Auto decide Top or Bottom based on available space
    const spaceTop = targetRect.top;
    const spaceBottom = windowSize.h - targetRect.bottom;
    pos = spaceTop > spaceBottom && spaceTop > 250 ? 'top' : 'bottom';
  }

  if (pos === 'top') {
    let left = visualTargetCenterX - tooltipWidth / 2;
    left = Math.max(SCREEN_PADDING, Math.min(left, windowSize.w - tooltipWidth - SCREEN_PADDING));
    
    tooltipStyle.left = left;
    tooltipStyle.bottom = windowSize.h - targetRect.top + MARGIN;
    
    const arrowX = visualTargetCenterX - left;
    const safeArrowX = Math.max(20, Math.min(tooltipWidth - 20, arrowX));
    
    arrowStyle.left = safeArrowX;
    arrowStyle.bottom = -7;
    arrowStyle.transform = 'translateX(-50%) rotate(225deg)'; // Rotate to point down
    arrowStyle.boxShadow = '2px 2px 5px rgba(0,0,0,0.05)'; // Fix shadow direction

  } else if (pos === 'bottom') {
    let left = visualTargetCenterX - tooltipWidth / 2;
    left = Math.max(SCREEN_PADDING, Math.min(left, windowSize.w - tooltipWidth - SCREEN_PADDING));
    
    tooltipStyle.left = left;
    tooltipStyle.top = targetRect.bottom + MARGIN;
    
    const arrowX = visualTargetCenterX - left;
    const safeArrowX = Math.max(20, Math.min(tooltipWidth - 20, arrowX));
    
    arrowStyle.left = safeArrowX;
    arrowStyle.top = -7;
    arrowStyle.transform = 'translateX(-50%) rotate(45deg)';

  } else if (pos === 'left') {
    let top = visualTargetCenterY - 100;
    const maxTop = windowSize.h - 200 - SCREEN_PADDING; 
    top = Math.max(SCREEN_PADDING, Math.min(top, maxTop));

    tooltipStyle.top = top;
    tooltipStyle.right = windowSize.w - targetRect.left + MARGIN;
    
    const arrowY = visualTargetCenterY - top;
    arrowStyle.top = Math.max(24, Math.min(180, arrowY));
    arrowStyle.right = -7;
    arrowStyle.transform = 'translateY(-50%) rotate(45deg)';

  } else if (pos === 'right') {
    let top = visualTargetCenterY - 100;
    const maxTop = windowSize.h - 200 - SCREEN_PADDING; 
    top = Math.max(SCREEN_PADDING, Math.min(top, maxTop));

    tooltipStyle.top = top;
    tooltipStyle.left = targetRect.right + MARGIN;
    
    const arrowY = visualTargetCenterY - top;
    arrowStyle.top = Math.max(24, Math.min(180, arrowY));
    arrowStyle.left = -7;
    arrowStyle.transform = 'translateY(-50%) rotate(225deg)';
  }

  // Spotlight style
  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.top - 4, // Slight padding
    left: targetRect.left - 4,
    width: targetRect.width + 8,
    height: targetRect.height + 8,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
    borderRadius: '16px',
    pointerEvents: 'none',
    zIndex: 1000,
    transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
  };

  const isLastStep = currentStepIndex === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[1000] overflow-hidden touch-none" style={{ pointerEvents: 'auto' }}>
      {/* The Spotlight Hole */}
      <div 
        style={spotlightStyle} 
        className="ring-4 ring-indigo-500/50 animate-pulse"
      ></div>

      {/* The Tooltip */}
      <div 
        className="fixed z-[1001] bg-white p-6 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300 border border-white/50"
        style={tooltipStyle}
      >
        {/* Close Button */}
        <button 
            onClick={onSkip} 
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-all active:scale-90"
            aria-label="Close tutorial"
        >
            <X size={16} strokeWidth={2.5} />
        </button>
        
        {/* Content */}
        <div className="flex items-center gap-2 mb-2 text-indigo-600">
            <Sparkles size={20} className="fill-indigo-100" />
            <span className="text-[10px] font-black uppercase tracking-widest">FinAI Tip</span>
        </div>

        <h4 className="text-xl font-black text-slate-900 mb-2 leading-tight pr-6">{currentStep.title}</h4>
        
        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">
          {currentStep.content}
        </p>

        {/* Footer Action */}
        <div className="flex justify-end">
           <button 
             onClick={handleNext}
             className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95 transition-all hover:shadow-xl hover:-translate-y-0.5"
           >
             {isLastStep ? 'Đã hiểu' : 'Tiếp theo'} <ArrowRight size={16} />
           </button>
        </div>
        
        {/* Dynamic Arrow Pointer */}
        <div className="absolute z-[-1]" style={arrowStyle}></div>
      </div>
    </div>,
    document.body
  );
};

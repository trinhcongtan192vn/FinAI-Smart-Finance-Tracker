
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface AdvisorFabProps {
  onClick: () => void;
}

export const AdvisorFab: React.FC<AdvisorFabProps> = ({ onClick }) => {
  // Initial position will be calculated on mount to match bottom-right alignment
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs to track drag state without triggering re-renders for every pixel
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    // Set initial position to bottom-right (matching previous CSS: bottom-[130px] right-5)
    // 50px is approx button width, 20px is right margin (right-5)
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - 70, 
        y: window.innerHeight - 130
      });
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    const handleWindowMove = (e: PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // Prevent scrolling on mobile while dragging

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      // Determine if it's a drag or a click
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved.current = true;
      }

      let newX = buttonStartPos.current.x + deltaX;
      let newY = buttonStartPos.current.y + deltaY;

      // Boundary checks (Keep within screen with 10px margin)
      const BUTTON_SIZE = 48;
      const MARGIN = 10;
      const maxX = window.innerWidth - BUTTON_SIZE - MARGIN;
      const maxY = window.innerHeight - BUTTON_SIZE - MARGIN;

      newX = Math.max(MARGIN, Math.min(newX, maxX));
      newY = Math.max(MARGIN, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleWindowUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handleWindowMove);
      window.addEventListener('pointerup', handleWindowUp);
      window.addEventListener('pointercancel', handleWindowUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click or touch
    if (e.button !== 0) return;
    
    e.stopPropagation();
    // (Optional) e.target.setPointerCapture(e.pointerId); 
    
    setIsDragging(true);
    hasMoved.current = false;
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    buttonStartPos.current = { x: position.x, y: position.y };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  // Prevent rendering at (0,0) before hydration
  if (!isInitialized) return null;

  return (
    <div
      style={{ 
        left: position.x, 
        top: position.y,
        position: 'fixed',
        touchAction: 'none' // Critical for mobile dragging
      }}
      className={`z-[100] transition-transform ${isDragging ? 'scale-110 cursor-grabbing' : 'scale-100 cursor-grab animate-in zoom-in duration-300'}`}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <button
        className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center border-2 border-white/20 group relative overflow-hidden"
        aria-label="Chat with AI Advisor"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <Sparkles 
          size={20} 
          fill="currentColor" 
          className="text-white/90 transition-colors relative z-10" 
        />
        {/* Notification Dot */}
        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3 z-20 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
        </span>
      </button>
    </div>
  );
};

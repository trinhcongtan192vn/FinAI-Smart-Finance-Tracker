
import React, { useState, useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  animate?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, animate = false }) => {
  const [displayedContent, setDisplayedContent] = useState(animate ? '' : content);
  
  useEffect(() => {
    if (!animate) {
      setDisplayedContent(content);
      return;
    }

    // Reset if content changes significantly (new message)
    if (content !== displayedContent && displayedContent === '') {
        // Start animation
    } else if (content === displayedContent) {
        return; // Already done
    }

    let currentIndex = 0;
    const speed = 15; // ms per char
    
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        // Chunking for better performance on long text
        const chunkSize = 2; 
        const nextIndex = Math.min(currentIndex + chunkSize, content.length);
        
        setDisplayedContent(prev => content.substring(0, nextIndex));
        currentIndex = nextIndex;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, animate]);

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      // Handle empty lines for spacing
      if (!trimmed) return <div key={idx} className="h-2"></div>;

      const isList = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      const rawText = isList ? trimmed.substring(2) : line;

      // Parse bold syntax: **text**
      const parts = rawText.split(/(\*\*.*?\*\*)/g).map((part, i) => {
         if (part.startsWith('**') && part.endsWith('**')) {
           return (
             <strong 
               key={i} 
               className={role === 'user' ? 'font-black text-white' : 'font-black text-indigo-900'}
             >
               {part.slice(2, -2)}
             </strong>
           );
         }
         return part;
      });

      return (
        <div 
          key={idx} 
          className={`mb-1 last:mb-0 ${isList ? 'flex gap-2 ml-1' : ''}`}
        >
          {isList && (
            <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${role === 'user' ? 'bg-white' : 'bg-indigo-400'}`}></span>
          )}
          <p className={`leading-relaxed break-words max-w-full ${isList ? 'flex-1' : ''}`}>
             {parts}
          </p>
        </div>
      );
    });
  };

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
          {role === 'user' ? <User size={16} /> : <Bot size={16} />}
        </div>
        <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm overflow-hidden ${
          role === 'user' 
          ? 'bg-slate-900 text-white rounded-tr-none' 
          : 'bg-white text-slate-600 rounded-tl-none border border-slate-100'
        }`}>
          {renderFormattedText(displayedContent)}
        </div>
      </div>
    </div>
  );
};

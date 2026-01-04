
import React from 'react';
import { User, Bot, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  isProcessing?: boolean;
}

interface ChatThreadProps {
  messages: Message[];
  isLoading: boolean;
  t: any;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ messages, isLoading, t }) => {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
          <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="flex flex-col gap-2">
              {msg.image && (
                 <div className="w-40 rounded-2xl overflow-hidden shadow-md border border-slate-100">
                    <img src={msg.image} alt="Attached bill" className="w-full h-auto object-cover" />
                 </div>
              )}
              <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-slate-100 text-slate-900 rounded-tr-none' 
                : 'bg-indigo-50 text-indigo-900 rounded-tl-none border border-indigo-100'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start animate-in fade-in duration-300">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0"><Bot size={16} /></div>
            <div className="bg-indigo-50 p-4 rounded-2xl rounded-tl-none border border-indigo-100 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{t('new_entry.ai_processing')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React from 'react';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  onRunCode?: (code: string, language: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRunCode }) => {
  const isAssistant = message.role === 'assistant';

  const renderContent = (content: string) => {
    if (!content) return <span className="animate-pulse">Aetheris is analyzing...</span>;

    const parts = content.split(/(```[\s\S]*?```|`[^`]*`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        const language = (match?.[1] || 'text').toLowerCase();
        const code = match?.[2] || '';
        const canRun = ['javascript', 'js', 'html', 'css', 'typescript', 'ts', 'python', 'py'].includes(language);
        
        return (
          <div key={index} className="my-6 rounded-xl overflow-hidden border border-slate-800 shadow-2xl group/code relative text-left">
            <div className="bg-slate-800/80 px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-700/50">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                {language}
              </span>
              <div className="flex items-center gap-3">
                {canRun && onRunCode && (
                  <button 
                    onClick={() => onRunCode(code, language)}
                    className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Run Code
                  </button>
                )}
                <button 
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
            <pre className="p-4 bg-slate-950 overflow-x-auto text-sm font-mono leading-relaxed text-slate-300">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      
      if (part.startsWith('`')) {
        return (
          <code key={index} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs border border-slate-700/50">
            {part.slice(1, -1)}
          </code>
        );
      }

      return (
        <span key={index} className="whitespace-pre-wrap leading-7">
          {part}
        </span>
      );
    });
  };

  return (
    <div className={`flex gap-4 md:gap-6 ${isAssistant ? '' : 'flex-row-reverse'} max-w-5xl mx-auto w-full group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center border ${
        isAssistant 
          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-500' 
          : 'bg-slate-800 border-slate-700 text-slate-400'
      }`}>
        {isAssistant ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isAssistant ? '' : 'text-right'}`}>
        <div className={`inline-block text-left max-w-full ${
          isAssistant 
            ? 'text-slate-300' 
            : 'bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-3 text-slate-100 shadow-sm'
        }`}>
          {renderContent(message.content)}
        </div>
        
        <div className={`mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-widest ${isAssistant ? '' : 'justify-end'}`}>
          <span>{isAssistant ? 'Aetheris' : 'User'}</span>
          <span>•</span>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

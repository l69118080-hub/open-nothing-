
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { MessageItem } from './MessageItem';
import { CodeSandbox } from './CodeSandbox';

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const [sandboxData, setSandboxData] = useState<{ code: string; language: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRunCode = (code: string, language: string) => {
    setSandboxData({ code, language });
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className="h-16 flex items-center px-6 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-slate-100">Aetheris Architect</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Logic Engine Primed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4 py-10">
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">I am Aetheris.</h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              Your elite coding architect and computer science companion. I solve complex puzzles, optimize architecture, and execute logic from first principles.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {[
                "Explain Big O notation with code examples",
                "Show me a robust Red-Black Tree in TypeScript",
                "Create a responsive React dashboard layout",
                "How do JS event loops work internally?",
                "Write an interactive SVG animation in HTML"
              ].map((prompt, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-xl text-left text-sm text-slate-300 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-indigo-500/5 group"
                >
                  <span className="text-indigo-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} onRunCode={handleRunCode} />
          ))
        )}
      </div>

      {/* Input area */}
      <div className="p-4 md:p-8 pt-0">
        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative group"
        >
          <div className="relative flex items-end gap-2 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-2 pl-4 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all backdrop-blur-xl shadow-2xl">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 300)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Query the Aetheris logic engine..."
              className="w-full bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-500 py-3 max-h-[300px] resize-none text-sm md:text-base"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="mb-1 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Code Execution Sandbox Overlay */}
      {sandboxData && (
        <CodeSandbox 
          code={sandboxData.code} 
          language={sandboxData.language} 
          onClose={() => setSandboxData(null)} 
        />
      )}
    </div>
  );
};

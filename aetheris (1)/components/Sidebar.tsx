
import React from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  isOpen: boolean;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  activeId, 
  isOpen, 
  onNewSession, 
  onSelectSession,
  onDeleteSession 
}) => {
  return (
    <aside className={`
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      fixed md:static inset-y-0 left-0 z-40
      w-72 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out
      flex flex-col
    `}>
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Aetheris
          </h1>
        </div>
        
        <button 
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 transition-all font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Architect Call
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {sessions.map(session => (
          <div 
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`
              group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all
              ${activeId === session.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}
            `}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-sm font-medium truncate pr-6">{session.title}</span>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 text-slate-500 text-xs">
          <div className="flex-1">
            <p className="font-semibold uppercase tracking-wider mb-1">Architecture</p>
            <p className="text-indigo-400">Gemini 3 Pro Core</p>
          </div>
          <div className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded border border-indigo-500/20">
            Online
          </div>
        </div>
      </div>
    </aside>
  );
};

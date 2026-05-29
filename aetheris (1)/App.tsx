
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatContainer } from './components/ChatContainer';
import { Message, ChatSession } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize first session if none exists
  useEffect(() => {
    const savedSessions = localStorage.getItem('codenexus_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      createNewSession();
    }
  }, []);

  // Persist sessions
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('codenexus_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    geminiService.resetChat();
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    // Update session with user message
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const newTitle = s.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : s.title;
        return {
          ...s,
          title: newTitle,
          messages: [...s.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    // Add empty assistant message for streaming
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s
    ));

    try {
      let fullContent = '';
      const stream = geminiService.sendMessageStream(content, []);
      for await (const chunk of stream) {
        fullContent += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === assistantMsgId ? { ...m, content: fullContent } : m
              )
            };
          }
          return s;
        }));
      }
    } catch (error) {
       setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === assistantMsgId ? { ...m, content: '⚠️ Error: Failed to generate response. Please check your connection.' } : m
              )
            };
          }
          return s;
        }));
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-md md:hidden hover:bg-slate-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>

      <Sidebar 
        sessions={sessions}
        activeId={activeSessionId}
        isOpen={isSidebarOpen}
        onNewSession={createNewSession}
        onSelectSession={setActiveSessionId}
        onDeleteSession={deleteSession}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        <ChatContainer 
          messages={activeSession?.messages || []}
          onSendMessage={handleSendMessage}
        />
      </main>
    </div>
  );
};

export default App;

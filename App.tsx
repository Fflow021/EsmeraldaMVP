import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import { ChatSession } from './types';
import { Menu, MessageSquare, Trash2, Github, Loader2 } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize with one empty session if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'Novo Caso Clínico',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const updateSession = (updatedSession: ChatSession) => {
    setSessions((prev) => 
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    
    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:relative z-40 w-72 h-full bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-emerald-400 text-lg tracking-tight">Histórico de Casos</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1">
             <Menu size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                currentSessionId === session.id 
                  ? 'bg-emerald-900/50 text-white border border-emerald-700/50' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className={currentSessionId === session.id ? 'text-emerald-400' : 'text-slate-500'} />
                <span className="truncate text-sm font-medium">{session.title}</span>
              </div>
              <button 
                onClick={(e) => deleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
             <Github size={12} />
             <span>Projeto Esmeralda v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile Header Trigger */}
        <div className="md:hidden bg-white p-4 border-b border-slate-200 flex items-center justify-between">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
                <Menu size={24} />
            </button>
            <span className="font-semibold text-slate-800">Esmeralda</span>
            <div className="w-6" /> {/* Spacer */}
        </div>

        {currentSession ? (
          <ChatInterface 
            session={currentSession}
            onUpdateSession={updateSession}
            onNewChat={createNewSession}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
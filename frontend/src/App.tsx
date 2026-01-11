import { useState, useCallback, useEffect } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { DashboardPanel } from './components/DashboardPanel';
import { SettingsModal } from './components/SettingsModal';
import { sendChatMessage, getSystemStats, checkHealth, setApiKey } from './services/api';
import type { Message, MemoryActivation, ConversationStats } from './types';

const fallbackActivations: MemoryActivation[] = [
  {
    id: '1',
    title: 'System Ready',
    summary: 'Shadow Memory System initialized and ready for conversation',
    score: 0.5,
    category: 'context',
    lastAccessed: new Date(),
    selected: false,
  },
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activations, setActivations] = useState<MemoryActivation[]>(fallbackActivations);
  const [stats, setStats] = useState<ConversationStats>({
    totalMemories: 0,
    avgActivationScore: 0,
    memoriesRetrieved: 0,
    conversationTurns: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [storedApiKey, setStoredApiKey] = useState<string>(() => {
    return localStorage.getItem('openai_api_key') || '';
  });

  useEffect(() => {
    const initConnection = async () => {
      const health = await checkHealth();
      setIsConnected(!!health);
      setHasApiKey(health?.hasApiKey || false);
      
      if (health) {
        try {
          const serverStats = await getSystemStats();
          setStats(prev => ({
            ...prev,
            totalMemories: serverStats.totalMemories,
            avgActivationScore: serverStats.averageActivationScore,
          }));
          setHasApiKey(serverStats.hasApiKey);
        } catch {
          console.warn('Failed to fetch initial stats');
        }
      }
    };
    
    initConnection();
    const interval = setInterval(initConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (storedApiKey && isConnected) {
      setApiKey(storedApiKey).then(success => {
        if (success) setHasApiKey(true);
      });
    }
  }, [storedApiKey, isConnected]);

  const handleSaveApiKey = async (apiKey: string) => {
    setStoredApiKey(apiKey);
    localStorage.setItem('openai_api_key', apiKey);
    
    if (isConnected && apiKey) {
      const success = await setApiKey(apiKey);
      setHasApiKey(success);
    }
  };

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (isConnected) {
        const response = await sendChatMessage(content, storedApiKey || undefined);
        
        const newActivations: MemoryActivation[] = response.candidateMemories.map((m, idx) => ({
          id: m.id,
          title: `Memory ${idx + 1}`,
          summary: m.summary,
          score: m.score,
          category: mapRelevanceToCategory(m.relevanceType),
          lastAccessed: new Date(),
          selected: m.selected,
        }));

        if (newActivations.length > 0) {
          setActivations(newActivations);
        }

        setStats((prev) => ({
          totalMemories: response.stats.totalMemories,
          avgActivationScore: response.stats.averageActivationScore,
          memoriesRetrieved: prev.memoriesRetrieved + response.activatedMemories.length,
          conversationTurns: prev.conversationTurns + 2,
        }));

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setTimeout(() => {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: 'Backend not connected. Start the server with `npm run server` to enable the AI agent.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }, 500);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'An error occurred while processing your message. Please check the server connection.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, storedApiKey]);

  return (
    <div className="h-screen flex flex-col bg-neural-dark">
      <header className="flex items-center justify-between px-6 py-4 border-b border-neural-border bg-neural-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neural-cyan to-neural-violet flex items-center justify-center animate-pulse-glow">
            <svg className="w-5 h-5 text-neural-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-neural-text tracking-tight">
              Shadow Memory
            </h1>
            <p className="text-[10px] font-mono text-neural-muted uppercase tracking-widest">
              {hasApiKey ? 'AI Agent Active' : 'Memory System Only'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neural-dark border border-neural-border">
            <span className={`w-2 h-2 rounded-full ${isConnected ? (hasApiKey ? 'bg-neural-cyan' : 'bg-neural-amber') : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`}></span>
            <span className="text-xs font-mono text-neural-muted">
              {isConnected ? `${stats.totalMemories} memories` : 'Disconnected'}
            </span>
          </div>
          {!hasApiKey && isConnected && (
            <div className="px-2 py-1 rounded bg-neural-amber/20 border border-neural-amber/30">
              <span className="text-xs font-mono text-neural-amber">Add API Key</span>
            </div>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-neural-dark border border-neural-border hover:border-neural-cyan/50 transition-colors"
          >
            <svg className="w-5 h-5 text-neural-muted hover:text-neural-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-neural-border bg-neural-surface/30 flex-shrink-0 overflow-hidden">
          <DashboardPanel stats={stats} activations={activations} />
        </aside>

        <main className="flex-1 bg-neural-dark overflow-hidden relative">
          <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
          {isLoading && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
              <div className="px-4 py-2 rounded-full bg-neural-surface border border-neural-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neural-cyan animate-pulse"></div>
                <span className="text-xs font-mono text-neural-muted">
                  {hasApiKey ? 'AI thinking...' : 'Processing...'}
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        onSaveApiKey={handleSaveApiKey}
        currentApiKey={storedApiKey}
        hasApiKey={hasApiKey}
      />
    </div>
  );
}

function mapRelevanceToCategory(relevanceType: string): 'conversation' | 'knowledge' | 'context' | 'preference' {
  switch (relevanceType?.toLowerCase()) {
    case 'semantic':
    case 'embedding':
      return 'knowledge';
    case 'contextual':
      return 'context';
    case 'temporal':
      return 'conversation';
    default:
      return 'knowledge';
  }
}

export default App;

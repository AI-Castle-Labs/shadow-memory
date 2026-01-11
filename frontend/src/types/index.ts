export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface MemoryActivation {
  id: string;
  title: string;
  summary: string;
  score: number;
  category: 'conversation' | 'knowledge' | 'context' | 'preference';
  lastAccessed: Date;
  selected: boolean;
}

export interface ConversationStats {
  totalMemories: number;
  avgActivationScore: number;
  memoriesRetrieved: number;
  conversationTurns: number;
}

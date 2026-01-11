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

export type AgentPersonaId = 'general' | 'travel' | 'finance' | 'tech' | 'coach';

export interface AgentPersona {
  id: AgentPersonaId;
  name: string;
  description: string;
  systemPrompt: string;
  icon: 'sparkles' | 'plane' | 'chart' | 'terminal' | 'target';
  accentColor: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose';
}

export type SampleConversationId = 'travel' | 'finance' | 'tech';

export interface SampleMemory {
  content: string;
  topics?: string[];
}

export interface SampleConversation {
  id: SampleConversationId;
  name: string;
  description: string;
  messages: Omit<Message, 'id' | 'timestamp'>[];
  memories?: SampleMemory[];
}

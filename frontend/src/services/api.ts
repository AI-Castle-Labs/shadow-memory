const API_BASE = 'http://localhost:3001';

export interface MemoryCandidate {
  id: string;
  summary: string;
  score: number;
  relevanceType: string;
  selected: boolean;
}

export interface ChatResponse {
  content: string;
  memoryId: string;
  activatedMemories: MemoryCandidate[];
  candidateMemories: MemoryCandidate[];
  stats: {
    totalMemories: number;
    averageActivationScore: number;
  };
}

export interface SystemStats {
  totalMemories: number;
  averageActivationScore: number;
  memoryUsage: number;
  lastCleanup: string;
  hasApiKey: boolean;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  hasApiKey: boolean;
}

export async function sendChatMessage(
  message: string,
  apiKey?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, apiKey }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

export async function setApiKey(apiKey: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/config/apikey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  return response.ok;
}

export async function getSystemStats(): Promise<SystemStats> {
  const response = await fetch(`${API_BASE}/api/stats`);

  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  return response.json();
}

export async function clearConversationHistory(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/clear-history`, {
    method: 'POST',
  });

  return response.ok;
}

export async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

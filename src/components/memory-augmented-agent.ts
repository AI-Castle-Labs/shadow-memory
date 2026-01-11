import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { ShadowMemorySystem } from './shadow-memory-system';
import { EmbeddingGenerator } from './embedding-generator';
import { Context, MemoryAwareness } from '../types/core';

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MemoryCandidate {
  id: string;
  summary: string;
  score: number;
  relevanceType: string;
  selected: boolean;
}

export interface AgentResponse {
  content: string;
  memoryContext: {
    activatedMemories: MemoryCandidate[];
    candidateMemories: MemoryCandidate[];
    totalMemories: number;
    avgActivationScore: number;
  };
  storedMemoryId: string;
}

export class MemoryAugmentedAgent {
  private shadowMemory: ShadowMemorySystem;
  private embedder: EmbeddingGenerator;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private conversationHistory: ConversationMessage[] = [];

  constructor(shadowMemory: ShadowMemorySystem, config?: AgentConfig) {
    this.shadowMemory = shadowMemory;
    this.embedder = new EmbeddingGenerator();
    this.model = config?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    this.temperature = config?.temperature ?? 0.7;
    this.maxTokens = config?.maxTokens ?? 1024;
  }

  async chat(userMessage: string): Promise<AgentResponse> {
    const context = await this.buildContext(userMessage);
    const allCandidates = await this.shadowMemory.getAllCandidateMemories(context);
    const activatedMemories = await this.shadowMemory.getMemoryAwareness(context);
    const activatedIds = new Set(activatedMemories.map(a => a.memoryId));
    
    const memoryContextText = this.formatMemoryContext(activatedMemories);
    const response = await this.generateResponse(userMessage, memoryContextText, activatedMemories);
    
    const userMemoryId = await this.shadowMemory.storeMemory(
      `User: ${userMessage}`,
      { metadata: { ...context.metadata, intent: 'user_message' } }
    );

    await this.shadowMemory.storeMemory(
      `Assistant: ${response}`,
      { metadata: { ...context.metadata, intent: 'assistant_response' } }
    );

    this.conversationHistory.push({ role: 'user', content: userMessage });
    this.conversationHistory.push({ role: 'assistant', content: response });

    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    const stats = await this.shadowMemory.getSystemStats();

    const candidateMemories: MemoryCandidate[] = allCandidates.map(a => ({
      id: a.memoryId,
      summary: a.summary,
      score: a.activationScore,
      relevanceType: a.relevanceType,
      selected: activatedIds.has(a.memoryId),
    }));

    return {
      content: response,
      memoryContext: {
        activatedMemories: candidateMemories.filter(m => m.selected),
        candidateMemories,
        totalMemories: stats.totalMemories,
        avgActivationScore: activatedMemories.length > 0 
          ? activatedMemories.reduce((sum, a) => sum + a.activationScore, 0) / activatedMemories.length 
          : 0,
      },
      storedMemoryId: userMemoryId,
    };
  }

  private async generateResponse(
    userMessage: string,
    memoryContext: string,
    awareness: MemoryAwareness[]
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return this.generateFallbackResponse(userMessage, awareness);
    }

    try {
      const llm = new ChatOpenAI({
        modelName: this.model,
        openAIApiKey: apiKey,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      });

      const systemPrompt = this.buildSystemPrompt(memoryContext);
      const messages = this.buildMessageHistory(userMessage, systemPrompt);
      
      const response = await llm.invoke(messages);
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (error) {
      console.error('LLM error:', error);
      return this.generateFallbackResponse(userMessage, awareness);
    }
  }

  private buildSystemPrompt(memoryContext: string): string {
    return `You are a helpful AI assistant with access to a shadow memory system that provides you with relevant context from past conversations and stored knowledge.

MEMORY CONTEXT:
${memoryContext || 'No relevant memories activated for this query.'}

INSTRUCTIONS:
- Use the memory context naturally in your responses when relevant
- Reference past conversations or stored knowledge when it helps answer the user
- Be conversational and helpful
- If memories are relevant, you may acknowledge them briefly (e.g., "Based on our previous discussion..." or "I remember you mentioned...")
- Keep responses concise but informative
- If no memories are relevant, respond normally without forcing memory references`;
  }

  private buildMessageHistory(userMessage: string, systemPrompt: string) {
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(systemPrompt),
    ];

    const recentHistory = this.conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else {
        messages.push(new AIMessage(msg.content));
      }
    }

    messages.push(new HumanMessage(userMessage));
    return messages;
  }

  private async buildContext(message: string): Promise<Context> {
    const topics = this.extractTopics(message);
    const embedding = await this.embedder.generateEmbedding(message);
    
    return {
      content: message,
      metadata: {
        topics,
        entities: [],
        intent: 'conversation',
        temporalMarkers: [new Date()],
        structuralElements: [],
      },
      embedding,
      summary: message.slice(0, 100),
    };
  }

  private formatMemoryContext(awareness: MemoryAwareness[]): string {
    if (awareness.length === 0) {
      return '';
    }

    const highRelevance = awareness.filter(a => a.activationScore >= 0.7);
    const mediumRelevance = awareness.filter(a => a.activationScore >= 0.4 && a.activationScore < 0.7);

    let context = '';

    if (highRelevance.length > 0) {
      context += 'HIGHLY RELEVANT MEMORIES:\n';
      for (const mem of highRelevance.slice(0, 3)) {
        context += `- [Score: ${(mem.activationScore * 100).toFixed(0)}%] ${mem.summary}\n`;
      }
    }

    if (mediumRelevance.length > 0) {
      context += '\nPOTENTIALLY RELEVANT MEMORIES:\n';
      for (const mem of mediumRelevance.slice(0, 2)) {
        context += `- [Score: ${(mem.activationScore * 100).toFixed(0)}%] ${mem.summary}\n`;
      }
    }

    return context;
  }

  private generateFallbackResponse(userMessage: string, awareness: MemoryAwareness[]): string {
    const memoryCount = awareness.length;
    const hasRelevant = awareness.some(a => a.activationScore > 0.5);

    if (memoryCount === 0) {
      return `I've received your message: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}". I'm storing this in memory for future reference. To enable AI-powered responses, please add your OpenAI API key in settings.`;
    }

    if (hasRelevant) {
      const topMemory = awareness.sort((a, b) => b.activationScore - a.activationScore)[0];
      return `I found ${memoryCount} related memor${memoryCount === 1 ? 'y' : 'ies'} with the most relevant being: "${topMemory.summary.slice(0, 100)}..." (${(topMemory.activationScore * 100).toFixed(0)}% match). To get AI-powered responses using this context, add your OpenAI API key in settings.`;
    }

    return `I've stored your message and found ${memoryCount} weakly related memor${memoryCount === 1 ? 'y' : 'ies'}. Add your OpenAI API key in settings to enable conversational AI responses.`;
  }

  private extractTopics(message: string): string[] {
    const words = message.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'after', 'before', 'when', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'your', 'my', 'me']);
    
    return words
      .filter(w => w.length > 3 && !stopWords.has(w) && /^[a-z]+$/.test(w))
      .slice(0, 5);
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

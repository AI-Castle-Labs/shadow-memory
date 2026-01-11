import { MemoryAugmentedAgent } from '../src/components/memory-augmented-agent';
import { ShadowMemorySystem } from '../src/components/shadow-memory-system';
import { EmbeddingGenerator } from '../src/components/embedding-generator';
import { Context } from '../src/types/core';

describe('Agent memory usage', () => {
  test('ranks relevant memory highest for TypeScript AI query', async () => {
    const system = new ShadowMemorySystem();
    const embedder = new EmbeddingGenerator();

    const tsMemoryId = await system.storeMemory('Guide on building TypeScript AI memory systems with embeddings and activation scoring');
    await system.storeMemory('How to bake sourdough bread');

    const queryContent = 'Need advice on TypeScript AI memory systems and embeddings';
    const queryEmbedding = await embedder.generateEmbedding(queryContent);

    const context: Context = {
      content: queryContent,
      metadata: {
        topics: ['typescript', 'ai', 'memory', 'embeddings'],
        entities: [],
        intent: 'conversation',
        temporalMarkers: [new Date()],
        structuralElements: [],
      },
      embedding: queryEmbedding,
      summary: 'TypeScript AI memory systems with embeddings',
    };

    const candidates = await system.getAllCandidateMemories(context);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const [top] = candidates;
    expect(top.memoryId).toBe(tsMemoryId);
  });

  test('fallback response references top relevant memory when no API key', async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const fakeSystem = {
      getAllCandidateMemories: jest.fn().mockResolvedValue([
        { memoryId: 'mem-ts', activationScore: 0.82, relevanceType: 'semantic', summary: 'TypeScript embeddings guide', confidence: 0.9 },
        { memoryId: 'mem-cook', activationScore: 0.2, relevanceType: 'contextual', summary: 'Cooking tips', confidence: 0.4 },
      ]),
      getMemoryAwareness: jest.fn().mockResolvedValue([
        { memoryId: 'mem-ts', activationScore: 0.82, relevanceType: 'semantic', summary: 'TypeScript embeddings guide', confidence: 0.9 },
      ]),
      storeMemory: jest.fn().mockResolvedValue('mem-stored'),
      getSystemStats: jest.fn().mockResolvedValue({ totalMemories: 2, averageActivationScore: 0.8, memoryUsage: 0, lastCleanup: new Date() }),
    } as unknown as ShadowMemorySystem;

    const agent = new MemoryAugmentedAgent(fakeSystem);
    const result = await agent.chat('How do I handle embeddings in TS?');
    process.env.OPENAI_API_KEY = savedKey;

    expect(result.memoryContext.activatedMemories).toHaveLength(1);
    expect(result.memoryContext.activatedMemories[0].id).toBe('mem-ts');
    expect(result.memoryContext.candidateMemories).toHaveLength(2);
    expect(result.content.toLowerCase()).toContain('typescript embeddings guide');
  });

  test('uses thresholded activated memories only', async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const fakeSystem = {
      getAllCandidateMemories: jest.fn().mockResolvedValue([
        { memoryId: 'mem-strong', activationScore: 0.78, relevanceType: 'semantic', summary: 'Strongly relevant memory', confidence: 0.9 },
        { memoryId: 'mem-weak', activationScore: 0.15, relevanceType: 'contextual', summary: 'Weakly relevant memory', confidence: 0.3 },
      ]),
      getMemoryAwareness: jest.fn().mockResolvedValue([
        { memoryId: 'mem-strong', activationScore: 0.78, relevanceType: 'semantic', summary: 'Strongly relevant memory', confidence: 0.9 },
      ]),
      storeMemory: jest.fn().mockResolvedValue('mem-stored'),
      getSystemStats: jest.fn().mockResolvedValue({ totalMemories: 2, averageActivationScore: 0.78, memoryUsage: 0, lastCleanup: new Date() }),
    } as unknown as ShadowMemorySystem;

    const agent = new MemoryAugmentedAgent(fakeSystem);
    const result = await agent.chat('Tell me about the strong memory');
    process.env.OPENAI_API_KEY = savedKey;

    expect(result.memoryContext.activatedMemories.map(m => m.id)).toEqual(['mem-strong']);
    expect(result.memoryContext.candidateMemories).toHaveLength(2);
    const strong = result.memoryContext.candidateMemories.find(m => m.id === 'mem-strong');
    const weak = result.memoryContext.candidateMemories.find(m => m.id === 'mem-weak');
    expect(strong?.selected).toBe(true);
    expect(weak?.selected).toBe(false);
  });
});

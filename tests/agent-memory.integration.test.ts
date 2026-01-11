import { ShadowMemorySystem } from '../src/components/shadow-memory-system';
import { Context } from '../src/types/core';

describe('Memory awareness activation ranking', () => {
  test('returns highest score for matching memory content', async () => {
    const system = new ShadowMemorySystem();

    const tsMemoryId = await system.storeMemory('TypeScript project about AI memory management and embeddings');
    await system.storeMemory('Recipe for pasta with tomato sauce');

    const context: Context = {
      content: 'Advice on AI memory system design in TypeScript with embeddings',
      metadata: {
        topics: ['typescript', 'ai', 'memory', 'embeddings'],
        entities: [],
        intent: 'conversation',
        temporalMarkers: [new Date()],
        structuralElements: [],
      },
      embedding: {
        vector: Array(384).fill(0).map((_, i) => ((i % 13) - 6) / 10),
        model: 'test-model',
        dimensions: 384,
      },
      summary: 'AI memory system design in TypeScript',
    };

    const candidates = await system.getAllCandidateMemories(context);
    expect(candidates.length).toBeGreaterThanOrEqual(2);

    const [top, second] = candidates;
    expect(top.memoryId).toBe(tsMemoryId);
    if (second) {
      expect(top.activationScore).toBeGreaterThanOrEqual(second.activationScore);
    }
  });
});

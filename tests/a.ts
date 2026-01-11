import { ShadowMemorySystem } from '../src/index';
import { Context } from '../src/types/core';

async function runSample(): Promise<void> {
  const system = new ShadowMemorySystem();

  const memoryId = await system.storeMemory('Sample memory about TypeScript for an AI project');

  const context: Context = {
    content: 'Advice on language choice for an AI project using TypeScript',
    metadata: {
      topics: ['programming', 'typescript', 'ai', 'language-choice'],
      entities: [],
      intent: 'question',
      temporalMarkers: [],
      structuralElements: [],
    },
    embedding: {
      vector: Array(384)
        .fill(0)
        .map((_, i) => ((i % 11) - 5) / 10),
      model: 'example-model',
      dimensions: 384,
    },
    summary: 'User asks about TypeScript for AI project',
  };

  const awareness = await system.getMemoryAwareness(context);
  const retrieved = await system.retrieveMemory(memoryId);

  console.log('Awareness count:', awareness.length);
  console.log('Retrieved content:', retrieved?.content);
}

runSample().catch((err) => {
  console.error('Sample failed', err);
  process.exit(1);
});

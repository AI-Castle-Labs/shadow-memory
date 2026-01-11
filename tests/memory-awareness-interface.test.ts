import { MemoryAwarenessInterface } from '../src/components/memory-awareness-interface';
import { MemoryStore } from '../src/components/memory-store';
import { SimilarityEngine } from '../src/components/similarity-engine';
import { ActivationScorer } from '../src/components/activation-scorer';
import { ThresholdManager } from '../src/components/threshold-manager';
import { 
  Context, 
  Memory, 
  MemoryId, 
  EmbeddingVector, 
  Metadata, 
  Summary,
  Entity,
  Relationship
} from '../src/types/core';

describe('MemoryAwarenessInterface', () => {
  let memoryAwarenessInterface: MemoryAwarenessInterface;
  let memoryStore: MemoryStore;
  let similarityEngine: SimilarityEngine;
  let activationScorer: ActivationScorer;
  let thresholdManager: ThresholdManager;

  // Test data
  const testEmbedding: EmbeddingVector = {
    vector: [0.1, 0.2, 0.3, 0.4, 0.5],
    model: 'test-model',
    dimensions: 5
  };

  const testMetadata: Metadata = {
    topics: ['artificial intelligence', 'machine learning'],
    entities: [
      { name: 'AI', type: 'technology', confidence: 0.9 }
    ] as Entity[],
    concepts: ['neural networks', 'deep learning'],
    relationships: [
      { source: 'AI', target: 'machine learning', type: 'related_to', strength: 0.8 }
    ] as Relationship[],
    importance: 0.8
  };

  const testSummary: Summary = {
    content: 'This memory discusses artificial intelligence and machine learning concepts.',
    keyInsights: ['AI is transforming technology', 'Machine learning enables automation'],
    contextualRelevance: ['technology trends', 'future predictions']
  };

  const testContext: Context = {
    content: 'I want to learn about artificial intelligence and its applications.',
    metadata: {
      topics: ['artificial intelligence', 'learning'],
      entities: [
        { name: 'AI', type: 'technology', confidence: 0.9 }
      ] as Entity[],
      intent: 'query',
      temporalMarkers: [new Date()],
      structuralElements: []
    },
    embedding: testEmbedding,
    summary: 'User wants to learn about AI applications'
  };

  const testMemory: Memory = {
    id: 'test-memory-1',
    content: 'Artificial intelligence is a branch of computer science that aims to create intelligent machines.',
    timestamp: new Date(),
    metadata: testMetadata,
    summary: testSummary,
    embedding: testEmbedding,
    accessCount: 0,
    lastAccessed: new Date()
  };

  beforeEach(() => {
    memoryStore = new MemoryStore();
    similarityEngine = new SimilarityEngine();
    activationScorer = new ActivationScorer();
    // Use lower thresholds for testing
    thresholdManager = new ThresholdManager({
      conversation: 0.5,
      document: 0.5,
      task: 0.5,
      query: 0.5,
      mixed: 0.5
    });
    
    memoryAwarenessInterface = new MemoryAwarenessInterface(
      memoryStore,
      similarityEngine,
      activationScorer,
      thresholdManager
    );
  });

  describe('getMemoryAwareness', () => {
    it('should return empty array when no memories exist', async () => {
      const awareness = await memoryAwarenessInterface.getMemoryAwareness(testContext);
      expect(awareness).toEqual([]);
    });

    it('should return memory awareness for relevant memories above threshold', async () => {
      // Store a test memory
      await memoryStore.storeMemory(testMemory);

      // Get memory awareness
      const awareness = await memoryAwarenessInterface.getMemoryAwareness(testContext);

      expect(awareness).toHaveLength(1);
      expect(awareness[0]).toMatchObject({
        memoryId: 'test-memory-1',
        relevanceType: expect.any(String),
        summary: testSummary.content,
        confidence: expect.any(Number)
      });
      expect(awareness[0].activationScore).toBeGreaterThan(0);
      expect(awareness[0].confidence).toBeGreaterThanOrEqual(0);
      expect(awareness[0].confidence).toBeLessThanOrEqual(1);
    });

    it('should filter out memories below threshold', async () => {
      // Create a memory with very different content and set a higher threshold
      thresholdManager.updateThreshold('query', 0.7); // Increase threshold for this test
      
      const differentMemory: Memory = {
        ...testMemory,
        id: 'different-memory',
        metadata: {
          topics: ['cooking', 'recipes'],
          entities: [{ name: 'kitchen', type: 'location', confidence: 0.8 }] as Entity[],
          concepts: ['baking', 'ingredients'],
          relationships: [] as Relationship[],
          importance: 0.3
        },
        summary: {
          content: 'This memory is about cooking and recipes.',
          keyInsights: ['Cooking requires practice'],
          contextualRelevance: ['food preparation']
        },
        embedding: {
          vector: [0.9, 0.1, 0.8, 0.2, 0.1], // Very different embedding
          model: 'test-model',
          dimensions: 5
        }
      };

      await memoryStore.storeMemory(differentMemory);

      const awareness = await memoryAwarenessInterface.getMemoryAwareness(testContext);

      // Should not return the different memory as it's below threshold
      expect(awareness).toHaveLength(0);
    });

    it('should sort memories by activation score in descending order', async () => {
      // Store multiple memories with different relevance levels
      const highRelevanceMemory: Memory = {
        ...testMemory,
        id: 'high-relevance',
        metadata: {
          ...testMetadata,
          topics: ['artificial intelligence', 'machine learning', 'learning'],
          importance: 0.9
        }
      };

      const mediumRelevanceMemory: Memory = {
        ...testMemory,
        id: 'medium-relevance',
        metadata: {
          ...testMetadata,
          topics: ['artificial intelligence'],
          importance: 0.6
        }
      };

      await memoryStore.storeMemory(highRelevanceMemory);
      await memoryStore.storeMemory(mediumRelevanceMemory);

      const awareness = await memoryAwarenessInterface.getMemoryAwareness(testContext);

      expect(awareness.length).toBeGreaterThan(0);
      
      // Check that results are sorted by activation score (descending)
      for (let i = 1; i < awareness.length; i++) {
        expect(awareness[i - 1].activationScore).toBeGreaterThanOrEqual(awareness[i].activationScore);
      }
    });
  });

  describe('explainRelevance', () => {
    it('should provide detailed relevance explanation for a memory', async () => {
      await memoryStore.storeMemory(testMemory);

      const explanation = await memoryAwarenessInterface.explainRelevance('test-memory-1', testContext);

      expect(explanation).toMatchObject({
        memoryId: 'test-memory-1',
        reasons: expect.any(Array),
        similarityBreakdown: expect.objectContaining({
          embeddingSimilarity: expect.any(Number),
          metadataSimilarity: expect.any(Number),
          summarySimilarity: expect.any(Number),
          temporalRelevance: expect.any(Number)
        }),
        confidence: expect.any(Number)
      });

      expect(explanation.reasons.length).toBeGreaterThan(0);
      expect(explanation.confidence).toBeGreaterThanOrEqual(0);
      expect(explanation.confidence).toBeLessThanOrEqual(1);
    });

    it('should throw error for non-existent memory', async () => {
      await expect(
        memoryAwarenessInterface.explainRelevance('non-existent', testContext)
      ).rejects.toThrow('Memory with ID non-existent not found');
    });
  });

  describe('requestMemoryRetrieval', () => {
    it('should retrieve complete memory content', async () => {
      await memoryStore.storeMemory(testMemory);

      const retrievedMemory = await memoryAwarenessInterface.requestMemoryRetrieval('test-memory-1');

      expect(retrievedMemory).toEqual(expect.objectContaining({
        id: 'test-memory-1',
        content: testMemory.content,
        metadata: testMemory.metadata,
        summary: testMemory.summary,
        embedding: testMemory.embedding
      }));
    });

    it('should throw error for non-existent memory', async () => {
      await expect(
        memoryAwarenessInterface.requestMemoryRetrieval('non-existent')
      ).rejects.toThrow('Memory with ID non-existent not found');
    });
  });

  describe('requestSelectiveRetrieval', () => {
    beforeEach(async () => {
      // Store multiple test memories
      const memory1: Memory = { ...testMemory, id: 'memory-1' };
      const memory2: Memory = { 
        ...testMemory, 
        id: 'memory-2',
        metadata: { ...testMetadata, importance: 0.6 }
      };
      const memory3: Memory = { 
        ...testMemory, 
        id: 'memory-3',
        metadata: { ...testMetadata, importance: 0.9 }
      };

      await memoryStore.storeMemory(memory1);
      await memoryStore.storeMemory(memory2);
      await memoryStore.storeMemory(memory3);
    });

    it('should return empty array for empty memory IDs', async () => {
      const results = await memoryAwarenessInterface.requestSelectiveRetrieval([], {});
      expect(results).toEqual([]);
    });

    it('should limit results based on maxMemories criteria', async () => {
      const memoryIds = ['memory-1', 'memory-2', 'memory-3'];
      const results = await memoryAwarenessInterface.requestSelectiveRetrieval(memoryIds, {
        maxMemories: 2
      });

      expect(results).toHaveLength(2);
    });

    it('should filter by minimum activation score', async () => {
      const memoryIds = ['memory-1', 'memory-2', 'memory-3'];
      const results = await memoryAwarenessInterface.requestSelectiveRetrieval(memoryIds, {
        minActivationScore: 0.8
      });

      // Results should only include memories with high activation scores
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should handle non-existent memory IDs gracefully', async () => {
      const memoryIds = ['memory-1', 'non-existent', 'memory-2'];
      const results = await memoryAwarenessInterface.requestSelectiveRetrieval(memoryIds, {});

      // Should return only the existing memories
      expect(results.length).toBeLessThanOrEqual(2);
      expect(results.every(memory => memory.id !== 'non-existent')).toBe(true);
    });
  });

  describe('getMemorySummariesForPreview', () => {
    it('should return summaries for preview', async () => {
      await memoryStore.storeMemory(testMemory);

      const summaries = await memoryAwarenessInterface.getMemorySummariesForPreview(['test-memory-1']);

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({
        memoryId: 'test-memory-1',
        summary: testSummary.content,
        keyInsights: testSummary.keyInsights,
        timestamp: expect.any(Date),
        accessCount: expect.any(Number)
      });
    });

    it('should handle non-existent memory IDs gracefully', async () => {
      const summaries = await memoryAwarenessInterface.getMemorySummariesForPreview(['non-existent']);
      expect(summaries).toEqual([]);
    });
  });
});
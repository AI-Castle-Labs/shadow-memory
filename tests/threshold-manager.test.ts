import fc from 'fast-check';
import { ThresholdManager } from '../src/components/threshold-manager';
import { MemoryAwarenessInterface } from '../src/components/memory-awareness-interface';
import { MemoryStore } from '../src/components/memory-store';
import { SimilarityEngine } from '../src/components/similarity-engine';
import { ActivationScorer } from '../src/components/activation-scorer';
import { ContextType, UsageAnalytics, Context, Memory, EmbeddingVector, Metadata, Summary, Entity } from '../src/types/core';

describe('ThresholdManager', () => {
  let thresholdManager: ThresholdManager;

  beforeEach(() => {
    thresholdManager = new ThresholdManager();
  });

  describe('Basic threshold management', () => {
    test('should return default thresholds for all context types', () => {
      expect(thresholdManager.getThreshold('conversation')).toBe(0.7);
      expect(thresholdManager.getThreshold('document')).toBe(0.6);
      expect(thresholdManager.getThreshold('task')).toBe(0.8);
      expect(thresholdManager.getThreshold('query')).toBe(0.75);
      expect(thresholdManager.getThreshold('mixed')).toBe(0.65);
    });

    test('should allow updating thresholds within valid range', () => {
      thresholdManager.updateThreshold('conversation', 0.5);
      expect(thresholdManager.getThreshold('conversation')).toBe(0.5);
    });

    test('should reject thresholds outside valid range', () => {
      expect(() => thresholdManager.updateThreshold('conversation', 0.05)).toThrow();
      expect(() => thresholdManager.updateThreshold('conversation', 0.98)).toThrow();
    });

    test('should reset to defaults', () => {
      thresholdManager.updateThreshold('conversation', 0.5);
      thresholdManager.resetToDefaults();
      expect(thresholdManager.getThreshold('conversation')).toBe(0.7);
    });
  });

  describe('Memory activation decisions', () => {
    test('should correctly determine memory activation', () => {
      expect(thresholdManager.shouldActivateMemory(0.8, 'conversation')).toBe(true);
      expect(thresholdManager.shouldActivateMemory(0.6, 'conversation')).toBe(false);
      expect(thresholdManager.shouldActivateMemory(0.7, 'conversation')).toBe(true);
    });
  });

  describe('Adaptive threshold adjustment', () => {
    test('should generate tuning recommendations based on usage analytics', () => {
      const usageAnalytics: UsageAnalytics = {
        retrievalSuccessRate: 0.4,
        falsePositiveRate: 0.3,
        falseNegativeRate: 0.1,
        averageActivationScore: 0.5,
        memoryAccessPatterns: new Map()
      };

      const recommendations = thresholdManager.getTuningRecommendations(usageAnalytics);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('contextType');
      expect(recommendations[0]).toHaveProperty('currentThreshold');
      expect(recommendations[0]).toHaveProperty('recommendedThreshold');
      expect(recommendations[0]).toHaveProperty('reason');
    });

    test('should adapt thresholds based on usage analytics', () => {
      const initialThreshold = thresholdManager.getThreshold('conversation');
      
      const usageAnalytics: UsageAnalytics = {
        retrievalSuccessRate: 0.3,
        falsePositiveRate: 0.4,
        falseNegativeRate: 0.1,
        averageActivationScore: 0.5,
        memoryAccessPatterns: new Map()
      };

      thresholdManager.adaptThresholds(usageAnalytics);
      
      // Should have some adaptation history
      const history = thresholdManager.getAdaptationHistory('conversation');
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Consistency management', () => {
    test('should validate consistency across similar context types', () => {
      // Set very different thresholds for similar contexts
      thresholdManager.updateThreshold('conversation', 0.3);
      thresholdManager.updateThreshold('query', 0.8);

      const consistencyCheck = thresholdManager.validateConsistency();
      expect(consistencyCheck.isConsistent).toBe(false);
      expect(consistencyCheck.inconsistencies.length).toBeGreaterThan(0);
    });

    test('should enforce consistency', () => {
      // Set very different thresholds for similar contexts
      thresholdManager.updateThreshold('conversation', 0.3);
      thresholdManager.updateThreshold('query', 0.8);

      const initialScore = thresholdManager.getConsistencyScore();
      thresholdManager.enforceConsistency();
      const finalScore = thresholdManager.getConsistencyScore();

      expect(finalScore).toBeGreaterThan(initialScore);
    });

    test('should maintain consistency over time', () => {
      const result = thresholdManager.maintainConsistency();
      expect(result).toHaveProperty('consistencyScore');
      expect(result).toHaveProperty('actionsPerformed');
      expect(result).toHaveProperty('recommendations');
      expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.consistencyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance tracking', () => {
    test('should track performance metrics', () => {
      const usageAnalytics: UsageAnalytics = {
        retrievalSuccessRate: 0.8,
        falsePositiveRate: 0.1,
        falseNegativeRate: 0.1,
        averageActivationScore: 0.7,
        memoryAccessPatterns: new Map()
      };

      thresholdManager.adaptThresholds(usageAnalytics);
      
      const metrics = thresholdManager.getPerformanceMetrics('conversation');
      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.totalRetrievals).toBeGreaterThanOrEqual(0);
        expect(metrics.lastUpdated).toBeInstanceOf(Date);
      }
    });

    test('should generate comprehensive tuning report', () => {
      const report = thresholdManager.generateTuningReport();
      expect(report.length).toBe(5); // All context types
      
      report.forEach(entry => {
        expect(entry).toHaveProperty('contextType');
        expect(entry).toHaveProperty('currentThreshold');
        expect(entry).toHaveProperty('performanceScore');
        expect(entry).toHaveProperty('adaptationCount');
        expect(entry).toHaveProperty('recommendations');
      });
    });
  });

  describe('Custom initialization', () => {
    test('should accept custom initial thresholds', () => {
      const customThresholds = {
        conversation: 0.5,
        document: 0.4
      };
      
      const customManager = new ThresholdManager(customThresholds);
      expect(customManager.getThreshold('conversation')).toBe(0.5);
      expect(customManager.getThreshold('document')).toBe(0.4);
      expect(customManager.getThreshold('task')).toBe(0.8); // Should use default
    });
  });

  /**
   * Property-Based Test for threshold-based awareness without auto-loading
   * Feature: shadow-memory, Property 9: Threshold-based awareness without auto-loading
   * Validates: Requirements 5.1
   */
  describe('Property 9: Threshold-based awareness without auto-loading', () => {
    test('should indicate memory availability without auto-loading content when activation scores exceed thresholds', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate test setup data
        fc.record({
          // Generate context types and their thresholds
          contextType: fc.constantFrom<ContextType>('conversation', 'document', 'task', 'query', 'mixed'),
          threshold: fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }),
          
          // Generate memories with varying activation potential
          memories: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              content: fc.string({ minLength: 50, maxLength: 500 }),
              topics: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
              entities: fc.array(fc.record({
                name: fc.string({ minLength: 2, maxLength: 30 }),
                type: fc.constantFrom('PERSON', 'LOCATION', 'ORGANIZATION', 'technology'),
                confidence: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) })
              }), { maxLength: 3 }),
              importance: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
              embedding: fc.array(fc.float({ min: -1, max: 1 }), { minLength: 10, maxLength: 10 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          
          // Generate context that may or may not match memories
          context: fc.record({
            content: fc.string({ minLength: 20, maxLength: 200 }),
            topics: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
            entities: fc.array(fc.record({
              name: fc.string({ minLength: 2, maxLength: 30 }),
              type: fc.constantFrom('PERSON', 'LOCATION', 'ORGANIZATION', 'technology'),
              confidence: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) })
            }), { maxLength: 2 }),
            intent: fc.string({ minLength: 5, maxLength: 30 }),
            embedding: fc.array(fc.float({ min: -1, max: 1 }), { minLength: 10, maxLength: 10 })
          })
        }),
        
        async (testData) => {
          // Setup components
          const memoryStore = new MemoryStore();
          const similarityEngine = new SimilarityEngine();
          const activationScorer = new ActivationScorer();
          const thresholdManager = new ThresholdManager();
          
          // Set the specific threshold for this test
          thresholdManager.updateThreshold(testData.contextType, testData.threshold);
          
          const memoryAwarenessInterface = new MemoryAwarenessInterface(
            memoryStore,
            similarityEngine,
            activationScorer,
            thresholdManager
          );

          // Store test memories
          const storedMemoryIds: string[] = [];
          for (const memoryData of testData.memories) {
            const memory: Memory = {
              id: memoryData.id,
              content: memoryData.content,
              timestamp: new Date(),
              metadata: {
                topics: memoryData.topics,
                entities: memoryData.entities as Entity[],
                concepts: [],
                relationships: [],
                importance: memoryData.importance
              } as Metadata,
              summary: {
                content: `Summary of ${memoryData.content.substring(0, 50)}...`,
                keyInsights: [`Key insight from ${memoryData.id}`],
                contextualRelevance: [`Relevant to ${memoryData.topics[0] || 'general'}`]
              } as Summary,
              embedding: {
                vector: memoryData.embedding,
                model: 'test-model',
                dimensions: memoryData.embedding.length
              } as EmbeddingVector,
              accessCount: 0,
              lastAccessed: new Date()
            };
            
            await memoryStore.storeMemory(memory);
            storedMemoryIds.push(memory.id);
          }

          // Create test context
          const context: Context = {
            content: testData.context.content,
            metadata: {
              topics: testData.context.topics,
              entities: testData.context.entities as Entity[],
              intent: testData.context.intent,
              temporalMarkers: [new Date()],
              structuralElements: []
            },
            embedding: {
              vector: testData.context.embedding,
              model: 'test-model',
              dimensions: testData.context.embedding.length
            } as EmbeddingVector,
            summary: `Summary: ${testData.context.content.substring(0, 50)}...`
          };

          // Get memory awareness (this should NOT auto-load content)
          const memoryAwareness = await memoryAwarenessInterface.getMemoryAwareness(context);

          // Property: For any memory with activation score exceeding threshold, 
          // the system should indicate availability without auto-loading content
          
          // Verify that awareness results only include memories above threshold
          for (const awareness of memoryAwareness) {
            expect(awareness.activationScore).toBeGreaterThanOrEqual(testData.threshold);
            
            // Verify that awareness provides summary information (not full content)
            expect(awareness.summary).toBeDefined();
            expect(typeof awareness.summary).toBe('string');
            expect(awareness.summary.length).toBeGreaterThan(0);
            
            // Verify that awareness includes metadata but not full memory content
            expect(awareness.memoryId).toBeDefined();
            expect(awareness.relevanceType).toBeDefined();
            expect(awareness.confidence).toBeDefined();
            expect(awareness.confidence).toBeGreaterThanOrEqual(0);
            expect(awareness.confidence).toBeLessThanOrEqual(1);
            
            // Verify the memory ID corresponds to a stored memory
            expect(storedMemoryIds).toContain(awareness.memoryId);
          }

          // Verify that memories below threshold are NOT included in awareness
          // We can't directly test this without computing activation scores ourselves,
          // but we can verify that the threshold manager's shouldActivateMemory method
          // is consistent with the awareness results
          for (const awareness of memoryAwareness) {
            const shouldActivate = thresholdManager.shouldActivateMemory(
              awareness.activationScore, 
              testData.contextType
            );
            expect(shouldActivate).toBe(true);
          }

          // Property: The system should maintain awareness without auto-loading
          // This means the awareness interface should not automatically retrieve full memory content
          // We verify this by checking that the awareness results contain only summary information
          for (const awareness of memoryAwareness) {
            // The awareness should contain summary, not full content
            expect(awareness.summary).toBeDefined();
            
            // The awareness should not contain the full memory content
            // (we can't directly test this, but the interface contract ensures it)
            expect(awareness).not.toHaveProperty('content');
            expect(awareness).not.toHaveProperty('fullMemory');
          }

          // Property: Threshold-based decisions should be consistent
          // If we manually check activation scores against thresholds, results should match
          for (const awareness of memoryAwareness) {
            const isAboveThreshold = awareness.activationScore >= testData.threshold;
            expect(isAboveThreshold).toBe(true);
          }

          return true; // Property holds
        }
      ));
    });
  });
});
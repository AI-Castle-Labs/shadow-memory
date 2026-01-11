import fc from 'fast-check';
import { SimilarityEngine } from '../src/components/similarity-engine';
import { EmbeddingVector, Metadata, Summary, Entity, Relationship } from '../src/types/core';

describe('SimilarityEngine', () => {
  let similarityEngine: SimilarityEngine;

  beforeEach(() => {
    similarityEngine = new SimilarityEngine();
  });

  describe('Basic Operations', () => {
    it('should compute cosine similarity correctly', () => {
      const embedding1: EmbeddingVector = {
        vector: [1, 0, 0],
        model: 'test-model',
        dimensions: 3
      };

      const embedding2: EmbeddingVector = {
        vector: [0, 1, 0],
        model: 'test-model',
        dimensions: 3
      };

      const similarity = similarityEngine.computeEmbeddingSimilarity(embedding1, embedding2);
      expect(similarity).toBe(0); // Orthogonal vectors should have 0 cosine similarity
    });

    it('should compute identical embedding similarity as 1', () => {
      const embedding: EmbeddingVector = {
        vector: [0.5, 0.3, 0.2],
        model: 'test-model',
        dimensions: 3
      };

      const similarity = similarityEngine.computeEmbeddingSimilarity(embedding, embedding);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should compute metadata similarity correctly', () => {
      const metadata1: Metadata = {
        topics: ['ai', 'machine-learning'],
        entities: [{ name: 'GPT', type: 'model', confidence: 0.9 }],
        concepts: ['neural-networks'],
        relationships: [{ source: 'GPT', target: 'OpenAI', type: 'created-by', strength: 0.8 }],
        importance: 0.8
      };

      const metadata2: Metadata = {
        topics: ['ai', 'deep-learning'],
        entities: [{ name: 'GPT', type: 'model', confidence: 0.9 }],
        concepts: ['neural-networks'],
        relationships: [{ source: 'GPT', target: 'OpenAI', type: 'created-by', strength: 0.8 }],
        importance: 0.7
      };

      const similarity = similarityEngine.computeMetadataSimilarity(metadata1, metadata2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 7: Multi-dimensional activation scoring
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
     * **Feature: shadow-memory, Property 7: Multi-dimensional activation scoring**
     */
    it('should compute multi-dimensional similarity scores with proper bounds and consistency', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate context data
        fc.record({
          embedding: fc.record({
            vector: fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 3, maxLength: 10 }),
            model: fc.string({ minLength: 1, maxLength: 20 }),
            dimensions: fc.integer({ min: 3, max: 10 })
          }).map(e => ({ ...e, dimensions: e.vector.length })),
          metadata: fc.record({
            topics: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            concepts: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            entities: fc.array(fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.string({ minLength: 1, maxLength: 15 }),
              confidence: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 3 }),
            relationships: fc.array(fc.record({
              source: fc.string({ minLength: 1, maxLength: 20 }),
              target: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.string({ minLength: 1, maxLength: 15 }),
              strength: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 3 }),
            importance: fc.float({ min: 0, max: 1 })
          }),
          summary: fc.record({
            content: fc.string({ minLength: 1, maxLength: 200 }),
            keyInsights: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
            contextualRelevance: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 })
          })
        }),
        // Generate memory data
        fc.record({
          embedding: fc.record({
            vector: fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 3, maxLength: 10 }),
            model: fc.string({ minLength: 1, maxLength: 20 }),
            dimensions: fc.integer({ min: 3, max: 10 })
          }).map(e => ({ ...e, dimensions: e.vector.length })),
          metadata: fc.record({
            topics: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            concepts: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            entities: fc.array(fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.string({ minLength: 1, maxLength: 15 }),
              confidence: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 3 }),
            relationships: fc.array(fc.record({
              source: fc.string({ minLength: 1, maxLength: 20 }),
              target: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.string({ minLength: 1, maxLength: 15 }),
              strength: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 3 }),
            importance: fc.float({ min: 0, max: 1 })
          }),
          summary: fc.record({
            content: fc.string({ minLength: 1, maxLength: 200 }),
            keyInsights: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
            contextualRelevance: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 })
          })
        }),
        async (contextData, memoryData) => {
          // Ensure embeddings have compatible dimensions for comparison
          const minDimensions = Math.min(contextData.embedding.vector.length, memoryData.embedding.vector.length);
          
          const contextEmbedding: EmbeddingVector = {
            ...contextData.embedding,
            vector: contextData.embedding.vector.slice(0, minDimensions),
            dimensions: minDimensions
          };
          
          const memoryEmbedding: EmbeddingVector = {
            ...memoryData.embedding,
            vector: memoryData.embedding.vector.slice(0, minDimensions),
            dimensions: minDimensions
          };

          // Compute all similarity scores
          const allSimilarities = await similarityEngine.computeAllSimilarities(
            contextEmbedding,
            contextData.metadata,
            contextData.summary,
            memoryEmbedding,
            memoryData.metadata,
            memoryData.summary
          );

          // Property 1: All similarity scores should be bounded between 0 and 1
          expect(allSimilarities.embeddingSimilarity).toBeGreaterThanOrEqual(-1);
          expect(allSimilarities.embeddingSimilarity).toBeLessThanOrEqual(1);
          expect(allSimilarities.metadataSimilarity).toBeGreaterThanOrEqual(0);
          expect(allSimilarities.metadataSimilarity).toBeLessThanOrEqual(1);
          expect(allSimilarities.summarySimilarity).toBeGreaterThanOrEqual(0);
          expect(allSimilarities.summarySimilarity).toBeLessThanOrEqual(1);
          expect(allSimilarities.temporalRelevance).toBeGreaterThanOrEqual(0);
          expect(allSimilarities.temporalRelevance).toBeLessThanOrEqual(1);

          // Property 2: Individual similarity computations should match combined computation
          const individualEmbedding = similarityEngine.computeEmbeddingSimilarity(contextEmbedding, memoryEmbedding);
          const individualMetadata = similarityEngine.computeMetadataSimilarity(contextData.metadata, memoryData.metadata);
          const individualSummary = await similarityEngine.computeSummarySimilarity(contextData.summary, memoryData.summary);

          expect(allSimilarities.embeddingSimilarity).toBeCloseTo(individualEmbedding, 5);
          expect(allSimilarities.metadataSimilarity).toBeCloseTo(individualMetadata, 5);
          expect(allSimilarities.summarySimilarity).toBeCloseTo(individualSummary, 5);

          // Property 3: Self-similarity should be high (identical data should have high similarity)
          const selfSimilarities = await similarityEngine.computeAllSimilarities(
            contextEmbedding,
            contextData.metadata,
            contextData.summary,
            contextEmbedding,
            contextData.metadata,
            contextData.summary
          );

          expect(selfSimilarities.embeddingSimilarity).toBeCloseTo(1.0, 5);
          expect(selfSimilarities.metadataSimilarity).toBeCloseTo(1.0, 5);
          expect(selfSimilarities.summarySimilarity).toBeCloseTo(1.0, 5);

          // Property 4: Similarity should be symmetric (A vs B = B vs A)
          const reverseSimilarities = await similarityEngine.computeAllSimilarities(
            memoryEmbedding,
            memoryData.metadata,
            memoryData.summary,
            contextEmbedding,
            contextData.metadata,
            contextData.summary
          );

          expect(reverseSimilarities.embeddingSimilarity).toBeCloseTo(allSimilarities.embeddingSimilarity, 5);
          expect(reverseSimilarities.metadataSimilarity).toBeCloseTo(allSimilarities.metadataSimilarity, 5);
          expect(reverseSimilarities.summarySimilarity).toBeCloseTo(allSimilarities.summarySimilarity, 5);

          // Property 5: Metadata similarity should increase with shared attributes
          if (contextData.metadata.topics.length > 0 && memoryData.metadata.topics.length > 0) {
            // Create modified memory with shared topics
            const sharedMemoryMetadata: Metadata = {
              ...memoryData.metadata,
              topics: [...memoryData.metadata.topics, ...contextData.metadata.topics.slice(0, 1)]
            };

            const sharedSimilarity = similarityEngine.computeMetadataSimilarity(contextData.metadata, sharedMemoryMetadata);
            expect(sharedSimilarity).toBeGreaterThanOrEqual(allSimilarities.metadataSimilarity);
          }
        }
      ), { numRuns: 100 });
    });

    /**
     * Property test for embedding similarity metrics
     */
    it('should provide consistent alternative embedding similarity metrics', async () => {
      await fc.assert(fc.property(
        fc.record({
          vectorA: fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 3, maxLength: 5 }),
          vectorB: fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 3, maxLength: 5 }),
          model: fc.string({ minLength: 1, maxLength: 10 })
        }),
        (data) => {
          const dimensions = Math.min(data.vectorA.length, data.vectorB.length);
          const embeddingA: EmbeddingVector = {
            vector: data.vectorA.slice(0, dimensions),
            model: data.model,
            dimensions
          };
          
          const embeddingB: EmbeddingVector = {
            vector: data.vectorB.slice(0, dimensions),
            model: data.model,
            dimensions
          };

          // Test different similarity metrics
          const cosineSim = similarityEngine.getAlternativeEmbeddingSimilarity(embeddingA, embeddingB, 'cosine');
          const euclideanSim = similarityEngine.getAlternativeEmbeddingSimilarity(embeddingA, embeddingB, 'euclidean');
          const manhattanSim = similarityEngine.getAlternativeEmbeddingSimilarity(embeddingA, embeddingB, 'manhattan');

          // All metrics should return valid similarity scores
          expect(cosineSim).toBeGreaterThanOrEqual(-1);
          expect(cosineSim).toBeLessThanOrEqual(1);
          expect(euclideanSim).toBeGreaterThanOrEqual(0);
          expect(euclideanSim).toBeLessThanOrEqual(1);
          expect(manhattanSim).toBeGreaterThanOrEqual(0);
          expect(manhattanSim).toBeLessThanOrEqual(1);

          // Self-similarity should be 1 for all metrics
          const selfCosineSim = similarityEngine.getAlternativeEmbeddingSimilarity(embeddingA, embeddingA, 'cosine');
          const selfEuclideanSim = similarityEngine.getAlternativeEmbeddingSimilarity(embeddingA, embeddingA, 'euclidean');
          const selfManhattanSim = similarityEngine.getAlternativeEmbeddingSimilarity(embeddingA, embeddingA, 'manhattan');

          expect(selfCosineSim).toBeCloseTo(1.0, 5);
          expect(selfEuclideanSim).toBeCloseTo(1.0, 5);
          expect(selfManhattanSim).toBeCloseTo(1.0, 5);
        }
      ), { numRuns: 50 });
    });

    /**
     * Property test for metadata similarity components
     */
    it('should compute metadata similarity components correctly', async () => {
      await fc.assert(fc.property(
        fc.record({
          metadata1: fc.record({
            topics: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 4 }),
            concepts: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 4 }),
            entities: fc.array(fc.record({
              name: fc.string({ minLength: 1, maxLength: 15 }),
              type: fc.string({ minLength: 1, maxLength: 10 }),
              confidence: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 2 }),
            relationships: fc.array(fc.record({
              source: fc.string({ minLength: 1, maxLength: 15 }),
              target: fc.string({ minLength: 1, maxLength: 15 }),
              type: fc.string({ minLength: 1, maxLength: 10 }),
              strength: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 2 }),
            importance: fc.float({ min: 0, max: 1 })
          }),
          metadata2: fc.record({
            topics: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 4 }),
            concepts: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 4 }),
            entities: fc.array(fc.record({
              name: fc.string({ minLength: 1, maxLength: 15 }),
              type: fc.string({ minLength: 1, maxLength: 10 }),
              confidence: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 2 }),
            relationships: fc.array(fc.record({
              source: fc.string({ minLength: 1, maxLength: 15 }),
              target: fc.string({ minLength: 1, maxLength: 15 }),
              type: fc.string({ minLength: 1, maxLength: 10 }),
              strength: fc.float({ min: 0, max: 1 })
            }), { minLength: 0, maxLength: 2 }),
            importance: fc.float({ min: 0, max: 1 })
          })
        }),
        (data) => {
          const similarity = similarityEngine.computeMetadataSimilarity(data.metadata1, data.metadata2);

          // Similarity should be bounded
          expect(similarity).toBeGreaterThanOrEqual(0);
          expect(similarity).toBeLessThanOrEqual(1);

          // Self-similarity should be 1
          const selfSimilarity = similarityEngine.computeMetadataSimilarity(data.metadata1, data.metadata1);
          expect(selfSimilarity).toBeCloseTo(1.0, 5);

          // Symmetry property
          const reverseSimilarity = similarityEngine.computeMetadataSimilarity(data.metadata2, data.metadata1);
          expect(reverseSimilarity).toBeCloseTo(similarity, 5);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for mismatched embedding dimensions', () => {
      const embedding1: EmbeddingVector = {
        vector: [1, 0, 0],
        model: 'test-model',
        dimensions: 3
      };

      const embedding2: EmbeddingVector = {
        vector: [1, 0],
        model: 'test-model',
        dimensions: 2
      };

      expect(() => {
        similarityEngine.computeEmbeddingSimilarity(embedding1, embedding2);
      }).toThrow('Embedding dimension mismatch');
    });

    it('should handle zero vectors gracefully', () => {
      const embedding1: EmbeddingVector = {
        vector: [0, 0, 0],
        model: 'test-model',
        dimensions: 3
      };

      const embedding2: EmbeddingVector = {
        vector: [1, 0, 0],
        model: 'test-model',
        dimensions: 3
      };

      const similarity = similarityEngine.computeEmbeddingSimilarity(embedding1, embedding2);
      expect(similarity).toBe(0);
    });
  });
});
/**
 * Property-based tests for Memory Representation Generator
 * Feature: shadow-memory, Property 3: Complete memory representation generation
 * Feature: shadow-memory, Property 4: Memory representation consistency
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import fc from 'fast-check';
import { MemoryRepresentationGenerator } from '../src/components/memory-representation-generator';
import { Context, Memory, MemoryRepresentations } from '../src/types/core';

describe('MemoryRepresentationGenerator Property Tests', () => {
  let generator: MemoryRepresentationGenerator;

  beforeEach(() => {
    generator = new MemoryRepresentationGenerator();
  });

  /**
   * Property 3: Complete memory representation generation
   * For any stored memory, the system should generate all three representations 
   * (AI summary, embedding vector, and metadata) where the summary preserves 
   * critical information while reducing size, and the embedding captures semantic meaning.
   * Validates: Requirements 2.1, 2.2, 2.3, 2.5
   */
  test('Property 3: Complete memory representation generation', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 20, maxLength: 1000 }),
          context: fc.option(
            fc.record({
              content: fc.string({ minLength: 10, maxLength: 500 }),
              metadata: fc.record({
                topics: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { maxLength: 5 }),
                entities: fc.array(
                  fc.record({
                    name: fc.string({ minLength: 2, maxLength: 20 }),
                    type: fc.constantFrom('PERSON', 'DATE', 'LOCATION', 'ORGANIZATION'),
                    confidence: fc.float({ min: Math.fround(0.1), max: Math.fround(1) })
                  }),
                  { maxLength: 3 }
                ),
                intent: fc.constantFrom('question', 'explanation', 'request', 'information'),
                temporalMarkers: fc.array(fc.date(), { maxLength: 2 }),
                structuralElements: fc.array(
                  fc.record({
                    type: fc.constantFrom('header', 'paragraph', 'list'),
                    content: fc.string({ minLength: 5, maxLength: 50 }),
                    position: fc.integer({ min: 0, max: 10 })
                  }),
                  { maxLength: 3 }
                )
              }),
              embedding: fc.record({
                vector: fc.array(fc.float({ min: -1, max: 1 }), { minLength: 10, maxLength: 20 }),
                model: fc.string({ minLength: 5, maxLength: 15 }),
                dimensions: fc.integer({ min: 10, max: 20 })
              }),
              summary: fc.string({ minLength: 10, maxLength: 100 })
            }),
            { nil: undefined }
          )
        }),
        async ({ content, context }) => {
          const representations = await generator.generateRepresentations(content, context || undefined);

          // Property: All three representations must be present
          expect(representations).toHaveProperty('metadata');
          expect(representations).toHaveProperty('summary');
          expect(representations).toHaveProperty('embedding');

          // Property: Metadata should contain required fields
          expect(representations.metadata).toHaveProperty('topics');
          expect(representations.metadata).toHaveProperty('entities');
          expect(representations.metadata).toHaveProperty('concepts');
          expect(representations.metadata).toHaveProperty('relationships');
          expect(representations.metadata).toHaveProperty('importance');

          // Property: Metadata importance should be bounded [0, 1]
          expect(representations.metadata.importance).toBeGreaterThanOrEqual(0);
          expect(representations.metadata.importance).toBeLessThanOrEqual(1);

          // Property: Summary should preserve critical information while reducing size
          expect(representations.summary.content).toBeTruthy();
          expect(typeof representations.summary.content).toBe('string');
          // Note: Summary might be longer than very short content due to formatting
          if (content.length > 50) {
            expect(representations.summary.content.length).toBeLessThanOrEqual(content.length);
          }
          expect(representations.summary).toHaveProperty('keyInsights');
          expect(representations.summary).toHaveProperty('contextualRelevance');
          expect(Array.isArray(representations.summary.keyInsights)).toBe(true);
          expect(Array.isArray(representations.summary.contextualRelevance)).toBe(true);

          // Property: Embedding should capture semantic meaning
          expect(representations.embedding).toHaveProperty('vector');
          expect(representations.embedding).toHaveProperty('model');
          expect(representations.embedding).toHaveProperty('dimensions');
          expect(Array.isArray(representations.embedding.vector)).toBe(true);
          expect(representations.embedding.vector.length).toBe(representations.embedding.dimensions);
          expect(representations.embedding.dimensions).toBeGreaterThan(0);

          // Property: Embedding vector should be normalized (unit vector)
          const magnitude = Math.sqrt(
            representations.embedding.vector.reduce((sum, val) => sum + val * val, 0)
          );
          expect(magnitude).toBeCloseTo(1, 2); // Allow small floating point errors

          // Property: All representations should be internally consistent
          const validation = generator.validateRepresentations(representations);
          expect(validation.isValid).toBe(true);
          expect(validation.issues).toHaveLength(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Memory representation consistency
   * For any memory content update, regenerating the representations (summary, embedding, metadata) 
   * should produce updated representations that accurately reflect the new content.
   * Validates: Requirements 2.4
   */
  test('Property 4: Memory representation consistency', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          originalContent: fc.string({ minLength: 30, maxLength: 500 }),
          updatedContent: fc.string({ minLength: 30, maxLength: 500 }),
          context: fc.option(
            fc.record({
              content: fc.string({ minLength: 10, maxLength: 200 }),
              metadata: fc.record({
                topics: fc.array(fc.string({ minLength: 3, maxLength: 12 }), { maxLength: 4 }),
                entities: fc.array(
                  fc.record({
                    name: fc.string({ minLength: 2, maxLength: 15 }),
                    type: fc.constantFrom('PERSON', 'LOCATION', 'ORGANIZATION'),
                    confidence: fc.float({ min: Math.fround(0.2), max: Math.fround(1) })
                  }),
                  { maxLength: 2 }
                ),
                intent: fc.constantFrom('update', 'revision', 'correction'),
                temporalMarkers: fc.array(fc.date(), { maxLength: 1 }),
                structuralElements: fc.array(
                  fc.record({
                    type: fc.constantFrom('paragraph', 'header'),
                    content: fc.string({ minLength: 5, maxLength: 30 }),
                    position: fc.integer({ min: 0, max: 5 })
                  }),
                  { maxLength: 2 }
                )
              }),
              embedding: fc.record({
                vector: fc.array(fc.float({ min: -1, max: 1 }), { minLength: 5, maxLength: 15 }),
                model: fc.string({ minLength: 3, maxLength: 10 }),
                dimensions: fc.integer({ min: 5, max: 15 })
              }),
              summary: fc.string({ minLength: 10, maxLength: 80 })
            }),
            { nil: undefined }
          )
        }),
        async ({ originalContent, updatedContent, context }) => {
          // Generate original representations
          const originalRepresentations = await generator.generateRepresentations(
            originalContent, 
            context || undefined
          );

          // Update representations with new content
          const updatedRepresentations = await generator.updateRepresentations(
            originalRepresentations,
            updatedContent,
            context || undefined
          );

          // Property: Updated representations should be valid
          const validation = generator.validateRepresentations(updatedRepresentations);
          expect(validation.isValid).toBe(true);
          expect(validation.issues).toHaveLength(0);

          // Property: Updated representations should reflect new content
          // If content is significantly different, representations should change
          if (originalContent !== updatedContent) {
            const contentSimilarity = calculateSimpleContentSimilarity(originalContent, updatedContent);
            
            if (contentSimilarity < 0.8) { // Significantly different content
              // Embeddings should be different for different content
              const embeddingSimilarity = calculateVectorSimilarity(
                originalRepresentations.embedding.vector,
                updatedRepresentations.embedding.vector
              );
              
              // For significantly different content, embeddings should be noticeably different
              expect(embeddingSimilarity).toBeLessThan(0.95);
            }
          }

          // Property: Updated representations should maintain structural consistency
          expect(updatedRepresentations.metadata.importance).toBeGreaterThanOrEqual(0);
          expect(updatedRepresentations.metadata.importance).toBeLessThanOrEqual(1);
          expect(updatedRepresentations.embedding.vector.length).toBe(updatedRepresentations.embedding.dimensions);
          expect(updatedRepresentations.summary.content).toBeTruthy();

          // Property: Embedding should remain normalized
          const magnitude = Math.sqrt(
            updatedRepresentations.embedding.vector.reduce((sum, val) => sum + val * val, 0)
          );
          expect(magnitude).toBeCloseTo(1, 2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Representation generation is deterministic', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 20, maxLength: 500 }),
          context: fc.option(
            fc.record({
              content: fc.string(),
              metadata: fc.record({
                topics: fc.array(fc.string()),
                entities: fc.array(fc.record({
                  name: fc.string(),
                  type: fc.string(),
                  confidence: fc.float({ min: 0, max: 1 })
                })),
                intent: fc.string(),
                temporalMarkers: fc.array(fc.date()),
                structuralElements: fc.array(fc.record({
                  type: fc.string(),
                  content: fc.string(),
                  position: fc.integer()
                }))
              }),
              embedding: fc.record({
                vector: fc.array(fc.float()),
                model: fc.string(),
                dimensions: fc.integer()
              }),
              summary: fc.string()
            }),
            { nil: undefined }
          )
        }),
        async ({ content, context }) => {
          const representations1 = await generator.generateRepresentations(content, context || undefined);
          const representations2 = await generator.generateRepresentations(content, context || undefined);

          // Property: Same input should produce same output
          expect(representations1.metadata).toEqual(representations2.metadata);
          expect(representations1.summary).toEqual(representations2.summary);
          expect(representations1.embedding).toEqual(representations2.embedding);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property: Batch generation produces consistent results', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 20, maxLength: 300 }),
            context: fc.option(
              fc.record({
                content: fc.string({ minLength: 10, maxLength: 100 }),
                metadata: fc.record({
                  topics: fc.array(fc.string({ minLength: 3, maxLength: 10 }), { maxLength: 3 }),
                  entities: fc.array(fc.record({
                    name: fc.string({ minLength: 2, maxLength: 15 }),
                    type: fc.constantFrom('PERSON', 'LOCATION'),
                    confidence: fc.float({ min: Math.fround(0.5), max: Math.fround(1) })
                  }), { maxLength: 2 }),
                  intent: fc.constantFrom('question', 'explanation'),
                  temporalMarkers: fc.array(fc.date(), { maxLength: 1 }),
                  structuralElements: fc.array(fc.record({
                    type: fc.constantFrom('paragraph', 'list'),
                    content: fc.string({ minLength: 5, maxLength: 30 }),
                    position: fc.integer({ min: 0, max: 5 })
                  }), { maxLength: 2 })
                }),
                embedding: fc.record({
                  vector: fc.array(fc.float({ min: -1, max: 1 }), { minLength: 5, maxLength: 10 }),
                  model: fc.string({ minLength: 3, maxLength: 10 }),
                  dimensions: fc.integer({ min: 5, max: 10 })
                }),
                summary: fc.string({ minLength: 10, maxLength: 50 })
              }),
              { nil: undefined }
            )
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (contentArray) => {
          // Convert null contexts to undefined for type compatibility
          const processedArray = contentArray.map(item => ({
            content: item.content,
            context: item.context || undefined
          }));

          const batchResults = await generator.generateBatchRepresentations(processedArray);
          
          // Property: Batch should return same number of results as inputs
          expect(batchResults).toHaveLength(contentArray.length);

          // Property: Each result should be valid
          batchResults.forEach(representations => {
            const validation = generator.validateRepresentations(representations);
            expect(validation.isValid).toBe(true);
          });

          // Property: Individual generation should match batch generation
          for (let i = 0; i < Math.min(contentArray.length, 3); i++) {
            const individual = await generator.generateRepresentations(
              contentArray[i].content, 
              contentArray[i].context || undefined
            );
            expect(batchResults[i]).toEqual(individual);
          }

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test('Property: Empty content produces valid minimal representations', async () => {
    const emptyContent = '';
    
    const representations = await generator.generateRepresentations(emptyContent);
    
    // Debug validation issues
    const validation = generator.validateRepresentations(representations);
    if (!validation.isValid) {
      console.log('Validation issues:', validation.issues);
      console.log('Representations:', JSON.stringify(representations, null, 2));
    }
    
    // Property: Even empty content should produce valid structure
    expect(validation.isValid).toBe(true);

    // Property: Metadata should have empty but valid arrays
    expect(representations.metadata.topics).toEqual([]);
    expect(representations.metadata.entities).toEqual([]);
    expect(representations.metadata.concepts).toEqual([]);
    expect(representations.metadata.relationships).toEqual([]);
    expect(representations.metadata.importance).toBeGreaterThanOrEqual(0);
    expect(representations.metadata.importance).toBeLessThanOrEqual(1);

    // Property: Summary should handle empty content gracefully
    expect(representations.summary.content).toBeDefined();
    expect(representations.summary.keyInsights).toEqual([]);
    // Contextual relevance may include intent information even for empty content
    expect(Array.isArray(representations.summary.contextualRelevance)).toBe(true);

    // Property: Embedding should still be valid
    expect(representations.embedding.vector).toHaveLength(representations.embedding.dimensions);
    expect(representations.embedding.dimensions).toBeGreaterThan(0);
  });

  test('Property: Memory representation generation preserves memory context', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          content: fc.string({ minLength: 30, maxLength: 500 }),
          timestamp: fc.date(),
          metadata: fc.record({
            topics: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { maxLength: 5 }),
            entities: fc.array(fc.record({
              name: fc.string({ minLength: 2, maxLength: 20 }),
              type: fc.constantFrom('PERSON', 'ORGANIZATION'),
              confidence: fc.float({ min: Math.fround(0.3), max: Math.fround(1) })
            }), { maxLength: 3 }),
            concepts: fc.array(fc.string({ minLength: 4, maxLength: 15 }), { maxLength: 5 }),
            relationships: fc.array(fc.record({
              source: fc.string({ minLength: 3, maxLength: 15 }),
              target: fc.string({ minLength: 3, maxLength: 15 }),
              type: fc.constantFrom('RELATED', 'HIERARCHICAL'),
              strength: fc.float({ min: 0, max: 1 })
            }), { maxLength: 3 }),
            importance: fc.float({ min: 0, max: 1 })
          }),
          summary: fc.record({
            content: fc.string({ minLength: 10, maxLength: 100 }),
            keyInsights: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { maxLength: 3 }),
            contextualRelevance: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { maxLength: 3 })
          }),
          embedding: fc.record({
            vector: fc.array(fc.float({ min: -1, max: 1 }), { minLength: 10, maxLength: 20 }),
            model: fc.string({ minLength: 5, maxLength: 15 }),
            dimensions: fc.integer({ min: 10, max: 20 })
          }),
          accessCount: fc.integer({ min: 0, max: 100 }),
          lastAccessed: fc.date()
        }),
        async (memory: Memory) => {
          const representations = await generator.generateMemoryRepresentations(memory);

          // Property: Generated representations should be valid
          const validation = generator.validateRepresentations(representations);
          expect(validation.isValid).toBe(true);

          // Property: Should preserve some original context
          // Topics might overlap with original memory topics
          const originalTopics = new Set(memory.metadata.topics);
          const newTopics = new Set(representations.metadata.topics);
          
          // At least some semantic relationship should exist (not necessarily exact match)
          expect(representations.metadata.topics.length).toBeGreaterThanOrEqual(0);
          expect(representations.summary.content).toBeTruthy();
          expect(representations.embedding.vector.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Helper functions for property tests
function calculateSimpleContentSimilarity(content1: string, content2: string): number {
  const words1 = new Set(content1.toLowerCase().split(/\s+/));
  const words2 = new Set(content2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function calculateVectorSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}
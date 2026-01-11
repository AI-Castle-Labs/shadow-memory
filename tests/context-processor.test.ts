/**
 * Property-based tests for Context Processor
 * Feature: shadow-memory, Property 1: Context metadata extraction and normalization
 * Feature: shadow-memory, Property 2: Semantic fingerprint generation
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import fc from 'fast-check';
import { ContextProcessor } from '../src/components/context-processor';
import { Context, Entity, StructuralElement } from '../src/types/core';

describe('ContextProcessor Property Tests', () => {
  let processor: ContextProcessor;

  beforeEach(() => {
    processor = new ContextProcessor();
  });

  /**
   * Property 1: Context metadata extraction and normalization
   * For any input context, the system should extract metadata containing topics, entities, 
   * intent, and temporal markers, normalize it to a consistent format, and preserve any 
   * hierarchical relationships present in the original structure.
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  test('Property 1: Context metadata extraction and normalization', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary context content
        fc.record({
          content: fc.string({ minLength: 10, maxLength: 1000 }),
          metadata: fc.record({
            topics: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 10 }),
            entities: fc.array(
              fc.record({
                name: fc.string({ minLength: 2, maxLength: 30 }),
                type: fc.constantFrom('PERSON', 'DATE', 'LOCATION', 'ORGANIZATION'),
                confidence: fc.float({ min: 0, max: 1 })
              }),
              { maxLength: 5 }
            ),
            intent: fc.string({ minLength: 5, maxLength: 50 }),
            temporalMarkers: fc.array(fc.date(), { maxLength: 3 }),
            structuralElements: fc.array(
              fc.record({
                type: fc.constantFrom('header', 'paragraph', 'list', 'quote'),
                content: fc.string({ minLength: 5, maxLength: 100 }),
                position: fc.integer({ min: 0, max: 100 })
              }),
              { maxLength: 5 }
            )
          }),
          embedding: fc.record({
            vector: fc.array(fc.float({ min: -1, max: 1 }), { minLength: 10, maxLength: 50 }),
            model: fc.string({ minLength: 5, maxLength: 20 }),
            dimensions: fc.integer({ min: 10, max: 50 })
          }),
          summary: fc.string({ minLength: 10, maxLength: 200 })
        }),
        (context: Context) => {
          const metadata = processor.extractMetadata(context);

          // Property: Metadata should always contain required fields
          expect(metadata).toHaveProperty('topics');
          expect(metadata).toHaveProperty('entities');
          expect(metadata).toHaveProperty('concepts');
          expect(metadata).toHaveProperty('relationships');
          expect(metadata).toHaveProperty('importance');

          // Property: Topics should be normalized (lowercase, no duplicates)
          expect(metadata.topics).toEqual([...new Set(metadata.topics)]);
          metadata.topics.forEach(topic => {
            expect(topic).toBe(topic.toLowerCase());
          });

          // Property: Entities should be normalized (no duplicate names)
          const entityNames = metadata.entities.map(e => e.name);
          expect(entityNames).toEqual([...new Set(entityNames)]);

          // Property: Importance should be bounded [0, 1]
          expect(metadata.importance).toBeGreaterThanOrEqual(0);
          expect(metadata.importance).toBeLessThanOrEqual(1);

          // Property: Concepts should have no duplicates
          expect(metadata.concepts).toEqual([...new Set(metadata.concepts)]);

          // Property: If hierarchical elements exist, relationships should preserve them
          if (context.metadata?.structuralElements && context.metadata.structuralElements.length > 1) {
            const hierarchicalRels = metadata.relationships.filter(r => r.type === 'HIERARCHICAL');
            expect(hierarchicalRels.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Semantic fingerprint generation
   * For any context input, the system should generate fingerprints that capture semantic meaning, 
   * such that semantically similar contexts produce similar fingerprints even when using different keywords.
   * Validates: Requirements 1.4
   */
  test('Property 2: Semantic fingerprint generation', () => {
    fc.assert(
      fc.property(
        fc.record({
          content: fc.string({ minLength: 20, maxLength: 500 }),
          metadata: fc.record({
            topics: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { maxLength: 5 }),
            entities: fc.array(
              fc.record({
                name: fc.string({ minLength: 2, maxLength: 20 }),
                type: fc.constantFrom('PERSON', 'DATE', 'LOCATION'),
                confidence: fc.float({ min: Math.fround(0.1), max: Math.fround(1) })
              }),
              { maxLength: 3 }
            ),
            intent: fc.constantFrom('question ask help', 'explain describe inform', 'request need want', 'command do execute'),
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
        (context: Context) => {
          const fingerprint1 = processor.generateSemanticFingerprint(context);
          const fingerprint2 = processor.generateSemanticFingerprint(context);

          // Property: Fingerprint generation should be deterministic
          expect(fingerprint1).toBe(fingerprint2);

          // Property: Fingerprint should be non-empty string
          expect(fingerprint1).toBeTruthy();
          expect(typeof fingerprint1).toBe('string');

          // Property: Fingerprint should contain structural, semantic, and contextual components
          const parts = fingerprint1.split('|');
          expect(parts).toHaveLength(3); // structural|semantic|contextual

          // Property: Each part should contain meaningful information
          parts.forEach(part => {
            expect(part).toBeTruthy();
            expect(part.length).toBeGreaterThan(0);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Similar contexts produce similar fingerprint patterns', () => {
    // Test that contexts with similar semantic structure produce related fingerprints
    const baseContext: Context = {
      content: 'This is a question about machine learning. Can you explain how neural networks work?',
      metadata: {
        topics: ['machine', 'learning', 'neural'],
        entities: [],
        intent: 'question ask help',
        temporalMarkers: [],
        structuralElements: []
      },
      embedding: { vector: [], model: 'test', dimensions: 0 },
      summary: 'Question about neural networks'
    };

    const similarContext: Context = {
      content: 'I have a question regarding artificial intelligence. Could you describe how deep learning functions?',
      metadata: {
        topics: ['artificial', 'intelligence', 'deep'],
        entities: [],
        intent: 'question ask help',
        temporalMarkers: [],
        structuralElements: []
      },
      embedding: { vector: [], model: 'test', dimensions: 0 },
      summary: 'Question about deep learning'
    };

    const fingerprint1 = processor.generateSemanticFingerprint(baseContext);
    const fingerprint2 = processor.generateSemanticFingerprint(similarContext);

    // Property: Similar contexts should have similar contextual features (same intent category)
    const parts1 = fingerprint1.split('|');
    const parts2 = fingerprint2.split('|');
    
    const contextual1 = parts1[2].split('-');
    const contextual2 = parts2[2].split('-');
    
    // Intent should be categorized the same way (both are questions)
    expect(contextual1[3]).toBe(contextual2[3]); // Intent category should match
  });

  test('Property: Metadata extraction is deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          content: fc.string({ minLength: 10, maxLength: 500 }),
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
        (context: Context) => {
          const metadata1 = processor.extractMetadata(context);
          const metadata2 = processor.extractMetadata(context);

          // Property: Same input should produce same output
          expect(metadata1).toEqual(metadata2);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property: Empty content produces valid metadata', () => {
    const emptyContext: Context = {
      content: '',
      metadata: {
        topics: [],
        entities: [],
        intent: '',
        temporalMarkers: [],
        structuralElements: []
      },
      embedding: {
        vector: [],
        model: 'test',
        dimensions: 0
      },
      summary: ''
    };

    const metadata = processor.extractMetadata(emptyContext);

    // Property: Even empty content should produce valid metadata structure
    expect(metadata.topics).toEqual([]);
    expect(metadata.entities).toEqual([]);
    expect(metadata.concepts).toEqual([]);
    expect(metadata.relationships).toEqual([]);
    expect(metadata.importance).toBeGreaterThanOrEqual(0);
    expect(metadata.importance).toBeLessThanOrEqual(1);
  });
});
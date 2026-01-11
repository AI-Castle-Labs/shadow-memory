/**
 * Test that core types and interfaces can be imported correctly
 */

import {
  Memory,
  Context,
  MemoryRepresentations,
  SimilarityScores,
  MemoryAwareness
} from '../src/types';

import {
  IContextProcessor,
  IMemoryStore,
  ISimilarityEngine,
  IActivationScorer,
  IThresholdManager,
  IMemoryAwarenessInterface,
  IBenchmarkManager,
  IShadowMemorySystem
} from '../src/interfaces';

describe('Type Definitions', () => {
  test('Core types are properly defined', () => {
    // Test that we can create type-safe objects
    const mockMemory: Partial<Memory> = {
      id: 'test-id',
      content: 'test content',
      timestamp: new Date()
    };

    const mockContext: Partial<Context> = {
      content: 'test context',
      summary: 'test summary'
    };

    expect(mockMemory.id).toBe('test-id');
    expect(mockContext.content).toBe('test context');
  });

  test('Interface types are properly defined', () => {
    // Test that interface types exist and have expected structure
    const processorMethods: (keyof IContextProcessor)[] = [
      'extractMetadata',
      'generateEmbedding', 
      'createSummary',
      'processContext'
    ];

    const storeMethods: (keyof IMemoryStore)[] = [
      'storeMemory',
      'retrieveMemory',
      'updateMemoryRepresentations',
      'getAllMemoryIds',
      'deleteMemory',
      'getMemoryCount',
      'archiveMemories'
    ];

    expect(processorMethods).toHaveLength(4);
    expect(storeMethods).toHaveLength(7);
  });

  test('Complex type structures are valid', () => {
    const mockSimilarityScores: SimilarityScores = {
      embeddingSimilarity: 0.8,
      metadataSimilarity: 0.7,
      summarySimilarity: 0.9,
      temporalRelevance: 0.6
    };

    const mockAwareness: MemoryAwareness = {
      memoryId: 'test-memory',
      activationScore: 0.85,
      relevanceType: 'semantic',
      summary: 'Test memory summary',
      confidence: 0.9
    };

    expect(mockSimilarityScores.embeddingSimilarity).toBe(0.8);
    expect(mockAwareness.relevanceType).toBe('semantic');
  });
});
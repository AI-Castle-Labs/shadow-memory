import { ActivationScorer, RankingStrategy, MemoryRankingInfo } from '../src/components/activation-scorer';
import { SimilarityScores, ScoringWeights } from '../src/types/core';

describe('ActivationScorer', () => {
  let scorer: ActivationScorer;

  beforeEach(() => {
    scorer = new ActivationScorer();
  });

  describe('computeActivationScore', () => {
    it('should compute activation score with equal weights', () => {
      const similarities: SimilarityScores = {
        embeddingSimilarity: 0.8,
        metadataSimilarity: 0.6,
        summarySimilarity: 0.7,
        temporalRelevance: 0.5
      };

      const weights: ScoringWeights = {
        embedding: 0.25,
        metadata: 0.25,
        summary: 0.25,
        temporal: 0.25
      };

      const score = scorer.computeActivationScore(similarities, weights);
      const expected = (0.8 + 0.6 + 0.7 + 0.5) / 4; // 0.65
      expect(score).toBeCloseTo(expected, 2);
    });

    it('should normalize weights that do not sum to 1', () => {
      const similarities: SimilarityScores = {
        embeddingSimilarity: 0.8,
        metadataSimilarity: 0.6,
        summarySimilarity: 0.7,
        temporalRelevance: 0.5
      };

      const weights: ScoringWeights = {
        embedding: 2,
        metadata: 2,
        summary: 2,
        temporal: 2
      };

      const score = scorer.computeActivationScore(similarities, weights);
      const expected = (0.8 + 0.6 + 0.7 + 0.5) / 4; // Should be same as equal weights
      expect(score).toBeCloseTo(expected, 2);
    });

    it('should handle zero weights by using equal weights', () => {
      const similarities: SimilarityScores = {
        embeddingSimilarity: 0.8,
        metadataSimilarity: 0.6,
        summarySimilarity: 0.7,
        temporalRelevance: 0.5
      };

      const weights: ScoringWeights = {
        embedding: 0,
        metadata: 0,
        summary: 0,
        temporal: 0
      };

      const score = scorer.computeActivationScore(similarities, weights);
      const expected = (0.8 + 0.6 + 0.7 + 0.5) / 4; // Should use equal weights
      expect(score).toBeCloseTo(expected, 2);
    });

    it('should clamp invalid similarity scores', () => {
      const similarities: SimilarityScores = {
        embeddingSimilarity: 1.5, // Invalid - above 1
        metadataSimilarity: -0.2, // Invalid - below 0
        summarySimilarity: NaN,   // Invalid - NaN
        temporalRelevance: 0.5
      };

      const weights: ScoringWeights = {
        embedding: 0.25,
        metadata: 0.25,
        summary: 0.25,
        temporal: 0.25
      };

      const score = scorer.computeActivationScore(similarities, weights);
      // Should clamp: 1.5->1, -0.2->0, NaN->0, 0.5->0.5
      const expected = (1 + 0 + 0 + 0.5) / 4; // 0.375
      expect(score).toBeCloseTo(expected, 2);
    });
  });

  describe('rankMemoriesByActivation', () => {
    it('should rank memories by activation score in descending order', () => {
      const scores = new Map([
        ['memory1', 0.8],
        ['memory2', 0.9],
        ['memory3', 0.7],
        ['memory4', 0.95]
      ]);

      const ranked = scorer.rankMemoriesByActivation(scores);
      expect(ranked).toEqual(['memory4', 'memory2', 'memory1', 'memory3']);
    });

    it('should handle empty scores map', () => {
      const scores = new Map();
      const ranked = scorer.rankMemoriesByActivation(scores);
      expect(ranked).toEqual([]);
    });

    it('should filter out invalid scores', () => {
      const scores = new Map([
        ['memory1', 0.8],
        ['memory2', NaN],
        ['memory3', Infinity],
        ['memory4', 0.7]
      ]);

      const ranked = scorer.rankMemoriesByActivation(scores);
      expect(ranked).toEqual(['memory1', 'memory4']);
    });
  });

  describe('rankMemoriesWithStrategy', () => {
    const mockMemories: MemoryRankingInfo[] = [
      {
        memoryId: 'memory1',
        activationScore: 0.8,
        timestamp: new Date('2024-01-01'),
        accessCount: 5
      },
      {
        memoryId: 'memory2',
        activationScore: 0.9,
        timestamp: new Date('2024-01-02'),
        accessCount: 3
      },
      {
        memoryId: 'memory3',
        activationScore: 0.7,
        timestamp: new Date('2024-01-03'),
        accessCount: 10
      }
    ];

    it('should rank by activation score', () => {
      const ranked = scorer.rankMemoriesWithStrategy(mockMemories, 'activation_score');
      expect(ranked).toEqual(['memory2', 'memory1', 'memory3']);
    });

    it('should rank by recency', () => {
      const ranked = scorer.rankMemoriesWithStrategy(mockMemories, 'recency');
      expect(ranked).toEqual(['memory3', 'memory2', 'memory1']); // Newest first
    });

    it('should rank by access frequency', () => {
      const ranked = scorer.rankMemoriesWithStrategy(mockMemories, 'access_frequency');
      expect(ranked).toEqual(['memory3', 'memory1', 'memory2']); // Most accessed first
    });

    it('should handle empty memories array', () => {
      const ranked = scorer.rankMemoriesWithStrategy([], 'activation_score');
      expect(ranked).toEqual([]);
    });

    it('should throw error for unsupported strategy', () => {
      expect(() => {
        scorer.rankMemoriesWithStrategy(mockMemories, 'invalid_strategy' as RankingStrategy);
      }).toThrow('Unsupported ranking strategy: invalid_strategy');
    });
  });

  describe('applyTemporalDecay', () => {
    it('should apply exponential decay correctly', () => {
      const baseScore = 0.8;
      const memoryAge = 10;
      const decayFunction = (age: number) => Math.exp(-0.1 * age);

      const decayedScore = scorer.applyTemporalDecay(baseScore, memoryAge, decayFunction);
      const expected = baseScore * Math.exp(-0.1 * memoryAge);
      expect(decayedScore).toBeCloseTo(expected, 4);
    });

    it('should handle no decay function', () => {
      const baseScore = 0.8;
      const memoryAge = 10;
      const noDecayFunction = () => 1.0;

      const decayedScore = scorer.applyTemporalDecay(baseScore, memoryAge, noDecayFunction);
      expect(decayedScore).toBe(baseScore);
    });

    it('should validate base score range', () => {
      const decayFunction = () => 0.5;
      
      expect(() => {
        scorer.applyTemporalDecay(-0.1, 10, decayFunction);
      }).toThrow('Base score must be a finite number between 0 and 1');

      expect(() => {
        scorer.applyTemporalDecay(1.5, 10, decayFunction);
      }).toThrow('Base score must be a finite number between 0 and 1');
    });

    it('should validate memory age', () => {
      const decayFunction = () => 0.5;
      
      expect(() => {
        scorer.applyTemporalDecay(0.8, -5, decayFunction);
      }).toThrow('Memory age must be a non-negative finite number');
    });

    it('should validate decay function return value', () => {
      const invalidDecayFunction = () => 1.5; // Returns value > 1
      
      expect(() => {
        scorer.applyTemporalDecay(0.8, 10, invalidDecayFunction);
      }).toThrow('Decay function must return a value between 0 and 1');
    });
  });

  describe('getDefaultWeights', () => {
    it('should return conversation weights', () => {
      const weights = scorer.getDefaultWeights('conversation');
      expect(weights.embedding).toBe(0.4);
      expect(weights.metadata).toBe(0.3);
      expect(weights.summary).toBe(0.2);
      expect(weights.temporal).toBe(0.1);
    });

    it('should return document weights', () => {
      const weights = scorer.getDefaultWeights('document');
      expect(weights.embedding).toBe(0.3);
      expect(weights.metadata).toBe(0.4);
      expect(weights.summary).toBe(0.2);
      expect(weights.temporal).toBe(0.1);
    });

    it('should return mixed weights for unknown context type', () => {
      const weights = scorer.getDefaultWeights('unknown');
      expect(weights.embedding).toBe(0.35);
      expect(weights.metadata).toBe(0.35);
      expect(weights.summary).toBe(0.2);
      expect(weights.temporal).toBe(0.1);
    });

    it('should handle case insensitive context types', () => {
      const weights = scorer.getDefaultWeights('CONVERSATION');
      expect(weights.embedding).toBe(0.4);
    });
  });

  describe('static methods', () => {
    it('should provide decay functions', () => {
      const decayFunctions = ActivationScorer.getDecayFunctions();
      
      expect(typeof decayFunctions.exponential).toBe('function');
      expect(typeof decayFunctions.linear).toBe('function');
      expect(typeof decayFunctions.logarithmic).toBe('function');
      expect(typeof decayFunctions.step).toBe('function');
      expect(typeof decayFunctions.none).toBe('function');
    });

    it('should provide ranking strategies', () => {
      const strategies = ActivationScorer.getRankingStrategies();
      
      expect(strategies.activation_score).toBeDefined();
      expect(strategies.recency).toBeDefined();
      expect(strategies.access_frequency).toBeDefined();
      expect(strategies.combined).toBeDefined();
      expect(strategies.relevance_boost).toBeDefined();
    });
  });
});
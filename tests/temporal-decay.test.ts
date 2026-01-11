import fc from 'fast-check';
import { TemporalDecay } from '../src/components/temporal-decay';
import { DecayConfig } from '../src/interfaces/temporal-decay';

describe('TemporalDecay', () => {
  let temporalDecay: TemporalDecay;

  beforeEach(() => {
    temporalDecay = new TemporalDecay();
  });

  describe('Property 14: Temporal decay application', () => {
    /**
     * Feature: shadow-memory, Property 14: Temporal decay application
     * Validates: Requirements 7.1
     * 
     * For any memory as it ages, the system should apply decay functions that reduce 
     * activation scores over time according to configurable decay parameters.
     */
    it('should apply decay functions that reduce activation scores over time', () => {
      fc.assert(
        fc.property(
          // Generate activation scores between 0.1 and 1.0
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
          // Generate memory ages from 0 to 365 days
          fc.integer({ min: 0, max: 365 }),
          // Generate a second age that's greater than the first
          fc.integer({ min: 1, max: 365 }),
          // Generate decay configurations
          fc.oneof(
            // Exponential decay config
            fc.record({
              type: fc.constant('exponential' as const),
              halfLife: fc.float({ min: Math.fround(1), max: Math.fround(100) })
            }),
            // Linear decay config
            fc.record({
              type: fc.constant('linear' as const),
              rate: fc.float({ min: Math.fround(0.001), max: Math.fround(0.1) })
            }),
            // Logarithmic decay config
            fc.record({
              type: fc.constant('logarithmic' as const),
              base: fc.float({ min: Math.fround(1.1), max: Math.fround(10) })
            })
          ),
          (activationScore, age1, ageIncrement, decayConfig) => {
            const age2 = age1 + ageIncrement;
            
            // Configure the decay function
            temporalDecay.configureDecay('global', decayConfig);
            
            // Apply decay at two different ages
            const decayedScore1 = temporalDecay.applyDecay(activationScore, age1);
            const decayedScore2 = temporalDecay.applyDecay(activationScore, age2);
            
            // Property 1: Decay should reduce or maintain activation scores (monotonic decrease)
            expect(decayedScore2).toBeLessThanOrEqual(decayedScore1);
            
            // Property 2: Decayed scores should never exceed original score
            expect(decayedScore1).toBeLessThanOrEqual(activationScore);
            expect(decayedScore2).toBeLessThanOrEqual(activationScore);
            
            // Property 3: Decayed scores should be non-negative
            expect(decayedScore1).toBeGreaterThanOrEqual(0);
            expect(decayedScore2).toBeGreaterThanOrEqual(0);
            
            // Property 4: At age 0, decay should not reduce the score (or reduce it minimally)
            const scoreAtZero = temporalDecay.applyDecay(activationScore, 0);
            expect(scoreAtZero).toBeCloseTo(activationScore, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect configurable decay parameters for different decay types', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
          fc.integer({ min: 1, max: 100 }),
          (activationScore, memoryAge) => {
            // Test exponential decay with different half-lives
            const shortHalfLife = 10;
            const longHalfLife = 50;
            
            temporalDecay.configureDecay('global', { type: 'exponential', halfLife: shortHalfLife });
            const shortDecayScore = temporalDecay.applyDecay(activationScore, memoryAge);
            
            temporalDecay.configureDecay('global', { type: 'exponential', halfLife: longHalfLife });
            const longDecayScore = temporalDecay.applyDecay(activationScore, memoryAge);
            
            // Shorter half-life should result in more decay (lower score) for the same age
            if (memoryAge > 0) {
              expect(shortDecayScore).toBeLessThanOrEqual(longDecayScore);
            }
            
            // Test linear decay with different rates
            const highRate = 0.05;
            const lowRate = 0.01;
            
            temporalDecay.configureDecay('global', { type: 'linear', rate: highRate });
            const highRateScore = temporalDecay.applyDecay(activationScore, memoryAge);
            
            temporalDecay.configureDecay('global', { type: 'linear', rate: lowRate });
            const lowRateScore = temporalDecay.applyDecay(activationScore, memoryAge);
            
            // Higher rate should result in more decay (lower score) for the same age
            if (memoryAge > 0) {
              expect(highRateScore).toBeLessThanOrEqual(lowRateScore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply decay consistently across different context types', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
          fc.integer({ min: 1, max: 100 }),
          fc.record({
            type: fc.constant('exponential' as const),
            halfLife: fc.float({ min: Math.fround(5), max: Math.fround(50) })
          }),
          (activationScore, memoryAge, decayConfig) => {
            // Configure decay for different context types
            temporalDecay.configureDecay('conversation', decayConfig);
            temporalDecay.configureDecay('document', decayConfig);
            
            // Apply decay for both context types
            const conversationScore = temporalDecay.applyDecay(activationScore, memoryAge, 'conversation');
            const documentScore = temporalDecay.applyDecay(activationScore, memoryAge, 'document');
            
            // Same configuration should produce same results
            expect(conversationScore).toBeCloseTo(documentScore, 10);
            
            // Both should follow decay properties
            expect(conversationScore).toBeLessThanOrEqual(activationScore);
            expect(documentScore).toBeLessThanOrEqual(activationScore);
            expect(conversationScore).toBeGreaterThanOrEqual(0);
            expect(documentScore).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle batch decay application correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              memoryId: fc.string({ minLength: 1, maxLength: 10 }),
              activationScore: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
              age: fc.integer({ min: 0, max: 365 }),
              contextType: fc.option(fc.constantFrom('conversation', 'document', 'task'), { nil: undefined })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.record({
            type: fc.constant('exponential' as const),
            halfLife: fc.float({ min: Math.fround(5), max: Math.fround(50) })
          }),
          (memories, decayConfig) => {
            // Configure decay
            temporalDecay.configureDecay('global', decayConfig);
            
            // Apply batch decay
            const results = temporalDecay.batchApplyDecay(memories);
            
            // Verify results structure and properties
            expect(results).toHaveLength(memories.length);
            
            results.forEach((result, index) => {
              const originalMemory = memories[index];
              
              // Check result structure
              expect(result.memoryId).toBe(originalMemory.memoryId);
              expect(result.originalScore).toBe(originalMemory.activationScore);
              
              // Check decay properties
              expect(result.decayedScore).toBeLessThanOrEqual(result.originalScore);
              expect(result.decayedScore).toBeGreaterThanOrEqual(0);
              expect(result.decayFactor).toBeGreaterThanOrEqual(0);
              expect(result.decayFactor).toBeLessThanOrEqual(1);
              
              // Verify decay calculation
              const expectedDecayedScore = result.originalScore * result.decayFactor;
              expect(result.decayedScore).toBeCloseTo(expectedDecayedScore, 10);
              
              // Individual decay should match batch decay
              const individualDecay = temporalDecay.applyDecay(
                originalMemory.activationScore,
                originalMemory.age,
                originalMemory.contextType || undefined
              );
              expect(result.decayedScore).toBeCloseTo(individualDecay, 10);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional unit tests for specific edge cases
  describe('Edge cases and error handling', () => {
    it('should handle zero age correctly', () => {
      const score = 0.8;
      const decayedScore = temporalDecay.applyDecay(score, 0);
      expect(decayedScore).toBeCloseTo(score, 5);
    });

    it('should throw error for negative age', () => {
      expect(() => {
        temporalDecay.applyDecay(0.8, -1);
      }).toThrow('Memory age cannot be negative');
    });

    it('should handle step decay correctly', () => {
      const stepConfig: DecayConfig = {
        type: 'step',
        steps: [
          { age: 0, factor: 1.0 },
          { age: 30, factor: 0.8 },
          { age: 90, factor: 0.5 },
          { age: 180, factor: 0.2 }
        ]
      };
      
      temporalDecay.configureDecay('global', stepConfig);
      
      expect(temporalDecay.applyDecay(1.0, 0)).toBeCloseTo(1.0, 5);
      expect(temporalDecay.applyDecay(1.0, 30)).toBeCloseTo(0.8, 5);
      expect(temporalDecay.applyDecay(1.0, 90)).toBeCloseTo(0.5, 5);
      expect(temporalDecay.applyDecay(1.0, 180)).toBeCloseTo(0.2, 5);
    });
  });
});
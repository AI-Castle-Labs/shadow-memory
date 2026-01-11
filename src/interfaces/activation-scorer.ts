import { SimilarityScores, ScoringWeights, MemoryId } from '../types/core';

/**
 * Interface for computing activation scores and ranking memories
 */
export interface IActivationScorer {
  /**
   * Compute activation score from similarity scores and weights
   */
  computeActivationScore(
    similarities: SimilarityScores,
    weights: ScoringWeights
  ): number;

  /**
   * Rank memories by their activation scores
   */
  rankMemoriesByActivation(
    scores: Map<MemoryId, number>
  ): MemoryId[];

  /**
   * Apply temporal decay to activation score
   */
  applyTemporalDecay(
    baseScore: number,
    memoryAge: number,
    decayFunction: (age: number) => number
  ): number;

  /**
   * Get default scoring weights for context type
   */
  getDefaultWeights(contextType: string): ScoringWeights;
}
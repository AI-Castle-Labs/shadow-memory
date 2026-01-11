import { IActivationScorer } from '../interfaces/activation-scorer';
import { SimilarityScores, ScoringWeights, MemoryId, ContextType } from '../types/core';

/**
 * Ranking strategy types for memory ordering
 */
export type RankingStrategy = 'activation_score' | 'recency' | 'access_frequency' | 'combined' | 'relevance_boost';

/**
 * Memory ranking information including score and metadata
 */
export interface MemoryRankingInfo {
  memoryId: MemoryId;
  activationScore: number;
  timestamp?: Date;
  accessCount?: number;
  lastAccessed?: Date;
  relevanceBoost?: number;
}

/**
 * Implementation of activation score computation and memory ranking
 * Combines multiple similarity dimensions with configurable weights and temporal decay
 */
export class ActivationScorer implements IActivationScorer {

  /**
   * Compute activation score from similarity scores and weights
   * Formula: activation_score = (w1 * embedding_similarity) + (w2 * metadata_similarity) + 
   *                           (w3 * summary_similarity) + (w4 * temporal_relevance)
   */
  computeActivationScore(
    similarities: SimilarityScores,
    weights: ScoringWeights
  ): number {
    // Validate inputs
    if (!similarities || !weights) {
      throw new Error('Similarities and weights are required');
    }

    // Ensure all similarity scores are in valid range [0, 1]
    const validatedSimilarities = this.validateSimilarityScores(similarities);
    
    // Ensure weights sum to 1.0 for proper normalization
    const normalizedWeights = this.normalizeWeights(weights);

    // Compute weighted sum
    const activationScore = 
      (normalizedWeights.embedding * validatedSimilarities.embeddingSimilarity) +
      (normalizedWeights.metadata * validatedSimilarities.metadataSimilarity) +
      (normalizedWeights.summary * validatedSimilarities.summarySimilarity) +
      (normalizedWeights.temporal * validatedSimilarities.temporalRelevance);

    // Ensure result is in valid range [0, 1]
    return Math.max(0, Math.min(1, activationScore));
  }

  /**
   * Rank memories by their activation scores in descending order
   */
  rankMemoriesByActivation(scores: Map<MemoryId, number>): MemoryId[] {
    if (!scores || scores.size === 0) {
      return [];
    }

    // Convert map to array of [memoryId, score] pairs and sort by score descending
    const sortedEntries = Array.from(scores.entries())
      .filter(([_, score]) => isFinite(score)) // Filter out invalid scores
      .sort(([_a, scoreA], [_b, scoreB]) => scoreB - scoreA);

    // Return just the memory IDs in ranked order
    return sortedEntries.map(([memoryId, _]) => memoryId);
  }

  /**
   * Advanced memory ranking with different strategies
   */
  rankMemoriesWithStrategy(
    memoryInfos: MemoryRankingInfo[],
    strategy: RankingStrategy = 'activation_score'
  ): MemoryId[] {
    if (!memoryInfos || memoryInfos.length === 0) {
      return [];
    }

    // Filter out invalid entries
    const validMemories = memoryInfos.filter(info => 
      info.memoryId && 
      isFinite(info.activationScore) && 
      info.activationScore >= 0
    );

    if (validMemories.length === 0) {
      return [];
    }

    // Apply ranking strategy
    let sortedMemories: MemoryRankingInfo[];

    switch (strategy) {
      case 'activation_score':
        sortedMemories = this.rankByActivationScore(validMemories);
        break;
      
      case 'recency':
        sortedMemories = this.rankByRecency(validMemories);
        break;
      
      case 'access_frequency':
        sortedMemories = this.rankByAccessFrequency(validMemories);
        break;
      
      case 'combined':
        sortedMemories = this.rankByCombinedScore(validMemories);
        break;
      
      case 'relevance_boost':
        sortedMemories = this.rankWithRelevanceBoost(validMemories);
        break;
      
      default:
        throw new Error(`Unsupported ranking strategy: ${strategy}`);
    }

    return sortedMemories.map(info => info.memoryId);
  }

  /**
   * Get ranking strategies with descriptions
   */
  static getRankingStrategies(): Record<RankingStrategy, string> {
    return {
      'activation_score': 'Rank purely by activation score (similarity-based)',
      'recency': 'Rank by memory creation time (newest first)',
      'access_frequency': 'Rank by how often memories are accessed',
      'combined': 'Combine activation score, recency, and access frequency',
      'relevance_boost': 'Apply relevance boost to activation scores'
    };
  }

  /**
   * Apply temporal decay to activation score based on memory age
   */
  applyTemporalDecay(
    baseScore: number,
    memoryAge: number,
    decayFunction: (age: number) => number
  ): number {
    if (!isFinite(baseScore) || baseScore < 0 || baseScore > 1) {
      throw new Error('Base score must be a finite number between 0 and 1');
    }

    if (!isFinite(memoryAge) || memoryAge < 0) {
      throw new Error('Memory age must be a non-negative finite number');
    }

    if (typeof decayFunction !== 'function') {
      throw new Error('Decay function must be a function');
    }

    try {
      const decayFactor = decayFunction(memoryAge);
      
      // Validate decay factor
      if (!isFinite(decayFactor) || decayFactor < 0 || decayFactor > 1) {
        throw new Error('Decay function must return a value between 0 and 1');
      }

      const decayedScore = baseScore * decayFactor;
      
      // Ensure result is in valid range
      return Math.max(0, Math.min(1, decayedScore));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error applying temporal decay: ${errorMessage}`);
    }
  }

  /**
   * Get default scoring weights for different context types
   */
  getDefaultWeights(contextType: string): ScoringWeights {
    const contextTypeNormalized = contextType.toLowerCase() as ContextType;

    switch (contextTypeNormalized) {
      case 'conversation':
        return {
          embedding: 0.4,  // High weight on semantic similarity for conversations
          metadata: 0.3,   // Moderate weight on topics and entities
          summary: 0.2,    // Lower weight on summary matching
          temporal: 0.1    // Low temporal weight for conversations
        };

      case 'document':
        return {
          embedding: 0.3,  // Moderate semantic similarity
          metadata: 0.4,   // High weight on document structure and topics
          summary: 0.2,    // Moderate summary importance
          temporal: 0.1    // Low temporal relevance
        };

      case 'task':
        return {
          embedding: 0.2,  // Lower semantic weight
          metadata: 0.5,   // High weight on task-related metadata
          summary: 0.2,    // Moderate summary weight
          temporal: 0.1    // Low temporal weight
        };

      case 'query':
        return {
          embedding: 0.5,  // Very high semantic similarity for queries
          metadata: 0.2,   // Lower metadata weight
          summary: 0.2,    // Moderate summary weight
          temporal: 0.1    // Low temporal weight
        };

      case 'mixed':
      default:
        return {
          embedding: 0.35, // Balanced approach
          metadata: 0.35,  // Equal weight to metadata
          summary: 0.2,    // Moderate summary weight
          temporal: 0.1    // Standard temporal weight
        };
    }
  }

  /**
   * Get common temporal decay functions
   */
  static getDecayFunctions() {
    return {
      /**
       * Exponential decay: score * e^(-λ * age)
       * @param lambda Decay rate parameter (higher = faster decay)
       */
      exponential: (lambda: number = 0.1) => (age: number) => {
        return Math.exp(-lambda * age);
      },

      /**
       * Linear decay: max(0, 1 - (age / maxAge))
       * @param maxAge Age at which score becomes 0
       */
      linear: (maxAge: number = 365) => (age: number) => {
        return Math.max(0, 1 - (age / maxAge));
      },

      /**
       * Logarithmic decay: 1 / (1 + log(1 + age))
       */
      logarithmic: () => (age: number) => {
        return 1 / (1 + Math.log(1 + age));
      },

      /**
       * Step decay: 1.0 until threshold, then reduced value
       * @param threshold Age threshold for decay
       * @param decayedValue Value after threshold (0-1)
       */
      step: (threshold: number = 30, decayedValue: number = 0.5) => (age: number) => {
        return age <= threshold ? 1.0 : decayedValue;
      },

      /**
       * No decay: always returns 1.0
       */
      none: () => (_age: number) => 1.0
    };
  }

  // Private helper methods

  /**
   * Rank memories by activation score (descending)
   */
  private rankByActivationScore(memories: MemoryRankingInfo[]): MemoryRankingInfo[] {
    return memories.sort((a, b) => b.activationScore - a.activationScore);
  }

  /**
   * Rank memories by recency (newest first)
   */
  private rankByRecency(memories: MemoryRankingInfo[]): MemoryRankingInfo[] {
    return memories.sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeB - timeA; // Newest first
    });
  }

  /**
   * Rank memories by access frequency (most accessed first)
   */
  private rankByAccessFrequency(memories: MemoryRankingInfo[]): MemoryRankingInfo[] {
    return memories.sort((a, b) => {
      const accessA = a.accessCount || 0;
      const accessB = b.accessCount || 0;
      return accessB - accessA; // Most accessed first
    });
  }

  /**
   * Rank memories using combined score of activation, recency, and access frequency
   */
  private rankByCombinedScore(memories: MemoryRankingInfo[]): MemoryRankingInfo[] {
    const now = new Date().getTime();
    
    // Calculate combined scores
    const memoriesWithCombinedScore = memories.map(memory => {
      // Normalize recency (0-1, where 1 is most recent)
      const recencyScore = memory.timestamp ? 
        Math.exp(-(now - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0; // 30-day decay
      
      // Normalize access frequency (0-1)
      const maxAccess = Math.max(...memories.map(m => m.accessCount || 0));
      const accessScore = maxAccess > 0 ? (memory.accessCount || 0) / maxAccess : 0;
      
      // Combined score with weights
      const combinedScore = 
        0.6 * memory.activationScore +  // 60% activation score
        0.25 * recencyScore +           // 25% recency
        0.15 * accessScore;             // 15% access frequency
      
      return {
        ...memory,
        combinedScore
      };
    });

    // Sort by combined score
    return memoriesWithCombinedScore
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .map(({ combinedScore, ...memory }) => memory);
  }

  /**
   * Rank memories with relevance boost applied to activation scores
   */
  private rankWithRelevanceBoost(memories: MemoryRankingInfo[]): MemoryRankingInfo[] {
    const memoriesWithBoost = memories.map(memory => {
      const boost = memory.relevanceBoost || 1.0;
      const boostedScore = Math.min(1.0, memory.activationScore * boost);
      
      return {
        ...memory,
        activationScore: boostedScore
      };
    });

    return this.rankByActivationScore(memoriesWithBoost);
  }

  /**
   * Validate and clamp similarity scores to [0, 1] range
   */
  private validateSimilarityScores(similarities: SimilarityScores): SimilarityScores {
    return {
      embeddingSimilarity: this.clampScore(similarities.embeddingSimilarity),
      metadataSimilarity: this.clampScore(similarities.metadataSimilarity),
      summarySimilarity: this.clampScore(similarities.summarySimilarity),
      temporalRelevance: this.clampScore(similarities.temporalRelevance)
    };
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(weights: ScoringWeights): ScoringWeights {
    const sum = weights.embedding + weights.metadata + weights.summary + weights.temporal;
    
    if (sum === 0) {
      // If all weights are 0, use equal weights
      return {
        embedding: 0.25,
        metadata: 0.25,
        summary: 0.25,
        temporal: 0.25
      };
    }

    return {
      embedding: weights.embedding / sum,
      metadata: weights.metadata / sum,
      summary: weights.summary / sum,
      temporal: weights.temporal / sum
    };
  }

  /**
   * Clamp a score to valid range [0, 1]
   */
  private clampScore(score: number): number {
    if (!isFinite(score)) {
      return 0;
    }
    return Math.max(0, Math.min(1, score));
  }
}
import { IMemoryAwarenessInterface } from '../interfaces/memory-awareness';
import { IMemoryStore } from '../interfaces/memory-store';
import { ISimilarityEngine } from '../interfaces/similarity-engine';
import { IActivationScorer } from '../interfaces/activation-scorer';
import { IThresholdManager } from '../interfaces/threshold-manager';
import { 
  Context, 
  MemoryAwareness, 
  RelevanceExplanation, 
  MemoryId, 
  Memory, 
  SimilarityScores,
  ScoringWeights,
  ContextType,
  RelevanceType,
  Metadata
} from '../types/core';

/**
 * Memory Awareness Interface implementation
 * Provides memory awareness without auto-loading content and supports selective retrieval
 */
export class MemoryAwarenessInterface implements IMemoryAwarenessInterface {
  constructor(
    private memoryStore: IMemoryStore,
    private similarityEngine: ISimilarityEngine,
    private activationScorer: IActivationScorer,
    private thresholdManager: IThresholdManager
  ) {}

  /**
   * Get awareness of relevant memories for current context
   * Provides memory awareness without auto-loading content (Requirement 5.1)
   */
  async getMemoryAwareness(context: Context): Promise<MemoryAwareness[]> {
    const allCandidates = await this.getAllCandidateMemories(context);
    const contextType = this.determineContextType(context);
    const threshold = this.thresholdManager.getThreshold(contextType);
    return allCandidates.filter(m => m.activationScore >= threshold);
  }

  /**
   * Get ALL candidate memories with their activation scores (regardless of threshold)
   * Useful for debugging and showing what the system is considering
   */
  async getAllCandidateMemories(context: Context): Promise<MemoryAwareness[]> {
    const memoryIds = await this.memoryStore.getAllMemoryIds();
    
    if (memoryIds.length === 0) {
      return [];
    }

    const contextType = this.determineContextType(context);
    const weights = this.activationScorer.getDefaultWeights(contextType);
    const awarenessResults: MemoryAwareness[] = [];

    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) continue;

      try {
        const contextMetadata: Metadata = {
          topics: context.metadata.topics,
          entities: context.metadata.entities,
          concepts: [],
          relationships: [],
          importance: 0.5
        };

        const similarities = await this.similarityEngine.computeAllSimilarities(
          context.embedding,
          contextMetadata,
          { content: context.summary, keyInsights: [], contextualRelevance: [] },
          memory.embedding,
          memory.metadata,
          memory.summary
        );

        const activationScore = this.activationScorer.computeActivationScore(similarities, weights);
        const relevanceType = this.determineRelevanceType(similarities);
        const confidence = this.calculateConfidence(activationScore, similarities);

        awarenessResults.push({
          memoryId,
          activationScore,
          relevanceType,
          summary: memory.summary.content,
          confidence
        });
      } catch (error) {
        console.warn(`Error processing memory ${memoryId}:`, error);
        continue;
      }
    }

    awarenessResults.sort((a, b) => b.activationScore - a.activationScore);
    return awarenessResults;
  }

  /**
   * Explain why a memory is relevant to current context
   * Generates relevance explanations and memory summaries (Requirement 5.3)
   */
  async explainRelevance(memoryId: MemoryId, context: Context): Promise<RelevanceExplanation> {
    const memory = await this.memoryStore.retrieveMemory(memoryId);
    if (!memory) {
      throw new Error(`Memory with ID ${memoryId} not found`);
    }

    // Compute detailed similarity breakdown
    const contextMetadata: Metadata = {
      topics: context.metadata.topics,
      entities: context.metadata.entities,
      concepts: [], // Context doesn't have concepts, use empty array
      relationships: [], // Context doesn't have relationships, use empty array
      importance: 0.5 // Default importance for context
    };

    const similarities = await this.similarityEngine.computeAllSimilarities(
      context.embedding,
      contextMetadata,
      { content: context.summary, keyInsights: [], contextualRelevance: [] },
      memory.embedding,
      memory.metadata,
      memory.summary
    );

    // Generate human-readable explanations
    const reasons = this.generateRelevanceReasons(similarities, context, memory);
    
    // Calculate overall confidence
    const contextType = this.determineContextType(context);
    const weights = this.activationScorer.getDefaultWeights(contextType);
    const activationScore = this.activationScorer.computeActivationScore(similarities, weights);
    const confidence = this.calculateConfidence(activationScore, similarities);

    return {
      memoryId,
      reasons,
      similarityBreakdown: similarities,
      confidence
    };
  }

  /**
   * Request retrieval of specific memory
   * Loads complete memory content for high-scoring memories (Requirement 5.2)
   */
  async requestMemoryRetrieval(memoryId: MemoryId): Promise<Memory> {
    const memory = await this.memoryStore.retrieveMemory(memoryId);
    if (!memory) {
      throw new Error(`Memory with ID ${memoryId} not found`);
    }

    // Return complete memory content
    return memory;
  }

  /**
   * Request selective retrieval based on criteria
   * Handles multiple high-scoring memories with selection criteria (Requirement 5.4)
   */
  async requestSelectiveRetrieval(
    memoryIds: MemoryId[],
    criteria: {
      maxMemories?: number;
      minActivationScore?: number;
      relevanceTypes?: string[];
    }
  ): Promise<Memory[]> {
    if (memoryIds.length === 0) {
      return [];
    }

    const results: { memory: Memory; activationScore: number; relevanceType: RelevanceType }[] = [];

    // Process each memory ID
    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) continue;

      // For selective retrieval, we need a context to compute activation scores
      // Since no context is provided, we'll use the memory's own metadata as context
      const pseudoContext: Context = {
        content: memory.content,
        metadata: {
          topics: memory.metadata.topics,
          entities: memory.metadata.entities,
          intent: 'mixed', // Default intent
          temporalMarkers: [memory.timestamp],
          structuralElements: []
        },
        embedding: memory.embedding,
        summary: memory.summary.content
      };

      try {
        const similarities = await this.similarityEngine.computeAllSimilarities(
          memory.embedding,
          memory.metadata,
          memory.summary,
          memory.embedding,
          memory.metadata,
          memory.summary
        );

        const contextType = this.determineContextType(pseudoContext);
        const weights = this.activationScorer.getDefaultWeights(contextType);
        const activationScore = this.activationScorer.computeActivationScore(similarities, weights);
        const relevanceType = this.determineRelevanceType(similarities);

        results.push({
          memory,
          activationScore,
          relevanceType
        });
      } catch (error) {
        console.warn(`Error processing memory ${memoryId} for selective retrieval:`, error);
        continue;
      }
    }

    // Apply selection criteria
    let filteredResults = results;

    // Filter by minimum activation score
    if (criteria.minActivationScore !== undefined) {
      filteredResults = filteredResults.filter(
        result => result.activationScore >= criteria.minActivationScore!
      );
    }

    // Filter by relevance types
    if (criteria.relevanceTypes && criteria.relevanceTypes.length > 0) {
      filteredResults = filteredResults.filter(
        result => criteria.relevanceTypes!.includes(result.relevanceType)
      );
    }

    // Sort by activation score (highest first)
    filteredResults.sort((a, b) => b.activationScore - a.activationScore);

    // Limit number of results
    if (criteria.maxMemories !== undefined && criteria.maxMemories > 0) {
      filteredResults = filteredResults.slice(0, criteria.maxMemories);
    }

    return filteredResults.map(result => result.memory);
  }

  /**
   * Enhanced selective retrieval with context-aware scoring
   * Provides better selection when a current context is available
   */
  async requestContextualSelectiveRetrieval(
    memoryIds: MemoryId[],
    context: Context,
    criteria: {
      maxMemories?: number;
      minActivationScore?: number;
      relevanceTypes?: string[];
      prioritizeRecent?: boolean;
      diversityFactor?: number; // 0-1, higher values prefer diverse results
    }
  ): Promise<Memory[]> {
    if (memoryIds.length === 0) {
      return [];
    }

    const contextType = this.determineContextType(context);
    const weights = this.activationScorer.getDefaultWeights(contextType);
    const results: { 
      memory: Memory; 
      activationScore: number; 
      relevanceType: RelevanceType;
      similarities: SimilarityScores;
    }[] = [];

    // Process each memory ID with context-aware scoring
    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) continue;

      try {
        const contextMetadata: Metadata = {
          topics: context.metadata.topics,
          entities: context.metadata.entities,
          concepts: [], // Context doesn't have concepts, use empty array
          relationships: [], // Context doesn't have relationships, use empty array
          importance: 0.5 // Default importance for context
        };

        const similarities = await this.similarityEngine.computeAllSimilarities(
          context.embedding,
          contextMetadata,
          { content: context.summary, keyInsights: [], contextualRelevance: [] },
          memory.embedding,
          memory.metadata,
          memory.summary
        );

        let activationScore = this.activationScorer.computeActivationScore(similarities, weights);

        // Apply recency boost if requested
        if (criteria.prioritizeRecent) {
          const recencyBoost = this.calculateRecencyBoost(memory.timestamp);
          activationScore = Math.min(1.0, activationScore * (1 + recencyBoost));
        }

        const relevanceType = this.determineRelevanceType(similarities);

        results.push({
          memory,
          activationScore,
          relevanceType,
          similarities
        });
      } catch (error) {
        console.warn(`Error processing memory ${memoryId} for contextual selective retrieval:`, error);
        continue;
      }
    }

    // Apply selection criteria
    let filteredResults = results;

    // Filter by minimum activation score
    if (criteria.minActivationScore !== undefined) {
      filteredResults = filteredResults.filter(
        result => result.activationScore >= criteria.minActivationScore!
      );
    }

    // Filter by relevance types
    if (criteria.relevanceTypes && criteria.relevanceTypes.length > 0) {
      filteredResults = filteredResults.filter(
        result => criteria.relevanceTypes!.includes(result.relevanceType)
      );
    }

    // Sort by activation score (highest first)
    filteredResults.sort((a, b) => b.activationScore - a.activationScore);

    // Apply diversity filtering if requested
    if (criteria.diversityFactor && criteria.diversityFactor > 0) {
      filteredResults = this.applyDiversityFiltering(filteredResults, criteria.diversityFactor);
    }

    // Limit number of results
    if (criteria.maxMemories !== undefined && criteria.maxMemories > 0) {
      filteredResults = filteredResults.slice(0, criteria.maxMemories);
    }

    return filteredResults.map(result => result.memory);
  }

  /**
   * Get memory summaries for preview before full retrieval
   * Supports the requirement for providing summaries before full retrieval (Requirement 5.3)
   */
  async getMemorySummariesForPreview(memoryIds: MemoryId[]): Promise<{
    memoryId: MemoryId;
    summary: string;
    keyInsights: string[];
    timestamp: Date;
    accessCount: number;
  }[]> {
    const summaries: {
      memoryId: MemoryId;
      summary: string;
      keyInsights: string[];
      timestamp: Date;
      accessCount: number;
    }[] = [];

    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (memory) {
        summaries.push({
          memoryId,
          summary: memory.summary.content,
          keyInsights: memory.summary.keyInsights,
          timestamp: memory.timestamp,
          accessCount: memory.accessCount
        });
      }
    }

    return summaries;
  }

  // Private helper methods

  /**
   * Determine context type from context metadata
   */
  private determineContextType(context: Context): ContextType {
    // Simple heuristic to determine context type
    const intent = context.metadata.intent.toLowerCase();
    const hasStructuralElements = context.metadata.structuralElements.length > 0;
    const hasMultipleTopics = context.metadata.topics.length > 3;

    if (intent.includes('query') || intent.includes('question')) {
      return 'query';
    } else if (intent.includes('task') || intent.includes('action')) {
      return 'task';
    } else if (hasStructuralElements || intent.includes('document')) {
      return 'document';
    } else if (intent.includes('conversation') || intent.includes('chat')) {
      return 'conversation';
    } else if (hasMultipleTopics) {
      return 'mixed';
    } else {
      return 'mixed'; // Default fallback
    }
  }

  /**
   * Determine relevance type based on similarity scores
   */
  private determineRelevanceType(similarities: SimilarityScores): RelevanceType {
    const { embeddingSimilarity, metadataSimilarity, summarySimilarity, temporalRelevance } = similarities;

    // Find the dominant similarity type
    const maxSimilarity = Math.max(embeddingSimilarity, metadataSimilarity, summarySimilarity, temporalRelevance);

    if (temporalRelevance === maxSimilarity && temporalRelevance > 0.7) {
      return 'temporal';
    } else if (embeddingSimilarity === maxSimilarity && embeddingSimilarity > 0.7) {
      return 'semantic';
    } else if (metadataSimilarity === maxSimilarity && metadataSimilarity > 0.7) {
      return 'contextual';
    } else {
      return 'mixed';
    }
  }

  /**
   * Calculate confidence score based on activation score and similarity consistency
   */
  private calculateConfidence(activationScore: number, similarities: SimilarityScores): number {
    // Base confidence from activation score
    let confidence = activationScore;

    // Boost confidence if multiple similarity dimensions agree
    const similarityValues = [
      similarities.embeddingSimilarity,
      similarities.metadataSimilarity,
      similarities.summarySimilarity,
      similarities.temporalRelevance
    ];

    const highSimilarities = similarityValues.filter(sim => sim > 0.6).length;
    const consistencyBoost = (highSimilarities - 1) * 0.1; // Boost for each additional high similarity

    confidence = Math.min(1.0, confidence + consistencyBoost);

    // Reduce confidence if similarities are very inconsistent
    const maxSim = Math.max(...similarityValues);
    const minSim = Math.min(...similarityValues);
    const inconsistencyPenalty = (maxSim - minSim) * 0.1;

    confidence = Math.max(0.0, confidence - inconsistencyPenalty);

    return confidence;
  }

  /**
   * Generate human-readable relevance reasons
   */
  private generateRelevanceReasons(
    similarities: SimilarityScores,
    context: Context,
    memory: Memory
  ): string[] {
    const reasons: string[] = [];

    // Semantic similarity reasons
    if (similarities.embeddingSimilarity > 0.7) {
      reasons.push(`High semantic similarity (${(similarities.embeddingSimilarity * 100).toFixed(1)}%) - the content meaning is closely related`);
    } else if (similarities.embeddingSimilarity > 0.5) {
      reasons.push(`Moderate semantic similarity (${(similarities.embeddingSimilarity * 100).toFixed(1)}%) - some conceptual overlap detected`);
    }

    // Metadata similarity reasons
    if (similarities.metadataSimilarity > 0.7) {
      const commonTopics = context.metadata.topics.filter(topic => 
        memory.metadata.topics.some(memTopic => 
          memTopic.toLowerCase() === topic.toLowerCase()
        )
      );
      
      if (commonTopics.length > 0) {
        reasons.push(`Strong topical overlap: ${commonTopics.slice(0, 3).join(', ')}${commonTopics.length > 3 ? '...' : ''}`);
      }

      const commonEntities = context.metadata.entities.filter(entity =>
        memory.metadata.entities.some(memEntity =>
          memEntity.name.toLowerCase() === entity.name.toLowerCase() &&
          memEntity.type === entity.type
        )
      );

      if (commonEntities.length > 0) {
        reasons.push(`Shared entities: ${commonEntities.slice(0, 2).map(e => e.name).join(', ')}${commonEntities.length > 2 ? '...' : ''}`);
      }
    }

    // Summary similarity reasons
    if (similarities.summarySimilarity > 0.6) {
      reasons.push(`Similar key insights and contextual relevance patterns`);
    }

    // Temporal relevance reasons
    if (similarities.temporalRelevance > 0.8) {
      reasons.push(`High temporal relevance - recent or time-sensitive content`);
    }

    // Fallback reason if no specific reasons found
    if (reasons.length === 0) {
      reasons.push(`General relevance detected through multi-dimensional similarity analysis`);
    }

    return reasons;
  }

  /**
   * Calculate recency boost factor based on memory age
   */
  private calculateRecencyBoost(timestamp: Date): number {
    const now = new Date();
    const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay with 30-day half-life
    const halfLife = 30;
    const decayFactor = Math.exp(-Math.log(2) * ageInDays / halfLife);
    
    // Convert to boost factor (0-0.5 range)
    return decayFactor * 0.5;
  }

  /**
   * Apply diversity filtering to avoid too many similar memories
   */
  private applyDiversityFiltering(
    results: { 
      memory: Memory; 
      activationScore: number; 
      relevanceType: RelevanceType;
      similarities: SimilarityScores;
    }[],
    diversityFactor: number
  ): { 
    memory: Memory; 
    activationScore: number; 
    relevanceType: RelevanceType;
    similarities: SimilarityScores;
  }[] {
    if (results.length <= 1 || diversityFactor <= 0) {
      return results;
    }

    const diverseResults: typeof results = [];
    const selectedTopics = new Set<string>();
    const selectedEntities = new Set<string>();

    for (const result of results) {
      let diversityScore = 1.0;

      // Penalize if topics are too similar to already selected memories
      const memoryTopics = new Set(result.memory.metadata.topics.map(t => t.toLowerCase()));
      const topicOverlap = [...memoryTopics].filter(topic => selectedTopics.has(topic)).length;
      if (topicOverlap > 0) {
        diversityScore *= (1 - (topicOverlap / memoryTopics.size) * diversityFactor);
      }

      // Penalize if entities are too similar to already selected memories
      const memoryEntities = new Set(result.memory.metadata.entities.map(e => `${e.name}:${e.type}`.toLowerCase()));
      const entityOverlap = [...memoryEntities].filter(entity => selectedEntities.has(entity)).length;
      if (entityOverlap > 0) {
        diversityScore *= (1 - (entityOverlap / memoryEntities.size) * diversityFactor);
      }

      // Apply diversity penalty to activation score
      const adjustedScore = result.activationScore * diversityScore;

      // Only include if diversity score is above threshold or if we have few results
      if (diversityScore > (1 - diversityFactor) || diverseResults.length < 2) {
        diverseResults.push({
          ...result,
          activationScore: adjustedScore
        });

        // Update selected topics and entities
        memoryTopics.forEach(topic => selectedTopics.add(topic));
        memoryEntities.forEach(entity => selectedEntities.add(entity));
      }
    }

    // Re-sort by adjusted activation scores
    diverseResults.sort((a, b) => b.activationScore - a.activationScore);

    return diverseResults;
  }
}
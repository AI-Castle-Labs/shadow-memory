import { ISimilarityEngine } from '../interfaces/similarity-engine';
import { EmbeddingVector, Metadata, Summary, SimilarityScores, Entity, Relationship } from '../types/core';

/**
 * Implementation of multi-dimensional similarity computation engine
 * Supports embedding, metadata, and summary similarity calculations
 */
export class SimilarityEngine implements ISimilarityEngine {

  /**
   * Compute similarity between embedding vectors using multiple metrics
   */
  computeEmbeddingSimilarity(
    contextEmbedding: EmbeddingVector,
    memoryEmbedding: EmbeddingVector
  ): number {
    // Validate that embeddings are compatible
    if (contextEmbedding.dimensions !== memoryEmbedding.dimensions) {
      throw new Error(`Embedding dimension mismatch: ${contextEmbedding.dimensions} vs ${memoryEmbedding.dimensions}`);
    }

    if (contextEmbedding.vector.length !== memoryEmbedding.vector.length) {
      throw new Error(`Vector length mismatch: ${contextEmbedding.vector.length} vs ${memoryEmbedding.vector.length}`);
    }

    // Use cosine similarity as the primary metric
    return this.cosineSimilarity(contextEmbedding.vector, memoryEmbedding.vector);
  }

  /**
   * Compute similarity between metadata structures using weighted Jaccard similarity
   */
  computeMetadataSimilarity(
    contextMetadata: Metadata,
    memoryMetadata: Metadata
  ): number {
    // Compute individual similarity components
    const topicSimilarity = this.jaccardSimilarity(contextMetadata.topics, memoryMetadata.topics);
    const conceptSimilarity = this.jaccardSimilarity(contextMetadata.concepts, memoryMetadata.concepts);
    const entitySimilarity = this.entitySimilarity(contextMetadata.entities, memoryMetadata.entities);
    const relationshipSimilarity = this.relationshipSimilarity(contextMetadata.relationships, memoryMetadata.relationships);
    const importanceSimilarity = this.importanceSimilarity(contextMetadata.importance, memoryMetadata.importance);

    // Weighted combination of similarity components
    const weights = {
      topics: 0.3,
      concepts: 0.25,
      entities: 0.2,
      relationships: 0.15,
      importance: 0.1
    };

    return (
      weights.topics * topicSimilarity +
      weights.concepts * conceptSimilarity +
      weights.entities * entitySimilarity +
      weights.relationships * relationshipSimilarity +
      weights.importance * importanceSimilarity
    );
  }

  /**
   * Compute similarity between summaries using semantic similarity
   */
  async computeSummarySimilarity(
    contextSummary: Summary,
    memorySummary: Summary
  ): Promise<number> {
    // Compute content similarity using simple text overlap for now
    // In a real implementation, this would use sentence embeddings
    const contentSimilarity = this.textSimilarity(contextSummary.content, memorySummary.content);
    
    // Compute key insights similarity
    const insightsSimilarity = this.jaccardSimilarity(contextSummary.keyInsights, memorySummary.keyInsights);
    
    // Compute contextual relevance similarity
    const relevanceSimilarity = this.jaccardSimilarity(contextSummary.contextualRelevance, memorySummary.contextualRelevance);

    // Weighted combination
    const weights = {
      content: 0.5,
      insights: 0.3,
      relevance: 0.2
    };

    return (
      weights.content * contentSimilarity +
      weights.insights * insightsSimilarity +
      weights.relevance * relevanceSimilarity
    );
  }

  /**
   * Compute complete similarity scores for all dimensions
   */
  async computeAllSimilarities(
    contextEmbedding: EmbeddingVector,
    contextMetadata: Metadata,
    contextSummary: Summary,
    memoryEmbedding: EmbeddingVector,
    memoryMetadata: Metadata,
    memorySummary: Summary
  ): Promise<SimilarityScores> {
    const embeddingSimilarity = this.computeEmbeddingSimilarity(contextEmbedding, memoryEmbedding);
    const metadataSimilarity = this.computeMetadataSimilarity(contextMetadata, memoryMetadata);
    const summarySimilarity = await this.computeSummarySimilarity(contextSummary, memorySummary);
    
    // Compute temporal relevance based on recency (simplified)
    const temporalRelevance = 1.0; // Placeholder - would use actual timestamps

    return {
      embeddingSimilarity,
      metadataSimilarity,
      summarySimilarity,
      temporalRelevance
    };
  }

  // Private helper methods for similarity calculations

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length for cosine similarity');
    }

    // Check for NaN or invalid values
    const hasNaNA = vectorA.some(val => !isFinite(val));
    const hasNaNB = vectorB.some(val => !isFinite(val));
    
    if (hasNaNA || hasNaNB) {
      return 0; // Return 0 similarity for invalid vectors
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    // Handle zero vectors - if both are zero, they are identical (similarity = 1)
    if (normA === 0 && normB === 0) {
      return 1.0;
    }

    // If only one is zero, they are completely different (similarity = 0)
    if (normA === 0 || normB === 0) {
      return 0;
    }

    const result = dotProduct / (normA * normB);
    
    // Ensure result is finite
    return isFinite(result) ? result : 0;
  }

  /**
   * Compute euclidean distance between two vectors (normalized to 0-1 similarity)
   */
  private euclideanSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length for euclidean distance');
    }

    let sumSquaredDiffs = 0;
    for (let i = 0; i < vectorA.length; i++) {
      const diff = vectorA[i] - vectorB[i];
      sumSquaredDiffs += diff * diff;
    }

    const distance = Math.sqrt(sumSquaredDiffs);
    
    // Convert distance to similarity (0-1 range)
    // Using exponential decay to map distance to similarity
    return Math.exp(-distance);
  }

  /**
   * Compute Jaccard similarity between two string arrays
   */
  private jaccardSimilarity(setA: string[], setB: string[]): number {
    if (setA.length === 0 && setB.length === 0) {
      return 1.0; // Both empty sets are identical
    }

    const setANormalized = new Set(setA.map(item => item.toLowerCase()));
    const setBNormalized = new Set(setB.map(item => item.toLowerCase()));

    const intersection = new Set([...setANormalized].filter(x => setBNormalized.has(x)));
    const union = new Set([...setANormalized, ...setBNormalized]);

    return intersection.size / union.size;
  }

  /**
   * Compute similarity between entity arrays
   */
  private entitySimilarity(entitiesA: Entity[], entitiesB: Entity[]): number {
    if (entitiesA.length === 0 && entitiesB.length === 0) {
      return 1.0;
    }

    // Create normalized entity representations for comparison
    const normalizedA = entitiesA.map(e => `${e.name.toLowerCase()}:${e.type.toLowerCase()}`);
    const normalizedB = entitiesB.map(e => `${e.name.toLowerCase()}:${e.type.toLowerCase()}`);

    return this.jaccardSimilarity(normalizedA, normalizedB);
  }

  /**
   * Compute similarity between relationship arrays
   */
  private relationshipSimilarity(relationshipsA: Relationship[], relationshipsB: Relationship[]): number {
    if (relationshipsA.length === 0 && relationshipsB.length === 0) {
      return 1.0;
    }

    // Create normalized relationship representations
    const normalizedA = relationshipsA.map(r => 
      `${r.source.toLowerCase()}-${r.type.toLowerCase()}-${r.target.toLowerCase()}`
    );
    const normalizedB = relationshipsB.map(r => 
      `${r.source.toLowerCase()}-${r.type.toLowerCase()}-${r.target.toLowerCase()}`
    );

    return this.jaccardSimilarity(normalizedA, normalizedB);
  }

  /**
   * Compute similarity between importance values
   */
  private importanceSimilarity(importanceA: number, importanceB: number): number {
    // Normalized distance for numerical attributes
    const maxDiff = 1.0; // Maximum possible difference in importance (0-1 range)
    const actualDiff = Math.abs(importanceA - importanceB);
    
    return 1.0 - (actualDiff / maxDiff);
  }

  /**
   * Compute text similarity using simple word overlap
   * In a real implementation, this would use more sophisticated NLP techniques
   */
  private textSimilarity(textA: string, textB: string): number {
    if (textA === textB) {
      return 1.0;
    }

    if (textA.length === 0 && textB.length === 0) {
      return 1.0;
    }

    if (textA.length === 0 || textB.length === 0) {
      return 0.0;
    }

    // Simple word-based similarity
    const wordsA = textA.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const wordsB = textB.toLowerCase().split(/\s+/).filter(word => word.length > 0);

    return this.jaccardSimilarity(wordsA, wordsB);
  }

  /**
   * Get alternative similarity metrics for embedding vectors
   */
  getAlternativeEmbeddingSimilarity(
    contextEmbedding: EmbeddingVector,
    memoryEmbedding: EmbeddingVector,
    metric: 'cosine' | 'euclidean' | 'manhattan' = 'cosine'
  ): number {
    if (contextEmbedding.dimensions !== memoryEmbedding.dimensions) {
      throw new Error(`Embedding dimension mismatch: ${contextEmbedding.dimensions} vs ${memoryEmbedding.dimensions}`);
    }

    switch (metric) {
      case 'cosine':
        return this.cosineSimilarity(contextEmbedding.vector, memoryEmbedding.vector);
      case 'euclidean':
        return this.euclideanSimilarity(contextEmbedding.vector, memoryEmbedding.vector);
      case 'manhattan':
        return this.manhattanSimilarity(contextEmbedding.vector, memoryEmbedding.vector);
      default:
        throw new Error(`Unsupported similarity metric: ${metric}`);
    }
  }

  /**
   * Compute Manhattan distance similarity
   */
  private manhattanSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length for Manhattan distance');
    }

    let sumAbsDiffs = 0;
    for (let i = 0; i < vectorA.length; i++) {
      sumAbsDiffs += Math.abs(vectorA[i] - vectorB[i]);
    }

    // Convert distance to similarity using exponential decay
    return Math.exp(-sumAbsDiffs / vectorA.length);
  }
}
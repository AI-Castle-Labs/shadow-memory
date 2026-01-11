import { EmbeddingVector, Metadata, Summary, SimilarityScores } from '../types/core';

/**
 * Interface for computing multi-dimensional similarity scores
 */
export interface ISimilarityEngine {
  /**
   * Compute similarity between embedding vectors
   */
  computeEmbeddingSimilarity(
    contextEmbedding: EmbeddingVector,
    memoryEmbedding: EmbeddingVector
  ): number;

  /**
   * Compute similarity between metadata structures
   */
  computeMetadataSimilarity(
    contextMetadata: Metadata,
    memoryMetadata: Metadata
  ): number;

  /**
   * Compute similarity between summaries
   */
  computeSummarySimilarity(
    contextSummary: Summary,
    memorySummary: Summary
  ): Promise<number>;

  /**
   * Compute complete similarity scores for all dimensions
   */
  computeAllSimilarities(
    contextEmbedding: EmbeddingVector,
    contextMetadata: Metadata,
    contextSummary: Summary,
    memoryEmbedding: EmbeddingVector,
    memoryMetadata: Metadata,
    memorySummary: Summary
  ): Promise<SimilarityScores>;
}
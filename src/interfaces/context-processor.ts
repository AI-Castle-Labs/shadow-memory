import { Context, Metadata, EmbeddingVector, Summary } from '../types/core';

/**
 * Interface for processing current context and generating representations
 */
export interface IContextProcessor {
  /**
   * Extract metadata from current context
   */
  extractMetadata(context: Context): Metadata;

  /**
   * Generate embedding vector for context
   */
  generateEmbedding(context: Context): Promise<EmbeddingVector>;

  /**
   * Create contextual summary
   */
  createSummary(context: Context): Promise<Summary>;

  /**
   * Process complete context and generate all representations
   */
  processContext(context: Context): Promise<{
    metadata: Metadata;
    embedding: EmbeddingVector;
    summary: Summary;
  }>;
}
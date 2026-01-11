import { Context, MemoryAwareness, RelevanceExplanation, MemoryId, Memory } from '../types/core';

/**
 * Interface for providing memory awareness without auto-loading content
 */
export interface IMemoryAwarenessInterface {
  getMemoryAwareness(context: Context): Promise<MemoryAwareness[]>;

  getAllCandidateMemories(context: Context): Promise<MemoryAwareness[]>;

  explainRelevance(memoryId: MemoryId, context: Context): Promise<RelevanceExplanation>;

  /**
   * Request retrieval of specific memory
   */
  requestMemoryRetrieval(memoryId: MemoryId): Promise<Memory>;

  /**
   * Request selective retrieval based on criteria
   */
  requestSelectiveRetrieval(
    memoryIds: MemoryId[],
    criteria: {
      maxMemories?: number;
      minActivationScore?: number;
      relevanceTypes?: string[];
    }
  ): Promise<Memory[]>;
}
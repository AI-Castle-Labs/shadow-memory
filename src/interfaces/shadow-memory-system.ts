import { 
  Context, 
  Memory, 
  MemoryId, 
  MemoryAwareness, 
  RelevanceExplanation,
  BenchmarkResults,
  BenchmarkType
} from '../types/core';

/**
 * Main interface for the Shadow Memory System
 */
export interface IShadowMemorySystem {
  /**
   * Store a new memory in the system
   */
  storeMemory(content: string, context?: Partial<Context>): Promise<MemoryId>;

  /**
   * Get awareness of relevant memories for current context
   */
  getMemoryAwareness(context: Context): Promise<MemoryAwareness[]>;

  /**
   * Retrieve specific memory by ID
   */
  retrieveMemory(memoryId: MemoryId): Promise<Memory>;

  /**
   * Explain relevance of a memory to current context
   */
  explainRelevance(memoryId: MemoryId, context: Context): Promise<RelevanceExplanation>;

  /**
   * Update system configuration
   */
  updateConfiguration(config: {
    thresholds?: Record<string, number>;
    weights?: Record<string, number>;
    decayFunction?: (age: number) => number;
  }): void;

  /**
   * Run system benchmarks
   */
  runBenchmark(benchmarkType: BenchmarkType): Promise<BenchmarkResults>;

  /**
   * Get system statistics
   */
  getSystemStats(): Promise<{
    totalMemories: number;
    averageActivationScore: number;
    memoryUsage: number;
    lastCleanup: Date;
  }>;

  /**
   * Cleanup old or low-scoring memories
   */
  cleanup(criteria?: {
    maxAge?: number;
    minActivationScore?: number;
    maxMemories?: number;
  }): Promise<number>;
}
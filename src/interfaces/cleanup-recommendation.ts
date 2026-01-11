import { MemoryId, UsageAnalytics } from '../types/core';

/**
 * Storage constraints for cleanup recommendations
 */
export interface StorageConstraints {
  maxMemoryCount?: number;
  maxStorageSizeMB?: number;
  targetUtilizationPercent?: number;
  criticalUtilizationPercent?: number;
}

/**
 * Usage patterns for analysis
 */
export interface UsagePatterns {
  accessFrequency: Map<MemoryId, number>;
  recentAccessDays: Map<MemoryId, number>;
  activationScoreHistory: Map<MemoryId, number[]>;
  contextTypeDistribution: Map<string, number>;
  temporalAccessPatterns: Map<MemoryId, Date[]>;
}

/**
 * Cleanup recommendation types
 */
export type CleanupAction = 
  | 'archive'
  | 'delete'
  | 'compress'
  | 'merge'
  | 'update_metadata'
  | 'no_action';

/**
 * Individual cleanup recommendation
 */
export interface CleanupRecommendation {
  memoryId: MemoryId;
  action: CleanupAction;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string[];
  estimatedSpaceSavingMB?: number;
  riskLevel: 'low' | 'medium' | 'high';
  dependencies?: MemoryId[];
}

/**
 * Batch cleanup recommendations
 */
export interface CleanupRecommendationBatch {
  recommendations: CleanupRecommendation[];
  totalEstimatedSavingMB: number;
  totalMemoriesAffected: number;
  executionOrder: MemoryId[];
  warnings: string[];
  summary: {
    archiveCount: number;
    deleteCount: number;
    compressCount: number;
    mergeCount: number;
    updateCount: number;
  };
}

/**
 * Interface for cleanup recommendation system
 */
export interface ICleanupRecommendation {
  /**
   * Configure storage constraints
   */
  configureStorageConstraints(constraints: StorageConstraints): void;

  /**
   * Generate cleanup recommendations based on usage patterns and storage constraints
   */
  generateRecommendations(
    usagePatterns: UsagePatterns,
    usageAnalytics: UsageAnalytics,
    currentStorageUtilization: number
  ): Promise<CleanupRecommendationBatch>;

  /**
   * Analyze usage patterns from memory access data
   */
  analyzeUsagePatterns(memoryIds: MemoryId[]): Promise<UsagePatterns>;

  /**
   * Get recommendations for specific storage pressure level
   */
  getRecommendationsForStoragePressure(
    pressureLevel: 'low' | 'medium' | 'high' | 'critical',
    usagePatterns: UsagePatterns
  ): Promise<CleanupRecommendation[]>;

  /**
   * Validate cleanup recommendations before execution
   */
  validateRecommendations(recommendations: CleanupRecommendation[]): Promise<{
    valid: CleanupRecommendation[];
    invalid: Array<{ recommendation: CleanupRecommendation; reason: string }>;
  }>;

  /**
   * Get current storage constraints
   */
  getStorageConstraints(): StorageConstraints;

  /**
   * Estimate impact of executing recommendations
   */
  estimateCleanupImpact(recommendations: CleanupRecommendation[]): Promise<{
    spaceSavingMB: number;
    memoriesAffected: number;
    potentialDataLoss: boolean;
    reversibilityScore: number;
  }>;
}
import { MemoryId, UsageAnalytics } from '../types/core';

/**
 * Criteria for memory archival decisions
 */
export interface ArchivalCriteria {
  minActivationScore?: number;
  maxDaysSinceLastAccess?: number;
  minAccessCount?: number;
  consistentLowScoreDays?: number;
  storageThresholdPercent?: number;
}

/**
 * Result of archival analysis
 */
export interface ArchivalAnalysis {
  memoryId: MemoryId;
  shouldArchive: boolean;
  reasons: string[];
  lastActivationScore: number;
  daysSinceLastAccess: number;
  accessCount: number;
  averageActivationScore: number;
}

/**
 * Pattern change detection result
 */
export interface PatternChange {
  memoryId: MemoryId;
  changeType: 'relevance_increase' | 'relevance_decrease' | 'context_shift' | 'topic_evolution';
  confidence: number;
  description: string;
  suggestedAction: 'update_metadata' | 'regenerate_summary' | 'update_embedding' | 'no_action';
}

/**
 * Interface for memory archival system
 */
export interface IMemoryArchival {
  /**
   * Configure archival criteria
   */
  configureArchivalCriteria(criteria: ArchivalCriteria): void;

  /**
   * Analyze memories for archival candidates
   */
  analyzeForArchival(memoryIds: MemoryId[], usageAnalytics: UsageAnalytics): Promise<ArchivalAnalysis[]>;

  /**
   * Archive memories that meet the criteria
   */
  archiveMemories(memoryIds: MemoryId[]): Promise<void>;

  /**
   * Detect pattern changes in memory relevance
   */
  detectPatternChanges(memoryIds: MemoryId[], usageAnalytics: UsageAnalytics): Promise<PatternChange[]>;

  /**
   * Update metadata based on pattern changes
   */
  updateMetadataForPatternChanges(changes: PatternChange[]): Promise<void>;

  /**
   * Get archival statistics
   */
  getArchivalStats(): Promise<{
    totalMemories: number;
    archivedMemories: number;
    candidatesForArchival: number;
    storageUtilization: number;
  }>;

  /**
   * Get current archival criteria
   */
  getArchivalCriteria(): ArchivalCriteria;
}
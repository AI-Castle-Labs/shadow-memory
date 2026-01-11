import { MemoryId, UsageAnalytics } from '../types/core';
import { DecayConfig } from './temporal-decay';
import { ArchivalCriteria, ArchivalAnalysis, PatternChange } from './memory-archival';
import { StorageConstraints, CleanupRecommendationBatch } from './cleanup-recommendation';

/**
 * Comprehensive memory lifecycle management configuration
 */
export interface LifecycleConfig {
  temporalDecay: {
    global: DecayConfig;
    contextSpecific?: Map<string, DecayConfig>;
  };
  archival: ArchivalCriteria;
  storage: StorageConstraints;
  automationLevel: 'manual' | 'semi-automatic' | 'automatic';
}

/**
 * Lifecycle management results
 */
export interface LifecycleManagementResult {
  decayResults: Array<{
    memoryId: MemoryId;
    originalScore: number;
    decayedScore: number;
    decayFactor: number;
  }>;
  archivalAnalysis: ArchivalAnalysis[];
  patternChanges: PatternChange[];
  cleanupRecommendations: CleanupRecommendationBatch;
  summary: {
    memoriesProcessed: number;
    memoriesDecayed: number;
    memoriesArchived: number;
    patternChangesDetected: number;
    cleanupRecommendations: number;
    estimatedSpaceSavingMB: number;
  };
}

/**
 * Interface for comprehensive memory lifecycle management
 */
export interface IMemoryLifecycleManager {
  /**
   * Configure lifecycle management settings
   */
  configure(config: LifecycleConfig): void;

  /**
   * Run comprehensive lifecycle management for all memories
   */
  runLifecycleManagement(usageAnalytics: UsageAnalytics): Promise<LifecycleManagementResult>;

  /**
   * Run lifecycle management for specific memories
   */
  runLifecycleManagementForMemories(
    memoryIds: MemoryId[],
    usageAnalytics: UsageAnalytics
  ): Promise<LifecycleManagementResult>;

  /**
   * Apply temporal decay to activation scores
   */
  applyTemporalDecay(memoryIds: MemoryId[]): Promise<Array<{
    memoryId: MemoryId;
    originalScore: number;
    decayedScore: number;
    decayFactor: number;
  }>>;

  /**
   * Execute archival recommendations
   */
  executeArchival(memoryIds: MemoryId[]): Promise<void>;

  /**
   * Execute cleanup recommendations
   */
  executeCleanupRecommendations(
    recommendations: CleanupRecommendationBatch,
    confirmationCallback?: (recommendation: any) => Promise<boolean>
  ): Promise<{
    executed: number;
    skipped: number;
    failed: number;
    errors: string[];
  }>;

  /**
   * Get current lifecycle configuration
   */
  getConfiguration(): LifecycleConfig;

  /**
   * Get lifecycle statistics
   */
  getLifecycleStats(): Promise<{
    totalMemories: number;
    averageAge: number;
    averageActivationScore: number;
    archivalCandidates: number;
    storageUtilization: number;
  }>;
}
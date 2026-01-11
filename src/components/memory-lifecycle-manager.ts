import { 
  IMemoryLifecycleManager, 
  LifecycleConfig, 
  LifecycleManagementResult 
} from '../interfaces/memory-lifecycle-manager';
import { IMemoryStore } from '../interfaces/memory-store';
import { ITemporalDecay } from '../interfaces/temporal-decay';
import { IMemoryArchival } from '../interfaces/memory-archival';
import { ICleanupRecommendation } from '../interfaces/cleanup-recommendation';
import { MemoryId, UsageAnalytics } from '../types/core';
import { CleanupRecommendationBatch } from '../interfaces/cleanup-recommendation';

/**
 * Comprehensive memory lifecycle manager
 * Integrates temporal decay, archival, and cleanup recommendation systems
 */
export class MemoryLifecycleManager implements IMemoryLifecycleManager {
  private config: LifecycleConfig = {
    temporalDecay: {
      global: {
        type: 'exponential',
        halfLife: 30
      }
    },
    archival: {
      minActivationScore: 0.1,
      maxDaysSinceLastAccess: 90,
      minAccessCount: 1,
      consistentLowScoreDays: 30,
      storageThresholdPercent: 80
    },
    storage: {
      maxMemoryCount: 10000,
      maxStorageSizeMB: 1000,
      targetUtilizationPercent: 70,
      criticalUtilizationPercent: 90
    },
    automationLevel: 'semi-automatic'
  };

  constructor(
    private memoryStore: IMemoryStore,
    private temporalDecay: ITemporalDecay,
    private memoryArchival: IMemoryArchival,
    private cleanupRecommendation: ICleanupRecommendation
  ) {
    this.initializeComponents();
  }

  /**
   * Configure lifecycle management settings
   */
  configure(config: LifecycleConfig): void {
    this.config = { ...this.config, ...config };
    this.initializeComponents();
  }

  /**
   * Run comprehensive lifecycle management for all memories
   */
  async runLifecycleManagement(usageAnalytics: UsageAnalytics): Promise<LifecycleManagementResult> {
    const allMemoryIds = await this.memoryStore.getAllMemoryIds();
    return this.runLifecycleManagementForMemories(allMemoryIds, usageAnalytics);
  }

  /**
   * Run lifecycle management for specific memories
   */
  async runLifecycleManagementForMemories(
    memoryIds: MemoryId[],
    usageAnalytics: UsageAnalytics
  ): Promise<LifecycleManagementResult> {
    // Step 1: Apply temporal decay
    const decayResults = await this.applyTemporalDecay(memoryIds);

    // Step 2: Analyze for archival
    const archivalAnalysis = await this.memoryArchival.analyzeForArchival(memoryIds, usageAnalytics);

    // Step 3: Detect pattern changes
    const patternChanges = await this.memoryArchival.detectPatternChanges(memoryIds, usageAnalytics);

    // Step 4: Generate cleanup recommendations
    const usagePatterns = await this.cleanupRecommendation.analyzeUsagePatterns(memoryIds);
    const storageStats = await this.memoryArchival.getArchivalStats();
    const cleanupRecommendations = await this.cleanupRecommendation.generateRecommendations(
      usagePatterns,
      usageAnalytics,
      storageStats.storageUtilization
    );

    // Step 5: Apply pattern changes if automation level allows
    if (this.config.automationLevel === 'automatic' || this.config.automationLevel === 'semi-automatic') {
      await this.memoryArchival.updateMetadataForPatternChanges(patternChanges);
    }

    // Step 6: Execute automatic archival if configured
    if (this.config.automationLevel === 'automatic') {
      const archivalCandidates = archivalAnalysis
        .filter(analysis => analysis.shouldArchive)
        .map(analysis => analysis.memoryId);
      
      if (archivalCandidates.length > 0) {
        await this.executeArchival(archivalCandidates);
      }
    }

    // Generate summary
    const summary = {
      memoriesProcessed: memoryIds.length,
      memoriesDecayed: decayResults.filter(r => r.decayFactor < 1).length,
      memoriesArchived: this.config.automationLevel === 'automatic' 
        ? archivalAnalysis.filter(a => a.shouldArchive).length 
        : 0,
      patternChangesDetected: patternChanges.length,
      cleanupRecommendations: cleanupRecommendations.recommendations.length,
      estimatedSpaceSavingMB: cleanupRecommendations.totalEstimatedSavingMB
    };

    return {
      decayResults,
      archivalAnalysis,
      patternChanges,
      cleanupRecommendations,
      summary
    };
  }

  /**
   * Apply temporal decay to activation scores
   */
  async applyTemporalDecay(memoryIds: MemoryId[]): Promise<Array<{
    memoryId: MemoryId;
    originalScore: number;
    decayedScore: number;
    decayFactor: number;
  }>> {
    const results: Array<{
      memoryId: MemoryId;
      originalScore: number;
      decayedScore: number;
      decayFactor: number;
    }> = [];

    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) continue;

      // Calculate memory age in days
      const ageInDays = Math.floor(
        (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Use importance as a proxy for activation score
      const originalScore = memory.metadata.importance;
      
      // Determine context type for decay configuration
      const contextType = this.inferContextType(memory);
      
      // Apply decay
      const decayedScore = this.temporalDecay.applyDecay(originalScore, ageInDays, contextType);
      const decayFactor = this.temporalDecay.getDecayFactor(ageInDays, contextType);

      results.push({
        memoryId,
        originalScore,
        decayedScore,
        decayFactor
      });

      // Update memory importance with decayed score
      if (Math.abs(decayedScore - originalScore) > 0.01) {
        await this.memoryStore.updateMemoryRepresentations(memoryId, {
          metadata: {
            ...memory.metadata,
            importance: decayedScore
          },
          summary: memory.summary,
          embedding: memory.embedding
        });
      }
    }

    return results;
  }

  /**
   * Execute archival recommendations
   */
  async executeArchival(memoryIds: MemoryId[]): Promise<void> {
    await this.memoryArchival.archiveMemories(memoryIds);
  }

  /**
   * Execute cleanup recommendations
   */
  async executeCleanupRecommendations(
    recommendations: CleanupRecommendationBatch,
    confirmationCallback?: (recommendation: any) => Promise<boolean>
  ): Promise<{
    executed: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    let executed = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    // Validate recommendations first
    const validation = await this.cleanupRecommendation.validateRecommendations(
      recommendations.recommendations
    );

    // Process valid recommendations
    for (const recommendation of validation.valid) {
      try {
        // Ask for confirmation if callback provided
        if (confirmationCallback) {
          const confirmed = await confirmationCallback(recommendation);
          if (!confirmed) {
            skipped++;
            continue;
          }
        }

        // Execute based on action type
        switch (recommendation.action) {
          case 'archive':
            await this.executeArchival([recommendation.memoryId]);
            executed++;
            break;

          case 'delete':
            const deleted = await this.memoryStore.deleteMemory(recommendation.memoryId);
            if (deleted) {
              executed++;
            } else {
              failed++;
              errors.push(`Failed to delete memory ${recommendation.memoryId}`);
            }
            break;

          case 'update_metadata':
            // This would trigger metadata updates in a full implementation
            executed++;
            break;

          case 'compress':
          case 'merge':
            // These would be implemented in a full system
            skipped++;
            break;

          default:
            skipped++;
            break;
        }
      } catch (error) {
        failed++;
        errors.push(`Error executing recommendation for ${recommendation.memoryId}: ${error}`);
      }
    }

    // Add validation errors
    for (const invalid of validation.invalid) {
      failed++;
      errors.push(`Invalid recommendation for ${invalid.recommendation.memoryId}: ${invalid.reason}`);
    }

    return {
      executed,
      skipped,
      failed,
      errors
    };
  }

  /**
   * Get current lifecycle configuration
   */
  getConfiguration(): LifecycleConfig {
    return { ...this.config };
  }

  /**
   * Get lifecycle statistics
   */
  async getLifecycleStats(): Promise<{
    totalMemories: number;
    averageAge: number;
    averageActivationScore: number;
    archivalCandidates: number;
    storageUtilization: number;
  }> {
    const allMemoryIds = await this.memoryStore.getAllMemoryIds();
    const totalMemories = allMemoryIds.length;

    if (totalMemories === 0) {
      return {
        totalMemories: 0,
        averageAge: 0,
        averageActivationScore: 0,
        archivalCandidates: 0,
        storageUtilization: 0
      };
    }

    let totalAge = 0;
    let totalActivationScore = 0;
    let archivalCandidates = 0;

    for (const memoryId of allMemoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) continue;

      // Calculate age in days
      const ageInDays = Math.floor(
        (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalAge += ageInDays;

      // Use importance as activation score
      totalActivationScore += memory.metadata.importance;

      // Check if candidate for archival
      const daysSinceLastAccess = Math.floor(
        (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (
        daysSinceLastAccess > (this.config.archival.maxDaysSinceLastAccess || 90) ||
        memory.accessCount < (this.config.archival.minAccessCount || 1) ||
        memory.metadata.importance < (this.config.archival.minActivationScore || 0.1)
      ) {
        archivalCandidates++;
      }
    }

    const archivalStats = await this.memoryArchival.getArchivalStats();

    return {
      totalMemories,
      averageAge: totalAge / totalMemories,
      averageActivationScore: totalActivationScore / totalMemories,
      archivalCandidates,
      storageUtilization: archivalStats.storageUtilization
    };
  }

  /**
   * Initialize components with current configuration
   */
  private initializeComponents(): void {
    // Configure temporal decay
    this.temporalDecay.configureDecay('global', this.config.temporalDecay.global);
    if (this.config.temporalDecay.contextSpecific) {
      for (const [contextType, config] of this.config.temporalDecay.contextSpecific) {
        this.temporalDecay.configureDecay(contextType, config);
      }
    }

    // Configure archival
    this.memoryArchival.configureArchivalCriteria(this.config.archival);

    // Configure cleanup recommendations
    this.cleanupRecommendation.configureStorageConstraints(this.config.storage);
  }

  /**
   * Infer context type from memory content
   */
  private inferContextType(memory: any): string {
    // Simple heuristic based on content and metadata
    if (memory.metadata.topics.some((topic: string) => topic.includes('conversation'))) {
      return 'conversation';
    } else if (memory.metadata.topics.some((topic: string) => topic.includes('document'))) {
      return 'document';
    } else if (memory.metadata.topics.some((topic: string) => topic.includes('task'))) {
      return 'task';
    } else {
      return 'mixed';
    }
  }
}
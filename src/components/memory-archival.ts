import { IMemoryArchival, ArchivalCriteria, ArchivalAnalysis, PatternChange } from '../interfaces/memory-archival';
import { IMemoryStore } from '../interfaces/memory-store';
import { MemoryId, UsageAnalytics, Memory } from '../types/core';

/**
 * Memory archival system for managing memory lifecycle
 * Supports archival of consistently low-scoring memories and metadata updates
 */
export class MemoryArchival implements IMemoryArchival {
  private criteria: ArchivalCriteria = {
    minActivationScore: 0.1,
    maxDaysSinceLastAccess: 90,
    minAccessCount: 1,
    consistentLowScoreDays: 30,
    storageThresholdPercent: 80
  };

  private memoryActivationHistory: Map<MemoryId, Array<{
    date: Date;
    activationScore: number;
  }>> = new Map();

  constructor(private memoryStore: IMemoryStore) {}

  /**
   * Configure archival criteria
   */
  configureArchivalCriteria(criteria: ArchivalCriteria): void {
    this.criteria = { ...this.criteria, ...criteria };
  }

  /**
   * Analyze memories for archival candidates
   */
  async analyzeForArchival(memoryIds: MemoryId[], usageAnalytics: UsageAnalytics): Promise<ArchivalAnalysis[]> {
    const analyses: ArchivalAnalysis[] = [];

    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) {
        continue;
      }

      const analysis = await this.analyzeMemoryForArchival(memory, usageAnalytics);
      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Archive memories that meet the criteria
   */
  async archiveMemories(memoryIds: MemoryId[]): Promise<void> {
    await this.memoryStore.archiveMemories(memoryIds);
  }

  /**
   * Detect pattern changes in memory relevance
   */
  async detectPatternChanges(memoryIds: MemoryId[], usageAnalytics: UsageAnalytics): Promise<PatternChange[]> {
    const changes: PatternChange[] = [];

    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) {
        continue;
      }

      const patternChanges = await this.detectMemoryPatternChanges(memory, usageAnalytics);
      changes.push(...patternChanges);
    }

    return changes;
  }

  /**
   * Update metadata based on pattern changes
   */
  async updateMetadataForPatternChanges(changes: PatternChange[]): Promise<void> {
    // Group changes by memory ID
    const changesByMemory = new Map<MemoryId, PatternChange[]>();
    for (const change of changes) {
      if (!changesByMemory.has(change.memoryId)) {
        changesByMemory.set(change.memoryId, []);
      }
      changesByMemory.get(change.memoryId)!.push(change);
    }

    // Process updates for each memory
    for (const [memoryId, memoryChanges] of changesByMemory) {
      await this.applyPatternChangeUpdates(memoryId, memoryChanges);
    }
  }

  /**
   * Get archival statistics
   */
  async getArchivalStats(): Promise<{
    totalMemories: number;
    archivedMemories: number;
    candidatesForArchival: number;
    storageUtilization: number;
  }> {
    const totalMemories = await this.memoryStore.getMemoryCount();
    const allMemoryIds = await this.memoryStore.getAllMemoryIds();
    
    // For this implementation, we'll estimate archived memories
    // In a real implementation, this would track archived memories separately
    const archivedMemories = 0; // Placeholder - would need tracking in memory store
    
    // Estimate candidates for archival based on criteria
    let candidatesForArchival = 0;
    for (const memoryId of allMemoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (memory && this.isArchivalCandidate(memory)) {
        candidatesForArchival++;
      }
    }

    // Estimate storage utilization (placeholder calculation)
    const storageUtilization = Math.min(100, (totalMemories / 1000) * 100);

    return {
      totalMemories,
      archivedMemories,
      candidatesForArchival,
      storageUtilization
    };
  }

  /**
   * Get current archival criteria
   */
  getArchivalCriteria(): ArchivalCriteria {
    return { ...this.criteria };
  }

  /**
   * Record activation score for pattern tracking
   */
  recordActivationScore(memoryId: MemoryId, activationScore: number): void {
    if (!this.memoryActivationHistory.has(memoryId)) {
      this.memoryActivationHistory.set(memoryId, []);
    }

    const history = this.memoryActivationHistory.get(memoryId)!;
    history.push({
      date: new Date(),
      activationScore
    });

    // Keep only recent history (last 100 entries)
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Analyze individual memory for archival
   */
  private async analyzeMemoryForArchival(memory: Memory, usageAnalytics: UsageAnalytics): Promise<ArchivalAnalysis> {
    const reasons: string[] = [];
    let shouldArchive = false;

    // Calculate days since last access
    const daysSinceLastAccess = Math.floor(
      (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get activation score history
    const history = this.memoryActivationHistory.get(memory.id) || [];
    const recentHistory = history.filter(h => 
      (Date.now() - h.date.getTime()) <= (this.criteria.consistentLowScoreDays || 30) * 24 * 60 * 60 * 1000
    );

    const averageActivationScore = recentHistory.length > 0 
      ? recentHistory.reduce((sum, h) => sum + h.activationScore, 0) / recentHistory.length
      : 0;

    const lastActivationScore = history.length > 0 
      ? history[history.length - 1].activationScore 
      : 0;

    // Check archival criteria
    if (this.criteria.maxDaysSinceLastAccess && daysSinceLastAccess > this.criteria.maxDaysSinceLastAccess) {
      reasons.push(`Not accessed for ${daysSinceLastAccess} days (threshold: ${this.criteria.maxDaysSinceLastAccess})`);
      shouldArchive = true;
    }

    if (this.criteria.minAccessCount && memory.accessCount < this.criteria.minAccessCount) {
      reasons.push(`Low access count: ${memory.accessCount} (minimum: ${this.criteria.minAccessCount})`);
      shouldArchive = true;
    }

    if (this.criteria.minActivationScore && averageActivationScore < this.criteria.minActivationScore) {
      reasons.push(`Consistently low activation score: ${averageActivationScore.toFixed(3)} (minimum: ${this.criteria.minActivationScore})`);
      shouldArchive = true;
    }

    // Check if consistently low scoring
    if (this.criteria.consistentLowScoreDays && recentHistory.length > 0) {
      const lowScoreCount = recentHistory.filter(h => 
        h.activationScore < (this.criteria.minActivationScore || 0.1)
      ).length;
      
      if (lowScoreCount / recentHistory.length > 0.8) {
        reasons.push(`Consistently low scores over ${this.criteria.consistentLowScoreDays} days`);
        shouldArchive = true;
      }
    }

    return {
      memoryId: memory.id,
      shouldArchive,
      reasons,
      lastActivationScore,
      daysSinceLastAccess,
      accessCount: memory.accessCount,
      averageActivationScore
    };
  }

  /**
   * Detect pattern changes for a specific memory
   */
  private async detectMemoryPatternChanges(memory: Memory, usageAnalytics: UsageAnalytics): Promise<PatternChange[]> {
    const changes: PatternChange[] = [];
    const history = this.memoryActivationHistory.get(memory.id) || [];

    if (history.length < 10) {
      return changes; // Need sufficient history for pattern detection
    }

    // Analyze recent vs historical activation scores
    const recentScores = history.slice(-10).map(h => h.activationScore);
    const historicalScores = history.slice(0, -10).map(h => h.activationScore);

    const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const historicalAverage = historicalScores.reduce((sum, score) => sum + score, 0) / historicalScores.length;

    const changeRatio = recentAverage / (historicalAverage || 0.001);

    // Detect relevance increase
    if (changeRatio > 1.5 && recentAverage > 0.3) {
      changes.push({
        memoryId: memory.id,
        changeType: 'relevance_increase',
        confidence: Math.min(0.95, changeRatio / 2),
        description: `Activation scores increased from ${historicalAverage.toFixed(3)} to ${recentAverage.toFixed(3)}`,
        suggestedAction: 'update_metadata'
      });
    }

    // Detect relevance decrease
    if (changeRatio < 0.5 && historicalAverage > 0.2) {
      changes.push({
        memoryId: memory.id,
        changeType: 'relevance_decrease',
        confidence: Math.min(0.95, 1 / changeRatio / 2),
        description: `Activation scores decreased from ${historicalAverage.toFixed(3)} to ${recentAverage.toFixed(3)}`,
        suggestedAction: 'update_metadata'
      });
    }

    // Detect context shift (high variance in recent scores)
    const recentVariance = this.calculateVariance(recentScores);
    if (recentVariance > 0.1) {
      changes.push({
        memoryId: memory.id,
        changeType: 'context_shift',
        confidence: Math.min(0.9, recentVariance * 5),
        description: `High variance in recent activation scores (${recentVariance.toFixed(3)})`,
        suggestedAction: 'regenerate_summary'
      });
    }

    return changes;
  }

  /**
   * Apply pattern change updates to memory metadata
   */
  private async applyPatternChangeUpdates(memoryId: MemoryId, changes: PatternChange[]): Promise<void> {
    const memory = await this.memoryStore.retrieveMemory(memoryId);
    if (!memory) {
      return;
    }

    // Group changes by suggested action
    const actionGroups = new Map<string, PatternChange[]>();
    for (const change of changes) {
      if (!actionGroups.has(change.suggestedAction)) {
        actionGroups.set(change.suggestedAction, []);
      }
      actionGroups.get(change.suggestedAction)!.push(change);
    }

    // Apply metadata updates based on pattern changes
    for (const [action, actionChanges] of actionGroups) {
      switch (action) {
        case 'update_metadata':
          await this.updateMetadataForRelevanceChange(memory, actionChanges);
          break;
        case 'regenerate_summary':
          // This would trigger summary regeneration in a full implementation
          // For now, we'll just update the importance score
          await this.updateImportanceScore(memory, actionChanges);
          break;
        case 'update_embedding':
          // This would trigger embedding regeneration in a full implementation
          break;
        case 'no_action':
        default:
          // No action needed
          break;
      }
    }
  }

  /**
   * Update metadata based on relevance changes
   */
  private async updateMetadataForRelevanceChange(memory: Memory, changes: PatternChange[]): Promise<void> {
    const relevanceIncreases = changes.filter(c => c.changeType === 'relevance_increase');
    const relevanceDecreases = changes.filter(c => c.changeType === 'relevance_decrease');

    let importanceAdjustment = 0;

    // Increase importance for relevance increases
    for (const change of relevanceIncreases) {
      importanceAdjustment += change.confidence * 0.2;
    }

    // Decrease importance for relevance decreases
    for (const change of relevanceDecreases) {
      importanceAdjustment -= change.confidence * 0.2;
    }

    // Apply importance adjustment
    const newImportance = Math.max(0, Math.min(1, memory.metadata.importance + importanceAdjustment));
    
    if (Math.abs(newImportance - memory.metadata.importance) > 0.05) {
      await this.memoryStore.updateMemoryRepresentations(memory.id, {
        metadata: {
          ...memory.metadata,
          importance: newImportance
        },
        summary: memory.summary,
        embedding: memory.embedding
      });
    }
  }

  /**
   * Update importance score based on pattern changes
   */
  private async updateImportanceScore(memory: Memory, changes: PatternChange[]): Promise<void> {
    const contextShifts = changes.filter(c => c.changeType === 'context_shift');
    
    if (contextShifts.length > 0) {
      // Increase importance for memories with context shifts (they're becoming more dynamic)
      const averageConfidence = contextShifts.reduce((sum, c) => sum + c.confidence, 0) / contextShifts.length;
      const newImportance = Math.min(1, memory.metadata.importance + averageConfidence * 0.1);
      
      if (Math.abs(newImportance - memory.metadata.importance) > 0.05) {
        await this.memoryStore.updateMemoryRepresentations(memory.id, {
          metadata: {
            ...memory.metadata,
            importance: newImportance
          },
          summary: memory.summary,
          embedding: memory.embedding
        });
      }
    }
  }

  /**
   * Check if memory is a candidate for archival
   */
  private isArchivalCandidate(memory: Memory): boolean {
    const daysSinceLastAccess = Math.floor(
      (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      (this.criteria.maxDaysSinceLastAccess && daysSinceLastAccess > this.criteria.maxDaysSinceLastAccess) ||
      (this.criteria.minAccessCount && memory.accessCount < this.criteria.minAccessCount) ||
      memory.metadata.importance < (this.criteria.minActivationScore || 0.1)
    );
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
}
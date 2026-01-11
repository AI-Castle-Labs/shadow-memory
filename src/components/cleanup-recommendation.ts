import { 
  ICleanupRecommendation, 
  StorageConstraints, 
  UsagePatterns, 
  CleanupRecommendation as CleanupRecommendationType, 
  CleanupRecommendationBatch,
  CleanupAction
} from '../interfaces/cleanup-recommendation';
import { IMemoryStore } from '../interfaces/memory-store';
import { MemoryId, UsageAnalytics, Memory } from '../types/core';

/**
 * Cleanup recommendation system for memory lifecycle management
 * Generates recommendations based on usage patterns and storage constraints
 */
export class CleanupRecommendationSystem implements ICleanupRecommendation {
  private constraints: StorageConstraints = {
    maxMemoryCount: 10000,
    maxStorageSizeMB: 1000,
    targetUtilizationPercent: 70,
    criticalUtilizationPercent: 90
  };

  constructor(private memoryStore: IMemoryStore) {}

  /**
   * Configure storage constraints
   */
  configureStorageConstraints(constraints: StorageConstraints): void {
    this.constraints = { ...this.constraints, ...constraints };
  }

  /**
   * Generate cleanup recommendations based on usage patterns and storage constraints
   */
  async generateRecommendations(
    usagePatterns: UsagePatterns,
    usageAnalytics: UsageAnalytics,
    currentStorageUtilization: number
  ): Promise<CleanupRecommendationBatch> {
    const recommendations: CleanupRecommendationType[] = [];
    const warnings: string[] = [];

    // Determine pressure level
    const pressureLevel = this.determinePressureLevel(currentStorageUtilization);
    
    // Generate recommendations based on pressure level
    const pressureRecommendations = await this.getRecommendationsForStoragePressure(
      pressureLevel,
      usagePatterns
    );
    recommendations.push(...pressureRecommendations);

    // Add usage-based recommendations
    const usageRecommendations = await this.generateUsageBasedRecommendations(
      usagePatterns,
      usageAnalytics
    );
    recommendations.push(...usageRecommendations);

    // Sort by priority and confidence
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    // Remove duplicates (same memory ID)
    const uniqueRecommendations = this.removeDuplicateRecommendations(recommendations);

    // Calculate execution order
    const executionOrder = this.calculateExecutionOrder(uniqueRecommendations);

    // Generate summary
    const summary = this.generateSummary(uniqueRecommendations);

    // Calculate total estimated savings
    const totalEstimatedSavingMB = uniqueRecommendations.reduce(
      (sum, rec) => sum + (rec.estimatedSpaceSavingMB || 0),
      0
    );

    // Add warnings for high-risk operations
    const highRiskRecommendations = uniqueRecommendations.filter(r => r.riskLevel === 'high');
    if (highRiskRecommendations.length > 0) {
      warnings.push(`${highRiskRecommendations.length} high-risk operations recommended. Review carefully.`);
    }

    if (pressureLevel === 'critical') {
      warnings.push('Critical storage pressure detected. Immediate action recommended.');
    }

    return {
      recommendations: uniqueRecommendations,
      totalEstimatedSavingMB,
      totalMemoriesAffected: uniqueRecommendations.length,
      executionOrder,
      warnings,
      summary
    };
  }

  /**
   * Analyze usage patterns from memory access data
   */
  async analyzeUsagePatterns(memoryIds: MemoryId[]): Promise<UsagePatterns> {
    const accessFrequency = new Map<MemoryId, number>();
    const recentAccessDays = new Map<MemoryId, number>();
    const activationScoreHistory = new Map<MemoryId, number[]>();
    const contextTypeDistribution = new Map<string, number>();
    const temporalAccessPatterns = new Map<MemoryId, Date[]>();

    for (const memoryId of memoryIds) {
      const memory = await this.memoryStore.retrieveMemory(memoryId);
      if (!memory) continue;

      // Calculate access frequency (accesses per day since creation)
      const daysSinceCreation = Math.max(1, Math.floor(
        (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      ));
      accessFrequency.set(memoryId, memory.accessCount / daysSinceCreation);

      // Calculate days since last access
      const daysSinceLastAccess = Math.floor(
        (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
      );
      recentAccessDays.set(memoryId, daysSinceLastAccess);

      // Simulate activation score history (in real implementation, this would be tracked)
      const simulatedHistory = this.simulateActivationHistory(memory);
      activationScoreHistory.set(memoryId, simulatedHistory);

      // Track context type distribution (based on memory content analysis)
      const contextType = this.inferContextType(memory);
      contextTypeDistribution.set(contextType, (contextTypeDistribution.get(contextType) || 0) + 1);

      // Simulate temporal access patterns
      const accessPattern = this.simulateTemporalAccessPattern(memory);
      temporalAccessPatterns.set(memoryId, accessPattern);
    }

    return {
      accessFrequency,
      recentAccessDays,
      activationScoreHistory,
      contextTypeDistribution,
      temporalAccessPatterns
    };
  }

  /**
   * Get recommendations for specific storage pressure level
   */
  async getRecommendationsForStoragePressure(
    pressureLevel: 'low' | 'medium' | 'high' | 'critical',
    usagePatterns: UsagePatterns
  ): Promise<CleanupRecommendationType[]> {
    const recommendations: CleanupRecommendationType[] = [];

    switch (pressureLevel) {
      case 'critical':
        // Aggressive cleanup - delete unused memories
        recommendations.push(...await this.generateDeleteRecommendations(usagePatterns, 0.9));
        recommendations.push(...await this.generateArchiveRecommendations(usagePatterns, 0.8));
        break;

      case 'high':
        // Archive old memories and compress large ones
        recommendations.push(...await this.generateArchiveRecommendations(usagePatterns, 0.7));
        recommendations.push(...await this.generateCompressionRecommendations(usagePatterns, 0.6));
        break;

      case 'medium':
        // Archive very old memories
        recommendations.push(...await this.generateArchiveRecommendations(usagePatterns, 0.5));
        break;

      case 'low':
        // Maintenance recommendations only
        recommendations.push(...await this.generateMaintenanceRecommendations(usagePatterns));
        break;
    }

    return recommendations;
  }

  /**
   * Validate cleanup recommendations before execution
   */
  async validateRecommendations(recommendations: CleanupRecommendationType[]): Promise<{
    valid: CleanupRecommendationType[];
    invalid: Array<{ recommendation: CleanupRecommendationType; reason: string }>;
  }> {
    const valid: CleanupRecommendationType[] = [];
    const invalid: Array<{ recommendation: CleanupRecommendationType; reason: string }> = [];

    for (const recommendation of recommendations) {
      const memory = await this.memoryStore.retrieveMemory(recommendation.memoryId);
      
      if (!memory) {
        invalid.push({
          recommendation,
          reason: 'Memory not found'
        });
        continue;
      }

      // Validate based on action type
      switch (recommendation.action) {
        case 'delete':
          if (memory.accessCount > 10 && recommendation.riskLevel !== 'low') {
            invalid.push({
              recommendation,
              reason: 'High access count memory marked for deletion without low risk'
            });
            continue;
          }
          break;

        case 'archive':
          // Archive is generally safe
          break;

        case 'compress':
          if (memory.content.length < 1000) {
            invalid.push({
              recommendation,
              reason: 'Memory too small to benefit from compression'
            });
            continue;
          }
          break;

        case 'merge':
          if (!recommendation.dependencies || recommendation.dependencies.length === 0) {
            invalid.push({
              recommendation,
              reason: 'Merge operation requires dependencies'
            });
            continue;
          }
          break;
      }

      valid.push(recommendation);
    }

    return { valid, invalid };
  }

  /**
   * Get current storage constraints
   */
  getStorageConstraints(): StorageConstraints {
    return { ...this.constraints };
  }

  /**
   * Estimate impact of executing recommendations
   */
  async estimateCleanupImpact(recommendations: CleanupRecommendationType[]): Promise<{
    spaceSavingMB: number;
    memoriesAffected: number;
    potentialDataLoss: boolean;
    reversibilityScore: number;
  }> {
    const spaceSavingMB = recommendations.reduce(
      (sum, rec) => sum + (rec.estimatedSpaceSavingMB || 0),
      0
    );

    const memoriesAffected = recommendations.length;

    const potentialDataLoss = recommendations.some(
      rec => rec.action === 'delete' || rec.riskLevel === 'high'
    );

    // Calculate reversibility score (0-1, where 1 is fully reversible)
    const reversibilityScores = recommendations.map(rec => {
      switch (rec.action) {
        case 'delete': return 0.0;
        case 'archive': return 0.9;
        case 'compress': return 0.8;
        case 'merge': return 0.3;
        case 'update_metadata': return 1.0;
        default: return 1.0;
      }
    });

    const reversibilityScore = reversibilityScores.length > 0
      ? (reversibilityScores.reduce((sum: number, score: number) => sum + score, 0) / reversibilityScores.length)
      : 1.0;

    return {
      spaceSavingMB,
      memoriesAffected,
      potentialDataLoss,
      reversibilityScore
    };
  }

  /**
   * Determine storage pressure level
   */
  private determinePressureLevel(currentUtilization: number): 'low' | 'medium' | 'high' | 'critical' {
    const { targetUtilizationPercent = 70, criticalUtilizationPercent = 90 } = this.constraints;

    if (currentUtilization >= criticalUtilizationPercent) {
      return 'critical';
    } else if (currentUtilization >= (criticalUtilizationPercent + targetUtilizationPercent) / 2) {
      return 'high';
    } else if (currentUtilization >= targetUtilizationPercent) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate usage-based recommendations
   */
  private async generateUsageBasedRecommendations(
    usagePatterns: UsagePatterns,
    usageAnalytics: UsageAnalytics
  ): Promise<CleanupRecommendationType[]> {
    const recommendations: CleanupRecommendationType[] = [];

    // Find memories with very low access frequency
    for (const [memoryId, frequency] of usagePatterns.accessFrequency) {
      if (frequency < 0.01) { // Less than 0.01 accesses per day
        const daysSinceAccess = usagePatterns.recentAccessDays.get(memoryId) || 0;
        
        if (daysSinceAccess > 180) { // 6 months
          recommendations.push({
            memoryId,
            action: 'archive',
            priority: 'medium',
            confidence: 0.8,
            reasoning: [
              `Very low access frequency: ${frequency.toFixed(4)} per day`,
              `Not accessed for ${daysSinceAccess} days`
            ],
            estimatedSpaceSavingMB: 0.1, // Estimated
            riskLevel: 'low'
          });
        }
      }
    }

    // Find memories with declining activation scores
    for (const [memoryId, history] of usagePatterns.activationScoreHistory) {
      if (history.length >= 10) {
        const recentAvg = history.slice(-5).reduce((sum, score) => sum + score, 0) / 5;
        const overallAvg = history.reduce((sum, score) => sum + score, 0) / history.length;
        
        if (recentAvg < overallAvg * 0.3) { // Recent scores much lower than historical
          recommendations.push({
            memoryId,
            action: 'update_metadata',
            priority: 'low',
            confidence: 0.6,
            reasoning: [
              `Declining activation scores: recent ${recentAvg.toFixed(3)} vs historical ${overallAvg.toFixed(3)}`
            ],
            riskLevel: 'low'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate delete recommendations
   */
  private async generateDeleteRecommendations(
    usagePatterns: UsagePatterns,
    confidenceThreshold: number
  ): Promise<CleanupRecommendationType[]> {
    const recommendations: CleanupRecommendationType[] = [];

    for (const [memoryId, daysSinceAccess] of usagePatterns.recentAccessDays) {
      const frequency = usagePatterns.accessFrequency.get(memoryId) || 0;
      
      if (daysSinceAccess > 365 && frequency < 0.001) { // 1 year + very low frequency
        recommendations.push({
          memoryId,
          action: 'delete',
          priority: 'high',
          confidence: Math.min(confidenceThreshold, 0.9),
          reasoning: [
            `Not accessed for ${daysSinceAccess} days`,
            `Extremely low access frequency: ${frequency.toFixed(6)} per day`
          ],
          estimatedSpaceSavingMB: 0.2,
          riskLevel: 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate archive recommendations
   */
  private async generateArchiveRecommendations(
    usagePatterns: UsagePatterns,
    confidenceThreshold: number
  ): Promise<CleanupRecommendationType[]> {
    const recommendations: CleanupRecommendationType[] = [];

    for (const [memoryId, daysSinceAccess] of usagePatterns.recentAccessDays) {
      const frequency = usagePatterns.accessFrequency.get(memoryId) || 0;
      
      if (daysSinceAccess > 90 && frequency < 0.01) { // 3 months + low frequency
        recommendations.push({
          memoryId,
          action: 'archive',
          priority: 'medium',
          confidence: Math.min(confidenceThreshold, 0.8),
          reasoning: [
            `Not accessed for ${daysSinceAccess} days`,
            `Low access frequency: ${frequency.toFixed(4)} per day`
          ],
          estimatedSpaceSavingMB: 0.05,
          riskLevel: 'low'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate compression recommendations
   */
  private async generateCompressionRecommendations(
    usagePatterns: UsagePatterns,
    confidenceThreshold: number
  ): Promise<CleanupRecommendationType[]> {
    const recommendations: CleanupRecommendationType[] = [];

    // For this implementation, we'll recommend compression for memories with low access frequency
    // In a real implementation, we'd analyze actual memory sizes
    for (const [memoryId, frequency] of usagePatterns.accessFrequency) {
      if (frequency < 0.1) { // Low frequency memories are good candidates for compression
        recommendations.push({
          memoryId,
          action: 'compress',
          priority: 'low',
          confidence: Math.min(confidenceThreshold, 0.7),
          reasoning: [
            `Low access frequency suitable for compression: ${frequency.toFixed(4)} per day`
          ],
          estimatedSpaceSavingMB: 0.3,
          riskLevel: 'low'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate maintenance recommendations
   */
  private async generateMaintenanceRecommendations(
    usagePatterns: UsagePatterns
  ): Promise<CleanupRecommendationType[]> {
    const recommendations: CleanupRecommendationType[] = [];

    // Recommend metadata updates for memories with inconsistent activation patterns
    for (const [memoryId, history] of usagePatterns.activationScoreHistory) {
      if (history.length >= 5) {
        const variance = this.calculateVariance(history);
        if (variance > 0.2) { // High variance suggests inconsistent relevance
          recommendations.push({
            memoryId,
            action: 'update_metadata',
            priority: 'low',
            confidence: 0.5,
            reasoning: [
              `High activation score variance (${variance.toFixed(3)}) suggests metadata needs updating`
            ],
            riskLevel: 'low'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Remove duplicate recommendations for the same memory
   */
  private removeDuplicateRecommendations(recommendations: CleanupRecommendationType[]): CleanupRecommendationType[] {
    const seen = new Set<MemoryId>();
    const unique: CleanupRecommendationType[] = [];

    for (const recommendation of recommendations) {
      if (!seen.has(recommendation.memoryId)) {
        seen.add(recommendation.memoryId);
        unique.push(recommendation);
      }
    }

    return unique;
  }

  /**
   * Calculate execution order for recommendations
   */
  private calculateExecutionOrder(recommendations: CleanupRecommendationType[]): MemoryId[] {
    // Sort by priority and risk level (low risk first)
    const sorted = [...recommendations].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const riskOrder = { low: 1, medium: 2, high: 3 };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });

    return sorted.map(rec => rec.memoryId);
  }

  /**
   * Generate summary of recommendations
   */
  private generateSummary(recommendations: CleanupRecommendationType[]) {
    return {
      archiveCount: recommendations.filter(r => r.action === 'archive').length,
      deleteCount: recommendations.filter(r => r.action === 'delete').length,
      compressCount: recommendations.filter(r => r.action === 'compress').length,
      mergeCount: recommendations.filter(r => r.action === 'merge').length,
      updateCount: recommendations.filter(r => r.action === 'update_metadata').length
    };
  }

  /**
   * Simulate activation score history for a memory
   */
  private simulateActivationHistory(memory: Memory): number[] {
    // Simple simulation based on access count and age
    const daysSinceCreation = Math.floor(
      (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const history: number[] = [];
    const baseScore = memory.metadata.importance;
    
    for (let i = 0; i < Math.min(30, daysSinceCreation); i++) {
      // Simulate decay over time with some randomness
      const decayFactor = Math.pow(0.95, i);
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      history.push(Math.max(0, baseScore * decayFactor * randomFactor));
    }
    
    return history;
  }

  /**
   * Infer context type from memory content
   */
  private inferContextType(memory: Memory): string {
    // Simple heuristic based on content and metadata
    if (memory.metadata.topics.some(topic => topic.includes('conversation'))) {
      return 'conversation';
    } else if (memory.metadata.topics.some(topic => topic.includes('document'))) {
      return 'document';
    } else if (memory.metadata.topics.some(topic => topic.includes('task'))) {
      return 'task';
    } else {
      return 'mixed';
    }
  }

  /**
   * Simulate temporal access pattern
   */
  private simulateTemporalAccessPattern(memory: Memory): Date[] {
    const pattern: Date[] = [];
    const accessCount = memory.accessCount;
    const daysSinceCreation = Math.floor(
      (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Simulate access dates
    for (let i = 0; i < accessCount; i++) {
      const randomDay = Math.floor(Math.random() * daysSinceCreation);
      const accessDate = new Date(memory.timestamp.getTime() + randomDay * 24 * 60 * 60 * 1000);
      pattern.push(accessDate);
    }

    return pattern.sort((a, b) => a.getTime() - b.getTime());
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
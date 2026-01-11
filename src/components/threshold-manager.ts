import { IThresholdManager } from '../interfaces/threshold-manager';
import { ContextType, UsageAnalytics } from '../types/core';

/**
 * Record of threshold adaptation for tracking performance
 */
interface AdaptationRecord {
  timestamp: Date;
  oldThreshold: number;
  newThreshold: number;
  reason: string;
  usageAnalytics: UsageAnalytics;
}

/**
 * Performance tracking for threshold effectiveness
 */
interface PerformanceTracker {
  totalRetrievals: number;
  successfulRetrievals: number;
  falsePositives: number;
  falseNegatives: number;
  averageActivationScore: number;
  lastUpdated: Date;
}

/**
 * Default threshold values for different context types
 */
const DEFAULT_THRESHOLDS: Record<ContextType, number> = {
  conversation: 0.7,
  document: 0.6,
  task: 0.8,
  query: 0.75,
  mixed: 0.65
};

/**
 * Threshold Manager implementation for managing activation score thresholds
 * and adaptive threshold adjustment based on usage analytics
 */
export class ThresholdManager implements IThresholdManager {
  private thresholds: Map<ContextType, number>;
  private readonly minThreshold = 0.1;
  private readonly maxThreshold = 0.95;
  private readonly adaptationRate = 0.1; // How much to adjust thresholds per adaptation
  private adaptationHistory: Map<ContextType, AdaptationRecord[]>;
  private performanceMetrics: Map<ContextType, PerformanceTracker>;

  constructor(initialThresholds?: Partial<Record<ContextType, number>>) {
    this.thresholds = new Map();
    this.adaptationHistory = new Map();
    this.performanceMetrics = new Map();
    
    // Initialize with default thresholds
    Object.entries(DEFAULT_THRESHOLDS).forEach(([contextType, threshold]) => {
      this.thresholds.set(contextType as ContextType, threshold);
      this.adaptationHistory.set(contextType as ContextType, []);
      this.performanceMetrics.set(contextType as ContextType, {
        totalRetrievals: 0,
        successfulRetrievals: 0,
        falsePositives: 0,
        falseNegatives: 0,
        averageActivationScore: 0,
        lastUpdated: new Date()
      });
    });

    // Override with any provided initial thresholds
    if (initialThresholds) {
      Object.entries(initialThresholds).forEach(([contextType, threshold]) => {
        if (threshold !== undefined) {
          this.thresholds.set(contextType as ContextType, threshold);
        }
      });
    }
  }

  /**
   * Get threshold for specific context type
   */
  getThreshold(contextType: ContextType): number {
    const threshold = this.thresholds.get(contextType);
    if (threshold === undefined) {
      throw new Error(`No threshold configured for context type: ${contextType}`);
    }
    return threshold;
  }

  /**
   * Update threshold for context type
   */
  updateThreshold(contextType: ContextType, newThreshold: number): void {
    if (newThreshold < this.minThreshold || newThreshold > this.maxThreshold) {
      throw new Error(`Threshold must be between ${this.minThreshold} and ${this.maxThreshold}`);
    }
    this.thresholds.set(contextType, newThreshold);
  }

  /**
   * Adapt thresholds based on usage analytics
   */
  adaptThresholds(usageAnalytics: UsageAnalytics): void {
    const recommendations = this.getTuningRecommendations(usageAnalytics);
    
    recommendations.forEach(recommendation => {
      const currentThreshold = this.getThreshold(recommendation.contextType);
      const targetThreshold = recommendation.recommendedThreshold;
      
      // Apply gradual adjustment towards recommended threshold
      const adjustment = (targetThreshold - currentThreshold) * this.adaptationRate;
      const newThreshold = Math.max(
        this.minThreshold,
        Math.min(this.maxThreshold, currentThreshold + adjustment)
      );
      
      // Record the adaptation
      this.recordAdaptation(
        recommendation.contextType,
        currentThreshold,
        newThreshold,
        recommendation.reason,
        usageAnalytics
      );
      
      this.updateThreshold(recommendation.contextType, newThreshold);
      
      // Update performance metrics
      this.updatePerformanceMetrics(recommendation.contextType, usageAnalytics);
    });
  }

  /**
   * Get threshold tuning recommendations based on usage analytics
   */
  getTuningRecommendations(usageAnalytics: UsageAnalytics): {
    contextType: ContextType;
    currentThreshold: number;
    recommendedThreshold: number;
    reason: string;
  }[] {
    const recommendations: {
      contextType: ContextType;
      currentThreshold: number;
      recommendedThreshold: number;
      reason: string;
    }[] = [];

    // Analyze each context type
    const contextTypes: ContextType[] = ['conversation', 'document', 'task', 'query', 'mixed'];
    
    contextTypes.forEach(contextType => {
      const currentThreshold = this.getThreshold(contextType);
      let recommendedThreshold = currentThreshold;
      let reason = '';

      // High false positive rate suggests threshold is too low
      if (usageAnalytics.falsePositiveRate > 0.2) {
        recommendedThreshold = Math.min(this.maxThreshold, currentThreshold + 0.1);
        reason = 'High false positive rate detected - increasing threshold to reduce irrelevant memory activations';
      }
      // High false negative rate suggests threshold is too high
      else if (usageAnalytics.falseNegativeRate > 0.2) {
        recommendedThreshold = Math.max(this.minThreshold, currentThreshold - 0.1);
        reason = 'High false negative rate detected - decreasing threshold to capture more relevant memories';
      }
      // Low retrieval success rate suggests threshold needs adjustment
      else if (usageAnalytics.retrievalSuccessRate < 0.6) {
        // If average activation score is much lower than threshold, lower the threshold
        if (usageAnalytics.averageActivationScore < currentThreshold - 0.2) {
          recommendedThreshold = Math.max(this.minThreshold, usageAnalytics.averageActivationScore + 0.1);
          reason = 'Low retrieval success rate with low average activation scores - decreasing threshold';
        }
        // If average activation score is close to threshold, slightly increase threshold for better precision
        else {
          recommendedThreshold = Math.min(this.maxThreshold, currentThreshold + 0.05);
          reason = 'Low retrieval success rate - slightly increasing threshold for better precision';
        }
      }
      // Good performance - minor optimization based on average activation score
      else if (Math.abs(usageAnalytics.averageActivationScore - currentThreshold) > 0.15) {
        recommendedThreshold = (usageAnalytics.averageActivationScore + currentThreshold) / 2;
        reason = 'Optimizing threshold based on average activation score patterns';
      }

      // Only add recommendation if there's a meaningful change
      if (Math.abs(recommendedThreshold - currentThreshold) > 0.01) {
        recommendations.push({
          contextType,
          currentThreshold,
          recommendedThreshold,
          reason
        });
      }
    });

    return recommendations;
  }

  /**
   * Reset thresholds to default values
   */
  resetToDefaults(): void {
    Object.entries(DEFAULT_THRESHOLDS).forEach(([contextType, threshold]) => {
      this.thresholds.set(contextType as ContextType, threshold);
    });
  }

  /**
   * Get all current thresholds (for debugging/monitoring)
   */
  getAllThresholds(): Record<ContextType, number> {
    const result: Partial<Record<ContextType, number>> = {};
    this.thresholds.forEach((threshold, contextType) => {
      result[contextType] = threshold;
    });
    return result as Record<ContextType, number>;
  }

  /**
   * Check if a given activation score exceeds the threshold for a context type
   * This implements the threshold-based memory awareness without auto-loading
   */
  shouldActivateMemory(activationScore: number, contextType: ContextType): boolean {
    return activationScore >= this.getThreshold(contextType);
  }

  /**
   * Record threshold adaptation for tracking and analysis
   */
  private recordAdaptation(
    contextType: ContextType,
    oldThreshold: number,
    newThreshold: number,
    reason: string,
    usageAnalytics: UsageAnalytics
  ): void {
    const history = this.adaptationHistory.get(contextType) || [];
    history.push({
      timestamp: new Date(),
      oldThreshold,
      newThreshold,
      reason,
      usageAnalytics: { ...usageAnalytics } // Deep copy to preserve state
    });
    
    // Keep only last 50 adaptation records per context type
    if (history.length > 50) {
      history.shift();
    }
    
    this.adaptationHistory.set(contextType, history);
  }

  /**
   * Update performance metrics for a context type
   */
  private updatePerformanceMetrics(contextType: ContextType, usageAnalytics: UsageAnalytics): void {
    const metrics = this.performanceMetrics.get(contextType);
    if (!metrics) return;

    // Update metrics based on usage analytics
    metrics.totalRetrievals += 1;
    metrics.successfulRetrievals += usageAnalytics.retrievalSuccessRate;
    metrics.falsePositives += usageAnalytics.falsePositiveRate;
    metrics.falseNegatives += usageAnalytics.falseNegativeRate;
    
    // Update running average of activation scores
    const alpha = 0.1; // Exponential moving average factor
    metrics.averageActivationScore = 
      alpha * usageAnalytics.averageActivationScore + 
      (1 - alpha) * metrics.averageActivationScore;
    
    metrics.lastUpdated = new Date();
    this.performanceMetrics.set(contextType, metrics);
  }

  /**
   * Get adaptation history for a context type
   */
  getAdaptationHistory(contextType: ContextType): AdaptationRecord[] {
    return this.adaptationHistory.get(contextType) || [];
  }

  /**
   * Get performance metrics for a context type
   */
  getPerformanceMetrics(contextType: ContextType): PerformanceTracker | undefined {
    return this.performanceMetrics.get(contextType);
  }

  /**
   * Generate comprehensive tuning report with historical analysis
   */
  generateTuningReport(): {
    contextType: ContextType;
    currentThreshold: number;
    performanceScore: number;
    adaptationCount: number;
    lastAdaptation: Date | null;
    recommendations: string[];
  }[] {
    const report: {
      contextType: ContextType;
      currentThreshold: number;
      performanceScore: number;
      adaptationCount: number;
      lastAdaptation: Date | null;
      recommendations: string[];
    }[] = [];

    const contextTypes: ContextType[] = ['conversation', 'document', 'task', 'query', 'mixed'];
    
    contextTypes.forEach(contextType => {
      const currentThreshold = this.getThreshold(contextType);
      const history = this.getAdaptationHistory(contextType);
      const metrics = this.getPerformanceMetrics(contextType);
      
      // Calculate performance score (0-1, higher is better)
      let performanceScore = 0.5; // Default neutral score
      if (metrics && metrics.totalRetrievals > 0) {
        const successRate = metrics.successfulRetrievals / metrics.totalRetrievals;
        const errorRate = (metrics.falsePositives + metrics.falseNegatives) / (2 * metrics.totalRetrievals);
        performanceScore = Math.max(0, Math.min(1, successRate - errorRate));
      }

      const recommendations: string[] = [];
      
      // Analyze adaptation frequency
      if (history.length > 10) {
        recommendations.push('High adaptation frequency detected - consider reviewing context classification');
      }
      
      // Analyze performance trends
      if (performanceScore < 0.6) {
        recommendations.push('Below-average performance - threshold may need manual review');
      }
      
      // Check for recent adaptations
      const lastAdaptation = history.length > 0 ? history[history.length - 1].timestamp : null;
      const daysSinceLastAdaptation = lastAdaptation ? 
        (Date.now() - lastAdaptation.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
      
      if (daysSinceLastAdaptation > 30 && performanceScore < 0.7) {
        recommendations.push('No recent adaptations despite suboptimal performance - may need forced recalibration');
      }

      report.push({
        contextType,
        currentThreshold,
        performanceScore,
        adaptationCount: history.length,
        lastAdaptation,
        recommendations
      });
    });

    return report;
  }

  /**
   * Validate consistency across similar context types
   * Ensures that similar contexts have similar thresholds to maintain consistent behavior
   */
  validateConsistency(): {
    isConsistent: boolean;
    inconsistencies: {
      contextTypes: ContextType[];
      thresholdDifference: number;
      recommendation: string;
    }[];
  } {
    const inconsistencies: {
      contextTypes: ContextType[];
      thresholdDifference: number;
      recommendation: string;
    }[] = [];

    // Define context type similarity groups
    const similarityGroups: ContextType[][] = [
      ['conversation', 'query'], // Interactive contexts
      ['document', 'task'], // Content-focused contexts
    ];

    const maxAllowedDifference = 0.15; // Maximum threshold difference within similar groups

    similarityGroups.forEach(group => {
      if (group.length < 2) return;

      const thresholds = group.map(contextType => ({
        contextType,
        threshold: this.getThreshold(contextType)
      }));

      // Check all pairs within the group
      for (let i = 0; i < thresholds.length; i++) {
        for (let j = i + 1; j < thresholds.length; j++) {
          const diff = Math.abs(thresholds[i].threshold - thresholds[j].threshold);
          
          if (diff > maxAllowedDifference) {
            inconsistencies.push({
              contextTypes: [thresholds[i].contextType, thresholds[j].contextType],
              thresholdDifference: diff,
              recommendation: `Consider aligning thresholds for similar context types (difference: ${diff.toFixed(3)})`
            });
          }
        }
      }
    });

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies
    };
  }

  /**
   * Enforce consistency by adjusting thresholds within similarity groups
   * This maintains consistent behavior across similar contexts after threshold adjustments
   */
  enforceConsistency(): void {
    const consistencyCheck = this.validateConsistency();
    
    if (consistencyCheck.isConsistent) {
      return; // Already consistent
    }

    // Define context type similarity groups with their weights
    const similarityGroups: { contexts: ContextType[]; weight: number }[] = [
      { contexts: ['conversation', 'query'], weight: 1.0 }, // Interactive contexts
      { contexts: ['document', 'task'], weight: 1.0 }, // Content-focused contexts
    ];

    similarityGroups.forEach(group => {
      if (group.contexts.length < 2) return;

      // Calculate weighted average threshold for the group
      const thresholds = group.contexts.map(contextType => this.getThreshold(contextType));
      const averageThreshold = thresholds.reduce((sum, threshold) => sum + threshold, 0) / thresholds.length;

      // Adjust each threshold towards the group average
      const adjustmentFactor = 0.5; // How much to move towards average (0.5 = halfway)
      
      group.contexts.forEach(contextType => {
        const currentThreshold = this.getThreshold(contextType);
        const adjustment = (averageThreshold - currentThreshold) * adjustmentFactor;
        const newThreshold = Math.max(
          this.minThreshold,
          Math.min(this.maxThreshold, currentThreshold + adjustment)
        );

        if (Math.abs(newThreshold - currentThreshold) > 0.001) {
          this.updateThreshold(contextType, newThreshold);
          
          // Record this consistency adjustment
          this.recordAdaptation(
            contextType,
            currentThreshold,
            newThreshold,
            `Consistency enforcement - aligned with similar context types (group average: ${averageThreshold.toFixed(3)})`,
            {
              retrievalSuccessRate: 0,
              falsePositiveRate: 0,
              falseNegativeRate: 0,
              averageActivationScore: averageThreshold,
              memoryAccessPatterns: new Map()
            }
          );
        }
      });
    });
  }

  /**
   * Get consistency score (0-1, higher is better)
   * Measures how consistent thresholds are across similar context types
   */
  getConsistencyScore(): number {
    const consistencyCheck = this.validateConsistency();
    
    if (consistencyCheck.isConsistent) {
      return 1.0;
    }

    // Calculate score based on inconsistencies
    const totalInconsistencies = consistencyCheck.inconsistencies.length;
    const averageInconsistency = consistencyCheck.inconsistencies.reduce(
      (sum, inc) => sum + inc.thresholdDifference, 0
    ) / totalInconsistencies;

    // Score decreases with number and magnitude of inconsistencies
    const consistencyScore = Math.max(0, 1 - (totalInconsistencies * 0.2 + averageInconsistency * 2));
    return Math.min(1, consistencyScore);
  }

  /**
   * Monitor and maintain consistency over time
   * Should be called periodically to ensure consistent behavior is maintained
   */
  maintainConsistency(): {
    consistencyScore: number;
    actionsPerformed: string[];
    recommendations: string[];
  } {
    const initialScore = this.getConsistencyScore();
    const actionsPerformed: string[] = [];
    const recommendations: string[] = [];

    // Enforce consistency if score is below threshold
    if (initialScore < 0.8) {
      this.enforceConsistency();
      actionsPerformed.push('Applied consistency enforcement to align similar context types');
    }

    const finalScore = this.getConsistencyScore();
    
    // Generate recommendations based on consistency analysis
    if (finalScore < 0.9) {
      recommendations.push('Consider manual review of threshold settings for optimal consistency');
    }

    const consistencyCheck = this.validateConsistency();
    if (consistencyCheck.inconsistencies.length > 0) {
      recommendations.push('Some inconsistencies remain - may require domain-specific threshold tuning');
    }

    return {
      consistencyScore: finalScore,
      actionsPerformed,
      recommendations
    };
  }
}
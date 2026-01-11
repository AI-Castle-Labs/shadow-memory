import { ContextType, UsageAnalytics } from '../types/core';

/**
 * Interface for managing activation score thresholds
 */
export interface IThresholdManager {
  /**
   * Get threshold for specific context type
   */
  getThreshold(contextType: ContextType): number;

  /**
   * Update threshold for context type
   */
  updateThreshold(contextType: ContextType, newThreshold: number): void;

  /**
   * Adapt thresholds based on usage analytics
   */
  adaptThresholds(usageAnalytics: UsageAnalytics): void;

  /**
   * Get threshold tuning recommendations
   */
  getTuningRecommendations(usageAnalytics: UsageAnalytics): {
    contextType: ContextType;
    currentThreshold: number;
    recommendedThreshold: number;
    reason: string;
  }[];

  /**
   * Reset thresholds to default values
   */
  resetToDefaults(): void;
}
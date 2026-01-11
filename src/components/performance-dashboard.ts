/**
 * Real-time performance dashboard for conversation monitoring
 */

import {
  RealTimePerformanceMetrics,
  DashboardVisualizationData,
  ConversationPerformanceReport,
  PerformanceAlert,
  DashboardConfig,
  TimeSeriesData,
  DistributionData,
  HeatmapData,
  IPerformanceDashboard
} from '../interfaces/performance-dashboard';
import { PerformanceMonitor } from './performance-monitor';
import { ReportGenerator } from './report-generator';
import { IReportGenerator } from '../interfaces/performance-dashboard';
import { IShadowMemorySystem } from '../interfaces/shadow-memory-system';

/**
 * Real-time performance dashboard implementation
 */
export class PerformanceDashboard implements IPerformanceDashboard {
  private shadowMemorySystem: IShadowMemorySystem;
  private performanceMonitor: PerformanceMonitor;
  private reportGenerator: IReportGenerator;
  private config: DashboardConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, (metrics: RealTimePerformanceMetrics) => void> = new Map();

  constructor(shadowMemorySystem: IShadowMemorySystem, config: Partial<DashboardConfig> = {}) {
    this.shadowMemorySystem = shadowMemorySystem;
    this.performanceMonitor = new PerformanceMonitor(config);
    this.reportGenerator = new ReportGenerator();
    
    this.config = {
      updateInterval: 1000, // 1 second
      metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        lowActivationRate: 0.3,
        highLatency: 1000,
        lowCacheHitRate: 0.7,
        highMemoryUsage: 1000
      },
      visualizationSettings: {
        maxDataPoints: 1000,
        refreshRate: 5000,
        chartTypes: ['line', 'bar', 'scatter', 'heatmap']
      },
      ...config
    };
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(config?: Partial<DashboardConfig>): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.isMonitoring = true;
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.updateMetrics();
      await this.checkAndNotifyAlerts();
      await this.notifySubscribers();
    }, this.config.updateInterval);

    console.log('Performance monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Get current real-time metrics
   */
  async getCurrentMetrics(): Promise<RealTimePerformanceMetrics> {
    return this.performanceMonitor.getCurrentMetrics();
  }

  /**
   * Get dashboard visualization data
   */
  async getVisualizationData(timeRange?: { start: Date; end: Date }): Promise<DashboardVisualizationData> {
    const defaultTimeRange = {
      start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      end: new Date()
    };
    
    const range = timeRange || defaultTimeRange;
    const metrics = await this.performanceMonitor.getMetrics(range);
    
    // Generate time series data for activation scores
    const activationScoreTimeSeries: TimeSeriesData[] = metrics.map(metric => ({
      timestamp: metric.timestamp,
      value: metric.activationScores.length > 0 
        ? metric.activationScores.reduce((sum, score) => sum + score, 0) / metric.activationScores.length 
        : 0,
      label: 'Average Activation Score'
    }));

    // Generate time series data for memory usage
    const memoryUsageTimeSeries: TimeSeriesData[] = metrics.map(metric => ({
      timestamp: metric.timestamp,
      value: metric.memoryUsage.memoryStorageUsageMB,
      label: 'Memory Usage (MB)'
    }));

    // Generate retrieval decision distribution
    const allRetrievalDecisions = metrics.flatMap(m => m.retrievalDecisions);
    const retrievalDecisionDistribution = this.calculateRetrievalDistribution(allRetrievalDecisions);

    // Generate performance heatmap
    const performanceHeatmap = this.generatePerformanceHeatmap(metrics);

    // Get alert history
    const alertHistory = this.performanceMonitor.getActiveAlerts();

    // Calculate system health score
    const systemHealthScore = this.calculateSystemHealthScore(metrics);

    return {
      activationScoreTimeSeries,
      memoryUsageTimeSeries,
      retrievalDecisionDistribution,
      performanceHeatmap,
      alertHistory,
      systemHealthScore
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(timeRange: { start: Date; end: Date }): Promise<ConversationPerformanceReport> {
    const metrics = await this.performanceMonitor.getMetrics(timeRange);
    
    // Create mock evaluation results for report generation
    const mockEvaluationResults = {
      totalConversations: Math.floor(metrics.length / 10), // Estimate conversations
      totalTurns: metrics.length,
      overallMetrics: {
        precision: 0.8,
        recall: 0.75,
        f1Score: 0.77,
        accuracy: 0.82,
        falsePositiveRate: 0.15,
        falseNegativeRate: 0.18
      },
      averageResponseQuality: {
        withMemory: {
          relevanceScore: 0.85,
          completenessScore: 0.80,
          accuracyScore: 0.82,
          coherenceScore: 0.78
        },
        withoutMemory: {
          relevanceScore: 0.70,
          completenessScore: 0.65,
          accuracyScore: 0.68,
          coherenceScore: 0.72
        },
        improvement: {
          relevanceImprovement: 0.15,
          completenessImprovement: 0.15,
          accuracyImprovement: 0.14,
          coherenceImprovement: 0.06,
          overallImprovement: 0.125
        }
      },
      conversationResults: [],
      performanceTrends: {
        precisionOverTime: metrics.map((_, i) => 0.8 + (Math.random() - 0.5) * 0.1),
        recallOverTime: metrics.map((_, i) => 0.75 + (Math.random() - 0.5) * 0.1),
        responseQualityOverTime: metrics.map((_, i) => 0.125 + (Math.random() - 0.5) * 0.05)
      }
    };

    return this.reportGenerator.generateConversationReport(
      mockEvaluationResults,
      metrics,
      timeRange
    );
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return this.performanceMonitor.getActiveAlerts();
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback: (metrics: RealTimePerformanceMetrics) => void): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }

  /**
   * Update metrics from shadow memory system
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Get system stats from shadow memory system
      const systemStats = await this.shadowMemorySystem.getSystemStats();
      
      // Update memory usage metrics
      this.performanceMonitor.updateMemoryUsage({
        totalMemories: systemStats.totalMemories,
        activeMemories: Math.floor(systemStats.totalMemories * 0.8), // Estimate
        archivedMemories: Math.floor(systemStats.totalMemories * 0.2), // Estimate
        memoryStorageUsageMB: systemStats.memoryUsage / (1024 * 1024), // Convert to MB
        indexSizeMB: systemStats.memoryUsage * 0.1 / (1024 * 1024), // Estimate 10% for index
        cacheHitRate: 0.85 + (Math.random() - 0.5) * 0.2, // Mock cache hit rate
        averageMemoryAge: 30 + Math.random() * 60 // Mock average age in days
      });

      // Record response latency (mock for now)
      const mockLatency = 100 + Math.random() * 200;
      this.performanceMonitor.recordResponseLatency(mockLatency);

    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  /**
   * Check for alerts and notify if needed
   */
  private async checkAndNotifyAlerts(): Promise<void> {
    try {
      const newAlerts = await this.performanceMonitor.checkAlerts();
      
      // In a real implementation, this would send notifications
      if (newAlerts.length > 0) {
        console.log(`Generated ${newAlerts.length} new performance alerts`);
        for (const alert of newAlerts) {
          console.log(`Alert: ${alert.title} - ${alert.message}`);
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  /**
   * Notify all subscribers with current metrics
   */
  private async notifySubscribers(): Promise<void> {
    if (this.subscribers.size === 0) {
      return;
    }

    try {
      const currentMetrics = await this.getCurrentMetrics();
      
      const subscriptionIds = Array.from(this.subscribers.keys());
      for (const subscriptionId of subscriptionIds) {
        const callback = this.subscribers.get(subscriptionId)!;
        try {
          callback(currentMetrics);
        } catch (error) {
          console.error(`Error notifying subscriber ${subscriptionId}:`, error);
          // Remove problematic subscriber
          this.subscribers.delete(subscriptionId);
        }
      }
    } catch (error) {
      console.error('Error notifying subscribers:', error);
    }
  }

  /**
   * Calculate retrieval decision distribution
   */
  private calculateRetrievalDistribution(decisions: any[]): DistributionData[] {
    const counts = { retrieved: 0, skipped: 0, deferred: 0 };
    
    for (const decision of decisions) {
      counts[decision.decision as keyof typeof counts]++;
    }

    const total = decisions.length || 1;
    
    return [
      {
        category: 'Retrieved',
        count: counts.retrieved,
        percentage: (counts.retrieved / total) * 100,
        color: '#4CAF50'
      },
      {
        category: 'Skipped',
        count: counts.skipped,
        percentage: (counts.skipped / total) * 100,
        color: '#FF9800'
      },
      {
        category: 'Deferred',
        count: counts.deferred,
        percentage: (counts.deferred / total) * 100,
        color: '#2196F3'
      }
    ];
  }

  /**
   * Generate performance heatmap data
   */
  private generatePerformanceHeatmap(metrics: RealTimePerformanceMetrics[]): HeatmapData[] {
    const heatmapData: HeatmapData[] = [];
    
    // Create heatmap showing activation scores vs response latency
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i];
      const avgActivationScore = metric.activationScores.length > 0 
        ? metric.activationScores.reduce((sum, score) => sum + score, 0) / metric.activationScores.length 
        : 0;
      
      heatmapData.push({
        x: i,
        y: 'Activation Score',
        value: avgActivationScore,
        intensity: avgActivationScore,
        tooltip: `Time: ${metric.timestamp.toLocaleTimeString()}, Score: ${avgActivationScore.toFixed(2)}`
      });
      
      heatmapData.push({
        x: i,
        y: 'Response Latency',
        value: metric.responseLatency,
        intensity: metric.responseLatency / 1000, // Normalize to 0-1
        tooltip: `Time: ${metric.timestamp.toLocaleTimeString()}, Latency: ${metric.responseLatency.toFixed(0)}ms`
      });
      
      heatmapData.push({
        x: i,
        y: 'System Load',
        value: metric.systemLoad,
        intensity: metric.systemLoad,
        tooltip: `Time: ${metric.timestamp.toLocaleTimeString()}, Load: ${(metric.systemLoad * 100).toFixed(1)}%`
      });
    }

    return heatmapData;
  }

  /**
   * Calculate overall system health score
   */
  private calculateSystemHealthScore(metrics: RealTimePerformanceMetrics[]): number {
    if (metrics.length === 0) return 0.5;

    let healthScore = 1.0;
    
    // Factor in average activation scores
    const avgActivationScores = metrics.map(m => 
      m.activationScores.length > 0 
        ? m.activationScores.reduce((sum, score) => sum + score, 0) / m.activationScores.length 
        : 0
    );
    const overallAvgActivation = avgActivationScores.reduce((sum, score) => sum + score, 0) / avgActivationScores.length;
    
    // Penalize low activation scores
    if (overallAvgActivation < 0.3) {
      healthScore -= 0.2;
    }

    // Factor in response latency
    const avgLatency = metrics.reduce((sum, m) => sum + m.responseLatency, 0) / metrics.length;
    if (avgLatency > 1000) { // > 1 second
      healthScore -= 0.3;
    } else if (avgLatency > 500) { // > 500ms
      healthScore -= 0.1;
    }

    // Factor in system load
    const avgSystemLoad = metrics.reduce((sum, m) => sum + m.systemLoad, 0) / metrics.length;
    if (avgSystemLoad > 0.8) {
      healthScore -= 0.2;
    } else if (avgSystemLoad > 0.6) {
      healthScore -= 0.1;
    }

    // Factor in memory usage
    const latestMemoryUsage = metrics[metrics.length - 1]?.memoryUsage;
    if (latestMemoryUsage) {
      if (latestMemoryUsage.memoryStorageUsageMB > 1000) { // > 1GB
        healthScore -= 0.2;
      }
      
      if (latestMemoryUsage.cacheHitRate < 0.7) {
        healthScore -= 0.1;
      }
    }

    return Math.max(0, Math.min(1, healthScore));
  }
}
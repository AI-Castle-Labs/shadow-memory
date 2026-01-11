/**
 * Monitors performance metrics for the shadow memory system
 */

import {
  RealTimePerformanceMetrics,
  RetrievalDecision,
  MemoryUsageMetrics,
  PerformanceAlert,
  DashboardConfig,
  IPerformanceMonitor
} from '../interfaces/performance-dashboard';
import { MemoryId } from '../types/core';

/**
 * Monitors and tracks performance metrics in real-time
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private activationEvents: Array<{ memoryId: MemoryId; score: number; threshold: number; timestamp: Date }> = [];
  private retrievalDecisions: RetrievalDecision[] = [];
  private latencyMeasurements: Array<{ latency: number; timestamp: Date }> = [];
  private memoryUsageHistory: Array<{ metrics: MemoryUsageMetrics; timestamp: Date }> = [];
  private alerts: PerformanceAlert[] = [];
  private config: DashboardConfig;

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      updateInterval: 1000, // 1 second
      metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        lowActivationRate: 0.3,
        highLatency: 1000, // 1 second
        lowCacheHitRate: 0.7,
        highMemoryUsage: 1000 // 1GB
      },
      visualizationSettings: {
        maxDataPoints: 1000,
        refreshRate: 5000, // 5 seconds
        chartTypes: ['line', 'bar', 'scatter']
      },
      ...config
    };
  }

  /**
   * Record memory activation event
   */
  recordActivation(memoryId: MemoryId, activationScore: number, threshold: number): void {
    const event = {
      memoryId,
      score: activationScore,
      threshold,
      timestamp: new Date()
    };

    this.activationEvents.push(event);
    this.cleanupOldData();
  }

  /**
   * Record memory retrieval decision
   */
  recordRetrievalDecision(decision: RetrievalDecision): void {
    this.retrievalDecisions.push(decision);
    this.cleanupOldData();
  }

  /**
   * Record response latency
   */
  recordResponseLatency(latency: number): void {
    this.latencyMeasurements.push({
      latency,
      timestamp: new Date()
    });
    this.cleanupOldData();
  }

  /**
   * Update memory usage metrics
   */
  updateMemoryUsage(metrics: MemoryUsageMetrics): void {
    this.memoryUsageHistory.push({
      metrics,
      timestamp: new Date()
    });
    this.cleanupOldData();
  }

  /**
   * Check for performance alerts
   */
  async checkAlerts(): Promise<PerformanceAlert[]> {
    const newAlerts: PerformanceAlert[] = [];
    const now = new Date();

    // Check activation rate
    const recentActivations = this.getRecentActivations(5 * 60 * 1000); // Last 5 minutes
    if (recentActivations.length > 0) {
      const activationRate = recentActivations.filter(a => a.score > a.threshold).length / recentActivations.length;
      if (activationRate < this.config.alertThresholds.lowActivationRate) {
        newAlerts.push({
          id: `low-activation-${now.getTime()}`,
          type: 'warning',
          title: 'Low Memory Activation Rate',
          message: `Memory activation rate is ${(activationRate * 100).toFixed(1)}%, below threshold of ${(this.config.alertThresholds.lowActivationRate * 100).toFixed(1)}%`,
          timestamp: now,
          severity: 'medium',
          metrics: { activationRate, threshold: this.config.alertThresholds.lowActivationRate },
          recommendations: [
            'Review activation thresholds',
            'Check memory relevance quality',
            'Verify context processing accuracy'
          ]
        });
      }
    }

    // Check latency
    const recentLatencies = this.getRecentLatencies(5 * 60 * 1000); // Last 5 minutes
    if (recentLatencies.length > 0) {
      const avgLatency = recentLatencies.reduce((sum, l) => sum + l.latency, 0) / recentLatencies.length;
      if (avgLatency > this.config.alertThresholds.highLatency) {
        newAlerts.push({
          id: `high-latency-${now.getTime()}`,
          type: 'error',
          title: 'High Response Latency',
          message: `Average response latency is ${avgLatency.toFixed(0)}ms, above threshold of ${this.config.alertThresholds.highLatency}ms`,
          timestamp: now,
          severity: 'high',
          metrics: { avgLatency, threshold: this.config.alertThresholds.highLatency },
          recommendations: [
            'Optimize similarity computation',
            'Review memory indexing performance',
            'Consider caching strategies'
          ]
        });
      }
    }

    // Check memory usage
    const latestMemoryUsage = this.getLatestMemoryUsage();
    if (latestMemoryUsage && latestMemoryUsage.memoryStorageUsageMB > this.config.alertThresholds.highMemoryUsage) {
      newAlerts.push({
        id: `high-memory-${now.getTime()}`,
        type: 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is ${latestMemoryUsage.memoryStorageUsageMB.toFixed(0)}MB, above threshold of ${this.config.alertThresholds.highMemoryUsage}MB`,
        timestamp: now,
        severity: 'medium',
        metrics: { 
          memoryUsage: latestMemoryUsage.memoryStorageUsageMB, 
          threshold: this.config.alertThresholds.highMemoryUsage 
        },
        recommendations: [
          'Run memory cleanup',
          'Archive old memories',
          'Review memory retention policies'
        ]
      });
    }

    // Check cache hit rate
    if (latestMemoryUsage && latestMemoryUsage.cacheHitRate < this.config.alertThresholds.lowCacheHitRate) {
      newAlerts.push({
        id: `low-cache-${now.getTime()}`,
        type: 'warning',
        title: 'Low Cache Hit Rate',
        message: `Cache hit rate is ${(latestMemoryUsage.cacheHitRate * 100).toFixed(1)}%, below threshold of ${(this.config.alertThresholds.lowCacheHitRate * 100).toFixed(1)}%`,
        timestamp: now,
        severity: 'low',
        metrics: { 
          cacheHitRate: latestMemoryUsage.cacheHitRate, 
          threshold: this.config.alertThresholds.lowCacheHitRate 
        },
        recommendations: [
          'Increase cache size',
          'Review cache eviction policy',
          'Optimize memory access patterns'
        ]
      });
    }

    // Add new alerts and clean up old ones
    this.alerts.push(...newAlerts);
    this.cleanupOldAlerts();

    return newAlerts;
  }

  /**
   * Get performance metrics for time range
   */
  async getMetrics(timeRange: { start: Date; end: Date }): Promise<RealTimePerformanceMetrics[]> {
    const metrics: RealTimePerformanceMetrics[] = [];
    const interval = Math.max(1000, (timeRange.end.getTime() - timeRange.start.getTime()) / 100); // Max 100 data points

    for (let timestamp = timeRange.start.getTime(); timestamp <= timeRange.end.getTime(); timestamp += interval) {
      const currentTime = new Date(timestamp);
      const windowStart = new Date(timestamp - interval);
      
      const windowActivations = this.activationEvents.filter(
        a => a.timestamp >= windowStart && a.timestamp <= currentTime
      );
      
      const windowRetrievals = this.retrievalDecisions.filter(
        r => r.timestamp >= windowStart && r.timestamp <= currentTime
      );
      
      const windowLatencies = this.latencyMeasurements.filter(
        l => l.timestamp >= windowStart && l.timestamp <= currentTime
      );

      const memoryUsage = this.getMemoryUsageAtTime(currentTime);
      
      metrics.push({
        timestamp: currentTime,
        activationScores: windowActivations.map(a => a.score),
        retrievalDecisions: windowRetrievals,
        memoryUsage: memoryUsage || this.getDefaultMemoryUsage(),
        responseLatency: windowLatencies.length > 0 
          ? windowLatencies.reduce((sum, l) => sum + l.latency, 0) / windowLatencies.length 
          : 0,
        systemLoad: this.calculateSystemLoad(windowActivations.length, windowLatencies.length)
      });
    }

    return metrics;
  }

  /**
   * Get current real-time metrics
   */
  getCurrentMetrics(): RealTimePerformanceMetrics {
    const now = new Date();
    const recentWindow = 60 * 1000; // Last minute
    const windowStart = new Date(now.getTime() - recentWindow);

    const recentActivations = this.activationEvents.filter(
      a => a.timestamp >= windowStart
    );
    
    const recentRetrievals = this.retrievalDecisions.filter(
      r => r.timestamp >= windowStart
    );
    
    const recentLatencies = this.latencyMeasurements.filter(
      l => l.timestamp >= windowStart
    );

    const latestMemoryUsage = this.getLatestMemoryUsage();

    return {
      timestamp: now,
      activationScores: recentActivations.map(a => a.score),
      retrievalDecisions: recentRetrievals,
      memoryUsage: latestMemoryUsage || this.getDefaultMemoryUsage(),
      responseLatency: recentLatencies.length > 0 
        ? recentLatencies.reduce((sum, l) => sum + l.latency, 0) / recentLatencies.length 
        : 0,
      systemLoad: this.calculateSystemLoad(recentActivations.length, recentLatencies.length)
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // Last hour
    return this.alerts.filter(alert => alert.timestamp >= cutoff);
  }

  /**
   * Clean up old data based on retention period
   */
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.config.metricsRetentionPeriod);

    this.activationEvents = this.activationEvents.filter(event => event.timestamp >= cutoff);
    this.retrievalDecisions = this.retrievalDecisions.filter(decision => decision.timestamp >= cutoff);
    this.latencyMeasurements = this.latencyMeasurements.filter(measurement => measurement.timestamp >= cutoff);
    this.memoryUsageHistory = this.memoryUsageHistory.filter(usage => usage.timestamp >= cutoff);
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // Keep alerts for 24 hours
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoff);
  }

  /**
   * Get recent activation events
   */
  private getRecentActivations(windowMs: number): Array<{ memoryId: MemoryId; score: number; threshold: number; timestamp: Date }> {
    const cutoff = new Date(Date.now() - windowMs);
    return this.activationEvents.filter(event => event.timestamp >= cutoff);
  }

  /**
   * Get recent latency measurements
   */
  private getRecentLatencies(windowMs: number): Array<{ latency: number; timestamp: Date }> {
    const cutoff = new Date(Date.now() - windowMs);
    return this.latencyMeasurements.filter(measurement => measurement.timestamp >= cutoff);
  }

  /**
   * Get latest memory usage metrics
   */
  private getLatestMemoryUsage(): MemoryUsageMetrics | null {
    if (this.memoryUsageHistory.length === 0) return null;
    return this.memoryUsageHistory[this.memoryUsageHistory.length - 1].metrics;
  }

  /**
   * Get memory usage at specific time
   */
  private getMemoryUsageAtTime(timestamp: Date): MemoryUsageMetrics | null {
    // Find the closest memory usage record before or at the timestamp
    let closest: { metrics: MemoryUsageMetrics; timestamp: Date } | null = null;
    
    for (const usage of this.memoryUsageHistory) {
      if (usage.timestamp <= timestamp) {
        if (!closest || usage.timestamp > closest.timestamp) {
          closest = usage;
        }
      }
    }

    return closest ? closest.metrics : null;
  }

  /**
   * Get default memory usage when no data is available
   */
  private getDefaultMemoryUsage(): MemoryUsageMetrics {
    return {
      totalMemories: 0,
      activeMemories: 0,
      archivedMemories: 0,
      memoryStorageUsageMB: 0,
      indexSizeMB: 0,
      cacheHitRate: 0,
      averageMemoryAge: 0
    };
  }

  /**
   * Calculate system load based on activity
   */
  private calculateSystemLoad(activationCount: number, latencyCount: number): number {
    // Simple system load calculation based on activity
    const baseLoad = 0.1; // 10% base load
    const activationLoad = Math.min(0.5, activationCount * 0.01); // Up to 50% from activations
    const latencyLoad = Math.min(0.4, latencyCount * 0.02); // Up to 40% from latency measurements
    
    return Math.min(1.0, baseLoad + activationLoad + latencyLoad);
  }
}
/**
 * Interfaces for conversation performance dashboard and monitoring
 */

import { MemoryId, MemoryAwareness } from '../types/core';
import { 
  ConversationEvaluationResults, 
  MemoryRelevanceMetrics, 
  ResponseQualityMetrics 
} from './memory-evaluation';
import { ConversationSimulationResult } from './conversation-simulation';

/**
 * Real-time performance metrics for dashboard display
 */
export interface RealTimePerformanceMetrics {
  timestamp: Date;
  activationScores: number[];
  retrievalDecisions: RetrievalDecision[];
  memoryUsage: MemoryUsageMetrics;
  responseLatency: number;
  systemLoad: number;
}

/**
 * Memory retrieval decision information
 */
export interface RetrievalDecision {
  memoryId: MemoryId;
  activationScore: number;
  threshold: number;
  decision: 'retrieved' | 'skipped' | 'deferred';
  reason: string;
  timestamp: Date;
}

/**
 * Memory usage metrics for monitoring
 */
export interface MemoryUsageMetrics {
  totalMemories: number;
  activeMemories: number;
  archivedMemories: number;
  memoryStorageUsageMB: number;
  indexSizeMB: number;
  cacheHitRate: number;
  averageMemoryAge: number; // in days
}

/**
 * Performance dashboard configuration
 */
export interface DashboardConfig {
  updateInterval: number; // milliseconds
  metricsRetentionPeriod: number; // milliseconds
  alertThresholds: {
    lowActivationRate: number;
    highLatency: number;
    lowCacheHitRate: number;
    highMemoryUsage: number;
  };
  visualizationSettings: {
    maxDataPoints: number;
    refreshRate: number;
    chartTypes: ('line' | 'bar' | 'scatter' | 'heatmap')[];
  };
}

/**
 * Performance alert information
 */
export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: Record<string, number>;
  recommendations: string[];
}

/**
 * Dashboard visualization data
 */
export interface DashboardVisualizationData {
  activationScoreTimeSeries: TimeSeriesData[];
  memoryUsageTimeSeries: TimeSeriesData[];
  retrievalDecisionDistribution: DistributionData[];
  performanceHeatmap: HeatmapData[];
  alertHistory: PerformanceAlert[];
  systemHealthScore: number;
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Distribution data for charts
 */
export interface DistributionData {
  category: string;
  count: number;
  percentage: number;
  color?: string;
}

/**
 * Heatmap data for visualization
 */
export interface HeatmapData {
  x: number | string;
  y: number | string;
  value: number;
  intensity: number;
  tooltip?: string;
}

/**
 * Conversation performance report
 */
export interface ConversationPerformanceReport {
  reportId: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalConversations: number;
    totalTurns: number;
    averageActivationScore: number;
    memoryRetrievalRate: number;
    systemUptime: number;
  };
  detailedMetrics: {
    memoryRelevanceMetrics: MemoryRelevanceMetrics;
    responseQualityMetrics: ResponseQualityMetrics;
    systemPerformanceMetrics: {
      averageLatency: number;
      peakMemoryUsage: number;
      cacheEfficiency: number;
      errorRate: number;
    };
  };
  trends: {
    performanceOverTime: TimeSeriesData[];
    memoryUsageGrowth: TimeSeriesData[];
    qualityImprovement: TimeSeriesData[];
  };
  insights: {
    keyFindings: string[];
    performanceBottlenecks: string[];
    optimizationOpportunities: string[];
    riskAreas: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

/**
 * Interface for performance dashboard
 */
export interface IPerformanceDashboard {
  /**
   * Start real-time monitoring
   */
  startMonitoring(config?: Partial<DashboardConfig>): Promise<void>;

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): Promise<void>;

  /**
   * Get current real-time metrics
   */
  getCurrentMetrics(): Promise<RealTimePerformanceMetrics>;

  /**
   * Get dashboard visualization data
   */
  getVisualizationData(timeRange?: { start: Date; end: Date }): Promise<DashboardVisualizationData>;

  /**
   * Generate performance report
   */
  generateReport(timeRange: { start: Date; end: Date }): Promise<ConversationPerformanceReport>;

  /**
   * Get active alerts
   */
  getActiveAlerts(): Promise<PerformanceAlert[]>;

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback: (metrics: RealTimePerformanceMetrics) => void): string;

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(subscriptionId: string): void;
}

/**
 * Interface for performance monitor
 */
export interface IPerformanceMonitor {
  /**
   * Record memory activation event
   */
  recordActivation(memoryId: MemoryId, activationScore: number, threshold: number): void;

  /**
   * Record memory retrieval decision
   */
  recordRetrievalDecision(decision: RetrievalDecision): void;

  /**
   * Record response latency
   */
  recordResponseLatency(latency: number): void;

  /**
   * Update memory usage metrics
   */
  updateMemoryUsage(metrics: MemoryUsageMetrics): void;

  /**
   * Check for performance alerts
   */
  checkAlerts(): Promise<PerformanceAlert[]>;

  /**
   * Get performance metrics for time range
   */
  getMetrics(timeRange: { start: Date; end: Date }): Promise<RealTimePerformanceMetrics[]>;
}

/**
 * Interface for report generator
 */
export interface IReportGenerator {
  /**
   * Generate conversation performance report
   */
  generateConversationReport(
    evaluationResults: ConversationEvaluationResults,
    performanceMetrics: RealTimePerformanceMetrics[],
    timeRange: { start: Date; end: Date }
  ): Promise<ConversationPerformanceReport>;

  /**
   * Generate system health report
   */
  generateSystemHealthReport(): Promise<{
    healthScore: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }>;

  /**
   * Export report to different formats
   */
  exportReport(
    report: ConversationPerformanceReport,
    format: 'json' | 'html' | 'pdf' | 'csv'
  ): Promise<string | Buffer>;
}
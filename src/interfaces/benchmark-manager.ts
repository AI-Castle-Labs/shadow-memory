import { 
  BenchmarkType, 
  BenchmarkResults, 
  BenchmarkBaseline, 
  ComparisonReport,
  OperationType,
  PerformanceMetrics
} from '../types/core';

/**
 * Interface for benchmark management and performance measurement
 */
export interface IBenchmarkManager {
  /**
   * Run a specific benchmark suite
   */
  runBenchmarkSuite(benchmarkType: BenchmarkType): Promise<BenchmarkResults>;

  /**
   * Compare results against established baseline
   */
  compareAgainstBaseline(
    results: BenchmarkResults,
    baseline: BenchmarkBaseline
  ): ComparisonReport;

  /**
   * Track performance metrics for operations
   */
  trackPerformanceMetrics(
    operation: OperationType,
    metrics: PerformanceMetrics
  ): void;

  /**
   * Get performance history for analysis
   */
  getPerformanceHistory(
    operation: OperationType,
    timeRange?: { start: Date; end: Date }
  ): PerformanceMetrics[];

  /**
   * Register a new baseline for comparison
   */
  registerBaseline(baseline: BenchmarkBaseline): void;

  /**
   * Get available baselines
   */
  getAvailableBaselines(): BenchmarkBaseline[];
}
import { BenchmarkManager } from '../src/components/benchmark-manager';
import { BenchmarkType, BenchmarkBaseline } from '../src/types';
import fc from 'fast-check';

describe('BenchmarkManager', () => {
  let benchmarkManager: BenchmarkManager;

  beforeEach(() => {
    benchmarkManager = new BenchmarkManager();
  });

  describe('runBenchmarkSuite', () => {
    it('should run retrieval accuracy benchmark', async () => {
      const result = await benchmarkManager.runBenchmarkSuite('retrieval_accuracy');
      
      expect(result.benchmarkType).toBe('retrieval_accuracy');
      expect(result.metrics.precision).toBeGreaterThan(0);
      expect(result.metrics.recall).toBeGreaterThan(0);
      expect(result.metrics.f1Score).toBeGreaterThan(0);
      expect(result.metrics.latency).toBeGreaterThan(0);
      expect(result.metrics.memoryUsage).toBeGreaterThan(0);
      expect(result.metrics.throughput).toBeGreaterThan(0);
      expect(result.testCases).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should run similarity computation benchmark', async () => {
      const result = await benchmarkManager.runBenchmarkSuite('similarity_computation');
      
      expect(result.benchmarkType).toBe('similarity_computation');
      expect(result.metrics.precision).toBeGreaterThan(0);
      expect(result.metrics.recall).toBeGreaterThan(0);
      expect(result.metrics.f1Score).toBeGreaterThan(0);
    });

    it('should run memory efficiency benchmark', async () => {
      const result = await benchmarkManager.runBenchmarkSuite('memory_efficiency');
      
      expect(result.benchmarkType).toBe('memory_efficiency');
      expect(result.metrics.precision).toBeGreaterThan(0);
      expect(result.metrics.recall).toBeGreaterThan(0);
      expect(result.metrics.f1Score).toBeGreaterThan(0);
    });

    it('should run temporal performance benchmark', async () => {
      const result = await benchmarkManager.runBenchmarkSuite('temporal_performance');
      
      expect(result.benchmarkType).toBe('temporal_performance');
      expect(result.metrics.precision).toBeGreaterThan(0);
      expect(result.metrics.recall).toBeGreaterThan(0);
      expect(result.metrics.f1Score).toBeGreaterThan(0);
    });

    it('should throw error for unsupported benchmark type', async () => {
      await expect(
        benchmarkManager.runBenchmarkSuite('invalid_type' as BenchmarkType)
      ).rejects.toThrow('Unsupported benchmark type: invalid_type');
    });
  });

  describe('compareAgainstBaseline', () => {
    it('should compare results against baseline and identify improvements', async () => {
      const results = await benchmarkManager.runBenchmarkSuite('retrieval_accuracy');
      const baselines = benchmarkManager.getAvailableBaselines();
      const trecBaseline = baselines.find(b => b.name === 'TREC');
      
      expect(trecBaseline).toBeDefined();
      
      const comparison = benchmarkManager.compareAgainstBaseline(results, trecBaseline!);
      
      expect(comparison.improvements).toBeInstanceOf(Array);
      expect(comparison.regressions).toBeInstanceOf(Array);
      expect(typeof comparison.overallScore).toBe('number');
      expect(comparison.detailedMetrics).toBeInstanceOf(Map);
      expect(comparison.detailedMetrics.size).toBeGreaterThan(0);
    });
  });

  describe('baseline management', () => {
    it('should have default baselines initialized', () => {
      const baselines = benchmarkManager.getAvailableBaselines();
      
      expect(baselines.length).toBeGreaterThan(0);
      expect(baselines.some(b => b.name === 'TREC')).toBe(true);
      expect(baselines.some(b => b.name === 'MS_MARCO')).toBe(true);
      expect(baselines.some(b => b.name === 'STS')).toBe(true);
    });

    it('should register new baseline', () => {
      const newBaseline: BenchmarkBaseline = {
        name: 'Custom',
        version: '1.0',
        description: 'Custom benchmark baseline',
        results: {
          benchmarkType: 'retrieval_accuracy',
          metrics: {
            precision: 0.9,
            recall: 0.85,
            f1Score: 0.875,
            latency: 100,
            memoryUsage: 40 * 1024 * 1024,
            throughput: 50
          },
          testCases: 100,
          timestamp: new Date()
        }
      };

      benchmarkManager.registerBaseline(newBaseline);
      const baselines = benchmarkManager.getAvailableBaselines();
      
      expect(baselines.some(b => b.name === 'Custom')).toBe(true);
    });
  });

  describe('performance tracking', () => {
    it('should track performance metrics', () => {
      const metrics = {
        latency: 50,
        memoryUsage: 1024 * 1024,
        throughput: 100,
        accuracy: 0.95
      };

      benchmarkManager.trackPerformanceMetrics('store', metrics);
      
      const history = benchmarkManager.getPerformanceHistory('store');
      expect(history.length).toBe(1);
      expect(history[0]).toEqual(metrics);
    });

    it('should limit performance history to 1000 entries', () => {
      const metrics = {
        latency: 50,
        memoryUsage: 1024 * 1024,
        throughput: 100
      };

      // Add 1001 entries
      for (let i = 0; i < 1001; i++) {
        benchmarkManager.trackPerformanceMetrics('retrieve', metrics);
      }

      const history = benchmarkManager.getPerformanceHistory('retrieve');
      expect(history.length).toBe(1000);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 17: Benchmark performance measurement
     * For any benchmark suite execution, the system should measure retrieval accuracy, 
     * similarity computation performance, memory efficiency, and temporal performance 
     * against established baselines.
     * **Feature: shadow-memory, Property 17: Benchmark performance measurement**
     * **Validates: Benchmarking requirements**
     */
    it('should measure all required performance metrics for any benchmark type', async () => {
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(
          'retrieval_accuracy' as BenchmarkType, 
          'similarity_computation' as BenchmarkType, 
          'memory_efficiency' as BenchmarkType, 
          'temporal_performance' as BenchmarkType
        ),
        async (benchmarkType: BenchmarkType) => {
          const results = await benchmarkManager.runBenchmarkSuite(benchmarkType);
          
          // Verify benchmark type matches input
          expect(results.benchmarkType).toBe(benchmarkType);
          
          // Verify all required metrics are present and valid
          expect(results.metrics.precision).toBeGreaterThanOrEqual(0);
          expect(results.metrics.precision).toBeLessThanOrEqual(1);
          
          expect(results.metrics.recall).toBeGreaterThanOrEqual(0);
          expect(results.metrics.recall).toBeLessThanOrEqual(1);
          
          expect(results.metrics.f1Score).toBeGreaterThanOrEqual(0);
          expect(results.metrics.f1Score).toBeLessThanOrEqual(1);
          
          expect(results.metrics.latency).toBeGreaterThan(0);
          expect(results.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
          expect(results.metrics.throughput).toBeGreaterThan(0);
          
          // Verify test cases and timestamp
          expect(results.testCases).toBeGreaterThan(0);
          expect(results.timestamp).toBeInstanceOf(Date);
          
          // Verify F1 score calculation consistency
          const expectedF1 = 2 * (results.metrics.precision * results.metrics.recall) / 
                            (results.metrics.precision + results.metrics.recall);
          expect(Math.abs(results.metrics.f1Score - expectedF1)).toBeLessThan(0.001);
          
          // Verify throughput calculation consistency
          const expectedThroughput = results.testCases / (results.metrics.latency / 1000);
          expect(Math.abs(results.metrics.throughput - expectedThroughput)).toBeLessThan(0.1);
        }
      ));
    });
  });
});
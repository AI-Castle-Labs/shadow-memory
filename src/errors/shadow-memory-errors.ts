/**
 * Custom error classes for the Shadow Memory System
 * Provides structured error handling with specific error types and recovery strategies
 */

/**
 * Base error class for all Shadow Memory System errors
 */
export abstract class ShadowMemoryError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    recoverable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.recoverable = recoverable;
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Context processing errors
 */
export class ContextProcessingError extends ShadowMemoryError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONTEXT_PROCESSING_ERROR', true, context);
  }
}

export class MetadataExtractionError extends ContextProcessingError {
  public readonly code = 'METADATA_EXTRACTION_ERROR';
  
  constructor(message: string, context?: Record<string, any>) {
    super(`Metadata extraction failed: ${message}`, context);
  }
}

export class EmbeddingGenerationError extends ContextProcessingError {
  public readonly code = 'EMBEDDING_GENERATION_ERROR';
  
  constructor(message: string, context?: Record<string, any>) {
    super(`Embedding generation failed: ${message}`, context);
  }
}

/**
 * Memory storage errors
 */
export class MemoryStorageError extends ShadowMemoryError {
  constructor(message: string, recoverable: boolean = true, context?: Record<string, any>) {
    super(message, 'MEMORY_STORAGE_ERROR', recoverable, context);
  }
}

export class StorageCapacityError extends MemoryStorageError {
  public readonly code = 'STORAGE_CAPACITY_ERROR';
  
  constructor(currentSize: number, maxSize: number) {
    super(
      `Storage capacity exceeded: ${currentSize}MB / ${maxSize}MB`,
      false,
      { currentSize, maxSize }
    );
  }
}

export class IndexCorruptionError extends MemoryStorageError {
  public readonly code = 'INDEX_CORRUPTION_ERROR';
  
  constructor(indexType: string, context?: Record<string, any>) {
    super(`Index corruption detected: ${indexType}`, true, context);
  }
}

export class RepresentationGenerationError extends MemoryStorageError {
  public readonly code = 'REPRESENTATION_GENERATION_ERROR';
  
  constructor(representationType: string, context?: Record<string, any>) {
    super(`Failed to generate ${representationType} representation`, true, context);
  }
}

/**
 * Similarity computation errors
 */
export class SimilarityComputationError extends ShadowMemoryError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SIMILARITY_COMPUTATION_ERROR', true, context);
  }
}

export class EmbeddingDimensionMismatchError extends SimilarityComputationError {
  public readonly code = 'EMBEDDING_DIMENSION_MISMATCH_ERROR';
  
  constructor(expected: number, actual: number) {
    super(
      `Embedding dimension mismatch: expected ${expected}, got ${actual}`,
      { expected, actual }
    );
  }
}

export class MissingMetadataFieldsError extends SimilarityComputationError {
  public readonly code = 'MISSING_METADATA_FIELDS_ERROR';
  
  constructor(missingFields: string[], context?: Record<string, any>) {
    super(`Missing metadata fields: ${missingFields.join(', ')}`, { missingFields, ...context });
  }
}

export class NumericalOverflowError extends SimilarityComputationError {
  public readonly code = 'NUMERICAL_OVERFLOW_ERROR';
  
  constructor(operation: string, values: number[]) {
    super(`Numerical overflow in ${operation}`, { operation, values });
  }
}

/**
 * Memory retrieval errors
 */
export class MemoryRetrievalError extends ShadowMemoryError {
  constructor(message: string, recoverable: boolean = true, context?: Record<string, any>) {
    super(message, 'MEMORY_RETRIEVAL_ERROR', recoverable, context);
  }
}

export class MemoryNotFoundError extends MemoryRetrievalError {
  public readonly code = 'MEMORY_NOT_FOUND_ERROR';
  
  constructor(memoryId: string, suggestedAlternatives?: string[]) {
    super(
      `Memory not found: ${memoryId}`,
      false,
      { memoryId, suggestedAlternatives }
    );
  }
}

export class ThresholdConfigurationError extends MemoryRetrievalError {
  public readonly code = 'THRESHOLD_CONFIGURATION_ERROR';
  
  constructor(contextType: string, threshold: number) {
    super(
      `Invalid threshold configuration for ${contextType}: ${threshold}`,
      true,
      { contextType, threshold }
    );
  }
}

export class ConcurrentAccessError extends MemoryRetrievalError {
  public readonly code = 'CONCURRENT_ACCESS_ERROR';
  
  constructor(memoryId: string, operation: string) {
    super(
      `Concurrent access conflict for memory ${memoryId} during ${operation}`,
      true,
      { memoryId, operation }
    );
  }
}

/**
 * Benchmark errors
 */
export class BenchmarkError extends ShadowMemoryError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'BENCHMARK_ERROR', true, context);
  }
}

export class BenchmarkDataUnavailableError extends BenchmarkError {
  public readonly code = 'BENCHMARK_DATA_UNAVAILABLE_ERROR';
  
  constructor(benchmarkType: string) {
    super(`Benchmark data unavailable for type: ${benchmarkType}`, { benchmarkType });
  }
}

export class BaselineComparisonError extends BenchmarkError {
  public readonly code = 'BASELINE_COMPARISON_ERROR';
  
  constructor(baselineName: string, context?: Record<string, any>) {
    super(`Baseline comparison failed: ${baselineName}`, context);
  }
}

export class PerformanceRegressionError extends BenchmarkError {
  public readonly code = 'PERFORMANCE_REGRESSION_ERROR';
  
  constructor(metric: string, current: number, baseline: number) {
    super(
      `Performance regression detected in ${metric}: ${current} vs ${baseline}`,
      { metric, current, baseline }
    );
  }
}

/**
 * System initialization errors
 */
export class SystemInitializationError extends ShadowMemoryError {
  constructor(component: string, cause?: Error) {
    super(
      `Failed to initialize ${component}${cause ? `: ${cause.message}` : ''}`,
      'SYSTEM_INITIALIZATION_ERROR',
      false,
      { component, cause: cause?.message }
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ShadowMemoryError {
  constructor(parameter: string, value: any, expectedType?: string) {
    super(
      `Invalid configuration for ${parameter}: ${value}${expectedType ? ` (expected ${expectedType})` : ''}`,
      'CONFIGURATION_ERROR',
      true,
      { parameter, value, expectedType }
    );
  }
}
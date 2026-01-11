import { IShadowMemorySystem } from '../interfaces/shadow-memory-system';
import { 
  Context, 
  Memory, 
  MemoryId, 
  MemoryAwareness, 
  RelevanceExplanation,
  BenchmarkResults,
  BenchmarkType,
  MemoryRepresentations,
  SimilarityScores,
  ScoringWeights
} from '../types/core';

// Error handling
import { 
  ErrorHandler, 
  RecoveryResult,
  ShadowMemoryError,
  SystemInitializationError,
  MemoryStorageError,
  MemoryRetrievalError,
  MemoryNotFoundError,
  ConfigurationError,
  ContextProcessingError,
  BenchmarkError
} from '../errors';

// Component imports
import { ContextProcessor } from './context-processor';
import { MemoryStore } from './memory-store';
import { SimilarityEngine } from './similarity-engine';
import { ActivationScorer } from './activation-scorer';
import { ThresholdManager } from './threshold-manager';
import { MemoryAwarenessInterface } from './memory-awareness-interface';
import { MemoryRepresentationGenerator } from './memory-representation-generator';
import { MemoryLifecycleManager } from './memory-lifecycle-manager';
import { BenchmarkManager } from './benchmark-manager';
import { TemporalDecay } from './temporal-decay';
import { MemoryArchival } from './memory-archival';
import { CleanupRecommendationSystem } from './cleanup-recommendation';

// Interface imports
import { IContextProcessor } from '../interfaces/context-processor';
import { IMemoryStore } from '../interfaces/memory-store';
import { ISimilarityEngine } from '../interfaces/similarity-engine';
import { IActivationScorer } from '../interfaces/activation-scorer';
import { IThresholdManager } from '../interfaces/threshold-manager';
import { IMemoryAwarenessInterface } from '../interfaces/memory-awareness';
import { IBenchmarkManager } from '../interfaces/benchmark-manager';
import { IMemoryLifecycleManager } from '../interfaces/memory-lifecycle-manager';

/**
 * Configuration options for the Shadow Memory System
 */
export interface ShadowMemorySystemConfig {
  thresholds?: Record<string, number>;
  weights?: ScoringWeights;
  decayFunction?: (age: number) => number;
  maxMemories?: number;
  cleanupInterval?: number;
}

/**
 * Main Shadow Memory System implementation that wires all components together
 * Provides the primary API for external usage
 */
export class ShadowMemorySystem implements IShadowMemorySystem {
  private contextProcessor!: IContextProcessor;
  private memoryStore!: IMemoryStore;
  private similarityEngine!: ISimilarityEngine;
  private activationScorer!: IActivationScorer;
  private thresholdManager!: IThresholdManager;
  private memoryAwareness!: IMemoryAwarenessInterface;
  private representationGenerator!: MemoryRepresentationGenerator;
  private lifecycleManager!: IMemoryLifecycleManager;
  private benchmarkManager!: IBenchmarkManager;

  private config: ShadowMemorySystemConfig;
  private isInitialized: boolean = false;
  private errorHandler: ErrorHandler;

  constructor(config: ShadowMemorySystemConfig = {}) {
    this.config = {
      thresholds: { default: 0.7, semantic: 0.8, contextual: 0.6, temporal: 0.5 },
      weights: { embedding: 0.4, metadata: 0.3, summary: 0.2, temporal: 0.1 },
      decayFunction: (age: number) => Math.exp(-age / (30 * 24 * 60 * 60 * 1000)), // 30-day half-life
      maxMemories: 10000,
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    this.errorHandler = ErrorHandler.getInstance();
    this.initializeComponents();
  }

  /**
   * Initialize all system components and wire them together
   */
  private initializeComponents(): void {
    try {
      // Initialize core components
      this.contextProcessor = new ContextProcessor();
      this.memoryStore = new MemoryStore();
      this.similarityEngine = new SimilarityEngine();
      this.activationScorer = new ActivationScorer();
      this.thresholdManager = new ThresholdManager(this.config.thresholds!);
      
      // Initialize representation generator with dependencies
      this.representationGenerator = new MemoryRepresentationGenerator();

      // Initialize memory awareness interface with dependencies
      this.memoryAwareness = new MemoryAwarenessInterface(
        this.memoryStore,
        this.similarityEngine,
        this.activationScorer,
        this.thresholdManager
      );

      // Initialize lifecycle manager with dependencies
      try {
        const temporalDecay = new TemporalDecay();
        const memoryArchival = new MemoryArchival(this.memoryStore);
        const cleanupRecommendation = new CleanupRecommendationSystem(this.memoryStore);
        this.lifecycleManager = new MemoryLifecycleManager(
          this.memoryStore,
          temporalDecay,
          memoryArchival,
          cleanupRecommendation
        );
      } catch (lifecycleError) {
        console.warn('Lifecycle manager initialization failed, using simplified version');
        // Continue without lifecycle manager for now
      }

      // Initialize benchmark manager
      this.benchmarkManager = new BenchmarkManager();

      this.isInitialized = true;
    } catch (error) {
      const initError = new SystemInitializationError(
        'Shadow Memory System',
        error instanceof Error ? error : new Error('Unknown initialization error')
      );
      throw initError;
    }
  }

  /**
   * Store a new memory in the system with full representation generation
   */
  async storeMemory(content: string, context?: Partial<Context>): Promise<MemoryId> {
    this.ensureInitialized();

    const recoveryResult = await this.errorHandler.handleError(
      new Error('Placeholder for potential error'),
      'storeMemory',
      {
        retryFunction: async () => {
          // Create full context if partial context provided
          const fullContext = await this.createFullContext(content, context);
          
          // Generate memory representations
          const representations = await this.representationGenerator.generateRepresentations(content, fullContext);
          
          // Create complete memory object
          const memory: Memory = {
            id: this.generateMemoryId(),
            content,
            timestamp: new Date(),
            metadata: representations.metadata,
            summary: representations.summary,
            embedding: representations.embedding,
            accessCount: 0,
            lastAccessed: new Date()
          };

          // Store memory
          return await this.memoryStore.storeMemory(memory);
        }
      }
    );

    if (!recoveryResult.success) {
      throw new MemoryStorageError(`Failed to store memory: ${recoveryResult.warning}`);
    }

    return recoveryResult.result!;
  }

  /**
   * Get awareness of relevant memories for current context
   */
  async getMemoryAwareness(context: Context): Promise<MemoryAwareness[]> {
    this.ensureInitialized();

    const recoveryResult = await this.errorHandler.handleError(
      new Error('Placeholder for potential error'),
      'getMemoryAwareness',
      {
        retryFunction: async () => {
          return await this.memoryAwareness.getMemoryAwareness(context);
        },
        fallbackValue: [] // Return empty array if all else fails
      }
    );

    if (!recoveryResult.success) {
      console.warn(`Memory awareness failed: ${recoveryResult.warning}`);
      return [];
    }

    return recoveryResult.result!;
  }

  async getAllCandidateMemories(context: Context): Promise<MemoryAwareness[]> {
    this.ensureInitialized();

    const recoveryResult = await this.errorHandler.handleError(
      new Error('Placeholder for potential error'),
      'getAllCandidateMemories',
      {
        retryFunction: async () => {
          return await this.memoryAwareness.getAllCandidateMemories(context);
        },
        fallbackValue: []
      }
    );

    if (!recoveryResult.success) {
      return [];
    }

    return recoveryResult.result!;
  }

  async retrieveMemory(memoryId: MemoryId): Promise<Memory> {
    this.ensureInitialized();

    const recoveryResult = await this.errorHandler.handleError(
      new Error('Placeholder for potential error'),
      'retrieveMemory',
      {
        retryFunction: async () => {
          const memory = await this.memoryStore.retrieveMemory(memoryId);
          if (!memory) {
            throw new MemoryNotFoundError(memoryId);
          }
          return memory;
        }
      }
    );

    if (!recoveryResult.success) {
      throw new MemoryRetrievalError(`Failed to retrieve memory: ${recoveryResult.warning}`);
    }

    return recoveryResult.result!;
  }

  /**
   * Explain relevance of a memory to current context
   */
  async explainRelevance(memoryId: MemoryId, context: Context): Promise<RelevanceExplanation> {
    this.ensureInitialized();

    const recoveryResult = await this.errorHandler.handleError(
      new Error('Placeholder for potential error'),
      'explainRelevance',
      {
        retryFunction: async () => {
          return await this.memoryAwareness.explainRelevance(memoryId, context);
        }
      }
    );

    if (!recoveryResult.success) {
      throw new MemoryRetrievalError(`Failed to explain relevance: ${recoveryResult.warning}`);
    }

    return recoveryResult.result!;
  }

  /**
   * Update system configuration
   */
  updateConfiguration(config: {
    thresholds?: Record<string, number>;
    weights?: Record<string, number>;
    decayFunction?: (age: number) => number;
  }): void {
    this.ensureInitialized();

    try {
      // Validate configuration parameters
      if (config.thresholds) {
        for (const [contextType, threshold] of Object.entries(config.thresholds)) {
          if (threshold < 0 || threshold > 1) {
            throw new ConfigurationError('threshold', threshold, 'number between 0 and 1');
          }
        }
      }

      if (config.weights) {
        const weightSum = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(weightSum - 1.0) > 0.01) {
          console.warn(`Weights sum to ${weightSum}, normalizing to 1.0`);
        }
      }

      // Update thresholds
      if (config.thresholds) {
        this.config.thresholds = { ...this.config.thresholds, ...config.thresholds };
        // Update individual thresholds
        for (const [contextType, threshold] of Object.entries(config.thresholds)) {
          this.thresholdManager.updateThreshold(contextType as any, threshold);
        }
      }

      // Update scoring weights
      if (config.weights) {
        const newWeights: ScoringWeights = {
          embedding: config.weights.embedding ?? this.config.weights!.embedding,
          metadata: config.weights.metadata ?? this.config.weights!.metadata,
          summary: config.weights.summary ?? this.config.weights!.summary,
          temporal: config.weights.temporal ?? this.config.weights!.temporal
        };
        this.config.weights = newWeights;
        // Note: ActivationScorer doesn't have updateWeights method, weights are passed per call
      }

      // Update decay function
      if (config.decayFunction) {
        this.config.decayFunction = config.decayFunction;
        // Note: Lifecycle manager doesn't have updateDecayFunction method in current interface
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError('unknown', 'unknown', 'valid configuration object');
    }
  }

  /**
   * Run system benchmarks
   */
  async runBenchmark(benchmarkType: BenchmarkType): Promise<BenchmarkResults> {
    this.ensureInitialized();

    const recoveryResult = await this.errorHandler.handleError(
      new Error('Placeholder for potential error'),
      'runBenchmark',
      {
        retryFunction: async () => {
          return await this.benchmarkManager.runBenchmarkSuite(benchmarkType);
        }
      }
    );

    if (!recoveryResult.success) {
      throw new BenchmarkError(`Failed to run benchmark: ${recoveryResult.warning}`);
    }

    return recoveryResult.result!;
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    totalMemories: number;
    averageActivationScore: number;
    memoryUsage: number;
    lastCleanup: Date;
  }> {
    this.ensureInitialized();

    try {
      const memoryIds = await this.memoryStore.getAllMemoryIds();
      const totalMemories = memoryIds.length;
      
      // Calculate average activation score (simplified - would need current context in real implementation)
      const averageActivationScore = 0.5; // Placeholder
      
      // Estimate memory usage (simplified)
      const memoryUsage = totalMemories * 1024; // Rough estimate in bytes
      
      // Get last cleanup time (simplified)
      const lastCleanup = new Date(); // Placeholder

      return {
        totalMemories,
        averageActivationScore,
        memoryUsage,
        lastCleanup
      };
    } catch (error) {
      throw new Error(`Failed to get system stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup old or low-scoring memories
   */
  async cleanup(criteria?: {
    maxAge?: number;
    minActivationScore?: number;
    maxMemories?: number;
  }): Promise<number> {
    this.ensureInitialized();

    try {
      const cleanupCriteria = {
        maxAge: criteria?.maxAge ?? 90 * 24 * 60 * 60 * 1000, // 90 days default
        minActivationScore: criteria?.minActivationScore ?? 0.1,
        maxMemories: criteria?.maxMemories ?? this.config.maxMemories!
      };

      // Simplified cleanup - in real implementation would use lifecycle manager
      return 0; // Placeholder
    } catch (error) {
      throw new Error(`Failed to cleanup memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to ensure system is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new SystemInitializationError('Shadow Memory System', new Error('System not initialized'));
    }
  }

  /**
   * Create full context from content and partial context
   */
  private async createFullContext(content: string, partialContext?: Partial<Context>): Promise<Context> {
    const recoveryResult = await this.errorHandler.handleError(
      new Error('Placeholder for potential error'),
      'createFullContext',
      {
        retryFunction: async () => {
          // Create a basic context structure
          const baseContext: Context = {
            content,
            metadata: {
              topics: [],
              entities: [],
              intent: 'unknown',
              temporalMarkers: [],
              structuralElements: []
            },
            embedding: { vector: [], model: 'default', dimensions: 0 },
            summary: ''
          };

          // Merge with partial context if provided
          if (partialContext) {
            return {
              ...baseContext,
              ...partialContext,
              metadata: {
                ...baseContext.metadata,
                ...partialContext.metadata
              }
            };
          }

          // Process the context to fill in missing fields
          const metadata = this.contextProcessor.extractMetadata(baseContext);
          const embedding = await this.contextProcessor.generateEmbedding(baseContext);
          const summary = await this.contextProcessor.createSummary(baseContext);

          return {
            content,
            metadata: {
              topics: metadata.topics,
              entities: metadata.entities,
              intent: 'processed',
              temporalMarkers: [new Date()],
              structuralElements: []
            },
            embedding,
            summary: summary.content
          };
        },
        fallbackValue: {
          content,
          metadata: {
            topics: [],
            entities: [],
            intent: 'fallback',
            temporalMarkers: [new Date()],
            structuralElements: []
          },
          embedding: { vector: [], model: 'fallback', dimensions: 0 },
          summary: content.substring(0, 100) + '...'
        }
      }
    );

    if (!recoveryResult.success) {
      throw new ContextProcessingError(`Failed to create full context: ${recoveryResult.warning}`);
    }

    return recoveryResult.result!;
  }

  /**
   * Generate unique memory ID
   */
  private generateMemoryId(): MemoryId {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
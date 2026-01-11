/**
 * Core type definitions for the Shadow Memory System
 */

// Basic identifier types
export type MemoryId = string;
export type ContextType = 'conversation' | 'document' | 'task' | 'query' | 'mixed';
export type BenchmarkType = 'retrieval_accuracy' | 'similarity_computation' | 'memory_efficiency' | 'temporal_performance';
export type OperationType = 'store' | 'retrieve' | 'similarity' | 'threshold_update';
export type RelevanceType = 'semantic' | 'contextual' | 'temporal' | 'mixed';

// Entity and relationship types
export interface Entity {
  name: string;
  type: string;
  confidence: number;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  strength: number;
}

export interface StructuralElement {
  type: string;
  content: string;
  position: number;
  metadata?: Record<string, any>;
}

// Embedding vector representation
export interface EmbeddingVector {
  vector: number[];
  model: string;
  dimensions: number;
}

// Context representation
export interface Context {
  content: string;
  metadata: {
    topics: string[];
    entities: Entity[];
    intent: string;
    temporalMarkers: Date[];
    structuralElements: StructuralElement[];
  };
  embedding: EmbeddingVector;
  summary: string;
}

// Memory metadata structure
export interface Metadata {
  topics: string[];
  entities: Entity[];
  concepts: string[];
  relationships: Relationship[];
  importance: number;
}

// Memory summary structure
export interface Summary {
  content: string;
  keyInsights: string[];
  contextualRelevance: string[];
}

// Complete memory representations
export interface MemoryRepresentations {
  metadata: Metadata;
  summary: Summary;
  embedding: EmbeddingVector;
}

// Complete memory structure
export interface Memory {
  id: MemoryId;
  content: string;
  timestamp: Date;
  metadata: Metadata;
  summary: Summary;
  embedding: EmbeddingVector;
  accessCount: number;
  lastAccessed: Date;
}

// Similarity scoring
export interface SimilarityScores {
  embeddingSimilarity: number;
  metadataSimilarity: number;
  summarySimilarity: number;
  temporalRelevance: number;
}

export interface ScoringWeights {
  embedding: number;
  metadata: number;
  summary: number;
  temporal: number;
}

// Memory awareness interface
export interface MemoryAwareness {
  memoryId: MemoryId;
  activationScore: number;
  relevanceType: RelevanceType;
  summary: string;
  confidence: number;
}

export interface RelevanceExplanation {
  memoryId: MemoryId;
  reasons: string[];
  similarityBreakdown: SimilarityScores;
  confidence: number;
}

// Usage analytics for threshold adaptation
export interface UsageAnalytics {
  retrievalSuccessRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  averageActivationScore: number;
  memoryAccessPatterns: Map<MemoryId, number>;
}

// Performance metrics for benchmarking
export interface PerformanceMetrics {
  latency: number;
  memoryUsage: number;
  throughput: number;
  accuracy?: number;
}

// Benchmark results and comparison
export interface BenchmarkResults {
  benchmarkType: BenchmarkType;
  metrics: {
    precision: number;
    recall: number;
    f1Score: number;
    latency: number;
    memoryUsage: number;
    throughput: number;
  };
  testCases: number;
  timestamp: Date;
}

export interface BenchmarkBaseline {
  name: string;
  version: string;
  results: BenchmarkResults;
  description: string;
}

export interface ComparisonReport {
  improvements: string[];
  regressions: string[];
  overallScore: number;
  detailedMetrics: Map<string, number>;
}
/**
 * Interfaces for memory awareness evaluation and metrics
 */

import { MemoryId, MemoryAwareness, Context } from '../types/core';
import { ConversationScenario, ConversationSimulationResult } from './conversation-simulation';

/**
 * Metrics for evaluating memory relevance accuracy
 */
export interface MemoryRelevanceMetrics {
  precision: number; // True positives / (True positives + False positives)
  recall: number; // True positives / (True positives + False negatives)
  f1Score: number; // 2 * (precision * recall) / (precision + recall)
  accuracy: number; // (True positives + True negatives) / Total
  falsePositiveRate: number; // False positives / (False positives + True negatives)
  falseNegativeRate: number; // False negatives / (False negatives + True positives)
}

/**
 * Detailed evaluation of memory activation for a single context
 */
export interface MemoryActivationEvaluation {
  contextId: string;
  expectedRelevantMemories: MemoryId[];
  actualActivatedMemories: MemoryId[];
  truePositives: MemoryId[]; // Correctly activated relevant memories
  falsePositives: MemoryId[]; // Incorrectly activated irrelevant memories
  falseNegatives: MemoryId[]; // Missed relevant memories
  trueNegatives: number; // Correctly not activated irrelevant memories (count only)
  activationScores: Map<MemoryId, number>;
  relevanceScores: Map<MemoryId, number>; // Ground truth relevance scores
}

/**
 * Response quality metrics with and without memory awareness
 */
export interface ResponseQualityMetrics {
  withMemory: {
    relevanceScore: number; // How relevant the response is to the context
    completenessScore: number; // How complete the response is
    accuracyScore: number; // How accurate the response is
    coherenceScore: number; // How coherent the response is
  };
  withoutMemory: {
    relevanceScore: number;
    completenessScore: number;
    accuracyScore: number;
    coherenceScore: number;
  };
  improvement: {
    relevanceImprovement: number;
    completenessImprovement: number;
    accuracyImprovement: number;
    coherenceImprovement: number;
    overallImprovement: number;
  };
}

/**
 * Aggregated evaluation results across multiple conversations
 */
export interface ConversationEvaluationResults {
  totalConversations: number;
  totalTurns: number;
  overallMetrics: MemoryRelevanceMetrics;
  averageResponseQuality: ResponseQualityMetrics;
  conversationResults: ConversationEvaluationResult[];
  performanceTrends: {
    precisionOverTime: number[];
    recallOverTime: number[];
    responseQualityOverTime: number[];
  };
}

/**
 * Evaluation results for a single conversation
 */
export interface ConversationEvaluationResult {
  conversationId: string;
  metrics: MemoryRelevanceMetrics;
  responseQuality: ResponseQualityMetrics;
  turnEvaluations: MemoryActivationEvaluation[];
  memoryUsagePattern: {
    totalMemoriesActivated: number;
    uniqueMemoriesActivated: number;
    averageActivationScore: number;
    memoryReuseRate: number;
  };
}

/**
 * Configuration for memory evaluation
 */
export interface MemoryEvaluationConfig {
  relevanceThreshold: number; // Minimum score to consider a memory relevant
  activationThreshold: number; // Minimum score to consider a memory activated
  responseQualityWeights: {
    relevance: number;
    completeness: number;
    accuracy: number;
    coherence: number;
  };
  evaluationMode: 'automatic' | 'human-assisted' | 'hybrid';
}

/**
 * Interface for memory awareness evaluator
 */
export interface IMemoryAwarenessEvaluator {
  /**
   * Evaluate memory relevance accuracy for a single conversation turn
   */
  evaluateTurn(
    context: Context,
    actualMemoryAwareness: MemoryAwareness[],
    expectedRelevantMemories: MemoryId[],
    groundTruthRelevance: Map<MemoryId, number>
  ): Promise<MemoryActivationEvaluation>;

  /**
   * Evaluate response quality improvement with memory awareness
   */
  evaluateResponseQuality(
    context: Context,
    responseWithMemory: string,
    responseWithoutMemory: string,
    retrievedMemories: MemoryId[]
  ): Promise<ResponseQualityMetrics>;

  /**
   * Evaluate a complete conversation scenario
   */
  evaluateConversation(
    scenario: ConversationScenario,
    simulationResult: ConversationSimulationResult
  ): Promise<ConversationEvaluationResult>;

  /**
   * Aggregate evaluation results across multiple conversations
   */
  aggregateResults(
    conversationResults: ConversationEvaluationResult[]
  ): ConversationEvaluationResults;

  /**
   * Generate ground truth relevance scores for memories
   */
  generateGroundTruthRelevance(
    context: Context,
    availableMemories: MemoryId[]
  ): Promise<Map<MemoryId, number>>;
}

/**
 * Interface for response quality assessor
 */
export interface IResponseQualityAssessor {
  /**
   * Assess the quality of a response given a context
   */
  assessResponse(
    context: Context,
    response: string,
    retrievedMemories?: MemoryId[]
  ): Promise<{
    relevanceScore: number;
    completenessScore: number;
    accuracyScore: number;
    coherenceScore: number;
  }>;

  /**
   * Compare two responses and determine improvement
   */
  compareResponses(
    context: Context,
    responseA: string,
    responseB: string
  ): Promise<{
    betterResponse: 'A' | 'B' | 'tie';
    improvementScore: number;
    improvementAreas: string[];
  }>;
}
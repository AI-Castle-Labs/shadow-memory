/**
 * Evaluates memory awareness accuracy and response quality improvements
 */

import {
  MemoryRelevanceMetrics,
  MemoryActivationEvaluation,
  ResponseQualityMetrics,
  ConversationEvaluationResult,
  ConversationEvaluationResults,
  MemoryEvaluationConfig,
  IMemoryAwarenessEvaluator
} from '../interfaces/memory-evaluation';
import { ConversationScenario, ConversationSimulationResult } from '../interfaces/conversation-simulation';
import { MemoryId, MemoryAwareness, Context } from '../types/core';
import { IShadowMemorySystem } from '../interfaces/shadow-memory-system';
import { ResponseQualityAssessor } from './response-quality-assessor';
import { IResponseQualityAssessor } from '../interfaces/memory-evaluation';

/**
 * Evaluates memory awareness performance and response quality improvements
 */
export class MemoryAwarenessEvaluator implements IMemoryAwarenessEvaluator {
  private shadowMemorySystem: IShadowMemorySystem;
  private responseQualityAssessor: IResponseQualityAssessor;
  private config: MemoryEvaluationConfig;

  constructor(
    shadowMemorySystem: IShadowMemorySystem,
    config: Partial<MemoryEvaluationConfig> = {}
  ) {
    this.shadowMemorySystem = shadowMemorySystem;
    this.responseQualityAssessor = new ResponseQualityAssessor();
    this.config = {
      relevanceThreshold: 0.6,
      activationThreshold: 0.5,
      responseQualityWeights: {
        relevance: 0.3,
        completeness: 0.25,
        accuracy: 0.25,
        coherence: 0.2
      },
      evaluationMode: 'automatic',
      ...config
    };
  }

  /**
   * Evaluate memory relevance accuracy for a single conversation turn
   */
  async evaluateTurn(
    context: Context,
    actualMemoryAwareness: MemoryAwareness[],
    expectedRelevantMemories: MemoryId[],
    groundTruthRelevance: Map<MemoryId, number>
  ): Promise<MemoryActivationEvaluation> {
    // Get activated memories above threshold
    const actualActivatedMemories = actualMemoryAwareness
      .filter(awareness => awareness.activationScore >= this.config.activationThreshold)
      .map(awareness => awareness.memoryId);

    // Get expected relevant memories above threshold
    const expectedRelevant = expectedRelevantMemories.filter(memoryId => {
      const relevanceScore = groundTruthRelevance.get(memoryId) || 0;
      return relevanceScore >= this.config.relevanceThreshold;
    });

    // Calculate true positives, false positives, false negatives
    const truePositives = actualActivatedMemories.filter(memoryId => 
      expectedRelevant.includes(memoryId)
    );

    const falsePositives = actualActivatedMemories.filter(memoryId => 
      !expectedRelevant.includes(memoryId)
    );

    const falseNegatives = expectedRelevant.filter(memoryId => 
      !actualActivatedMemories.includes(memoryId)
    );

    // Estimate true negatives (memories that were correctly not activated)
    // This is an approximation since we don't have the full set of irrelevant memories
    const totalPossibleMemories = Math.max(100, expectedRelevantMemories.length * 10);
    const trueNegatives = totalPossibleMemories - expectedRelevant.length - falsePositives.length;

    // Create activation scores map
    const activationScores = new Map<MemoryId, number>();
    actualMemoryAwareness.forEach(awareness => {
      activationScores.set(awareness.memoryId, awareness.activationScore);
    });

    return {
      contextId: this.generateContextId(context),
      expectedRelevantMemories: expectedRelevant,
      actualActivatedMemories,
      truePositives,
      falsePositives,
      falseNegatives,
      trueNegatives,
      activationScores,
      relevanceScores: groundTruthRelevance
    };
  }

  /**
   * Evaluate response quality improvement with memory awareness
   */
  async evaluateResponseQuality(
    context: Context,
    responseWithMemory: string,
    responseWithoutMemory: string,
    retrievedMemories: MemoryId[]
  ): Promise<ResponseQualityMetrics> {
    // Assess response quality with memory
    const withMemoryQuality = await this.responseQualityAssessor.assessResponse(
      context,
      responseWithMemory,
      retrievedMemories
    );

    // Assess response quality without memory
    const withoutMemoryQuality = await this.responseQualityAssessor.assessResponse(
      context,
      responseWithoutMemory
    );

    // Calculate improvements
    const relevanceImprovement = withMemoryQuality.relevanceScore - withoutMemoryQuality.relevanceScore;
    const completenessImprovement = withMemoryQuality.completenessScore - withoutMemoryQuality.completenessScore;
    const accuracyImprovement = withMemoryQuality.accuracyScore - withoutMemoryQuality.accuracyScore;
    const coherenceImprovement = withMemoryQuality.coherenceScore - withoutMemoryQuality.coherenceScore;

    // Calculate overall improvement using weighted average
    const overallImprovement = (
      relevanceImprovement * this.config.responseQualityWeights.relevance +
      completenessImprovement * this.config.responseQualityWeights.completeness +
      accuracyImprovement * this.config.responseQualityWeights.accuracy +
      coherenceImprovement * this.config.responseQualityWeights.coherence
    );

    return {
      withMemory: withMemoryQuality,
      withoutMemory: withoutMemoryQuality,
      improvement: {
        relevanceImprovement,
        completenessImprovement,
        accuracyImprovement,
        coherenceImprovement,
        overallImprovement
      }
    };
  }

  /**
   * Evaluate a complete conversation scenario
   */
  async evaluateConversation(
    scenario: ConversationScenario,
    simulationResult: ConversationSimulationResult
  ): Promise<ConversationEvaluationResult> {
    const turnEvaluations: MemoryActivationEvaluation[] = [];
    const responseQualities: ResponseQualityMetrics[] = [];
    
    let totalMemoriesActivated = 0;
    const uniqueMemoriesActivated = new Set<MemoryId>();
    const activationScores: number[] = [];

    // Evaluate each turn
    for (let i = 0; i < scenario.turns.length; i++) {
      const turn = scenario.turns[i];
      
      if (turn.context && turn.memoryAwareness) {
        // Generate ground truth relevance for this turn
        const availableMemories = turn.memoryAwareness.map(a => a.memoryId);
        const groundTruthRelevance = await this.generateGroundTruthRelevance(
          turn.context,
          availableMemories
        );

        // Evaluate memory activation for this turn
        const turnEvaluation = await this.evaluateTurn(
          turn.context,
          turn.memoryAwareness,
          scenario.expectedMemoryActivations.slice(0, 5), // Use first 5 as expected for this turn
          groundTruthRelevance
        );

        turnEvaluations.push(turnEvaluation);

        // Track memory usage
        totalMemoriesActivated += turn.memoryAwareness.length;
        turn.memoryAwareness.forEach(awareness => {
          uniqueMemoriesActivated.add(awareness.memoryId);
          activationScores.push(awareness.activationScore);
        });

        // Evaluate response quality if this is an assistant turn
        if (turn.speaker === 'assistant') {
          const responseWithoutMemory = this.generateBaselineResponse(turn.context);
          const responseQuality = await this.evaluateResponseQuality(
            turn.context,
            turn.content,
            responseWithoutMemory,
            turn.retrievedMemories || []
          );
          responseQualities.push(responseQuality);
        }
      }
    }

    // Calculate overall metrics for this conversation
    const overallMetrics = this.calculateOverallMetrics(turnEvaluations);
    
    // Calculate average response quality
    const averageResponseQuality = this.calculateAverageResponseQuality(responseQualities);

    // Calculate memory usage patterns
    const averageActivationScore = activationScores.length > 0 
      ? activationScores.reduce((sum, score) => sum + score, 0) / activationScores.length 
      : 0;

    const memoryReuseRate = uniqueMemoriesActivated.size > 0 
      ? totalMemoriesActivated / uniqueMemoriesActivated.size 
      : 0;

    return {
      conversationId: scenario.id,
      metrics: overallMetrics,
      responseQuality: averageResponseQuality,
      turnEvaluations,
      memoryUsagePattern: {
        totalMemoriesActivated,
        uniqueMemoriesActivated: uniqueMemoriesActivated.size,
        averageActivationScore,
        memoryReuseRate
      }
    };
  }

  /**
   * Aggregate evaluation results across multiple conversations
   */
  aggregateResults(
    conversationResults: ConversationEvaluationResult[]
  ): ConversationEvaluationResults {
    if (conversationResults.length === 0) {
      return this.createEmptyResults();
    }

    // Calculate overall metrics
    const overallMetrics = this.aggregateMetrics(
      conversationResults.map(result => result.metrics)
    );

    // Calculate average response quality
    const averageResponseQuality = this.aggregateResponseQuality(
      conversationResults.map(result => result.responseQuality)
    );

    // Calculate performance trends
    const performanceTrends = this.calculatePerformanceTrends(conversationResults);

    const totalTurns = conversationResults.reduce(
      (sum, result) => sum + result.turnEvaluations.length, 
      0
    );

    return {
      totalConversations: conversationResults.length,
      totalTurns,
      overallMetrics,
      averageResponseQuality,
      conversationResults,
      performanceTrends
    };
  }

  /**
   * Generate ground truth relevance scores for memories
   */
  async generateGroundTruthRelevance(
    context: Context,
    availableMemories: MemoryId[]
  ): Promise<Map<MemoryId, number>> {
    const relevanceMap = new Map<MemoryId, number>();

    // This is a simplified implementation
    // In a real system, this might involve human annotation or more sophisticated analysis
    for (const memoryId of availableMemories) {
      try {
        const memory = await this.shadowMemorySystem.retrieveMemory(memoryId);
        const relevanceScore = this.calculateSemanticRelevance(context, memory.content);
        relevanceMap.set(memoryId, relevanceScore);
      } catch (error) {
        // If memory can't be retrieved, assume low relevance
        relevanceMap.set(memoryId, 0.1);
      }
    }

    return relevanceMap;
  }

  /**
   * Calculate semantic relevance between context and memory content
   */
  private calculateSemanticRelevance(context: Context, memoryContent: string): number {
    // Simplified semantic relevance calculation
    // In a real system, this would use more sophisticated NLP techniques
    
    const contextWords = new Set(
      context.content.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    );
    const memoryWords = new Set(
      memoryContent.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    );

    // Calculate Jaccard similarity
    const intersection = new Set(Array.from(contextWords).filter(word => memoryWords.has(word)));
    const union = new Set([...Array.from(contextWords), ...Array.from(memoryWords)]);
    
    const jaccardSimilarity = intersection.size / union.size;

    // Boost relevance if topics match
    const topicBoost = context.metadata.topics.some(topic => 
      memoryContent.toLowerCase().includes(topic.toLowerCase())
    ) ? 0.2 : 0;

    return Math.min(1.0, jaccardSimilarity + topicBoost);
  }

  /**
   * Generate a baseline response without memory awareness
   */
  private generateBaselineResponse(context: Context): string {
    // Simplified baseline response generation
    const intent = context.metadata.intent;
    const topics = context.metadata.topics.join(', ');
    
    return `I understand you're asking about ${topics}. Let me provide a basic response based on general knowledge without accessing specific memories.`;
  }

  /**
   * Calculate overall metrics from turn evaluations
   */
  private calculateOverallMetrics(turnEvaluations: MemoryActivationEvaluation[]): MemoryRelevanceMetrics {
    if (turnEvaluations.length === 0) {
      return this.createEmptyMetrics();
    }

    let totalTruePositives = 0;
    let totalFalsePositives = 0;
    let totalFalseNegatives = 0;
    let totalTrueNegatives = 0;

    for (const evaluation of turnEvaluations) {
      totalTruePositives += evaluation.truePositives.length;
      totalFalsePositives += evaluation.falsePositives.length;
      totalFalseNegatives += evaluation.falseNegatives.length;
      totalTrueNegatives += evaluation.trueNegatives;
    }

    return this.calculateMetricsFromCounts(
      totalTruePositives,
      totalFalsePositives,
      totalFalseNegatives,
      totalTrueNegatives
    );
  }

  /**
   * Calculate metrics from confusion matrix counts
   */
  private calculateMetricsFromCounts(
    truePositives: number,
    falsePositives: number,
    falseNegatives: number,
    trueNegatives: number
  ): MemoryRelevanceMetrics {
    const precision = truePositives + falsePositives > 0 
      ? truePositives / (truePositives + falsePositives) 
      : 0;

    const recall = truePositives + falseNegatives > 0 
      ? truePositives / (truePositives + falseNegatives) 
      : 0;

    const f1Score = precision + recall > 0 
      ? 2 * (precision * recall) / (precision + recall) 
      : 0;

    const total = truePositives + falsePositives + falseNegatives + trueNegatives;
    const accuracy = total > 0 
      ? (truePositives + trueNegatives) / total 
      : 0;

    const falsePositiveRate = falsePositives + trueNegatives > 0 
      ? falsePositives / (falsePositives + trueNegatives) 
      : 0;

    const falseNegativeRate = falseNegatives + truePositives > 0 
      ? falseNegatives / (falseNegatives + truePositives) 
      : 0;

    return {
      precision,
      recall,
      f1Score,
      accuracy,
      falsePositiveRate,
      falseNegativeRate
    };
  }

  /**
   * Calculate average response quality from multiple evaluations
   */
  private calculateAverageResponseQuality(responseQualities: ResponseQualityMetrics[]): ResponseQualityMetrics {
    if (responseQualities.length === 0) {
      return this.createEmptyResponseQuality();
    }

    const averages = responseQualities.reduce(
      (acc, quality) => ({
        withMemory: {
          relevanceScore: acc.withMemory.relevanceScore + quality.withMemory.relevanceScore,
          completenessScore: acc.withMemory.completenessScore + quality.withMemory.completenessScore,
          accuracyScore: acc.withMemory.accuracyScore + quality.withMemory.accuracyScore,
          coherenceScore: acc.withMemory.coherenceScore + quality.withMemory.coherenceScore
        },
        withoutMemory: {
          relevanceScore: acc.withoutMemory.relevanceScore + quality.withoutMemory.relevanceScore,
          completenessScore: acc.withoutMemory.completenessScore + quality.withoutMemory.completenessScore,
          accuracyScore: acc.withoutMemory.accuracyScore + quality.withoutMemory.accuracyScore,
          coherenceScore: acc.withoutMemory.coherenceScore + quality.withoutMemory.coherenceScore
        },
        improvement: {
          relevanceImprovement: acc.improvement.relevanceImprovement + quality.improvement.relevanceImprovement,
          completenessImprovement: acc.improvement.completenessImprovement + quality.improvement.completenessImprovement,
          accuracyImprovement: acc.improvement.accuracyImprovement + quality.improvement.accuracyImprovement,
          coherenceImprovement: acc.improvement.coherenceImprovement + quality.improvement.coherenceImprovement,
          overallImprovement: acc.improvement.overallImprovement + quality.improvement.overallImprovement
        }
      }),
      this.createEmptyResponseQuality()
    );

    const count = responseQualities.length;
    return {
      withMemory: {
        relevanceScore: averages.withMemory.relevanceScore / count,
        completenessScore: averages.withMemory.completenessScore / count,
        accuracyScore: averages.withMemory.accuracyScore / count,
        coherenceScore: averages.withMemory.coherenceScore / count
      },
      withoutMemory: {
        relevanceScore: averages.withoutMemory.relevanceScore / count,
        completenessScore: averages.withoutMemory.completenessScore / count,
        accuracyScore: averages.withoutMemory.accuracyScore / count,
        coherenceScore: averages.withoutMemory.coherenceScore / count
      },
      improvement: {
        relevanceImprovement: averages.improvement.relevanceImprovement / count,
        completenessImprovement: averages.improvement.completenessImprovement / count,
        accuracyImprovement: averages.improvement.accuracyImprovement / count,
        coherenceImprovement: averages.improvement.coherenceImprovement / count,
        overallImprovement: averages.improvement.overallImprovement / count
      }
    };
  }

  /**
   * Aggregate metrics from multiple conversations
   */
  private aggregateMetrics(metrics: MemoryRelevanceMetrics[]): MemoryRelevanceMetrics {
    if (metrics.length === 0) {
      return this.createEmptyMetrics();
    }

    const averages = metrics.reduce(
      (acc, metric) => ({
        precision: acc.precision + metric.precision,
        recall: acc.recall + metric.recall,
        f1Score: acc.f1Score + metric.f1Score,
        accuracy: acc.accuracy + metric.accuracy,
        falsePositiveRate: acc.falsePositiveRate + metric.falsePositiveRate,
        falseNegativeRate: acc.falseNegativeRate + metric.falseNegativeRate
      }),
      this.createEmptyMetrics()
    );

    const count = metrics.length;
    return {
      precision: averages.precision / count,
      recall: averages.recall / count,
      f1Score: averages.f1Score / count,
      accuracy: averages.accuracy / count,
      falsePositiveRate: averages.falsePositiveRate / count,
      falseNegativeRate: averages.falseNegativeRate / count
    };
  }

  /**
   * Aggregate response quality from multiple conversations
   */
  private aggregateResponseQuality(responseQualities: ResponseQualityMetrics[]): ResponseQualityMetrics {
    return this.calculateAverageResponseQuality(responseQualities);
  }

  /**
   * Calculate performance trends over time
   */
  private calculatePerformanceTrends(conversationResults: ConversationEvaluationResult[]): {
    precisionOverTime: number[];
    recallOverTime: number[];
    responseQualityOverTime: number[];
  } {
    const precisionOverTime = conversationResults.map(result => result.metrics.precision);
    const recallOverTime = conversationResults.map(result => result.metrics.recall);
    const responseQualityOverTime = conversationResults.map(result => 
      result.responseQuality.improvement.overallImprovement
    );

    return {
      precisionOverTime,
      recallOverTime,
      responseQualityOverTime
    };
  }

  /**
   * Generate a unique context ID
   */
  private generateContextId(context: Context): string {
    const contentHash = context.content.substring(0, 20).replace(/\s+/g, '_');
    return `ctx_${Date.now()}_${contentHash}`;
  }

  /**
   * Create empty metrics structure
   */
  private createEmptyMetrics(): MemoryRelevanceMetrics {
    return {
      precision: 0,
      recall: 0,
      f1Score: 0,
      accuracy: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0
    };
  }

  /**
   * Create empty response quality structure
   */
  private createEmptyResponseQuality(): ResponseQualityMetrics {
    return {
      withMemory: {
        relevanceScore: 0,
        completenessScore: 0,
        accuracyScore: 0,
        coherenceScore: 0
      },
      withoutMemory: {
        relevanceScore: 0,
        completenessScore: 0,
        accuracyScore: 0,
        coherenceScore: 0
      },
      improvement: {
        relevanceImprovement: 0,
        completenessImprovement: 0,
        accuracyImprovement: 0,
        coherenceImprovement: 0,
        overallImprovement: 0
      }
    };
  }

  /**
   * Create empty evaluation results
   */
  private createEmptyResults(): ConversationEvaluationResults {
    return {
      totalConversations: 0,
      totalTurns: 0,
      overallMetrics: this.createEmptyMetrics(),
      averageResponseQuality: this.createEmptyResponseQuality(),
      conversationResults: [],
      performanceTrends: {
        precisionOverTime: [],
        recallOverTime: [],
        responseQualityOverTime: []
      }
    };
  }
}
/**
 * Assesses response quality with and without memory awareness
 */

import { Context, MemoryId } from '../types/core';
import { IResponseQualityAssessor } from '../interfaces/memory-evaluation';

/**
 * Assesses the quality of responses in conversations
 */
export class ResponseQualityAssessor implements IResponseQualityAssessor {
  /**
   * Assess the quality of a response given a context
   */
  async assessResponse(
    context: Context,
    response: string,
    retrievedMemories?: MemoryId[]
  ): Promise<{
    relevanceScore: number;
    completenessScore: number;
    accuracyScore: number;
    coherenceScore: number;
  }> {
    // Assess relevance - how well the response addresses the context
    const relevanceScore = this.assessRelevance(context, response);

    // Assess completeness - how complete the response is
    const completenessScore = this.assessCompleteness(context, response, retrievedMemories);

    // Assess accuracy - how accurate the response is (simplified)
    const accuracyScore = this.assessAccuracy(context, response);

    // Assess coherence - how coherent and well-structured the response is
    const coherenceScore = this.assessCoherence(response);

    return {
      relevanceScore,
      completenessScore,
      accuracyScore,
      coherenceScore
    };
  }

  /**
   * Compare two responses and determine improvement
   */
  async compareResponses(
    context: Context,
    responseA: string,
    responseB: string
  ): Promise<{
    betterResponse: 'A' | 'B' | 'tie';
    improvementScore: number;
    improvementAreas: string[];
  }> {
    const qualityA = await this.assessResponse(context, responseA);
    const qualityB = await this.assessResponse(context, responseB);

    // Calculate overall quality scores
    const overallA = this.calculateOverallQuality(qualityA);
    const overallB = this.calculateOverallQuality(qualityB);

    const improvementScore = overallB - overallA;
    const threshold = 0.05; // 5% improvement threshold

    let betterResponse: 'A' | 'B' | 'tie';
    if (Math.abs(improvementScore) < threshold) {
      betterResponse = 'tie';
    } else {
      betterResponse = improvementScore > 0 ? 'B' : 'A';
    }

    // Identify improvement areas
    const improvementAreas: string[] = [];
    if (qualityB.relevanceScore > qualityA.relevanceScore + threshold) {
      improvementAreas.push('relevance');
    }
    if (qualityB.completenessScore > qualityA.completenessScore + threshold) {
      improvementAreas.push('completeness');
    }
    if (qualityB.accuracyScore > qualityA.accuracyScore + threshold) {
      improvementAreas.push('accuracy');
    }
    if (qualityB.coherenceScore > qualityA.coherenceScore + threshold) {
      improvementAreas.push('coherence');
    }

    return {
      betterResponse,
      improvementScore,
      improvementAreas
    };
  }

  /**
   * Assess how relevant the response is to the context
   */
  private assessRelevance(context: Context, response: string): number {
    const contextWords = new Set(
      context.content.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    );
    const responseWords = new Set(
      response.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    );

    // Calculate word overlap
    const intersection = new Set(Array.from(contextWords).filter(word => responseWords.has(word)));
    const wordOverlap = contextWords.size > 0 ? intersection.size / contextWords.size : 0;

    // Check if response addresses the intent
    const intent = context.metadata.intent.toLowerCase();
    const addressesIntent = response.toLowerCase().includes(intent) || 
                           this.containsIntentKeywords(response, intent);

    // Check topic coverage
    const topicCoverage = context.metadata.topics.length > 0 
      ? context.metadata.topics.filter(topic => 
          response.toLowerCase().includes(topic.toLowerCase())
        ).length / context.metadata.topics.length
      : 0;

    // Combine scores with weights
    return Math.min(1.0, 
      wordOverlap * 0.4 + 
      (addressesIntent ? 0.3 : 0) + 
      topicCoverage * 0.3
    );
  }

  /**
   * Assess how complete the response is
   */
  private assessCompleteness(context: Context, response: string, retrievedMemories?: MemoryId[]): number {
    let completenessScore = 0;

    // Base completeness on response length (longer responses tend to be more complete)
    const responseLength = response.split(/\s+/).length;
    const lengthScore = Math.min(1.0, responseLength / 100); // Normalize to 100 words
    completenessScore += lengthScore * 0.3;

    // Check if response addresses multiple aspects of the context
    const contextAspects = this.extractContextAspects(context);
    const addressedAspects = contextAspects.filter(aspect => 
      response.toLowerCase().includes(aspect.toLowerCase())
    );
    const aspectCoverage = contextAspects.length > 0 
      ? addressedAspects.length / contextAspects.length 
      : 0.5;
    completenessScore += aspectCoverage * 0.4;

    // Bonus for using retrieved memories (indicates more comprehensive response)
    if (retrievedMemories && retrievedMemories.length > 0) {
      const memoryBonus = Math.min(0.3, retrievedMemories.length * 0.1);
      completenessScore += memoryBonus;
    }

    return Math.min(1.0, completenessScore);
  }

  /**
   * Assess the accuracy of the response (simplified heuristic-based approach)
   */
  private assessAccuracy(context: Context, response: string): number {
    let accuracyScore = 0.7; // Base accuracy score

    // Check for uncertainty indicators (good for accuracy)
    const uncertaintyIndicators = ['might', 'could', 'possibly', 'perhaps', 'likely'];
    const hasUncertainty = uncertaintyIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
    if (hasUncertainty) {
      accuracyScore += 0.1;
    }

    // Check for absolute statements (potentially less accurate)
    const absoluteIndicators = ['always', 'never', 'definitely', 'certainly', 'absolutely'];
    const hasAbsolutes = absoluteIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
    if (hasAbsolutes) {
      accuracyScore -= 0.1;
    }

    // Check for factual consistency (simplified)
    const hasContradictions = this.detectContradictions(response);
    if (hasContradictions) {
      accuracyScore -= 0.2;
    }

    return Math.max(0, Math.min(1.0, accuracyScore));
  }

  /**
   * Assess the coherence of the response
   */
  private assessCoherence(response: string): number {
    let coherenceScore = 0;

    // Check sentence structure and flow
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    // Penalize very short or very long sentences
    const avgSentenceLength = response.split(/\s+/).length / sentences.length;
    const lengthScore = avgSentenceLength >= 5 && avgSentenceLength <= 25 ? 0.3 : 0.1;
    coherenceScore += lengthScore;

    // Check for transition words and logical flow
    const transitionWords = ['however', 'therefore', 'furthermore', 'additionally', 'consequently', 'meanwhile'];
    const hasTransitions = transitionWords.some(word => 
      response.toLowerCase().includes(word)
    );
    if (hasTransitions) {
      coherenceScore += 0.2;
    }

    // Check for proper structure (introduction, body, conclusion indicators)
    const structureIndicators = ['first', 'second', 'finally', 'in conclusion', 'to summarize'];
    const hasStructure = structureIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
    if (hasStructure) {
      coherenceScore += 0.2;
    }

    // Check for repetition (reduces coherence)
    const words = response.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = words.length > 0 ? uniqueWords.size / words.length : 1;
    coherenceScore += repetitionRatio * 0.3;

    return Math.min(1.0, coherenceScore);
  }

  /**
   * Calculate overall quality score from individual metrics
   */
  private calculateOverallQuality(quality: {
    relevanceScore: number;
    completenessScore: number;
    accuracyScore: number;
    coherenceScore: number;
  }): number {
    // Weighted average of quality metrics
    return (
      quality.relevanceScore * 0.3 +
      quality.completenessScore * 0.25 +
      quality.accuracyScore * 0.25 +
      quality.coherenceScore * 0.2
    );
  }

  /**
   * Check if response contains keywords related to the intent
   */
  private containsIntentKeywords(response: string, intent: string): boolean {
    const intentKeywords: Record<string, string[]> = {
      'question': ['answer', 'explain', 'help', 'understand'],
      'request': ['provide', 'give', 'show', 'demonstrate'],
      'problem': ['solve', 'fix', 'resolve', 'address'],
      'information': ['details', 'information', 'data', 'facts']
    };

    const keywords = intentKeywords[intent] || [];
    return keywords.some(keyword => response.toLowerCase().includes(keyword));
  }

  /**
   * Extract key aspects from context that should be addressed
   */
  private extractContextAspects(context: Context): string[] {
    const aspects: string[] = [];

    // Add topics as aspects
    aspects.push(...context.metadata.topics);

    // Add entities as aspects
    aspects.push(...context.metadata.entities.map(entity => entity.name));

    // Extract question words and key concepts from content
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    const contentWords = context.content.toLowerCase().split(/\s+/);
    
    for (const word of questionWords) {
      if (contentWords.includes(word)) {
        aspects.push(word);
      }
    }

    return aspects;
  }

  /**
   * Detect potential contradictions in the response (simplified)
   */
  private detectContradictions(response: string): boolean {
    const contradictionPairs = [
      ['yes', 'no'],
      ['true', 'false'],
      ['always', 'never'],
      ['all', 'none'],
      ['increase', 'decrease'],
      ['better', 'worse']
    ];

    const responseLower = response.toLowerCase();
    
    for (const [word1, word2] of contradictionPairs) {
      if (responseLower.includes(word1) && responseLower.includes(word2)) {
        // Check if they're not in a comparative context
        const word1Index = responseLower.indexOf(word1);
        const word2Index = responseLower.indexOf(word2);
        const distance = Math.abs(word1Index - word2Index);
        
        // If contradictory words are close together, it might be a contradiction
        if (distance < 50) { // Within 50 characters
          return true;
        }
      }
    }

    return false;
  }
}
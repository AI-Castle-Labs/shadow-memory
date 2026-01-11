/**
 * Conversation simulator that executes conversation scenarios with the shadow memory system
 */

import { 
  ConversationScenario, 
  ConversationTurn,
  ConversationSimulationConfig,
  ConversationSimulationResult,
  IConversationSimulator
} from '../interfaces/conversation-simulation';
import { IShadowMemorySystem } from '../interfaces/shadow-memory-system';
import { ConversationScenarioGenerator } from './conversation-scenario-generator';
import { Context, MemoryId, MemoryAwareness } from '../types/core';

/**
 * Simulates multi-turn conversations with memory storage and retrieval
 */
export class ConversationSimulator implements IConversationSimulator {
  private shadowMemorySystem: IShadowMemorySystem;
  private scenarioGenerator: ConversationScenarioGenerator;

  constructor(shadowMemorySystem: IShadowMemorySystem) {
    this.shadowMemorySystem = shadowMemorySystem;
    this.scenarioGenerator = new ConversationScenarioGenerator();
  }

  /**
   * Generate realistic conversation scenarios
   */
  async generateScenarios(config: ConversationSimulationConfig): Promise<ConversationScenario[]> {
    const scenarios: ConversationScenario[] = [];
    const topics = this.scenarioGenerator.getConversationTopics();
    
    for (let i = 0; i < config.scenarioCount; i++) {
      const topic = topics[i % topics.length];
      const difficulty = this.selectDifficulty(i, config.scenarioCount);
      const memoryDependency = this.selectMemoryDependency(config.topicVariation);
      
      const scenario = await this.scenarioGenerator.generateScenario({
        topic,
        turns: config.turnsPerScenario,
        difficulty,
        memoryDependency
      });
      
      scenarios.push(scenario);
    }

    return scenarios;
  }

  /**
   * Execute a conversation scenario with memory system
   */
  async executeScenario(scenario: ConversationScenario): Promise<ConversationSimulationResult> {
    const startTime = Date.now();
    const result: ConversationSimulationResult = {
      scenarioId: scenario.id,
      totalTurns: scenario.turns.length,
      memoriesStored: 0,
      memoriesRetrieved: 0,
      averageActivationScore: 0,
      memoryHits: 0,
      memoryMisses: 0,
      falsePositives: 0,
      executionTime: 0,
      errors: []
    };

    const activationScores: number[] = [];
    const storedMemoryIds: MemoryId[] = [];

    try {
      for (let i = 0; i < scenario.turns.length; i++) {
        const turn = scenario.turns[i];
        
        // Process memory awareness for this turn
        if (turn.context) {
          try {
            const memoryAwareness = await this.shadowMemorySystem.getMemoryAwareness(turn.context);
            turn.memoryAwareness = memoryAwareness;
            
            // Track activation scores
            for (const awareness of memoryAwareness) {
              activationScores.push(awareness.activationScore);
            }

            // Evaluate memory relevance
            const relevanceEvaluation = this.evaluateMemoryRelevance(
              memoryAwareness, 
              scenario.expectedMemoryActivations,
              turn.context
            );
            
            result.memoryHits += relevanceEvaluation.hits;
            result.memoryMisses += relevanceEvaluation.misses;
            result.falsePositives += relevanceEvaluation.falsePositives;

            // Simulate memory retrieval based on activation scores
            const retrievedMemories = await this.simulateMemoryRetrieval(memoryAwareness);
            turn.retrievedMemories = retrievedMemories;
            result.memoriesRetrieved += retrievedMemories.length;

          } catch (error) {
            result.errors.push(`Memory awareness error at turn ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Simulate memory storage (store some turns as memories)
        if (this.shouldStoreMemory(turn, i, scenario.turns.length)) {
          try {
            const memoryId = await this.shadowMemorySystem.storeMemory(turn.content, turn.context);
            storedMemoryIds.push(memoryId);
            result.memoriesStored++;
          } catch (error) {
            result.errors.push(`Memory storage error at turn ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Add small delay to simulate real conversation timing
        await this.simulateDelay(100);
      }

      // Calculate average activation score
      result.averageActivationScore = activationScores.length > 0 
        ? activationScores.reduce((sum, score) => sum + score, 0) / activationScores.length 
        : 0;

    } catch (error) {
      result.errors.push(`Scenario execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Execute multiple scenarios and aggregate results
   */
  async runSimulation(scenarios: ConversationScenario[]): Promise<ConversationSimulationResult[]> {
    const results: ConversationSimulationResult[] = [];
    
    for (const scenario of scenarios) {
      try {
        const result = await this.executeScenario(scenario);
        results.push(result);
      } catch (error) {
        // Create error result for failed scenario
        results.push({
          scenarioId: scenario.id,
          totalTurns: scenario.turns.length,
          memoriesStored: 0,
          memoriesRetrieved: 0,
          averageActivationScore: 0,
          memoryHits: 0,
          memoryMisses: 0,
          falsePositives: 0,
          executionTime: 0,
          errors: [`Scenario execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }

    return results;
  }

  /**
   * Generate conversation content for a given topic and context
   */
  async generateConversationContent(topic: string, context: string, turnNumber: number): Promise<string> {
    // This is a simplified implementation - in a real system, this might use an LLM
    const templates = [
      `I'm working on ${topic} and need help with ${context}`,
      `Can you explain how ${topic} relates to ${context}?`,
      `What are the best practices for ${topic} in the context of ${context}?`,
      `I'm having trouble with ${topic} - specifically ${context}`,
      `How should I approach ${topic} when dealing with ${context}?`
    ];

    const template = templates[turnNumber % templates.length];
    return template;
  }

  /**
   * Evaluate memory relevance for a conversation turn
   */
  private evaluateMemoryRelevance(
    memoryAwareness: MemoryAwareness[], 
    expectedActivations: string[],
    context: Context
  ): { hits: number; misses: number; falsePositives: number } {
    let hits = 0;
    let falsePositives = 0;

    // Check if activated memories are relevant
    for (const awareness of memoryAwareness) {
      const isRelevant = this.isMemoryRelevant(awareness, expectedActivations, context);
      if (isRelevant) {
        hits++;
      } else {
        falsePositives++;
      }
    }

    // Calculate misses (expected activations that didn't occur)
    const activatedConcepts = memoryAwareness.map(a => a.summary.toLowerCase());
    const misses = expectedActivations.filter(expected => 
      !activatedConcepts.some(activated => activated.includes(expected.toLowerCase()))
    ).length;

    return { hits, misses, falsePositives };
  }

  /**
   * Check if a memory awareness is relevant to the expected activations
   */
  private isMemoryRelevant(
    awareness: MemoryAwareness, 
    expectedActivations: string[], 
    context: Context
  ): boolean {
    const summary = awareness.summary.toLowerCase();
    const contextTopics = context.metadata.topics.map(t => t.toLowerCase());
    
    // Check if memory summary contains expected concepts
    for (const expected of expectedActivations) {
      if (summary.includes(expected.toLowerCase())) {
        return true;
      }
    }

    // Check if memory is related to context topics
    for (const topic of contextTopics) {
      if (summary.includes(topic)) {
        return true;
      }
    }

    // Consider high activation scores as potentially relevant
    return awareness.activationScore > 0.7;
  }

  /**
   * Simulate memory retrieval based on activation scores
   */
  private async simulateMemoryRetrieval(memoryAwareness: MemoryAwareness[]): Promise<MemoryId[]> {
    const retrievedMemories: MemoryId[] = [];
    
    // Retrieve memories with high activation scores
    for (const awareness of memoryAwareness) {
      if (awareness.activationScore > 0.6 && Math.random() > 0.3) { // 70% chance to retrieve high-scoring memories
        retrievedMemories.push(awareness.memoryId);
      }
    }

    return retrievedMemories;
  }

  /**
   * Determine if a conversation turn should be stored as a memory
   */
  private shouldStoreMemory(turn: ConversationTurn, turnIndex: number, totalTurns: number): boolean {
    // Store memories based on various criteria
    
    // Always store the first and last turns
    if (turnIndex === 0 || turnIndex === totalTurns - 1) {
      return true;
    }

    // Store assistant responses more frequently
    if (turn.speaker === 'assistant' && Math.random() > 0.4) {
      return true;
    }

    // Store user questions that contain technical terms
    if (turn.speaker === 'user') {
      const technicalTerms = ['algorithm', 'database', 'api', 'framework', 'pattern', 'architecture'];
      const hasTehnicalTerms = technicalTerms.some(term => 
        turn.content.toLowerCase().includes(term)
      );
      if (hasTehnicalTerms && Math.random() > 0.6) {
        return true;
      }
    }

    // Random storage for variety
    return Math.random() > 0.8;
  }

  /**
   * Select difficulty level based on scenario index
   */
  private selectDifficulty(index: number, total: number): 'easy' | 'medium' | 'hard' {
    const ratio = index / total;
    if (ratio < 0.4) return 'easy';
    if (ratio < 0.8) return 'medium';
    return 'hard';
  }

  /**
   * Select memory dependency based on topic variation
   */
  private selectMemoryDependency(topicVariation: string): 'low' | 'medium' | 'high' {
    switch (topicVariation) {
      case 'single': return 'high';
      case 'related': return 'medium';
      case 'diverse': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Simulate delay between conversation turns
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
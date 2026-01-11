/**
 * Interfaces for conversation simulation and performance evaluation
 */

import { Context, Memory, MemoryId, MemoryAwareness } from '../types/core';

/**
 * Represents a single turn in a conversation
 */
export interface ConversationTurn {
  id: string;
  speaker: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: Context;
  memoryAwareness?: MemoryAwareness[];
  retrievedMemories?: MemoryId[];
}

/**
 * Represents a complete conversation scenario
 */
export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  turns: ConversationTurn[];
  topics: string[];
  expectedMemoryActivations: string[];
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    memoryDependency: 'low' | 'medium' | 'high';
    topicVariation: 'single' | 'related' | 'diverse';
  };
}

/**
 * Configuration for conversation simulation
 */
export interface ConversationSimulationConfig {
  scenarioCount: number;
  turnsPerScenario: number;
  topicVariation: 'single' | 'related' | 'diverse';
  memoryStorageRate: number; // Probability of storing each turn as memory
  memoryRetrievalRate: number; // Probability of retrieving memories per turn
  contextComplexity: 'simple' | 'medium' | 'complex';
}

/**
 * Results from a conversation simulation
 */
export interface ConversationSimulationResult {
  scenarioId: string;
  totalTurns: number;
  memoriesStored: number;
  memoriesRetrieved: number;
  averageActivationScore: number;
  memoryHits: number; // Relevant memories found
  memoryMisses: number; // Relevant memories not found
  falsePositives: number; // Irrelevant memories activated
  executionTime: number;
  errors: string[];
}

/**
 * Interface for conversation simulation framework
 */
export interface IConversationSimulator {
  /**
   * Generate realistic conversation scenarios
   */
  generateScenarios(config: ConversationSimulationConfig): Promise<ConversationScenario[]>;

  /**
   * Execute a conversation scenario with memory system
   */
  executeScenario(scenario: ConversationScenario): Promise<ConversationSimulationResult>;

  /**
   * Execute multiple scenarios and aggregate results
   */
  runSimulation(scenarios: ConversationScenario[]): Promise<ConversationSimulationResult[]>;

  /**
   * Generate conversation content for a given topic and context
   */
  generateConversationContent(topic: string, context: string, turnNumber: number): Promise<string>;
}

/**
 * Interface for conversation scenario generator
 */
export interface IConversationScenarioGenerator {
  /**
   * Generate a single conversation scenario
   */
  generateScenario(config: {
    topic: string;
    turns: number;
    difficulty: 'easy' | 'medium' | 'hard';
    memoryDependency: 'low' | 'medium' | 'high';
  }): Promise<ConversationScenario>;

  /**
   * Generate conversation turns for a scenario
   */
  generateTurns(topic: string, turnCount: number, difficulty: string): Promise<ConversationTurn[]>;

  /**
   * Get predefined conversation topics
   */
  getConversationTopics(): string[];
}
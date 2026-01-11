/**
 * Tests for conversation simulation framework
 */

import { ConversationSimulator } from '../src/components/conversation-simulator';
import { ConversationScenarioGenerator } from '../src/components/conversation-scenario-generator';
import { ShadowMemorySystem } from '../src/components/shadow-memory-system';

describe('Conversation Simulation Framework', () => {
  let shadowMemorySystem: ShadowMemorySystem;
  let conversationSimulator: ConversationSimulator;
  let scenarioGenerator: ConversationScenarioGenerator;

  beforeEach(() => {
    shadowMemorySystem = new ShadowMemorySystem();
    conversationSimulator = new ConversationSimulator(shadowMemorySystem);
    scenarioGenerator = new ConversationScenarioGenerator();
  });

  describe('ConversationScenarioGenerator', () => {
    test('should generate conversation topics', () => {
      const topics = scenarioGenerator.getConversationTopics();
      
      expect(topics).toBeDefined();
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
      expect(topics).toContain('software development');
    });

    test('should generate a conversation scenario', async () => {
      const scenario = await scenarioGenerator.generateScenario({
        topic: 'software development',
        turns: 4,
        difficulty: 'medium',
        memoryDependency: 'medium'
      });

      expect(scenario).toBeDefined();
      expect(scenario.id).toBeDefined();
      expect(scenario.title).toContain('software development');
      expect(scenario.turns).toHaveLength(4);
      expect(scenario.metadata.difficulty).toBe('medium');
      expect(scenario.metadata.memoryDependency).toBe('medium');
    });

    test('should generate conversation turns with alternating speakers', async () => {
      const turns = await scenarioGenerator.generateTurns('software development', 4, 'easy');

      expect(turns).toHaveLength(4);
      expect(turns[0].speaker).toBe('user');
      expect(turns[1].speaker).toBe('assistant');
      expect(turns[2].speaker).toBe('user');
      expect(turns[3].speaker).toBe('assistant');

      // Each turn should have required properties
      for (const turn of turns) {
        expect(turn.id).toBeDefined();
        expect(turn.content).toBeDefined();
        expect(turn.timestamp).toBeDefined();
        expect(turn.context).toBeDefined();
      }
    });
  });

  describe('ConversationSimulator', () => {
    test('should generate conversation scenarios', async () => {
      const config = {
        scenarioCount: 2,
        turnsPerScenario: 4,
        topicVariation: 'related' as const,
        memoryStorageRate: 0.5,
        memoryRetrievalRate: 0.3,
        contextComplexity: 'medium' as const
      };

      const scenarios = await conversationSimulator.generateScenarios(config);

      expect(scenarios).toHaveLength(2);
      for (const scenario of scenarios) {
        expect(scenario.turns).toHaveLength(4);
        expect(scenario.topics).toBeDefined();
        expect(scenario.expectedMemoryActivations).toBeDefined();
      }
    });

    test('should execute a conversation scenario', async () => {
      const scenario = await scenarioGenerator.generateScenario({
        topic: 'software development',
        turns: 2,
        difficulty: 'easy',
        memoryDependency: 'low'
      });

      const result = await conversationSimulator.executeScenario(scenario);

      expect(result).toBeDefined();
      expect(result.scenarioId).toBe(scenario.id);
      expect(result.totalTurns).toBe(2);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should generate conversation content', async () => {
      const content = await conversationSimulator.generateConversationContent(
        'software development',
        'debugging',
        1
      );

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    test('should run a complete simulation workflow', async () => {
      // Generate scenarios
      const config = {
        scenarioCount: 1,
        turnsPerScenario: 2,
        topicVariation: 'single' as const,
        memoryStorageRate: 0.5,
        memoryRetrievalRate: 0.3,
        contextComplexity: 'simple' as const
      };

      const scenarios = await conversationSimulator.generateScenarios(config);
      expect(scenarios).toHaveLength(1);

      // Execute scenarios
      const results = await conversationSimulator.runSimulation(scenarios);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(result.scenarioId).toBe(scenarios[0].id);
      expect(result.totalTurns).toBe(2);
    });
  });
});
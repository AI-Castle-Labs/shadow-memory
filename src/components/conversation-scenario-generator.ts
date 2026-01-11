/**
 * Generates realistic conversation scenarios for testing the shadow memory system
 */

import { 
  ConversationScenario, 
  ConversationTurn, 
  IConversationScenarioGenerator 
} from '../interfaces/conversation-simulation';
import { Context, Entity, StructuralElement } from '../types/core';

/**
 * Generates conversation scenarios with varying topics and contexts
 */
export class ConversationScenarioGenerator implements IConversationScenarioGenerator {
  private conversationTopics: string[] = [
    'software development',
    'project management',
    'data analysis',
    'machine learning',
    'system architecture',
    'debugging techniques',
    'code review',
    'testing strategies',
    'performance optimization',
    'security practices',
    'database design',
    'api development',
    'user experience',
    'deployment strategies',
    'monitoring and logging'
  ];

  private conversationTemplates: Record<string, string[]> = {
    'software development': [
      'I need help with implementing a new feature',
      'Can you review this code snippet?',
      'What are the best practices for this pattern?',
      'How should I handle error cases?',
      'What testing approach would you recommend?'
    ],
    'project management': [
      'How should we prioritize these tasks?',
      'What are the risks with this timeline?',
      'Can you help estimate the effort required?',
      'How do we handle scope changes?',
      'What metrics should we track?'
    ],
    'data analysis': [
      'How should I clean this dataset?',
      'What visualization would be most effective?',
      'Can you help interpret these results?',
      'What statistical test should I use?',
      'How do I handle missing data?'
    ]
  };

  /**
   * Generate a single conversation scenario
   */
  async generateScenario(config: {
    topic: string;
    turns: number;
    difficulty: 'easy' | 'medium' | 'hard';
    memoryDependency: 'low' | 'medium' | 'high';
  }): Promise<ConversationScenario> {
    const scenarioId = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const turns = await this.generateTurns(config.topic, config.turns, config.difficulty);
    
    // Generate expected memory activations based on conversation content
    const expectedMemoryActivations = this.generateExpectedActivations(turns, config.memoryDependency);
    
    return {
      id: scenarioId,
      title: `${config.topic} conversation - ${config.difficulty} difficulty`,
      description: `A ${config.turns}-turn conversation about ${config.topic} with ${config.memoryDependency} memory dependency`,
      turns,
      topics: [config.topic, ...this.getRelatedTopics(config.topic)],
      expectedMemoryActivations,
      metadata: {
        difficulty: config.difficulty,
        memoryDependency: config.memoryDependency,
        topicVariation: this.determineTopicVariation(turns)
      }
    };
  }

  /**
   * Generate conversation turns for a scenario
   */
  async generateTurns(topic: string, turnCount: number, difficulty: string): Promise<ConversationTurn[]> {
    const turns: ConversationTurn[] = [];
    const templates = this.conversationTemplates[topic] || this.conversationTemplates['software development'];
    
    for (let i = 0; i < turnCount; i++) {
      const isUserTurn = i % 2 === 0;
      const turnId = `turn_${i + 1}`;
      
      let content: string;
      if (isUserTurn) {
        content = this.generateUserContent(templates, i, difficulty);
      } else {
        content = this.generateAssistantContent(topic, i, difficulty);
      }

      const context = await this.generateContextForTurn(content, topic, i);

      turns.push({
        id: turnId,
        speaker: isUserTurn ? 'user' : 'assistant',
        content,
        timestamp: new Date(Date.now() + i * 60000), // 1 minute between turns
        context
      });
    }

    return turns;
  }

  /**
   * Get predefined conversation topics
   */
  getConversationTopics(): string[] {
    return [...this.conversationTopics];
  }

  /**
   * Generate user content based on templates and difficulty
   */
  private generateUserContent(templates: string[], turnIndex: number, difficulty: string): string {
    const baseTemplate = templates[turnIndex % templates.length];
    
    switch (difficulty) {
      case 'easy':
        return baseTemplate;
      case 'medium':
        return `${baseTemplate} I've been working on this for a while and need some guidance.`;
      case 'hard':
        return `${baseTemplate} This is part of a complex system with multiple dependencies and constraints. I need to consider performance, security, and maintainability.`;
      default:
        return baseTemplate;
    }
  }

  /**
   * Generate assistant content based on topic and difficulty
   */
  private generateAssistantContent(topic: string, turnIndex: number, difficulty: string): string {
    const responses = {
      'easy': [
        'I can help you with that. Here\'s a straightforward approach:',
        'That\'s a good question. Let me explain the basics:',
        'Here\'s what I recommend for this situation:'
      ],
      'medium': [
        'This is an interesting challenge. Let me break it down into steps:',
        'There are several approaches to consider here. Let me walk through the options:',
        'This requires careful consideration of multiple factors:'
      ],
      'hard': [
        'This is a complex problem that requires a comprehensive solution. Let me analyze the various aspects:',
        'Given the constraints and requirements, we need to consider multiple architectural patterns:',
        'This is a sophisticated challenge that involves several interconnected systems:'
      ]
    };

    const responseTemplates = responses[difficulty as keyof typeof responses] || responses['easy'];
    const baseResponse = responseTemplates[turnIndex % responseTemplates.length];
    
    return `${baseResponse} [Detailed response about ${topic} would follow here]`;
  }

  /**
   * Generate context for a conversation turn
   */
  private async generateContextForTurn(content: string, topic: string, turnIndex: number): Promise<Context> {
    // Extract entities from content (simplified)
    const entities: Entity[] = this.extractEntitiesFromContent(content, topic);
    
    // Generate structural elements
    const structuralElements: StructuralElement[] = [
      {
        type: 'conversation_turn',
        content: content.substring(0, 50),
        position: turnIndex,
        metadata: { topic, turnIndex }
      }
    ];

    return {
      content,
      metadata: {
        topics: [topic, ...this.getRelatedTopics(topic).slice(0, 2)],
        entities,
        intent: turnIndex % 2 === 0 ? 'question' : 'response',
        temporalMarkers: [new Date()],
        structuralElements
      },
      embedding: {
        vector: this.generateMockEmbedding(content),
        model: 'mock-model',
        dimensions: 384
      },
      summary: content.length > 100 ? content.substring(0, 100) + '...' : content
    };
  }

  /**
   * Extract entities from content (simplified implementation)
   */
  private extractEntitiesFromContent(content: string, topic: string): Entity[] {
    const entities: Entity[] = [];
    
    // Add topic as an entity
    entities.push({
      name: topic,
      type: 'topic',
      confidence: 0.9
    });

    // Simple keyword extraction
    const keywords = ['code', 'system', 'data', 'project', 'feature', 'bug', 'test', 'performance'];
    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword)) {
        entities.push({
          name: keyword,
          type: 'concept',
          confidence: 0.7
        });
      }
    }

    return entities;
  }

  /**
   * Generate mock embedding vector for content
   */
  private generateMockEmbedding(content: string): number[] {
    // Generate a deterministic but varied embedding based on content
    const vector: number[] = [];
    const seed = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 0; i < 384; i++) {
      // Use a simple hash function to generate consistent but varied values
      const hash = (seed * (i + 1)) % 1000;
      vector.push((hash / 1000) * 2 - 1); // Normalize to [-1, 1]
    }
    
    return vector;
  }

  /**
   * Get related topics for a given topic
   */
  private getRelatedTopics(topic: string): string[] {
    const relatedTopics: Record<string, string[]> = {
      'software development': ['code review', 'testing strategies', 'debugging techniques'],
      'project management': ['software development', 'system architecture', 'performance optimization'],
      'data analysis': ['machine learning', 'database design', 'performance optimization'],
      'machine learning': ['data analysis', 'performance optimization', 'system architecture'],
      'system architecture': ['software development', 'performance optimization', 'security practices']
    };

    return relatedTopics[topic] || ['software development', 'system architecture'];
  }

  /**
   * Generate expected memory activations based on conversation content
   */
  private generateExpectedActivations(turns: ConversationTurn[], memoryDependency: string): string[] {
    const activations: string[] = [];
    
    // Extract key concepts that should trigger memory activations
    for (const turn of turns) {
      const concepts = this.extractKeyConceptsFromTurn(turn);
      activations.push(...concepts);
    }

    // Adjust based on memory dependency level
    const dependencyMultiplier = {
      'low': 0.3,
      'medium': 0.6,
      'high': 0.9
    };

    const targetCount = Math.floor(activations.length * dependencyMultiplier[memoryDependency as keyof typeof dependencyMultiplier]);
    return activations.slice(0, targetCount);
  }

  /**
   * Extract key concepts from a conversation turn
   */
  private extractKeyConceptsFromTurn(turn: ConversationTurn): string[] {
    const concepts: string[] = [];
    const content = turn.content.toLowerCase();
    
    // Technical concepts that should trigger memory
    const technicalTerms = [
      'algorithm', 'database', 'api', 'framework', 'library', 'pattern',
      'architecture', 'performance', 'security', 'testing', 'debugging',
      'optimization', 'scalability', 'maintainability'
    ];

    for (const term of technicalTerms) {
      if (content.includes(term)) {
        concepts.push(term);
      }
    }

    return concepts;
  }

  /**
   * Determine topic variation based on conversation turns
   */
  private determineTopicVariation(turns: ConversationTurn[]): 'single' | 'related' | 'diverse' {
    const topics = new Set<string>();
    
    for (const turn of turns) {
      if (turn.context?.metadata.topics) {
        turn.context.metadata.topics.forEach(topic => topics.add(topic));
      }
    }

    if (topics.size <= 2) return 'single';
    if (topics.size <= 4) return 'related';
    return 'diverse';
  }
}
import { 
  MemoryRepresentations, 
  Context, 
  Memory, 
  Metadata, 
  Summary, 
  EmbeddingVector 
} from '../types/core';
import { ContextProcessor } from './context-processor';
import { AISummaryGenerator } from './ai-summary-generator';
import { EmbeddingGenerator } from './embedding-generator';

/**
 * Memory Representation Generator - Integrates all representation generation
 * Combines summary, embedding, and metadata generation into unified pipeline
 * Validates Requirements 2.5
 */
export class MemoryRepresentationGenerator {
  private contextProcessor: ContextProcessor;
  private summaryGenerator: AISummaryGenerator;
  private embeddingGenerator: EmbeddingGenerator;

  constructor(
    embeddingModel: string = process.env.OPENAI_EMBEDDING_MODEL || 'openai/text-embedding-3-small',
    embeddingDimensions: number = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 384
  ) {
    this.contextProcessor = new ContextProcessor();
    this.summaryGenerator = new AISummaryGenerator();
    this.embeddingGenerator = new EmbeddingGenerator(embeddingModel, embeddingDimensions);
  }

  /**
   * Generate complete memory representations from content and context
   * Ensures all representations are generated and stored together
   * Validates Requirements 2.5
   */
  async generateRepresentations(
    content: string, 
    context?: Context
  ): Promise<MemoryRepresentations> {
    try {
      // Create context if not provided
      const workingContext = context || this.createBasicContext(content);

      // Generate all representations in parallel for efficiency
      const [metadata, summary, embedding] = await Promise.all([
        this.generateMetadata(workingContext),
        this.generateSummary(content, workingContext),
        this.generateEmbedding(content, workingContext)
      ]);

      return {
        metadata,
        summary,
        embedding
      };
    } catch (error) {
      throw new Error(`Failed to generate memory representations: ${error}`);
    }
  }

  /**
   * Generate representations for existing memory with full context
   */
  async generateMemoryRepresentations(memory: Memory): Promise<MemoryRepresentations> {
    const enhancedContext = this.createEnhancedContextFromMemory(memory);
    return this.generateRepresentations(memory.content, enhancedContext);
  }

  /**
   * Update representations when memory content changes
   * Regenerates all representations to maintain accuracy
   * Validates Requirements 2.4
   */
  async updateRepresentations(
    originalRepresentations: MemoryRepresentations,
    newContent: string,
    context?: Context
  ): Promise<MemoryRepresentations> {
    try {
      // For content updates, regenerate all representations
      const newRepresentations = await this.generateRepresentations(newContent, context);

      // Optionally preserve some metadata if content change is minor
      if (this.isMinorContentChange(originalRepresentations, newRepresentations)) {
        newRepresentations.metadata = this.mergeMetadata(
          originalRepresentations.metadata,
          newRepresentations.metadata
        );
      }

      return newRepresentations;
    } catch (error) {
      throw new Error(`Failed to update memory representations: ${error}`);
    }
  }

  /**
   * Generate representations in batch for multiple contents
   */
  async generateBatchRepresentations(
    contents: Array<{ content: string; context?: Context }>
  ): Promise<MemoryRepresentations[]> {
    const batchSize = 10; // Process in batches to avoid overwhelming the system
    const results: MemoryRepresentations[] = [];

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(({ content, context }) => 
          this.generateRepresentations(content, context)
        )
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Validate that all representations are consistent and complete
   */
  validateRepresentations(representations: MemoryRepresentations): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Validate metadata
    if (!representations.metadata) {
      issues.push('Missing metadata');
    } else {
      if (!Array.isArray(representations.metadata.topics)) {
        issues.push('Invalid metadata topics');
      }
      if (!Array.isArray(representations.metadata.entities)) {
        issues.push('Invalid metadata entities');
      }
      if (typeof representations.metadata.importance !== 'number' ||
          representations.metadata.importance < 0 || 
          representations.metadata.importance > 1) {
        issues.push('Invalid metadata importance score');
      }
    }

    // Validate summary
    if (!representations.summary) {
      issues.push('Missing summary');
    } else {
      if (!representations.summary.content || typeof representations.summary.content !== 'string') {
        issues.push('Invalid summary content');
      }
      if (!Array.isArray(representations.summary.keyInsights)) {
        issues.push('Invalid summary key insights');
      }
    }

    // Validate embedding
    if (!representations.embedding) {
      issues.push('Missing embedding');
    } else {
      if (!Array.isArray(representations.embedding.vector)) {
        issues.push('Invalid embedding vector');
      }
      if (representations.embedding.vector.length !== representations.embedding.dimensions) {
        issues.push('Embedding vector length does not match dimensions');
      }
      if (!representations.embedding.model) {
        issues.push('Missing embedding model information');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get pipeline configuration and status
   */
  getPipelineInfo(): {
    embeddingModel: string;
    embeddingDimensions: number;
    supportedModels: Array<{ name: string; dimensions: number; description: string }>;
  } {
    return {
      embeddingModel: this.embeddingGenerator['modelName'],
      embeddingDimensions: this.embeddingGenerator['dimensions'],
      supportedModels: this.embeddingGenerator.getSupportedModels()
    };
  }

  // Private helper methods

  private async generateMetadata(context: Context): Promise<Metadata> {
    return this.contextProcessor.extractMetadata(context);
  }

  private async generateSummary(content: string, context: Context): Promise<Summary> {
    return this.summaryGenerator.generateSummary(content, context);
  }

  private async generateEmbedding(content: string, context: Context): Promise<EmbeddingVector> {
    return this.embeddingGenerator.generateEmbedding(content, context);
  }

  private createBasicContext(content: string): Context {
    return {
      content,
      metadata: {
        topics: [],
        entities: [],
        intent: 'memory_storage',
        temporalMarkers: [new Date()],
        structuralElements: []
      },
      embedding: {
        vector: [],
        model: 'placeholder',
        dimensions: 0
      },
      summary: ''
    };
  }

  private createEnhancedContextFromMemory(memory: Memory): Context {
    return {
      content: memory.content,
      metadata: {
        topics: memory.metadata.topics,
        entities: memory.metadata.entities,
        intent: 'memory_update',
        temporalMarkers: [memory.timestamp, memory.lastAccessed],
        structuralElements: []
      },
      embedding: memory.embedding,
      summary: memory.summary.content
    };
  }

  private isMinorContentChange(
    original: MemoryRepresentations, 
    updated: MemoryRepresentations
  ): boolean {
    // Simple heuristic: if topics and entities are mostly the same, it's a minor change
    const originalTopics = new Set(original.metadata.topics);
    const updatedTopics = new Set(updated.metadata.topics);
    
    const topicOverlap = this.calculateSetOverlap(originalTopics, updatedTopics);
    
    const originalEntities = new Set(original.metadata.entities.map(e => e.name));
    const updatedEntities = new Set(updated.metadata.entities.map(e => e.name));
    
    const entityOverlap = this.calculateSetOverlap(originalEntities, updatedEntities);
    
    // Consider it minor if >70% overlap in both topics and entities
    return topicOverlap > 0.7 && entityOverlap > 0.7;
  }

  private mergeMetadata(original: Metadata, updated: Metadata): Metadata {
    // Merge metadata, favoring updated but preserving some original insights
    return {
      topics: [...new Set([...updated.topics, ...original.topics])].slice(0, 15),
      entities: this.mergeEntities(original.entities, updated.entities),
      concepts: [...new Set([...updated.concepts, ...original.concepts])].slice(0, 20),
      relationships: [...updated.relationships, ...original.relationships].slice(0, 25),
      importance: Math.max(original.importance, updated.importance) // Take higher importance
    };
  }

  private mergeEntities(
    originalEntities: Array<{ name: string; type: string; confidence: number }>,
    updatedEntities: Array<{ name: string; type: string; confidence: number }>
  ): Array<{ name: string; type: string; confidence: number }> {
    const entityMap = new Map<string, { name: string; type: string; confidence: number }>();
    
    // Add original entities
    originalEntities.forEach(entity => {
      entityMap.set(entity.name.toLowerCase(), entity);
    });
    
    // Add/update with new entities (higher confidence wins)
    updatedEntities.forEach(entity => {
      const key = entity.name.toLowerCase();
      const existing = entityMap.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        entityMap.set(key, entity);
      }
    });
    
    return Array.from(entityMap.values()).slice(0, 10);
  }

  private calculateSetOverlap<T>(set1: Set<T>, set2: Set<T>): number {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}
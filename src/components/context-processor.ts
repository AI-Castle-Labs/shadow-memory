import { 
  Context, 
  Metadata, 
  EmbeddingVector, 
  Summary, 
  Entity, 
  StructuralElement,
  Relationship
} from '../types/core';
import { IContextProcessor } from '../interfaces/context-processor';

/**
 * Context Processor implementation for analyzing and extracting metadata from context
 * Validates Requirements 1.1, 1.2, 1.3, 1.4
 */
export class ContextProcessor implements IContextProcessor {
  
  /**
   * Extract metadata from current context including topics, entities, intent, and temporal markers
   * Validates Requirements 1.1, 1.2, 1.3
   */
  extractMetadata(context: Context): Metadata {
    const topics = this.extractTopics(context.content);
    const entities = this.extractEntities(context.content);
    const concepts = this.extractConcepts(context.content);
    const relationships = this.extractRelationships(entities, concepts);
    const importance = this.calculateImportance(context.content, topics, entities);

    // Preserve hierarchical relationships from structured data
    if (context.metadata?.structuralElements) {
      const hierarchicalRelationships = this.preserveHierarchicalRelationships(
        context.metadata.structuralElements
      );
      relationships.push(...hierarchicalRelationships);
    }

    // Normalize metadata to consistent format
    return this.normalizeMetadata({
      topics,
      entities,
      concepts,
      relationships,
      importance
    });
  }

  /**
   * Generate embedding vector for context using semantic fingerprinting
   * Validates Requirements 1.4
   */
  async generateEmbedding(context: Context): Promise<EmbeddingVector> {
    // Generate semantic fingerprint that captures meaning beyond keywords
    const semanticFingerprint = this.generateSemanticFingerprint(context);
    
    // For now, create a mock embedding - in real implementation this would use
    // a pre-trained model like sentence-transformers or OpenAI embeddings
    const vector = this.createMockEmbedding(semanticFingerprint);
    
    return {
      vector,
      model: 'mock-semantic-model-v1',
      dimensions: vector.length
    };
  }

  /**
   * Generate semantic fingerprint that captures semantic meaning beyond keywords
   * Ensures similar contexts produce similar fingerprints
   * Validates Requirements 1.4
   */
  generateSemanticFingerprint(context: Context): string {
    // Extract multiple semantic dimensions
    const structuralFeatures = this.extractStructuralFeatures(context.content);
    const semanticFeatures = this.extractSemanticFeatures(context.content);
    const contextualFeatures = this.extractContextualFeatures(context);
    
    // Combine features into fingerprint
    const fingerprint = [
      structuralFeatures,
      semanticFeatures,
      contextualFeatures
    ].join('|');

    return fingerprint;
  }

  /**
   * Create contextual summary highlighting key information
   */
  async createSummary(context: Context): Promise<Summary> {
    const keyInsights = this.extractKeyInsights(context.content);
    const contextualRelevance = this.determineContextualRelevance(context);
    
    // Generate concise summary preserving critical information
    const summaryContent = this.generateSummaryContent(
      context.content, 
      keyInsights, 
      contextualRelevance
    );

    return {
      content: summaryContent,
      keyInsights,
      contextualRelevance
    };
  }

  /**
   * Process complete context and generate all representations
   */
  async processContext(context: Context): Promise<{
    metadata: Metadata;
    embedding: EmbeddingVector;
    summary: Summary;
  }> {
    const metadata = this.extractMetadata(context);
    const embedding = await this.generateEmbedding(context);
    const summary = await this.createSummary(context);

    return { metadata, embedding, summary };
  }

  // Private helper methods

  private extractTopics(content: string): string[] {
    // Simple topic extraction - in real implementation would use NLP libraries
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const topicCandidates = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .filter(word => /^[a-zA-Z]+$/.test(word));

    // Get most frequent words as topics
    const frequency = new Map<string, number>();
    topicCandidates.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractEntities(content: string): Entity[] {
    // Simple entity extraction - in real implementation would use NER models
    const entities: Entity[] = [];
    
    // Extract potential person names (capitalized words)
    const personMatches = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    personMatches.forEach(match => {
      if (match.split(' ').length <= 3) { // Reasonable name length
        entities.push({
          name: match,
          type: 'PERSON',
          confidence: 0.7
        });
      }
    });

    // Extract dates
    const dateMatches = content.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g) || [];
    dateMatches.forEach(match => {
      entities.push({
        name: match,
        type: 'DATE',
        confidence: 0.9
      });
    });

    return entities;
  }

  private extractConcepts(content: string): string[] {
    // Extract abstract concepts and technical terms
    const conceptPatterns = [
      /\b[a-z]+tion\b/gi, // words ending in -tion
      /\b[a-z]+ment\b/gi, // words ending in -ment  
      /\b[a-z]+ness\b/gi, // words ending in -ness
      /\b[a-z]+ity\b/gi,  // words ending in -ity
    ];

    const concepts = new Set<string>();
    
    conceptPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => concepts.add(match.toLowerCase()));
    });

    return Array.from(concepts).slice(0, 15);
  }

  private extractRelationships(entities: Entity[], concepts: string[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Create relationships between entities that appear close together
    for (let i = 0; i < entities.length - 1; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        relationships.push({
          source: entities[i].name,
          target: entities[j].name,
          type: 'CO_OCCURRENCE',
          strength: 0.5
        });
      }
    }

    return relationships.slice(0, 20); // Limit relationships
  }

  private preserveHierarchicalRelationships(elements: StructuralElement[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Create parent-child relationships based on position
    const sortedElements = [...elements].sort((a, b) => a.position - b.position);
    
    for (let i = 0; i < sortedElements.length - 1; i++) {
      const current = sortedElements[i];
      const next = sortedElements[i + 1];
      
      relationships.push({
        source: current.content,
        target: next.content,
        type: 'HIERARCHICAL',
        strength: 0.8
      });
    }

    return relationships;
  }

  private calculateImportance(content: string, topics: string[], entities: Entity[]): number {
    // Calculate importance based on content length, topic diversity, and entity count
    const contentScore = Math.min(content.length / 1000, 1.0); // Normalize by length
    const topicScore = Math.min(topics.length / 10, 1.0); // Normalize by topic count
    const entityScore = Math.min(entities.length / 5, 1.0); // Normalize by entity count
    
    return (contentScore + topicScore + entityScore) / 3;
  }

  private normalizeMetadata(metadata: Metadata): Metadata {
    // Normalize topics to lowercase and remove duplicates
    const normalizedTopics = [...new Set(metadata.topics.map(t => t.toLowerCase()))];
    
    // Normalize entity names and remove duplicates
    const entityMap = new Map<string, Entity>();
    metadata.entities.forEach(entity => {
      const normalizedName = entity.name.toLowerCase();
      if (!entityMap.has(normalizedName) || entityMap.get(normalizedName)!.confidence < entity.confidence) {
        entityMap.set(normalizedName, {
          ...entity,
          name: normalizedName
        });
      }
    });

    return {
      ...metadata,
      topics: normalizedTopics,
      entities: Array.from(entityMap.values()),
      concepts: [...new Set(metadata.concepts)],
      importance: Math.max(0, Math.min(1, metadata.importance)) // Clamp to [0,1]
    };
  }

  private extractStructuralFeatures(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    // Calculate structural ratios
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgSentencesPerParagraph = sentences.length / Math.max(paragraphs.length, 1);
    
    // Detect structural patterns
    const hasLists = /^\s*[-*•]\s/m.test(content);
    const hasNumbers = /\b\d+\b/.test(content);
    const hasQuotes = /["']/.test(content);
    
    return [
      Math.round(avgWordsPerSentence).toString(16),
      Math.round(avgSentencesPerParagraph).toString(16),
      hasLists ? '1' : '0',
      hasNumbers ? '1' : '0',
      hasQuotes ? '1' : '0'
    ].join('-');
  }

  private extractSemanticFeatures(content: string): string {
    // Analyze semantic patterns beyond keywords
    const words = content.toLowerCase().split(/\s+/);
    
    // Count semantic indicators
    const modalVerbs = ['can', 'could', 'may', 'might', 'must', 'should', 'will', 'would'];
    const modalCount = words.filter(w => modalVerbs.includes(w)).length;
    
    const emotionalWords = ['happy', 'sad', 'angry', 'excited', 'worried', 'confident'];
    const emotionalCount = words.filter(w => emotionalWords.includes(w)).length;
    
    const temporalWords = ['before', 'after', 'during', 'while', 'when', 'then', 'now', 'later'];
    const temporalCount = words.filter(w => temporalWords.includes(w)).length;
    
    const causalWords = ['because', 'since', 'therefore', 'thus', 'consequently', 'as a result'];
    const causalCount = words.filter(w => causalWords.some(cw => w.includes(cw))).length;
    
    // Calculate semantic complexity
    const uniqueWords = new Set(words).size;
    const lexicalDiversity = uniqueWords / Math.max(words.length, 1);
    
    return [
      modalCount.toString(16),
      emotionalCount.toString(16),
      temporalCount.toString(16),
      causalCount.toString(16),
      Math.round(lexicalDiversity * 100).toString(16)
    ].join('-');
  }

  private extractContextualFeatures(context: Context): string {
    // Extract features from context metadata
    const topicCount = context.metadata?.topics?.length || 0;
    const entityCount = context.metadata?.entities?.length || 0;
    const temporalMarkerCount = context.metadata?.temporalMarkers?.length || 0;
    
    // Analyze intent patterns
    const intent = context.metadata?.intent || '';
    const intentType = this.categorizeIntent(intent);
    
    // Structural element diversity
    const structuralTypes = new Set(
      context.metadata?.structuralElements?.map(e => e.type) || []
    ).size;
    
    return [
      topicCount.toString(16),
      entityCount.toString(16),
      temporalMarkerCount.toString(16),
      intentType,
      structuralTypes.toString(16)
    ].join('-');
  }

  private categorizeIntent(intent: string): string {
    const intentLower = intent.toLowerCase();
    
    if (intentLower.includes('question') || intentLower.includes('ask')) return 'Q';
    if (intentLower.includes('explain') || intentLower.includes('describe')) return 'E';
    if (intentLower.includes('request') || intentLower.includes('need')) return 'R';
    if (intentLower.includes('inform') || intentLower.includes('tell')) return 'I';
    if (intentLower.includes('command') || intentLower.includes('do')) return 'C';
    
    return 'U'; // Unknown
  }

  private createMockEmbedding(fingerprint: string): number[] {
    // Create deterministic mock embedding based on fingerprint
    // In real implementation, this would call an embedding service
    
    const dimensions = 384; // Common embedding dimension
    const vector: number[] = [];
    
    // Use fingerprint to seed pseudo-random generation
    let seed = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      seed += fingerprint.charCodeAt(i);
    }
    
    // Generate deterministic vector
    for (let i = 0; i < dimensions; i++) {
      seed = (seed * 9301 + 49297) % 233280; // Linear congruential generator
      vector.push((seed / 233280) * 2 - 1); // Normalize to [-1, 1]
    }
    
    // Normalize vector to unit length
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  private extractKeyInsights(content: string): string[] {
    const insights: string[] = [];
    
    // Extract sentences that might contain insights (questions, conclusions, etc.)
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    sentences.forEach(sentence => {
      // Look for insight patterns
      if (sentence.match(/\b(therefore|thus|consequently|as a result|in conclusion)\b/i)) {
        insights.push(sentence);
      }
      if (sentence.match(/\b(important|significant|key|crucial|critical)\b/i)) {
        insights.push(sentence);
      }
      if (sentence.includes('?')) {
        insights.push(sentence);
      }
    });

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private determineContextualRelevance(context: Context): string[] {
    const relevance: string[] = [];
    
    // Determine relevance based on context metadata
    if (context.metadata?.intent) {
      relevance.push(`Intent: ${context.metadata.intent}`);
    }
    
    if (context.metadata?.topics && context.metadata.topics.length > 0) {
      relevance.push(`Topics: ${context.metadata.topics.slice(0, 3).join(', ')}`);
    }
    
    if (context.metadata?.temporalMarkers && context.metadata.temporalMarkers.length > 0) {
      relevance.push(`Temporal context: ${context.metadata.temporalMarkers.length} time references`);
    }

    return relevance;
  }

  private generateSummaryContent(content: string, insights: string[], relevance: string[]): string {
    // Generate concise summary preserving critical information
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (sentences.length <= 2) {
      return content; // Already concise
    }
    
    // Take first sentence, any insight sentences, and last sentence
    const summarySentences = [
      sentences[0],
      ...insights.slice(0, 2),
      sentences[sentences.length - 1]
    ];
    
    // Remove duplicates and join
    const uniqueSentences = [...new Set(summarySentences)];
    return uniqueSentences.join('. ') + '.';
  }
}
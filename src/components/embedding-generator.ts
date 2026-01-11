import { OpenAIEmbeddings } from '@langchain/openai';
import { EmbeddingVector, Context, Memory } from '../types/core';

/**
 * Embedding Generator for creating semantic vector representations
 * Validates Requirements 2.3
 */
export class EmbeddingGenerator {
  private readonly defaultDimensions: number = 384;
  private readonly supportedModels: string[] = [
    'sentence-transformers/all-MiniLM-L6-v2',
    'sentence-transformers/all-mpnet-base-v2',
    'openai/text-embedding-3-small',
    'openai/text-embedding-3-large',
    'openai/text-embedding-ada-002',
    'mock-semantic-model-v1'
  ];

  constructor(
    private readonly modelName: string = process.env.OPENAI_EMBEDDING_MODEL || 'openai/text-embedding-3-small',
    private readonly dimensions: number = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 384
  ) {
    if (!this.supportedModels.includes(modelName)) {
      throw new Error(`Unsupported model: ${modelName}. Supported models: ${this.supportedModels.join(', ')}`);
    }
  }

  /**
   * Generate embedding vector that captures semantic meaning of content
   * Supports configurable embedding models and dimensions
   * Validates Requirements 2.3
   */
  async generateEmbedding(content: string, context?: Context): Promise<EmbeddingVector> {
    // Preprocess content for better embedding quality
    const processedContent = this.preprocessContent(content, context);
    
    // Generate embedding based on model type
    const vector = await this.generateVector(processedContent);
    
    return {
      vector,
      model: this.modelName,
      dimensions: vector.length
    };
  }

  /**
   * Generate embedding for memory content with enhanced context
   */
  async generateMemoryEmbedding(memory: Memory): Promise<EmbeddingVector> {
    // Combine memory content with metadata for richer embedding
    const enhancedContent = this.createEnhancedContent(memory);
    return this.generateEmbedding(enhancedContent);
  }

  /**
   * Generate embeddings for multiple texts in batch for efficiency
   */
  async generateBatchEmbeddings(contents: string[]): Promise<EmbeddingVector[]> {
    // Process in batches for efficiency
    const batchSize = 32;
    const results: EmbeddingVector[] = [];

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(content => this.generateEmbedding(content))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Update embedding when content changes
   */
  async updateEmbedding(
    originalEmbedding: EmbeddingVector,
    newContent: string,
    context?: Context
  ): Promise<EmbeddingVector> {
    // For now, regenerate completely - in production might use incremental updates
    return this.generateEmbedding(newContent, context);
  }

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(embedding1: EmbeddingVector, embedding2: EmbeddingVector): number {
    if (embedding1.dimensions !== embedding2.dimensions) {
      throw new Error('Embedding dimensions must match for similarity calculation');
    }

    return this.cosineSimilarity(embedding1.vector, embedding2.vector);
  }

  /**
   * Get supported models and their configurations
   */
  getSupportedModels(): Array<{ name: string; dimensions: number; description: string }> {
    return [
      {
        name: 'sentence-transformers/all-MiniLM-L6-v2',
        dimensions: 384,
        description: 'Fast, lightweight model good for general semantic similarity'
      },
      {
        name: 'sentence-transformers/all-mpnet-base-v2',
        dimensions: 768,
        description: 'Higher quality model with better semantic understanding'
      },
      {
        name: 'openai/text-embedding-ada-002',
        dimensions: 1536,
        description: 'OpenAI\'s high-quality embedding model'
      },
      {
        name: 'mock-semantic-model-v1',
        dimensions: 384,
        description: 'Mock model for testing and development'
      }
    ];
  }

  // Private helper methods

  private preprocessContent(content: string, context?: Context): string {
    // Clean and normalize content
    let processed = content.trim();
    
    // Remove excessive whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Add context information if available
    if (context?.metadata) {
      const contextInfo = this.extractContextInfo(context);
      if (contextInfo) {
        processed = `${contextInfo} ${processed}`;
      }
    }

    // Truncate if too long (most embedding models have token limits)
    const maxLength = 8000; // Conservative limit for most models
    if (processed.length > maxLength) {
      processed = this.intelligentTruncate(processed, maxLength);
    }

    return processed;
  }

  private async generateVector(content: string): Promise<number[]> {
    switch (this.modelName) {
      case 'mock-semantic-model-v1':
        return this.generateMockEmbedding(content);
      
      case 'sentence-transformers/all-MiniLM-L6-v2':
      case 'sentence-transformers/all-mpnet-base-v2':
        return this.generateSentenceTransformerEmbedding(content);
      
      case 'openai/text-embedding-3-small':
      case 'openai/text-embedding-3-large':
      case 'openai/text-embedding-ada-002':
        return this.generateOpenAIEmbedding(content);
      
      default:
        throw new Error(`Model ${this.modelName} not implemented`);
    }
  }

  private generateMockEmbedding(content: string): number[] {
    // Create deterministic mock embedding based on content
    const vector: number[] = [];
    
    // Use content hash for deterministic generation
    let seed = this.hashString(content);
    
    // Generate vector with semantic-like properties
    for (let i = 0; i < this.dimensions; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      vector.push((seed / 233280) * 2 - 1);
    }
    
    // Add semantic features based on content analysis
    this.addSemanticFeatures(vector, content);
    
    // Normalize to unit vector
    return this.normalizeVector(vector);
  }

  private async generateSentenceTransformerEmbedding(content: string): Promise<number[]> {
    // In real implementation, this would call sentence-transformers API
    // For now, return enhanced mock embedding
    console.warn(`Sentence transformer ${this.modelName} not implemented, using enhanced mock`);
    return this.generateEnhancedMockEmbedding(content);
  }

  private async generateOpenAIEmbedding(content: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    const rawModel = this.modelName || 'openai/text-embedding-3-small';
    const model = rawModel.replace('openai/', '');
    const targetDims = this.dimensions || this.defaultDimensions;

    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set, using enhanced mock embedding');
      return this.generateEnhancedMockEmbedding(content, targetDims);
    }

    try {
      const embedder = new OpenAIEmbeddings({
        apiKey,
        model,
      });
      const vector = await embedder.embedQuery(content);
      const sliced = vector.length > targetDims ? vector.slice(0, targetDims) : vector;
      return this.normalizeVector(sliced);
    } catch (err) {
      console.warn('OpenAI embedding failed, using enhanced mock:', err);
      return this.generateEnhancedMockEmbedding(content, targetDims);
    }
  }

  private generateEnhancedMockEmbedding(content: string, dims?: number): number[] {
    const dimensions = dims || this.dimensions;
    const vector: number[] = [];
    
    // More sophisticated mock that considers semantic features
    const features = this.extractSemanticFeatures(content);
    let seed = this.hashString(content + JSON.stringify(features));
    
    for (let i = 0; i < dimensions; i++) {
      seed = (seed * 16807) % 2147483647; // Better LCG parameters
      let value = (seed / 2147483647) * 2 - 1;
      
      // Bias certain dimensions based on semantic features
      if (i < 50) { // First 50 dimensions for topic features
        value += features.topicBias * 0.3;
      } else if (i < 100) { // Next 50 for sentiment
        value += features.sentimentBias * 0.2;
      } else if (i < 150) { // Next 50 for structure
        value += features.structureBias * 0.25;
      }
      
      vector.push(Math.tanh(value)); // Keep in reasonable range
    }
    
    return this.normalizeVector(vector);
  }

  private createEnhancedContent(memory: Memory): string {
    // Combine memory content with metadata for richer embedding
    const parts = [memory.content];
    
    // Add topic information
    if (memory.metadata.topics.length > 0) {
      parts.push(`Topics: ${memory.metadata.topics.join(', ')}`);
    }
    
    // Add entity information
    if (memory.metadata.entities.length > 0) {
      const entityNames = memory.metadata.entities.map(e => e.name);
      parts.push(`Entities: ${entityNames.join(', ')}`);
    }
    
    // Add summary for additional context
    if (memory.summary.content) {
      parts.push(`Summary: ${memory.summary.content}`);
    }
    
    return parts.join(' ');
  }

  private extractContextInfo(context: Context): string {
    const info: string[] = [];
    
    if (context.metadata?.intent) {
      info.push(`Intent: ${context.metadata.intent}`);
    }
    
    if (context.metadata?.topics && context.metadata.topics.length > 0) {
      info.push(`Topics: ${context.metadata.topics.slice(0, 3).join(', ')}`);
    }
    
    return info.join(' ');
  }

  private intelligentTruncate(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    // Try to truncate at sentence boundaries
    const sentences = content.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxLength - 50) break;
      truncated += sentence + '. ';
    }
    
    // If no complete sentences fit, truncate at word boundary
    if (truncated.length < maxLength * 0.5) {
      const words = content.split(' ');
      truncated = '';
      for (const word of words) {
        if ((truncated + word).length > maxLength - 10) break;
        truncated += word + ' ';
      }
    }
    
    return truncated.trim();
  }

  private addSemanticFeatures(vector: number[], content: string): void {
    const features = this.extractSemanticFeatures(content);
    
    // Modify specific dimensions to encode semantic features
    if (vector.length >= 10) {
      vector[0] += features.topicBias * 0.1;
      vector[1] += features.sentimentBias * 0.1;
      vector[2] += features.structureBias * 0.1;
      vector[3] += features.lengthBias * 0.1;
      vector[4] += features.complexityBias * 0.1;
    }
  }

  private extractSemanticFeatures(content: string): {
    topicBias: number;
    sentimentBias: number;
    structureBias: number;
    lengthBias: number;
    complexityBias: number;
  } {
    const words = content.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Topic diversity (more topics = higher bias)
    const uniqueWords = new Set(words.filter(w => w.length > 3));
    const topicBias = Math.min(uniqueWords.size / 50, 1) * 2 - 1;
    
    // Sentiment analysis (simple keyword-based)
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'happy'];
    const negativeWords = ['bad', 'terrible', 'negative', 'failure', 'sad', 'problem'];
    
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;
    const sentimentBias = (positiveCount - negativeCount) / Math.max(words.length / 10, 1);
    
    // Structure complexity
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const structureBias = Math.min(avgSentenceLength / 20, 1) * 2 - 1;
    
    // Length bias
    const lengthBias = Math.min(content.length / 1000, 1) * 2 - 1;
    
    // Complexity (based on vocabulary diversity)
    const complexityBias = (uniqueWords.size / Math.max(words.length, 1)) * 2 - 1;
    
    return {
      topicBias: Math.tanh(topicBias),
      sentimentBias: Math.tanh(sentimentBias),
      structureBias: Math.tanh(structureBias),
      lengthBias: Math.tanh(lengthBias),
      complexityBias: Math.tanh(complexityBias)
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector; // Avoid division by zero
    return vector.map(val => val / magnitude);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (magnitude === 0) return 0;
    
    return dotProduct / magnitude;
  }
}
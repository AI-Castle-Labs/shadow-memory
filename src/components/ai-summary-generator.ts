import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Summary, Context, Memory } from '../types/core';

/**
 * AI Summary Generator for creating intelligent summaries of memories
 * Validates Requirements 2.1, 2.2
 */
export class AISummaryGenerator {
  private openAIModel: string;

  constructor(config?: { model?: string }) {
    this.openAIModel = config?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  }

  /**
   * Generate AI-created summary highlighting key context and insights
   * Preserves critical information while reducing content size
   * Validates Requirements 2.1, 2.2
   */
  async generateSummary(content: string, context?: Context): Promise<Summary> {
    const llmSummary = await this.generateSummaryWithOpenAI(content, context);
    if (llmSummary) {
      return llmSummary;
    }

    const keyInsights = this.extractKeyInsights(content);
    const contextualRelevance = this.determineContextualRelevance(content, context);
    const summaryContent = this.generateSummaryContent(content, keyInsights);

    return {
      content: summaryContent,
      keyInsights,
      contextualRelevance
    };
  }

  /**
   * Generate summary for existing memory with full context
   */
  async generateMemorySummary(memory: Memory): Promise<Summary> {
    // Use memory content and metadata for enhanced summary generation
    const enhancedContext = this.createEnhancedContext(memory);
    return this.generateSummary(memory.content, enhancedContext);
  }

  /**
   * Update existing summary when memory content changes
   * Preserves relevant insights while incorporating new information
   */
  async updateSummary(
    originalSummary: Summary, 
    newContent: string, 
    context?: Context
  ): Promise<Summary> {
    const newSummary = await this.generateSummary(newContent, context);
    
    // Merge insights, preserving important ones from original
    const mergedInsights = this.mergeInsights(originalSummary.keyInsights, newSummary.keyInsights);
    
    // Update contextual relevance
    const updatedRelevance = this.updateContextualRelevance(
      originalSummary.contextualRelevance,
      newSummary.contextualRelevance
    );

    return {
      content: newSummary.content,
      keyInsights: mergedInsights,
      contextualRelevance: updatedRelevance
    };
  }

  private async generateSummaryWithOpenAI(content: string, context?: Context): Promise<Summary | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const model = new ChatOpenAI({
        modelName: this.openAIModel,
        openAIApiKey: apiKey,
        temperature: 0.3,
      });

      const systemPrompt = `You are a concise summarization assistant. Given text content, produce a JSON object with:
- "content": a 1-3 sentence summary capturing the main point
- "keyInsights": an array of up to 5 short insight strings
- "contextualRelevance": an array of up to 5 relevance tags (e.g., topics, entities, intent)

Respond ONLY with valid JSON, no markdown fences.`;

      const userPrompt = context
        ? `Summarize the following content. Context topics: ${context.metadata?.topics?.join(', ') || 'none'}. Intent: ${context.metadata?.intent || 'unknown'}.\n\nContent:\n${content}`
        : `Summarize the following content:\n\n${content}`;

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const parsed = JSON.parse(text) as { content: string; keyInsights: string[]; contextualRelevance: string[] };

      return {
        content: parsed.content ?? '',
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.slice(0, 5) : [],
        contextualRelevance: Array.isArray(parsed.contextualRelevance) ? parsed.contextualRelevance.slice(0, 8) : [],
      };
    } catch {
      return null;
    }
  }

  // Private helper methods

  private extractKeyInsights(content: string): string[] {
    const insights: string[] = [];
    const sentences = this.splitIntoSentences(content);

    // Extract different types of insights
    insights.push(...this.extractConclusionInsights(sentences));
    insights.push(...this.extractQuestionInsights(sentences));
    insights.push(...this.extractImportanceInsights(sentences));
    insights.push(...this.extractCausalInsights(sentences));
    insights.push(...this.extractComparativeInsights(sentences));

    // Rank and limit insights
    const rankedInsights = this.rankInsightsByImportance(insights, content);
    return rankedInsights.slice(0, 5); // Limit to top 5 insights
  }

  private determineContextualRelevance(content: string, context?: Context): string[] {
    const relevance: string[] = [];

    // Analyze content-based relevance
    relevance.push(...this.analyzeTopicalRelevance(content));
    relevance.push(...this.analyzeTemporalRelevance(content));
    relevance.push(...this.analyzeEntityRelevance(content));

    // Add context-based relevance if available
    if (context) {
      relevance.push(...this.analyzeContextualRelevance(content, context));
    }

    return relevance.slice(0, 8); // Limit relevance indicators
  }

  private generateSummaryContent(content: string, insights: string[]): string {
    if (!content || content.trim().length === 0) {
      return 'Empty content'; // Provide minimal valid summary for empty content
    }

    const sentences = this.splitIntoSentences(content);
    
    if (sentences.length <= 2) {
      return content; // Already concise
    }

    // Extract summary using multiple strategies
    const importantSentences = this.extractImportantSentences(sentences, content);
    const insightSentences = this.extractInsightSentences(sentences, insights);
    
    // Combine and deduplicate
    const summarySentences = new Set([
      ...importantSentences.slice(0, 2),
      ...insightSentences.slice(0, 2),
      sentences[0], // First sentence for context
      sentences[sentences.length - 1] // Last sentence for conclusion
    ]);

    // Create coherent summary
    const orderedSentences = this.orderSentencesCoherently(
      Array.from(summarySentences),
      sentences
    );

    return this.formatSummary(orderedSentences);
  }

  private createEnhancedContext(memory: Memory): Context {
    return {
      content: memory.content,
      metadata: {
        topics: memory.metadata.topics,
        entities: memory.metadata.entities,
        intent: 'memory_summarization',
        temporalMarkers: [memory.timestamp],
        structuralElements: []
      },
      embedding: memory.embedding,
      summary: memory.summary.content
    };
  }

  private mergeInsights(originalInsights: string[], newInsights: string[]): string[] {
    // Combine insights, prioritizing new ones but preserving important original ones
    const insightMap = new Map<string, { text: string; score: number }>();

    // Score original insights (lower score = older)
    originalInsights.forEach((insight, index) => {
      const key = this.normalizeInsight(insight);
      insightMap.set(key, { text: insight, score: index });
    });

    // Score new insights (higher score = newer, more important)
    newInsights.forEach((insight, index) => {
      const key = this.normalizeInsight(insight);
      const score = 1000 + (newInsights.length - index); // Prioritize new insights
      
      if (!insightMap.has(key) || insightMap.get(key)!.score < score) {
        insightMap.set(key, { text: insight, score });
      }
    });

    // Return top insights sorted by score
    return Array.from(insightMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.text);
  }

  private updateContextualRelevance(
    originalRelevance: string[], 
    newRelevance: string[]
  ): string[] {
    // Merge relevance indicators, keeping most recent and important ones
    const relevanceSet = new Set([...newRelevance, ...originalRelevance]);
    return Array.from(relevanceSet).slice(0, 8);
  }

  private splitIntoSentences(content: string): string[] {
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private extractConclusionInsights(sentences: string[]): string[] {
    const conclusionPatterns = [
      /\b(therefore|thus|consequently|as a result|in conclusion|finally)\b/i,
      /\b(this shows|this demonstrates|this indicates|this suggests)\b/i,
      /\b(we can conclude|it follows that|this means)\b/i
    ];

    return sentences.filter(sentence =>
      conclusionPatterns.some(pattern => pattern.test(sentence))
    );
  }

  private extractQuestionInsights(sentences: string[]): string[] {
    return sentences.filter(sentence => 
      sentence.includes('?') && sentence.length > 10
    );
  }

  private extractImportanceInsights(sentences: string[]): string[] {
    const importancePatterns = [
      /\b(important|significant|key|crucial|critical|essential|vital)\b/i,
      /\b(note that|remember that|keep in mind)\b/i,
      /\b(warning|caution|attention)\b/i
    ];

    return sentences.filter(sentence =>
      importancePatterns.some(pattern => pattern.test(sentence))
    );
  }

  private extractCausalInsights(sentences: string[]): string[] {
    const causalPatterns = [
      /\b(because|since|due to|caused by|results from)\b/i,
      /\b(leads to|results in|causes|triggers)\b/i,
      /\b(if.*then|when.*then)\b/i
    ];

    return sentences.filter(sentence =>
      causalPatterns.some(pattern => pattern.test(sentence))
    );
  }

  private extractComparativeInsights(sentences: string[]): string[] {
    const comparativePatterns = [
      /\b(better than|worse than|similar to|different from)\b/i,
      /\b(compared to|in contrast|however|although|while)\b/i,
      /\b(more|less|faster|slower|higher|lower)\b.*\b(than)\b/i
    ];

    return sentences.filter(sentence =>
      comparativePatterns.some(pattern => pattern.test(sentence))
    );
  }

  private rankInsightsByImportance(insights: string[], content: string): string[] {
    return insights
      .map(insight => ({
        text: insight,
        score: this.calculateInsightScore(insight, content)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.text);
  }

  private calculateInsightScore(insight: string, content: string): number {
    let score = 0;

    // Length factor (moderate length preferred)
    const length = insight.length;
    if (length >= 20 && length <= 150) score += 10;

    // Position factor (insights near beginning or end are often important)
    const position = content.indexOf(insight) / content.length;
    if (position < 0.2 || position > 0.8) score += 5;

    // Keyword importance
    const importantKeywords = [
      'important', 'key', 'crucial', 'significant', 'therefore', 'because',
      'result', 'conclusion', 'shows', 'demonstrates', 'indicates'
    ];
    
    importantKeywords.forEach(keyword => {
      if (insight.toLowerCase().includes(keyword)) score += 3;
    });

    // Question bonus
    if (insight.includes('?')) score += 5;

    return score;
  }

  private analyzeTopicalRelevance(content: string): string[] {
    const topics = this.extractTopics(content);
    return topics.length > 0 ? [`Topics: ${topics.slice(0, 3).join(', ')}`] : [];
  }

  private analyzeTemporalRelevance(content: string): string[] {
    const temporalMarkers = this.extractTemporalMarkers(content);
    return temporalMarkers.length > 0 ? [`Temporal: ${temporalMarkers.length} time references`] : [];
  }

  private analyzeEntityRelevance(content: string): string[] {
    const entities = this.extractEntities(content);
    return entities.length > 0 ? [`Entities: ${entities.slice(0, 2).join(', ')}`] : [];
  }

  private analyzeContextualRelevance(content: string, context: Context): string[] {
    const relevance: string[] = [];

    if (context.metadata?.intent) {
      relevance.push(`Intent: ${context.metadata.intent}`);
    }

    if (context.metadata?.topics && context.metadata.topics.length > 0) {
      const topicOverlap = this.calculateTopicOverlap(content, context.metadata.topics);
      if (topicOverlap > 0) {
        relevance.push(`Topic overlap: ${topicOverlap} shared topics`);
      }
    }

    return relevance;
  }

  private extractImportantSentences(sentences: string[], content: string): string[] {
    return sentences
      .map(sentence => ({
        text: sentence,
        score: this.calculateSentenceImportance(sentence, content)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.text);
  }

  private extractInsightSentences(sentences: string[], insights: string[]): string[] {
    // Find sentences that contain or relate to key insights
    return sentences.filter(sentence =>
      insights.some(insight => 
        this.calculateSimilarity(sentence, insight) > 0.3
      )
    );
  }

  private orderSentencesCoherently(summarySentences: string[], originalSentences: string[]): string[] {
    // Maintain original order for coherence
    return originalSentences.filter(sentence => 
      summarySentences.includes(sentence)
    );
  }

  private formatSummary(sentences: string[]): string {
    if (sentences.length === 0) return 'No content to summarize';
    
    // Ensure proper sentence endings and joining
    const formattedSentences = sentences.map(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return '';
      if (!/[.!?]$/.test(trimmed)) {
        return trimmed + '.';
      }
      return trimmed;
    }).filter(s => s.length > 0);

    return formattedSentences.length > 0 ? formattedSentences.join(' ') : 'No content to summarize';
  }

  private normalizeInsight(insight: string): string {
    return insight.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }

  private calculateSentenceImportance(sentence: string, content: string): number {
    let score = 0;

    // Position scoring
    const position = content.indexOf(sentence) / content.length;
    if (position < 0.1) score += 10; // First 10%
    if (position > 0.9) score += 8;  // Last 10%

    // Length scoring (prefer moderate length)
    const length = sentence.length;
    if (length >= 30 && length <= 120) score += 5;

    // Keyword scoring
    const importantWords = ['key', 'important', 'main', 'primary', 'significant'];
    importantWords.forEach(word => {
      if (sentence.toLowerCase().includes(word)) score += 3;
    });

    return score;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction (in real implementation, would use NLP)
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const candidates = words
      .filter(word => word.length > 4 && !stopWords.has(word))
      .filter(word => /^[a-zA-Z]+$/.test(word));

    const frequency = new Map<string, number>();
    candidates.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractTemporalMarkers(content: string): string[] {
    const temporalPatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(yesterday|today|tomorrow|now|then|before|after|during|while)\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
    ];

    const markers: string[] = [];
    temporalPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      markers.push(...matches);
    });

    return [...new Set(markers)].slice(0, 5);
  }

  private extractEntities(content: string): string[] {
    // Simple entity extraction (in real implementation, would use NER)
    const entities: string[] = [];
    
    // Extract capitalized words (potential proper nouns)
    const properNouns = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    entities.push(...properNouns.filter(noun => noun.split(' ').length <= 2));

    return [...new Set(entities)].slice(0, 5);
  }

  private calculateTopicOverlap(content: string, contextTopics: string[]): number {
    const contentTopics = this.extractTopics(content);
    const overlap = contentTopics.filter(topic => 
      contextTopics.some(ctopic => 
        ctopic.toLowerCase().includes(topic) || topic.includes(ctopic.toLowerCase())
      )
    );
    return overlap.length;
  }
}
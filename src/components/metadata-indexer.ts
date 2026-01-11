import { MemoryId, Metadata, Entity, Relationship } from '../types/core';

export class MetadataIndexer {
  private topicIndex: Map<string, Set<MemoryId>> = new Map();
  private conceptIndex: Map<string, Set<MemoryId>> = new Map();
  private entityIndex: Map<string, Set<MemoryId>> = new Map();
  private relationshipIndex: Map<string, Set<MemoryId>> = new Map();
  private timeIndex: Map<number, Set<MemoryId>> = new Map();
  private importanceIndex: Map<number, Set<MemoryId>> = new Map();

  addToIndex(memoryId: MemoryId, metadata: Metadata, timestamp?: Date): void {
    for (const topic of metadata.topics) {
      this.addToTopicIndex(topic, memoryId);
    }

    for (const concept of metadata.concepts) {
      this.addToConceptIndex(concept, memoryId);
    }

    for (const entity of metadata.entities) {
      this.addToEntityIndex(entity, memoryId);
    }

    for (const relationship of metadata.relationships) {
      this.addToRelationshipIndex(relationship, memoryId);
    }

    if (timestamp) {
      const dayKey = this.getDayKey(timestamp);
      this.addToTimeIndex(dayKey, memoryId);
    }

    const importanceBucket = Math.floor(metadata.importance * 10);
    this.addToImportanceIndex(importanceBucket, memoryId);
  }

  removeFromIndex(memoryId: MemoryId, metadata: Metadata, timestamp?: Date): void {
    for (const topic of metadata.topics) {
      this.removeFromTopicIndex(topic, memoryId);
    }

    for (const concept of metadata.concepts) {
      this.removeFromConceptIndex(concept, memoryId);
    }

    for (const entity of metadata.entities) {
      this.removeFromEntityIndex(entity, memoryId);
    }

    for (const relationship of metadata.relationships) {
      this.removeFromRelationshipIndex(relationship, memoryId);
    }

    if (timestamp) {
      const dayKey = this.getDayKey(timestamp);
      this.removeFromTimeIndex(dayKey, memoryId);
    }

    const importanceBucket = Math.floor(metadata.importance * 10);
    this.removeFromImportanceIndex(importanceBucket, memoryId);
  }

  private addToTopicIndex(topic: string, memoryId: MemoryId): void {
    if (!this.topicIndex.has(topic)) {
      this.topicIndex.set(topic, new Set());
    }
    this.topicIndex.get(topic)!.add(memoryId);
  }

  private removeFromTopicIndex(topic: string, memoryId: MemoryId): void {
    const set = this.topicIndex.get(topic);
    if (set) {
      set.delete(memoryId);
      if (set.size === 0) {
        this.topicIndex.delete(topic);
      }
    }
  }

  private addToConceptIndex(concept: string, memoryId: MemoryId): void {
    if (!this.conceptIndex.has(concept)) {
      this.conceptIndex.set(concept, new Set());
    }
    this.conceptIndex.get(concept)!.add(memoryId);
  }

  private removeFromConceptIndex(concept: string, memoryId: MemoryId): void {
    const set = this.conceptIndex.get(concept);
    if (set) {
      set.delete(memoryId);
      if (set.size === 0) {
        this.conceptIndex.delete(concept);
      }
    }
  }

  private addToEntityIndex(entity: Entity, memoryId: MemoryId): void {
    const key = `${entity.type}:${entity.name}`;
    if (!this.entityIndex.has(key)) {
      this.entityIndex.set(key, new Set());
    }
    this.entityIndex.get(key)!.add(memoryId);
  }

  private removeFromEntityIndex(entity: Entity, memoryId: MemoryId): void {
    const key = `${entity.type}:${entity.name}`;
    const set = this.entityIndex.get(key);
    if (set) {
      set.delete(memoryId);
      if (set.size === 0) {
        this.entityIndex.delete(key);
      }
    }
  }

  private addToRelationshipIndex(relationship: Relationship, memoryId: MemoryId): void {
    const key = `${relationship.source}:${relationship.type}:${relationship.target}`;
    if (!this.relationshipIndex.has(key)) {
      this.relationshipIndex.set(key, new Set());
    }
    this.relationshipIndex.get(key)!.add(memoryId);
  }

  private removeFromRelationshipIndex(relationship: Relationship, memoryId: MemoryId): void {
    const key = `${relationship.source}:${relationship.type}:${relationship.target}`;
    const set = this.relationshipIndex.get(key);
    if (set) {
      set.delete(memoryId);
      if (set.size === 0) {
        this.relationshipIndex.delete(key);
      }
    }
  }

  private getDayKey(date: Date): number {
    return Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
  }

  private addToTimeIndex(dayKey: number, memoryId: MemoryId): void {
    if (!this.timeIndex.has(dayKey)) {
      this.timeIndex.set(dayKey, new Set());
    }
    this.timeIndex.get(dayKey)!.add(memoryId);
  }

  private removeFromTimeIndex(dayKey: number, memoryId: MemoryId): void {
    const set = this.timeIndex.get(dayKey);
    if (set) {
      set.delete(memoryId);
      if (set.size === 0) {
        this.timeIndex.delete(dayKey);
      }
    }
  }

  private addToImportanceIndex(bucket: number, memoryId: MemoryId): void {
    if (!this.importanceIndex.has(bucket)) {
      this.importanceIndex.set(bucket, new Set());
    }
    this.importanceIndex.get(bucket)!.add(memoryId);
  }

  private removeFromImportanceIndex(bucket: number, memoryId: MemoryId): void {
    const set = this.importanceIndex.get(bucket);
    if (set) {
      set.delete(memoryId);
      if (set.size === 0) {
        this.importanceIndex.delete(bucket);
      }
    }
  }

  searchByTopics(topics: string[]): MemoryId[] {
    const results = new Set<MemoryId>();
    for (const topic of topics) {
      const memoryIds = this.topicIndex.get(topic);
      if (memoryIds) {
        for (const id of memoryIds) {
          results.add(id);
        }
      }
    }
    return Array.from(results);
  }

  searchByConcepts(concepts: string[]): MemoryId[] {
    const results = new Set<MemoryId>();
    for (const concept of concepts) {
      const memoryIds = this.conceptIndex.get(concept);
      if (memoryIds) {
        for (const id of memoryIds) {
          results.add(id);
        }
      }
    }
    return Array.from(results);
  }

  searchByTimeRange(start: Date, end: Date): MemoryId[] {
    const results = new Set<MemoryId>();
    const startDay = this.getDayKey(start);
    const endDay = this.getDayKey(end);
    
    for (const [dayKey, memoryIds] of this.timeIndex) {
      if (dayKey >= startDay && dayKey <= endDay) {
        for (const id of memoryIds) {
          results.add(id);
        }
      }
    }
    return Array.from(results);
  }

  searchByImportance(minImportance: number, maxImportance: number = 1.0): MemoryId[] {
    const results = new Set<MemoryId>();
    const minBucket = Math.floor(minImportance * 10);
    const maxBucket = Math.floor(maxImportance * 10);
    
    for (const [bucket, memoryIds] of this.importanceIndex) {
      if (bucket >= minBucket && bucket <= maxBucket) {
        for (const id of memoryIds) {
          results.add(id);
        }
      }
    }
    return Array.from(results);
  }

  getHighImportanceMemories(threshold: number = 0.7): MemoryId[] {
    return this.searchByImportance(threshold, 1.0);
  }

  complexSearch(criteria: {
    topics?: string[];
    concepts?: string[];
    entities?: Entity[];
    minImportance?: number;
    timeRange?: { start: Date; end: Date };
  }): MemoryId[] {
    let results: Set<MemoryId> | null = null;

    if (criteria.topics && criteria.topics.length > 0) {
      const topicResults = new Set(this.searchByTopics(criteria.topics));
      results = results ? this.intersect(results, topicResults) : topicResults;
    }

    if (criteria.concepts && criteria.concepts.length > 0) {
      const conceptResults = new Set(this.searchByConcepts(criteria.concepts));
      results = results ? this.intersect(results, conceptResults) : conceptResults;
    }

    if (criteria.entities && criteria.entities.length > 0) {
      const entityResults = new Set<MemoryId>();
      for (const entity of criteria.entities) {
        const key = `${entity.type}:${entity.name}`;
        const memoryIds = this.entityIndex.get(key);
        if (memoryIds) {
          for (const id of memoryIds) {
            entityResults.add(id);
          }
        }
      }
      results = results ? this.intersect(results, entityResults) : entityResults;
    }

    if (criteria.minImportance !== undefined) {
      const importanceResults = new Set(this.searchByImportance(criteria.minImportance));
      results = results ? this.intersect(results, importanceResults) : importanceResults;
    }

    if (criteria.timeRange) {
      const timeResults = new Set(this.searchByTimeRange(criteria.timeRange.start, criteria.timeRange.end));
      results = results ? this.intersect(results, timeResults) : timeResults;
    }

    return results ? Array.from(results) : [];
  }

  private intersect(setA: Set<MemoryId>, setB: Set<MemoryId>): Set<MemoryId> {
    const result = new Set<MemoryId>();
    for (const item of setA) {
      if (setB.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  getIndexStats(): {
    topicCount: number;
    conceptCount: number;
    entityCount: number;
    relationshipCount: number;
    timeSlotCount: number;
  } {
    return {
      topicCount: this.topicIndex.size,
      conceptCount: this.conceptIndex.size,
      entityCount: this.entityIndex.size,
      relationshipCount: this.relationshipIndex.size,
      timeSlotCount: this.timeIndex.size,
    };
  }
}

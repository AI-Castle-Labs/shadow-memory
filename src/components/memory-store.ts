import { Memory, MemoryId, MemoryRepresentations, Entity, Relationship } from '../types/core';
import { IMemoryStore } from '../interfaces/memory-store';
import { MetadataIndexer } from './metadata-indexer';

interface IncrementalUpdate {
  topics?: {
    add?: string[];
    remove?: string[];
  };
  concepts?: {
    add?: string[];
    remove?: string[];
  };
  entities?: {
    add?: Entity[];
    remove?: Entity[];
  };
  relationships?: {
    add?: Relationship[];
    remove?: Relationship[];
  };
  importance?: number;
}

interface BatchUpdate {
  memoryId: MemoryId;
  metadata?: IncrementalUpdate;
}

export class MemoryStore implements IMemoryStore {
  private memories: Map<MemoryId, Memory> = new Map();
  private indexer: MetadataIndexer = new MetadataIndexer();
  private archivedIds: Set<MemoryId> = new Set();

  async storeMemory(memory: Memory): Promise<MemoryId> {
    this.memories.set(memory.id, { ...memory });
    this.indexer.addToIndex(memory.id, memory.metadata, memory.timestamp);
    return memory.id;
  }

  async retrieveMemory(id: MemoryId): Promise<Memory | null> {
    const memory = this.memories.get(id);
    return memory ? { ...memory } : null;
  }

  async updateMemoryRepresentations(id: MemoryId, representations: MemoryRepresentations): Promise<void> {
    const memory = this.memories.get(id);
    if (!memory) return;

    this.indexer.removeFromIndex(id, memory.metadata, memory.timestamp);

    memory.metadata = representations.metadata;
    memory.summary = representations.summary;
    memory.embedding = representations.embedding;

    this.indexer.addToIndex(id, memory.metadata, memory.timestamp);
  }

  async getAllMemoryIds(): Promise<MemoryId[]> {
    return Array.from(this.memories.keys());
  }

  async deleteMemory(id: MemoryId): Promise<boolean> {
    const memory = this.memories.get(id);
    if (!memory) return false;

    this.indexer.removeFromIndex(id, memory.metadata, memory.timestamp);
    this.memories.delete(id);
    return true;
  }

  async getMemoryCount(): Promise<number> {
    return this.memories.size;
  }

  async archiveMemories(memoryIds: MemoryId[]): Promise<void> {
    for (const id of memoryIds) {
      this.archivedIds.add(id);
    }
  }

  async updateMetadataIncremental(memoryId: MemoryId, updates: IncrementalUpdate): Promise<void> {
    const memory = this.memories.get(memoryId);
    if (!memory) return;

    this.indexer.removeFromIndex(memoryId, memory.metadata, memory.timestamp);

    if (updates.topics) {
      if (updates.topics.remove) {
        memory.metadata.topics = memory.metadata.topics.filter(
          topic => !updates.topics!.remove!.includes(topic)
        );
      }
      if (updates.topics.add) {
        const newTopics = updates.topics.add.filter(
          topic => !memory.metadata.topics.includes(topic)
        );
        memory.metadata.topics.push(...newTopics);
      }
    }

    if (updates.concepts) {
      if (updates.concepts.remove) {
        memory.metadata.concepts = memory.metadata.concepts.filter(
          concept => !updates.concepts!.remove!.includes(concept)
        );
      }
      if (updates.concepts.add) {
        const newConcepts = updates.concepts.add.filter(
          concept => !memory.metadata.concepts.includes(concept)
        );
        memory.metadata.concepts.push(...newConcepts);
      }
    }

    if (updates.entities) {
      if (updates.entities.remove) {
        memory.metadata.entities = memory.metadata.entities.filter(
          entity => !updates.entities!.remove!.some(
            removeEntity => removeEntity.name === entity.name && removeEntity.type === entity.type
          )
        );
      }
      if (updates.entities.add) {
        const newEntities = updates.entities.add.filter(
          newEntity => !memory.metadata.entities.some(
            existingEntity => existingEntity.name === newEntity.name && existingEntity.type === newEntity.type
          )
        );
        memory.metadata.entities.push(...newEntities);
      }
    }

    if (updates.relationships) {
      if (updates.relationships.remove) {
        memory.metadata.relationships = memory.metadata.relationships.filter(
          rel => !updates.relationships!.remove!.some(
            removeRel => removeRel.source === rel.source && 
                        removeRel.target === rel.target && 
                        removeRel.type === rel.type
          )
        );
      }
      if (updates.relationships.add) {
        const newRelationships = updates.relationships.add.filter(
          newRel => !memory.metadata.relationships.some(
            existingRel => existingRel.source === newRel.source && 
                          existingRel.target === newRel.target && 
                          existingRel.type === newRel.type
          )
        );
        memory.metadata.relationships.push(...newRelationships);
      }
    }

    if (updates.importance !== undefined) {
      memory.metadata.importance = updates.importance;
    }

    this.indexer.addToIndex(memoryId, memory.metadata, memory.timestamp);
  }

  async batchIncrementalUpdate(updates: BatchUpdate[]): Promise<void> {
    for (const update of updates) {
      if (update.metadata) {
        await this.updateMetadataIncremental(update.memoryId, update.metadata);
      }
    }
  }

  async searchByTopics(topics: string[]): Promise<MemoryId[]> {
    return this.indexer.searchByTopics(topics);
  }

  async searchByConcepts(concepts: string[]): Promise<MemoryId[]> {
    return this.indexer.searchByConcepts(concepts);
  }
}

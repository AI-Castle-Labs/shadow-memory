import { Memory, MemoryId, MemoryRepresentations } from '../types/core';

/**
 * Interface for persistent memory storage and retrieval
 */
export interface IMemoryStore {
  /**
   * Store a complete memory with all representations
   */
  storeMemory(memory: Memory): Promise<MemoryId>;

  /**
   * Retrieve a complete memory by ID
   */
  retrieveMemory(id: MemoryId): Promise<Memory | null>;

  /**
   * Update memory representations without changing core content
   */
  updateMemoryRepresentations(id: MemoryId, representations: MemoryRepresentations): Promise<void>;

  /**
   * Get all memory IDs for iteration
   */
  getAllMemoryIds(): Promise<MemoryId[]>;

  /**
   * Delete a memory by ID
   */
  deleteMemory(id: MemoryId): Promise<boolean>;

  /**
   * Get memory count for storage management
   */
  getMemoryCount(): Promise<number>;

  /**
   * Archive memories based on criteria
   */
  archiveMemories(memoryIds: MemoryId[]): Promise<void>;
}
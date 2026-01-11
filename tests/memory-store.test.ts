import fc from 'fast-check';
import { MemoryStore } from '../src/components/memory-store';
import { Memory, MemoryId, Metadata, Entity, Relationship } from '../src/types/core';

describe('MemoryStore', () => {
  let memoryStore: MemoryStore;

  beforeEach(() => {
    memoryStore = new MemoryStore();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve memories', async () => {
      const memory: Memory = {
        id: 'test-1',
        content: 'Test memory content',
        timestamp: new Date(),
        metadata: {
          topics: ['test'],
          entities: [],
          concepts: ['testing'],
          relationships: [],
          importance: 0.5
        },
        summary: {
          content: 'Test summary',
          keyInsights: ['insight1'],
          contextualRelevance: ['relevant1']
        },
        embedding: {
          vector: [0.1, 0.2, 0.3],
          model: 'test-model',
          dimensions: 3
        },
        accessCount: 0,
        lastAccessed: new Date()
      };

      const storedId = await memoryStore.storeMemory(memory);
      expect(storedId).toBe('test-1');

      const retrieved = await memoryStore.retrieveMemory(storedId);
      expect(retrieved).toBeTruthy();
      expect(retrieved!.content).toBe(memory.content);
      expect(retrieved!.metadata.topics).toEqual(memory.metadata.topics);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 6: Incremental metadata updates
     * **Validates: Requirements 3.4**
     * **Feature: shadow-memory, Property 6: Incremental metadata updates**
     */
    it('should handle incremental metadata updates without full reprocessing', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate initial memory
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          topics: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          concepts: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          entities: fc.array(fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            type: fc.string({ minLength: 1, maxLength: 20 }),
            confidence: fc.float({ min: 0, max: 1 })
          }), { minLength: 0, maxLength: 5 }),
          relationships: fc.array(fc.record({
            source: fc.string({ minLength: 1, maxLength: 50 }),
            target: fc.string({ minLength: 1, maxLength: 50 }),
            type: fc.string({ minLength: 1, maxLength: 20 }),
            strength: fc.float({ min: 0, max: 1 })
          }), { minLength: 0, maxLength: 5 }),
          importance: fc.float({ min: 0, max: 1 })
        }),
        // Generate incremental updates
        fc.record({
          topics: fc.option(fc.record({
            add: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }), { nil: undefined }),
            remove: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }), { nil: undefined })
          }), { nil: undefined }),
          concepts: fc.option(fc.record({
            add: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }), { nil: undefined }),
            remove: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }), { nil: undefined })
          }), { nil: undefined }),
          entities: fc.option(fc.record({
            add: fc.option(fc.array(fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              type: fc.string({ minLength: 1, maxLength: 20 }),
              confidence: fc.float({ min: 0, max: 1 })
            }), { maxLength: 3 }), { nil: undefined }),
            remove: fc.option(fc.array(fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              type: fc.string({ minLength: 1, maxLength: 20 }),
              confidence: fc.float({ min: 0, max: 1 })
            }), { maxLength: 2 }), { nil: undefined })
          }), { nil: undefined }),
          relationships: fc.option(fc.record({
            add: fc.option(fc.array(fc.record({
              source: fc.string({ minLength: 1, maxLength: 50 }),
              target: fc.string({ minLength: 1, maxLength: 50 }),
              type: fc.string({ minLength: 1, maxLength: 20 }),
              strength: fc.float({ min: 0, max: 1 })
            }), { maxLength: 3 }), { nil: undefined }),
            remove: fc.option(fc.array(fc.record({
              source: fc.string({ minLength: 1, maxLength: 50 }),
              target: fc.string({ minLength: 1, maxLength: 50 }),
              type: fc.string({ minLength: 1, maxLength: 20 }),
              strength: fc.float({ min: 0, max: 1 })
            }), { maxLength: 2 }), { nil: undefined })
          }), { nil: undefined }),
          importance: fc.option(fc.float({ min: 0, max: 1 }), { nil: undefined })
        }),
        async (initialData, updates) => {
          // Create initial memory
          const memory: Memory = {
            id: `test-${Date.now()}-${Math.random()}`,
            content: initialData.content,
            timestamp: new Date(),
            metadata: {
              topics: initialData.topics,
              entities: initialData.entities,
              concepts: initialData.concepts,
              relationships: initialData.relationships,
              importance: initialData.importance
            },
            summary: {
              content: 'Test summary',
              keyInsights: ['insight1'],
              contextualRelevance: ['relevant1']
            },
            embedding: {
              vector: [0.1, 0.2, 0.3],
              model: 'test-model',
              dimensions: 3
            },
            accessCount: 0,
            lastAccessed: new Date()
          };

          // Store initial memory
          const memoryId = await memoryStore.storeMemory(memory);
          
          // Get initial state for comparison
          const initialMemory = await memoryStore.retrieveMemory(memoryId);
          expect(initialMemory).toBeTruthy();

          // Apply incremental updates
          await memoryStore.updateMetadataIncremental(memoryId, updates);

          // Retrieve updated memory
          const updatedMemory = await memoryStore.retrieveMemory(memoryId);
          expect(updatedMemory).toBeTruthy();

          // Verify that core content remains unchanged
          expect(updatedMemory!.content).toBe(initialMemory!.content);
          expect(updatedMemory!.timestamp).toEqual(initialMemory!.timestamp);
          expect(updatedMemory!.summary).toEqual(initialMemory!.summary);
          expect(updatedMemory!.embedding).toEqual(initialMemory!.embedding);

          // Verify incremental updates were applied correctly
          const expectedMetadata = { ...initialMemory!.metadata };

          // Apply expected topic changes
          if (updates.topics) {
            if (updates.topics.remove) {
              expectedMetadata.topics = expectedMetadata.topics.filter(
                (topic: string) => !updates.topics!.remove!.includes(topic)
              );
            }
            if (updates.topics.add) {
              const newTopics = updates.topics.add.filter(
                (topic: string) => !expectedMetadata.topics.includes(topic)
              );
              expectedMetadata.topics.push(...newTopics);
            }
          }

          // Apply expected concept changes
          if (updates.concepts) {
            if (updates.concepts.remove) {
              expectedMetadata.concepts = expectedMetadata.concepts.filter(
                (concept: string) => !updates.concepts!.remove!.includes(concept)
              );
            }
            if (updates.concepts.add) {
              const newConcepts = updates.concepts.add.filter(
                (concept: string) => !expectedMetadata.concepts.includes(concept)
              );
              expectedMetadata.concepts.push(...newConcepts);
            }
          }

          // Apply expected entity changes
          if (updates.entities) {
            if (updates.entities.remove) {
              expectedMetadata.entities = expectedMetadata.entities.filter(
                (entity: Entity) => !updates.entities!.remove!.some(
                  removeEntity => removeEntity.name === entity.name && removeEntity.type === entity.type
                )
              );
            }
            if (updates.entities.add) {
              const newEntities = updates.entities.add.filter(
                newEntity => !expectedMetadata.entities.some(
                  (existingEntity: Entity) => existingEntity.name === newEntity.name && existingEntity.type === newEntity.type
                )
              );
              expectedMetadata.entities.push(...newEntities);
            }
          }

          // Apply expected relationship changes
          if (updates.relationships) {
            if (updates.relationships.remove) {
              expectedMetadata.relationships = expectedMetadata.relationships.filter(
                (relationship: Relationship) => !updates.relationships!.remove!.some(
                  removeRel => removeRel.source === relationship.source && 
                              removeRel.target === relationship.target && 
                              removeRel.type === relationship.type
                )
              );
            }
            if (updates.relationships.add) {
              const newRelationships = updates.relationships.add.filter(
                newRel => !expectedMetadata.relationships.some(
                  (existingRel: Relationship) => existingRel.source === newRel.source && 
                                existingRel.target === newRel.target && 
                                existingRel.type === newRel.type
                )
              );
              expectedMetadata.relationships.push(...newRelationships);
            }
          }

          // Apply expected importance change
          if (updates.importance !== undefined) {
            expectedMetadata.importance = updates.importance;
          }

          // Verify the metadata matches expected state
          expect(updatedMemory!.metadata.topics.sort()).toEqual(expectedMetadata.topics.sort());
          expect(updatedMemory!.metadata.concepts.sort()).toEqual(expectedMetadata.concepts.sort());
          expect(updatedMemory!.metadata.entities).toEqual(expectedMetadata.entities);
          expect(updatedMemory!.metadata.relationships).toEqual(expectedMetadata.relationships);
          expect(updatedMemory!.metadata.importance).toBe(expectedMetadata.importance);

          // Verify memory can still be found through search
          if (expectedMetadata.topics.length > 0) {
            const searchResults = await memoryStore.searchByTopics([expectedMetadata.topics[0]]);
            expect(searchResults).toContain(memoryId);
          }

          if (expectedMetadata.concepts.length > 0) {
            const searchResults = await memoryStore.searchByConcepts([expectedMetadata.concepts[0]]);
            expect(searchResults).toContain(memoryId);
          }

          // Verify indexing consistency - memory should be findable by its updated attributes
          const allMemoryIds = await memoryStore.getAllMemoryIds();
          expect(allMemoryIds).toContain(memoryId);
        }
      ), { numRuns: 100 });
    });

    /**
     * Property test for batch incremental updates
     */
    it('should handle batch incremental updates consistently', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate multiple memories with updates
        fc.array(fc.record({
          memory: fc.record({
            content: fc.string({ minLength: 1, maxLength: 500 }),
            topics: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
            concepts: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
            importance: fc.float({ min: 0, max: 1 })
          }),
          updates: fc.record({
            topics: fc.option(fc.record({
              add: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 3 }))
            })),
            importance: fc.option(fc.float({ min: 0, max: 1 }))
          })
        }), { minLength: 1, maxLength: 5 }),
        async (memoryUpdates) => {
          const memoryIds: MemoryId[] = [];

          // Store initial memories
          for (const { memory: memData } of memoryUpdates) {
            const memory: Memory = {
              id: `batch-${Date.now()}-${Math.random()}`,
              content: memData.content,
              timestamp: new Date(),
              metadata: {
                topics: memData.topics,
                entities: [],
                concepts: memData.concepts,
                relationships: [],
                importance: memData.importance
              },
              summary: {
                content: 'Batch test summary',
                keyInsights: [],
                contextualRelevance: []
              },
              embedding: {
                vector: [0.1, 0.2],
                model: 'batch-model',
                dimensions: 2
              },
              accessCount: 0,
              lastAccessed: new Date()
            };

            const memoryId = await memoryStore.storeMemory(memory);
            memoryIds.push(memoryId);
          }

          // Prepare batch updates
          const batchUpdates = memoryIds.map((memoryId, index) => {
            const update = memoryUpdates[index].updates;
            const batchUpdate: any = { memoryId };
            
            if (update.topics || update.importance !== undefined) {
              batchUpdate.metadata = {};
              
              if (update.topics) {
                batchUpdate.metadata.topics = {
                  add: update.topics.add || undefined
                };
              }
              
              if (update.importance !== undefined) {
                batchUpdate.metadata.importance = update.importance;
              }
            }
            
            return batchUpdate;
          });

          // Apply batch updates
          await memoryStore.batchIncrementalUpdate(batchUpdates);

          // Verify all memories were updated correctly
          for (let i = 0; i < memoryIds.length; i++) {
            const memoryId = memoryIds[i];
            const originalData = memoryUpdates[i];
            const updatedMemory = await memoryStore.retrieveMemory(memoryId);

            expect(updatedMemory).toBeTruthy();
            expect(updatedMemory!.content).toBe(originalData.memory.content);

            // Verify updates were applied
            if (originalData.updates.importance !== undefined) {
              expect(updatedMemory!.metadata.importance).toBe(originalData.updates.importance);
            }

            if (originalData.updates.topics?.add) {
              const expectedTopics = [...originalData.memory.topics, ...originalData.updates.topics.add];
              expect(updatedMemory!.metadata.topics.sort()).toEqual([...new Set(expectedTopics)].sort());
            }
          }

          // Verify all memories are still accessible
          const allIds = await memoryStore.getAllMemoryIds();
          for (const memoryId of memoryIds) {
            expect(allIds).toContain(memoryId);
          }
        }
      ), { numRuns: 50 });
    });
  });

  describe('Indexing and Search', () => {
    it('should maintain search functionality after incremental updates', async () => {
      const memory: Memory = {
        id: 'search-test',
        content: 'Search test content',
        timestamp: new Date(),
        metadata: {
          topics: ['original-topic'],
          entities: [],
          concepts: ['original-concept'],
          relationships: [],
          importance: 0.5
        },
        summary: {
          content: 'Search test summary',
          keyInsights: [],
          contextualRelevance: []
        },
        embedding: {
          vector: [0.1, 0.2, 0.3],
          model: 'search-model',
          dimensions: 3
        },
        accessCount: 0,
        lastAccessed: new Date()
      };

      const memoryId = await memoryStore.storeMemory(memory);

      // Verify initial search works
      let results = await memoryStore.searchByTopics(['original-topic']);
      expect(results).toContain(memoryId);

      // Apply incremental update
      await memoryStore.updateMetadataIncremental(memoryId, {
        topics: {
          add: ['new-topic'],
          remove: ['original-topic']
        }
      });

      // Verify search works with new topic
      results = await memoryStore.searchByTopics(['new-topic']);
      expect(results).toContain(memoryId);

      // Verify old topic no longer returns this memory
      results = await memoryStore.searchByTopics(['original-topic']);
      expect(results).not.toContain(memoryId);
    });
  });
});
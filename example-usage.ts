#!/usr/bin/env ts-node

/**
 * Example: How to use the Shadow Memory System
 */

import { ShadowMemorySystem } from './src/components/shadow-memory-system';
import { Context } from './src/types/core';

async function exampleUsage() {
  console.log('🧠 Shadow Memory System Example');
  
  // 1. Create the system
  const shadowMemory = new ShadowMemorySystem();
  console.log('✅ System created');

  try {
    // 2. Store a memory
    console.log('\n📝 Storing memories...');
    const memoryId1 = await shadowMemory.storeMemory(
      'The user prefers TypeScript over JavaScript for better type safety'
    );
    console.log(`Memory stored: ${memoryId1}`);

    const memoryId2 = await shadowMemory.storeMemory(
      'The user is working on an AI memory management system'
    );
    console.log(`Memory stored: ${memoryId2}`);

    // 3. Check memory awareness
    console.log('\n🔍 Checking memory awareness...');
    const context: Context = {
      content: 'What programming language should I use for my AI project?',
      metadata: {
        topics: ['programming', 'AI', 'language-choice'],
        entities: [],
        intent: 'question',
        temporalMarkers: [],
        structuralElements: []
      },
      embedding: {
        vector: Array(384).fill(0).map((_, i) => (i % 10) / 10),
        model: 'example-model',
        dimensions: 384
      },
      summary: 'User asking about programming language for AI project'
    };

    const awareness = await shadowMemory.getMemoryAwareness(context);
    console.log(`Found ${awareness.length} relevant memories`);

    // 4. Retrieve specific memory
    console.log('\n📖 Retrieving memory...');
    const retrievedMemory = await shadowMemory.retrieveMemory(memoryId1);
    console.log(`Retrieved: ${retrievedMemory?.content}`);

    // 5. Run benchmarks
    console.log('\n📊 Running benchmarks...');
    const benchmarkResults = await shadowMemory.runBenchmark('similarity_computation');
    console.log(`Benchmark completed: ${benchmarkResults.testCases} test cases`);

  } catch (error) {
    console.log('⚠️  Some operations failed (expected with placeholder implementations)');
    console.log('Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n🎉 Example completed!');
}

// Run the example
if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { exampleUsage };
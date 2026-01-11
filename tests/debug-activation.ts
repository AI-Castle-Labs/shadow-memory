import 'dotenv/config';
import { ShadowMemorySystem } from '../src/components/shadow-memory-system';
import { EmbeddingGenerator } from '../src/components/embedding-generator';

async function debugMemoryActivation() {
  console.log('='.repeat(80));
  console.log('DEBUG: Memory Activation Issue');
  console.log('='.repeat(80));
  console.log();

  const system = new ShadowMemorySystem({
    thresholds: { conversation: 0.2, document: 0.2, task: 0.2, query: 0.2, mixed: 0.2 },
    weights: { embedding: 0.7, metadata: 0.15, summary: 0.1, temporal: 0.05 },
  });

  const embedder = new EmbeddingGenerator();

  console.log('1. Storing test memories...');
  const memories = [
    "I am planning a trip to Japan next spring",
    "I want to see cherry blossoms in Kyoto",
    "I am interested in Fushimi Inari shrine",
    "I prefer traditional ryokan accommodation",
    "I have a budget of $5000 for the trip",
  ];

  for (const m of memories) {
    const id = await system.storeMemory(m);
    console.log(`   Stored: "${m}" -> ${id}`);
  }
  console.log();

  console.log('2. Testing memory retrieval...');
  const testQueries = [
    "I want to plan my Japan trip",
    "What about Kyoto temples?",
    "How much should I budget?",
    "Where should I stay in Japan?",
  ];

  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    const embedding = await embedder.generateEmbedding(query);
    console.log(`  Embedding dimensions: ${embedding.dimensions}`);
    console.log(`  Embedding model: ${embedding.model}`);

    const context = {
      content: query,
      embedding,
      metadata: {
        topics: query.toLowerCase().split(' '),
        entities: [],
        intent: 'conversation',
        temporalMarkers: [new Date()],
        structuralElements: [],
      },
      summary: query.slice(0, 100),
    };

    const candidates = await system.getAllCandidateMemories(context);
    const activated = await system.getMemoryAwareness(context);

    console.log(`  Total candidates: ${candidates.length}`);
    console.log(`  Activated (above threshold): ${activated.length}`);

    if (candidates.length > 0) {
      console.log('  Top 3 candidates:');
      for (const c of candidates.slice(0, 3)) {
        const score = (c.activationScore * 100).toFixed(1);
        console.log(`    [${score}%] ${c.summary}`);
      }
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('3. Stats check...');
  const stats = await system.getSystemStats();
  console.log(`   Total memories: ${stats.totalMemories}`);
  console.log(`   Average activation: ${(stats.averageActivationScore * 100).toFixed(1)}%`);
  console.log();

  console.log('4. If all candidates show ~25%, embeddings may not be working properly');
  console.log('   Check that OPENAI_API_KEY is set in .env');
  console.log(`   API Key status: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
}

debugMemoryActivation().catch(console.error);

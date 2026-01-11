import 'dotenv/config';
import { ShadowMemorySystem } from '../src/components/shadow-memory-system';
import { MemoryAugmentedAgent } from '../src/components/memory-augmented-agent';
import { EmbeddingGenerator } from '../src/components/embedding-generator';

async function runContextHistorySimulation() {
  console.log('='.repeat(80));
  console.log('CONTEXT HISTORY SIMULATION');
  console.log('Testing: Current Query + Previous Response + Previous Query');
  console.log('='.repeat(80));
  console.log();

  const system = new ShadowMemorySystem({
    thresholds: { conversation: 0.25, document: 0.25, task: 0.25, query: 0.25, mixed: 0.25 },
    weights: { embedding: 0.6, metadata: 0.2, summary: 0.15, temporal: 0.05 },
  });
  const agent = new MemoryAugmentedAgent(system);

  console.log('SCENARIO: Trip Planning (Multi-turn with context dependencies)');
  console.log('-'.repeat(80));
  console.log();

  const scenario = [
    {
      userQuery: "I'm planning a trip to Japan next spring. What are the best places to see cherry blossoms?",
      expectedMemory: "User planning Japan trip in spring, interested in cherry blossoms",
      turnContext: "First mention - establishing baseline",
    },
    {
      userQuery: "What about Kyoto? I've heard Fushimi Inari is amazing.",
      expectedMemory: "User interested specifically in Kyoto and Fushimi Inari shrine",
      turnContext: "Referencing previous Japan trip context",
    },
    {
      userQuery: "How long should I spend there? Remember, I'm interested in the temples and shrines.",
      expectedMemory: "User needs duration recommendation, temples and shrines interest from before",
      turnContext: "Using: Japan trip + Kyoto interest + temple/shrine preference",
    },
    {
      userQuery: "What about accommodation? I want something traditional, not a hotel.",
      expectedMemory: "User wants traditional Japanese accommodation (ryokan), not hotels",
      turnContext: "Using: Japan context + traditional culture interest",
    },
    {
      userQuery: "And how much should I budget for all of this? I need to plan my finances.",
      expectedMemory: "User needs budget planning for Japan trip, has financial constraints",
      turnContext: "New context: budget/finance, but still under Japan trip umbrella",
    },
    {
      userQuery: "Actually, let me circle back to Kyoto. You mentioned temples - which ones are must-see?",
      expectedMemory: "Revisiting Kyoto temples discussion, user wants specific recommendations",
      turnContext: "Testing memory recall: Kyoto + temples mentioned in turns 2 & 3",
    },
    {
      userQuery: "This is expensive! Can you give me a rough budget breakdown for the whole trip?",
      expectedMemory: "User concerned about costs, needs complete trip budget",
      turnContext: "Using: Budget concern + Japan trip context + accommodation preferences",
    },
  ];

  const conversationHistory: Array<{ query: string; response: string }> = [];

  for (let i = 0; i < scenario.length; i++) {
    const turn = scenario[i];
    console.log(`[TURN ${i + 1}] Context: ${turn.turnContext}`);
    console.log(`QUERY: "${turn.userQuery}"`);
    console.log(`EXPECTED MEMORY: "${turn.expectedMemory}"`);
    console.log();

    const previousQuery = i > 0 ? conversationHistory[i - 1].query : null;
    const previousResponse = i > 0 ? conversationHistory[i - 1].response : null;

    if (previousQuery && previousResponse) {
      console.log(`  Previous Query: "${previousQuery.slice(0, 60)}..."`);
      console.log(`  Previous Response: "${previousResponse.slice(0, 60)}..."`);
      console.log();
    }

    const response = await agent.chat(turn.userQuery);
    conversationHistory.push({ query: turn.userQuery, response: response.content });

    console.log('MEMORY ACTIVATIONS (from agent response):');
    if (response.memoryContext.candidateMemories.length === 0) {
      console.log('  No memories found');
    } else {
      const top5 = response.memoryContext.candidateMemories.slice(0, 5);
      for (const mem of top5) {
        const status = mem.selected ? '[ACTIVATED]' : '[candidate]';
        const score = (mem.score * 100).toFixed(1);
        console.log(`  ${status} ${score}% - "${mem.summary.slice(0, 60)}..."`);
      }
    }

    console.log();
    console.log(`AGENT RESPONSE: ${response.content.slice(0, 200)}...`);
    console.log();
    console.log('-'.repeat(80));
    console.log();

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('='.repeat(80));
  console.log('ANALYSIS: How well did the system use context history?');
  console.log('='.repeat(80));
  console.log();

  const stats = await system.getSystemStats();
  console.log(`Total memories stored: ${stats.totalMemories}`);
  console.log(`Conversation turns: ${scenario.length}`);
  console.log();

  const embedder = new EmbeddingGenerator();
  const finalQuery = "Give me a quick summary of my Japan trip plans including where I'm going, what I want to see, where I'm staying, and my budget concerns.";
  const finalEmbedding = await embedder.generateEmbedding(finalQuery);

  const candidates = await system.getAllCandidateMemories({
    content: finalQuery,
    embedding: finalEmbedding,
    metadata: {
      topics: ['japan', 'trip', 'summary', 'budget'],
      entities: [],
      intent: 'conversation',
      temporalMarkers: [new Date()],
      structuralElements: [],
    },
    summary: finalQuery.slice(0, 100),
  });

  console.log('FINAL RECALL TEST - Query: "Summary of Japan trip with budget concerns"');
  console.log();

  if (candidates.length === 0) {
    console.log('No memories found for recall test');
  } else {
    console.log(`Found ${candidates.length} memories:`);
    for (const mem of candidates.slice(0, 8)) {
      const score = (mem.activationScore * 100).toFixed(1);
      console.log(`  [${score}%] ${mem.summary}`);
    }
  }

  console.log();
  console.log('='.repeat(80));
}

runContextHistorySimulation().catch(console.error);

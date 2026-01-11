import 'dotenv/config';
import { ShadowMemorySystem } from '../src/components/shadow-memory-system';
import { MemoryAugmentedAgent } from '../src/components/memory-augmented-agent';

async function runConversation() {
  console.log('='.repeat(80));
  console.log('SHADOW MEMORY SYSTEM - COMPLEX CONVERSATION SIMULATION');
  console.log('='.repeat(80));
  console.log();

  const system = new ShadowMemorySystem({
    thresholds: { conversation: 0.3, document: 0.3, task: 0.3, query: 0.3, mixed: 0.3 },
    weights: { embedding: 0.6, metadata: 0.2, summary: 0.15, temporal: 0.05 },
  });
  const agent = new MemoryAugmentedAgent(system);

  console.log('SEEDING BACKGROUND MEMORIES...\n');
  
  const seeds = [
    'User prefers TypeScript over JavaScript for large projects due to type safety',
    'User is building a startup called NeuralNote - an AI-powered note-taking app',
    'User has experience with React, Next.js, and TailwindCSS for frontend development',
    'User mentioned their budget is around $50k for the MVP development',
    'User wants to launch the product by Q2 2026',
    'User is concerned about data privacy and wants all data stored locally',
    'User previously worked at Google as a senior engineer for 5 years',
    'User prefers PostgreSQL for relational data and Redis for caching',
    'User mentioned they have a co-founder who handles business development',
    'User wants the app to work offline and sync when online',
  ];

  for (const seed of seeds) {
    await system.storeMemory(seed);
    console.log(`  Stored: "${seed.slice(0, 60)}..."`);
  }
  console.log();

  const conversation = [
    "Hey, I wanted to discuss the tech stack for my app. What do you think about using Python for the backend?",
    "Good point about TypeScript. What database would you recommend for storing the notes?",
    "I'm worried about the timeline. Do you think we can hit our target launch date?",
    "Let's talk about the AI features. I want smart search that understands context, not just keywords.",
    "How should we handle the offline functionality? That's really important for my users.",
    "My co-founder wants to know about the pricing model. Any suggestions for AI-powered apps?",
    "One more thing - security is crucial. How do we ensure user data stays private?",
    "Can you summarize what we've discussed and what the next steps should be?",
  ];

  console.log('STARTING CONVERSATION...\n');
  console.log('-'.repeat(80));

  for (let i = 0; i < conversation.length; i++) {
    const userMessage = conversation[i];
    console.log(`\n[Turn ${i + 1}] USER: ${userMessage}\n`);

    const response = await agent.chat(userMessage);

    const activated = response.memoryContext.activatedMemories;
    console.log(`MEMORY ACTIVATION (${activated.length} activated, threshold passed):`);
    if (response.memoryContext.candidateMemories.length === 0) {
      console.log('  No memories found');
    } else {
      const top5 = response.memoryContext.candidateMemories.slice(0, 5);
      for (const mem of top5) {
        const status = mem.selected ? '[ACTIVATED]' : '[candidate]';
        const score = (mem.score * 100).toFixed(1);
        console.log(`  ${status} ${score}% - "${mem.summary.slice(0, 50)}..."`);
      }
    }

    console.log(`\nASSISTANT: ${response.content}\n`);
    console.log('-'.repeat(80));

    await new Promise(r => setTimeout(r, 500));
  }

  const stats = await system.getSystemStats();
  console.log('\n' + '='.repeat(80));
  console.log('FINAL STATISTICS:');
  console.log(`  Total memories stored: ${stats.totalMemories}`);
  console.log(`  Conversation turns: ${conversation.length}`);
  console.log('='.repeat(80));
}

runConversation().catch(console.error);

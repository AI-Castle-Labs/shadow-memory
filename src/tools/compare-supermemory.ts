import { ShadowMemorySystem } from '../components/shadow-memory-system';
import { ConversationScenarioGenerator } from '../components/conversation-scenario-generator';
import {
  ConversationScenario,
  ConversationTurn,
} from '../interfaces/conversation-simulation';
import { Context } from '../types/core';
import https from 'https';
import { URL } from 'url';

interface SupermemoryClientConfig {
  baseUrl: string;
  apiKey?: string;
  project?: string;
}

interface SupermemoryResponse {
  status: number;
  body: string;
}

interface TurnComparison {
  turnId: string;
  speaker: 'user' | 'assistant';
  shadow: {
    activationSummaries: string[];
    latencyMs: number;
  };
  supermemory: {
    text: string;
    latencyMs: number;
    status: number;
  };
}

interface ScenarioComparisonResult {
  scenarioId: string;
  title: string;
  summary: string;
  turns: TurnComparison[];
}

class SupermemoryClient {
  private config: SupermemoryClientConfig;

  constructor(config: SupermemoryClientConfig) {
    this.config = config;
  }

  async addMemory(thingToRemember: string): Promise<SupermemoryResponse> {
    return this.postJson('/add', { thingToRemember });
  }

  async searchMemory(informationToGet: string): Promise<SupermemoryResponse> {
    return this.postJson('/search', { informationToGet });
  }

  private async postJson(path: string, payload: Record<string, unknown>): Promise<SupermemoryResponse> {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(normalizedPath, this.config.baseUrl.endsWith('/') ? this.config.baseUrl : `${this.config.baseUrl}/`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    if (this.config.project) {
      headers['x-sm-project'] = this.config.project;
    }

    const bodyString = JSON.stringify(payload);

    return new Promise<SupermemoryResponse>((resolve, reject) => {
      const req = https.request(
        {
          method: 'POST',
          hostname: url.hostname,
          path: url.pathname,
          protocol: url.protocol,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode ?? 0, body: data });
          });
        },
      );

      req.on('error', (err) => reject(err));
      req.write(bodyString);
      req.end();
    });
  }
}

function extractSummariesFromAwareness(awareness: { summary: string }[] | undefined): string[] {
  if (!awareness) return [];
  return awareness.map((a) => a.summary);
}

function buildScenarioConfig(): { scenarios: number; turns: number } {
  return { scenarios: 3, turns: 6 };
}

async function generateScenarios(generator: ConversationScenarioGenerator): Promise<ConversationScenario[]> {
  const config = buildScenarioConfig();
  const topics = generator.getConversationTopics();
  const chosenTopics = topics.slice(0, config.scenarios);

  const scenarios: ConversationScenario[] = [];
  for (let i = 0; i < chosenTopics.length; i++) {
    const topic = chosenTopics[i];
    const difficulty: 'easy' | 'medium' | 'hard' = i === 0 ? 'easy' : i === 1 ? 'medium' : 'hard';
    const memoryDependency: 'low' | 'medium' | 'high' = i === 0 ? 'medium' : i === 1 ? 'high' : 'low';

    const scenario = await generator.generateScenario({
      topic,
      turns: config.turns,
      difficulty,
      memoryDependency,
    });
    scenarios.push(scenario);
  }

  return scenarios;
}

async function runShadowTurn(
  system: ShadowMemorySystem,
  turn: ConversationTurn,
  expectedActivations: string[],
): Promise<{ activationSummaries: string[]; latencyMs: number }> {
  const start = Date.now();
  let awareness = [] as { summary: string }[];
  if (turn.context) {
    awareness = await system.getMemoryAwareness(turn.context as Context);
  }
  const latencyMs = Date.now() - start;
  return { activationSummaries: extractSummariesFromAwareness(awareness), latencyMs };
}

async function runSupermemoryTurn(
  client: SupermemoryClient,
  turn: ConversationTurn,
): Promise<{ text: string; latencyMs: number; status: number }> {
  await client.addMemory(turn.content);
  const query = turn.context?.summary || turn.content;
  const start = Date.now();
  const response = await client.searchMemory(query);
  const latencyMs = Date.now() - start;
  return {
    text: response.body,
    latencyMs,
    status: response.status,
  };
}

async function compareSystems(): Promise<void> {
  const shadowSystem = new ShadowMemorySystem();
  const scenarioGenerator = new ConversationScenarioGenerator();
  const supermemoryClient = new SupermemoryClient({
    baseUrl: 'https://api.supermemory.ai/mcp',
    apiKey: process.env.SUPERMEMORY_API_KEY,
    project: process.env.SUPERMEMORY_PROJECT || 'default',
  });

  const scenarios = await generateScenarios(scenarioGenerator);
  const results: ScenarioComparisonResult[] = [];

  for (const scenario of scenarios) {
    const turnComparisons: TurnComparison[] = [];

    for (const turn of scenario.turns) {
      const shadowResult = await runShadowTurn(shadowSystem, turn, scenario.expectedMemoryActivations);
      const supermemoryResult = await runSupermemoryTurn(supermemoryClient, turn);

      await shadowSystem.storeMemory(turn.content, turn.context);

      turnComparisons.push({
        turnId: turn.id,
        speaker: turn.speaker,
        shadow: shadowResult,
        supermemory: supermemoryResult,
      });
    }

    results.push({
      scenarioId: scenario.id,
      title: scenario.title,
      summary: scenario.description,
      turns: turnComparisons,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    supermemoryProject: process.env.SUPERMEMORY_PROJECT || 'default',
    supermemoryAuth: process.env.SUPERMEMORY_API_KEY ? 'apiKey' : 'header-only',
    scenarios: results,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

compareSystems().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Comparison failed', err);
  process.exit(1);
});

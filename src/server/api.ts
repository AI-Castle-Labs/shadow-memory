import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { ShadowMemorySystem } from '../components/shadow-memory-system';
import { MemoryAugmentedAgent } from '../components/memory-augmented-agent';
import { Context } from '../types/core';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const shadowMemory = new ShadowMemorySystem();
const agent = new MemoryAugmentedAgent(shadowMemory);

interface ChatRequest {
  message: string;
  apiKey?: string;
}

interface StoreMemoryRequest {
  content: string;
  topics?: string[];
}

interface SetApiKeyRequest {
  apiKey: string;
}

let runtimeApiKey: string | undefined;

app.post('/api/chat', async (req: Request<object, object, ChatRequest>, res: Response) => {
  try {
    const { message, apiKey } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (apiKey) {
      process.env.OPENAI_API_KEY = apiKey;
    } else if (runtimeApiKey) {
      process.env.OPENAI_API_KEY = runtimeApiKey;
    }

    const response = await agent.chat(message);

    res.json({
      content: response.content,
      memoryId: response.storedMemoryId,
      activatedMemories: response.memoryContext.activatedMemories,
      candidateMemories: response.memoryContext.candidateMemories,
      stats: {
        totalMemories: response.memoryContext.totalMemories,
        averageActivationScore: response.memoryContext.avgActivationScore,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/config/apikey', async (req: Request<object, object, SetApiKeyRequest>, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      res.status(400).json({ error: 'API key is required' });
      return;
    }

    runtimeApiKey = apiKey;
    process.env.OPENAI_API_KEY = apiKey;

    res.json({ success: true });
  } catch (error) {
    console.error('Set API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/memory', async (req: Request<object, object, StoreMemoryRequest>, res: Response) => {
  try {
    const { content, topics } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const context: Partial<Context> = {
      metadata: {
        topics: topics || [],
        entities: [],
        intent: 'memory_storage',
        temporalMarkers: [new Date()],
        structuralElements: [],
      },
    };

    const memoryId = await shadowMemory.storeMemory(content, context);
    res.json({ memoryId });
  } catch (error) {
    console.error('Store memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/memory/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const memory = await shadowMemory.retrieveMemory(id);
    res.json({ memory });
  } catch (error) {
    console.error('Retrieve memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await shadowMemory.getSystemStats();
    res.json({
      ...stats,
      hasApiKey: !!process.env.OPENAI_API_KEY || !!runtimeApiKey,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clear-history', async (_req: Request, res: Response) => {
  try {
    agent.clearHistory();
    res.json({ success: true });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.OPENAI_API_KEY || !!runtimeApiKey,
  });
});

app.listen(PORT, () => {
  console.log(`Shadow Memory API server running on http://localhost:${PORT}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'configured' : 'not configured'}`);
});

export { app };

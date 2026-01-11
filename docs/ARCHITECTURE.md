# Shadow Memory System Architecture

## Overview

The Shadow Memory System is an AI memory management system that maintains awareness of past memories through activation scoring without loading complete memory content into active context. This allows for efficient, semantic memory retrieval with configurable precision.

## Core Principles

1. **Shadow Memory**: Keep summaries and metadata in working memory, not full content
2. **Activation Scoring**: Multi-dimensional relevance scoring determines which memories to retrieve
3. **Context-Aware**: Threshold-based activation adapts to conversation type (query, task, document)
4. **Semantic Search**: Uses vector embeddings for content understanding beyond keyword matching

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MemoryAugmentedAgent                             │
│                               ↓                                         │
│  ┌─────────────────────────────────────────────────────────┐         │
│  │             Context (Query/Conversation)             │         │
│  │                  ↓                                │         │
│  │  ┌────────────────────────────────────┐              │         │
│  │  │  BuildContext: EmbeddingGenerator │              │         │
│  │  └────────────────────────────────────┘              │         │
│  │                  ↓                                      │         │
│  │  ┌─────────────────────────────────────────┐            │         │
│  │  │  getAllCandidateMemories()         │            │         │
│  │  └─────────────────────────────────────────┘            │         │
│  │                      ↓                              │         │
│  │         MemoryAwarenessInterface                   │         │
│  │    (SimilarityEngine + ActivationScorer)          │         │
│  │         ↓                            │         │
│  │  Filter by threshold → Activated memories   │         │
│  │         ↓                                   │         │
│  │  Format as context string                   │         │
│  │                  ↓                                │         │
│  │  ChatOpenAI (LLM)                       │         │
│  │    System prompt with activated memories       │         │
│  │         ↓                                   │         │
│  │    Response                                 │         │
│  │         ↓                                   │         │
│  │  Store user/assistant messages           │         │
│  └─────────────────────────────────────────────────┘            │         │
│                                                             ↓                      │
│                        ShadowMemorySystem                     │
│  ┌─────────────────────────────────────────────────┐              │
│  │                                                  │         │
│  │  MemoryStore ← MemoryArchival ← TemporalDecay  │         │
│  │  MemoryRepresentationGenerator                    │         │
│  │  EmbeddingGenerator                        │         │
│  └─────────────────────────────────────────────────┘              │
│                                                             ↓                      │
│                    All stored memories (indexed by similarity)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. MemoryAugmentedAgent

**Purpose**: Chat interface with memory-aware responses

**Key Methods**:
- `chat(message: string)`: Main entry point for conversations
  - Builds context embedding from user message
  - Retrieves candidate memories via `getAllCandidateMemories()`
  - Filters by threshold via `getMemoryAwareness()`
  - Formats activated memories into system prompt
  - Generates LLM response via ChatOpenAI
  - Stores conversation turn in memory

**Flow**:
```
User Message
    ↓
BuildContext (via EmbeddingGenerator)
    ↓
getAllCandidateMemories() → All memories with scores
    ↓
getMemoryAwareness() → Filter by threshold (default: 0.3)
    ↓
formatMemoryContext() → Context string with summaries
    ↓
generateResponse() → ChatOpenAI with context
    ↓
storeMemory() for user/assistant messages
```

### 2. ShadowMemorySystem

**Purpose**: Central coordinator for all memory operations

**Key Methods**:
- `storeMemory(content, context)`: Store new memory with representations
- `retrieveMemory(memoryId)`: Get complete memory by ID
- `getMemoryAwareness(context)`: Get activated memories (above threshold)
- `getAllCandidateMemories(context)`: Get all candidates with scores (for display/debugging)
- `getSystemStats()`: System statistics and performance metrics
- `clearMemories()`: Remove all memories

**Delegates To**:
- `MemoryStore`: Storage layer with indexing
- `MemoryRepresentationGenerator`: Creates embeddings and summaries
- `MemoryAwarenessInterface`: Similarity computation and threshold filtering
- `TemporalDecay`: Age-based activation score adjustment
- `MemoryArchival`: Long-term storage for old/low-activation memories

### 3. MemoryAwarenessInterface

**Purpose**: Compute relevance without loading full memory content

**Similarity Computation**:
```typescript
computeAllSimilarities(
  contextEmbedding: number[],
  contextMetadata: Metadata,
  contextSummary: Summary,
  memoryEmbedding: number[],
  memoryMetadata: Metadata,
  memorySummary: Summary
): SimilarityScores

Returns:
{
  embeddingSimilarity: number,    // Cosine similarity of vectors (0-1)
  metadataSimilarity: number,     // Topic/entity overlap (0-1)
  summarySimilarity: number,      // Summary content match (0-1)
  temporalRelevance: number       // Age-based decay factor (0-1)
}
```

**Activation Score Formula**:
```
activationScore = 
  (weights.embedding × embeddingSimilarity) +
  (weights.metadata × metadataSimilarity) +
  (weights.summary × summarySimilarity) +
  (weights.temporal × temporalRelevance)

Where default weights:
  embedding: 0.6  (60% - semantic understanding)
  metadata: 0.2  (20% - topics/entities)
  summary: 0.15 (15% - summary content)
  temporal: 0.05 (5% - recency)
```

**Threshold Filtering**:
```typescript
if activationScore >= threshold:
  memory ACTIVATED → sent to LLM context
else:
  memory is CANDIDATE → tracked but not used
```

**Default Thresholds by Context Type**:
| Context Type | Threshold | Rationale |
|-------------|----------|-----------|
| query | 0.75 | Search needs high confidence |
| task | 0.8 | Task execution needs precision |
| conversation | 0.3-0.7 | Chat allows references with some noise |
| document | 0.6 | Documents have broader content |
| mixed | 0.65 | Middle ground |

### 4. EmbeddingGenerator

**Purpose**: Convert text to semantic vector representations

**Supported Models**:
- `openai/text-embedding-3-small`: OpenAI's compact model (1536 dims)
- `openai/text-embedding-3-large`: OpenAI's high-quality model (3072 dims)
- `openai/text-embedding-ada-002`: Legacy OpenAI model (1536 dims)
- `mock-semantic-model-v1`: Deterministic mock for testing (384 dims)

**Vector Creation Process**:
```typescript
generateEmbedding(content: string): EmbeddingVector
  1. Preprocess content (clean, truncate, add context)
  2. Generate vector via OpenAI API (or mock)
  3. Normalize to unit length
  4. Return { vector, model, dimensions }
```

**Vector Normalization**:
All vectors are normalized to unit length (magnitude = 1.0) for consistent cosine similarity:
```typescript
normalizeVector(vector: number[]): number[] {
  magnitude = sqrt(sum(v²))
  return vector.map(v => v / magnitude)
}
```

**Cosine Similarity**:
```typescript
cosineSimilarity(vec1: number[], vec2: number[]): number {
  dotProduct = sum(vec1[i] × vec2[i])
  magnitude1 = sqrt(sum(vec1²))
  magnitude2 = sqrt(sum(vec2²))
  return dotProduct / (magnitude1 × magnitude2)
}
```

### 5. SimilarityEngine

**Purpose**: Compute multi-dimensional similarity scores

**Similarity Metrics**:

| Metric | How Computed | Purpose |
|---------|--------------|---------|
| Embedding | Cosine similarity of semantic vectors | Content meaning |
| Metadata | Jaccard/Tanimoto for topics/entities | Context overlap |
| Summary | Token overlap or keyword matching in summaries | Content relevance |
| Temporal | Exponential decay based on memory age | Recency weighting |

**Temporal Decay Formula**:
```typescript
decay(age_ms: number): number {
  half_life = 30 × 24 × 60 × 60 × 1000  // 30 days
  return exp(-ln(2) × age / half_life)           // e^(-t/τ)
}

Example:
- Age 0 days → decay = 1.0 (full strength)
- Age 30 days → decay = 0.5 (half strength)
- Age 60 days → decay = 0.25 (quarter strength)
- Age 90 days → decay = 0.125 (eighth strength)
```

### 6. ThresholdManager

**Purpose**: Dynamic threshold adjustment based on system performance

**Adaptive Threshold Tuning**:
Monitors performance metrics and adjusts thresholds to optimize:
- **False positive rate**: Too many irrelevant memories activated
- **False negative rate**: Too many relevant memories not activated
- **Retrieval success rate**: Percentage of retrievals finding relevant content

**Adaptation Logic**:
```typescript
if falsePositiveRate > 0.2:
  threshold += 0.1  // Increase threshold, reduce noise
else if falseNegativeRate > 0.2:
  threshold -= 0.1  // Decrease threshold, capture more
```

**Consistency Enforcement**:
Ensures similar context types (`conversation`, `query`) have aligned thresholds to prevent confusing behavior.

### 7. MemoryLifecycleManager

**Purpose**: Manage memory lifecycle from creation to archival

**Lifecycle States**:
```
Active Memories
    ↓ (activation score drops below threshold)
    ↓
    ↓ (or age exceeds retention period)
    ↓
Archived Memories
```

**Archival Triggers**:
- Activation score falls below archival threshold
- Memory age exceeds retention period (e.g., 90 days)
- Manual archival command

**Cleanup Operations**:
- Delete archived memories after retention period
- Compact memory store indices
- Update system statistics

### 8. Configuration

**ShadowMemorySystemConfig**:
```typescript
{
  thresholds: {
    default: 0.3,      // Override as needed
    semantic: 0.3,
    contextual: 0.3,
    temporal: 0.3,
    ...
  },
  weights: {
    embedding: 0.6,      // Higher weight for semantic understanding
    metadata: 0.2,
    summary: 0.15,
    temporal: 0.05,
  },
  maxMemories: 10000,
  cleanupInterval: 24 × 60 × 60 × 1000,
  decayFunction: (age) => exp(-age / (30 × 24 × 60 × 60 × 1000))
}
```

## Usage Example

### Conversation Flow

```
User: "I'm worried about security for my app"

1. Build Context:
   - Extract topics: ["security", "privacy", "app"]
   - Generate embedding via OpenAI
   - Create Context object with metadata

2. Retrieve Memories:
   getAllCandidateMemories() → Returns all stored memories with scores:
     [
       { id: "mem_001", score: 0.72, summary: "User expresses security concerns..." },
       { id: "mem_002", score: 0.45, summary: "User prefers PostgreSQL..." },
       { id: "mem_003", score: 0.28, summary: "User mentions co-founder..." },
     ]

3. Filter by Threshold (0.3 for conversation):
   getMemoryAwareness() → Activated:
     [
       { id: "mem_001", score: 0.72 },  // Above threshold
       { id: "mem_002", score: 0.45 },  // Above threshold
     ]

4. Format Context for LLM:
   formatMemoryContext() → 
     "HIGHLY RELEVANT MEMORIES:
      - [Score: 72%] User expresses security concerns...
      - [Score: 45%] User prefers PostgreSQL...
      
     POTENTIALLY RELEVANT MEMORIES:
      - [Score: 28%] User mentions co-founder..."

5. Generate Response:
   ChatOpenAI with:
     System prompt → "Use relevant memories naturally..."
     User context → "User: I'm worried about security..."
     Memory context → Activated memories above
   
   Response → "Based on your security concerns..."

6. Store Conversation:
   storeMemory("User: I'm worried about security...")  // With metadata
   storeMemory("Assistant: Based on your security concerns...")  // With metadata
```

### Memory Activation Display

For debugging/monitoring, use `getAllCandidateMemories()` to show all considered memories:
- **Activated** [✓]: Passed threshold, sent to LLM
- **Candidate** [○]: Below threshold, tracked but not used

This provides transparency into what the system is considering and why certain memories were selected.

## Performance Considerations

1. **Embedding Dimensionality**: Higher dimensions = more semantic detail but slower similarity
   - 384 (small): Fast, good for general tasks
   - 1536 (large): Slower, better for complex understanding

2. **Threshold Tuning**: Balance between precision (fewer results) and recall (more results)
   - Lower threshold → More memories activated (higher recall, lower precision)
   - Higher threshold → Fewer memories activated (higher precision, lower recall)

3. **Temporal Decay**: Prevents stale memories from overwhelming new context
   - Configurable half-life (default: 30 days)
   - Ensures recent conversations are more accessible

4. **Batch Retrievals**: Process multiple memories efficiently when needed
   - System maintains indexed embeddings for O(log n) similarity lookup

## API Integration

The system exposes these key interfaces:

```typescript
// For chat applications
interface MemoryAugmentedAgent {
  chat(message: string): Promise<AgentResponse>
  clearHistory(): void
}

// For direct memory access
interface ShadowMemorySystem {
  storeMemory(content, context): Promise<MemoryId>
  retrieveMemory(memoryId): Promise<Memory>
  getMemoryAwareness(context): Promise<MemoryAwareness[]>
  getAllCandidateMemories(context): Promise<MemoryAwareness[]>
  getSystemStats(): Promise<SystemStats>
}

// Memory activation details
interface MemoryAwareness {
  memoryId: MemoryId
  activationScore: number      // 0-1 combined relevance
  relevanceType: 'semantic' | 'contextual' | 'temporal' | 'mixed'
  summary: string
  confidence: number           // 0-1 score reliability
}
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | No | OpenAI API key for embeddings and LLM | - |
| `OPENAI_MODEL` | No | Model for chat responses | `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | No | Embedding model | `openai/text-embedding-3-small` |
| `OPENAI_EMBEDDING_DIMENSIONS` | No | Target vector dimensions | 1536 (from model) |

## Frontend Integration

The React frontend connects via REST API:

```
POST /api/chat
  Request: { message: string, apiKey?: string }
  Response: {
    content: string,
    memoryContext: {
      activatedMemories: MemoryCandidate[],
      candidateMemories: MemoryCandidate[],  // All considered
      totalMemories: number,
      avgActivationScore: number
    },
    storedMemoryId: string
  }

GET /api/stats
  Response: {
    totalMemories: number,
    averageActivationScore: number,
    hasApiKey: boolean,
    ...
  }

POST /api/config/apikey
  Request: { apiKey: string }
  Response: { success: boolean }

GET /api/health
  Response: { status: 'ok', hasApiKey: boolean, timestamp: string }
```

## Summary

The Shadow Memory System provides:

1. **Semantic Memory Retrieval**: Vector embeddings understand meaning, not just keywords
2. **Multi-Dimensional Scoring**: Combines semantic, contextual, temporal factors
3. **Adaptive Thresholds**: Automatically tunes precision based on usage patterns
4. **Shadow Awareness**: Full memory list tracked, only relevant content loaded
5. **Conversation Integration**: Seamless chat with memory-augmented responses
6. **Configurable**: Adjustable weights, thresholds, decay functions per use case

# Alternative Memory Architectures

Current shadow memory system works, but here are more advanced alternatives for AI memory management.

## 1. RAG (Retrieval-Augmented Generation)

### Overview
Industry-standard approach: retrieve relevant documents, feed to LLM as context, generate response.

### Architecture
```
User Query
    ↓
Vector Store (Pinecone, Weaviate, Qdrant)
    ↓
Top-K Retrieval (e.g., top 5 documents)
    ↓
Re-ranker (Cross-Encoder for precision)
    ↓
LLM with retrieved context
    ↓
Response
```

### Key Differences from Shadow Memory
| Feature | Shadow Memory | RAG |
|---------|--------------|------|
| Retrieval | Threshold-based (score ≥ X) | Top-K (top N documents) |
| Memory Loading | Shadow summaries only | Full document chunks |
| Storage | In-memory store | Dedicated vector DB (scalable) |
| Ranking | Pre-computed scores | Re-ranking at query time |
| Relevance | Multi-dimensional combined | Semantic similarity only |

### Pros
- Standardized pattern with production-grade tools
- Scalable to millions of documents
- Re-ranking improves precision
- Dedicated vector databases handle indexing/queries efficiently

### Cons
- Requires external vector DB infrastructure
- More complex to set up
- Less control over retrieval logic
- API calls to vector DB add latency

### Implementation Options
| Tool | Hosted | Open Source | Key Features |
|------|---------|--------------|---------------|
| Pinecone | ✅ | ❌ | Fully managed, auto-scaling |
| Weaviate | ✅ | ✅ | GraphQL API, built-in re-ranking |
| Qdrant | ✅ | ✅ | Hybrid search (keyword + vector) |
| ChromaDB | ❌ | ✅ | Local-first, Python/JS SDKs |
| Milvus | ✅ | ✅ | 10M+ vectors, GPU support |

### When to Choose RAG
- Need to scale beyond 10,000 memories
- Want industry-standard tools
- Have infrastructure budget for hosted vector DB
- Document-focused use cases (not just conversation)

---

## 2. Hierarchical Memory System (MemGPT-style)

### Overview
Multiple memory layers with different retention policies: sensory, short-term, working, long-term.

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Sensory Memory                      │
│  • Raw conversation transcripts                    │
│  • Unprocessed events                           │
│  • Retention: Hours                             │
│         ↓ (compression)                             │
│                    Short-term Memory                   │
│  • Recent conversations (last 24h)                 │
│  • Important events flagged by LLM                  │
│  • Retention: Days                                │
│         ↓ (summarization)                           │
│                    Working Memory                    │
│  • Current conversation context                     │
│  • Active task/goal tracking                     │
│  • Retention: Hours → cleared per task               │
│         ↓ (consolidation)                             │
│                    Long-term Memory                   │
│  • Consolidated knowledge                       │
│  • User preferences, patterns                   │
│  • Retention: Permanent (or archival)               │
└─────────────────────────────────────────────────────────────┘
```

### Memory Flow Between Layers

```
Sensory → Short-term:
  LLM classifier identifies: important, discard, compress
  Important → Summarized → Short-term

Short-term → Working:
  Contextual relevance + recency
  Active conversation → Working memory

Working → Long-term:
  Access frequency + importance
  Consolidated patterns → Long-term memory
```

### Key Differences
| Feature | Shadow Memory | Hierarchical |
|---------|--------------|---------------|
| Memory Structure | Single layer | Multiple layers (4 tiers) |
| Retention Policy | Threshold + decay | Time-based per layer |
| Compression | Manual summarization | Automatic summarization |
| Context Focus | Current query | Multi-layer awareness |

### Pros
- Mimics human memory architecture
- Different retention policies for different use cases
- Automatic compression reduces memory size
- Clear separation between active and historical

### Cons
- More complex to implement
- Needs LLM for classification decisions
- Harder to debug which layer affected retrieval
- Transitions between layers can be lossy

### Implementation Approach
```typescript
interface HierarchicalMemory {
  sensory: {
    store(content: SensoryInput): Promise<void>
    compress(): Promise<Summary[]>
    cleanup(olderThan: Date): Promise<void>
  },
  shortTerm: {
    retrieve(query: Context): Promise<Memory[]>
    consolidate(): Promise<void>  // Move to long-term
  },
  working: {
    getCurrentContext(): Promise<WorkingContext>
    clear(): void
  },
  longTerm: {
    retrieve(query: Context): Promise<Memory[]>
    store(consolidated: ConsolidatedMemory): Promise<void>
  }
}
```

### When to Choose Hierarchical Memory
- Conversational AI (chatbots, personal assistants)
- Need to balance recent context with long-term patterns
- Want automatic memory compression
- System should "forget" unimportant information

---

## 3. Knowledge Graph Memory

### Overview
Store memories as entities and relationships, enabling multi-hop reasoning.

### Architecture
```
┌──────────────────────────────────────────────────────┐
│                   Query: "My co-founder"         │
│                       ↓                         │
│              Entity Extraction                  │
│         Entities: ["co-founder", "startup"]        │
│                       ↓                         │
│              Graph Traversal (Neo4j)               │
│         co-founder ──handles──> business_dev      │
│           │                                    │
│           └─named──> "Alex"                    │
│                       ↓                         │
│              Path + Context Retrieval             │
│         [co-founder → Alex → handles business]        │
│                       ↓                         │
│              LLM Response (multi-hop aware)         │
│         "Alex, who handles your business development..."   │
└──────────────────────────────────────────────────────┘
```

### Graph Schema
```
(:User {name, preferences})
  -[:WORKS_ON]→ (:Startup {name, sector})
  -[:HAS_COFOUNDER]→ (:Person {name, role})
  -[:PREFERS]→ (:Technology {name})

(:Person {name, role, last_contacted})
  -[:HANDLE_AREA]→ (:Area {name, priority})
```

### Key Differences
| Feature | Shadow Memory | Knowledge Graph |
|---------|--------------|-----------------|
| Retrieval | Similarity search | Graph traversal |
| Relationships | Implicit (via similarity) | Explicit edges |
| Multi-hop | ❌ No | ✅ Yes (follow relationships) |
| Entity Tracking | Simple metadata | Central to design |
| Reasoning | Single-step | Multi-step inference |

### Pros
- Enables multi-hop reasoning (A → B → C)
- Explicit relationships between entities
- Complex queries (e.g., "Who handles areas my co-founder doesn't?")
- Handles ambiguous references via context paths

### Cons
- Requires graph database (Neo4j, Memgraph, TigerGraph)
- Entity extraction is complex
- Slower for simple semantic queries
- More maintenance (keeping graph consistent)

### Graph Databases
| Database | Language | Best For |
|----------|----------|-----------|
| Neo4j | Cypher, Python, JS | General purpose, mature ecosystem |
| Memgraph | Python, GQL | Fast for analytics |
| TigerGraph | GSQL | Real-time, low latency |
| NebulaGraph | nGQL, C++ | Open source, distributed |

### When to Choose Knowledge Graph
- Need multi-hop reasoning
- Relationships between entities are important
- Queries involve connections (e.g., "Who X knows?")
- Entity-centric domain (CRM, knowledge bases)

---

## 4. Streaming Attention Memory

### Overview
Replace threshold filtering with attention-weighted retrieval using transformer-style mechanisms.

### Architecture
```
User Query
    ↓
Query Embedding (via same encoder as memories)
    ↓
Attention Computation:
  For each memory:
    attention_i = softmax(
      score(
        query_embedding,
        memory_i.embedding,
        query_metadata,
        memory_i.metadata,
        temporal_decay(memory_i.age)
      ) / √d_k
    )
    ↓
Weighted Context:
  context = Σ (attention_i × memory_i.summary)
    ↓
LLM with weighted context
```

### Attention Score
```typescript
function computeAttention(
  query: EmbeddingVector,
  memory: Memory,
  temperature: number = 1.0
): number {
  // Semantic similarity (dot product with normalized vectors)
  semanticScore = dot(query.embedding, memory.embedding)

  // Temporal decay (recent memories get higher attention)
  ageHours = (Date.now() - memory.timestamp) / (3600 * 1000)
  temporalWeight = exp(-ageHours / 24)  // Decay over 24 hours

  // Metadata match (explicit boosts)
  metadataBoost = matchMetadata(query.metadata, memory.metadata) ? 0.1 : 0

  // Combined score
  combinedScore = semanticScore + temporalWeight + metadataBoost

  // Apply temperature (lower = more focused, higher = more diffuse)
  return combinedScore / temperature
}

// Softmax normalization (all attentions sum to 1)
function normalizeAttentions(scores: number[]): number[] {
  expScores = scores.map(s => exp(s))
  sumExpScores = expScores.reduce((a, b) => a + b, 0)
  return expScores.map(s => s / sumExpScores)
}
```

### Key Differences
| Feature | Shadow Memory | Attention Memory |
|---------|--------------|-----------------|
| Selection | Threshold (on/off) | Softmax weighting (graded) |
| Context | Binary (selected/not) | Weighted blend of all |
| Memory Focus | Top candidates only | All memories considered |
| Tuning | Manual threshold | Temperature parameter |

### Pros
- No hard threshold to tune
- All memories contribute to context (weighted)
- Temperature provides fine-grained control
- More natural, gradual memory retrieval

### Cons
- More computation (attention for all memories)
- Context can be noisy (all memories included)
- Harder to explain why certain memories were ignored
- Need temperature tuning per use case

### When to Choose Attention Memory
- Want smooth, graded memory retrieval
- System benefits from diverse context
- Temperature is acceptable control parameter
- Want to avoid binary selection issues

---

## 5. Hybrid: RAG + Knowledge Graph

### Overview
Combine semantic search (RAG) with explicit relationships (graph) for best of both.

### Architecture
```
User Query
    ├─────────────┬─────────────┐
    ↓             ↓             ↓
Vector Store    Entity       Metadata
(similarity)   Extraction   Filter
    │             │             │
    └─────────────┴─────────────┘
                ↓
        Multi-Stage Retrieval:
          Stage 1: Top-K semantic search (50 candidates)
          Stage 2: Graph traversal from candidates (expand to connected)
          Stage 3: Re-rank combined set
                ↓
        LLM with retrieved context
```

### Retrieval Pipeline
```typescript
async function hybridRetrieval(query: string, topK: number = 5): Promise<Memory[]> {
  // Stage 1: Semantic search (vector DB)
  const semanticCandidates = await vectorStore.search(query, { topK: 50 });

  // Stage 2: Entity extraction
  const entities = extractEntities(query);

  // Stage 3: Graph expansion
  const graphMemories: Set<Memory> = new Set();
  for (const memory of semanticCandidates.slice(0, 20)) {
    graphMemories.add(memory);
    // Find related entities and follow relationships
    const related = await graphDB.findRelated(memory.id, entities, depth: 2);
    related.forEach(m => graphMemories.add(m));
  }

  // Stage 4: Re-rank combined set
  const allCandidates = Array.from(graphMemories);
  const reranked = await reRanker.rank(query, allCandidates);

  // Stage 5: Return top-K
  return reranked.slice(0, topK);
}
```

### Pros
- Semantic similarity + explicit relationships
- Handles both "what" and "who/where/when" queries
- Graph expansion finds connections pure search misses
- Re-ranking improves final precision

### Cons
- Most complex architecture
- Requires vector DB + graph DB
- Slower (multiple stages)
- Higher operational cost

### When to Choose Hybrid
- Complex domain with relationships (CRM, knowledge base)
- Need multi-hop reasoning
- Budget for multiple infrastructure components
- Queries mix semantic and relational

---

## Recommendation Matrix

| Use Case | Best Approach | Why |
|----------|--------------|-------|
| Simple chatbot | RAG (Vector DB) | Standard, scalable, easy setup |
| Personal assistant | Hierarchical Memory | Balances recent + long-term context |
| Knowledge base | Knowledge Graph | Multi-hop reasoning, explicit relationships |
| Research assistant | Hybrid (RAG + Graph) | Semantic + relational depth |
| Task-oriented | Streaming Attention | Smooth weighting, temperature control |
| Small-scale (<10K memories) | Shadow Memory (current) | No external dependencies, fully local |

---

## Comparison Summary

| Architecture | Complexity | Scalability | Memory Quality | Setup Effort | Runtime Cost |
|------------|-----------|--------------|----------------|----------------|---------------|
| Shadow Memory (current) | Low | Medium | Medium | Low | Low |
| RAG | Medium | High | Medium | Medium | Medium |
| Hierarchical | High | High | High | High | Medium |
| Knowledge Graph | High | Medium | High (multi-hop) | High | High |
| Attention Memory | Medium | Medium | Medium | Medium | Low |
| Hybrid (RAG + Graph) | Very High | Very High | Very High | Very High | Very High |

---

## Migration Path

### From Shadow Memory to RAG
1. Choose vector database (e.g., Pinecone for hosted, ChromaDB for local)
2. Batch migrate existing embeddings:
   ```typescript
   for (const memory of allMemories) {
     await vectorDB.upsert({
       id: memory.id,
       values: memory.embedding,
       metadata: memory.metadata,
     });
   }
   ```
3. Replace `getAllCandidateMemories()` with vector DB search
4. Add re-ranking stage if needed

### From Shadow Memory to Hierarchical
1. Define layer schemas and retention policies
2. Classify existing memories (LLM-assisted):
   - Sensory: Raw transcripts
   - Short-term: Last 24h
   - Long-term: Consolidated knowledge
3. Implement layer transition logic (compression, consolidation)
4. Update retrieval to search appropriate layer

### From Shadow Memory to Attention Memory
1. Replace threshold check with softmax computation
2. Add temperature parameter to config
3. Update context building to use weighted blend
4. Test different temperatures (0.3-2.0) for optimal results

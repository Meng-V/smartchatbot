# Weaviate RAG + Routing Integration Guide

This guide explains how RAG (Retrieval-Augmented Generation) is integrated into SmartChatbot using Weaviate and how to route institution-specific questions to the right agent/tool.

## What Was Added
- Weaviate client service (HTTP-based) with schema management and hybrid search
- OpenAI embedding service (local, vectorizer: none in Weaviate)
- RAG LlmTool: `RagFaqSearch`
- Three-stage RouterService to detect institution-specific intents
- Tool wiring in the LLM chain to restrict tools per message
- Ingestion script for Q/A pairs
- Environment validation updates for Weaviate and RAG configs

## New Files
- src/shared/services/embedding/embedding.service.ts
- src/weaviate/weaviate.service.ts
- src/weaviate/weaviate.module.ts
- src/routing/router.service.ts
- src/routing/routing.module.ts
- src/llm-chain/llm-toolbox/rag-faq-tool/rag-faq-tool.service.ts
- src/scripts/ingestion-runner.module.ts
- src/scripts/ingest-faqs.ts
- RAG_WEAVIATE_GUIDE.md (this guide)

## Updated Files
- src/llm-chain/llm-toolbox/llm-toolbox.module.ts (register RAG tool)
- src/llm-chain/llm-chain.module.ts (import RoutingModule)
- src/llm-chain/llm-chain.service.ts (inject RouterService + RAG tool and restrict tools per message)
- src/config/env.validation.ts (Weaviate + RAG config defaults)
- src/shared/shared.module.ts (provide EmbeddingService)

## Environment Variables
Add these to your .env (or secrets store):

- WEAVIATE_SCHEME=https
- WEAVIATE_HOST=your-cluster.weaviate.network
- WEAVIATE_API_KEY=your_key (optional if cluster is open)
- RAG_EMBEDDING_MODEL=text-embedding-3-small
- RAG_TOP_K=6
- RAG_HYBRID_ALPHA=0.6
- RAG_MIN_SCORE=0.70

Existing OpenAI vars must be set:
- OPENAI_API_KEY
- OPENAI_ORGANIZATION_ID (optional)

Google search already used in project:
- GOOGLE_API_KEY
- GOOGLE_LIBRARY_SEARCH_CSE_ID

## Weaviate Schema
The class `FaqEntry` is created automatically on first ingest (vectorizer: none):
- question: text
- answer: text
- category: text
- tags: text[]
- institutionId: text
- campus: text
- sourceUrl: text
- updatedAt: date

If you need multi-tenancy, you can extend to Weaviate tenant features later; for now, `institutionId` and `campus` are used as filters.

## Ingesting Q/A Pairs
Input file format (JSON array):
[
  {
    "question": "How can I access the New York Times?",
    "answer": "Students can register with their university email at <link>.",
    "category": "Newspapers",
    "tags": ["nyt", "new york times", "newspaper"],
    "institutionId": "miami-oh",
    "campus": "oxford",
    "sourceUrl": "https://libguides.lib.miamioh.edu/newspapers/nyt",
    "updatedAt": "2025-10-20T00:00:00.000Z"
  }
]

Run ingestion:
- Build: npm run build
- Execute: npx ts-node src/scripts/ingest-faqs.ts ./path/to/faqs.json

What ingestion does:
- Ensures schema exists
- Builds embeddings locally via OpenAI (text-embedding-3-small by default)
- Batch upserts to Weaviate (vector + properties)

## Retrieval Logic
- `RagFaqSearch` computes an embedding for the query
- Performs Weaviate hybrid search with `alpha` blend of sparse (BM25) and dense (vector)
- Filters by `institutionId`, `campus`, and/or `category` if provided
- Re-scores results using Weaviate score/distance → pseudo score
- Drops results below `RAG_MIN_SCORE`, returns contexts with citations

Defaults:
- topK = RAG_TOP_K (6)
- alpha = RAG_HYBRID_ALPHA (0.6)
- minScore = RAG_MIN_SCORE (0.70)

## Router Service (Question Classification)
Three stages for robust routing:
1) Rules: Keyword triggers per category (fast, precise)
2) Embedding classifier: Compare query embedding to category centroids
3) Fallback: Allow all tools and let LLM decide

Initial taxonomy (customize in src/routing/router.service.ts):
- SoftwareLicenses: adobe, creative cloud, photoshop, spss, matlab, arcgis, license
- MakerSpace: maker, makerspace, 3d print, laser cutter, vinyl cutter
- Newspapers: nyt, new york times, wsj, wall street journal, financial times
- Printing: print, printer, printing, quota, photocopy
- AccessBorrowing: borrow, loan, renew, fine, interlibrary loan, ill

Routing thresholds:
- Rule stage accepts if score >= 0.85
- Embedding stage accepts if cosine similarity >= 0.80
- Otherwise the LLM sees all tools

Allowed tools for institution intents (by default):
- RagFaqSearch
- GoogleSiteSearchTool (as backup)

## How It Wires Into the Chat Flow
- LlmChainService injects RouterService
- Before each LLM call, we compute allowed tools and set them on the prompt
- If router fails, all tools remain available (safe fallback)

## Citations and UX
- RagFaq tool returns contexts with source URLs (citations) and scores
- The core prompt currently instructs the model to only return the final answer
- To add in-text citations or a reference section, update your prompt or the answer post-processor to include `sourceUrl`

## Operational Tips
- Health check: WeaviateService.health() checks /v1/.well-known/ready
- Logs/metrics: Add per your logging setup; track top scores and latency
- Tuning: Adjust RAG_HYBRID_ALPHA and RAG_MIN_SCORE based on evaluation
- Reranking: If needed, add Cohere Rerank (optional, not included by default)

## Evaluation
Build a small eval set (~50–100 queries) per category with realistic phrasings. Measure:
- Retrieval@k (does the right FAQ appear?)
- Answer quality (manual rating)
- Routing accuracy (does it pick the right agent?)
Iterate thresholds and taxonomy terms.

## Customization Checklist
- Update taxonomy keywords and examples in RouterService
- Set institutionId/campus conventions
- Prepare Q/A JSON and run ingestion
- Set environment variables
- Decide whether to include citations in final user answers

## Troubleshooting
- Build succeeds but RAG returns nothing: ensure ingest ran and cluster is reachable
- 401/403 from Weaviate: check WEAVIATE_API_KEY and roles
- Timeouts: consider increasing request timeout or using Weaviate Cloud regions closer to server
- Unexpected results: lower RAG_MIN_SCORE, increase topK, or expand Q/A coverage

## Security
- Embeddings are created server-side using your OpenAI API key (not stored in Weaviate)
- Weaviate API key is optional if your cluster is private network

## Next Steps (Optional Enhancements)
- Add LLM-based router fallback stage (compact prompt) if needed
- Add reranker for better precision with denser corpora
- Add nightly ingestion/refresh job
- Store provenance (collection name, editor) for auditability

---
This integration is live in code after `npm run build`. Configure env vars, ingest your Q/A file, and you’re ready to serve institution-specific answers with RAG.

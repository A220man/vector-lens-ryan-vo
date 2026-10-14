# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

core-skeleton

## Roadmap

### core-skeleton — FastAPI/React skeleton with auth, Docker, CI

Status: in_progress

Acceptance:
- FastAPI app starts and serves health endpoint
- React app builds and serves frontend
- OIDC Keycloak authentication flow works (login/callback/logout)
- Docker compose brings up backend, frontend, Keycloak, PostgreSQL
- CI runs backend tests, frontend build/test, Docker builds
- portfolio.json, README, LICENSE, CHANGELOG present

### embedding-inspector — Embedding vector inspector workspace

Status: planned

Acceptance:
- Upload/load embedding collections (numpy .npy, .npz, parquet, JSON)
- List/search/filter embedding records with pagination
- View vector details: dimensions, stats, nearest neighbors
- Export selected vectors to JSON/CSV/npy

### similarity-search — Similarity search and clustering workflow

Status: planned

Acceptance:
- Query by vector or text (with local embedding model)
- k-NN search with cosine/euclidean/dot product metrics
- Clustering (k-means, HDBSCAN) with cluster visualization data
- Results export and persistence

### model-debug-trace — Model forward-pass trace debugger

Status: planned

Acceptance:
- Load ONNX/TorchScript model and trace forward pass
- Step through layers: view input/output tensors per layer
- Tensor inspection: shape, stats, histograms, outliers
- Breakpoint-like pause at selected layers

### llm-explain — Optional LLM-powered explanations

Status: planned

Acceptance:
- Configurable LLM provider (OpenAI-compatible, Anthropic, Gemini, Ollama)
- Explain embedding neighborhoods / cluster semantics
- Advisory label, grounded in actual records, clear provider errors
- Works without LLM key (offline core)


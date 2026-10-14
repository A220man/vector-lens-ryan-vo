import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export function Dashboard() {
  const { isAuthenticated, user, isLoading } = useAuth()
  const [health, setHealth] = React.useState<{ status: string; service?: string; version?: string } | null>(null)
  const [ready, setReady] = React.useState<{ ready: boolean; checks?: Record<string, string> } | null>(null)
  React.useEffect(() => {
    async function fetchStatus() {
      try {
        const [h, r] = await Promise.all([api.health.check(), api.health.ready()])
        setHealth(h)
        setReady(r)
      } catch {
        setHealth({ status: 'error' })
        setReady({ ready: false })
      }
    }
    fetchStatus()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <section>
        <h1 className="text-2xl font-semibold mb-sm">vector-lens-ryan-vo</h1>
        <p className="text-[var(--color-text-muted)] max-w-2xl">
          AI/ML Embedding Debugger — Inspect, search, and understand vector embeddings and model internals.
          Inspired by the multi-process graphical debugging approach of raddebugger.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="card">
          <h2 className="font-semibold mb-sm">System Health</h2>
          <div className="flex items-center gap-sm mb-md">
            <span className={`w-3 h-3 rounded-full ${
              health?.status === 'healthy' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'
            }`} />
            <span className="font-mono text-sm">
              {health?.status === 'healthy' ? 'Healthy' : health?.status || 'Unknown'}
            </span>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            Service: {health?.service || 'vector-lens-ryan-vo'} v{health?.version || '1.0.0'}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-sm">Readiness</h2>
          <div className="flex items-center gap-sm mb-md">
            <span className={`w-3 h-3 rounded-full ${
              ready?.ready ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
            }`} />
            <span className="font-mono text-sm">
              {ready?.ready ? 'Ready' : 'Not Ready'}
            </span>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            {ready?.checks && Object.entries(ready.checks).map(([k, v]) => (
              <div key={k} className="font-mono">{k}: {v}</div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-sm">Authentication</h2>
          <div className="flex items-center gap-sm mb-md">
            <span className={`w-3 h-3 rounded-full ${
              isAuthenticated ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-muted)]'
            }`} />
            <span className="font-mono text-sm">
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </span>
          </div>
          {isAuthenticated && user && (
            <div className="text-sm text-[var(--color-text-muted)]">
              <div>{user.username} ({user.email})</div>
              <div className="font-mono">{user.roles}</div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <Link to="/embeddings" className="card hover:border-[var(--color-primary)] transition-colors">
          <h3 className="font-semibold mb-sm">📊 Embedding Inspector</h3>
          <p className="text-[var(--color-text-muted)] text-sm">
            Load and browse embedding collections. View vector statistics, dimensions, and nearest neighbors.
            Support for .npy, .npz, Parquet, and JSON formats.
          </p>
        </Link>

        <Link to="/search" className="card hover:border-[var(--color-primary)] transition-colors">
          <h3 className="font-semibold mb-sm">🔍 Similarity Search & Clustering</h3>
          <p className="text-[var(--color-text-muted)] text-sm">
            Query embeddings by vector or text with k-NN search. Cluster using k-means or HDBSCAN.
            Local embedding model for text-to-vector queries.
          </p>
        </Link>

        <Link to="/trace" className="card hover:border-[var(--color-primary)] transition-colors">
          <h3 className="font-semibold mb-sm">🔬 Model Trace Debugger</h3>
          <p className="text-[var(--color-text-muted)] text-sm">
            Load ONNX/TorchScript models and step through forward passes. Inspect tensor shapes,
            statistics, histograms, and outliers at each layer.
          </p>
        </Link>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-md">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <h4 className="font-medium mb-sm">With Docker Compose</h4>
            <pre className="font-mono text-xs bg-[var(--color-bg)] p-md rounded-sm overflow-x-auto"><code>{`docker compose up -d --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# Keycloak: http://localhost:8080`}</code></pre>
          </div>
          <div>
            <h4 className="font-medium mb-sm">Local Development</h4>
            <pre className="font-mono text-xs bg-[var(--color-bg)] p-md rounded-sm overflow-x-auto"><code>{`# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev`}</code></pre>
          </div>
        </div>
      </section>
    </div>
  )
}
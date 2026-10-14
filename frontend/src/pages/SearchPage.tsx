import React, { useState, useEffect } from 'react'
import { api, ApiError } from '../api/client'
import type { EmbeddingCollection, SearchResult } from '../types'

export function SearchPage() {
  const [collections, setCollections] = useState<EmbeddingCollection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [queryText, setQueryText] = useState('')
  const [queryVector, setQueryVector] = useState('')
  const [k, setK] = useState(10)
  const [metric, setMetric] = useState<'cosine' | 'euclidean' | 'dot'>('cosine')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clusteringLoading, setClusteringLoading] = useState(false)
  const [clusterMethod, setClusterMethod] = useState<'kmeans' | 'hdbscan'>('kmeans')
  const [clusterParams, setClusterParams] = useState({ n_clusters: 5 })
  const [clusterResult, setClusterResult] = useState<{ cluster_id: string } | null>(null)

  const fetchCollections = async () => {
    try {
      const data = await api.embeddings.listCollections({ page: 1, page_size: 100 })
      setCollections(data.items)
    } catch {
      // Ignore
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCollection) return
    if (!queryText && !queryVector) return

    try {
      setLoading(true)
      setError(null)
      let vector: number[] | undefined
      if (queryVector) {
        vector = queryVector.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
        if (vector.length === 0) {
          setError('Invalid vector format')
          return
        }
      }

      const data = await api.search.knn({
        collection_id: selectedCollection,
        vector,
        text: queryText || undefined,
        k,
        metric,
      })
      setResults(data.results)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCluster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCollection) return

    try {
      setClusteringLoading(true)
      const data = await api.search.cluster({
        collection_id: selectedCollection,
        method: clusterMethod,
        params: clusterParams,
      })
      setClusterResult(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Clustering failed')
    } finally {
      setClusteringLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  return (
    <div className="space-y-lg">
      <h1 className="text-2xl font-semibold">Similarity Search & Clustering</h1>

      {error && (
        <div className="card badge-danger p-md" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-1 card space-y-lg">
          <section>
            <h2 className="font-semibold mb-md">Search</h2>
            <form onSubmit={handleSearch} className="space-y-md">
              <div>
                <label className="label">Collection</label>
                <select
                  className="input"
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  required
                >
                  <option value="">Select collection</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.vector_count} × {c.dimensions})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Query Text (uses local embedding model)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Enter text to search..."
                />
              </div>

              <div>
                <label className="label">Or Query Vector (comma-separated)</label>
                <textarea
                  className="input font-mono text-xs"
                  rows={2}
                  value={queryVector}
                  onChange={(e) => setQueryVector(e.target.value)}
                  placeholder="0.1, -0.2, 0.5, ..."
                />
              </div>

              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label className="label">k (neighbors)</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="100"
                    value={k}
                    onChange={(e) => setK(parseInt(e.target.value) || 10)}
                  />
                </div>
                <div>
                  <label className="label">Metric</label>
                  <select className="input" value={metric} onChange={(e) => setMetric(e.target.value as 'cosine' | 'euclidean' | 'dot')}>
                    <option value="cosine">Cosine</option>
                    <option value="euclidean">Euclidean</option>
                    <option value="dot">Dot Product</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading || !selectedCollection} className="btn btn-primary w-full">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </section>

          <section className="border-t border-[var(--color-border)] pt-lg">
            <h2 className="font-semibold mb-md">Clustering</h2>
            <form onSubmit={handleCluster} className="space-y-md">
              <div>
                <label className="label">Method</label>
                <select className="input" value={clusterMethod} onChange={(e) => setClusterMethod(e.target.value as 'kmeans' | 'hdbscan')}>
                  <option value="kmeans">K-Means</option>
                  <option value="hdbscan">HDBSCAN</option>
                </select>
              </div>

              {clusterMethod === 'kmeans' && (
                <div>
                  <label className="label">Number of Clusters</label>
                  <input
                    type="number"
                    className="input"
                    min="2"
                    max="100"
                    value={clusterParams.n_clusters}
                    onChange={(e) => setClusterParams({ ...clusterParams, n_clusters: parseInt(e.target.value) || 5 })}
                  />
                </div>
              )}

              {clusterMethod === 'hdbscan' && (
                <div className="text-sm text-[var(--color-text-muted)]">
                  HDBSCAN parameters (min_cluster_size, min_samples) — configured via backend
                </div>
              )}

              <button type="submit" disabled={clusteringLoading || !selectedCollection} className="btn btn-secondary w-full">
                {clusteringLoading ? 'Clustering...' : 'Run Clustering'}
              </button>

              {clusterResult && (
                <div className="badge badge-success p-sm text-center">
                  Cluster created: {clusterResult.cluster_id}
                </div>
              )}
            </form>
          </section>
        </div>

        <div className="lg:col-span-2 card">
          <h2 className="font-semibold mb-md">Results</h2>
          {results.length === 0 && !loading ? (
            <div className="text-center py-xl text-[var(--color-text-muted)]">
              No results yet. Configure search and click "Search".
            </div>
          ) : (
            <div className="space-y-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      <th className="p-sm">Rank</th>
                      <th className="p-sm">Vector ID</th>
                      <th className="p-sm font-mono">Score</th>
                      <th className="p-sm">Vector Preview</th>
                      <th className="p-sm">Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, idx) => (
                      <tr key={result.vector_id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]">
                        <td className="p-sm">{idx + 1}</td>
                        <td className="p-sm font-mono text-xs">{result.vector_id.slice(0, 16)}...</td>
                        <td className="p-sm font-mono">{result.score.toFixed(6)}</td>
                        <td className="p-sm font-mono text-xs">
                          [{result.vector.slice(0, 8).map(v => v.toFixed(4)).join(', ')}...]
                        </td>
                        <td className="p-sm text-[var(--color-text-muted)] text-xs">
                          {result.metadata ? JSON.stringify(result.metadata).slice(0, 100) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
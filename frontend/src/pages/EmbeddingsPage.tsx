import React, { useState, useEffect } from 'react'
import { api, ApiError } from '../api/client'
import type { EmbeddingCollection, EmbeddingVector } from '../types'

export function EmbeddingsPage() {
  const [collections, setCollections] = useState<EmbeddingCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<EmbeddingCollection | null>(null)
  const [vectors, setVectors] = useState<EmbeddingVector[]>([])
  const [vectorsLoading, setVectorsLoading] = useState(false)
  const [vectorsPage, setVectorsPage] = useState(1)
  const [vectorsTotal, setVectorsTotal] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const data = await api.embeddings.listCollections({ page: 1, page_size: 50 })
      setCollections(data.items)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const fetchVectors = async (collectionId: string, page = 1) => {
    try {
      setVectorsLoading(true)
      const data = await api.embeddings.listVectors(collectionId, { page, page_size: 50 })
      setVectors(data.items)
      setVectorsTotal(data.total)
      setVectorsPage(page)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load vectors')
    } finally {
      setVectorsLoading(false)
    }
  }

  const handleCollectionClick = (collection: EmbeddingCollection) => {
    setSelectedCollection(collection)
    fetchVectors(collection.id)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadName) return

    try {
      setUploading(true)
      await api.embeddings.createCollection({ name: uploadName, file: uploadFile })
      setShowUpload(false)
      setUploadName('')
      setUploadFile(null)
      fetchCollections()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Embedding Inspector</h1>
        <button onClick={() => setShowUpload(true)} className="btn btn-primary">Upload Collection</button>
      </div>

      {error && (
        <div className="card badge-danger p-md" role="alert">
          {error}
        </div>
      )}

      {showUpload && (
        <div className="card">
          <h3 className="font-semibold mb-md">Upload Embedding Collection</h3>
          <form onSubmit={handleUpload} className="space-y-md">
            <div>
              <label className="label">Collection Name</label>
              <input
                type="text"
                className="input"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="my-embeddings"
                required
              />
            </div>
            <div>
              <label className="label">File (.npy, .npz, .parquet, .json)</label>
              <input
                type="file"
                className="input"
                accept=".npy,.npz,.parquet,.json"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="flex justify-end gap-sm">
              <button type="button" onClick={() => { setShowUpload(false); setUploadName(''); setUploadFile(null); }} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={uploading} className="btn btn-primary">{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-1 card">
          <h2 className="font-semibold mb-md">Collections</h2>
          {loading ? (
            <div className="text-[var(--color-text-muted)]">Loading...</div>
          ) : collections.length === 0 ? (
            <div className="text-[var(--color-text-muted)] text-center py-lg">
              No collections yet. Click "Upload Collection" to add one.
            </div>
          ) : (
            <ul className="space-y-sm max-h-[600px] overflow-y-auto">
              {collections.map((col) => (
                <li
                  key={col.id}
                  onClick={() => handleCollectionClick(col)}
                  className={`p-sm rounded-sm cursor-pointer transition-colors ${
                    selectedCollection?.id === col.id
                      ? 'bg-[var(--color-primary)] text-[var(--color-bg)]'
                      : 'hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <div className="font-medium truncate">{col.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {col.vector_count.toLocaleString()} vectors × {col.dimensions} dims
                  </div>
                  {col.description && (
                    <div className="text-xs text-[var(--color-text-muted)] truncate mt-1">{col.description}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 card">
          {selectedCollection ? (
            <>
              <div className="flex items-center justify-between mb-md">
                <h2 className="font-semibold">{selectedCollection.name}</h2>
                <div className="text-sm text-[var(--color-text-muted)]">
                  {selectedCollection.vector_count.toLocaleString()} vectors × {selectedCollection.dimensions} dimensions
                </div>
              </div>

              {vectorsLoading ? (
                <div className="text-center py-lg text-[var(--color-text-muted)]">Loading vectors...</div>
              ) : vectors.length === 0 ? (
                <div className="text-center py-lg text-[var(--color-text-muted)]">No vectors in this collection</div>
              ) : (
                <div className="space-y-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                          <th className="p-sm font-mono">Index</th>
                          <th className="p-sm">Preview (first 8 dims)</th>
                          <th className="p-sm">Metadata</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vectors.map((vec) => (
                          <tr key={vec.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]">
                            <td className="p-sm font-mono">{vec.index}</td>
                            <td className="p-sm font-mono text-xs">
                              [{vec.vector.slice(0, 8).map(v => v.toFixed(4)).join(', ')}...]
                            </td>
                            <td className="p-sm text-[var(--color-text-muted)] text-xs">
                              {vec.metadata ? JSON.stringify(vec.metadata).slice(0, 100) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-md border-t border-[var(--color-border)]">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      Showing {vectors.length} of {vectorsTotal} vectors
                    </span>
                    <div className="flex gap-sm">
                      <button
                        className="btn btn-secondary text-sm"
                        disabled={vectorsPage <= 1}
                        onClick={() => fetchVectors(selectedCollection.id, vectorsPage - 1)}
                      >
                        Previous
                      </button>
                      <button
                        className="btn btn-secondary text-sm"
                        disabled={vectorsPage * 50 >= vectorsTotal}
                        onClick={() => fetchVectors(selectedCollection.id, vectorsPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-xl text-[var(--color-text-muted)]">
              Select a collection to view vectors
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import type { EmbeddingCollection, EmbeddingVector, SearchResult, ClusterResult, ModelTrace, LayerTensor } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(public status: number, public data: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    let data: unknown
    try {
      data = await response.json()
    } catch {
      data = await response.text()
    }
    const message = typeof data === 'object' && data !== null && 'detail' in data
      ? String((data as Record<string, unknown>).detail)
      : `HTTP ${response.status}`
    throw new ApiError(response.status, data, message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  health: {
    check: () => request<{ status: string; service: string; version: string }>('/health'),
    ready: () => request<{ ready: boolean; checks: Record<string, string> }>('/ready'),
  },

  auth: {
    me: () => request<{
      id: string
      keycloak_sub: string
      email: string
      username: string
      full_name: string | null
      roles: string
      is_active: boolean
      last_login: string | null
      created_at: string
      updated_at: string
    }>('/auth/me'),
    logout: () => request<{ logout_url: string }>('/auth/logout', { method: 'POST' }),
  },

  embeddings: {
    listCollections: (params?: { page?: number; page_size?: number }) => {
      const qs = new URLSearchParams()
      if (params?.page) qs.set('page', String(params.page))
      if (params?.page_size) qs.set('page_size', String(params.page_size))
      return request<{ items: EmbeddingCollection[]; total: number; page: number; page_size: number }>(
        `/api/embeddings/collections?${qs.toString()}`
      )
    },
    getCollection: (id: string) => request<EmbeddingCollection>(`/api/embeddings/collections/${id}`),
    createCollection: (data: { name: string; description?: string; file: File }) => {
      const form = new FormData()
      form.append('name', data.name)
      if (data.description) form.append('description', data.description)
      form.append('file', data.file)
      return request<EmbeddingCollection>('/api/embeddings/collections', {
        method: 'POST',
        headers: {},
        body: form,
      })
    },
    listVectors: (collectionId: string, params?: { page?: number; page_size?: number; search?: string }) => {
      const qs = new URLSearchParams()
      if (params?.page) qs.set('page', String(params.page))
      if (params?.page_size) qs.set('page_size', String(params.page_size))
      if (params?.search) qs.set('search', params.search)
      return request<{ items: EmbeddingVector[]; total: number; page: number; page_size: number }>(
        `/api/embeddings/collections/${collectionId}/vectors?${qs.toString()}`
      )
    },
    getVector: (collectionId: string, vectorId: string) =>
      request<EmbeddingVector>(`/api/embeddings/collections/${collectionId}/vectors/${vectorId}`),
    exportVectors: (collectionId: string, format: 'json' | 'csv' | 'npy', vectorIds?: string[]) =>
      request<Blob>(`/api/embeddings/collections/${collectionId}/export`, {
        method: 'POST',
        body: JSON.stringify({ format, vector_ids: vectorIds }),
      }),
  },

  search: {
    knn: (data: { collection_id: string; vector?: number[]; text?: string; k: number; metric: 'cosine' | 'euclidean' | 'dot' }) =>
      request<{ results: SearchResult[] }>('/api/search/knn', { method: 'POST', body: JSON.stringify(data) }),
    cluster: (data: { collection_id: string; method: 'kmeans' | 'hdbscan'; params: Record<string, unknown> }) =>
      request<{ cluster_id: string }>('/api/search/cluster', { method: 'POST', body: JSON.stringify(data) }),
    getCluster: (clusterId: string) => request<ClusterResult>(`/api/search/cluster/${clusterId}`),
  },

  trace: {
    listModels: () => request<ModelTrace[]>('/api/trace/models'),
    uploadModel: (file: File, name: string) => {
      const form = new FormData()
      form.append('file', file)
      form.append('name', name)
      return request<ModelTrace>('/api/trace/models', { method: 'POST', headers: {}, body: form })
    },
    runTrace: (modelId: string, input: number[]) =>
      request<{ run_id: string }>(`/api/trace/models/${modelId}/run`, { method: 'POST', body: JSON.stringify({ input }) }),
    getLayers: (modelId: string) => request<{ layers: Array<{ name: string; type: string; input_shape: number[]; output_shape: number[] }> }>(`/api/trace/models/${modelId}/layers`),
    getTensor: (runId: string, layer: string) => request<LayerTensor>(`/api/trace/runs/${runId}/tensors/${layer}`),
  },
}

export { ApiError }
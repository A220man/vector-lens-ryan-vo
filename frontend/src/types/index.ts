export interface User {
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
}

export interface HealthResponse {
  status: string
  service: string
  version: string
}

export interface ReadyResponse {
  ready: boolean
  checks: Record<string, string>
}

export interface ApiError {
  detail: string
  code?: string
}

export interface EmbeddingCollection {
  id: string
  name: string
  description: string | null
  vector_count: number
  dimensions: number
  file_path: string | null
  created_at: string
  updated_at: string
}

export interface EmbeddingVector {
  id: string
  collection_id: string
  index: number
  vector: number[]
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SearchRequest {
  collection_id: string
  vector?: number[]
  text?: string
  k: number
  metric: 'cosine' | 'euclidean' | 'dot'
}

export interface SearchResult {
  vector_id: string
  score: number
  vector: number[]
  metadata: Record<string, unknown> | null
}

export interface ClusterRequest {
  collection_id: string
  method: 'kmeans' | 'hdbscan'
  params: Record<string, unknown>
}

export interface ClusterResult {
  id: string
  collection_id: string
  method: string
  params: Record<string, unknown>
  cluster_count: number
  labels: number[]
  created_at: string
}

export interface ModelTrace {
  id: string
  name: string
  model_path: string
  input_shape: number[]
  created_at: string
}

export interface LayerTensor {
  layer_name: string
  layer_type: string
  input_shape: number[]
  output_shape: number[]
  input_stats: TensorStats
  output_stats: TensorStats
}

export interface TensorStats {
  mean: number
  std: number
  min: number
  max: number
  shape: number[]
}
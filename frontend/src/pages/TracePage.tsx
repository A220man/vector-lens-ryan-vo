import React, { useState, useEffect } from 'react'
import { api, ApiError } from '../api/client'
import type { ModelTrace, LayerTensor } from '../types'

export function TracePage() {
  const [models, setModels] = useState<ModelTrace[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [layers, setLayers] = useState<Array<{ name: string; type: string; input_shape: number[]; output_shape: number[] }>>([])
  const [selectedLayer, setSelectedLayer] = useState<string>('')
  const [tensorData, setTensorData] = useState<LayerTensor | null>(null)
  const [runId, setRunId] = useState<string>('')
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchModels = async () => {
    try {
      const data = await api.trace.listModels()
      setModels(data)
    } catch {
      // Ignore
    }
  }

  const fetchLayers = async (modelId: string) => {
    try {
      const data = await api.trace.getLayers(modelId)
      setLayers(data.layers)
    } catch {
      // Ignore
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadName) return

    try {
      setUploading(true)
      const model = await api.trace.uploadModel(uploadFile, uploadName)
      setModels([...models, model])
      setShowUpload(false)
      setUploadName('')
      setUploadFile(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModel || !inputText) return

    try {
      setLoading(true)
      setError(null)
      const input = inputText.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      if (input.length === 0) {
        setError('Invalid input format')
        return
      }
      const data = await api.trace.runTrace(selectedModel, input)
      setRunId(data.run_id)
      await fetchLayers(selectedModel)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Trace failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLayerSelect = async (layerName: string) => {
    if (!runId) return
    setSelectedLayer(layerName)
    try {
      const data = await api.trace.getTensor(runId, layerName)
      setTensorData(data)
    } catch {
      setTensorData(null)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  useEffect(() => {
    if (selectedModel) {
      fetchLayers(selectedModel)
    }
  }, [selectedModel])

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Model Trace Debugger</h1>
        <button onClick={() => setShowUpload(true)} className="btn btn-primary">Upload Model</button>
      </div>

      {error && (
        <div className="card badge-danger p-md" role="alert">
          {error}
        </div>
      )}

      {showUpload && (
        <div className="card">
          <h3 className="font-semibold mb-md">Upload Model (ONNX / TorchScript)</h3>
          <form onSubmit={handleUpload} className="space-y-md">
            <div>
              <label className="label">Model Name</label>
              <input
                type="text"
                className="input"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="my-model"
                required
              />
            </div>
            <div>
              <label className="label">Model File (.onnx, .pt, .pth)</label>
              <input
                type="file"
                className="input"
                accept=".onnx,.pt,.pth"
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
        <div className="lg:col-span-1 card space-y-lg">
          <section>
            <h2 className="font-semibold mb-md">Models</h2>
            {models.length === 0 ? (
              <div className="text-[var(--color-text-muted)] text-center py-lg">No models uploaded</div>
            ) : (
              <ul className="space-y-sm max-h-[300px] overflow-y-auto">
                {models.map((model) => (
                  <li
                    key={model.id}
                    onClick={() => { setSelectedModel(model.id); setRunId(''); setTensorData(null); }}
                    className={`p-sm rounded-sm cursor-pointer transition-colors ${
                      selectedModel === model.id
                        ? 'bg-[var(--color-primary)] text-[var(--color-bg)]'
                        : 'hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    <div className="font-medium truncate">{model.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] truncate">{model.model_path}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Input: [{model.input_shape.join(', ')}]</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selectedModel && (
            <section className="border-t border-[var(--color-border)] pt-lg">
              <h2 className="font-semibold mb-md">Run Trace</h2>
              <form onSubmit={handleRun} className="space-y-md">
                <div>
                  <label className="label">Input Vector (comma-separated)</label>
                  <textarea
                    className="input font-mono text-xs"
                    rows={3}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="0.1, -0.2, 0.5, ..."
                    required
                  />
                </div>
                <button type="submit" disabled={loading || !inputText} className="btn btn-primary w-full">
                  {loading ? 'Running...' : 'Run Forward Pass'}
                </button>
              </form>

              {runId && (
                <div className="mt-md p-sm bg-[var(--color-bg)] rounded-sm">
                  <div className="text-xs text-[var(--color-text-muted)]">Run ID: <span className="font-mono">{runId}</span></div>
                </div>
              )}
            </section>
          )}

          {runId && layers.length > 0 && (
            <section className="border-t border-[var(--color-border)] pt-lg">
              <h2 className="font-semibold mb-md">Layers</h2>
              <ul className="space-y-sm max-h-[400px] overflow-y-auto">
                {layers.map((layer) => (
                  <li
                    key={layer.name}
                    onClick={() => handleLayerSelect(layer.name)}
                    className={`p-sm rounded-sm cursor-pointer transition-colors font-mono text-xs ${
                      selectedLayer === layer.name
                        ? 'bg-[var(--color-primary)] text-[var(--color-bg)]'
                        : 'hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    <div>{layer.name}</div>
                    <div className="text-[var(--color-text-muted)]">{layer.type}</div>
                    <div className="text-[var(--color-text-muted)]">in: [{layer.input_shape.join(', ')}] out: [{layer.output_shape.join(', ')}]</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="lg:col-span-2 card">
          {selectedLayer && tensorData ? (
            <>
              <div className="flex items-center justify-between mb-md">
                <h2 className="font-semibold">Layer: {selectedLayer}</h2>
                <span className="badge badge-primary">{tensorData.layer_type}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
                <div className="p-sm bg-[var(--color-bg)] rounded-sm">
                  <h4 className="font-medium mb-sm text-[var(--color-text-muted)]">Input Tensor</h4>
                  <div className="font-mono text-sm">Shape: [{tensorData.input_shape.join(', ')}]</div>
                  <div className="grid grid-cols-4 gap-sm text-xs mt-sm">
                    <div>Mean: {tensorData.input_stats.mean.toFixed(6)}</div>
                    <div>Std: {tensorData.input_stats.std.toFixed(6)}</div>
                    <div>Min: {tensorData.input_stats.min.toFixed(6)}</div>
                    <div>Max: {tensorData.input_stats.max.toFixed(6)}</div>
                  </div>
                </div>
                <div className="p-sm bg-[var(--color-bg)] rounded-sm">
                  <h4 className="font-medium mb-sm text-[var(--color-text-muted)]">Output Tensor</h4>
                  <div className="font-mono text-sm">Shape: [{tensorData.output_shape.join(', ')}]</div>
                  <div className="grid grid-cols-4 gap-sm text-xs mt-sm">
                    <div>Mean: {tensorData.output_stats.mean.toFixed(6)}</div>
                    <div>Std: {tensorData.output_stats.std.toFixed(6)}</div>
                    <div>Min: {tensorData.output_stats.min.toFixed(6)}</div>
                    <div>Max: {tensorData.output_stats.max.toFixed(6)}</div>
                  </div>
                </div>
              </div>

              <div className="p-sm bg-[var(--color-bg)] rounded-sm">
                <h4 className="font-medium mb-sm text-[var(--color-text-muted)]">Details</h4>
                <pre className="font-mono text-xs overflow-x-auto">{JSON.stringify(tensorData, null, 2)}</pre>
              </div>
            </>
          ) : runId ? (
            <div className="text-center py-xl text-[var(--color-text-muted)]">
              Select a layer from the left to inspect tensors
            </div>
          ) : (
            <div className="text-center py-xl text-[var(--color-text-muted)]">
              Select a model and run a forward pass to begin tracing
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
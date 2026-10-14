import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, ApiError } from './client'

describe('API Client', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
  })

  it('health check returns typed response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy', service: 'vector-lens-ryan-vo', version: '1.0.0' }),
    } as Response)

    const result = await api.health.check()
    expect(result.status).toBe('healthy')
    expect(result.service).toBe('vector-lens-ryan-vo')
    expect(result.version).toBe('1.0.0')
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/health', expect.any(Object))
  })

  it('ready check returns typed response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ready: true, checks: { database: 'ok', keycloak: 'ok' } }),
    } as Response)

    const result = await api.health.ready()
    expect(result.ready).toBe(true)
    expect(result.checks.database).toBe('ok')
  })

  it('throws ApiError on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Unauthorized' }),
    } as Response)

    await expect(api.auth.me()).rejects.toThrow(ApiError)
    await expect(api.auth.me()).rejects.toThrow('Unauthorized')
  })

  it('includes credentials in requests', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    } as Response)

    await api.health.check()
    const callOptions = vi.mocked(fetch).mock.calls[0][1]
    expect(callOptions).toBeDefined()
    expect(callOptions?.credentials).toBe('include')
  })

  it('sets Content-Type header for JSON requests', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ logout_url: 'http://keycloak/logout' }),
    } as Response)

    await api.auth.logout()
    const callOptions = vi.mocked(fetch).mock.calls[0][1]
    expect(callOptions).toBeDefined()
    expect(callOptions?.headers).toEqual(expect.objectContaining({
      'Content-Type': 'application/json',
    }))
  })
})
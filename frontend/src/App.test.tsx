import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { App } from './App'
import '@testing-library/jest-dom'

const renderApp = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders dashboard when not authenticated', () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy', service: 'vector-lens-ryan-vo', version: '1.0.0' }),
    } as Response)

    renderApp()

    expect(screen.getByText('vector-lens')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('vector-lens-ryan-vo — AI/ML Embedding Debugger')).toBeInTheDocument()
  })

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy', service: 'vector-lens-ryan-vo', version: '1.0.0' }),
    } as Response)

    renderApp()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { EmbeddingsPage } from './pages/EmbeddingsPage'
import { SearchPage } from './pages/SearchPage'
import { TracePage } from './pages/TracePage'
import { LoginCallback } from './pages/LoginCallback'
import { useAuth } from './context/AuthContext'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/embeddings" replace /> : <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/callback" element={<LoginCallback />} />
        <Route index element={<PublicRoute><Dashboard /></PublicRoute>} />
        <Route path="embeddings" element={<PrivateRoute><EmbeddingsPage /></PrivateRoute>} />
        <Route path="search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
        <Route path="trace" element={<PrivateRoute><TracePage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
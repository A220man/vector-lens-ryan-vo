import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      console.error('OAuth error:', error, errorDescription)
      navigate('/?error=' + encodeURIComponent(errorDescription || error))
      return
    }

    if (code && state) {
      // The callback is handled by the backend at /auth/callback
      // This page just waits for the redirect from Keycloak
      // The backend will set cookies and redirect back to the frontend
      refreshUser().then(() => {
        navigate('/embeddings')
      })
    } else {
      navigate('/')
    }
  }, [searchParams, navigate, refreshUser])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="card text-center p-xl">
        <div className="text-4xl mb-md">⏳</div>
        <h2 className="text-xl font-semibold mb-sm">Completing Sign In</h2>
        <p className="text-[var(--color-text-muted)]">Please wait while we redirect you...</p>
      </div>
    </div>
  )
}
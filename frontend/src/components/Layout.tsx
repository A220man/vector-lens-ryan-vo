import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/embeddings', label: 'Embeddings' },
    { path: '/search', label: 'Search' },
    { path: '/trace', label: 'Model Trace' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="font-semibold text-lg" style={{ fontFamily: 'var(--font-sans)' }}>
            vector-lens
          </Link>

          <nav className="flex items-center gap-md">
            {isAuthenticated && (
              <>
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-sm text-sm transition-colors ${
                      location.pathname === item.path
                        ? 'bg-[var(--color-primary)] text-[var(--color-bg)] font-medium'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="flex items-center gap-md ml-4 pl-4 border-l border-[var(--color-border)]">
                  <span className="text-sm text-[var(--color-text-muted)]">{user?.username}</span>
                  <span className="badge badge-primary">{user?.roles?.split(',')[0] || 'viewer'}</span>
                  <button onClick={logout} className="btn btn-secondary text-sm">Logout</button>
                </div>
              </>
            )}

            {!isAuthenticated && (
              <button onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/auth/login`} className="btn btn-primary">
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-lg">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-md">
        <div className="container flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>vector-lens-ryan-vo — AI/ML Embedding Debugger</span>
          <span>Ryan Vo | AI & Machine Learning</span>
        </div>
      </footer>
    </div>
  )
}
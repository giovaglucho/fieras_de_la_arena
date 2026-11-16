import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchActiveFighter, fetchOwnedFighters } from '../api/fighters.js'
import { useSession } from '../context/SessionContext.jsx'
import Brand from '../components/Brand.jsx'

export function GuestRoute() {
  const location = useLocation()
  const { status, error, refreshSession, justRegistered } = useSession()

  if (status === 'loading') {
    return <main className="session-layout" role="status">Comprobando tu sesión…</main>
  }

  if (status === 'error') {
    return (
      <main className="session-layout">
        <Brand />
        <section className="session-card" aria-labelledby="guest-route-error-title">
          <h1 id="guest-route-error-title">No se pudo comprobar tu sesión</h1>
          <p className="request-error" role="alert">{error}</p>
          <button className="button button--primary" type="button" onClick={refreshSession}>
            Intentar de nuevo
          </button>
        </section>
      </main>
    )
  }

  if (status === 'authenticated') {
    // Tras registrarse se continúa con la creación del luchador; tras iniciar sesión, con la
    // página protegida que se intentó abrir (si la hay) o con el panel.
    const destination = justRegistered ? '/create-fighter' : location.state?.from || '/dashboard'
    return <Navigate to={destination} replace />
  }

  return <Outlet />
}

export function ProtectedRoute() {
  const location = useLocation()
  const { status, error, refreshSession } = useSession()

  if (status === 'loading') {
    return <main className="session-layout" role="status">Comprobando tu sesión…</main>
  }

  if (status === 'error') {
    return (
      <main className="session-layout">
        <Brand />
        <section className="session-card" aria-labelledby="session-error-title">
          <h1 id="session-error-title">No se pudo comprobar tu sesión</h1>
          <p className="request-error" role="alert">{error}</p>
          <button className="button button--primary" type="button" onClick={refreshSession}>
            Intentar de nuevo
          </button>
          <Link className="button button--secondary" to="/leaderboards">Ver clasificación</Link>
        </section>
      </main>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function FighterStatusRoute({ needsCreation = false }) {
  const location = useLocation()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [hasFighters, setHasFighters] = useState(false)
  const [hasActiveFighter, setHasActiveFighter] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true
    setStatus('loading')
    setError('')

    Promise.all([fetchOwnedFighters(1, 1), fetchActiveFighter()])
      .then(([collection, activeFighter]) => {
        if (isCurrent) {
          setHasFighters(collection.pagination.totalItems > 0)
          setHasActiveFighter(Boolean(activeFighter))
          setStatus('ready')
          setError('')
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message)
          setStatus('error')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [location.pathname, reloadVersion])

  if (status === 'loading') {
    return <main className="session-layout" role="status">Comprobando tu luchador…</main>
  }

  if (status === 'error') {
    return (
      <main className="session-layout">
        <Brand />
        <section className="session-card" aria-labelledby="fighter-check-error-title">
          <h1 id="fighter-check-error-title">No se pudo comprobar tu luchador</h1>
          <p className="request-error" role="alert">{error}</p>
          <button
            className="button button--primary"
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
          >
            Intentar de nuevo
          </button>
          <Link className="button button--secondary" to="/leaderboards">Ver clasificación</Link>
        </section>
      </main>
    )
  }

  if (
    !needsCreation &&
    location.pathname !== '/dashboard' &&
    !hasFighters
  ) {
    return <Navigate to="/create-fighter" replace />
  }

  if (
    !needsCreation &&
    location.pathname !== '/dashboard' &&
    hasFighters &&
    !hasActiveFighter
  ) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

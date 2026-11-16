import { Link, useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchPublicProfile } from '../api/fighters.js'
import Brand from '../components/Brand.jsx'
import FighterSummary from '../components/FighterSummary.jsx'

function PublicProfilePage() {
  const { username } = useParams()
  const location = useLocation()
  const returnTo = location.state?.returnTo
  const returnDestination = returnTo === '/dashboard' || returnTo === '/students'
    ? returnTo
    : '/leaderboards'
  const returnLabel = returnDestination === '/dashboard'
    ? 'Volver al panel'
    : returnDestination === '/students'
      ? 'Volver a tus alumnos'
      : 'Volver a la clasificación'
  const [fighter, setFighter] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true

    fetchPublicProfile(username)
      .then((result) => {
        if (isCurrent) {
          setFighter(result)
          setError('')
          setStatus('ready')
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
  }, [username, reloadVersion])

  return (
    <main className="session-layout">
      <Brand />
      {status === 'loading' ? (
        <section className="session-card" role="status">
          <Link className="back-link" to={returnDestination}>← {returnLabel}</Link>
          Cargando perfil público…
        </section>
      ) : status === 'error' ? (
        <section className="session-card" aria-labelledby="public-profile-error-title">
          <Link className="back-link" to={returnDestination}>← {returnLabel}</Link>
          <h1 id="public-profile-error-title">No se pudo cargar el perfil</h1>
          <p className="request-error" role="alert">{error}</p>
          <button
            className="button button--primary"
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
          >
            Intentar de nuevo
          </button>
        </section>
      ) : (
        <>
          <Link className="back-link" to={returnDestination}>← {returnLabel}</Link>
          <FighterSummary fighter={fighter} eyebrow="Perfil público" />
        </>
      )}
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

export default PublicProfilePage

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchReferralOverview } from '../api/referrals.js'
import Brand from '../components/Brand.jsx'

function StudentsPage() {
  const [overview, setOverview] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true
    setStatus('loading')
    setError('')

    fetchReferralOverview()
      .then((result) => {
        if (isCurrent) {
          setOverview(result)
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
  }, [reloadVersion])

  async function copyReferralLink() {
    const referralLink = `${window.location.origin}/register?referralCode=${encodeURIComponent(overview.referralCode)}`
    setCopyStatus('')

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopyStatus('Enlace copiado.')
    } catch {
      setCopyStatus('No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.')
    }
  }

  return (
    <main className="session-layout">
      <Brand />
      {status === 'loading' ? (
        <section className="session-card students-card" role="status">
          Cargando tus alumnos…
        </section>
      ) : status === 'error' ? (
        <section className="session-card students-card" aria-labelledby="students-error-title">
          <h1 id="students-error-title">No se pudieron cargar tus alumnos</h1>
          <p className="request-error" role="alert">{error}</p>
          <button
            className="button button--primary"
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
          >
            Intentar de nuevo
          </button>
          <Link className="button button--secondary" to="/dashboard">Volver al panel</Link>
        </section>
      ) : (
        <section className="session-card students-card" aria-labelledby="students-title">
          <Link className="back-link" to="/dashboard">← Volver al panel</Link>
          <p className="eyebrow">Comparte tu camino</p>
          <h1 id="students-title">Tus alumnos</h1>
          <p className="auth-intro">
            Comparte este enlace para invitar a otras personas a la arena.
          </p>
          <div className="students-invitation">
            <label htmlFor="student-invitation-link">Enlace de invitación</label>
            <input
              id="student-invitation-link"
              type="url"
              readOnly
              value={`${window.location.origin}/register?referralCode=${encodeURIComponent(overview.referralCode)}`}
              onFocus={(event) => event.target.select()}
            />
            <button className="button button--primary" type="button" onClick={copyReferralLink}>
              Copiar enlace
            </button>
            {copyStatus && (
              <p className="students-copy-status" role="status" aria-live="polite">
                {copyStatus}
              </p>
            )}
          </div>
          <div className="students-list-section">
            <div className="dashboard-panel__heading">
              <h2>Alumnos asociados</h2>
              <span>{overview.students.length}</span>
            </div>
            {overview.students.length === 0 ? (
              <p className="dashboard-panel__muted">Todavía no hay cuentas asociadas a tu enlace.</p>
            ) : (
              <ul className="students-list">
                {overview.students.map((student) => (
                  <li key={student.username}>
                    <div>
                      {student.fighter ? (
                        <Link
                          className="leaderboard__profile-link"
                          to={`/profile/${encodeURIComponent(student.username)}`}
                          state={{ returnTo: '/students' }}
                        >
                          <strong>{student.fighter.name}</strong>
                          <span>@{student.username}</span>
                        </Link>
                      ) : (
                        <strong>@{student.username}</strong>
                      )}
                    </div>
                    <span className="dashboard-panel__muted">
                      {student.fighter
                        ? `Nivel ${student.fighter.level}`
                        : 'Aún no creó un luchador'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

export default StudentsPage

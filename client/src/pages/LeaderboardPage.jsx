import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../api/leaderboards.js'
import Brand from '../components/Brand.jsx'

function LeaderboardPage() {
  const [category, setCategory] = useState('elo')
  const [page, setPage] = useState(1)
  const [leaderboard, setLeaderboard] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const categoryLabel = category === 'students'
    ? 'alumnos'
    : category === 'elo'
      ? 'ELO'
      : 'nivel'

  useEffect(() => {
    let isCurrent = true

    setStatus('loading')
    setError('')
    setLeaderboard(null)

    fetchLeaderboard(category, page)
      .then((result) => {
        if (isCurrent) {
          setLeaderboard(result)
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
  }, [category, page, reloadVersion])

  return (
    <main className="session-layout leaderboard-layout">
      <Brand />

      <section className="session-card leaderboard-card" aria-labelledby="leaderboard-title">
        <Link className="back-link" to="/">← Volver al inicio</Link>
        <p className="eyebrow">Los nombres que hacen historia</p>
        <h1 id="leaderboard-title">Clasificación</h1>
        <p className="auth-intro">
          Consulta las posiciones por ELO, nivel o cantidad de alumnos confirmados.
        </p>

        <div className="leaderboard__controls">
          <label htmlFor="leaderboard-category">Clasificar por</label>
          <select
            id="leaderboard-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setPage(1)
            }}
          >
            <option value="elo">ELO</option>
            <option value="level">Nivel</option>
            <option value="students">Alumnos</option>
          </select>
        </div>

        {status === 'loading' ? (
          <p className="leaderboard__message" role="status">Cargando clasificación…</p>
        ) : status === 'error' ? (
          <div className="leaderboard__message">
            <p className="request-error" role="alert">{error}</p>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setReloadVersion((version) => version + 1)}
            >
              Intentar de nuevo
            </button>
          </div>
        ) : leaderboard.pagination.totalItems === 0 ? (
          <p className="leaderboard__message">
            {category === 'students'
              ? 'Aún no hay luchadores en la clasificación de alumnos.'
              : 'Aún no hay luchadores en la clasificación.'}
          </p>
        ) : (
          <>
            <div className="leaderboard__table-scroll">
              <table className="leaderboard__table" aria-label={`Clasificación por ${categoryLabel}`}>
                <thead>
                  <tr>
                    <th scope="col">Puesto</th>
                    <th scope="col">Luchador</th>
                    {category === 'students' ? (
                      <th scope="col">Alumnos confirmados</th>
                    ) : (
                      <>
                        <th scope="col">Nivel</th>
                        <th scope="col">ELO</th>
                        <th scope="col">Récord</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.fighters.map((fighter, index) => (
                    <tr key={fighter.id}>
                      <td>{(leaderboard.pagination.page - 1) * leaderboard.pagination.limit + index + 1}</td>
                      <td>
                        <Link
                          className="leaderboard__profile-link"
                          to={`/profile/${encodeURIComponent(fighter.username)}`}
                          state={{ returnTo: '/leaderboards' }}
                        >
                          <strong>{fighter.name}</strong>
                          <span>@{fighter.username}</span>
                        </Link>
                      </td>
                      {category === 'students' ? (
                        <td>{fighter.studentsCount}</td>
                      ) : (
                        <>
                          <td>{fighter.level}</td>
                          <td>{fighter.elo}</td>
                          <td>{fighter.wins} V · {fighter.losses} D · {fighter.draws} E</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav className="leaderboard__pagination" aria-label="Páginas de la clasificación">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setPage((currentPage) => currentPage - 1)}
                disabled={leaderboard.pagination.page <= 1}
              >
                Anterior
              </button>
              <span>
                Página {leaderboard.pagination.page} de {leaderboard.pagination.totalPages}
                {' · '}{leaderboard.pagination.totalItems} luchadores
              </span>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={leaderboard.pagination.page >= leaderboard.pagination.totalPages}
              >
                Siguiente
              </button>
            </nav>
          </>
        )}
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

export default LeaderboardPage

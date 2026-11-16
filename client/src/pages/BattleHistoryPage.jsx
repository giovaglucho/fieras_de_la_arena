import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchOwnedBattleHistory } from '../api/arena.js'
import { getBattleEquipmentSummary } from '../equipment.js'
import Brand from '../components/Brand.jsx'

function BattleHistoryPage() {
  const [history, setHistory] = useState(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true

    setStatus('loading')
    setError('')
    setHistory(null)

    fetchOwnedBattleHistory(page)
      .then((loadedHistory) => {
        if (!isCurrent) {
          return
        }

        setHistory(loadedHistory)
        setStatus('ready')
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
  }, [page, reloadVersion])

  return (
    <main className="session-layout">
      <Brand />

      <section className="session-card battle-history-card" aria-labelledby="battle-history-title">
        <div className="battle-history__navigation">
          <Link className="button button--secondary" to="/dashboard">Volver al panel</Link>
          <Link className="button button--secondary" to="/arena">Ir a la Arena</Link>
          <Link className="button button--secondary" to="/collection">Ver colecciones del luchador</Link>
        </div>
        <p className="eyebrow">Tus combates guardados</p>
        <h1 id="battle-history-title">Historial de combates</h1>

        {status === 'loading' ? (
          <p className="battle-history__message" role="status">Cargando tu historial…</p>
        ) : status === 'error' ? (
          <div className="battle-history__message">
            <p className="request-error" role="alert">{error}</p>
            <button
              className="button button--primary"
              type="button"
              onClick={() => setReloadVersion((version) => version + 1)}
            >
              Intentar de nuevo
            </button>
          </div>
        ) : history.pagination.totalItems === 0 ? (
          <div className="battle-history__message">
            <p>Aún no tienes combates registrados.</p>
            <Link className="button button--primary" to="/arena">Iniciar un combate</Link>
          </div>
        ) : history.battles.length === 0 ? (
          <div className="battle-history__message">
            <p>No hay combates en esta página.</p>
          </div>
        ) : (
          <>
            <ol className="battle-history__list">
              {history.battles.map((battle) => {
                const ownParticipant = battle.participants.find(
                  ({ fighter: participant }) => participant.id === battle.ownFighterId,
                )
                const opponentParticipant = battle.participants.find(
                  ({ fighter: participant }) => participant.id !== battle.ownFighterId,
                )
                const isDraw = battle.winnerFighterId === null
                const isVictory = battle.winnerFighterId === battle.ownFighterId
                const outcome = isDraw ? 'Empate' : isVictory ? 'Victoria' : 'Derrota'
                const outcomeStyle = isDraw ? 'draw' : isVictory ? 'win' : 'loss'

                return (
                  <li className="battle-history__item" key={battle.id}>
                    <Link className="battle-history__entry" to={`/battles/${battle.id}`}>
                      <div className="battle-history__entry-heading">
                        <span className={`battle-result__outcome battle-result__outcome--${outcomeStyle}`}>
                          {outcome}
                        </span>
                        <span className="battle-history__type">
                          {battle.battleType === 'training' ? 'Entrenamiento' : 'PvP'}
                        </span>
                      </div>
                      <strong className="battle-history__opponent">
                        Rival: {opponentParticipant.fighter.name}
                      </strong>
                      <span className="battle-history__details">
                        Nivel {opponentParticipant.fighter.level} · ELO {opponentParticipant.fighter.elo}
                      </span>
                      <span className="battle-history__details">
                        +{ownParticipant.result.xpGained} XP · ELO {ownParticipant.result.eloChange > 0 ? '+' : ''}
                        {ownParticipant.result.eloChange}
                      </span>
                      <span className="battle-history__equipment">
                        {getBattleEquipmentSummary(ownParticipant.fighter)}
                      </span>
                      <span className="battle-history__pets">
                        {ownParticipant.fighter.pets === undefined
                          ? 'Mascotas no registradas en este combate'
                          : ownParticipant.fighter.pets.length === 0
                            ? 'Sin mascotas en este combate'
                            : `Acompañantes: ${ownParticipant.fighter.pets.map(({ name }) => name).join(', ')}`}
                      </span>
                      <time className="battle-history__date" dateTime={battle.createdAt}>
                        {new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })
                          .format(new Date(battle.createdAt))}
                      </time>
                    </Link>
                  </li>
                )
              })}
            </ol>

            <nav className="battle-history__pagination" aria-label="Páginas del historial">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setPage((currentPage) => currentPage - 1)}
                disabled={history.pagination.page <= 1}
              >
                Anterior
              </button>
              <span aria-live="polite">
                Página {history.pagination.page} de {history.pagination.totalPages}
              </span>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={history.pagination.page >= history.pagination.totalPages}
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

export default BattleHistoryPage

import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchActiveFighter, fetchOwnedFighters, selectActiveFighter } from '../api/fighters.js'
import { fetchArenaChallengeAttempts, fetchOwnedBattleHistory } from '../api/arena.js'
import { useSession } from '../context/SessionContext.jsx'
import Brand from '../components/Brand.jsx'
import FighterSummary from '../components/FighterSummary.jsx'

function DashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useSession()
  const [dashboard, setDashboard] = useState(null)
  const [status, setStatus] = useState('loading')
  const [dashboardError, setDashboardError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [fightersPage, setFightersPage] = useState(1)
  const [selectingFighterId, setSelectingFighterId] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const [selectionMessage, setSelectionMessage] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let isCurrent = true
    setStatus('loading')

    Promise.all([fetchOwnedFighters(fightersPage), fetchActiveFighter()])
      .then(async ([collection, selectedFighter]) => {
        if (isCurrent) {
          if (!selectedFighter) {
            setDashboard({
              fighters: collection.fighters,
              pagination: collection.pagination,
              fighter: null,
              attempts: null,
              recentBattles: [],
            })
            setDashboardError('')
            setStatus('ready')
            return
          }

          const [attemptsResult, historyResult] = await Promise.allSettled([
            fetchArenaChallengeAttempts(),
            fetchOwnedBattleHistory(1, 5, selectedFighter.id),
          ])

          if (!isCurrent) {
            return
          }

          const fighter = { ...selectedFighter, username: user.username }

          const history = historyResult.status === 'fulfilled'
            ? historyResult.value
            : null
          const recentBattles = (history?.battles ?? []).map((battle) => {
            const ownParticipant = battle.participants.find(
              ({ fighter: participant }) => participant.id === fighter.id
            )
            const opponent = battle.participants.find(
              ({ fighter: participant }) => participant.id !== fighter.id
            )

            if (!ownParticipant || !opponent) {
              throw new Error('El servidor devolvió un historial inesperado. Inténtalo de nuevo.')
            }

            return { battle, ownResult: ownParticipant.result, opponent: opponent.fighter }
          })

          setDashboard({
            fighters: collection.fighters,
            pagination: collection.pagination,
            fighter,
            attempts:
              attemptsResult.status === 'fulfilled' &&
              attemptsResult.value.fighterId === fighter.id
              ? attemptsResult.value
              : null,
            attemptsError: attemptsResult.status === 'rejected'
              ? attemptsResult.reason.message
              : attemptsResult.value.fighterId !== fighter.id
                ? 'La selección activa cambió. Actualiza el panel e inténtalo de nuevo.'
                : '',
            historyError: historyResult.status === 'rejected'
              ? historyResult.reason.message
              : '',
            recentBattles,
          })
          setDashboardError('')
          setStatus('ready')
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setDashboardError(error.message)
          setStatus('error')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [fightersPage, reloadVersion])

  async function handleSelectFighter(fighter) {
    if (fighter.isActive || fighter.status !== 'active' || selectingFighterId) {
      return
    }

    setSelectingFighterId(fighter.id)
    setSelectionError('')
    setSelectionMessage('')

    try {
      await selectActiveFighter(fighter.id)
      setSelectionMessage(`${fighter.name} es ahora tu luchador activo.`)
      setReloadVersion((version) => version + 1)
    } catch (error) {
      setSelectionError(error.message)
    } finally {
      setSelectingFighterId('')
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    setLogoutError('')

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const fighter = dashboard?.fighter
  const CollectionHeading = fighter ? 'h2' : 'h1'

  if (status === 'loading') {
    return <main className="session-layout" role="status">Cargando el panel de tus luchadores…</main>
  }

  if (status === 'error') {
    return (
      <main className="session-layout">
        <Brand />
        <section className="session-card" aria-labelledby="dashboard-error-title">
          <h1 id="dashboard-error-title">No se pudo cargar el panel</h1>
          <p className="request-error" role="alert">{dashboardError}</p>
          <button
            className="button button--primary"
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
          >
            Intentar de nuevo
          </button>
          <Link className="button button--secondary" to="/leaderboards">Ver clasificación</Link>
        </section>
        <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
      </main>
    )
  }

  return (
    <main className="session-layout">
      <Brand />
      <div className="fighter-dashboard">
        <section className="session-card fighter-collection" aria-labelledby="fighter-collection-title">
          <div className="fighter-collection__heading">
            <p className="eyebrow">Gestión de luchadores</p>
            <CollectionHeading className="fighter-collection__title" id="fighter-collection-title">
              Tus luchadores
            </CollectionHeading>
            <p className="auth-intro">
              Selecciona cuál estará activo en el panel y en tus acciones de la arena.
            </p>
            {dashboard.fighters.length > 0 && (
              <Link className="button button--secondary fighter-collection__create" to="/create-fighter">
                Crear otro luchador
              </Link>
            )}
          </div>

          {selectionError && <p className="request-error" role="alert">{selectionError}</p>}
          {selectionMessage && (
            <p className="arena-message" role="status" aria-live="polite">{selectionMessage}</p>
          )}

          {dashboard.fighters.length === 0 ? (
            <div className="fighter-collection__empty">
              <p>Aún no tienes luchadores.</p>
              <Link className="button button--primary" to="/create-fighter">
                Crear tu primer luchador
              </Link>
            </div>
          ) : (
            <>
              <ul className="fighter-collection__list" aria-label="Luchadores de tu cuenta">
                {dashboard.fighters.map((ownedFighter) => (
                  <li className="fighter-collection__item" key={ownedFighter.id}>
                    <div className="fighter-collection__item-heading">
                      <h3>{ownedFighter.name}</h3>
                      {ownedFighter.isActive && (
                        <span className="fighter-collection__active">Activo</span>
                      )}
                    </div>
                    <dl className="fighter-collection__summary">
                      <div><dt>Nivel</dt><dd>{ownedFighter.level}</dd></div>
                      <div><dt>XP</dt><dd>{ownedFighter.xp}</dd></div>
                      <div><dt>ELO</dt><dd>{ownedFighter.elo}</dd></div>
                      <div>
                        <dt>Récord</dt>
                        <dd>{ownedFighter.wins} V · {ownedFighter.losses} D · {ownedFighter.draws} E</dd>
                      </div>
                    </dl>
                    <p className="fighter-collection__status">
                      {ownedFighter.status === 'active' ? 'Disponible' : 'Suspendido'}
                      {' · '}
                      {ownedFighter.visibility === 'public' ? 'Público' : 'Privado'}
                    </p>
                    <button
                      className="button button--secondary"
                      type="button"
                      aria-pressed={ownedFighter.isActive}
                      disabled={
                        ownedFighter.isActive ||
                        ownedFighter.status !== 'active' ||
                        Boolean(selectingFighterId)
                      }
                      onClick={() => handleSelectFighter(ownedFighter)}
                    >
                      {selectingFighterId === ownedFighter.id
                        ? 'Seleccionando…'
                        : ownedFighter.isActive
                          ? 'Luchador activo'
                          : ownedFighter.status !== 'active'
                            ? 'No disponible'
                            : 'Seleccionar luchador'}
                    </button>
                  </li>
                ))}
              </ul>

              {dashboard.pagination.totalPages > 1 && (
                <nav className="fighter-collection__pagination" aria-label="Páginas de tus luchadores">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => setFightersPage((page) => page - 1)}
                    disabled={dashboard.pagination.page <= 1}
                  >
                    Anterior
                  </button>
                  <span aria-live="polite">
                    Página {dashboard.pagination.page} de {dashboard.pagination.totalPages}
                  </span>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => setFightersPage((page) => page + 1)}
                    disabled={dashboard.pagination.page >= dashboard.pagination.totalPages}
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </section>

        {fighter && (
          <>
            <FighterSummary
              fighter={fighter}
              eyebrow="Luchador activo · Tu perfil"
              showPublicLink
              returnTo="/dashboard"
              stats={fighter.stats}
              statsTitle="Estadísticas"
            />
            <section className="session-card dashboard-panel" aria-labelledby="dashboard-progress-title">
              <h2 id="dashboard-progress-title">Progreso de {fighter.name}</h2>
              <p>Nivel {fighter.level}</p>
              {Number.isSafeInteger(fighter.xpToNextLevel) ? (
                <>
                  <progress
                    className="dashboard-progress__bar"
                    value={fighter.xp}
                    max={fighter.xpToNextLevel}
                    aria-label={`Experiencia de ${fighter.name} para el siguiente nivel`}
                  />
                  <p className="dashboard-progress__label">
                    {fighter.xp} / {fighter.xpToNextLevel} XP para el siguiente nivel
                  </p>
                </>
              ) : (
                <p className="dashboard-progress__label">{fighter.xp} XP acumulados</p>
              )}
            </section>
            <section className="session-card dashboard-panel" aria-labelledby="dashboard-attempts-title">
              <h2 id="dashboard-attempts-title">Intentos diarios de {fighter.name}</h2>
              {dashboard.attemptsError ? (
                <p className="request-error" role="alert">{dashboard.attemptsError}</p>
              ) : (
                <>
                  <p className="dashboard-attempts__count">
                    <strong>{dashboard.attempts.remaining}</strong> de {dashboard.attempts.limit} disponibles
                  </p>
                  <p className="dashboard-panel__muted">
                    {dashboard.attempts.used} {dashboard.attempts.used === 1 ? 'intento utilizado' : 'intentos utilizados'} hoy
                  </p>
                </>
              )}
              <Link className="button button--secondary" to="/arena">Ir a la Arena con {fighter.name}</Link>
            </section>
            <section className="session-card dashboard-panel dashboard-recent" aria-labelledby="dashboard-recent-title">
              <div className="dashboard-panel__heading">
                <h2 id="dashboard-recent-title">Últimos combates de {fighter.name}</h2>
                <Link to="/history">Ver historial</Link>
              </div>
              {dashboard.historyError ? (
                <p className="request-error" role="alert">{dashboard.historyError}</p>
              ) : dashboard.recentBattles.length === 0 ? (
                <p className="dashboard-panel__muted">Todavía no hay combates registrados.</p>
              ) : (
                <ul className="battle-history__list">
                  {dashboard.recentBattles.map(({ battle, ownResult, opponent }) => {
                    const outcome = battle.winnerFighterId === null
                      ? 'Empate'
                      : battle.winnerFighterId === fighter.id
                        ? 'Victoria'
                        : 'Derrota'

                    return (
                      <li key={battle.id}>
                        <Link className="battle-history__entry" to={`/battles/${encodeURIComponent(battle.id)}`}>
                          <span className="battle-history__entry-heading">
                            <span className={`battle-result__outcome battle-result__outcome--${outcome === 'Victoria' ? 'win' : outcome === 'Derrota' ? 'loss' : 'draw'}`}>
                              {outcome}
                            </span>
                            <time className="battle-history__date" dateTime={battle.createdAt}>
                              {new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })
                                .format(new Date(battle.createdAt))}
                            </time>
                          </span>
                          <strong className="battle-history__opponent">vs. {opponent.name}</strong>
                          <span className="battle-history__details">
                            {battle.battleType === 'training' ? 'Entrenamiento' : 'PvP'}
                            {' · '}{ownResult.xpGained} XP
                            {' · ELO '}{ownResult.eloChange > 0 ? '+' : ''}{ownResult.eloChange}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
        <section className="session-card fighter-dashboard__actions" aria-label="Acciones de cuenta">
          {fighter && (
            <p className="fighter-dashboard__active-action" role="status">
              Luchador seleccionado: <strong>{fighter.name}</strong>.
            </p>
          )}
          {logoutError && <p className="request-error" role="alert">{logoutError}</p>}
          {fighter && <Link className="button button--primary" to="/arena">Entrar a la Arena</Link>}
          {fighter && <Link className="button button--secondary" to="/history">Ver historial de combates</Link>}
          {fighter && <Link className="button button--secondary" to="/collection">Ver colecciones del luchador</Link>}
          <Link className="button button--secondary" to="/students">Ver alumnos</Link>
          <button
            className="button button--secondary"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </section>
      </div>
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

export default DashboardPage

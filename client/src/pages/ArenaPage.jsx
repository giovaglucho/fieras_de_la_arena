import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { fetchActiveFighter } from '../api/fighters.js'
import { fetchArenaChallengeAttempts, fetchArenaOpponents, startDirectedChallenge } from '../api/arena.js'
import Brand from '../components/Brand.jsx'
import FighterAppearancePreview from '../components/FighterAppearancePreview.jsx'

function ArenaPage() {
  const navigate = useNavigate()
  const [fighter, setFighter] = useState(null)
  const [attempts, setAttempts] = useState(null)
  const [attemptStatus, setAttemptStatus] = useState('loading')
  const [attemptError, setAttemptError] = useState('')
  const [reloadAttemptsVersion, setReloadAttemptsVersion] = useState(0)
  const [opponents, setOpponents] = useState(null)
  const [opponentsStatus, setOpponentsStatus] = useState('loading')
  const [opponentsError, setOpponentsError] = useState('')
  const [reloadOpponentsVersion, setReloadOpponentsVersion] = useState(0)
  const [filters, setFilters] = useState({ q: '', minLevel: undefined, maxLevel: undefined })
  const [opponentPage, setOpponentPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [minimumLevel, setMinimumLevel] = useState('')
  const [maximumLevel, setMaximumLevel] = useState('')
  const [selectedOpponent, setSelectedOpponent] = useState(null)
  const [challengeStatus, setChallengeStatus] = useState('idle')
  const [challengeError, setChallengeError] = useState('')
  const challengeInProgress = useRef(false)
  const requestId = useRef(null)
  const requestOpponentId = useRef(null)

  useEffect(() => {
    let isCurrent = true

    setAttemptStatus('loading')
    setAttemptError('')
    setAttempts(null)

    Promise.all([fetchArenaChallengeAttempts(), fetchActiveFighter()])
      .then(([loadedAttempts, loadedFighter]) => {
        if (!isCurrent) {
          return
        }

        if (!loadedFighter) {
          throw new Error('Selecciona un luchador activo antes de entrar en la arena.')
        }
        if (loadedAttempts.fighterId !== loadedFighter.id) {
          throw new Error('El luchador activo cambió. Consulta de nuevo la Arena antes de continuar.')
        }

        setFighter(loadedFighter)
        setAttempts(loadedAttempts)
        setAttemptStatus('ready')
      })
      .catch((error) => {
        if (isCurrent) {
          setFighter(null)
          setAttemptError(error.message)
          setAttemptStatus('error')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [reloadAttemptsVersion])

  useEffect(() => {
    if (!fighter || attemptStatus !== 'ready') {
      return undefined
    }

    let isCurrent = true
    setOpponentsStatus('loading')
    setOpponentsError('')

    Promise.all([
      fetchArenaOpponents({ page: opponentPage, ...filters }),
      fetchActiveFighter(),
    ])
      .then(([result, activeFighter]) => {
        if (!isCurrent) {
          return
        }
        if (!activeFighter || activeFighter.id !== fighter.id) {
          throw new Error('El luchador activo cambió. Actualiza los datos de la Arena antes de elegir rival.')
        }

        setOpponents(result)
        setOpponentsStatus('ready')
      })
      .catch((error) => {
        if (isCurrent) {
          setOpponents(null)
          setOpponentsError(error.message)
          setOpponentsStatus('error')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [attemptStatus, filters, fighter, opponentPage, reloadOpponentsVersion])

  function handleOpponentSearch(event) {
    event.preventDefault()
    setSelectedOpponent(null)
    requestId.current = null
    requestOpponentId.current = null
    setOpponentPage(1)
    setFilters({
      q: searchText.trim(),
      minLevel: minimumLevel ? Number(minimumLevel) : undefined,
      maxLevel: maximumLevel ? Number(maximumLevel) : undefined,
    })
  }

  async function handleChallenge() {
    if (
      challengeInProgress.current ||
      attemptStatus !== 'ready' ||
      !attempts ||
      attempts.remaining === 0 ||
      !fighter ||
      !selectedOpponent
    ) {
      return
    }

    challengeInProgress.current = true
    setChallengeStatus('submitting')
    setChallengeError('')

    try {
      if (requestOpponentId.current !== selectedOpponent.id || !requestId.current) {
        requestId.current = crypto.randomUUID()
        requestOpponentId.current = selectedOpponent.id
      }

      const battle = await startDirectedChallenge(
        fighter.id,
        selectedOpponent.id,
        requestId.current,
      )
      requestId.current = null
      requestOpponentId.current = null
      navigate(`/battles/${battle.id}`)
    } catch (error) {
      setChallengeError(error.message)
      setChallengeStatus('error')
      setAttempts(null)
      setAttemptStatus('loading')
      setReloadAttemptsVersion((version) => version + 1)
      setReloadOpponentsVersion((version) => version + 1)
    } finally {
      challengeInProgress.current = false
    }
  }

  function handleRetryAttempts() {
    setAttempts(null)
    setAttemptStatus('loading')
    setReloadAttemptsVersion((version) => version + 1)
  }

  function handleSelectOpponent(opponent) {
    if (selectedOpponent?.id !== opponent.id) {
      requestId.current = null
      requestOpponentId.current = null
    }
    setSelectedOpponent(opponent)
    setChallengeStatus('idle')
    setChallengeError('')
  }

  const isChallengeDisabled =
    challengeStatus === 'submitting' ||
    attemptStatus !== 'ready' ||
    !attempts ||
    attempts.remaining === 0 ||
    !selectedOpponent ||
    opponentsStatus !== 'ready' ||
    !opponents?.fighters.some(({ id }) => id === selectedOpponent.id)

  return (
    <main className="session-layout arena-layout">
      <Brand />

      <section className="session-card arena-card" aria-labelledby="arena-title">
        <Link className="button button--secondary" to="/dashboard">Volver al panel</Link>
        <p className="eyebrow">El siguiente desafío te espera</p>
        <h1 id="arena-title">La Arena</h1>
        <p className="arena-card__fighter" role="status">
          Luchador que inicia el desafío:{' '}
          <strong>
            {fighter
              ? `${fighter.name} · Nivel ${fighter.level} · ELO ${fighter.elo}`
              : 'cargando…'}
          </strong>
        </p>
        <p className="auth-intro">
          Elige un rival público dentro del rango permitido. El servidor valida la selección y resuelve el combate automáticamente.
        </p>

        <div className="arena-attempts" aria-live="polite">
          {attemptStatus === 'loading' ? (
            <p role="status">Consultando los desafíos disponibles…</p>
          ) : attemptStatus === 'error' ? (
            <>
              <p className="request-error" role="alert">{attemptError}</p>
              <button className="button button--secondary" type="button" onClick={handleRetryAttempts}>
                Consultar de nuevo
              </button>
            </>
          ) : (
            <>
              <p className="eyebrow">Desafíos de hoy · UTC</p>
              <p className="arena-attempts__count">
                <strong>{attempts.remaining}</strong> de {attempts.limit} disponibles para {fighter.name}
              </p>
              <p className="arena-attempts__date">Fecha del servidor: {attempts.dateKey}</p>
            </>
          )}
        </div>

        <section className="arena-opponents" aria-labelledby="arena-opponents-title">
          <div>
            <p className="eyebrow">Desafíos dirigidos</p>
            <h2 id="arena-opponents-title">Elige a quién desafiar</h2>
          </div>

          <form className="arena-filters" onSubmit={handleOpponentSearch}>
            <label>
              <span>Nombre del rival</span>
              <input
                type="search"
                value={searchText}
                maxLength={18}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Buscar luchador"
              />
            </label>
            <label>
              <span>Nivel mínimo</span>
              <input
                type="number"
                min="1"
                value={minimumLevel}
                onChange={(event) => setMinimumLevel(event.target.value)}
              />
            </label>
            <label>
              <span>Nivel máximo</span>
              <input
                type="number"
                min="1"
                value={maximumLevel}
                onChange={(event) => setMaximumLevel(event.target.value)}
              />
            </label>
            <button className="button button--secondary" type="submit">
              Buscar rivales
            </button>
          </form>

          {opponentsStatus === 'loading' ? (
            <p role="status">Buscando rivales elegibles…</p>
          ) : opponentsStatus === 'error' ? (
            <div className="arena-message">
              <p className="request-error" role="alert">{opponentsError}</p>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  handleRetryAttempts()
                  setReloadOpponentsVersion((version) => version + 1)
                }}
              >
                Actualizar Arena
              </button>
            </div>
          ) : opponents.fighters.length === 0 ? (
            <p className="arena-message">
              No hay rivales elegibles con esos filtros. Prueba con otros niveles o vuelve a intentarlo más tarde.
            </p>
          ) : (
            <ul className="arena-opponents__list">
              {opponents.fighters.map((opponent) => (
                <li key={opponent.id}>
                  <article className={`arena-opponent${selectedOpponent?.id === opponent.id ? ' arena-opponent--selected' : ''}`}>
                    <FighterAppearancePreview appearance={opponent.appearance} name={opponent.name} />
                    <div className="arena-opponent__details">
                      <h3>{opponent.name}</h3>
                      <p>@{opponent.username}</p>
                      <p>Nivel {opponent.level} · ELO {opponent.elo}</p>
                      <p>{opponent.wins} victorias · {opponent.losses} derrotas · {opponent.draws} empates</p>
                    </div>
                    <button
                      className="button button--secondary"
                      type="button"
                      aria-pressed={selectedOpponent?.id === opponent.id}
                      onClick={() => handleSelectOpponent(opponent)}
                    >
                      {selectedOpponent?.id === opponent.id ? 'Rival elegido' : 'Elegir rival'}
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          )}
          {opponentsStatus === 'ready' && opponents.pagination.totalPages > 1 && (
            <nav className="arena-opponents__pagination" aria-label="Páginas de rivales">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  setSelectedOpponent(null)
                  setOpponentPage((currentPage) => currentPage - 1)
                }}
                disabled={opponentPage <= 1}
              >
                Anterior
              </button>
              <span aria-live="polite">
                Página {opponents.pagination.page} de {opponents.pagination.totalPages}
                {' · '}{opponents.pagination.totalItems} rivales elegibles
              </span>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  setSelectedOpponent(null)
                  setOpponentPage((currentPage) => currentPage + 1)
                }}
                disabled={opponentPage >= opponents.pagination.totalPages}
              >
                Siguiente
              </button>
            </nav>
          )}
        </section>

        {selectedOpponent && (
          <section className="arena-confirmation" aria-labelledby="arena-confirmation-title">
            <p className="eyebrow">Confirma tu desafío</p>
            <h2 id="arena-confirmation-title">{fighter.name} contra {selectedOpponent.name}</h2>
            <p>
              Iniciará el combate {fighter.name} (nivel {fighter.level}, ELO {fighter.elo}); el rival confirmado es
              {' '}{selectedOpponent.name} (@{selectedOpponent.username}), nivel {selectedOpponent.level}, ELO {selectedOpponent.elo}.
              La pelea se resolverá automáticamente y no se cambiará el objetivo.
            </p>
            {challengeError && <p className="request-error" role="alert">{challengeError}</p>}
            <button
              className="button button--primary"
              type="button"
              onClick={handleChallenge}
              disabled={isChallengeDisabled}
            >
              {challengeStatus === 'submitting'
                ? 'Resolviendo combate…'
                : attempts?.remaining === 0
                  ? 'No quedan desafíos hoy'
                  : `Desafiar a ${selectedOpponent.name}`}
            </button>
          </section>
        )}

        <Link className="button button--secondary" to="/history">Consultar historial</Link>
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

export default ArenaPage

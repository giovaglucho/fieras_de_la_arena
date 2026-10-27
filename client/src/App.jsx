import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchArenaAttempts,
  fetchArenaChallengeAttempts,
  fetchArenaOpponents,
  fetchBattle,
  fetchBattleHistory,
  fetchOwnedBattleHistory,
  startDirectedChallenge,
} from './api/arena.js'
import {
  createFighter,
  fetchActiveFighter,
  fetchMyFighter,
  fetchOwnedFighters,
  fetchPublicProfile,
  selectActiveFighter,
} from './api/fighters.js'
import { fetchLeaderboard } from './api/leaderboards.js'
import { fetchReferralOverview } from './api/referrals.js'
import { useSession } from './context/SessionContext.jsx'
import BattleAnimation from './components/BattleAnimation.jsx'
import BattleProgression, { BattleResultError } from './components/BattleProgression.jsx'
import FighterAppearancePreview from './components/FighterAppearancePreview.jsx'
import {
  FIGHTER_APPEARANCE_FIELD_LABELS,
  FIGHTER_APPEARANCE_OPTIONS,
  NEUTRAL_FIGHTER_APPEARANCE,
} from './fighterAppearance.js'
import './App.css'

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/

function validateRegistration(formData) {
  const errors = {}
  const username = formData.get('username').trim().toLowerCase()
  const email = formData.get('email').trim()
  const password = formData.get('password')
  const referralCode = formData.get('referralCode').trim()
  const passwordBytes = new TextEncoder().encode(password).length

  if (!USERNAME_PATTERN.test(username)) {
    errors.username = 'Usa entre 3 y 24 letras, números o guiones bajos.'
  }

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Escribe un correo electrónico válido.'
  }

  if (passwordBytes < 8 || passwordBytes > 72) {
    errors.password = 'La contraseña debe tener entre 8 y 72 bytes.'
  }

  if (referralCode && !/^[a-f0-9]{32}$/i.test(referralCode)) {
    errors.referralCode = 'El código debe tener 32 caracteres hexadecimales.'
  }

  return errors
}

function validateLogin(formData) {
  const errors = {}
  const identifier = formData.get('identifier').trim()
  const password = formData.get('password')

  if (!identifier || identifier.length > 254) {
    errors.identifier = 'Escribe tu nombre de usuario o correo electrónico.'
  }

  if (!password || new TextEncoder().encode(password).length > 72) {
    errors.password = 'Escribe tu contraseña (máximo 72 bytes).'
  }

  return errors
}

function Field({ id, label, error, hint, ...inputProps }) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const descriptionId = error ? errorId : hint ? hintId : undefined

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        {...inputProps}
      />
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="form-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Fieras de la Arena, inicio">
      <span className="brand__mark" aria-hidden="true">FA</span>
      <span>Fieras <span className="brand__muted">de la Arena</span></span>
    </Link>
  )
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const location = useLocation()
  const navigate = useNavigate()
  const referralCodeFromLink = new URLSearchParams(location.search).get('referralCode') || ''
  const { login, register } = useSession()
  const [fieldErrors, setFieldErrors] = useState({})
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const errors = isRegister ? validateRegistration(formData) : validateLogin(formData)

    setFieldErrors(errors)
    setRequestError('')

    if (Object.keys(errors).length > 0) {
      return
    }

    const values = isRegister
      ? {
          username: formData.get('username').trim().toLowerCase(),
          email: formData.get('email').trim().toLowerCase(),
          password: formData.get('password'),
          ...(formData.get('referralCode').trim()
            ? { referralCode: formData.get('referralCode').trim().toLowerCase() }
            : {}),
        }
      : {
          identifier: formData.get('identifier').trim(),
          password: formData.get('password'),
        }

    setIsSubmitting(true)

    try {
      if (isRegister) {
        await register(values)
        navigate('/create-fighter', { replace: true })
      } else {
        await login(values)
        navigate(location.state?.from || '/dashboard', { replace: true })
      }
    } catch (error) {
      setRequestError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleChange(event) {
    const field = event.target.name
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
    setRequestError('')
  }

  return (
    <main className="auth-layout">
      <Brand />

      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="back-link" to="/">← Volver al inicio</Link>
        <p className="eyebrow">{isRegister ? 'Únete a la arena' : 'Qué bueno verte de nuevo'}</p>
        <h1 id="auth-title">{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
        <p className="auth-intro">
          {isRegister
            ? 'Regístrate para comenzar tu camino entre las fieras.'
            : 'Ingresa tus datos para volver a la arena.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} onChange={handleChange} noValidate>
            {isRegister ? (
              <>
                <Field
                  id="username"
                  name="username"
                  type="text"
                  label="Nombre de usuario"
                  autoComplete="username"
                  maxLength={24}
                  placeholder="ej. ferox_7"
                  required
                  error={fieldErrors.username}
                />
                <Field
                  id="email"
                  name="email"
                  type="email"
                  label="Correo electrónico"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="tu@correo.com"
                  required
                  error={fieldErrors.email}
                />
                <Field
                  id="password"
                  name="password"
                  type="password"
                  label="Contraseña"
                  autoComplete="new-password"
                  maxLength={72}
                  placeholder="Al menos 8 bytes"
                  required
                  hint="Entre 8 y 72 bytes. Tu contraseña se guarda de forma segura."
                  error={fieldErrors.password}
                />
                <Field
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  label="Código de invitación (opcional)"
                  autoComplete="off"
                  maxLength={32}
                  placeholder="Código de 32 caracteres"
                  defaultValue={isRegister ? referralCodeFromLink : undefined}
                  error={fieldErrors.referralCode}
                />
              </>
            ) : (
              <>
                <Field
                  id="identifier"
                  name="identifier"
                  type="text"
                  label="Usuario o correo electrónico"
                  autoComplete="username"
                  maxLength={254}
                  placeholder="Tu usuario o correo"
                  required
                  error={fieldErrors.identifier}
                />
                <Field
                  id="password"
                  name="password"
                  type="password"
                  label="Contraseña"
                  autoComplete="current-password"
                  maxLength={72}
                  placeholder="Tu contraseña"
                  required
                  error={fieldErrors.password}
                />
              </>
            )}

            {requestError && (
              <p className="request-error" role="alert">
                {requestError}
              </p>
            )}

            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Conectando…' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
        </form>

        <p className="auth-switch">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </Link>
        </p>
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

function HomePage() {
  const { status, user, error, refreshSession } = useSession()

  return (
    <main className="home-layout">
      <Brand />
      {status === 'loading' ? (
        <section className="home-hero" role="status">Comprobando tu sesión…</section>
      ) : status === 'error' ? (
        <section className="home-hero" aria-labelledby="home-session-error-title">
          <p className="eyebrow">No pudimos comprobar tu sesión</p>
          <h1 id="home-session-error-title">Tu arena sigue aquí.</h1>
          <p className="request-error" role="alert">{error}</p>
          <button className="button button--primary" type="button" onClick={refreshSession}>
            Intentar de nuevo
          </button>
        </section>
      ) : status === 'authenticated' ? (
        <section className="home-hero">
          <p className="eyebrow">Qué bueno verte de nuevo</p>
          <h1>Tu arena<br /><span>te espera, {user.username}.</span></h1>
          <p className="home-hero__copy">
            Tu sesión sigue activa. Continúa tu camino o consulta a tus rivales.
          </p>
          <div className="home-actions">
            <Link className="button button--primary" to="/dashboard">Ir a mi panel</Link>
            <Link className="button button--secondary" to="/leaderboards">Ver clasificación</Link>
          </div>
        </section>
      ) : (
        <section className="home-hero">
          <p className="eyebrow">Tu leyenda empieza aquí</p>
          <h1>Entra a la arena.<br /><span>Forja tu historia.</span></h1>
          <p className="home-hero__copy">
            Crea tu cuenta y prepárate para demostrar de qué estás hecho.
          </p>
          <div className="home-actions">
            <Link className="button button--primary" to="/register">Crear cuenta</Link>
            <Link className="button button--secondary" to="/login">Iniciar sesión</Link>
            <Link className="button button--secondary" to="/leaderboards">Ver clasificación</Link>
          </div>
        </section>
      )}
      <p className="home-footer">Fieras de la Arena <span>·</span> Combate. Progresa. Compite.</p>
    </main>
  )
}

function GuestRoute() {
  const { status, error, refreshSession } = useSession()

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
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

function ProtectedRoute() {
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

function FighterStatusRoute({ needsCreation = false }) {
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

function CreateFighterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [appearance, setAppearance] = useState({ ...NEUTRAL_FIGHTER_APPEARANCE })
  const [fieldError, setFieldError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdFighter, setCreatedFighter] = useState(null)
  const creationRequestIds = useRef(new Map())

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedName = name.trim()

    setFieldError('')
    setRequestError('')

    if (normalizedName.length < 3 || normalizedName.length > 18) {
      setFieldError('El nombre debe tener entre 3 y 18 caracteres.')
      return
    }

    const requestPayload = JSON.stringify({ name: normalizedName, appearance })
    let requestId = creationRequestIds.current.get(requestPayload)

    if (!requestId) {
      if (typeof globalThis.crypto?.randomUUID !== 'function') {
        setRequestError('Este navegador no puede enviar una creación segura. Actualízalo e inténtalo de nuevo.')
        return
      }
      requestId = globalThis.crypto.randomUUID()
      creationRequestIds.current.set(requestPayload, requestId)
    }

    setIsSubmitting(true)

    try {
      setCreatedFighter(await createFighter(normalizedName, { requestId, appearance }))
    } catch (error) {
      if (error.code === 'INVALID_FIGHTER_DATA' || error.code === 'FIGHTER_NAME_TAKEN') {
        setFieldError(error.message)
      } else {
        setRequestError(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleChange() {
    setFieldError('')
    setRequestError('')
  }

  function handleAppearanceChange(event) {
    const { name: field, value } = event.target
    setAppearance((currentAppearance) => ({
      ...currentAppearance,
      [field]: value,
    }))
    handleChange()
  }

  return (
    <main className="auth-layout">
      <Brand />

      <section className="auth-card fighter-creation-card" aria-labelledby="fighter-title">
        <p className="eyebrow">Tu camino empieza aquí</p>
        <h1 id="fighter-title">Crea tu luchador</h1>
        <p className="auth-intro">
          Elige un nombre y una apariencia para tu fiera. Sus atributos iniciales los determina el servidor.
        </p>

        {createdFighter ? (
          <section className="fighter-creation-result" aria-labelledby="fighter-result-title" role="status">
            <div className="fighter-creation-result__heading">
              <span className="success-panel__icon" aria-hidden="true">✓</span>
              <div>
                <p className="eyebrow">Creación confirmada</p>
                <h2 id="fighter-result-title">{createdFighter.name}</h2>
              </div>
            </div>
            <div className="fighter-creation-result__details">
              <div>
                <FighterAppearancePreview
                  appearance={createdFighter.appearance}
                  name={createdFighter.name}
                />
                <p className="form-hint">Apariencia elegida</p>
              </div>
              <div className="fighter-creation-result__stats">
                <h3>Atributos asignados por el servidor</h3>
                <dl>
                  <div><dt>Vida</dt><dd>{createdFighter.baseStats.health}</dd></div>
                  <div><dt>Ataque</dt><dd>{createdFighter.baseStats.attack}</dd></div>
                  <div><dt>Defensa</dt><dd>{createdFighter.baseStats.defense}</dd></div>
                  <div><dt>Velocidad</dt><dd>{createdFighter.baseStats.speed}</dd></div>
                </dl>
                <p className="form-hint">
                  El servidor eligió un perfil inicial al azar. No se puede escoger ni repetir esa tirada.
                </p>
              </div>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              Ir al panel
            </button>
          </section>
        ) : (
          <form className="auth-form fighter-creation-form" onSubmit={handleSubmit} onChange={handleChange} noValidate>
            <div className="fighter-creation-grid">
              <div className="fighter-creation-fields">
                <div className="form-field">
                  <label htmlFor="fighter-name">Nombre del luchador</label>
                  <input
                    id="fighter-name"
                    name="name"
                    type="text"
                    autoComplete="off"
                    maxLength={18}
                    placeholder="ej. Colmillo de Bronce"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? 'fighter-name-error' : 'fighter-name-hint'}
                  />
                  {fieldError ? (
                    <p className="field-error" id="fighter-name-error" role="alert">
                      {fieldError}
                    </p>
                  ) : (
                    <p className="form-hint" id="fighter-name-hint">
                      Entre 3 y 18 caracteres. El nombre debe estar disponible.
                    </p>
                  )}
                </div>

                <fieldset className="fighter-appearance-fields">
                  <legend>Apariencia (solo estética)</legend>
                  {Object.entries(FIGHTER_APPEARANCE_OPTIONS).map(([field, options]) => (
                    <div className="form-field" key={field}>
                      <label htmlFor={`fighter-${field}`}>
                        {FIGHTER_APPEARANCE_FIELD_LABELS[field]}
                      </label>
                      <select
                        id={`fighter-${field}`}
                        name={field}
                        value={appearance[field]}
                        onChange={handleAppearanceChange}
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </fieldset>
              </div>

              <aside className="fighter-creation-preview" aria-labelledby="fighter-preview-title">
                <h2 id="fighter-preview-title">Vista de apariencia</h2>
                <FighterAppearancePreview appearance={appearance} name={name.trim()} />
                <p className="form-hint">
                  La vista refleja únicamente las opciones visuales. No anticipa atributos ni resultados de combate.
                </p>
              </aside>
            </div>

            <p className="fighter-creation-random-note">
              Al crear, el servidor sortea un perfil inicial de atributos. No puedes elegirlo ni repetirlo; la apariencia no cambia el combate.
            </p>
            {requestError && <p className="request-error" role="alert">{requestError}</p>}

            <button
              className="button button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creando luchador…' : 'Crear luchador'}
            </button>
          </form>
        )}
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> Una fiera, una leyenda</p>
    </main>
  )
}

function FighterSummary({
  fighter,
  eyebrow,
  showPublicLink = false,
  returnTo,
  stats = fighter.baseStats,
  statsTitle = 'Estadísticas base',
}) {
  return (
    <section className="session-card fighter-profile" aria-labelledby="fighter-profile-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="fighter-profile-title">{fighter.name}</h1>
      <p className="auth-intro">@{fighter.username}</p>

      <dl className="fighter-profile__metrics">
        <div>
          <dt>Nivel</dt>
          <dd>{fighter.level}</dd>
        </div>
        <div>
          <dt>Experiencia</dt>
          <dd>{fighter.xp} XP</dd>
        </div>
        <div>
          <dt>ELO</dt>
          <dd>{fighter.elo}</dd>
        </div>
        <div>
          <dt>Récord</dt>
          <dd>{fighter.wins} V · {fighter.losses} D · {fighter.draws} E</dd>
        </div>
      </dl>

      <div className="fighter-profile__stats" aria-label={statsTitle}>
        <h2>{statsTitle}</h2>
        <dl>
          <div><dt>Vida</dt><dd>{stats.health}</dd></div>
          <div><dt>Ataque</dt><dd>{stats.attack}</dd></div>
          <div><dt>Defensa</dt><dd>{stats.defense}</dd></div>
          <div><dt>Velocidad</dt><dd>{stats.speed}</dd></div>
        </dl>
      </div>

      {showPublicLink && (
        <Link
          className="button button--secondary fighter-profile__link"
          to={`/profile/${encodeURIComponent(fighter.username)}`}
          state={returnTo ? { returnTo } : undefined}
        >
          Ver perfil público
        </Link>
      )}
    </section>
  )
}

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

          const [profileResult, attemptsResult, historyResult] = await Promise.allSettled([
            collection.pagination.totalItems === 1
              ? fetchMyFighter()
              : Promise.resolve(null),
            fetchArenaAttempts(),
            fetchBattleHistory(1, 5),
          ])

          if (!isCurrent) {
            return
          }

          const fighter = collection.pagination.totalItems === 1
            ? profileResult.status === 'fulfilled'
              ? profileResult.value
              : null
            : {
                ...selectedFighter,
                username: user.username,
                stats: selectedFighter.baseStats,
              }

          if (!fighter || fighter.id !== selectedFighter.id) {
            throw new Error(
              profileResult.status === 'rejected'
                ? profileResult.reason.message
                : 'La selección activa cambió. Actualiza el panel e inténtalo de nuevo.'
            )
          }

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
            attempts: attemptsResult.status === 'fulfilled'
              ? attemptsResult.value
              : null,
            attemptsError: attemptsResult.status === 'rejected'
              ? attemptsResult.reason.message
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

function formatBattleEvent(event, fighterNames) {
  const fighterName = (fighterId) => fighterNames.get(fighterId) ?? 'luchador desconocido'

  switch (event.type) {
    case 'combat_started':
      return '¡Comienza el combate!'
    case 'attack':
      return `Acción ${event.actionNumber}: ${fighterName(event.attackerFighterId)} ataca a ${fighterName(event.targetFighterId)}.`
    case 'damage':
      return `${fighterName(event.targetFighterId)} recibe ${event.amount} de daño y conserva ${event.remainingHealth} de vida.`
    case 'fighter_defeated':
      return `${fighterName(event.fighterId)} queda fuera de combate.`
    case 'combat_finished':
      return event.winnerFighterId
        ? `${fighterName(event.winnerFighterId)} gana el combate.`
        : 'El combate termina en empate.'
    default:
      return `Evento no compatible con esta versión del motor: ${event.type}.`
  }
}

function BattleResultPage() {
  const { id } = useParams()
  const [battle, setBattle] = useState(null)
  const [ownFighterId, setOwnFighterId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true

    setStatus('loading')
    setError('')

    fetchBattle(id)
      .then(async (loadedBattle) => {
        if (!isCurrent) {
          return
        }

        const activeFighter = loadedBattle.ownFighterId
          ? null
          : await fetchActiveFighter()
        if (!isCurrent) {
          return
        }
        const ownerId = loadedBattle.ownFighterId ?? activeFighter?.id
        if (
          !ownerId ||
          !loadedBattle.participants.some(({ fighter: participant }) => participant.id === ownerId)
        ) {
          throw new Error('El registro del combate no incluye a tu luchador.')
        }

        setBattle(loadedBattle)
        setOwnFighterId(ownerId)
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
  }, [id, reloadVersion])

  const ownParticipant = battle?.participants.find(
    ({ fighter: participant }) => participant.id === ownFighterId,
  )
  const opponentParticipant = battle?.participants.find(
    ({ fighter: participant }) => participant.id !== ownFighterId,
  )
  const isDraw = battle?.winnerFighterId === null
  const isVictory = battle?.winnerFighterId === ownFighterId
  const fighterNames = new Map(
    battle?.participants.map(({ fighter: participant }) => [participant.id, participant.name]) ?? [],
  )
  const outcome = isDraw ? 'Empate' : isVictory ? '¡Victoria!' : 'Derrota'
  const outcomeStyle = isDraw ? 'draw' : isVictory ? 'win' : 'loss'

  return (
    <main className="session-layout">
      <Brand />

      {status === 'loading' ? (
        <section className="session-card battle-result-card" role="status">
          Cargando el resultado guardado…
        </section>
      ) : status === 'error' ? (
        <section className="session-card battle-result-card">
          <BattleResultError
            error={error}
            onRetry={() => setReloadVersion((version) => version + 1)}
          />
          <Link className="button button--secondary" to="/arena">Volver a la Arena</Link>
        </section>
      ) : (
        <article className="session-card battle-result-card" aria-labelledby="battle-result-title">
          <Link className="button button--secondary" to="/arena">Volver a la Arena</Link>
          <Link className="button button--secondary" to="/history">Ver historial de combates</Link>
          <p className="eyebrow">
            {battle.battleType === 'training' ? 'Combate de entrenamiento' : 'Combate PvP'}
          </p>
          <p className={`battle-result__outcome battle-result__outcome--${outcomeStyle}`}>
            {outcome}
          </p>
          <h1 id="battle-result-title">{opponentParticipant.fighter.name}</h1>
          <p className="auth-intro">
            Rival · Nivel {opponentParticipant.fighter.level} · ELO {opponentParticipant.fighter.elo}
          </p>
          <p className="battle-result__date">
            <time dateTime={battle.createdAt}>
              {new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })
                .format(new Date(battle.createdAt))}
            </time>
          </p>

          <dl className="battle-result__metrics">
            <div>
              <dt>Experiencia obtenida</dt>
              <dd>+{ownParticipant.result.xpGained} XP</dd>
            </div>
            <div>
              <dt>Cambio de ELO</dt>
              <dd>{ownParticipant.result.eloChange > 0 ? '+' : ''}{ownParticipant.result.eloChange}</dd>
            </div>
            <div>
              <dt>ELO actual</dt>
              <dd>{ownParticipant.result.eloAfter}</dd>
            </div>
            <div>
              <dt>Acciones</dt>
              <dd>{battle.actionCount}</dd>
            </div>
          </dl>

          <BattleProgression
            progression={ownParticipant.result.progression}
            xpGained={ownParticipant.result.xpGained}
          />

          <section className="battle-events" aria-labelledby="battle-events-title">
            <BattleAnimation participants={battle.participants} events={battle.events} />
            <h2 id="battle-events-title">Secuencia del combate</h2>
            <ol>
              {battle.events.map((event, index) => (
                <li key={`${event.type}-${index}`}>
                  {formatBattleEvent(event, fighterNames)}
                </li>
              ))}
            </ol>
          </section>

          <p className="battle-result__version">Motor de combate {battle.engineVersion}</p>
        </article>
      )}
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

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

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<GuestRoute />}>
        <Route path="/register" element={<AuthPage key="register" mode="register" />} />
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<FighterStatusRoute key="has-fighter" />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/history" element={<BattleHistoryPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/battles/:id" element={<BattleResultPage />} />
        </Route>
        <Route element={<FighterStatusRoute key="needs-creation" needsCreation />}>
          <Route path="/create-fighter" element={<CreateFighterPage />} />
        </Route>
      </Route>
      <Route path="/profile/:username" element={<PublicProfilePage />} />
      <Route path="/leaderboards" element={<LeaderboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

import { useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { registerUser } from './api/auth.js'
import { useSession } from './context/SessionContext.jsx'
import './App.css'

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/

function validateRegistration(formData) {
  const errors = {}
  const username = formData.get('username').trim().toLowerCase()
  const email = formData.get('email').trim()
  const password = formData.get('password')
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

function Field({ id, label, error, ...inputProps }) {
  const errorId = `${id}-error`

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useSession()
  const [fieldErrors, setFieldErrors] = useState({})
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)

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
        }
      : {
          identifier: formData.get('identifier').trim(),
          password: formData.get('password'),
        }

    setIsSubmitting(true)

    try {
      if (isRegister) {
        setSuccess(await registerUser(values))
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
      <Link className="brand" to="/" aria-label="Fieras de la Arena, inicio">
        <span className="brand__mark" aria-hidden="true">FA</span>
        <span>Fieras <span className="brand__muted">de la Arena</span></span>
      </Link>

      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="back-link" to="/">← Volver al inicio</Link>
        <p className="eyebrow">{isRegister ? 'Únete a la arena' : 'Qué bueno verte de nuevo'}</p>
        <h1 id="auth-title">{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
        <p className="auth-intro">
          {isRegister
            ? 'Regístrate para comenzar tu camino entre las fieras.'
            : 'Ingresa tus datos para volver a la arena.'}
        </p>

        {success ? (
          <div className="success-panel" role="status" aria-live="polite">
            <span className="success-panel__icon" aria-hidden="true">✓</span>
            <h2>{isRegister ? '¡Cuenta creada!' : '¡Sesión iniciada!'}</h2>
            <p>
              {isRegister
                ? `Tu cuenta ${success.username} está lista. Ahora puedes iniciar sesión.`
                : `Bienvenido de nuevo, ${success.username}.`}
            </p>
            <Link className="button button--primary" to="/login">
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
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
                  error={fieldErrors.password}
                />
                <p className="form-hint">Entre 8 y 72 bytes. Tu contraseña se guarda de forma segura.</p>
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
        )}

        {!success && (
          <p className="auth-switch">
            {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </Link>
          </p>
        )}
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

function HomePage() {
  return (
    <main className="home-layout">
      <Link className="brand" to="/" aria-label="Fieras de la Arena, inicio">
        <span className="brand__mark" aria-hidden="true">FA</span>
        <span>Fieras <span className="brand__muted">de la Arena</span></span>
      </Link>
      <section className="home-hero">
        <p className="eyebrow">Tu leyenda empieza aquí</p>
        <h1>Entra a la arena.<br /><span>Forja tu historia.</span></h1>
        <p className="home-hero__copy">
          Crea tu cuenta y prepárate para demostrar de qué estás hecho.
        </p>
        <div className="home-actions">
          <Link className="button button--primary" to="/register">Crear cuenta</Link>
          <Link className="button button--secondary" to="/login">Iniciar sesión</Link>
        </div>
      </section>
      <p className="home-footer">Fieras de la Arena <span>·</span> Combate. Progresa. Compite.</p>
    </main>
  )
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
        <section className="session-card" aria-labelledby="session-error-title">
          <h1 id="session-error-title">No se pudo comprobar tu sesión</h1>
          <p className="request-error" role="alert">{error}</p>
          <button className="button button--primary" type="button" onClick={refreshSession}>
            Intentar de nuevo
          </button>
        </section>
      </main>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const [logoutError, setLogoutError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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

  return (
    <main className="session-layout">
      <Link className="brand" to="/" aria-label="Fieras de la Arena, inicio">
        <span className="brand__mark" aria-hidden="true">FA</span>
        <span>Fieras <span className="brand__muted">de la Arena</span></span>
      </Link>
      <section className="session-card" aria-labelledby="dashboard-title">
        <p className="eyebrow">Sesión activa</p>
        <h1 id="dashboard-title">Bienvenido, {user.username}</h1>
        <p className="auth-intro">Tu sesión fue confirmada por el servidor.</p>
        {logoutError && <p className="request-error" role="alert">{logoutError}</p>}
        <button
          className="button button--secondary"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

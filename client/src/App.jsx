import { useState } from 'react'
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

async function sendAuthRequest(endpoint, values) {
  let response

  try {
    response = await fetch(`/api/v1/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Comprueba que esté en ejecución e inténtalo de nuevo.')
  }

  let result

  try {
    result = await response.json()
  } catch {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  if (!response.ok) {
    throw new Error(result?.error?.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.')
  }

  return result.user
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
      const user = await sendAuthRequest(isRegister ? 'register' : 'login', values)
      setSuccess(user)
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
      <a className="brand" href="/" aria-label="Fieras de la Arena, inicio">
        <span className="brand__mark" aria-hidden="true">FA</span>
        <span>Fieras <span className="brand__muted">de la Arena</span></span>
      </a>

      <section className="auth-card" aria-labelledby="auth-title">
        <a className="back-link" href="/">← Volver al inicio</a>
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
            <a className="button button--primary" href={isRegister ? '/login' : '/'}>
              {isRegister ? 'Ir a iniciar sesión' : 'Volver al inicio'}
            </a>
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
            <a href={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </a>
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
      <a className="brand" href="/" aria-label="Fieras de la Arena, inicio">
        <span className="brand__mark" aria-hidden="true">FA</span>
        <span>Fieras <span className="brand__muted">de la Arena</span></span>
      </a>
      <section className="home-hero">
        <p className="eyebrow">Tu leyenda empieza aquí</p>
        <h1>Entra a la arena.<br /><span>Forja tu historia.</span></h1>
        <p className="home-hero__copy">
          Crea tu cuenta y prepárate para demostrar de qué estás hecho.
        </p>
        <div className="home-actions">
          <a className="button button--primary" href="/register">Crear cuenta</a>
          <a className="button button--secondary" href="/login">Iniciar sesión</a>
        </div>
      </section>
      <p className="home-footer">Fieras de la Arena <span>·</span> Combate. Progresa. Compite.</p>
    </main>
  )
}

function App() {
  const path = window.location.pathname

  if (path === '/register') {
    return <AuthPage mode="register" />
  }

  if (path === '/login') {
    return <AuthPage mode="login" />
  }

  return <HomePage />
}

export default App

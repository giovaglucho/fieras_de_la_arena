import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useSession } from '../context/SessionContext.jsx'
import Brand from '../components/Brand.jsx'
import Field from '../components/Field.jsx'

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

export default AuthPage

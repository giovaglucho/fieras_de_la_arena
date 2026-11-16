import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import Brand from '../components/Brand.jsx'

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

export default HomePage

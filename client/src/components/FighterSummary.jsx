import { Link } from 'react-router-dom'

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

export default FighterSummary

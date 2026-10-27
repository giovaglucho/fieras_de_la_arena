const STAT_LABELS = {
  health: 'Vida',
  attack: 'Ataque',
  defense: 'Defensa',
  speed: 'Velocidad',
}

export function BattleResultError({ error, onRetry }) {
  return (
    <section className="battle-result-error" aria-labelledby="battle-error-title">
      <h1 id="battle-error-title">No se pudo cargar el combate</h1>
      <p className="request-error" role="alert">{error}</p>
      <button className="button button--primary" type="button" onClick={onRetry}>
        Intentar de nuevo
      </button>
    </section>
  )
}

export default function BattleProgression({ progression, xpGained }) {
  if (!progression) {
    return (
      <section className="battle-progression" aria-labelledby="battle-progression-title">
        <h2 id="battle-progression-title">Progreso de tu luchador</h2>
        <p>Este combate no incluye datos de progresión guardados por el servidor.</p>
      </section>
    )
  }

  const increasedStats = new Set(
    progression.growthEvents
      .filter(({ amount }) => amount > 0)
      .map(({ stat }) => stat),
  )

  return (
    <section className="battle-progression" aria-labelledby="battle-progression-title">
      <h2 id="battle-progression-title">Progreso de tu luchador</h2>
      <p>
        El servidor otorgó +{xpGained} XP en este combate.
        {progression.levelsGained === 0
          ? ' No alcanzaste el siguiente nivel.'
          : ` Subiste ${progression.levelsGained} ${progression.levelsGained === 1 ? 'nivel' : 'niveles'} y cada nivel resolvió una mejora.`}
      </p>

      <dl className="battle-progression__levels">
        <div>
          <dt>Nivel</dt>
          <dd>{progression.levelBefore} → {progression.levelAfter}</dd>
        </div>
        <div>
          <dt>XP guardada</dt>
          <dd>{progression.xpBefore} → {progression.xpAfter}</dd>
        </div>
      </dl>

      <h3>Mejoras por nivel</h3>
      {progression.levelsGained === 0 ? (
        <p>No hubo mejoras de atributos porque no se ganó ningún nivel.</p>
      ) : (
        <ol className="battle-progression__events">
          {progression.growthEvents.map(({ level, stat, amount }) => (
            <li key={level}>
              {amount > 0
                ? `Nivel ${level}: +${amount} ${STAT_LABELS[stat]}.`
                : `Nivel ${level}: sin aumento; se alcanzaron los topes de atributos.`}
            </li>
          ))}
        </ol>
      )}

      <table className="battle-progression__stats">
        <caption>Estadísticas antes y después de la recompensa</caption>
        <thead>
          <tr>
            <th scope="col">Atributo</th>
            <th scope="col">Antes</th>
            <th scope="col">Después</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(STAT_LABELS).map(([stat, label]) => (
            <tr key={stat}>
              <th scope="row">{label}</th>
              <td>{progression.statsBefore[stat]}</td>
              <td>
                {progression.statsAfter[stat]}
                {increasedStats.has(stat) ? <span className="battle-progression__increase"> · Aumentó</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

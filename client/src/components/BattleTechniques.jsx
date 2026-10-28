import { describeTechniqueEffect, getTechniqueName } from '../techniques.js'

function BattleParticipantTechniques({ fighter, events }) {
  const techniques = fighter.techniques

  if (!techniques) {
    return (
      <article className="battle-techniques__participant">
        <h3>{fighter.name}</h3>
        <p>Este combate histórico no conserva el snapshot de habilidades.</p>
      </article>
    )
  }

  return (
    <article className="battle-techniques__participant">
      <h3>{fighter.name}</h3>
      {['passive', 'active'].map((category) => {
        const technique = techniques[category]
        const categoryLabel = category === 'passive' ? 'Pasiva' : 'Activa'

        if (!technique) {
          return (
            <section key={category}>
              <h4>{categoryLabel}</h4>
              <p>No se seleccionó una habilidad {category === 'passive' ? 'pasiva' : 'activa'} para este combate.</p>
            </section>
          )
        }

        const activation = events.find((event) =>
          event.type === 'technique_activated' &&
          event.fighterId === fighter.id &&
          event.techniqueId === technique.techniqueId
        )
        const name = getTechniqueName(technique.techniqueId)

        return (
          <section key={category}>
            <h4>{name}</h4>
            <p>Versión guardada: {technique.techniqueVersion}</p>
            <p>{describeTechniqueEffect(technique.effect)}</p>
            <p className={activation ? 'battle-techniques__activated' : 'battle-techniques__inactive'}>
              {activation ? 'Se activó en este combate.' : 'No se activó en este combate.'}
            </p>
          </section>
        )
      })}
    </article>
  )
}

export default function BattleTechniques({ participants, events }) {
  const hasTechniqueSnapshot = participants.some(({ fighter }) => fighter.techniques)

  return (
    <section className="battle-techniques" aria-labelledby="battle-techniques-title">
      <h2 id="battle-techniques-title">Habilidades del combate</h2>
      <p>Se muestran las habilidades seleccionadas por el servidor y cuáles llegaron a activarse.</p>
      {!hasTechniqueSnapshot && (
        <p className="battle-techniques__legacy">
          Este combate histórico se guardó antes de registrar snapshots de habilidades.
        </p>
      )}
      <div className="battle-techniques__participants">
        {participants.map(({ fighter }) => (
          <BattleParticipantTechniques
            key={fighter.id}
            fighter={fighter}
            events={events}
          />
        ))}
      </div>
    </section>
  )
}

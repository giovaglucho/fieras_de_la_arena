import EquipmentItemDetails from './EquipmentItemDetails.jsx'

function BattleParticipantEquipment({ participant }) {
  const { fighter } = participant
  const equipment = fighter.equipment

  if (!equipment) {
    return (
      <article className="battle-equipment__participant">
        <h3>{fighter.name}</h3>
        <p>Este registro histórico no conserva el equipo sorteado.</p>
      </article>
    )
  }

  return (
    <article className="battle-equipment__participant">
      <h3>{fighter.name}</h3>
      {Number.isFinite(fighter.initiative) && (
        <p>Iniciativa efectiva: {fighter.initiative}</p>
      )}
      <ul className="battle-equipment__slots">
        {['weapon', 'armor'].map((slot) => {
          const item = equipment[slot]
          const label = slot === 'weapon' ? 'Arma' : 'Armadura'

          return (
            <li key={slot}>
              {item ? (
                <EquipmentItemDetails item={item} headingLevel={4} />
              ) : (
                <section className="battle-equipment__empty-slot">
                  <h4>{label}</h4>
                  <p>Sin {slot === 'weapon' ? 'arma' : 'armadura'} en esta carga.</p>
                </section>
              )}
            </li>
          )
        })}
      </ul>
    </article>
  )
}

export default function BattleEquipment({ participants }) {
  const hasEquipmentSnapshot = participants.some(
    ({ fighter }) => fighter.equipment
  )

  return (
    <section className="battle-equipment" aria-labelledby="battle-equipment-title">
      <h2 id="battle-equipment-title">Carga sorteada para este combate</h2>
      <p>
        La carga se selecciona automáticamente desde la colección de cada luchador y permanece fija durante la pelea.
        Los efectos mostrados son los del snapshot guardado para este combate.
      </p>
      {!hasEquipmentSnapshot && (
        <p className="battle-equipment__legacy">
          Este combate histórico se guardó antes de registrar snapshots de equipo.
        </p>
      )}
      <div className="battle-equipment__participants">
        {participants.map(({ fighter }) => (
          <BattleParticipantEquipment
            key={fighter.id}
            participant={{ fighter }}
          />
        ))}
      </div>
    </section>
  )
}

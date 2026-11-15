function petContribution(pet, events) {
  const attacks = events.filter(
    (event) => event.type === 'pet_attack' && event.attackerPetId === pet.petId,
  )
  const damageDealt = events
    .filter((event) => event.type === 'damage' && event.attackerPetId === pet.petId)
    .reduce((total, event) => total + event.amount, 0)
  const receivedHits = events.filter(
    (event) => event.type === 'pet_targeted_attack' && event.targetPetId === pet.petId,
  )
  const damageReceived = events
    .filter((event) => event.type === 'pet_damage' && event.targetPetId === pet.petId)
    .reduce((total, event) => total + event.amount, 0)
  const defeated = events.some(
    (event) => event.type === 'pet_defeated' && event.petId === pet.petId,
  )
  const contribution = []

  if (attacks.length > 0) {
    contribution.push(`realizó ${attacks.length} ${attacks.length === 1 ? 'ataque' : 'ataques'} e infligió ${damageDealt} de daño`)
  }
  if (receivedHits.length > 0) {
    const evasions = receivedHits.filter((event) => event.evaded).length
    contribution.push(
      `${receivedHits.length} ${receivedHits.length === 1 ? 'ataque dirigido' : 'ataques dirigidos'}${evasions ? `, esquivó ${evasions}` : ''} y recibió ${damageReceived} de daño`,
    )
  }
  if (defeated) {
    contribution.push('quedó fuera de combate')
  }

  return contribution.length > 0
    ? contribution.join('; ')
    : 'no llegó a intervenir directamente en este combate'
}

export default function BattlePets({ participants, events }) {
  const hasPetSnapshots = participants.some(({ fighter }) => fighter.pets !== undefined)

  return (
    <section className="battle-pets" aria-labelledby="battle-pets-title">
      <h2 id="battle-pets-title">Acompañantes del combate</h2>
      <p>La participación se calcula con los snapshots y eventos guardados por el servidor.</p>
      {!hasPetSnapshots ? (
        <p className="battle-pets__legacy">
          Este combate histórico se guardó antes de registrar mascotas.
        </p>
      ) : (
        <div className="battle-pets__participants">
          {participants.map(({ fighter }) => (
            <article className="battle-pets__participant" key={fighter.id}>
              <h3>{fighter.name}</h3>
              {fighter.pets === undefined ? (
                <p>Este combate no conserva el snapshot de mascotas de este luchador.</p>
              ) : fighter.pets.length === 0 ? (
                <p>Sin mascotas en este combate.</p>
              ) : (
                <ul>
                  {fighter.pets.map((pet) => (
                    <li key={pet.petId}>
                      <strong>{pet.name}:</strong> {petContribution(pet, events)}.
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

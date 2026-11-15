const RARITY_LABELS = {
  comun: 'Común',
  rara: 'Rara',
  muy_rara: 'Muy rara',
}

function PetDetails({ pet }) {
  return (
    <article className={`pet-card pet-card--${pet.rarity}`}>
      <div className="pet-card__identity">
        <span className="pet-card__mark" aria-hidden="true">
          {pet.name.slice(0, 1)}
        </span>
        <div>
          <h3>{pet.name}</h3>
          <p>{RARITY_LABELS[pet.rarity]}</p>
        </div>
      </div>
      <dl className="pet-card__stats">
        <div><dt>Vida</dt><dd>{pet.stats.health}</dd></div>
        <div><dt>Fuerza</dt><dd>{pet.stats.strength}</dd></div>
        <div><dt>Agilidad</dt><dd>{pet.stats.agility}</dd></div>
        <div><dt>Velocidad</dt><dd>{pet.stats.speed}</dd></div>
      </dl>
      <p className="pet-card__effect">
        Ataca entre {pet.effects.attacksPerAction.min} y {pet.effects.attacksPerAction.max} veces por acción
        · esquiva {pet.effects.evasionChancePercent}% de los ataques dirigidos
        · reduce {pet.effects.ownerHealthPenalty} puntos de vida máxima de su luchador.
      </p>
    </article>
  )
}

export default function PetCollection({ fighter }) {
  const petsById = new Map(fighter.pets.map((pet) => [pet.petId, pet]))

  return (
    <section className="pet-collection" aria-labelledby="pet-collection-title">
      <p className="eyebrow">Acompañantes de {fighter.name}</p>
      <h2 id="pet-collection-title">Colección de mascotas</h2>
      <p>
        Las mascotas se asignan y participan automáticamente según las reglas del servidor.
        No se pueden elegir ni cambiar antes de un combate.
      </p>
      {fighter.pets.length === 0 ? (
        <p className="pet-collection__empty">
          Este luchador aún no tiene mascotas. Puede combatir normalmente sin acompañantes.
        </p>
      ) : (
        <ul className="pet-collection__items">
          {fighter.pets.map((pet) => (
            <li key={pet.petId}><PetDetails pet={pet} /></li>
          ))}
        </ul>
      )}

      <section className="pet-collection__unlocks" aria-labelledby="pet-unlocks-title">
        <h3 id="pet-unlocks-title">Desbloqueos por nivel</h3>
        {fighter.petUnlocks.length === 0 ? (
          <p>Aún no hay desbloqueos de mascotas registrados.</p>
        ) : (
          <ol>
            {fighter.petUnlocks.map((unlock) => {
              const pet = unlock.pet ?? petsById.get(unlock.petId)

              return (
                <li key={unlock.level}>
                  <strong>Nivel {unlock.level}</strong>
                  {pet ? (
                    <span> Se unió {pet.name} ({RARITY_LABELS[pet.rarity]}).</span>
                  ) : (
                    <span> Esta tirada no otorgó una mascota.</span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </section>
  )
}

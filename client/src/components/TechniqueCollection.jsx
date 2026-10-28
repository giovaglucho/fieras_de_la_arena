import {
  describeTechniqueEffect,
  getTechniqueDescription,
  getTechniqueName,
} from '../techniques.js'

function TechniqueGroup({ category, title, techniques }) {
  const ownedTechniques = techniques.filter((technique) => technique.category === category)

  return (
    <section className="technique-collection__group" aria-labelledby={`technique-${category}-title`}>
      <h3 id={`technique-${category}-title`}>{title}</h3>
      {ownedTechniques.length === 0 ? (
        <p>No tienes técnicas {category === 'passive' ? 'pasivas' : 'activas'} todavía.</p>
      ) : (
        <ul>
          {ownedTechniques.map((technique) => (
            <li key={`${technique.catalogVersion}-${technique.techniqueId}`}>
              <h4>{technique.name || getTechniqueName(technique.techniqueId)}</h4>
              <p>{getTechniqueDescription(technique)}</p>
              <p>Nivel mínimo: {technique.minLevel}</p>
              <p>{describeTechniqueEffect(technique.effect)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function TechniqueCollection({ fighter }) {
  const techniques = fighter.techniques ?? []
  const techniquesById = new Map(
    techniques.map((technique) => [technique.techniqueId, technique]),
  )

  return (
    <section className="technique-collection" aria-labelledby="technique-collection-title">
      <p className="eyebrow">Colección de {fighter.name}</p>
      <h2 id="technique-collection-title">Colección de habilidades</h2>
      <p>
        Estas técnicas pertenecen a este luchador. El servidor selecciona automáticamente hasta una
        habilidad pasiva y una activa para cada combate; no se pueden elegir ni cambiar aquí.
      </p>

      <div className="technique-collection__groups">
        <TechniqueGroup category="passive" title="Habilidades pasivas" techniques={techniques} />
        <TechniqueGroup category="active" title="Habilidades activas" techniques={techniques} />
      </div>

      <section className="technique-collection__unlocks" aria-labelledby="technique-unlocks-title">
        <h3 id="technique-unlocks-title">Desbloqueos por nivel</h3>
        {fighter.techniqueUnlocks.length === 0 ? (
          <p>Aún no hay desbloqueos de habilidades registrados.</p>
        ) : (
          <ol>
            {fighter.techniqueUnlocks.map((unlock) => {
              const technique = unlock.technique ?? techniquesById.get(unlock.techniqueId)

              return (
                <li key={unlock.level}>
                  <strong>Nivel {unlock.level}</strong>
                  {technique ? (
                    <span> Desbloqueaste {technique.name || getTechniqueName(technique.techniqueId)}.</span>
                  ) : (
                    <span> Esta tirada no otorgó una habilidad.</span>
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
